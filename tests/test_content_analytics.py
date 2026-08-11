import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
MARKER_RE = re.compile(
    r'<script\s+type=["\']application/ld\+json["\']\s+data-yandex-content-analytics=["\']true["\']>(.*?)</script>',
    flags=re.I | re.S,
)

SAMPLES = (
    'patients/cataract/index.html',
    'patients/iol-dislocation/index.html',
    'patients/before-surgery/index.html',
    'for-doctors/bacterial-keratitis/index.html',
    'for-doctors/penetrating-keratoplasty/index.html',
    'en/patients/iol-dislocation/index.html',
    'en/for-doctors/bacterial-keratitis/index.html',
)

EXCLUDED = (
    'patients/index.html',
    'en/patients/index.html',
    'for-doctors/index.html',
    'en/for-doctors/index.html',
    'for-doctors/professional-use.html',
    'en/for-doctors/professional-use.html',
)

class ContentAnalyticsMarkupTests(unittest.TestCase):
    def parse_markup(self, relative):
        text = (ROOT / relative).read_text(encoding='utf-8')
        matches = MARKER_RE.findall(text)
        self.assertEqual(len(matches), 1, f'{relative}: expected exactly one generated JSON-LD block')
        return text, json.loads(matches[0])

    def test_supported_article_markup_is_present(self):
        for relative in SAMPLES:
            with self.subTest(relative=relative):
                text, data = self.parse_markup(relative)
                self.assertEqual(data.get('@context'), 'https://schema.org')
                graph = data.get('@graph')
                self.assertIsInstance(graph, list)
                article = next(node for node in graph if node.get('@type') == 'Article')
                breadcrumbs = next(node for node in graph if node.get('@type') == 'BreadcrumbList')

                self.assertTrue(article.get('@id'))
                self.assertEqual(article.get('@id'), article.get('url'))
                self.assertTrue(article.get('headline'))
                self.assertTrue(article.get('author', {}).get('name'))
                self.assertGreaterEqual(len(breadcrumbs.get('itemListElement', [])), 2)

                fragment = article['url'].split('#', 1)[1]
                self.assertRegex(text, rf'<main\b[^>]*\bid=["\']{re.escape(fragment)}["\']')

    def test_generated_markup_is_not_duplicated(self):
        for relative in SAMPLES:
            with self.subTest(relative=relative):
                text = (ROOT / relative).read_text(encoding='utf-8')
                self.assertEqual(text.count('data-yandex-content-analytics="true"'), 1)

    def test_navigation_and_legal_pages_are_not_materials(self):
        for relative in EXCLUDED:
            with self.subTest(relative=relative):
                text = (ROOT / relative).read_text(encoding='utf-8')
                self.assertNotIn('data-yandex-content-analytics="true"', text)

if __name__ == '__main__':
    unittest.main()
