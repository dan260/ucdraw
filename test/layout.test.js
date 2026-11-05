import test from 'node:test';
import assert from 'node:assert/strict';

import { layoutUseCaseDiagram } from '../scripts/load-source.mjs';

function useCase(name, system = null, width = 120, height = 56, id = null) {
  return {
    id: id ?? `uc-${name}`,
    name,
    system,
    kind: 'usecase',
    width,
    height,
  };
}

function actor(name, width = 84, height = 100, id = null) {
  return {
    id: id ?? `actor-${name}`,
    name,
    kind: 'actor',
    width,
    height,
  };
}

function systemRecord(name, ids) {
  return { id: `system-${name}`, name, line: 1, closeLine: 2, useCases: ids };
}

function byName(layout) {
  return new Map(layout.nodes.map((item) => [item.name, item]));
}

function overlapping(first, second) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

function assertNoOverlaps(layout) {
  for (let first = 0; first < layout.nodes.length; first += 1) {
    for (let second = first + 1; second < layout.nodes.length; second += 1) {
      assert.equal(
        overlapping(layout.nodes[first], layout.nodes[second]),
        false,
        `${layout.nodes[first].name} overlaps ${layout.nodes[second].name}`,
      );
    }
  }
}

test('returns empty bounds for an empty schema', () => {
  assert.deepEqual(layoutUseCaseDiagram([], []), {
    nodes: [],
    width: 0,
    height: 0,
    systems: [],
  });
});

test('centers a single use case with no actor', () => {
  const layout = layoutUseCaseDiagram(
    [useCase('Browse')],
    [],
    { layout: 'horizontal' },
  );
  const node = byName(layout).get('Browse');
  assert.equal(node.x, 0);
  assert.equal(node.y, 0);
  assert.equal(layout.width, 120);
  assert.equal(layout.height, 56);
});

test('puts actors in a zone to the left of the use cases (horizontal)', () => {
  const layout = layoutUseCaseDiagram(
    [
      actor('Customer'),
      useCase('Order', 'Shop'),
      useCase('Pay', 'Shop'),
    ],
    [],
    { layout: 'horizontal', systems: [systemRecord('Shop', ['uc-Order', 'uc-Pay'])] },
  );

  const positions = byName(layout);
  // The actor sits closer to the left edge than the use cases.
  assert.equal(
    positions.get('Customer').x,
    Math.min(
      positions.get('Order').x,
      positions.get('Pay').x,
      positions.get('Customer').x,
    ),
  );
  assert.ok(positions.get('Customer').x < positions.get('Order').x);
  assert.ok(positions.get('Customer').x < positions.get('Pay').x);

  // The two use cases of the system stack on top of each other.
  assert.equal(positions.get('Order').x, positions.get('Pay').x);
  assert.notEqual(positions.get('Order').y, positions.get('Pay').y);
  assertNoOverlaps(layout);
});

test('puts actors in a zone on top of the use cases (vertical)', () => {
  const layout = layoutUseCaseDiagram(
    [
      actor('Customer'),
      useCase('Order', 'Shop'),
      useCase('Pay', 'Shop'),
    ],
    [],
    { layout: 'vertical', systems: [systemRecord('Shop', ['uc-Order', 'uc-Pay'])] },
  );

  const positions = byName(layout);
  assert.ok(positions.get('Customer').y < positions.get('Order').y);
  assert.ok(positions.get('Customer').y < positions.get('Pay').y);

  // In a vertical layout the system members sit side by side.
  assert.equal(positions.get('Order').y, positions.get('Pay').y);
  assert.notEqual(positions.get('Order').x, positions.get('Pay').x);
  assertNoOverlaps(layout);
});

test('centers the actor zone against the main area', () => {
  const layout = layoutUseCaseDiagram(
    [
      actor('Customer'),
      useCase('Order', 'Shop'),
      useCase('Pay', 'Shop'),
      useCase('Refund', 'Shop'),
    ],
    [],
    { layout: 'horizontal', systems: [systemRecord('Shop', ['uc-Order', 'uc-Pay', 'uc-Refund'])] },
  );

  const positions = byName(layout);
  const useCaseMid =
    (Math.min(
      positions.get('Order').y,
      positions.get('Pay').y,
      positions.get('Refund').y,
    ) +
      Math.max(
        positions.get('Order').y + 56,
        positions.get('Pay').y + 56,
        positions.get('Refund').y + 56,
      )) /
    2;
  const actorMid = positions.get('Customer').y + 50;
  assert.ok(
    Math.abs(useCaseMid - actorMid) < 1,
    `actor center ${actorMid} should match the use case block center ${useCaseMid}`,
  );
});

test('keeps systems in declaration order and uses the free group last', () => {
  const layout = layoutUseCaseDiagram(
    [
      useCase('Order', 'Shop'),
      useCase('Invoice', 'Accounting'),
      useCase('Standby', null),
    ],
    [],
    {
      layout: 'horizontal',
      systems: [
        systemRecord('Shop', ['uc-Order']),
        systemRecord('Accounting', ['uc-Invoice']),
      ],
    },
  );

  const positions = byName(layout);
  assert.ok(positions.get('Order').x < positions.get('Invoice').x);
  assert.ok(positions.get('Invoice').x < positions.get('Standby').x);
  assertNoOverlaps(layout);
});

test('stacks the system groups vertically in a vertical layout', () => {
  const layout = layoutUseCaseDiagram(
    [
      useCase('Order', 'Shop'),
      useCase('Invoice', 'Accounting'),
    ],
    [],
    {
      layout: 'vertical',
      systems: [
        systemRecord('Shop', ['uc-Order']),
        systemRecord('Accounting', ['uc-Invoice']),
      ],
    },
  );

  const positions = byName(layout);
  assert.ok(positions.get('Order').y < positions.get('Invoice').y);
});

test('normalizes coordinates to a non-negative origin', () => {
  const layout = layoutUseCaseDiagram(
    [
      actor('Customer'),
      useCase('Order', 'Shop'),
    ],
    [],
    { layout: 'horizontal', systems: [systemRecord('Shop', ['uc-Order'])] },
  );

  for (const node of layout.nodes) {
    assert.ok(node.x >= 0, `${node.name} x is negative`);
    assert.ok(node.y >= 0, `${node.name} y is negative`);
  }
  for (const box of layout.systems) {
    assert.ok(box.x >= 0);
    assert.ok(box.y >= 0);
  }
});

test('wraps system frames around their members', () => {
  const layout = layoutUseCaseDiagram(
    [
      useCase('Order', 'Shop'),
      useCase('Pay', 'Shop'),
    ],
    [],
    { layout: 'horizontal', systems: [systemRecord('Shop', ['uc-Order', 'uc-Pay'])] },
  );

  assert.equal(layout.systems.length, 1);
  const box = layout.systems[0];
  const members = byName(layout);

  assert.ok(box.x < members.get('Order').x);
  assert.ok(box.y < members.get('Order').y);
  assert.ok(box.x + box.width > members.get('Order').x + 120);
  assert.ok(box.y + box.height > members.get('Pay').y + 56);
  assert.equal(box.name, 'Shop');
});

test('drops system frames without members', () => {
  const layout = layoutUseCaseDiagram(
    [useCase('Order', 'Shop')],
    [],
    {
      layout: 'horizontal',
      systems: [systemRecord('Empty', []), systemRecord('Shop', ['uc-Order'])],
    },
  );

  assert.equal(layout.systems.length, 1);
  assert.equal(layout.systems[0].name, 'Shop');
});

test('lays out actors without use cases', () => {
  const layout = layoutUseCaseDiagram(
    [actor('Customer'), actor('Staff')],
    [],
    { layout: 'horizontal' },
  );

  const positions = byName(layout);
  for (const node of layout.nodes) {
    assert.ok(node.x >= 0);
    assert.ok(node.y >= 0);
  }
  assert.notEqual(
    positions.get('Customer').y,
    positions.get('Staff').y,
    'actor zone stacks vertically in a horizontal layout',
  );
});

test('is deterministic', () => {
  const nodes = [
    actor('Customer'),
    useCase('Order', 'Shop'),
    useCase('Pay', 'Shop'),
    useCase('Invoice', 'Accounting'),
  ];
  const options = {
    layout: 'horizontal',
    systems: [
      systemRecord('Shop', ['uc-Order', 'uc-Pay']),
      systemRecord('Accounting', ['uc-Invoice']),
    ],
  };
  assert.deepEqual(
    layoutUseCaseDiagram(nodes, [], options),
    layoutUseCaseDiagram(
      nodes.map((node) => ({ ...node })),
      [],
      options,
    ),
  );
});
