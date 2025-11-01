/**
 * Optimized high-performance sharded Map management class
 *
 * Main optimizations:
 * 1. Remove insertionOrder array, use Set instead (O(n) -> O(1) deletion)
 * 2. Add version number mechanism to avoid unnecessary data copying
 * 3. Optimize memory usage
 */
export class ShardedMap<V> {
  private shards: Map<number, Map<string, V>> = new Map();
  private shardCount: number;
  private insertionOrder: Set<string> = new Set(); // Use Set instead of array, O(1) deletion
  private _version: number = 0; // Version number for detecting changes

  constructor(shardCount: number = 100) {
    if (shardCount <= 0) throw new Error('shardCount must be > 0');
    this.shardCount = shardCount;
  }

  /**
   * Get current version number
   */
  get version(): number {
    return this._version;
  }

  /**
   * Increment version number (called after internal modifications)
   */
  private incrementVersion(): void {
    this._version++;
  }
  private hashStringDJB2(str: string): number {
    let hash = 5381; // Initial hash value (common prime number)

    for (let i = 0; i < str.length; i++) {
      // hash = hash * 33 + charCode
      // Use bitwise operators to implement multiplication and addition, more efficient, and automatically truncate to 32-bit integer
      hash = (hash * 33) ^ str.charCodeAt(i);

      // Another way to write it, closer to the original algorithm, but with similar effect:
      // hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }

    // Convert to unsigned 32-bit integer and ensure the result is positive
    return hash >>> 0;
  }

  /** Convert numeric string to shard index */
  private getShardIndex(key: string): number {
    // If key is large (like 18 digits), only take the last few digits to avoid overflow
    const lastDigits = key.slice(-10); // Take the last 10 digits
    const num = this.hashStringDJB2(lastDigits);
    return num % this.shardCount;
  }

  private getShard(index: number): Map<string, V> {
    if (!this.shards.has(index)) {
      this.shards.set(index, new Map());
    }
    return this.shards.get(index)!;
  }

  /**
   * Insert or update (optimization: direct modification, increment version)
   */
  set(key: string, value: V): void {
    const shard = this.getShard(this.getShardIndex(key));
    const isNewKey = !shard.has(key);
    shard.set(key, value);

    if (isNewKey) {
      this.insertionOrder.add(key); // O(1)
    }

    this.incrementVersion();
  }

  /**
   * Batch insert (optimization: reduce version number update frequency)
   */
  setMany(entries: [string, V][]): void {
    for (const [key, value] of entries) {
      const shard = this.getShard(this.getShardIndex(key));
      const isNewKey = !shard.has(key);
      shard.set(key, value);

      if (isNewKey) {
        this.insertionOrder.add(key);
      }
    }

    // Only increment version number once at the end
    this.incrementVersion();
  }

  /** Get value */
  get(key: string): V | undefined {
    const shard = this.shards.get(this.getShardIndex(key));
    return shard?.get(key);
  }

  /** Check if exists */
  has(key: string): boolean {
    const shard = this.shards.get(this.getShardIndex(key));
    return shard ? shard.has(key) : false;
  }

  /**
   * Delete (optimization: O(1) deletion)
   */
  delete(key: string): boolean {
    const shard = this.shards.get(this.getShardIndex(key));
    const deleted = shard ? shard.delete(key) : false;

    if (deleted) {
      this.insertionOrder.delete(key); // O(1) instead of O(n)
      this.incrementVersion();
    }

    return deleted;
  }

  /**
   * Batch delete (optimization: reduce version number update frequency)
   */
  deleteMany(keys: string[]): number {
    let deletedCount = 0;

    for (const key of keys) {
      const shard = this.shards.get(this.getShardIndex(key));
      if (shard && shard.delete(key)) {
        this.insertionOrder.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.incrementVersion();
    }
    return deletedCount;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.shards.clear();
    this.insertionOrder.clear();
    this.incrementVersion();
  }

  /**
   * Get total count (optimization: cache result)
   */
  get size(): number {
    // Directly return insertionOrder size, O(1)
    return this.insertionOrder.size;
  }

  /** Iterate through all entries */
  *entries(): IterableIterator<[string, V]> {
    for (const shard of this.shards.values()) {
      for (const entry of shard.entries()) {
        yield entry;
      }
    }
  }

  /** Iterate through all entries in insertion order */
  *entriesInOrder(): IterableIterator<[string, V]> {
    for (const key of this.insertionOrder) {
      const value = this.get(key);
      if (value !== undefined) {
        yield [key, value];
      }
    }
  }

  /** Iterate through all keys */
  *keys(): IterableIterator<string> {
    for (const [key] of this.entries()) yield key;
  }

  /**
   * Iterate through all keys in insertion order
   */
  *keysInOrder(): IterableIterator<string> {
    yield* this.insertionOrder;
  }

  /** Iterate through all values */
  *values(): IterableIterator<V> {
    for (const [, value] of this.entries()) yield value;
  }

  /** Iterate through all values in insertion order */
  *valuesInOrder(): IterableIterator<V> {
    for (const [, value] of this.entriesInOrder()) {
      yield value;
    }
  }

  /**
   * Delete specific shard
   */
  deleteShard(index: number): void {
    const shard = this.shards.get(index);
    if (shard) {
      // Remove all keys of this shard from insertionOrder
      for (const key of shard.keys()) {
        this.insertionOrder.delete(key);
      }
      this.shards.delete(index);
      this.incrementVersion();
    }
  }

  /**
   * Current active shard count
   */
  get shardSize(): number {
    return this.shards.size;
  }

  /**
   * Convert to array (optimization: support quantity limit)
   */
  toArray(limit?: number): V[] {
    const result: V[] = [];
    let count = 0;

    for (const value of this.valuesInOrder()) {
      result.push(value);
      count++;
      if (limit && count >= limit) break;
    }

    return result;
  }

  /**
   * Shallow clone (use only when necessary)
   */
  clone(): ShardedMap<V> {
    const cloned = new ShardedMap<V>(this.shardCount);

    for (const [key, value] of this.entries()) {
      cloned.set(key, value);
    }

    return cloned;
  }
}
