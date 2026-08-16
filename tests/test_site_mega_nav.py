import unittest
from scripts.inject_site_mega_nav import inject_assets


class SiteMegaNavInjectorTests(unittest.TestCase):
    def test_injects_assets_once(self):
        source = '<!doctype html><html><head><title>X</title></head><body></body></html>'
        once = inject_assets(source)
        twice = inject_assets(once)
        self.assertEqual(once.count('/site-mega-nav.css?v=20260816-2'), 1)
        self.assertEqual(once.count('/site-mega-nav.js?v=20260816-2'), 1)
        self.assertEqual(once, twice)

    def test_preserves_existing_markup(self):
        source = '<html lang="ru"><head></head><body><header class="patient-header"><nav><a href="#faq">FAQ</a></nav></header></body></html>'
        result = inject_assets(source)
        self.assertIn('<header class="patient-header">', result)
        self.assertIn('<a href="#faq">FAQ</a>', result)


if __name__ == '__main__':
    unittest.main()
