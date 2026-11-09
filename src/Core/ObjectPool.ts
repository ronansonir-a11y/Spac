export class ObjectPool<T> {
  private available: T[] = [];
  readonly active = new Set<T>();
  constructor(size: number, factory: (index: number) => T) {
    for (let i = 0; i < size; i++) this.available.push(factory(i));
  }
  acquire(): T | null {
    const item = this.available.pop() ?? null;
    if (item !== null) this.active.add(item);
    return item;
  }
  release(item: T): void {
    if (this.active.delete(item)) this.available.push(item);
  }
  releaseAll(): void {
    for (const item of this.active) this.available.push(item);
    this.active.clear();
  }
}
