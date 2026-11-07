'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const UI_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

const FONT_UC = `600 13px ${UI_FONT}`;
const FONT_ACTOR = `500 12px ${UI_FONT}`;
const FONT_SYSTEM = `600 13px ${UI_FONT}`;

let measurementContext = null;

function getMeasurementContext() {
  if (!measurementContext) {
    measurementContext = document.createElement('canvas').getContext('2d');
  }
  return measurementContext;
}

function textWidth(text, font) {
  const context = getMeasurementContext();
  context.font = font;
  return context.measureText(text).width;
}

function truncateText(text, font, maxWidth) {
  if (!text || maxWidth <= 0) return '';
  if (textWidth(text, font) <= maxWidth) return text;

  let low = 0;
  let high = text.length;
  let result = '…';

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = `${text.slice(0, middle).trimEnd()}…`;
    if (textWidth(candidate, font) <= maxWidth) {
      result = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return result;
}

function createElement(tag, attributes = {}, parent = null) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) {
      element.setAttribute(name, String(value));
    }
  }
  if (parent) parent.appendChild(element);
  return element;
}

/**
 * Measures use case ellipses and actor figures. HTML canvas gives us
 * browser-accurate metrics without mounting temporary DOM nodes.
 * `settings.useCaseColors` selects the palette mode ('vary' / 'uniform').
 */
function measureNodes(nodes, settings = {}) {
  const paletteMode = settings.useCaseColors ?? 'vary';
  let useCaseIndex = 0;

  return nodes.map((node) => {
    if (node.kind === 'actor') {
      const width = Math.min(
        ACTOR_MAX_WIDTH,
        Math.max(ACTOR_MIN_WIDTH, Math.ceil(textWidth(node.name, FONT_ACTOR) + 16)),
      );
      return {
        ...node,
        order: node.order,
        width,
        height: ACTOR_HEIGHT,
      };
    }

    const palette = useCasePalette(useCaseIndex, paletteMode);
    useCaseIndex += 1;

    const width = Math.min(
      UC_MAX_WIDTH,
      Math.max(UC_MIN_WIDTH, Math.ceil(textWidth(node.name, FONT_UC) + 44)),
    );

    return {
      ...node,
      order: node.order,
      width,
      height: UC_HEIGHT,
      palette,
    };
  });
}

function displayName(node) {
  return node.system ? `${node.system}.${node.name}` : node.name;
}

function relationTooltip(relation, nodeMap) {
  const source = nodeMap.get(relation.source);
  const target = nodeMap.get(relation.target);
  const key =
    relation.kind === 'generalization'
      ? 'render.genTooltip'
      : 'render.assocTooltip';
  return I18N.t(key, {
    source: source ? displayName(source) : '',
    target: target ? displayName(target) : '',
  });
}

const ARROW_LENGTH = 10;
const ARROW_WING = 5;

/**
 * A hollow (stroked, unfilled) triangle at the end of a generalization
 * edge, pointing along the path tangent. Returns the arrow path `d` and
 * where the line should stop (the arrow base).
 */
function generalizationArrow(geometry) {
  const tip = geometry.end;
  let dx = tip.x - geometry.controlB.x;
  let dy = tip.y - geometry.controlB.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return null;
  dx /= length;
  dy /= length;

  const base = {
    x: tip.x - dx * ARROW_LENGTH,
    y: tip.y - dy * ARROW_LENGTH,
  };
  const nx = -dy;
  const ny = dx;
  const d =
    `M ${tip.x} ${tip.y} ` +
    `L ${base.x + nx * ARROW_WING} ${base.y + ny * ARROW_WING} ` +
    `L ${base.x - nx * ARROW_WING} ${base.y - ny * ARROW_WING} Z`;
  return { d, base };
}

function routeSides(relation, nodeMap) {
  const source = nodeMap.get(relation.source);
  const target = nodeMap.get(relation.target);

  if (relation.source === relation.target) {
    return { self: true };
  }

  const sourceCenter = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const targetCenter = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  };
  const horizontal =
    Math.abs(targetCenter.x - sourceCenter.x) >=
    Math.abs(targetCenter.y - sourceCenter.y);

  if (horizontal) {
    const sourceSide =
      targetCenter.x >= sourceCenter.x ? 'right' : 'left';
    return {
      self: false,
      horizontal: true,
      sourceSide,
      targetSide: sourceSide === 'right' ? 'left' : 'right',
      sourceSort: targetCenter.y,
      targetSort: sourceCenter.y,
      axis: 'y',
    };
  }

  const sourceSide =
    targetCenter.y >= sourceCenter.y ? 'bottom' : 'top';
  return {
    self: false,
    horizontal: false,
    sourceSide,
    targetSide: sourceSide === 'bottom' ? 'top' : 'bottom',
    sourceSort: targetCenter.x,
    targetSort: sourceCenter.x,
    axis: 'x',
  };
}

function edgeGeometry(relation, nodeMap, route, startOffset, endOffset) {
  const source = nodeMap.get(relation.source);
  const target = nodeMap.get(relation.target);

  const sourceCenter = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const targetCenter = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  };

  let start;
  let end;
  let controlA;
  let controlB;

  if (route.horizontal) {
    start = {
      x: route.sourceSide === 'right' ? source.x + source.width : source.x,
      y: sourceCenter.y + startOffset,
    };
    end = {
      x: route.targetSide === 'left' ? target.x : target.x + target.width,
      y: targetCenter.y + endOffset,
    };

    const gap = Math.abs(end.x - start.x);
    const curve = Math.max(32, Math.min(165, gap * 0.46));
    controlA = {
      x: start.x + (route.sourceSide === 'right' ? curve : -curve),
      y: start.y,
    };
    controlB = {
      x: end.x + (route.targetSide === 'left' ? -curve : curve),
      y: end.y,
    };
  } else {
    start = {
      x: sourceCenter.x + startOffset,
      y: route.sourceSide === 'bottom' ? source.y + source.height : source.y,
    };
    end = {
      x: targetCenter.x + endOffset,
      y: route.targetSide === 'top' ? target.y : target.y + target.height,
    };

    const gap = Math.abs(end.y - start.y);
    const curve = Math.max(32, Math.min(165, gap * 0.46));
    controlA = {
      x: start.x,
      y: start.y + (route.sourceSide === 'bottom' ? curve : -curve),
    };
    controlB = {
      x: end.x,
      y: end.y + (route.targetSide === 'top' ? -curve : curve),
    };
  }

  return { start, end, controlA, controlB };
}

function renderSystem(parent, box) {
  const group = createElement(
    'g',
    {
      class: 'uc-system',
      'data-system': box.name,
      transform: `translate(${box.x} ${box.y})`,
    },
    parent,
  );

  createElement(
    'rect',
    {
      width: box.width,
      height: box.height,
      rx: 12,
      class: 'uc-system-box',
    },
    group,
  );

  const title = truncateText(box.name, FONT_SYSTEM, Math.max(40, box.width - 32));
  const titleElement = createElement(
    'text',
    {
      x: 16,
      y: SYSTEM_TITLE_HEIGHT / 2,
      class: 'uc-system-name',
    },
    group,
  );
  titleElement.textContent = title;
  if (title !== box.name) {
    createElement('title', {}, titleElement).textContent = box.name;
  }

  return group;
}

function renderUseCase(parent, node) {
  const group = createElement(
    'g',
    {
      class: 'uc-node',
      transform: `translate(${node.x} ${node.y})`,
      'data-node': node.id,
      role: 'group',
      'aria-label': I18N.t('render.useCaseAria', { name: node.name }),
    },
    parent,
  );

  createElement(
    'ellipse',
    {
      cx: node.width / 2,
      cy: node.height / 2,
      rx: node.width / 2,
      ry: node.height / 2,
      fill: node.palette.fill,
      stroke: node.palette.stroke,
      class: 'uc-ellipse',
    },
    group,
  );

  const title = truncateText(
    node.name,
    FONT_UC,
    node.width - 36,
  );
  const text = createElement(
    'text',
    {
      x: node.width / 2,
      y: node.height / 2,
      class: 'uc-node-text',
      'text-anchor': 'middle',
    },
    group,
  );
  text.textContent = title;
  if (title !== node.name) {
    createElement('title', {}, text).textContent = node.name;
  }

  return group;
}

function renderActor(parent, node) {
  const group = createElement(
    'g',
    {
      class: 'uc-node',
      transform: `translate(${node.x} ${node.y})`,
      'data-node': node.id,
      role: 'group',
      'aria-label': I18N.t('render.actorAria', { name: node.name }),
    },
    parent,
  );

  createElement(
    'rect',
    {
      width: node.width,
      height: node.height,
      class: 'uc-actor-hit',
    },
    group,
  );

  const cx = node.width / 2;
  createElement(
    'circle',
    { cx, cy: 14, r: 8, class: 'uc-actor-figure' },
    group,
  );
  createElement(
    'path',
    {
      d: [
        `M ${cx} 22 L ${cx} 50`,
        `M ${cx - 14} 36 L ${cx} 27 L ${cx + 14} 36`,
        `M ${cx - 12} 71 L ${cx} 50 L ${cx + 12} 71`,
      ].join(' '),
      class: 'uc-actor-figure',
      fill: 'none',
    },
    group,
  );

  const title = truncateText(
    node.name,
    FONT_ACTOR,
    node.width - 10,
  );
  const text = createElement(
    'text',
    {
      x: cx,
      y: 88,
      class: 'uc-node-text uc-actor-name',
      'text-anchor': 'middle',
    },
    group,
  );
  text.textContent = title;
  if (title !== node.name) {
    createElement('title', {}, text).textContent = node.name;
  }

  return group;
}

function renderNodes(parent, nodes) {
  const nodeGroups = [];
  for (const node of nodes) {
    nodeGroups.push(
      node.kind === 'actor'
        ? renderActor(parent, node)
        : renderUseCase(parent, node),
    );
  }
  return nodeGroups;
}

function attachHighlighting(svg, nodeGroups, edgeGroups) {
  const setHighlight = (id) => {
    const hasFocus =
      Boolean(id) &&
      nodeGroups.some((group) => group.dataset.node === id);
    svg.classList.toggle('has-node-focus', hasFocus);

    for (const group of nodeGroups) {
      group.classList.toggle(
        'is-dimmed',
        hasFocus && group.dataset.node !== id,
      );
    }

    for (const group of edgeGroups) {
      const related =
        group.dataset.source === id || group.dataset.target === id;
      group.classList.toggle('is-active', hasFocus && related);
      group.classList.toggle('is-dimmed', hasFocus && !related);
    }
  };

  return setHighlight;
}

function renderUseCaseDiagram(svg, layout, relations, options = {}) {
  svg.replaceChildren();
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    I18N.t('render.diagramAria', {
      n: layout.nodes.filter((node) => node.kind === 'usecase').length,
      m: layout.nodes.filter((node) => node.kind === 'actor').length,
    }),
  );

  const padding = 64;
  const root = createElement('g', {}, svg);
  const systemLayer = createElement(
    'g',
    { class: 'uc-system-layer' },
    root,
  );
  const edgeLayer = createElement(
    'g',
    { class: 'uc-edge-layer' },
    root,
  );
  const nodeLayer = createElement(
    'g',
    { class: 'uc-node-layer' },
    root,
  );
  if (options.systems !== 'none') {
    for (const box of layout.systems) {
      if (box.width > 0 && box.height > 0) {
        renderSystem(systemLayer, box);
      }
    }
  }

  const nodeMap = new Map(
    layout.nodes.map((node) => [node.id, node]),
  );
  const routes = relations.map((relation) =>
    routeSides(relation, nodeMap),
  );
  const anchorGroups = new Map();

  routes.forEach((route, relationIndex) => {
    if (route.self) return;
    const relation = relations[relationIndex];
    const endpoints = [
      {
        node: nodeMap.get(relation.source),
        side: route.sourceSide,
        type: 'start',
        sort: route.sourceSort,
      },
      {
        node: nodeMap.get(relation.target),
        side: route.targetSide,
        type: 'end',
        sort: route.targetSort,
      },
    ];

    for (const endpoint of endpoints) {
      if (!endpoint.node) continue;
      const key = `${endpoint.node.id}|${endpoint.side}`;
      if (!anchorGroups.has(key)) {
        anchorGroups.set(key, {
          node: endpoint.node,
          side: endpoint.side,
          axis: route.axis,
          items: [],
        });
      }
      anchorGroups.get(key).items.push({
        relationIndex,
        type: endpoint.type,
        sort: endpoint.sort,
      });
    }
  });

  const startOffsets = new Array(relations.length).fill(0);
  const endOffsets = new Array(relations.length).fill(0);

  for (const group of anchorGroups.values()) {
    group.items.sort(
      (a, b) => a.sort - b.sort || a.relationIndex - b.relationIndex,
    );
    const length =
      group.axis === 'y' ? group.node.height : group.node.width;
    const available = Math.max(0, length - 30);
    const maxOffset = available / 2;
    const step =
      group.items.length > 1
        ? Math.min(16, (maxOffset * 2) / (group.items.length - 1))
        : 0;

    group.items.forEach((item, index) => {
      const offset =
        (index - (group.items.length - 1) / 2) * step;
      if (item.type === 'start') {
        startOffsets[item.relationIndex] = offset;
      } else {
        endOffsets[item.relationIndex] = offset;
      }
    });
  }

  const edgeGroups = [];

  for (let relationIndex = 0; relationIndex < relations.length; relationIndex += 1) {
    const relation = relations[relationIndex];
    const source = nodeMap.get(relation.source);
    const target = nodeMap.get(relation.target);
    if (!source || !target) continue;
    if (routes[relationIndex].self) continue;

    const geometry = edgeGeometry(
      relation,
      nodeMap,
      routes[relationIndex],
      startOffsets[relationIndex],
      endOffsets[relationIndex],
    );

    const edgeGroup = createElement(
      'g',
      {
        class: 'uc-edge',
        'data-source': relation.source,
        'data-target': relation.target,
        'data-relation': relation.id,
      },
      edgeLayer,
    );
    createElement('title', {}, edgeGroup).textContent =
      relationTooltip(relation, nodeMap);

    let { end } = geometry;
    if (relation.kind === 'generalization') {
      const arrow = generalizationArrow(geometry);
      if (arrow) {
        end = arrow.base;
        createElement(
          'path',
          { d: arrow.d, class: 'uc-generalization-arrow', stroke: EDGE_COLOR },
          edgeGroup,
        );
      }
    }

    createElement(
      'path',
      {
        d:
          `M ${geometry.start.x} ${geometry.start.y} ` +
          `C ${geometry.controlA.x} ${geometry.controlA.y}, ` +
          `${geometry.controlB.x} ${geometry.controlB.y}, ${end.x} ${end.y}`,
        class: 'uc-edge-line',
        stroke: EDGE_COLOR,
      },
      edgeGroup,
    );

    edgeGroups.push(edgeGroup);
  }

  const nodeGroups = renderNodes(nodeLayer, layout.nodes);
  const highlight = attachHighlighting(svg, nodeGroups, edgeGroups);

  const contentBox = root.getBBox();
  const viewWidth = Math.max(
    1,
    Math.ceil(contentBox.width + padding * 2),
  );
  const viewHeight = Math.max(
    1,
    Math.ceil(contentBox.height + padding * 2),
  );
  root.setAttribute(
    'transform',
    `translate(${padding - contentBox.x} ${padding - contentBox.y})`,
  );
  svg.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`);

  return {
    width: viewWidth,
    height: viewHeight,
    padding,
    highlight,
  };
}
