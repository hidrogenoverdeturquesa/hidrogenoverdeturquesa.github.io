const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git', 'node_modules', 'tools', 'experimental_engine', '99_BACKUPS']);

function* htmlFiles(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        if (entry.isDirectory() && !ignored.has(entry.name)) yield* htmlFiles(path.join(directory, entry.name));
        else if (entry.isFile() && entry.name.endsWith('.html')) yield path.join(directory, entry.name);
    }
}

test('public links and buttons contain no decorative arrow glyphs', () => {
    let checked = 0;
    for (const file of htmlFiles(root)) {
        const html = fs.readFileSync(file, 'utf8');
        const controls = html.match(/<(?:a|button)\b[^>]*>[\s\S]*?<\/(?:a|button)>/gi) || [];
        for (const control of controls) {
            assert.doesNotMatch(control, /[←→↓↗]/, path.relative(root, file));
            checked++;
        }
    }
    assert.ok(checked > 100);
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'css/mobile-navigation.css'), 'utf8'), /\\2192/);
});
