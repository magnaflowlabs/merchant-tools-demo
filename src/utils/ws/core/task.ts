export class TasksService {
  // Store all task handlers
  private handlers: TasksHandler[] = [];
  // Timer reference
  private timer: NodeJS.Timeout | null = null;
  // Base check interval
  private baseInterval: number;

  constructor(options: TasksOptions) {
    this.baseInterval = options.interval;
    if (options.autoStart) {
      this.start();
    }
  }

  // Add task handler
  addHandler(handler: TasksHandler) {
    this.handlers.push(handler);
  }

  addHandlers(handlers: TasksHandler[]) {
    this.handlers.push(...handlers);
  }

  // Remove task handler
  removeHandler(name: string) {
    this.handlers = this.handlers.filter((h) => h.name !== name);
  }

  // Start periodic check
  start() {
    if (this.timer) return;

    const runTasks = () => {
      const now = Date.now();

      // Iterate through all handlers
      for (const handler of this.handlers) {
        const interval = handler.interval || this.baseInterval;
        const lastCheck = handler.lastCheck || 0;

        // Check if execution is needed
        if (now - lastCheck >= interval) {
          try {
            handler.handler(now);
            handler.lastCheck = now;
          } catch (error) {
            console.error(`Task ${handler.name} failed:`, error);
          }
        }
      }

      // Schedule next run
      this.timer = setTimeout(runTasks, this.baseInterval);
    };

    // Start the first run
    runTasks();
  }

  // Stop periodic check
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Check if tasks service is running
  isRunning(): boolean {
    return this.timer !== null;
  }
}

export interface TasksHandler {
  name: string; // Task name
  handler: (now: number) => void; // Task handler function
  interval?: number; // Custom execution interval
  lastCheck?: number; // Last execution timestamp
}

export interface TasksOptions {
  interval: number; // Base check interval
  autoStart?: boolean; // Auto start flag
}
