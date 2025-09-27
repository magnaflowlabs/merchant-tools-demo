/**
 * Base EventTarget class for WebSocket modules
 * Provides common event handling functionality
 */
export abstract class EventEmitter {
  protected eventEmitter: EventTarget;

  constructor() {
    this.eventEmitter = new EventTarget();
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (event: CustomEvent) => void): void {
    this.eventEmitter.addEventListener(event, callback as EventListener);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (event: CustomEvent) => void): void {
    this.eventEmitter.removeEventListener(event, callback as EventListener);
  }

  /**
   * Emit custom event
   */
  emit(eventName: string, detail?: any): void {
    const event = new CustomEvent(eventName, { detail });
    this.eventEmitter.dispatchEvent(event);
  }

  /**
   * Remove all event listeners
   */
  protected removeAllListeners(): void {
    // Create a new EventTarget to clear all listeners
    this.eventEmitter = new EventTarget();
  }
}
