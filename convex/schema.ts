import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  aiQuota: defineTable({ name: v.literal('openai'), calls: v.array(v.number()) })
    .index('by_name', ['name']),
});
