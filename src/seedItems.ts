import { CategoryId, Item } from './types';

/**
 * Best-effort transcription of the 4 handwritten notebook pages, de-duplicated
 * and given an initial restock category by perishability / usage. Everything is
 * editable in-app, so misreads can be fixed by the user.
 */
const RAW: Record<CategoryId, string[]> = {
  // Fresh & highly perishable — checked/restocked daily.
  daily: [
    'Coriander (Dhaniya)', 'Mint (Pudina)', 'Milk', 'Malai Paneer', 'Curd (Dahi)',
    'Fresh Cream', 'Bread', 'Pav', 'Banana', 'Spring Onion', 'Lemon (Nimbu)',
    'Tomato', 'Cucumber', 'Capsicum', 'Onion (Kanda)', 'Cabbage', 'Palak (Spinach)',
    'Methi', 'Mushroom', 'Mozzarella', 'Cheese Slice',
  ],
  // Semi-perishable veg & fast-moving prep — every ~4 days.
  '4d': [
    'Potato (Aloo)', 'Garlic (Lasun)', 'Adrak (Ginger)', 'Carrot (Gajar)', 'Beans',
    'Lady Finger', 'Bottle Gourd', 'Ridge Gourd', 'Matki / Chana (soaked)',
    'Green Mirchi', 'Kaju', 'Kaju Tukda', 'Kaju Kani', 'Burger Tikki', 'Veg Momo',
    'Paneer Momo', 'Cheese Momo', 'Corn Momo', 'Spring Roll', 'Sweet Corn', 'Green Peas',
  ],
  // Sauces, dips & regular restock — weekly.
  weekly: [
    'Mayo', 'Peri Mayo', 'Chilli Sauce', 'Soya Sauce', 'Sweet Chilli Sauce', 'Chipotle',
    'Honey', 'Dana Chutney', 'Imli Chutney', 'Schezwan', 'Tomato Can', 'Amul Butter',
    'IP Butter', 'White Butter', 'Ghee', 'Pizza Base', 'Noodles', 'Maggi', 'Margarine',
    'Water Bottle', 'Sprite', 'Cold Drink', 'Orange Juice',
  ],
  // Masalas, mid-shelf, syrups — every 15 days.
  '15d': [
    'Haldi', 'Jeera', 'Jeera Powder', 'Garam Masala', 'Chaat Masala', 'Kitchen King',
    'Biryani Masala', 'Kasuri Methi', 'Dhaniya Powder', 'Kashmiri Mirchi', 'Ambari Mirchi',
    'Peri Peri Masala', 'Magic Masala', 'Tej Patta', 'Dalchini', 'Laung', 'Elaichi',
    'Black Elaichi', 'Kali Miri', 'Star Anise', 'Javitri', 'Jaiphal', 'Byadgi Mirchi',
    'Akkha Dhaniya', 'Mango Ridai', 'Chaat Masala (sachet)',
    'Rose Syrup', 'Mango Syrup', 'Pineapple Syrup', 'Kulfi Syrup', 'Strawberry Syrup',
    'Paan Syrup', 'Chocolate Syrup', 'Green Apple Syrup', 'Blueberry Syrup',
    '4 Berries Syrup', 'Rasmalai Syrup', 'Rose Water', 'Kewda Water', 'Choco Syrup',
  ],
  // Dry staples, oils, disposables, packaging & bulk — monthly.
  monthly: [
    'Atta', 'Maida', 'Rava', 'Besan', 'Poha', 'Sooji', 'Toor Dal', 'Mango Dal', 'Chana Dal',
    'Green Mung', 'White Vatana', 'Salt', 'Black Salt', 'Sugar', 'Tea', 'Ice Tea',
    'Coconut Powder', 'Corn Flour', 'Bread Crumb', 'Printer Roll', 'Tissue',
    'Silver Foil', 'Clean Foil', 'Foil 450ml', 'Foil 500ml Silver', 'Silver 250',
    'Silver 600', 'Silver 750', 'Plastic 250', 'Plastic 750', 'Curry Bag', 'Garlic Bag',
    'Baby Corn Bag', 'Disposable Glass', 'Disposable Plate', 'Disposable Spoon',
    'Disposable Fork', 'Straw', 'Pizza Box', 'Burger Box', 'Slice Box', 'Shakal Glass',
    'Transparent Container', 'Oil', 'Mustard Oil', 'Vinegar', 'Detergent', 'Bartan Liquid',
    'Soya Chunks', 'Gas Cylinder', 'Gas (Red)', 'Kitkat', 'Oreo', 'Marie Biscuit',
    'Brownie', 'Waffle Mix', 'Chaat Basket', 'Blade Salt', 'Cocoa Powder', 'Choco Dip',
    'Hazelnut Paste', 'Choco Paste', 'Davinci Paste', 'Peanut Butter', 'Table Rice',
    'Staff Rice', 'White Vatana (staff)', 'Repair', 'Nagli', 'Zero Sev', 'Barik Sev',
    'Garlic Sev', 'Papdi', 'Fries', 'Kaju (bulk)', 'Nutmeg', 'Peach', 'Mande',
  ],
};

let counter = 0;
export const SEED_ITEMS: Item[] = (Object.keys(RAW) as CategoryId[]).flatMap((cat) =>
  RAW[cat].map((name) => ({ id: `seed-${counter++}`, name, category: cat })),
);
