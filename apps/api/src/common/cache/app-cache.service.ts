import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class AppCacheService {
  private readonly store = new Map<string, CacheEntry<any>>();

  /**
   * Отримує значення з кешу за ключем.
   * Повертає undefined, якщо значення відсутнє або термін дії сплив.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  /**
   * Зберігає значення в кеші з часом життя TTL (за замовчуванням 10 хвилин).
   */
  set<T>(key: string, value: T, ttlMs: number = 10 * 60 * 1000): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Отримує значення з кешу, або викликає factory, кешує і повертає результат.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    const fresh = await factory();
    this.set(key, fresh, ttlMs);
    return fresh;
  }

  /**
   * Видаляє значення за ключем.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Видаляє всі ключі, що починаються з вказаного префікса (наприклад 'rankings:', 'season:').
   */
  deletePrefix(prefix: string): number {
    let deletedCount = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Повністю очищає весь кеш.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Повертає кількість актуальних (непрострочених) записів у кеші.
   */
  size(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      } else {
        count++;
      }
    }
    return count;
  }
}
