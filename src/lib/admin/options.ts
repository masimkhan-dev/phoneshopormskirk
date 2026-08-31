/** Shared counter dropdown options so staff select instead of retyping. */

export const BRANDS = [
  "Apple",
  "Samsung",
  "Google",
  "Xiaomi",
  "OnePlus",
  "Huawei",
  "Honor",
  "Motorola",
  "Nokia",
  "Oppo",
  "Sony",
  "Nothing",
  "Other",
];

export const MODELS_BY_BRAND: Record<string, string[]> = {
  Apple: [
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16",
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15",
    "iPhone 14 Pro Max",
    "iPhone 14 Pro",
    "iPhone 14",
    "iPhone 13 Pro Max",
    "iPhone 13 Pro",
    "iPhone 13",
    "iPhone 13 mini",
    "iPhone 12 Pro Max",
    "iPhone 12 Pro",
    "iPhone 12",
    "iPhone 11 Pro",
    "iPhone 11",
    "iPhone XR",
    "iPhone SE (2022)",
    "iPad Air",
    "iPad Pro",
  ],
  Samsung: [
    "Galaxy S25 Ultra",
    "Galaxy S24 Ultra",
    "Galaxy S24",
    "Galaxy S23 Ultra",
    "Galaxy S23",
    "Galaxy S22",
    "Galaxy S21",
    "Galaxy A55",
    "Galaxy A54",
    "Galaxy A34",
    "Galaxy A15",
    "Galaxy Z Flip 5",
    "Galaxy Z Fold 5",
    "Galaxy Tab A9",
  ],
  Google: ["Pixel 9 Pro", "Pixel 9", "Pixel 8 Pro", "Pixel 8", "Pixel 8a", "Pixel 7", "Pixel 6a"],
  Xiaomi: ["Redmi Note 13 Pro", "Redmi Note 12", "Xiaomi 14", "Xiaomi 13T", "Poco X6"],
  OnePlus: ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3", "OnePlus Nord CE 3"],
  Huawei: ["P60 Pro", "P40 Pro", "Nova 11", "Mate 20 Pro"],
  Honor: ["Magic 6 Pro", "Honor 90", "Honor 70", "Honor X8"],
  Motorola: ["Edge 50 Pro", "Edge 40", "Moto G84", "Moto G54"],
  Nokia: ["Nokia G42", "Nokia X30", "Nokia 105"],
  Oppo: ["Find X5 Pro", "Reno 10", "A78"],
  Sony: ["Xperia 1 VI", "Xperia 5 V", "Xperia 10 V"],
  Nothing: ["Phone (2a)", "Phone (2)", "Phone (1)"],
};

export const STORAGE_OPTIONS = [
  "16GB",
  "32GB",
  "64GB",
  "128GB",
  "256GB",
  "512GB",
  "1TB",
];

export const COLOUR_OPTIONS = [
  "Black",
  "White",
  "Silver",
  "Space Grey",
  "Graphite",
  "Midnight",
  "Starlight",
  "Blue",
  "Green",
  "Purple",
  "Pink",
  "Red",
  "Gold",
  "Titanium",
  "Other",
];

export const NETWORK_OPTIONS = [
  "Unlocked",
  "EE",
  "O2",
  "Vodafone",
  "Three",
  "Tesco Mobile",
  "Sky Mobile",
  "giffgaff",
  "Other",
];

export const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "FAULTY", label: "Faulty" },
];

export const BATTERY_OPTIONS = [
  "100%",
  "95%",
  "90%",
  "85%",
  "80%",
  "Below 80%",
  "Unknown",
];

export const COMMON_FAULTS = [
  "Screen replacement",
  "Battery replacement",
  "Charging port",
  "Back glass",
  "Camera",
  "Speaker / earpiece",
  "Microphone",
  "Water damage",
  "Software / no boot",
  "Unlocking",
  "Data transfer",
  "Diagnostics",
  "Other",
];

export const ACCESSORY_OPTIONS = [
  "None",
  "Case",
  "Charging cable",
  "Charger and cable",
  "Box only",
  "Box, charger and cable",
  "SIM tray",
  "Earphones",
];

export function modelsFor(brand: string): string[] {
  return MODELS_BY_BRAND[brand] ?? [];
}
