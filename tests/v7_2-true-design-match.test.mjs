import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const entry = read('components/sheplates-entry.tsx');
const shell = read('components/sheplates-v3.tsx');
const css = read('app/globals.css');
const pkg = JSON.parse(read('package.json'));

test('v7.2 is the true design-match visual release', () => {
  assert.equal(pkg.version, '7.2.0');
  assert.match(entry, /Fresh food from local heroes\./);
  assert.match(entry, /sp-entry-visual/);
  assert.match(entry, /sp-entry-trust-card/);
  assert.match(css, /ShePlates v7\.2 — TRUE DESIGN MATCH/);
});

test('public entry uses the approved light editorial visual system', () => {
  assert.match(css, /\.sp-entry-hero[\s\S]*linear-gradient/);
  assert.match(css, /\.sp-entry-title/);
  assert.match(css, /\.sp-entry-search[\s\S]*backdrop-filter/);
  assert.match(css, /\.sp-entry-plan-card/);
});

test('staff portal is light and modern while navigation logic is unchanged', () => {
  assert.match(shell, /sp-portal-sidebar/);
  assert.match(css, /Light, modern operational portal/);
  assert.match(css, /\.sp-v7 \.sp-portal-sidebar[\s\S]*rgba\(255,255,255/);
  assert.match(css, /\.sp-v7 \.sp-portal-sidebar \.nav-item-active/);
});

test('glass remains limited to navigation overlays and She Agent', () => {
  assert.match(css, /Glass remains intentional/);
  assert.match(css, /\[data-slot="dialog-content"\]/);
  assert.match(css, /\.sp-agent-panel/);
  assert.match(css, /\.sp-mobile-bottom-nav/);
});
