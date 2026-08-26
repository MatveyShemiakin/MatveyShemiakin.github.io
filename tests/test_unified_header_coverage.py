import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_HREF = '/site-header-unified.css?v=20260826-1'
JS_SRC = '/site-header-unified.js?v=20260826-1'
EXCLUDED = {'.git', '.github', 'tests', 'docs', '.worktrees', 'worktrees'}


def public_pages():
    pages = []
    for path in ROOT.rglob('*.html'):
        rel = path.relative_to(ROOT)
        if any(part in EXCLUDED for part in rel.parts):
            continue
        pages.append(path)
    return sorted(pages)


class UnifiedHeaderCoverageTests(unittest.TestCase):
    def test_every_public_html_has_shared_header_assets_once(self):
        pages = public_pages()
        self.assertGreater(len(pages), 20)
        failures = []
        for path in pages:
            text = path.read_text(encoding='utf-8')
            css_count = text.count(CSS_HREF)
            js_count = text.count(JS_SRC)
            if css_count != 1 or js_count != 1:
                failures.append(f'{path.relative_to(ROOT)}: css={css_count}, js={js_count}')
        self.assertEqual(failures, [], '\n' + '\n'.join(failures))


if __name__ == '__main__':
    unittest.main()
