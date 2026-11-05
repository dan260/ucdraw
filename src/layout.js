'use strict';

// Between two members of one stack (a system column/row, or the actor zone).
const NODE_GAP = 46;
const ACTOR_GAP = 40;
// Between the actor zone and the main area.
const ZONE_GAP = 118;
// Between system groups.
const GROUP_GAP = 140;

/**
 * Stacks `items` along `stackAxis`. Returns { stack, size }: `stack` is
 * the total length of the stack, `size` the largest dimension along the
 * other axis.
 */
const SIZE = { x: 'width', y: 'height' };

function stackExtent(items, gap, stackAxis, otherAxis) {
  let total = 0;
  let maxOther = 0;
  for (const item of items) {
    total += item[SIZE[stackAxis]];
    maxOther = Math.max(maxOther, item[SIZE[otherAxis]]);
  }
  if (items.length > 1) total += (items.length - 1) * gap;
  return { stack: total, size: maxOther };
}

function offsetInStack(items, index, gap, axis) {
  let offset = 0;
  for (let step = 0; step < index; step += 1) {
    offset += items[step][SIZE[axis]] + gap;
  }
  return offset;
}

/**
 * Places a use case diagram:
 *
 * - All actors share one dedicated zone at a single side of the diagram —
 *   a column on the left for a horizontal layout, a row on top for a
 *   vertical one.
 * - Use cases are grouped by the system they are declared in (in system
 *   declaration order) and placed as a stack: a column for a horizontal
 *   layout, a row for a vertical one. Use cases not inside any system
 *   form the last group.
 * - System frames wrap their group's bounding box.
 *
 * `relations` is accepted for signature compatibility; placement follows
 * the text order only. Every node needs `width` and `height`.
 */
function layoutUseCaseDiagram(nodes, relations, options = {}) {
  if (nodes.length === 0) {
    return { nodes: [], width: 0, height: 0, systems: [] };
  }

  const vertical = options.layout === 'vertical';
  const along = vertical ? 'y' : 'x';
  const cross = vertical ? 'x' : 'y';

  const actors = nodes.filter((node) => node.kind === 'actor');
  const useCases = nodes.filter((node) => node.kind === 'usecase');

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const groups = (options.systems ?? [])
    .map((system) => ({
      system,
      members: (system.useCases ?? [])
        .map((id) => nodeById.get(id))
        .filter((member) => member && member.system === system.name),
    }))
    .filter((group) => group.members.length > 0);

  const freeMembers = useCases.filter((useCase) => useCase.system === null);
  if (freeMembers.length > 0) groups.push({ system: null, members: freeMembers });

  const zone = stackExtent(actors, ACTOR_GAP, cross, along);
  let mainStack = 0;
  let mainSize = 0;
  for (const group of groups) {
    const extent = stackExtent(group.members, NODE_GAP, cross, along);
    mainStack = Math.max(mainStack, extent.stack);
    mainSize += extent.size;
  }
  if (groups.length > 1) mainSize += (groups.length - 1) * GROUP_GAP;

  const hasBoth = actors.length > 0 && groups.length > 0;
  const totalStack = Math.max(mainStack, zone.stack);
  const totalSize = mainSize + zone.size + (hasBoth ? ZONE_GAP : 0);

  // The actor zone sits at the start of the main axis (left / top),
  // centered along the cross axis.
  const zoneOrigin = { x: 0, y: 0 };
  zoneOrigin[along] = 0;
  zoneOrigin[cross] = (totalStack - zone.stack) / 2;

  const mainOrigin = { x: 0, y: 0 };
  mainOrigin[along] = zone.size + (hasBoth ? ZONE_GAP : 0);
  mainOrigin[cross] = (totalStack - mainStack) / 2;

  actors.forEach((actor, index) => {
    actor[along] = zoneOrigin[along];
    actor[cross] = zoneOrigin[cross] + offsetInStack(actors, index, ACTOR_GAP, cross);
  });

  let groupOffset = 0;
  groups.forEach((group, index) => {
    const extent = stackExtent(group.members, NODE_GAP, cross, along);
    const memberStart =
      mainOrigin[cross] + (mainStack - extent.stack) / 2;
    group.members.forEach((member, memberIndex) => {
      member[along] = mainOrigin[along] + groupOffset;
      member[cross] =
        memberStart + offsetInStack(group.members, memberIndex, NODE_GAP, cross);
    });
    groupOffset +=
      extent.size + (index < groups.length - 1 ? GROUP_GAP : 0);
  });

  // System frames wrap the members' bounding box.
  const boxes = (options.systems ?? []).map((system) => {
    const members = (system.useCases ?? [])
      .map((id) => nodeById.get(id))
      .filter((member) => member && member.system === system.name);

    if (members.length === 0) {
      return { ...system, x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const member of members) {
      minX = Math.min(minX, member.x);
      minY = Math.min(minY, member.y);
      maxX = Math.max(maxX, member.x + member.width);
      maxY = Math.max(maxY, member.y + member.height);
    }

    return {
      ...system,
      x: minX - SYSTEM_PADDING_X,
      y: minY - SYSTEM_TITLE_HEIGHT,
      width: maxX - minX + SYSTEM_PADDING_X * 2,
      height: maxY - minY + SYSTEM_TITLE_HEIGHT + SYSTEM_PADDING_BOTTOM,
    };
  }).filter((box) => box.width > 0 && box.height > 0);

  return normalizeNodes({ nodes, systems: boxes });
}

/**
 * Shifts everything so the smallest coordinate is zero and reports the
 * resulting canvas size (including the frames).
 */
function normalizeNodes({ nodes, systems }) {
  let minX = Infinity;
  let minY = Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
  }
  for (const box of systems) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
  }

  const positioned = nodes.map((node) => ({
    ...node,
    x: node.x - minX,
    y: node.y - minY,
  }));
  const systemBoxes = systems.map((box) => ({
    ...box,
    x: box.x - minX,
    y: box.y - minY,
  }));

  let width = Math.max(...positioned.map((node) => node.x + node.width), 0);
  let height = Math.max(...positioned.map((node) => node.y + node.height), 0);
  for (const box of systemBoxes) {
    width = Math.max(width, box.x + box.width);
    height = Math.max(height, box.y + box.height);
  }

  return {
    nodes: positioned,
    width: Math.round(width),
    height: Math.round(height),
    systems: systemBoxes,
  };
}
