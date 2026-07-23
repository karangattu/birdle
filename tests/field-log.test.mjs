import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('field log container exists in index.html', () => {
  const htmlPath = path.resolve('index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  assert.equal(htmlContent.includes('id="field-log"'), true, 'index.html should contain element with id field-log');
  assert.equal(htmlContent.includes('class="field-log"'), true, 'index.html should contain element with class field-log');
});
