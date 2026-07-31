export const BEFORE = '/assets/rear-elevation-before.jpg';
export const AFTER = '/assets/rear-elevation-after.png';

export const STEEL = '#5980a6';
export const INK = '#1d2d3d';
export const PAPER = '#f2f2f3';
export const GRAIN = 'repeating-linear-gradient(180deg, rgba(0,0,0,.06) 0 1px, transparent 1px 7px)';
export const OPTION_B_FILTER = 'sepia(.24) saturate(1.3) brightness(.99)';

export type Category = { name: string; zone: string; brands: string };

export const CATS: Category[] = [
  { name: 'Windows', zone: 'Exterior', brands: 'ProVia Endure · Aspect · Aeris' },
  { name: 'Roofing', zone: 'Exterior', brands: 'CertainTeed Landmark · Grand Manor' },
  { name: 'Siding', zone: 'Exterior', brands: 'ASCEND composite · CertainTeed vinyl' },
  { name: 'Entry doors', zone: 'Exterior', brands: 'ProVia Signet · Heritage · Legacy' },
  { name: 'Patio doors', zone: 'Exterior', brands: 'ProVia Endure sliding · Aeris hinged' },
  { name: 'Gutters, soffit & fascia', zone: 'Exterior', brands: 'Seamless aluminum · leaf guard' },
  { name: 'Bathrooms', zone: 'Interior', brands: 'Samuel Mueller solid surface' },
  { name: 'Flooring', zone: 'Interior', brands: 'Luxury vinyl plank · tile' },
];

export type Area = {
  id: string;
  name: string;
  cat: string;
  meta: string;
  x: string;
  y: string;
  w: string;
  h: string;
};

export const AREAS: Area[] = [
  { id: 'roof-awning', name: 'Patio roof', cat: 'Roofing', meta: 'Auto-detected · 118 sq ft', x: '31%', y: '16%', w: '51%', h: '13%' },
  { id: 'roof-main', name: 'Garage roof plane', cat: 'Roofing', meta: 'Auto-detected · 640 sq ft', x: '0%', y: '17%', w: '32%', h: '23%' },
  { id: 'siding-right', name: 'Rear wall siding', cat: 'Siding', meta: 'Auto-detected · 1,240 sq ft', x: '64%', y: '27%', w: '36%', h: '50%' },
  { id: 'siding-upper', name: 'Second story siding', cat: 'Siding', meta: 'Auto-detected · 900 sq ft', x: '20%', y: '0%', w: '80%', h: '16%' },
  { id: 'door-patio', name: 'Patio door', cat: 'Patio doors', meta: 'Auto-detected · 6 ft slider', x: '42%', y: '28%', w: '21%', h: '40%' },
  { id: 'windows-lower', name: 'Garage windows (2)', cat: 'Windows', meta: 'Auto-detected · double hung', x: '7%', y: '40%', w: '21%', h: '19%' },
  { id: 'gutter-awning', name: 'Gutter run', cat: 'Gutters, soffit & fascia', meta: 'Suggested · 34 lin ft', x: '31%', y: '27%', w: '51%', h: '4%' },
];

export type ProductLine = { name: string; note: string; tier: string };
export type Swatch = { name: string; hex: string };
export type PanelOption = { label: string; value: string };

export type PanelSpec = {
  title: string;
  brand: string;
  lines: ProductLine[];
  line: string;
  colors: Swatch[];
  color: string;
  optionLabel: string;
  options: PanelOption[];
};

export const PANEL: Record<string, PanelSpec> = {
  Roofing: {
    title: 'Patio roof — CertainTeed',
    brand: 'CertainTeed',
    lines: [
      { name: 'Landmark', note: 'Two-piece architectural, 30-yr', tier: 'Good' },
      { name: 'Landmark PRO', note: 'Heavier, Max Def color blends', tier: 'Better' },
      { name: 'Grand Manor', note: 'Luxury shake profile, 5-layer', tier: 'Best' },
    ],
    line: 'Landmark PRO',
    colors: [
      { name: 'Weathered Wood', hex: '#7a6f5f' },
      { name: 'Moiré Black', hex: '#2f3237' },
      { name: 'Colonial Slate', hex: '#5c5f63' },
      { name: 'Georgetown Gray', hex: '#6f7377' },
      { name: 'Burnt Sienna', hex: '#7d4b3a' },
      { name: 'Heather Blend', hex: '#5a5b64' },
    ],
    color: 'Weathered Wood',
    optionLabel: 'Roof details',
    options: [
      { label: 'Ridge & hip', value: 'Shadow Ridge' },
      { label: 'Ventilation', value: 'Ridge vent, 34 ft' },
      { label: 'Drip edge', value: 'Matched metal' },
    ],
  },
  Siding: {
    title: 'Rear wall siding — ASCEND',
    brand: 'CertainTeed',
    lines: [
      { name: 'CertainTeed MainStreet', note: 'Vinyl, D4 clapboard', tier: 'Good' },
      { name: 'CertainTeed Cedar Impressions', note: 'Shake and shingle profiles', tier: 'Better' },
      { name: 'ASCEND Composite Cladding', note: 'Graphite-infused, 20 colors, 7" exposure', tier: 'Best' },
    ],
    line: 'ASCEND Composite Cladding',
    colors: [
      { name: 'Alabaster', hex: '#eae5da' },
      { name: 'Sandcastle', hex: '#d8c9ae' },
      { name: 'Fawn', hex: '#b9a58b' },
      { name: 'Sage', hex: '#8e9484' },
      { name: 'Slate', hex: '#6d7681' },
      { name: 'Midnight', hex: '#2d3742' },
    ],
    color: 'Alabaster',
    optionLabel: 'Profile & trim',
    options: [
      { label: 'Profile', value: '7" clapboard' },
      { label: 'Orientation', value: 'Horizontal' },
      { label: 'Corner posts', value: 'Matched, 5"' },
      { label: 'Trim & wrap', value: 'White aluminum' },
    ],
  },
  'Patio doors': {
    title: 'Patio door — ProVia',
    brand: 'ProVia',
    lines: [
      { name: 'Endure Sliding', note: 'Vinyl, triple-pane available', tier: 'Better' },
      { name: 'Aeris Hinged French', note: 'Wood interior, clad exterior', tier: 'Best' },
      { name: 'Aspect Sliding', note: 'Value vinyl slider', tier: 'Good' },
    ],
    line: 'Endure Sliding',
    colors: [
      { name: 'White', hex: '#f4f2ee' },
      { name: 'Almond', hex: '#e2d6c0' },
      { name: 'Clay', hex: '#c9b79f' },
      { name: 'Bronze', hex: '#4c4238' },
      { name: 'Black', hex: '#25262a' },
      { name: 'Slate Gray', hex: '#6a7078' },
    ],
    color: 'White',
    optionLabel: 'Configuration',
    options: [
      { label: 'Glass', value: 'ComfortTech Low-E' },
      { label: 'Grids', value: 'None' },
      { label: 'Hardware', value: 'Brass lever' },
      { label: 'Screen', value: 'Full, retractable' },
    ],
  },
  Windows: {
    title: 'Garage windows — ProVia',
    brand: 'ProVia',
    lines: [
      { name: 'Aspect', note: 'Vinyl, budget-conscious', tier: 'Good' },
      { name: 'Endure', note: '#1 quality-rated vinyl replacement', tier: 'Better' },
      { name: 'Aeris', note: 'Real-wood hybrid', tier: 'Best' },
    ],
    line: 'Endure',
    colors: [
      { name: 'White', hex: '#f4f2ee' },
      { name: 'Almond', hex: '#e2d6c0' },
      { name: 'Sandstone', hex: '#cbbba3' },
      { name: 'Bronze', hex: '#4c4238' },
      { name: 'Black', hex: '#25262a' },
      { name: 'Cranberry', hex: '#6d2b30' },
    ],
    color: 'White',
    optionLabel: 'Window configuration',
    options: [
      { label: 'Style', value: 'Double hung' },
      { label: 'Grid pattern', value: 'None' },
      { label: 'Glass package', value: 'ComfortTech triple' },
      { label: 'Interior finish', value: 'White' },
    ],
  },
  'Gutters, soffit & fascia': {
    title: 'Gutter run',
    brand: 'Seamless aluminum',
    lines: [
      { name: '5" K-style seamless', note: 'Aluminum, .032', tier: 'Good' },
      { name: '6" K-style seamless', note: 'Oversize, .032 with hidden hangers', tier: 'Better' },
      { name: '6" + Leaf protection', note: 'Micro-mesh guard, lifetime clog-free', tier: 'Best' },
    ],
    line: '6" + Leaf protection',
    colors: [
      { name: 'White', hex: '#f4f2ee' },
      { name: 'Almond', hex: '#e2d6c0' },
      { name: 'Musket Brown', hex: '#4a3b31' },
      { name: 'Black', hex: '#25262a' },
      { name: 'Clay', hex: '#c9b79f' },
      { name: 'Royal Brown', hex: '#5b463a' },
    ],
    color: 'White',
    optionLabel: 'Run details',
    options: [
      { label: 'Downspouts', value: '2 × 3" × 4"' },
      { label: 'Soffit', value: 'Vented, matched' },
      { label: 'Fascia wrap', value: 'Aluminum, white' },
    ],
  },
};

export const GEN_STAGES = [
  'Reading the photo and the home’s architecture',
  'Masking the areas you confirmed',
  'Applying ASCEND Alabaster and Landmark PRO',
  'Matching the 2:14 PM light and shadows',
  'Rebuilding trim, gutter and reflection edges',
  'Rendering the full-resolution result',
];

export const LIBRARY = [
  { cat: 'Windows & patio doors', brand: 'ProVia', lines: 'Endure · Aspect · Aeris · sliding patio', cached: '18 colors cached', swatches: ['#f4f2ee', '#e2d6c0', '#cbbba3', '#4c4238', '#25262a'] },
  { cat: 'Entry & storm doors', brand: 'ProVia', lines: 'Signet · Heritage · Legacy · Embarq · Spectrum', cached: '42 colors cached', swatches: ['#8c3b2f', '#2f4a3c', '#1f2c3a', '#6c4a2c', '#e7e2d8'] },
  { cat: 'Roofing', brand: 'CertainTeed', lines: 'Landmark · Landmark PRO · Grand Manor · Presidential', cached: '14 colors cached', swatches: ['#7a6f5f', '#2f3237', '#5c5f63', '#7d4b3a', '#5a5b64'] },
  { cat: 'Siding', brand: 'ASCEND / CertainTeed', lines: 'Composite cladding · MainStreet · Cedar Impressions', cached: '20 colors cached', swatches: ['#eae5da', '#d8c9ae', '#b9a58b', '#8e9484', '#2d3742'] },
  { cat: 'Bathrooms', brand: 'Samuel Mueller', lines: 'Solid surface walls · tub-to-shower · barrier free', cached: '9 patterns cached', swatches: ['#efeae2', '#dcd3c6', '#b9b2a6', '#8a8378', '#4c4a45'] },
  { cat: 'Gutters & protection', brand: 'Seamless aluminum', lines: '5" and 6" K-style · micro-mesh guard', cached: '11 colors cached', swatches: ['#f4f2ee', '#e2d6c0', '#4a3b31', '#25262a', '#c9b79f'] },
];

export const RECENT_CUSTOMERS = [
  { name: 'Nowak', city: 'Wauwatosa', meta: '2 properties' },
  { name: 'Delacroix', city: 'Milwaukee', meta: '1 project' },
  { name: 'Hartmann', city: 'Milwaukee', meta: 'Quote sent' },
  { name: 'Vasquez', city: 'Brookfield', meta: 'Follow-up' },
];

export const CUSTOMERS = [
  { name: 'Dan & Kathy Nowak', address: '12345 W. Bluemound Rd, Wauwatosa, WI 53213', phone: '(414) 555-0148', email: 'knowak@example.com', badge: "Today's 2 PM", note: 'Rear of house — old slider leaks, siding chalking. Both spouses home. Kathy decides colors.', projects: 1 },
  { name: 'Marie Delacroix', address: '806 E Center St, Milwaukee, WI 53212', phone: '(414) 555-0912', email: 'mdela@example.com', badge: 'Repeat customer', note: 'Windows quoted in March. Wants to see an entry door on the same photos.', projects: 3 },
  { name: 'Greg Hartmann', address: '4429 N 68th St, Milwaukee, WI 53216', phone: '(414) 555-0347', email: 'ghartmann@example.com', badge: 'Bath remodel', note: 'Tub-to-shower conversion. Needs interior room photos.', projects: 1 },
  { name: 'Luis & Ana Vasquez', address: '17110 Cleveland Ave, Brookfield, WI 53005', phone: '(262) 555-0233', email: 'lvasquez@example.com', badge: 'New lead', note: 'Roof hail damage; insurance involved. Bring roofing samples.', projects: 0 },
];

export const PHOTO_STRIP = [
  { label: 'Front', src: AFTER, selected: false, opacity: 0.75 },
  { label: 'Rear · in use', src: BEFORE, selected: true, opacity: 1 },
  { label: 'Left · dim', src: BEFORE, selected: false, opacity: 0.45 },
  { label: 'Right', src: AFTER, selected: false, opacity: 0.75 },
];

export const TOOLS = ['Select', 'Auto detect', 'Brush', 'Erase'];
export const STEP_LABELS = ['Customer', 'Photos', 'Areas', 'Design', 'Summary'];
