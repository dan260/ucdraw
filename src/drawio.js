'use strict';

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

// Node ids survive in the mxCell id attribute; keep the id XML-safe.
function safeId(value) {
  return String(value).replace(/[&<>"'\/\s]/g, '_');
}

function buildDrawioFile(layout, relations) {
  const margin = 40;
  const nodeIds = new Map();
  let useCaseIndex = 0;

  const usedIds = new Set(['0', '1']);
  function makeId(prefix, key) {
    let id = `${prefix}-${safeId(key)}`;
    if (usedIds.has(id)) {
      let suffix = 2;
      while (usedIds.has(`${id}-${suffix}`)) suffix += 1;
      id = `${id}-${suffix}`;
    }
    usedIds.add(id);
    return id;
  }

  let maxX = 0;
  let maxY = 0;
  const cells = [];

  for (const system of layout.systems) {
    const x = system.x + margin;
    const y = system.y + margin;

    maxX = Math.max(maxX, x + system.width);
    maxY = Math.max(maxY, y + system.height);

    const id = makeId('system', system.id);
    cells.push(
      `        <mxCell id="${id}" value="${escapeXml(system.name)}" style="swimlane;html=1;fontStyle=1;align=left;verticalAlign=middle;spacingLeft=10;startSize=30;fillColor=none;strokeColor=#9aa0ac;rounded=1;arcSize=3;fontSize=13;fontFamily=Helvetica;fontColor=#3f4654;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${system.width}" height="${system.height}" as="geometry" />
        </mxCell>`,
    );
  }

  for (const node of layout.nodes) {
    const x = node.x + margin;
    const y = node.y + margin;

    maxX = Math.max(maxX, x + node.width);
    maxY = Math.max(maxY, y + node.height);
    nodeIds.set(node.id, makeId(node.kind === 'actor' ? 'actor' : 'usecase', node.id));

    if (node.kind === 'actor') {
      cells.push(
        `        <mxCell id="${nodeIds.get(node.id)}" value="${escapeXml(node.name)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=12;fontFamily=Helvetica;fontColor=#1d2533;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${node.width}" height="${node.height}" as="geometry" />
        </mxCell>`,
      );
      continue;
    }

    const palette = node.palette
      ?? USECASE_PALETTES[useCaseIndex % USECASE_PALETTES.length];
    useCaseIndex += 1;

    cells.push(
      `        <mxCell id="${nodeIds.get(node.id)}" value="${escapeXml(node.name)}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${palette.fill};strokeColor=${palette.stroke};strokeWidth=1.4;fontSize=13;fontFamily=Helvetica;fontColor=#1b2230;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${node.width}" height="${node.height}" as="geometry" />
        </mxCell>`,
    );
  }

  relations.forEach((relation, index) => {
    const sourceId = nodeIds.get(relation.source);
    const targetId = nodeIds.get(relation.target);
    if (!sourceId || !targetId) return;

    const generalization = relation.kind === 'generalization';
    const edgeStyle = [
      'edgeStyle=orthogonalEdgeStyle',
      'rounded=1',
      'orthogonalLoop=1',
      'jettySize=auto',
      'html=1',
      'startArrow=none',
      generalization ? 'endArrow=open' : 'endArrow=none',
      'endFill=0',
      'dashed=0',
      `strokeColor=${EDGE_COLOR}`,
      'strokeWidth=1.5',
      'fontFamily=Helvetica',
    ].join(';');

    cells.push(
      `        <mxCell id="relation-${index}" value="" style="${edgeStyle}" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`,
    );
  });

  const pageWidth = Math.max(1169, Math.ceil(maxX + margin));
  const pageHeight = Math.max(827, Math.ceil(maxY + margin));
  const modified = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${modified}" agent="UCDraw" version="24.7.17" type="device">
  <diagram id="ucdraw-diagram" name="Use Case Diagram">
    <mxGraphModel dx="${pageWidth}" dy="${pageHeight}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}
