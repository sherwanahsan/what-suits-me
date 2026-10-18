import { v } from 'convex/values';

export const skinTones = ['Fair', 'Light', 'Medium', 'Tan', 'Deep', 'Rich deep'] as const;
export const hairColours = ['Black', 'Dark brown', 'Light brown', 'Blonde', 'Red', 'Grey or white', 'Other'] as const;
export const bodyShapes = ['Balanced shoulders and hips', 'Fuller hips', 'Broader shoulders', 'Defined waist', 'Fuller middle', 'Not sure'] as const;
export const styles = ['Casual', 'Classic', 'Minimal', 'Streetwear', 'Bohemian', 'Bold and colourful'] as const;
export const profileArgs = {
  skinTone: v.union(...skinTones.map(v.literal)),
  hairColour: v.union(...hairColours.map(v.literal)),
  height: v.number(),
  bodyShape: v.union(...bodyShapes.map(v.literal)),
  style: v.union(...styles.map(v.literal)),
};
export const itemValidator = v.object({ name: v.string(), reason: v.string() });
export const resultValidator = v.object({
  colours: v.array(v.object({ name: v.string(), reason: v.string(), hex: v.string() })),
  cuts: v.array(itemValidator),
  clothing: v.array(itemValidator),
});
export type StyleItem = { name: string; reason: string };
export type StyleResult = {
  colours: (StyleItem & { hex: string })[];
  cuts: StyleItem[];
  clothing: StyleItem[];
};

export function parseResult(text: string): StyleResult {
  const value = JSON.parse(text);
  for (const [key, count] of [['colours', 5], ['cuts', 3], ['clothing', 3]] as const) {
    if (!Array.isArray(value?.[key]) || value[key].length !== count) throw new Error('Invalid suggestions');
    for (const item of value[key]) {
      if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 70 ||
        typeof item.reason !== 'string' || !item.reason.trim() || item.reason.length > 220) throw new Error('Invalid suggestion');
      if (key === 'colours' && (typeof item.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(item.hex))) throw new Error('Invalid colour');
    }
  }
  // Strip any additional provider fields before crossing the return validator.
  const clean = (item: StyleItem) => ({ name: item.name, reason: item.reason });
  return {
    colours: value.colours.map((item: StyleItem & { hex: string }) => ({ ...clean(item), hex: item.hex })),
    cuts: value.cuts.map(clean), clothing: value.clothing.map(clean),
  };
}
