import { afterEach, expect, it, vi } from 'vitest';
import { detectOutboundIP } from './outbound.server';

afterEach(() => vi.unstubAllGlobals());
it('detects the current outbound IP using ipify', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ip: '203.0.113.42' }));
  vi.stubGlobal('fetch', fetchMock);
  expect(await detectOutboundIP()).toBe('203.0.113.42');
  expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.ipify.org?format=json');
});
it('returns null when IP detection fails without blocking search', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Timeout')));
  expect(await detectOutboundIP()).toBeNull();
});