import { PANEL } from './data';
import type { State } from './store';

export type Selection = {
  cat: string;
  line: string;
  config: string;
  color: string;
  hex: string;
  where: string;
  version: string;
};

export function selectionsFor(state: State): Selection[] {
  const hex = (cat: string, name: string) => PANEL[cat].colors.find((c) => c.name === name)?.hex ?? '#f4f2ee';
  return [
    { cat: 'Roofing', line: 'CertainTeed Landmark PRO', config: 'Architectural, Shadow Ridge hip & ridge', color: state.picks.Roofing, hex: hex('Roofing', state.picks.Roofing), where: 'Patio roof, garage plane', version: 'Both versions' },
    { cat: 'Siding', line: 'ASCEND Composite Cladding', config: '7" clapboard, horizontal, matched corners', color: state.picks.Siding, hex: hex('Siding', state.picks.Siding), where: 'Rear wall, second story', version: state.favorite ? `Option ${state.favorite}` : 'Option A' },
    { cat: 'Patio doors', line: 'ProVia Endure Sliding', config: '6 ft, Low-E, brass lever, retractable screen', color: state.picks['Patio doors'], hex: hex('Patio doors', state.picks['Patio doors']), where: 'Rear elevation', version: 'Both versions' },
    { cat: 'Gutters, soffit & fascia', line: '6" seamless + leaf protection', config: '34 lin ft, 2 downspouts, vented soffit', color: 'White', hex: '#f4f2ee', where: 'Patio roof run', version: 'Not visualized' },
    { cat: 'Windows', line: 'ProVia Endure', config: 'Double hung, ComfortTech triple, no grids', color: 'White', hex: '#f4f2ee', where: 'Garage (2 units)', version: 'Quoted only' },
  ];
}

export function favName(state: State) {
  return state.favorite === 'B'
    ? 'Option B — Sandcastle / Moiré Black'
    : 'Option A — Alabaster / Weathered Wood';
}

export function versionImage(state: State, id: 'A' | 'B') {
  return state.versions.find((v) => v.id === id);
}
