import test from 'node:test';
import assert from 'node:assert/strict';

import { useCasePalette } from '../scripts/load-source.mjs';

test('cycles the palette in vary mode', () => {
  assert.notDeepStrictEqual(useCasePalette(0, 'vary'), useCasePalette(1, 'vary'));
  assert.deepEqual(useCasePalette(0, 'vary'), useCasePalette(6, 'vary'));
  assert.deepEqual(useCasePalette(2), useCasePalette(2, 'vary'));
});

test('uniform mode paints every use case with the first palette', () => {
  assert.deepEqual(useCasePalette(0, 'uniform'), useCasePalette(1, 'uniform'));
  assert.deepEqual(useCasePalette(1, 'uniform'), useCasePalette(9, 'uniform'));
  assert.deepEqual(useCasePalette(0, 'uniform'), useCasePalette(0, 'vary'));
});
