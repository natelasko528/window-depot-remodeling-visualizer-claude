export const STEEL = '#5980a6';
export const INK = '#1d2d3d';
export const PAPER = '#f2f2f3';
export const GRAIN = 'repeating-linear-gradient(180deg, rgba(0,0,0,.06) 0 1px, transparent 1px 7px)';

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




export const TOOLS = ['Select', 'Auto detect', 'Brush', 'Erase'];
export const STEP_LABELS = ['Customer', 'Photos', 'Areas', 'Design', 'Summary'];
