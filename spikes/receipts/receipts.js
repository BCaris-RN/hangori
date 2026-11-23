// receipts.js — synthetic receipt definitions for the spike
// All restaurants, items, and IDs are made up.

const now = new Date("2026-11-26T19:00:00");

function iso(d) { return d.toISOString(); }
function addHours(d, h) { return new Date(d.getTime() + h * 3600 * 1000); }
function addDays(d, n) { return addHours(d, n * 24); }

// Purchase time formatted as printed on a receipt: "Nov 26, 2026  7:03 PM"
function fmt(d) {
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  });
}

const receipts = [
  // 1 — normal burger order
  {
    id: "R001", label: "normal-burger",
    merchant: "Stacked Buns",  category: "food",
    purchaseTime: fmt(addHours(now, -1)),
    items: [["Double Stack Burger", 9.49], ["Fries", 2.99], ["Lemonade", 2.49]],
    total: 14.97, receiptId: "SB20261126001",
    rotate: 0, blur: 0,
  },
  // 2 — normal taco order
  {
    id: "R002", label: "normal-taco",
    merchant: "Taco Milagro",  category: "food",
    purchaseTime: fmt(addHours(now, -2)),
    items: [["Fish Taco", 4.99], ["Street Taco ×2", 5.98], ["Horchata", 3.50]],
    total: 14.47, receiptId: "TM20261126088",
    rotate: 0, blur: 0,
  },
  // 3 — family order over $100
  {
    id: "R003", label: "family-order",
    merchant: "Golden Chopsticks",  category: "food",
    purchaseTime: fmt(addHours(now, -3)),
    items: [["Peking Duck (whole)", 48.00], ["Kung Pao Chicken", 18.50],
            ["Fried Rice ×2", 19.00], ["Spring Rolls ×6", 15.00], ["Tea ×4", 8.00]],
    total: 108.50, receiptId: "GC20261126202",
    rotate: 0, blur: 0,
  },
  // 4 — exact duplicate of R001 (same receipt, same fingerprint)
  {
    id: "R004", label: "exact-duplicate",
    merchant: "Stacked Buns",  category: "food",
    purchaseTime: fmt(addHours(now, -1)),
    items: [["Double Stack Burger", 9.49], ["Fries", 2.99], ["Lemonade", 2.49]],
    total: 14.97, receiptId: "SB20261126001",   // same ID as R001
    rotate: 0, blur: 0,
  },
  // 5 — re-photographed duplicate: same data, rotated 4° and blurred (simulates retake)
  {
    id: "R005", label: "rephotographed-duplicate",
    merchant: "Stacked Buns",  category: "food",
    purchaseTime: fmt(addHours(now, -1)),
    items: [["Double Stack Burger", 9.49], ["Fries", 2.99], ["Lemonade", 2.49]],
    total: 14.97, receiptId: "SB20261126001",   // same ID as R001
    rotate: 4, blur: 1.5,
  },
  // 6 — receipt 3 days old (outside 48-hour window)
  {
    id: "R006", label: "three-days-old",
    merchant: "Pasta Pronto",  category: "food",
    purchaseTime: fmt(addDays(now, -3)),
    items: [["Spaghetti Bolognese", 13.99], ["Garlic Bread", 3.50], ["House Wine", 7.00]],
    total: 24.49, receiptId: "PP20261123044",
    rotate: 0, blur: 0,
  },
  // 7 — dated tomorrow (future receipt, should be rejected)
  {
    id: "R007", label: "future-receipt",
    merchant: "Sunrise Diner",  category: "food",
    purchaseTime: fmt(addDays(now, 1)),
    items: [["Avocado Toast", 11.00], ["Cold Brew", 5.50]],
    total: 16.50, receiptId: "SD20261127012",
    rotate: 0, blur: 0,
  },
  // 8 — non-food store (hardware)
  {
    id: "R008", label: "non-food-hardware",
    merchant: "Bolt & Beam Hardware",  category: "hardware",
    purchaseTime: fmt(addHours(now, -5)),
    items: [["Wood Screws 3in ×50", 8.99], ["Paint Roller Kit", 14.49], ["Sandpaper Asst.", 6.75]],
    total: 30.23, receiptId: "BB20261126077",
    rotate: 0, blur: 0,
  },
  // 9 — no time printed on receipt
  {
    id: "R009", label: "no-time",
    merchant: "Wok & Roll",  category: "food",
    purchaseTime: null,   // date only, no time
    purchaseDate: "Nov 26, 2026",
    items: [["General Tso's Chicken", 13.50], ["Egg Fried Rice", 5.00]],
    total: 18.50, receiptId: "WR20261126033",
    rotate: 0, blur: 0,
  },
  // 10 — delivery-app order confirmation style (DashDrop, a made-up app)
  {
    id: "R010", label: "delivery-app-style",
    merchant: "Burger Barn",  category: "food",
    purchaseTime: fmt(addHours(now, -4)),
    deliveryApp: "DashDrop",
    items: [["Classic Smash Burger", 11.99], ["Onion Rings", 4.49], ["Chocolate Shake", 5.99]],
    subtotal: 22.47, deliveryFee: 2.99, serviceFee: 1.50, tip: 3.00,
    total: 29.96, receiptId: "DD20261126555",
    rotate: 0, blur: 0,
  },
  // 11 — ramen, normal
  {
    id: "R011", label: "normal-ramen",
    merchant: "Noodle Nirvana",  category: "food",
    purchaseTime: fmt(addHours(now, -6)),
    items: [["Tonkotsu Ramen", 14.00], ["Gyoza ×6", 7.50], ["Green Tea", 2.50]],
    total: 24.00, receiptId: "NN20261126091",
    rotate: 0, blur: 0,
  },
  // 12 — pizza, normal
  {
    id: "R012", label: "normal-pizza",
    merchant: "Inferno Pies",  category: "food",
    purchaseTime: fmt(addHours(now, -7)),
    items: [["Margherita 12in", 16.00], ["Caesar Salad", 9.00], ["Craft Soda", 3.50]],
    total: 28.50, receiptId: "IP20261126144",
    rotate: 0, blur: 0,
  },
  // 13 — sushi, normal
  {
    id: "R013", label: "normal-sushi",
    merchant: "Sakura Rolls",  category: "food",
    purchaseTime: fmt(addHours(now, -8)),
    items: [["Dragon Roll", 14.50], ["Edamame", 4.00], ["Miso Soup", 3.00]],
    total: 21.50, receiptId: "SR20261126199",
    rotate: 0, blur: 0,
  },
  // 14 — slightly rotated receipt (mild real-world camera tilt)
  {
    id: "R014", label: "tilted-receipt",
    merchant: "The Brunch Spot",  category: "food",
    purchaseTime: fmt(addHours(now, -9)),
    items: [["Eggs Benedict", 13.00], ["Fresh OJ", 5.00], ["Latte", 4.50]],
    total: 22.50, receiptId: "BS20261126066",
    rotate: 2, blur: 0,
  },
  // 15 — coffee shop, low total
  {
    id: "R015", label: "coffee-low-total",
    merchant: "Grounds Zero",  category: "food",
    purchaseTime: fmt(addHours(now, -10)),
    items: [["Oat Milk Latte", 5.50], ["Almond Croissant", 3.75]],
    total: 9.25, receiptId: "GZ20261126022",
    rotate: 0, blur: 0,
  },
  // 16 — BBQ, normal
  {
    id: "R016", label: "normal-bbq",
    merchant: "Smoke & Ember BBQ",  category: "food",
    purchaseTime: fmt(addHours(now, -11)),
    items: [["Brisket Plate", 19.00], ["Cornbread ×2", 5.00], ["Sweet Tea", 3.00]],
    total: 27.00, receiptId: "SE20261126178",
    rotate: 0, blur: 0,
  },
  // 17 — Indian, normal
  {
    id: "R017", label: "normal-indian",
    merchant: "Spice Route",  category: "food",
    purchaseTime: fmt(addHours(now, -12)),
    items: [["Chicken Tikka Masala", 16.50], ["Garlic Naan ×2", 5.00], ["Mango Lassi", 4.50]],
    total: 26.00, receiptId: "SR20261126211",
    rotate: 0, blur: 0,
  },
  // 18 — Mexican, normal
  {
    id: "R018", label: "normal-mexican",
    merchant: "Casa Verde",  category: "food",
    purchaseTime: fmt(addHours(now, -13)),
    items: [["Chicken Burrito", 12.50], ["Chips & Guac", 6.00], ["Agua Fresca", 3.50]],
    total: 22.00, receiptId: "CV20261126055",
    rotate: 0, blur: 0,
  },
  // 19 — Greek, normal
  {
    id: "R019", label: "normal-greek",
    merchant: "Olive & Feta",  category: "food",
    purchaseTime: fmt(addHours(now, -14)),
    items: [["Lamb Gyro", 11.00], ["Greek Salad", 9.50], ["Sparkling Water", 2.50]],
    total: 23.00, receiptId: "OF20261126130",
    rotate: 0, blur: 0,
  },
  // 20 — blurry / low quality (simulates poor photo)
  {
    id: "R020", label: "blurry-photo",
    merchant: "Harbor Fish Co.",  category: "food",
    purchaseTime: fmt(addHours(now, -15)),
    items: [["Fish & Chips", 15.00], ["Coleslaw", 3.50], ["Root Beer", 2.99]],
    total: 21.49, receiptId: "HF20261126088",
    rotate: 3, blur: 2.5,
  },
];

module.exports = { receipts };
