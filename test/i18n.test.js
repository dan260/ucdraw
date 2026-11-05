import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { I18N } from '../scripts/load-source.mjs';

const INDEX_HTML = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf8',
);

const PLURAL_FORMS = ['one', 'few', 'many', 'other'];

function baseKey(key) {
  const dot = key.lastIndexOf('.');
  if (dot === -1) return key;
  const form = key.slice(dot + 1);
  return PLURAL_FORMS.includes(form) ? key.slice(0, dot) : key;
}

function hasForm(dict, base) {
  return PLURAL_FORMS.some((form) =>
    Object.prototype.hasOwnProperty.call(dict, `${base}.${form}`),
  );
}

test('dictionaries contain the same keys', () => {
  const en = I18N.MESSAGES.en;
  const ru = I18N.MESSAGES.ru;

  for (const key of Object.keys(en)) {
    const base = baseKey(key);
    if (base === key) {
      assert.equal(typeof ru[key], 'string', `ru is missing "${key}"`);
    } else {
      assert.ok(hasForm(ru, base), `ru is missing a form of "${base}"`);
    }
  }

  for (const key of Object.keys(ru)) {
    const base = baseKey(key);
    if (base === key) {
      assert.equal(typeof en[key], 'string', `en is missing "${key}"`);
    } else {
      assert.ok(hasForm(en, base), `en is missing a form of "${base}"`);
    }
  }
});

test('every entry is a non-empty string', () => {
  for (const [key, value] of Object.entries(I18N.MESSAGES.en)) {
    assert.equal(typeof value, 'string', `en:${key} must be a string`);
    assert.ok(value.trim(), `en:${key} must not be empty`);
  }
  for (const [key, value] of Object.entries(I18N.MESSAGES.ru)) {
    assert.equal(typeof value, 'string', `ru:${key} must be a string`);
    assert.ok(value.trim(), `ru:${key} must not be empty`);
  }
});

test('defaults to English and ignores unknown languages', () => {
  assert.equal(I18N.getLanguage(), 'en');
  assert.equal(I18N.t('status.ready'), 'Ready');
  I18N.setLanguage('fr');
  assert.equal(I18N.getLanguage(), 'en');
});

test('t() substitutes parameters in both languages', () => {
  I18N.setLanguage('en');
  assert.equal(
    I18N.t('diag.duplicate', {
      kind: 'use case',
      name: 'Browse',
      where: "",
    }),
    'The use case “Browse” is already declared.',
  );
  I18N.setLanguage('ru');
  assert.equal(
    I18N.t('diag.duplicate', { kind: 'кейс', name: 'Browse', where: '' }),
    'Элемент кейс «Browse» уже объявлен.',
  );
  I18N.setLanguage('en');
});

test('plural() picks language-specific forms', () => {
  I18N.setLanguage('en');
  assert.equal(I18N.plural(1, 'usecases'), '1 use case');
  assert.equal(I18N.plural(5, 'usecases'), '5 use cases');
  assert.equal(I18N.plural(2, 'errors'), '2 errors');

  I18N.setLanguage('ru');
  assert.equal(I18N.plural(1, 'usecases'), '1 кейс');
  assert.equal(I18N.plural(3, 'usecases'), '3 кейса');
  assert.equal(I18N.plural(5, 'usecases'), '5 кейсов');
  assert.equal(I18N.plural(12, 'usecases'), '12 кейсов');
  assert.equal(I18N.plural(0, 'errors'), '0 ошибок');
  I18N.setLanguage('en');
});

test('keys referenced from index.html exist in both languages', () => {
  const bound = new Set([
    ...INDEX_HTML.matchAll(/data-i18n(?:-html|-title|-aria)?="([^"]+)"/g),
  ].map((match) => match[1]));
  assert.ok(bound.size > 0, 'index.html should carry data-i18n keys');

  for (const key of bound) {
    assert.notEqual(
      I18N.MESSAGES.en[key],
      undefined,
      `"${key}" is missing from the English dictionary`,
    );
    assert.notEqual(
      I18N.MESSAGES.ru[key],
      undefined,
      `"${key}" is missing from the Russian dictionary`,
    );
  }
});

test('keys with rich markup are bound via data-i18n-html', () => {
  const textBindings = new Set(
    [...INDEX_HTML.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]),
  );
  const htmlBindings = new Set(
    [...INDEX_HTML.matchAll(/data-i18n-html="([^"]+)"/g)].map(
      (match) => match[1],
    ),
  );

  for (const key of new Set([...textBindings, ...htmlBindings])) {
    const values = ['en', 'ru'].map((lang) => I18N.MESSAGES[lang][key]);
    // A real HTML tag: '<' not preceded by another '<', an ASCII name,
    // then a space, '>' or '/'. This skips literal stereotypes like
    // '<' + '<include>>' while still catching '<code>' and the like.
    const isRich = values.some((value) =>
      /(?<!<)<\/?[a-z][a-z0-9]*(?=[\s>/])/i.test(value ?? ''),
    );
    if (isRich) {
      assert.ok(
        htmlBindings.has(key),
        `"${key}" contains markup but is bound with data-i18n (textContent)`,
      );
    } else {
      assert.ok(
        textBindings.has(key),
        `"${key}" is plain text and should use data-i18n`,
      );
    }
  }
});
