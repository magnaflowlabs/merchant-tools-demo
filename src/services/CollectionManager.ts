import { PayinOrderStatus } from '@/types/merchant';
import { usePayinOrderStatusStore } from '@/stores/payin-order-status-store';
import { createTronWebInstance } from '@/utils/tronweb-manager';
import { mnemonicToSeedSync } from 'bip39';
import { Buffer } from 'buffer';
import { useWalletStore } from '@/stores/wallet-store';
import { toast } from 'sonner';
import { useMerchantStore } from '@/stores/merchant-store';
import { useOrderStore } from '@/stores/order-store';
import { RECHARGE_CONFIG } from '@/config/constants';
import { useChainConfigStore } from '@/stores/chain-config-store';
import BigNumber from 'bignumber.js';
export interface CollectionOrder {
  address: string;
  created_at: string;
  usdt: number;
  value: number;
  path?: string;
}

export class CollectionManager {
  private static instance: CollectionManager | null = null;
  private processedOrders: Set<string> = new Set();
  private isProcessing: boolean = false;
  private processingQueue: CollectionOrder[] = [];
  private maxRetries: number = 3;
  private retryDelay: number = 5000;
  private loopTimer: ReturnType<typeof setTimeout> | null = null;
  private currentDataSnapshot: Map<string, CollectionOrder> | null = null;
  private isAutoRunning: boolean = false;

  private constructor(
    private targetAddress: string,
    private bip32: any
  ) {}

  private setConfig(targetAddress: string, bip32: any) {
    this.targetAddress = targetAddress;
    this.bip32 = bip32;
  }

  public static getInstance(targetAddress: string, bip32: any): CollectionManager {
    if (!CollectionManager.instance) {
      CollectionManager.instance = new CollectionManager(targetAddress, bip32);
    } else {
      CollectionManager.instance.setConfig(targetAddress, bip32);
    }
    return CollectionManager.instance;
  }

  private getTokenDecimal(tokenId: string): number {
    const curChainConfig = useChainConfigStore.getState().curChainConfig;
    const lowerId = tokenId.toLowerCase();
    const token = curChainConfig?.tokens?.find(
      (t) => t?.name?.toLowerCase() === lowerId || t?.symbol?.toLowerCase() === lowerId
    );
    return token?.decimal ?? 6;
  }

  private getUsdtContractAddress(): string {
    const curChainConfig = useChainConfigStore.getState().curChainConfig;
    const contractAddress = curChainConfig?.tokens?.find(
      (token) => token.symbol === 'usdt'
    )?.contract_addr;

    return contractAddress || '';
  }

  public getOrdersToProcess(orders: Map<string, CollectionOrder>): CollectionOrder[] {
    if (!orders || orders.size === 0) return [];
    const orderStatusStore = usePayinOrderStatusStore.getState();

    const { minBalance } = useMerchantStore.getState();
    const usdtDecimal = this.getTokenDecimal('usdt');
    const ordersArray = Array.from(orders.values());

    const curMinBalance = BigNumber(minBalance).gt(0.01)
      ? BigNumber(minBalance).multipliedBy(new BigNumber(10).pow(usdtDecimal))
      : new BigNumber(0.01).multipliedBy(new BigNumber(10).pow(usdtDecimal));
    const filteredOrders = ordersArray.filter((order) => {
      const orderKey = order.address;
      const meetsMinBalance = BigNumber(order.usdt).gt(curMinBalance);
      const notProcessed = !this.processedOrders.has(orderKey);
      const notProcessing = orderStatusStore.getOrderStatus(orderKey) == PayinOrderStatus.Pending;
      const notInQueue = !this.processingQueue.some((item) => item.address === orderKey);
      return meetsMinBalance && notProcessed && notProcessing && notInQueue;
    });
    return filteredOrders;
  }

  public addToQueue(orders: CollectionOrder[]): void {
    const newOrders = orders.filter((order) => {
      const orderKey = order.address;
      return !this.processingQueue.some((item) => item.address === orderKey);
    });
    this.processingQueue.push(...newOrders);
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (Boolean(this.processingQueue?.length)) {
        const { isCollecting } = useMerchantStore.getState();
        if (!isCollecting) {
          this.processingQueue = [];
          break;
        }
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
    if (this.isAutoRunning) return;
    this.isAutoRunning = true;

    const runLoop = async () => {
      const { isCollecting } = useMerchantStore.getState();
      if (!isCollecting || !this.isAutoRunning) {
        this.stopAuto();
        return;
      }

      // If currently processing, skip this loop
      if (this.isProcessing) {
        if (this.loopTimer) {
          clearTimeout(this.loopTimer);
        }
        this.loopTimer = setTimeout(runLoop, 2000);
        return;
      }

      try {
        // Create snapshot of current data to ensure data won't be modified during processing
        const ordersMap = useOrderStore.getState().payinOrders;
        if (ordersMap?.size > 0) {
          // Create data snapshot
          this.currentDataSnapshot = new Map(ordersMap);
          const ordersToProcess = this.getOrdersToProcess(this.currentDataSnapshot);

          if (ordersToProcess?.length > 0) {
            this.addToQueue(ordersToProcess);
            await this.processQueue();
          }
        }
      } catch (error) {
        console.error('Auto collection loop error:', error);
      } finally {
        // Clean up snapshot
        this.currentDataSnapshot = null;
      }

      // Continue next loop
      if (this.isAutoRunning) {
        this.loopTimer = setTimeout(runLoop, 2000);
      }
    };

    this.loopTimer = setTimeout(runLoop, 0);
  }

  public stopAuto(): void {
    this.isAutoRunning = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.processingQueue = [];
    this.currentDataSnapshot = null;
  }

  private async processOrder(order: CollectionOrder, retryCount: number = 0): Promise<void> {
    const orderKey = order.address;
    try {
      if (!useMerchantStore.getState().isCollecting) {
        this.updateOrderStatus(orderKey, PayinOrderStatus.Pending);
        return;
      }
      if (!this.validateOrder(order)) {
        this.updateOrderStatus(orderKey, PayinOrderStatus.Pending);
        return;
      }
      this.processedOrders.add(orderKey);
      const realBalance = await this.getAddressRealBalance(order.address);
      if (!this.validateBalance(realBalance)) {
        return;
      }
      if (
        !this.validateBalance(realBalance) &&
        usePayinOrderStatusStore.getState().getOrderStatus(orderKey) !== PayinOrderStatus.Confirming
      ) {
        this.updateOrderStatus(orderKey, PayinOrderStatus.Pending);
        return;
      }
      this.updateOrderStatus(orderKey, PayinOrderStatus.Collecting);
      const tx = await this.executeCollection(order, realBalance);
      if (tx) {
        this.updateOrderStatus(orderKey, PayinOrderStatus.Confirming);
      } else {
        throw new Error('Collection transaction failed');
      }
    } catch (error) {
      if (useMerchantStore.getState().isCollecting && retryCount < this.maxRetries) {
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
      const curChainConfig = useChainConfigStore.getState().curChainConfig;

      const tronWeb = curChainConfig?.chain
        ? createTronWebInstance(curChainConfig)
        : createTronWebInstance('nile');

      const trxBalance = await tronWeb.trx.getBalance(address);
      const usdtContractAddress = this.getUsdtContractAddress();
      const balanceResult = await tronWeb.transactionBuilder.triggerConstantContract(
        usdtContractAddress,
        'balanceOf(address)',
        {},
        [{ type: 'address', value: address }],
        address
      );

      let usdtBalance = '0';
      if (balanceResult.result.result) {
        usdtBalance = parseInt(balanceResult.constant_result[0], 16).toString();
      }

      return { trx: trxBalance, usdt: usdtBalance };
    } catch (error) {
      console.error(`Query address ${address} balance failed:`, error);
      return { trx: 0, usdt: '0' };
    }
  }

  private validateBalance(realBalance: { trx: number; usdt: string }): boolean {
    const { minBalance } = useMerchantStore.getState();

    const usdtDecimal = this.getTokenDecimal('usdt');
    const curMinBalance = BigNumber(minBalance).gt(0.01)
      ? BigNumber(minBalance).multipliedBy(new BigNumber(10).pow(usdtDecimal))
      : new BigNumber(0.01).multipliedBy(new BigNumber(10).pow(usdtDecimal));
    return BigNumber(realBalance.usdt).gt(curMinBalance);
  }

  private async executeCollection(
    order: CollectionOrder,
    realBalance: { trx: number; usdt: string }
  ): Promise<any> {
    const walletStore = useWalletStore.getState();

    // Check if wallet mnemonic is available
    if (!walletStore.hasWalletMnemonic()) {
      throw new Error('Wallet mnemonic not found, please import wallet first');
    }

    // Get stored mnemonic
    const mnemonic = await walletStore.getWalletMnemonic();
    if (!mnemonic) {
      throw new Error('Cannot get wallet mnemonic');
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
    const curChainConfig = useChainConfigStore.getState().curChainConfig;
    const tronWeb = curChainConfig?.chain
      ? createTronWebInstance(curChainConfig)
      : createTronWebInstance('nile');
    tronWeb.setPrivateKey(privateKeyHex);

    // Generate address from private key and set as owner_address
    const fromAddress = tronWeb.address.fromPrivateKey(privateKeyHex);

    tronWeb.setAddress(fromAddress || '');

    const contract = await tronWeb.contract().at(this.getUsdtContractAddress());
    // convert string format decimal to BigInt format integer (in smallest unit)
    const usdtDecimal = this.getTokenDecimal('usdt');

    const usdtAmount = BigNumber(realBalance.usdt)
      .minus(new BigNumber(10).pow(usdtDecimal).multipliedBy(0.01))
      .toString();
    return await contract.transfer(this.targetAddress, usdtAmount).send({
      feeLimit: RECHARGE_CONFIG.FEE_LIMIT,
    });
  }

  // update order status
  private updateOrderStatus(orderKey: string, status: PayinOrderStatus): void {
    const orderStatusStore = usePayinOrderStatusStore.getState();
    orderStatusStore.setOrderStatus(orderKey, status);
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
    this.currentDataSnapshot = null;
    this.isAutoRunning = false;
  }

  // get processing status
  public getStatus(): {
    isProcessing: boolean;
    queueLength: number;
    processedCount: number;
    isAutoRunning: boolean;
    hasDataSnapshot: boolean;
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      processedCount: this.processedOrders.size,
      isAutoRunning: this.isAutoRunning,
      hasDataSnapshot: this.currentDataSnapshot !== null,
    };
  }
}
