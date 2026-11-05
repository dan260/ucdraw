import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDrawioFile } from '../scripts/load-source.mjs';

function useCase(name, index, extra = {}) {
  return {
    id: `uc-${index}`,
    name,
    system: 'Shop',
    kind: 'usecase',
    x: 40 + index * 150,
    y: 80,
    width: 120,
    height: 56,
    ...extra,
  };
}

function actor(name, index, extra = {}) {
  return {
    id: `actor-${index}`,
    name,
    kind: 'actor',
    x: 0,
    y: 40 + index * 120,
    width: 84,
    height: 100,
    ...extra,
  };
}

const PALETTE = { fill: '#dbe7ff', stroke: '#87a5e8' };

function layout(nodes, systems = []) {
  return {
    nodes,
    width: 800,
    height: 500,
    systems,
  };
}

test('renders node values and geometry', () => {
  const file = buildDrawioFile(
    layout([
      actor('Customer', 1),
      useCase('Place Order', 2, { palette: PALETTE }),
    ]),
    [],
  );

  assert.ok(file.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.match(file, /<mxfile host="app\.diagrams\.net".*<mxGraphModel/s);
  assert.ok(file.includes('value="Place Order"'));
  assert.ok(file.includes('value="Customer"'));
  assert.ok(file.includes('shape=umlActor'));
  assert.ok(file.includes('fillColor=#dbe7ff'));
  // x and y are offset by the page margin.
  assert.ok(file.includes('x="380" y="120" width="120" height="56"'));
});

test('falls back to the palette cycle when no palette is attached', () => {
  const file = buildDrawioFile(layout([useCase('Browse', 1)]), []);
  assert.match(file, /ellipse/);
});

test('draws relations as plain edges', () => {
  const file = buildDrawioFile(
    layout([
      actor('Customer', 1),
      useCase('Order', 2, { palette: PALETTE }),
    ]),
    [{ id: 'rel-1', line: 5, source: 'actor-1', target: 'uc-2' }],
  );

  const edge = file.match(/<mxCell id="relation-0".*<\/mxCell>/s);
  assert.ok(edge, 'the file should contain one edge cell');
  const cell = edge[0];
  assert.ok(cell.includes('edge="1"'));
  assert.ok(cell.includes('source="actor-actor-1"'));
  assert.match(cell, /target="usecase-uc-2"/);
  assert.ok(cell.includes('endArrow=none'));
  assert.ok(cell.includes('dashed=0'));
  assert.ok(cell.includes('value=""'));
  assert.ok(!cell.includes('open'));
  assert.ok(!cell.includes('<<'));
});

test('drops edges whose endpoints are missing', () => {
  const file = buildDrawioFile(
    layout([actor('Customer', 1)]),
    [{ id: 'rel-1', line: 5, source: 'actor-1', target: 'uc-missing' }],
  );
  assert.ok(!file.includes('relation-0'));
});

test('escapes XML in names', () => {
  const file = buildDrawioFile(
    layout([
      useCase('A & B <C> "D" \'E\'', 1, {
        system: 'Shop & Co',
        palette: PALETTE,
      }),
    ]),
    [],
  );
  assert.ok(file.includes('value="A &amp; B &lt;C&gt; &quot;D&quot; &apos;E&apos;"'));
});

test('emits system frames', () => {
  const file = buildDrawioFile(
    layout([useCase('Order', 1, { palette: PALETTE })], [
      { id: 'system-1', name: 'Shop', x: 0, y: 0, width: 200, height: 120, useCases: ['uc-1'] },
    ]),
    [],
  );
  assert.ok(file.includes('swimlane'));
  assert.ok(file.includes('value="Shop"'));
  assert.ok(file.includes('id="system-system-1"'));
});

test('chooses a page that fits the content', () => {
  const file = buildDrawioFile(
    layout([
      useCase('Order', 1, {
        x: 980,
        y: 760,
        palette: PALETTE,
      }),
    ]),
    [],
  );
  assert.match(file, /pageWidth="1180"/);
  assert.match(file, /pageHeight="896"/);

  const wide = buildDrawioFile(
    layout([
      useCase('Order', 1, {
        x: 1300,
        y: 40,
        palette: PALETTE,
      }),
    ]),
    [],
  );
  assert.match(wide, /pageWidth="1500"/);
  assert.match(wide, /pageHeight="827"/);
});

test('is well-formed XML', () => {
  const file = buildDrawioFile(
    layout([
      actor('Customer', 1),
      useCase('Place Order', 2, { palette: PALETTE }),
    ]),
    [{ id: 'rel-1', line: 5, source: 'actor-1', target: 'uc-2' }],
  );

  // A strict-ish check: every opening mxCell has a closing mxCell.
  const opens = (file.match(/<mxCell\s/g) || []).length;
  const closes = (file.match(/<\/mxCell>/g) || []).length;
  const selfClosing = (file.match(/<mxCell[^>]*\/>/g) || []).length;
  assert.equal(opens, closes + selfClosing);
  assert.ok(!file.includes('&'));
});
