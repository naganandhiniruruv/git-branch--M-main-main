import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../components/sheplates-v3.tsx', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../components/sheplates-entry.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('v6 exposes a native-style customer mobile navigation', () => {
  assert.match(app, /sp-mobile-bottom-nav/);
  assert.match(app, />Explore</);
  assert.match(app, />Orders</);
  assert.match(app, /sp-nav-agent/);
  assert.match(app, />Cart</);
  assert.match(app, />Account</);
});

test('staff navigation remains collapsible and has a mobile overlay', () => {
  assert.match(app, /sp-mobile-nav-overlay/);
  assert.match(app, /setSidebarCollapsed\(false\)/);
  assert.match(app, /← Collapse/);
});

test('marketplace is explicitly designed for compact mobile product browsing', () => {
  assert.match(app, /sp-market-toolbar/);
  assert.match(app, /sp-product-card/);
  assert.match(app, /sp-product-image/);
  assert.match(app, /grid-cols-2 gap-2\.5/);
  assert.match(app, /sp-ai-card/);
});

test('mobile UI includes safe areas and full-screen assistant behavior', () => {
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /sp-agent-panel/);
  assert.match(css, /height: 100dvh/);
  assert.match(css, /sp-mobile-bottom-nav/);
});

test('PWA metadata is prepared for standalone mobile installation', () => {
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /appleWebApp/);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(manifest, /"orientation": "portrait-primary"/);
  assert.match(manifest, /icon-maskable-512\.png/);
});

test('release is versioned as 6.0.0', () => {
  assert.equal(pkg.version, '6.0.0');
});

test('public entry stays responsive for customer and vendor access', () => {
  assert.match(entry, /sm:hidden">Vendor/);
  assert.match(entry, /sm:hidden">Customer/);
  assert.match(entry, /hide-scrollbar/);
});
