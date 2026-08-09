import assert from 'node:assert/strict';
import fs from 'node:fs';

const legal=fs.readFileSync('legal.js','utf8');
const widgetCss=fs.readFileSync('prodoctorov-widget.css','utf8');

assert.match(legal,/telegram-privacy-note/,'Telegram legal warning must remain available for direct contact areas');
assert.match(widgetCss,/\.author-links \.telegram-privacy-note\s*\{[^}]*display:none!important/s,'Telegram warning must be absent from the lower author/material-prepared block');
assert.match(widgetCss,/\.hero-actions \.telegram-privacy-note/,'Telegram warning styling must remain available in the primary contact area');

console.log('Author block Telegram privacy-note regression passed');
