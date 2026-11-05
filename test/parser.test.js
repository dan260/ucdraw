import test from 'node:test';
import assert from 'node:assert/strict';

import { I18N, parseUseCaseSchema } from '../scripts/load-source.mjs';

I18N.setLanguage('en');

const t = (key, params) => I18N.t(key, params);

test('parses an empty schema without errors', () => {
  assert.deepEqual(parseUseCaseSchema(''), {
    systems: [],
    useCases: [],
    actors: [],
    relations: [],
    errors: [],
  });
});

test('declares bare and quoted names as use cases at the top level', () => {
  const parsed = parseUseCaseSchema(`Browse
 "Place Order"
 Refund`);

  assert.deepEqual(
    parsed.useCases.map((item) => item.name),
    ['Browse', 'Place Order', 'Refund'],
  );
  assert.deepEqual(
    parsed.useCases.map((item) => item.id),
    ['uc-1', 'uc-2', 'uc-3'],
  );
  for (const useCase of parsed.useCases) {
    assert.equal(useCase.system, null);
  }
  assert.equal(parsed.useCases[0].line, 1);
  assert.equal(parsed.useCases[2].line, 3);
  assert.equal(parsed.errors.length, 0);
});

test('declares actors as empty blocks and with bodies', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}

actor Customer {}

actor Staff {
  Shop.Order
}`);

  assert.deepEqual(
    parsed.actors.map((item) => item.name),
    ['Customer', 'Staff'],
  );
  assert.deepEqual(parsed.actors.map((item) => item.id), [
    'actor-1',
    'actor-2',
  ]);
  assert.equal(parsed.actors[0].closeLine, 5);
  assert.equal(parsed.actors[1].closeLine, 9);
  assert.deepEqual(parsed.relations, [
    { id: 'rel-1', line: 8, source: 'actor-2', target: 'uc-1', kind: 'association' },
  ]);
  assert.equal(parsed.errors.length, 0);
});

test('groups use cases inside a system block with numeric ids', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
  Pay
}`);

  assert.deepEqual(parsed.systems, [
    {
      id: 'system-1',
      name: 'Shop',
      line: 1,
      closeLine: 4,
      useCases: ['uc-1', 'uc-2'],
    },
  ]);
  assert.deepEqual(
    parsed.useCases.map((item) => [item.name, item.system]),
    [
      ['Order', 'Shop'],
      ['Pay', 'Shop'],
    ],
  );
  assert.equal(parsed.errors.length, 0);
});

test('accepts an inline empty system and keeps it out of the topology', () => {
  const parsed = parseUseCaseSchema('system Store {}');
  assert.deepEqual(parsed.systems, [
    { id: 'system-1', name: 'Store', line: 1, closeLine: 1, useCases: [] },
  ]);
  assert.equal(parsed.errors.length, 0);
});

test('allows the same use case name in different systems', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Report
}
system Accounting {
  Report
}`);

  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.useCases.length, 2);
  assert.deepEqual(
    parsed.useCases.map((item) => [item.name, item.system]),
    [
      ['Report', 'Shop'],
      ['Report', 'Accounting'],
    ],
  );
});

test('flags a duplicate use case inside the same system', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
  Order
}`);

  assert.deepEqual(parsed.errors, [
    {
      line: 3,
      message: t('diag.duplicate', {
        kind: 'use case',
        name: 'Order',
        where: t('diag.duplicateWhere', { system: 'Shop' }),
      }),
    },
  ]);
  // The duplicate is not registered twice.
  assert.equal(parsed.useCases.length, 1);
});

test('flags a duplicate top-level use case without a system qualifier', () => {
  const parsed = parseUseCaseSchema('Report\nReport');
  assert.deepEqual(parsed.errors, [
    {
      line: 2,
      message: t('diag.duplicate', { kind: 'use case', name: 'Report', where: '' }),
    },
  ]);
});

test('flags a duplicate actor and drops the second declaration', () => {
  const parsed = parseUseCaseSchema(`actor Customer {}
actor Customer {}`);
  assert.deepEqual(parsed.errors, [
    { line: 2, message: t('diag.duplicate', { kind: 'actor', name: 'Customer', where: '' }) },
  ]);
  assert.equal(parsed.actors.length, 1);
});

test('creates an association from an actor body path reference', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}

actor Customer {
  Shop.Order
}`);

  assert.deepEqual(parsed.relations, [
    { id: 'rel-1', line: 6, source: 'actor-1', target: 'uc-1', kind: 'association' },
  ]);
  assert.equal(parsed.errors.length, 0);
});

test('resolves a single-segment reference to a free use case and to actors', () => {
  const parsed = parseUseCaseSchema(`Pay

 actor Staff {}

 actor Customer {
   Pay
   Staff
 }`);

  assert.deepEqual(
    parsed.relations.map((relation) => [relation.source, relation.target]),
    [
      ['actor-2', 'uc-1'],
      ['actor-2', 'actor-1'],
    ],
  );
  assert.equal(parsed.errors.length, 0);
});

test('flags a reference to an actor that is declared later', () => {
  const parsed = parseUseCaseSchema(`actor Customer {
  Staff
}

actor Staff {}`);
  assert.deepEqual(parsed.errors, [
    { line: 2, message: t('diag.referenceUnknown', { name: 'Staff' }) },
  ]);
});

test('resolves quoted path segments', () => {
  const parsed = parseUseCaseSchema(`system "My Shop" {
  "Place Order"
}

actor Customer {
  "My Shop"."Place Order"
}`);

  assert.deepEqual(parsed.relations, [
    { id: 'rel-1', line: 6, source: 'actor-1', target: 'uc-1', kind: 'association' },
  ]);
  assert.equal(parsed.errors.length, 0);
});

test('flags a self reference', () => {
  const parsed = parseUseCaseSchema(`actor Customer {
  Customer
}`);
  assert.deepEqual(parsed.errors, [
    { line: 2, message: t('diag.referenceSelf', { name: 'Customer' }) },
  ]);
  assert.equal(parsed.relations.length, 0);
});

test('flags an unknown reference', () => {
  const parsed = parseUseCaseSchema(`actor Customer {
  Ghost
}`);
  assert.deepEqual(parsed.errors, [
    { line: 2, message: t('diag.referenceUnknown', { name: 'Ghost' }) },
  ]);
});

test('suggests a path when the name only exists inside systems', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}

actor Customer {
  Order
}`);
  assert.deepEqual(parsed.errors, [
    {
      line: 6,
      message: t('diag.nameNeedsPath', { name: 'Order', paths: 'Shop.Order' }),
    },
  ]);
});

test('flags a path to an unknown system', () => {
  const parsed = parseUseCaseSchema(`actor Customer {
  Ghost.Order
}`);
  assert.deepEqual(parsed.errors, [
    { line: 2, message: t('diag.pathUnknownSystem', { name: 'Ghost' }) },
  ]);
});

test('flags a path whose system lacks the use case', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}

actor Customer {
  Shop.Browse
}`);
  assert.deepEqual(parsed.errors, [
    {
      line: 6,
      message: t('diag.pathNoUseCase', { name: 'Browse', system: 'Shop' }),
    },
  ]);
});

test('flags references deeper than two segments', () => {
  const parsed = parseUseCaseSchema(`actor Customer {
  Shop.Deep.Order
}`);
  assert.deepEqual(parsed.errors, [
    { line: 2, message: t('diag.pathTooDeep', { name: 'Shop.Deep.Order' }) },
  ]);
});

test('flags a duplicate association from the same actor', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}

actor Customer {
  Shop.Order
  Shop.Order
}`);
  assert.deepEqual(parsed.errors, [
    { line: 7, message: t('diag.associationDuplicate') },
  ]);
  assert.equal(parsed.relations.length, 1);
});

test('creates a generalization from an extends clause', () => {
  const parsed = parseUseCaseSchema(`actor User {}
actor Admin extends User {}`);

  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(parsed.relations, [
    {
      id: 'rel-1',
      line: 2,
      source: 'actor-2',
      target: 'actor-1',
      kind: 'generalization',
    },
  ]);
});

test('keeps the body references of an extending actor', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Pay
}
actor User {}
actor Admin extends User {
  Shop.Pay
}`);

  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(
    parsed.relations.map((relation) => [relation.source, relation.target, relation.kind]),
    [
      ['actor-2', 'actor-1', 'generalization'],
      ['actor-2', 'uc-1', 'association'],
    ],
  );
});

test('flags extends of an undeclared actor', () => {
  const parsed = parseUseCaseSchema('actor Admin extends Ghost {}');
  assert.deepEqual(parsed.errors, [
    {
      line: 1,
      message: t('diag.extendsUnknown', { actor: 'Admin', name: 'Ghost' }),
    },
  ]);
  assert.equal(parsed.relations.length, 0);
});

test('flags self extends', () => {
  const parsed = parseUseCaseSchema('actor User extends User {}');
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.extendsSelf', { actor: 'User' }) },
  ]);
  assert.equal(parsed.relations.length, 0);
});

test('flags extends whose target is a use case', () => {
  const parsed = parseUseCaseSchema(`Pay
actor Admin extends Pay {}`);
  assert.deepEqual(parsed.errors, [
    {
      line: 2,
      message: t('diag.extendsNotActor', { actor: 'Admin', name: 'Pay' }),
    },
  ]);
  assert.equal(parsed.relations.length, 0);
});

test('flags a malformed extends clause', () => {
  const parsed = parseUseCaseSchema('actor Admin extends {}');
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.extendsSyntax', { name: 'Admin' }) },
  ]);
  assert.equal(parsed.relations.length, 0);
});

test('flags a usecase keyword inside a system body', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  usecase Order
}`);
  assert.deepEqual(parsed.errors, [
    { line: 2, message: t('diag.systemUsecaseKeyword') },
  ]);
});

test('flags paths and keywords inside a system body', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order Pay
  Shop.Order
  system Other {
}`);
  assert.deepEqual(
    parsed.errors.map((error) => error.message),
    [t('diag.systemBody'), t('diag.systemBody'), t('diag.systemBody')],
  );
});

test('flags block declarations and keywords inside an actor body', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}

actor Customer {
  Shop.Order
  system Other {
  actor Boss
  usecase Pay
}`);
  assert.deepEqual(parsed.errors, [
    { line: 7, message: t('diag.actorBody') },
    { line: 8, message: t('diag.actorBody') },
    { line: 9, message: t('diag.actorBody') },
  ]);
});

test('flags a block declaration without its brace', () => {
  const parsed = parseUseCaseSchema('system Shop');
  assert.deepEqual(parsed.errors, [
    {
      line: 1,
      message: t('diag.missingBrace', { kind: 'system', name: 'Shop' }),
    },
  ]);
});

test('flags text after the opening brace', () => {
  const parsed = parseUseCaseSchema('system Shop { extra');
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.blockTail', { name: 'Shop' }) },
  ]);
});

test('flags an unclosed block at the end of the source', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order`);
  assert.deepEqual(parsed.errors, [
    {
      line: 1,
      message: t('diag.unclosedEnd', { kind: 'system', name: 'Shop' }),
    },
  ]);
  // The body line still registers the use case; the frame simply spans
  // to the end of the source.
  assert.equal(parsed.useCases.length, 1);
});

test('flags a closing brace without an open block', () => {
  assert.deepEqual(parseUseCaseSchema('Pay\n}').errors, [
    { line: 2, message: t('diag.strayClosing') },
  ]);
  assert.deepEqual(parseUseCaseSchema('}').errors, [
    { line: 1, message: t('diag.strayClosing') },
  ]);
});

test('flags text after a closing brace and a stray opening brace', () => {
  assert.deepEqual(parseUseCaseSchema('Pay\n} x').errors, [
    { line: 2, message: t('diag.textAfterClosing') },
  ]);
  assert.deepEqual(parseUseCaseSchema('{').errors, [
    { line: 1, message: t('diag.strayOpening') },
  ]);
});

test('treats a duplicate system as invalid and hides its use cases', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}
system Shop {
  Pay
}`);

  assert.equal(parsed.errors.length, 1);
  assert.equal(parsed.actors.length, 0);
  // Only the first, valid system; its use case stays, the second body's
  // does not leak into the top level either.
  assert.equal(parsed.systems.length, 1);
  assert.equal(parsed.useCases.length, 1);
  assert.equal(parsed.useCases[0].name, 'Order');
});

test('ignores use cases of a duplicate system when resolving paths', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}
system Shop {
  Pay
}

actor Customer {
  Shop.Pay
}`);

  assert.deepEqual(parsed.errors, [
    {
      line: 4,
      message: t('diag.duplicate', { kind: 'system', name: 'Shop', where: '' }),
    },
    { line: 9, message: t('diag.pathNoUseCase', { name: 'Pay', system: 'Shop' }) },
  ]);
});

test('ignores comments and blank lines', () => {
  const parsed = parseUseCaseSchema(`# a comment
// another

 Browse`);
  assert.equal(parsed.useCases.length, 1);
  assert.equal(parsed.errors.length, 0);
});

test('flags names that are not identifier or quoted strings', () => {
  const parsed = parseUseCaseSchema(`123
 actor 9lives`);
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.unknownDeclaration') },
    { line: 2, message: t('diag.nameInvalid') },
  ]);
});

test('flags an empty quoted name', () => {
  const parsed = parseUseCaseSchema(`""`);
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.nameEmpty') },
  ]);
});

test('flags the removed usecase keyword at the top level', () => {
  const parsed = parseUseCaseSchema('usecase Browse');
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.usecaseKeyword') },
  ]);
  assert.equal(parsed.useCases.length, 0);
});

test('flags the removed usecase keyword even when the name is quoted', () => {
  const parsed = parseUseCaseSchema('usecase "Place Order"');
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.usecaseKeyword') },
  ]);
  assert.equal(parsed.useCases.length, 0);
});

test('still accepts a use case literally named usecase when quoted', () => {
  const parsed = parseUseCaseSchema('"usecase"');
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.useCases[0].name, 'usecase');
});

test('treats the reserved keywords as names when quoted', () => {
  const parsed = parseUseCaseSchema(`system "system" {
  "actor"
}`);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.systems[0].name, 'system');
  assert.equal(parsed.useCases[0].name, 'actor');
});

test('flags a top-level path', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}

Shop.Order`);
  assert.deepEqual(parsed.errors, [
    {
      line: 5,
      message: t('diag.pathAtTopLevel', { system: 'Shop', name: 'Order' }),
    },
  ]);
});

test('flags a trailing dot in an actor reference', () => {
  const parsed = parseUseCaseSchema(`system Shop {
  Order
}

actor Customer {
  Shop.
}`);
  assert.deepEqual(parsed.errors, [
    { line: 6, message: t('diag.actorBody') },
  ]);
});

test('flags anything after a top-level use case name', () => {
  const parsed = parseUseCaseSchema('Pay extra');
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.unknownDeclaration') },
  ]);
});

test('keeps the "rel" word as a plain top-level name', () => {
  const parsed = parseUseCaseSchema('rel');
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.useCases[0].name, 'rel');
});

test('sorts diagnostics by line', () => {
  const parsed = parseUseCaseSchema(`@
}
usecase`);
  assert.deepEqual(parsed.errors, [
    { line: 1, message: t('diag.unknownDeclaration') },
    { line: 2, message: t('diag.strayClosing') },
    { line: 3, message: t('diag.usecaseKeyword') },
  ]);
});
