import { PayinOrderStatus } from '@/types/merchant';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { getTronWebInstance } from '@/utils/tronweb-manager';
import { USDT_CONTRACT_ADDRESSES } from '@/config/constants';
import { mnemonicToSeedSync } from 'bip39';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import { useWalletStore } from '@/stores/wallet-store';
import { toast } from 'sonner';
import { useMerchantStore } from '@/stores/merchant-store';
import { useOrderStore } from '@/stores/order-store';
export interface CollectionOrder {
  address: string;
  created_at: string;
  usdt: number;
  value: number;
  path?: string;
}

export class CollectionManager {
  private processedOrders: Set<string> = new Set();
  private isProcessing: boolean = false;
  private processingQueue: CollectionOrder[] = [];
  private maxRetries: number = 3;
  private retryDelay: number = 5000;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private targetAddress: string,
    private bip32: any,
    private onStatusUpdate?: (orderKey: string, status: PayinOrderStatus) => void
  ) {}

  private generateOrderKey(order: CollectionOrder): string {
    return `${order.address}${order.created_at}`;
  }

  public getOrdersToProcess(orders: Map<string, CollectionOrder>): CollectionOrder[] {
    if (!orders || orders.size === 0) return [];

    const orderStatusStore = usePayinOrderStatusStore.getState();
    const { minBalance } = useMerchantStore.getState();
    const ordersArray = Array.from(orders.values());

    const filteredOrders = ordersArray.filter((order) => {
      const orderKey = this.generateOrderKey(order);
      const meetsMinBalance = order.usdt >= minBalance * 1e6;
      const notProcessed = !this.processedOrders.has(orderKey);
      const notProcessing =
        orderStatusStore.getOrderStatus(orderKey) !== PayinOrderStatus.Collecting;
      const notInQueue = !this.processingQueue.some((q) => this.generateOrderKey(q) === orderKey);
      return meetsMinBalance && notProcessed && notProcessing && notInQueue;
    });
    return filteredOrders;
  }

  public addToQueue(orders: CollectionOrder[]): void {
    const newOrders = orders.filter((order) => {
      const orderKey = this.generateOrderKey(order);
      return !this.processingQueue.some((q) => this.generateOrderKey(q) === orderKey);
    });
    this.processingQueue.push(...newOrders);
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const order = this.processingQueue.shift()!;

        await this.processOrder(order);
        await this.delay(1000);
      }
    } finally {
      this.isProcessing = false;
      this.cleanupProcessedOrders();
    }
  }

  public startAuto(): void {
    if (this.loopTimer) return;
    const runLoop = async () => {
      const { isCollecting, minBalance } = useMerchantStore.getState();
      if (!isCollecting) {
        this.stopAuto();
        return;
      }

      const ordersMap = useOrderStore.getState().payinOrders;
      if (ordersMap && ordersMap.size > 0) {
        const ordersToProcess = this.getOrdersToProcess(ordersMap);
        if (ordersToProcess.length > 0) {
          this.addToQueue(ordersToProcess);
          await this.processQueue();
        }
      }

      this.loopTimer = setTimeout(runLoop, 2000);
    };

    this.loopTimer = setTimeout(runLoop, 0);
  }

  public stopAuto(): void {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  private async processOrder(order: CollectionOrder, retryCount: number = 0): Promise<void> {
    const orderKey = this.generateOrderKey(order);

    try {
      this.processedOrders.add(orderKey);

      this.updateOrderStatus(orderKey, PayinOrderStatus.Collecting);

      if (!this.validateOrder(order)) {
        this.updateOrderStatus(orderKey, PayinOrderStatus.Pending);
        return;
      }

      const realBalance = await this.getAddressRealBalance(order.address);
      if (!this.validateBalance(order, realBalance)) {
        this.updateOrderStatus(orderKey, PayinOrderStatus.Pending);
        return;
      }

      const tx = await this.executeCollection(order, realBalance);

      if (tx) {
        this.updateOrderStatus(orderKey, PayinOrderStatus.Confirming);
      } else {
        throw new Error('Collection transaction failed');
      }
    } catch (error) {
      if (retryCount < this.maxRetries) {
        await this.delay(this.retryDelay);

        this.processingQueue.unshift(order);
        this.processedOrders.delete(orderKey);
        return;
      }

      this.updateOrderStatus(orderKey, PayinOrderStatus.CollectFailed);
    }
  }

  private validateOrder(order: CollectionOrder): boolean {
    if (!order.path) {
      toast.error(order.address, { description: 'path is null' });
      return false;
    }

    if (!/^T[A-Za-z1-9]{33}$/.test(order.address)) {
      console.error('Invalid TRON address:', order.address);
      return false;
    }

    return true;
  }

  private async getAddressRealBalance(address: string): Promise<{ trx: number; usdt: string }> {
    try {
      const tronWeb = getTronWebInstance('nile');

      const trxBalance = await tronWeb.trx.getBalance(address);

      const usdtContractAddress = USDT_CONTRACT_ADDRESSES.nile;
      const balanceResult = await tronWeb.transactionBuilder.triggerConstantContract(
        usdtContractAddress,
        'balanceOf(address)',
        {},
        [{ type: 'address', value: address }],
        address
      );

      let usdtBalance = 0;
      if (balanceResult.result.result) {
        usdtBalance = parseInt(balanceResult.constant_result[0], 16);
      }

      const usdt = (parseFloat(usdtBalance.toString()) / 1e6).toString();
      return { trx: trxBalance, usdt };
    } catch (error) {
      console.error(`Query address ${address} balance failed:`, error);
      return { trx: 0, usdt: '0' };
    }
  }

  private validateBalance(
    order: CollectionOrder,
    realBalance: { trx: number; usdt: string }
  ): boolean {
    const expectedUsdt = (order.usdt / 1e6).toString();
    const { minBalance } = useMerchantStore.getState();

    if (parseFloat(realBalance.usdt) < minBalance) {
      return false;
    }
    return true;
  }

  private async executeCollection(
    order: CollectionOrder,
    realBalance: { trx: number; usdt: string }
  ): Promise<any> {
    const walletStore = useWalletStore.getState();
    const keystoreData = walletStore.keystoreData;
    const password = walletStore.walletPassword;

    if (!keystoreData || !password) {
      throw new Error('Keystore data or password not found');
    }

    const wallet = await ethers.Wallet.fromEncryptedJson(keystoreData, password);
    let mnemonic = '';

    if (wallet && 'mnemonic' in wallet && wallet.mnemonic) {
      mnemonic = wallet.mnemonic.phrase || '';
    } else {
      throw new Error('Cannot get mnemonic from wallet');
    }

    // generate private key
    const seed = mnemonicToSeedSync(mnemonic);
    const node = this.bip32.fromSeed(seed);
    const child = node.derivePath(order.path!);
    const privateKey = child.privateKey;

    if (!privateKey) {
      throw new Error('Cannot generate private key');
    }

    // execute transfer
    const privateKeyHex = Buffer.from(privateKey).toString('hex');
    const tronWeb = getTronWebInstance('nile');
    tronWeb.setPrivateKey(privateKeyHex);

    // Generate address from private key and set as owner_address
    const fromAddress = tronWeb.address.fromPrivateKey(privateKeyHex);
    tronWeb.setAddress(fromAddress || '');

    const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESSES.nile);
    // convert string format decimal to BigInt format integer (in smallest unit)
    const usdtAmount = BigInt(Math.floor(parseFloat(realBalance.usdt) * 1e6));
    return await contract.transfer(this.targetAddress, usdtAmount.toString()).send({
      feeLimit: 10_000_000,
    });
  }

  // update order status
  private updateOrderStatus(orderKey: string, status: PayinOrderStatus): void {
    const orderStatusStore = usePayinOrderStatusStore.getState();
    orderStatusStore.setOrderStatus(orderKey, status);

    if (this.onStatusUpdate) {
      this.onStatusUpdate(orderKey, status);
    }
  }

  // clean up processed orders
  private cleanupProcessedOrders(): void {
    if (this.processedOrders.size > 1000) {
      this.processedOrders.clear();
    }
  }

  // delay function
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // reset manager state
  public reset(): void {
    this.processedOrders.clear();
    this.processingQueue = [];
    this.isProcessing = false;
  }

  // get processing status
  public getStatus(): {
    isProcessing: boolean;
    queueLength: number;
    processedCount: number;
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      processedCount: this.processedOrders.size,
    };
  }
}
