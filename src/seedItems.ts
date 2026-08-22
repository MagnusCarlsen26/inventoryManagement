import { CategoryId, Item } from './types';

/**
 * The master item list, as sent by the client on 2026-08-22 (WhatsApp, lists A–E).
 *
 * This supersedes the earlier best-effort transcription of the handwritten notebook
 * pages: the client re-dictated every item and its restock frequency, so this list —
 * not the notebook — is now the source of truth. Everything stays editable in-app.
 *
 * Bump SEED_VERSION whenever these lists change so existing installs and the shared
 * Supabase database get reconciled onto the new list (see `reviseSeed` below).
 */
export const SEED_VERSION = 2;

const RAW: Record<CategoryId, string[]> = {
  // A — Daily
  daily: [
    'Paneer', 'Dahi', 'Vanilla', 'Milk', 'Burger Bun', 'Pizza Base', 'Bread', 'Pav',
    'Garlic',
  ],
  // B — Every 4 Days
  '4d': ['Oil Pantry', 'Oil Indian', 'Brownie'],
  // C — Weekly
  weekly: [
    'Mozzarella', 'Sugar', 'Fries', 'Burger Patty', 'Petrol', 'Water Bottle', 'Sprite',
    'Coke', 'Other Cold Drink', 'Paneer Momos', 'Veg Momos', 'Cheese Momos',
  ],
  // D — Every 15 Days.
  // 'Staff Rice' was dictated twice; 'Tissue' appears here and again under E. Both are
  // de-duplicated by `dedupe` below, first listing wins — so Tissue lands on 15 days.
  '15d': [
    'KitKat', 'Oreo', 'Maida', 'Atta', 'Toor Dal', 'Table Rice', 'Staff Rice', 'Zero Sev',
    'Barik Sev', 'Salt', 'Mushroom', 'Baby Corn', 'Delicious', 'Cheese Block',
    'Pineapple Ice Cream', 'Mango Ice Cream', 'Strawberry Ice Cream', 'Choco Ice Cream',
    'Noodles', 'Tissue', 'Staff Rice', 'Cheese Slice', 'Soya Bean', 'Pasta', 'Corn Flakes',
    'Detergent', 'Orange Juice', 'Mix Veg', 'Sweet Corn', 'Peas', 'Mayo', 'Peri Mayo',
    'Pizza Sauce', 'Peri Peri Masala', 'Liquid Cheese', 'Coal', 'Cylinder', 'Sauce Can',
    'Garlic Sev', 'Momo Dip', 'Spring Roll', 'Dark Chocolate', 'Poha', 'Bartan Liquid',
  ],
  // E — Every 30 Days
  monthly: [
    'Chaat Masala', 'Red Mirchi Powder', 'Byadgi Mirchi', 'Garam Masala', 'White Pepper',
    'Black Til', 'White Til', 'Dhaniya Powder', 'Kitchen King', 'Kasoori Methi',
    'Kopra Kiss', 'Bread Crumbs', 'Haldi', 'Biryani Masala', 'Elaichi', 'Dalchini',
    'Saunf', 'Star Fool', 'Kali Mirchi', 'Laung', 'Jeera', 'Akha Dhaniya', 'Fresh Cream',
    'Chocolate Paste', 'Javitri', 'Black Elaichi', 'Kaju Akha', 'Tej Patta',
    'Marie Biscuit', 'Printer Roll', 'Peach Syrup', 'Matki', 'Chana', 'Rajma',
    'Moong Dal', 'White Vatana', 'Chana Dal', 'Sweet Chilli Sauce', 'Chipotle',
    'Gulab Jamun Mix', 'Blue Curacao', 'Tea', 'Ice Tea', 'Coffee', 'Hazelnut Coffee',
    'Papdi', 'Strawberry Syrup', 'Paan Syrup', 'Mango Syrup', 'Pineapple Syrup',
    'Rose Syrup', 'Hairnet', 'Momo Dip Pouch', 'Peanut Butter', 'Kaju Kani', 'Magaj',
    'Red Colour', 'Yellow Colour', 'Achar', 'Honey', 'Saunf Mint', 'Shendana',
    'Corn Flour', 'Maggi', 'Sauce Pouch', 'Oregano', 'Chilli Flakes', 'Rose Water',
    'Kewda Water', 'Mustard Oil', 'Papad', 'Nagli', 'Ghee', 'Aromatic Powder',
    'Soya Sauce', 'Chilli Sauce', 'Vinegar', 'Carry Bag 13x16', 'Carry Bag 10x14',
    'Carry Bag 16x20', 'Carry Bag 8x10', 'Pizza Box', 'S/W Box', 'Burger Box',
    'Aluminium 750', 'Aluminium 450', 'Parcel Glass', 'Dispo Glass', 'Dispo Plate',
    'Fork / Spoon', 'Tissue', 'Straw', 'Silver Foil', 'Clean Foil', 'Garbage Bag',
    'Sponge Wipes', 'Choco Syrup', 'Plastic 500', 'Plastic 750',
  ],
};

/**
 * Seed ids are derived from the item name rather than its position in the list, so a
 * later edit to one category cannot silently re-point another item's id (and with it
 * its check history) at a different product.
 */
export const seedId = (name: string) =>
  `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

/** First listing of a name wins; later repeats (within or across categories) are dropped. */
function dedupe(): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const cat of Object.keys(RAW) as CategoryId[]) {
    for (const name of RAW[cat]) {
      const id = seedId(name);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, name, category: cat });
    }
  }
  return out;
}

export const SEED_ITEMS: Item[] = dedupe();

/** Fast membership test for "is this row still part of the shipped seed list?". */
export const SEED_IDS: ReadonlySet<string> = new Set(SEED_ITEMS.map((it) => it.id));

/** Rows the app itself seeded, as opposed to `u-`-prefixed items a user added in-app. */
export const isSeedId = (id: string) => id.startsWith('seed-');

export interface SeedRevision {
  /** The full new list — every one of these should exist with this name and category. */
  upserts: Item[];
  /** Ids of previously-seeded items that the new list drops. */
  staleIds: string[];
}

/**
 * Diff an existing item set against the current seed list.
 *
 * Items a user added in-app are never touched; only rows this app seeded and that the
 * client has since dropped are reported as stale.
 */
export function reviseSeed(existing: Pick<Item, 'id'>[]): SeedRevision {
  return {
    upserts: SEED_ITEMS,
    staleIds: existing.map((it) => it.id).filter((id) => isSeedId(id) && !SEED_IDS.has(id)),
  };
}

/**
 * Apply a revision to a full item list — the local-cache counterpart of `reviseSeed`.
 *
 * Items the user added in-app (`u-` ids) are kept untouched. Previously-seeded rows are
 * replaced by their current definition and any the client has since dropped are removed
 * — so a seed item the client re-filed under a different frequency does move, which is
 * the point: the shipped list is the source of truth at each version bump.
 */
export function mergeSeed(existing: Item[]): Item[] {
  const { upserts, staleIds } = reviseSeed(existing);
  const stale = new Set(staleIds);
  const kept = existing.filter((it) => !stale.has(it.id) && !SEED_IDS.has(it.id));
  return [...upserts, ...kept];
}
