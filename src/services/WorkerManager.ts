/**
 * Worker Manager - Singleton pattern for managing Web Workers
 * Prevents multiple worker instances and provides reusable worker pool
 */

type WorkerResponse = {
  type: 'PROGRESS' | 'SUCCESS' | 'ERROR';
  payload: any;
};

type GenerateAddressesMessage = {
  type: 'GENERATE_ADDRESSES';
  payload: {
    mnemonic: string;
    startIndex: number;
    count: number;
    chunkSize: number;
    fullHost: string;
    headers?: Record<string, string>;
  };
};

interface WorkerTask {
  id: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  onProgress?: (current: number, total: number) => void;
}

class WorkerManager {
  private worker: Worker | null = null;
  private isInitialized = false;
  private currentTask: WorkerTask | null = null;
  private taskQueue: WorkerTask[] = [];

  /**
   * Get or create the singleton worker instance
   */
  private getWorker(): Worker {
    if (!this.worker || !this.isInitialized) {
      this.initializeWorker();
    }
    return this.worker!;
  }

  /**
   * Initialize the worker with message handlers
   */
  private initializeWorker(): void {
    if (this.worker) {
      this.worker.terminate();
    }

    this.worker = new Worker(new URL('../workers/address-generator.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;

      if (!this.currentTask) {
        console.warn('Received worker message but no current task');
        return;
      }

      switch (type) {
        case 'PROGRESS':
          this.currentTask.onProgress?.(payload.current, payload.total);
          break;
        case 'SUCCESS':
          this.currentTask.resolve(payload.addresses);
          this.finishCurrentTask();
          break;
        case 'ERROR':
          this.currentTask.reject(new Error(payload.error));
          this.finishCurrentTask();
          break;
      }
    };

    this.worker.onerror = (error) => {
      if (this.currentTask) {
        this.currentTask.reject(error);
        this.finishCurrentTask();
      }
    };

    this.isInitialized = true;
  }

  /**
   * Finish current task and process queue
   */
  private finishCurrentTask(): void {
    this.currentTask = null;
    this.processQueue();
  }

  /**
   * Process the task queue
   */
  private processQueue(): void {
    if (this.currentTask || this.taskQueue.length === 0) {
      return;
    }

    this.currentTask = this.taskQueue.shift()!;
    // The actual message posting will be handled by the calling method
  }

  /**
   * Generate addresses using the singleton worker
   */
  public generateAddresses(
    mnemonic: string,
    startIndex: number,
    count: number,
    chunkSize = 50,
    fullHost: string,
    onProgress?: (current: number, total: number) => void,
    headers?: Record<string, string>
  ): Promise<Array<{ address: string; privateKey: string; path: string }>> {
    return new Promise((resolve, reject) => {
      const taskId = Math.random().toString(36).substr(2, 9);
      const task: WorkerTask = {
        id: taskId,
        resolve,
        reject,
        onProgress,
      };

      this.taskQueue.push(task);

      // If no current task, start processing immediately
      if (!this.currentTask) {
        this.processQueue();

        if (this.currentTask) {
          const worker = this.getWorker();
          const message: GenerateAddressesMessage = {
            type: 'GENERATE_ADDRESSES',
            payload: {
              mnemonic,
              startIndex,
              count,
              chunkSize,
              fullHost,
              headers,
            },
          };
          worker.postMessage(message);
        }
      }
    });
  }

  /**
   * Check if worker is available (not busy)
   */
  public isAvailable(): boolean {
    return !this.currentTask;
  }

  /**
   * Get queue length
   */
  public getQueueLength(): number {
    return this.taskQueue.length;
  }

  /**
   * Terminate the worker and cleanup
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }

    // Reject all pending tasks
    if (this.currentTask) {
      this.currentTask.reject(new Error('Worker terminated'));
      this.currentTask = null;
    }

    this.taskQueue.forEach((task) => {
      task.reject(new Error('Worker terminated'));
    });
    this.taskQueue = [];
  }

  /**
   * Clear the task queue (reject all pending tasks)
   */
  public clearQueue(): void {
    this.taskQueue.forEach((task) => {
      task.reject(new Error('Task cancelled'));
    });
    this.taskQueue = [];
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workerManager.terminate();
  });
}
