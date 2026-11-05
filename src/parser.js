'use strict';

const NAME_PATTERN = /(?:"([^"]*)"|([\p{L}_][\p{L}\p{N}_]*))/u;

const SYSTEM_KEYWORD = /^system(?=\s|$)/u;
const ACTOR_KEYWORD = /^actor(?=\s|$)/u;
const USECASE_KEYWORD = /^usecase(?=\s|$)/u;
const EXTENDS_KEYWORD = /^extends(?=\s)/u;

function skipSpaces(text, pos = 0) {
  let index = pos;
  while (index < text.length && (text[index] === ' ' || text[index] === '\t')) {
    index += 1;
  }
  return index;
}

/**
 * Parses the declaration head of a `system` / `actor` line: the name
 * after the keyword, and whatever tail is left.
 */
function parseDeclarationHead(trimmed, keyword) {
  const after = trimmed.slice(keyword.length);
  const pos = skipSpaces(after);
  if (pos >= after.length) return null;
  const match = after.slice(pos).match(new RegExp(`^${NAME_PATTERN.source}`, 'u'));
  if (!match) return null;
  const name = match[1] !== undefined ? match[1] : match[2];
  const tail = after.slice(pos + match[0].length).trim();
  return { name, tail };
}

/**
 * Reads a reference: a name, or dot-separated path segments
 * (`Shop.Order`, `"My Shop"."Place Order"`). Quotes may contain dots,
 * so segments are read one by one and the dot must sit outside quotes.
 * Returns { segments, raw, length } or null.
 */
function readPath(text) {
  const segments = [];
  let index = 0;

  for (;;) {
    index = skipSpaces(text, index);
    const match = text.slice(index).match(new RegExp(`^${NAME_PATTERN.source}`, 'u'));
    if (!match) break;
    segments.push(match[1] !== undefined ? match[1] : match[2]);
    index = index + match[0].length;

    const dotPos = skipSpaces(text, index);
    if (dotPos < text.length && text[dotPos] === '.') {
      const afterDot = skipSpaces(text, dotPos + 1);
      if (afterDot >= text.length) return null; // trailing dot
      index = afterDot;
      continue;
    }
    break;
  }

  if (segments.length === 0) return null;
  const length = skipSpaces(text, index);
  return { segments, raw: text.slice(0, length), length };
}

function kindWord(kind) {
  return I18N.t(`kind.${kind}`);
}

/**
 * Parses a use case schema in the block syntax:
 *
 *   system Name {            A system boundary. The body lists use case
 *     UseCaseName            names only, one per line.
 *   }
 *
  *   actor Admin extends User {
  *   }                        An actor. The optional `extends User` clause
  *                            generalizes the actor: a hollow arrow from
  *                            Admin to User. The body lists, one per line,
  *                            use cases the actor plays as `System.Name`
  *                            paths, plus references to other actors.
 *
  *   Name                   A use case outside any system: a bare name
  *                          (quoted or not) at the top level. The
  *                          `usecase` keyword was removed — write the
  *                          name alone.
  *
 * Use case names are unique within their system (or at the top level),
 * so the same name may appear in different systems.
 */
function parseUseCaseSchema(source) {
  const lines = String(source ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');

  const systems = [];
  const useCases = [];
  const actors = [];
  const relations = [];
  const errors = [];

  let useCaseIndex = 0;
  let actorIndex = 0;
  let relationIndex = 0;

  // Top-level names: actors and free use cases share one namespace.
  const topLevel = new Map(); // name -> record
  const systemsByName = new Map(); // name -> system record
  const seenRelations = new Set();

  const error = (line, message) => {
    errors.push({ line, message });
  };

  // The open block: { kind: 'system' | 'actor', record }
  let current = null;

  function registerUseCase(name, systemRecord, line) {
    const systemName = systemRecord ? systemRecord.name : null;

    if (systemRecord) {
      if (systemRecord.useCaseRecords.has(name)) {
        error(
          line,
          I18N.t('diag.duplicate', {
            kind: kindWord('usecase'),
            name,
            where: I18N.t('diag.duplicateWhere', { system: systemName }),
          }),
        );
        return null;
      }
    } else if (topLevel.has(name)) {
      error(
        line,
        I18N.t('diag.duplicate', { kind: kindWord('usecase'), name, where: '' }),
      );
      return null;
    }

    const record = {
      id: `uc-${++useCaseIndex}`,
      kind: 'usecase',
      name,
      system: systemName,
      line,
    };

    // A use case inside a system stays inside it: it is only reachable by
    // `System.Name` paths and must not collide with the top-level name.
    // Use cases of a duplicate (invalid) system are dropped entirely.
    if (systemRecord && !systemRecord.invalid) {
      systemRecord.useCaseRecords.set(name, record);
      systemRecord.useCases.push(record.id);
      useCases.push(record);
    } else if (!systemRecord) {
      topLevel.set(name, record);
      useCases.push(record);
    }
    return record;
  }

  function registerActor(name, line) {
    if (topLevel.has(name)) {
      error(
        line,
        I18N.t('diag.duplicate', { kind: kindWord('actor'), name, where: '' }),
      );
      return null;
    }
    const record = {
      id: `actor-${++actorIndex}`,
      kind: 'actor',
      name,
      line,
      closeLine: null,
    };
    topLevel.set(name, record);
    actors.push(record);
    return record;
  }

  function addRelation(fromId, toId, line, kind = 'association') {
    const key = [fromId, toId, kind].sort().join('\u0000');
    if (seenRelations.has(key)) {
      error(line, I18N.t('diag.associationDuplicate'));
      return;
    }
    seenRelations.add(key);
    relations.push({ id: `rel-${++relationIndex}`, line, source: fromId, target: toId, kind });
  }

  function addGeneralization(actorRecord, name, line) {
    const declared = topLevel.get(name);
    if (!declared) {
      const hiddenInSystem = [...systemsByName.values()].some(
        (system) => !system.invalid && system.useCaseRecords.has(name),
      );
      if (hiddenInSystem) {
        error(line, I18N.t('diag.extendsNotActor', { actor: actorRecord.name, name }));
      } else {
        error(line, I18N.t('diag.extendsUnknown', { actor: actorRecord.name, name }));
      }
      return;
    }
    if (declared.id === actorRecord.id) {
      error(line, I18N.t('diag.extendsSelf', { actor: actorRecord.name }));
      return;
    }
    if (declared.kind !== 'actor') {
      error(line, I18N.t('diag.extendsNotActor', { actor: actorRecord.name, name }));
      return;
    }
    relations.push({
      id: `rel-${++relationIndex}`,
      line,
      source: actorRecord.id,
      target: declared.id,
      kind: 'generalization',
    });
  }

  /**
   * `actor Name extends Super { … }` — the optional `extends Super`
   * clause between the actor name and the opening brace.
   * Returns { name, brace, ok }.
   */
  function parseActorTail(tail) {
    if (tail === '{' || tail === '{}') {
      return { name: null, brace: tail, ok: true };
    }
    if (!EXTENDS_KEYWORD.test(tail)) {
      return { name: null, brace: tail, ok: false };
    }
    const afterKeyword = skipSpaces(tail, 'extends'.length);
    const match = tail.slice(afterKeyword).match(new RegExp(`^${NAME_PATTERN.source}`, 'u'));
    if (!match || afterKeyword >= tail.length) {
      return { name: null, brace: tail, ok: false };
    }
    const name = match[1] !== undefined ? match[1] : match[2];
    if (name === '') {
      return { name: null, brace: tail, ok: false };
    }
    const brace = tail.slice(afterKeyword + match[0].length).trim();
    if (brace !== '{' && brace !== '{}') {
      return { name, brace, ok: false };
    }
    return { name, brace, ok: true };
  }

  function consumeActorReference(path, line, actorRecord) {
    const { segments } = path;

    if (segments.length > 2) {
      error(line, I18N.t('diag.pathTooDeep', { name: path.raw.trim() }));
      return;
    }

    if (segments.length === 2) {
      const [systemName, useCaseName] = segments;
      const system = systemsByName.get(systemName);
      if (!system || system.invalid) {
        error(line, I18N.t('diag.pathUnknownSystem', { name: systemName }));
        return;
      }
      const record = system.useCaseRecords.get(useCaseName);
      if (!record) {
        error(
          line,
          I18N.t('diag.pathNoUseCase', { name: useCaseName, system: systemName }),
        );
        return;
      }
      addRelation(actorRecord.id, record.id, line);
      return;
    }

    const name = segments[0];
    const declared = topLevel.get(name);
    if (declared) {
      if (declared.id === actorRecord.id) {
        error(line, I18N.t('diag.referenceSelf', { name }));
        return;
      }
      addRelation(actorRecord.id, declared.id, line);
      return;
    }

    // The name exists only inside systems — a bare name cannot mean it.
    const homes = [];
    for (const system of systemsByName.values()) {
      if (!system.invalid && system.useCaseRecords.has(name)) homes.push(system.name);
    }
    if (homes.length > 0) {
      error(
        line,
        I18N.t('diag.nameNeedsPath', {
          name,
          paths: homes.map((systemName) => `${systemName}.${name}`).join(' / '),
        }),
      );
      return;
    }
    error(line, I18N.t('diag.referenceUnknown', { name }));
  }

  function handleBodyLine(trimmed, lineNo) {
    if (current.kind === 'system') {
      if (USECASE_KEYWORD.test(trimmed)) {
        error(lineNo, I18N.t('diag.systemUsecaseKeyword'));
        return;
      }
      if (SYSTEM_KEYWORD.test(trimmed) || ACTOR_KEYWORD.test(trimmed)) {
        error(lineNo, I18N.t('diag.systemBody'));
        return;
      }
      const path = readPath(trimmed);
      if (!path || path.length !== trimmed.length || path.segments.length !== 1) {
        error(lineNo, I18N.t('diag.systemBody'));
        return;
      }
      const name = path.segments[0];
      if (name === '') {
        error(lineNo, I18N.t('diag.nameEmpty'));
        return;
      }
      registerUseCase(name, current.record, lineNo);
      return;
    }

    // actor block
    if (SYSTEM_KEYWORD.test(trimmed) || ACTOR_KEYWORD.test(trimmed) || USECASE_KEYWORD.test(trimmed)) {
      error(lineNo, I18N.t('diag.actorBody'));
      return;
    }
    const path = readPath(trimmed);
    if (!path || path.length !== trimmed.length) {
      error(lineNo, I18N.t('diag.actorBody'));
      return;
    }
    consumeActorReference(path, lineNo, current.record);
  }

  function closeCurrent(closeLine) {
    if (current && current.record.closeLine === null) {
      current.record.closeLine = closeLine;
    }
    current = null;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const lineNo = index + 1;
    const trimmed = lines[index].trim();

    if (!trimmed) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    if (trimmed === '}') {
      if (current) {
        closeCurrent(lineNo);
      } else {
        error(lineNo, I18N.t('diag.strayClosing'));
      }
      continue;
    }

    if (trimmed.startsWith('}')) {
      error(lineNo, I18N.t('diag.textAfterClosing'));
      continue;
    }

    if (trimmed.startsWith('{')) {
      error(lineNo, I18N.t('diag.strayOpening'));
      continue;
    }

    if (current) {
      handleBodyLine(trimmed, lineNo);
      continue;
    }

    if (SYSTEM_KEYWORD.test(trimmed)) {
      const parsed = parseDeclarationHead(trimmed, 'system');
      if (!parsed) {
        error(lineNo, I18N.t('diag.nameInvalid'));
        continue;
      }
      const { name, tail } = parsed;
      if (name === '') {
        error(lineNo, I18N.t('diag.nameEmpty'));
        continue;
      }

      const record = {
        id: `system-${systems.length + 1}`,
        name,
        line: lineNo,
        closeLine: null,
        useCases: [],
        useCaseRecords: new Map(),
        invalid: systemsByName.has(name),
      };

      if (record.invalid) {
        error(
          lineNo,
          I18N.t('diag.duplicate', { kind: kindWord('system'), name, where: '' }),
        );
      }
      if (tail === '') {
        error(lineNo, I18N.t('diag.missingBrace', { kind: kindWord('system'), name }));
        continue;
      }
      if (tail !== '{' && tail !== '{}') {
        error(lineNo, I18N.t('diag.blockTail', { name }));
        continue;
      }

      // The first declaration wins: a duplicate must not hijack name
      // resolution for `System.Name` paths.
      if (!record.invalid) {
        systemsByName.set(name, record);
      }
      systems.push(record);

      if (tail === '{}') {
        record.closeLine = lineNo;
        continue;
      }
      current = { kind: 'system', record };
      continue;
    }

    if (ACTOR_KEYWORD.test(trimmed)) {
      const parsed = parseDeclarationHead(trimmed, 'actor');
      if (!parsed) {
        error(lineNo, I18N.t('diag.nameInvalid'));
        continue;
      }
      const { name, tail } = parsed;
      if (name === '') {
        error(lineNo, I18N.t('diag.nameEmpty'));
        continue;
      }
      if (tail === '') {
        error(lineNo, I18N.t('diag.missingBrace', { kind: kindWord('actor'), name }));
        continue;
      }
      const ext = parseActorTail(tail);
      if (!ext.ok) {
        error(lineNo, I18N.t('diag.extendsSyntax', { name }));
        continue;
      }
      const brace = ext.brace;

      const record = registerActor(name, lineNo);
      if (!record) continue; // duplicate actor: keep it out of the diagram
      if (ext.name) {
        addGeneralization(record, ext.name, lineNo);
      }
      if (brace === '{}') {
        record.closeLine = lineNo;
        continue;
      }
      current = { kind: 'actor', record };
      continue;
    }

    if (USECASE_KEYWORD.test(trimmed)) {
      // `usecase` is no longer a keyword: a use case is declared by its
      // bare name alone.
      error(lineNo, I18N.t('diag.usecaseKeyword'));
      continue;
    }

    // A bare name at the top level declares a use case outside any system.
    const path = readPath(trimmed);
    if (path && path.length === trimmed.length) {
      if (path.segments.length > 1) {
        error(
          lineNo,
          I18N.t('diag.pathAtTopLevel', {
            system: path.segments[0],
            name: path.segments[1],
          }),
        );
        continue;
      }
      const name = path.segments[0];
      if (name === '') {
        error(lineNo, I18N.t('diag.nameEmpty'));
        continue;
      }
      registerUseCase(name, null, lineNo);
      continue;
    }

    error(lineNo, I18N.t('diag.unknownDeclaration'));
  }

  if (current) {
    error(
      current.record.line,
      I18N.t('diag.unclosedEnd', {
        kind: kindWord(current.kind === 'actor' ? 'actor' : 'system'),
        name: current.record.name,
      }),
    );
    closeCurrent(null);
  }

  const validSystems = systems.filter((system) => !system.invalid);
  const validUseCases = useCases.filter(
    (useCase) =>
      useCase.system === null ||
      validSystems.some((system) => system.name === useCase.system),
  );
  const validActors = actors.filter(
    (actor) => !actors.some((other) => other !== actor && other.name === actor.name),
  );

  return {
    systems: validSystems.map(({ useCaseRecords, invalid, ...rest }) => rest),
    useCases: validUseCases,
    actors: validActors,
    relations,
    errors: errors.sort((a, b) => a.line - b.line),
  };
}
