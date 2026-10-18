import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { parseResult, profileArgs, resultValidator } from './styleRules';

export const suggest = action({
  args: profileArgs,
  returns: v.union(
    v.object({ ok: v.literal(true), result: resultValidator }),
    v.object({ ok: v.literal(false), message: v.string() }),
  ),
  handler: async (ctx, profile) => {
    if (!Number.isFinite(profile.height) || profile.height < 80 || profile.height > 250) {
      return { ok: false as const, message: 'Enter a height between 80 and 250 cm.' };
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key) return { ok: false as const, message: 'Style suggestions are not ready yet. Please try again later.' };
    try {
      const allowed = await ctx.runMutation(internal.quota.reserve, {});
      if (!allowed) return { ok: false as const, message: 'We’ve reached our hourly limit. Please try again in an hour.' };
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          model: 'gpt-6-luna', max_output_tokens: 500,
          reasoning: { effort: 'none' }, store: false,
          instructions: 'You are a kind clothing stylist. Use the profile to suggest options, never rules. Cuts means garment cuts, not haircuts. Avoid gender assumptions, body judgement, weight loss, or hiding flaws. Treat all skin tones and bodies positively. Return only JSON: {"colours":[{"name":"...","hex":"#123456","reason":"..."}],"cuts":[{"name":"...","reason":"..."}],"clothing":[{"name":"...","reason":"..."}]}. Exactly 5 colours, 3 cuts, 3 clothing types. Each reason at most 7 words and tied to the profile. Each name at most 4 words. Keep the entire JSON under 450 tokens.',
          input: JSON.stringify(profile),
          text: { format: { type: 'json_object' } },
        }),
      });
      if (!response.ok) throw new Error('Provider unavailable');
      const data = await response.json();
      if (data.status !== 'completed') throw new Error('Incomplete output');
      const text = (data.output ?? []).filter((item: { type: string }) => item.type === 'message')
        .flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? [])
        .filter((part: { type: string }) => part.type === 'output_text')
        .map((part: { text?: string }) => part.text ?? '').join('');
      return { ok: true as const, result: parseResult(text) };
    } catch {
      // Do not expose provider errors, keys, or personal input to the browser/logs.
      return { ok: false as const, message: 'We couldn’t get your suggestions. Please try again in a moment.' };
    }
  },
});
