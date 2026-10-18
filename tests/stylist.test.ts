import { convexTest } from 'convex-test';
import { describe, it, expect, vi, afterEach } from 'vitest';
import schema from '../convex/schema';
import { api, internal } from '../convex/_generated/api';

const modules = import.meta.glob('../convex/**/*.ts');
const profile = { skinTone: 'Medium' as const, hairColour: 'Black' as const, height: 165, bodyShape: 'Not sure' as const, style: 'Casual' as const };
const item = { name: 'Relaxed fit', reason: 'Easy movement for your casual style.' };
const suggestions = { colours: Array.from({ length: 5 }, () => ({ name: 'Sage', hex: '#A7AF9B', reason: 'Soft contrast with your dark hair.' })), cuts: [item, item, item], clothing: [item, item, item] };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('App-wide hourly AI budget', () => {
  it('allows only 50 concurrent reservations and reopens after a rolling hour', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T10:00:00Z'));
    const t = convexTest(schema, modules);
    const reservations = await Promise.all(Array.from({ length: 60 }, () => t.mutation(internal.quota.reserve, {})));
    expect(reservations.filter(Boolean)).toHaveLength(50);
    vi.advanceTimersByTime(3_599_999);
    expect(await t.mutation(internal.quota.reserve, {})).toBe(false);
    vi.advanceTimersByTime(1);
    expect(await t.mutation(internal.quota.reserve, {})).toBe(true);
  });
});

describe('Style suggestions', () => {
  it('makes no provider call without a key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await convexTest(schema, modules).action(api.stylist.suggest, profile)).toMatchObject({ ok: false, message: expect.stringContaining('not ready') });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('uses the exact model and token cap and returns 5/3/3 suggestions', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(suggestions) }] }] })));
    vi.stubGlobal('fetch', fetchMock);
    const reply = await convexTest(schema, modules).action(api.stylist.suggest, profile);
    expect(reply).toEqual({ ok: true, result: suggestions });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toMatchObject({ model: 'gpt-6-luna', max_output_tokens: 500, store: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('shows a plain message for provider errors and still counts the attempt', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret provider details')));
    const t = convexTest(schema, modules);
    expect(await t.action(api.stylist.suggest, profile)).toEqual({ ok: false, message: 'We couldn’t get your suggestions. Please try again in a moment.' });
    expect(await t.run(ctx => ctx.db.query('aiQuota').withIndex('by_name', q => q.eq('name', 'openai')).unique())).toMatchObject({ calls: [expect.any(Number)] });
  });
  it('rejects incomplete or wrongly shaped AI output', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"colours":[]}' }] }] }))));
    expect(await convexTest(schema, modules).action(api.stylist.suggest, profile)).toMatchObject({ ok: false });
  });
  it('never calls OpenAI when the app-wide limit has been used', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only-key');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const t = convexTest(schema, modules);
    await t.run(ctx => ctx.db.insert('aiQuota', { name: 'openai', calls: Array(50).fill(Date.now()) }));
    expect(await t.action(api.stylist.suggest, profile)).toMatchObject({ ok: false, message: expect.stringContaining('hourly limit') });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects invalid height before spending the budget', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only-key');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await convexTest(schema, modules).action(api.stylist.suggest, { ...profile, height: 0 })).toMatchObject({ ok: false, message: expect.stringContaining('height') });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
