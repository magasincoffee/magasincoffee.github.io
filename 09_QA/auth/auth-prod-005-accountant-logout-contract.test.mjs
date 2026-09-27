import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('AUTH-PROD-005: Accountant friendly route exposes canonical Procurement logout', () => {
  const friendly = fs.readFileSync('nhap-hang/index.html', 'utf8');
  assert.ok(
    friendly.includes("html = html.replace('<button id=\"logoutBtn\" type=\"button\" hidden>', '<button id=\"logoutBtn\" type=\"button\" class=\"btn\">');"),
    'friendly route must expose the existing Procurement logout control'
  );
  assert.ok(
    !friendly.includes('id="logoutBtn" onclick='),
    'friendly route must not invent a separate logout implementation'
  );
});
