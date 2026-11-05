import test from 'node:test';
import assert from 'node:assert/strict';

import { highlightUseCaseSchema, escapeHtmlText } from '../scripts/load-source.mjs';

test('highlights a system declaration', () => {
  const html = highlightUseCaseSchema('system Shop {');
  assert.match(html, /<span class="tk-keyword">system<\/span>/);
  assert.match(html, /<span class="tk-name">Shop<\/span>/);
  assert.match(html, /<span class="tk-brace">\{<\/span>/);
});

test('highlights names inside an open block', () => {
  const html = highlightUseCaseSchema(`system Shop {
  Order
  Pay
}`);
  assert.match(html, /<span class="tk-name">Order<\/span>/);
  assert.match(html, /<span class="tk-name">Pay<\/span>/);
});

test('keeps the block state across lines', () => {
  const html = highlightUseCaseSchema(`system Shop {
  Order`);
  // The block is still open at the last line.
  assert.match(html, /<span class="tk-name">Order<\/span>/);
});

test('a lone closing brace ends the block', () => {
  const html = highlightUseCaseSchema(`system Shop {
   Order
 }
 Browse`);
  // Once the block is closed, the next name is a top-level use case.
  assert.match(html, /<span class="tk-name">Browse<\/span>/);
});

test('a closing brace with a tail keeps the block open', () => {
  const html = highlightUseCaseSchema(`system Shop {
   Order
 } Browse Pay
   Pay`);
  // The tail after the brace is plain, but the block is still open on the
  // next line.
  assert.doesNotMatch(
    html.split('\n')[2],
    /tk-name/,
  );
  assert.match(html.split('\n')[3], /<span class="tk-name">Pay<\/span>/);
});

test('renders path references with dot punctuation', () => {
  const html = highlightUseCaseSchema(`actor Customer {
  Shop.Order
}`);
  assert.match(html, /<span class="tk-name">Shop<\/span>/);
  assert.match(html, /<span class="tk-punct">\.<\/span>/);
  assert.match(html, /<span class="tk-name">Order<\/span>/);
});

test('renders quoted path segments', () => {
  const html = highlightUseCaseSchema(`actor Customer {
  "My Shop"."Place Order"
}`);
  assert.match(html, /<span class="tk-name">"My Shop"<\/span>/);
  assert.match(html, /<span class="tk-punct">\.<\/span>/);
  assert.match(html, /<span class="tk-name">"Place Order"<\/span>/);
});

test('keeps a trailing dot plain', () => {
  const html = highlightUseCaseSchema(`actor Customer {
  Shop.
}`);
  assert.match(html, /<span class="tk-name">Shop<\/span>\./);
  assert.doesNotMatch(html, /tk-punct/);
});

test('renders a quoted top-level name as a use case name', () => {
  const html = highlightUseCaseSchema('"Place Order"');
  assert.match(html, /<span class="tk-name">"Place Order"<\/span>/);
});

test('does not keyword-highlight the removed usecase word', () => {
  const html = highlightUseCaseSchema('usecase "Place Order"');
  assert.doesNotMatch(html, /tk-keyword/);
  assert.doesNotMatch(html, /tk-name/);
});

test('renders the extends clause of an actor declaration', () => {
  const html = highlightUseCaseSchema('actor Admin extends User {}');
  assert.match(html, /<span class="tk-keyword">actor<\/span>/);
  assert.match(html, /<span class="tk-name">Admin<\/span>/);
  assert.match(html, /<span class="tk-keyword">extends<\/span>/);
  assert.match(html, /<span class="tk-name">User<\/span>/);
  assert.match(html, /<span class="tk-brace">\{<\/span>/);
});

test('treats a bare name as a top-level use case name', () => {
  const html = highlightUseCaseSchema('Browse');
  assert.match(html, /<span class="tk-name">Browse<\/span>/);
});

test('does not highlight a line that holds more than a name', () => {
  const html = highlightUseCaseSchema('Browse something');
  assert.doesNotMatch(html, /tk-name/);
});

test('rel is no longer a keyword', () => {
  const html = highlightUseCaseSchema('rel');
  assert.match(html, /<span class="tk-name">rel<\/span>/);
  assert.doesNotMatch(html, /tk-keyword/);
});

test('renders no stereotype tokens', () => {
  const html = highlightUseCaseSchema(`system Shop {
  Order
}

actor Customer {
  Shop.Order
}`);
  assert.doesNotMatch(html, /tk-stereo/);
});

test('highlights comments and escapes entities', () => {
  const html = highlightUseCaseSchema('# note <system> { x }');
  assert.match(html, /<span class="tk-comment">/);
  assert.ok(!html.includes('<system>'));
  assert.match(html, /&lt;system&gt;/);
});

test('escapeHtmlText escapes ampersands, angle brackets and keeps the rest', () => {
  assert.equal(escapeHtmlText('a & b < c > d'), 'a &amp; b &lt; c &gt; d');
  assert.equal(escapeHtmlText('plain'), 'plain');
});

test('refuses to highlight oversized text', () => {
  const long = 'a'.repeat(100_001);
  assert.equal(highlightUseCaseSchema(long), long);
});

test('returns an empty string for empty input', () => {
  assert.equal(highlightUseCaseSchema(''), '');
});
