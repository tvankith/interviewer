type SseCallback = (event: object) => void;

export class SseManager {
  private subscribers = new Map<string, Set<SseCallback>>();

  private channelKey(profileId: string): string {
    return `profile:${profileId}`;
  }

  subscribe(profileId: string, cb: SseCallback): void {
    const key = this.channelKey(profileId);
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(cb);
  }

  unsubscribe(profileId: string, cb: SseCallback): void {
    const key = this.channelKey(profileId);
    const set = this.subscribers.get(key);
    if (set) {
      set.delete(cb);
      if (set.size === 0) this.subscribers.delete(key);
    }
  }

  emit(profileId: string, field: string, data: object): void {
    const key = this.channelKey(profileId);
    const set = this.subscribers.get(key);
    if (!set) return;
    const event = { field, data };
    for (const cb of set) {
      try {
        cb(event);
      } catch {
        // ignore broken subscriber
      }
    }
  }
}

export const sseManager = new SseManager();
