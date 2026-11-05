'use strict';

const HIGHLIGHT_LIMIT = 100_000;
const NAME_TOKEN = /(?:"[^"]*"|[\p{L}_][\p{L}\p{N}_]*)/u;

function escapeHtmlText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function token(className, text) {
  return `<span class="tk-${className}">${escapeHtmlText(text)}</span>`;
}

function appendGap(html, text) {
  return text ? html + escapeHtmlText(text) : html;
}

function skipWs(html, rest) {
  const match = rest.match(/^[ \t]*/u)[0];
  return { html: html + escapeHtmlText(match), rest: rest.slice(match.length) };
}

function renderRawBraces(html, rest) {
  let index = 0;
  while (index < rest.length) {
    if (rest[index] === '{' || rest[index] === '}') {
      html += token('brace', rest[index]);
      index += 1;
    } else {
      let end = index;
      while (end < rest.length && rest[end] !== '{' && rest[end] !== '}') {
        end += 1;
      }
      html += escapeHtmlText(rest.slice(index, end));
      index = end;
    }
  }
  return html;
}

/**
 * Renders `rest`, which must start with a name, and returns the remaining
 * part of the line after the name.
 */
function renderNameAt(rest) {
  const match = rest.match(new RegExp(`^${NAME_TOKEN.source}`, 'u'));
  if (!match) return { html: '', rest };
  return { html: token('name', match[0]), rest: rest.slice(match[0].length) };
}

/**
 * Renders a path of name segments: `Shop.Order`, `"My Shop"."Place Order"`.
 * The dot must sit outside the quotes and is rendered as punctuation.
 */
function renderPathAt(rest) {
  const first = renderNameAt(rest);
  if (!first.html) return { html: '', rest };
  let html = first.html;
  rest = first.rest;

  for (;;) {
    const dotted = skipWs(html, rest);
    html = dotted.html;
    rest = dotted.rest;
    if (rest.length > 0 && rest[0] === '.') {
      const afterDot = skipWs(html, rest.slice(1));
      if (afterDot.rest.length === 0) {
        // Trailing dot: keep it plain so it stands out.
        return { html: html + escapeHtmlText(rest), rest: '' };
      }
      const next = renderNameAt(afterDot.rest);
      if (!next.html) {
        return { html: html + escapeHtmlText(rest), rest: '' };
      }
      html = afterDot.html + token('punct', '.') + next.html;
      rest = next.rest;
      continue;
    }
    return { html, rest };
  }
}

function renderSystemLine(rest, keyword, allowExtends = false) {
  let body = rest.slice(keyword.length);
  let html = token('keyword', keyword);

  let gap = skipWs(html, body);
  html = gap.html;
  body = gap.rest;

  let declared = false;
  const name = renderNameAt(body);
  if (name.html) {
    html += name.html;
    body = name.rest;
    declared = true;
  }

  if (allowExtends) {
    const afterName = skipWs(html, body);
    html = afterName.html;
    body = afterName.rest;
    if (/^extends(?=\s|$)/u.test(body)) {
      html += token('keyword', 'extends');
      body = body.slice('extends'.length);
      const beforeSuper = skipWs(html, body);
      html = beforeSuper.html;
      body = beforeSuper.rest;
      const superName = renderNameAt(body);
      if (superName.html) {
        html += superName.html;
        body = superName.rest;
      }
    }
  }

  html = renderRawBraces(html, body);

  const opens = (body.match(/\{/g) || []).length;
  const closes = (body.match(/\}/g) || []).length;
  const state = declared && opens > closes ? keyword : false;

  return { html, state };
}

/**
 * The state tracks which block a line sits inside: `false` for top-level
 * lines, `'system'` / `'actor'` inside a block body.
 */
function highlightLine(raw, state) {
  const lead = raw.match(/^\s*/u)[0];
  let html = appendGap('', lead);
  const rest = raw.slice(lead.length);

  if (!rest) {
    return { html, state };
  }

  if (rest.startsWith('#') || rest.startsWith('//')) {
    return { html: html + token('comment', rest), state };
  }

  if (rest.startsWith('}')) {
    // A lone "}" closes the open block; a "}" with a tail does not.
    const nextState =
      state !== false && rest.slice(1).trim() === '' ? false : state;
    return {
      html: renderRawBraces(html, rest),
      state: nextState,
    };
  }

  if (rest.startsWith('{')) {
    return { html: renderRawBraces(html, rest), state };
  }

  if (/^system(?=[\s"{}]|$)/u.test(rest)) {
    const rendered = renderSystemLine(rest, 'system');
    return { html: html + rendered.html, state: rendered.state };
  }

  if (/^actor(?=\s|$)/u.test(rest)) {
    const rendered = renderSystemLine(rest, 'actor', true);
    return { html: html + rendered.html, state: rendered.state };
  }

  if (state === 'system' || state === 'actor') {
    const path = renderPathAt(rest);
    if (path.html) {
      let tail = path.rest;
      if (tail) {
        const gap = skipWs(html, tail);
        html = gap.html;
        tail = gap.rest;
      }
      return { html: html + path.html + escapeHtmlText(tail), state };
    }
    return { html: html + escapeHtmlText(rest), state };
  }

  // A top-level line holding only a name is a use case outside any system.
  const path = renderPathAt(rest);
  if (path.html && path.rest.trim() === '') {
    return { html: html + path.html + escapeHtmlText(path.rest), state };
  }

  return { html: html + escapeHtmlText(rest), state };
}

function highlightUseCaseSchema(text) {
  const value = String(text ?? '');
  if (value.length > HIGHLIGHT_LIMIT) return escapeHtmlText(value);

  let state = false;
  const parts = value.split('\n').map((line) => {
    const rendered = highlightLine(line, state);
    state = rendered.state;
    return rendered.html;
  });

  let html = parts.join('\n');
  if (value.endsWith('\n')) html += ' ';
  return html;
}
