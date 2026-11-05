'use strict';

const USECASE_PALETTES = [
  { fill: '#e9f0ff', stroke: '#3b6cf6' },
  { fill: '#e7f5ec', stroke: '#26875b' },
  { fill: '#fff1de', stroke: '#b66a12' },
  { fill: '#f0eaff', stroke: '#7a56d6' },
  { fill: '#fdebf9', stroke: '#b4448e' },
  { fill: '#e7f6f8', stroke: '#2a8593' },
];

const EDGE_COLOR = '#6b7486';

// 'vary' cycles the palette per use case; 'uniform' paints every use case
// with the same color.
function useCasePalette(index, mode = 'vary') {
  if (mode === 'uniform') return USECASE_PALETTES[0];
  return USECASE_PALETTES[index % USECASE_PALETTES.length];
}

const UC_HEIGHT = 56;
const UC_MIN_WIDTH = 116;
const UC_MAX_WIDTH = 300;

const ACTOR_HEIGHT = 104;
const ACTOR_MIN_WIDTH = 72;
const ACTOR_MAX_WIDTH = 220;

const SYSTEM_TITLE_HEIGHT = 42;
const SYSTEM_PADDING_X = 30;
const SYSTEM_PADDING_BOTTOM = 26;
