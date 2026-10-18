import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

// A single transactional row serializes concurrent callers across the app.
// Failed provider attempts count too; no retries can bypass the budget.
export const reserve = internalMutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const now = Date.now();
    const row = await ctx.db.query('aiQuota').withIndex('by_name', q => q.eq('name', 'openai')).unique();
    const calls = (row?.calls ?? []).filter(time => time > now - 3_600_000);
    if (calls.length >= 50) return false;
    calls.push(now);
    if (row) await ctx.db.patch(row._id, { calls });
    else await ctx.db.insert('aiQuota', { name: 'openai', calls });
    return true;
  },
});
