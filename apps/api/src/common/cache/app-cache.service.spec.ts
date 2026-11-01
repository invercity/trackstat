import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { AppCacheService } from './app-cache.service';

describe('AppCacheService', () => {
  it('stores and retrieves cached items', () => {
    const cache = new AppCacheService();
    cache.set('test_key', { count: 42 });
    const val = cache.get<{ count: number }>('test_key');
    assert.deepStrictEqual(val, { count: 42 });
  });

  it('returns undefined for non-existent or expired keys', async () => {
    const cache = new AppCacheService();
    assert.strictEqual(cache.get('unknown'), undefined);

    cache.set('quick', 'hello', 10); // 10ms
    await new Promise((res) => setTimeout(res, 25));
    assert.strictEqual(cache.get('quick'), undefined);
  });

  it('computes and stores via getOrSet only on cache miss', async () => {
    const cache = new AppCacheService();
    let invocations = 0;
    const fetcher = async () => {
      invocations++;
      return [2026, 2025];
    };

    const first = await cache.getOrSet('years', fetcher);
    assert.deepStrictEqual(first, [2026, 2025]);
    assert.strictEqual(invocations, 1);

    const second = await cache.getOrSet('years', fetcher);
    assert.deepStrictEqual(second, [2026, 2025]);
    assert.strictEqual(invocations, 1); // Not called again!
  });

  it('supports deletePrefix to invalidate groups of cached entries', () => {
    const cache = new AppCacheService();
    cache.set('rankings:2026', { pts: 100 });
    cache.set('rankings:2025', { pts: 50 });
    cache.set('season:active', { year: 2026 });

    assert.strictEqual(cache.size(), 3);
    const deleted = cache.deletePrefix('rankings:');
    assert.strictEqual(deleted, 2);

    assert.strictEqual(cache.get('rankings:2026'), undefined);
    assert.strictEqual(cache.get('rankings:2025'), undefined);
    assert.deepStrictEqual(cache.get('season:active'), { year: 2026 });
    assert.strictEqual(cache.size(), 1);
  });

  it('clears all cached items', () => {
    const cache = new AppCacheService();
    cache.set('k1', 1);
    cache.set('k2', 2);
    cache.clear();
    assert.strictEqual(cache.size(), 0);
    assert.strictEqual(cache.get('k1'), undefined);
  });
});
