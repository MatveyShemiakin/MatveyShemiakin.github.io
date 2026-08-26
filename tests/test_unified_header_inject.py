import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts' / 'inject_unified_header.py'
CSS_HREF = '/site-header-unified.css?v=20260826-1'
JS_SRC = '/site-header-unified.js?v=20260826-1'


def load_module():
    spec = importlib.util.spec_from_file_location('inject_unified_header', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class UnifiedHeaderInjectorTests(unittest.TestCase):
    def test_shared_header_assets_are_injected_once_without_touching_main(self):
        self.assertTrue(SCRIPT.exists(), 'scripts/inject_unified_header.py must exist')
        module = load_module()
        source = '<!doctype html><html><head><title>X</title></head><body><header class="legacy">old</header><main><article><h1>Medical content</h1><p>Keep exactly.</p></article></main></body></html>'
        before_main = source.split('<main>', 1)[1].split('</main>', 1)[0]

        first = module.inject_unified_header(source)
        second = module.inject_unified_header(first)
        after_main = second.split('<main>', 1)[1].split('</main>', 1)[0]

        self.assertEqual(second.count(CSS_HREF), 1)
        self.assertEqual(second.count(JS_SRC), 1)
        self.assertEqual(before_main, after_main)
        self.assertEqual(first, second)
        self.assertNotIn('style=', second)

    def test_missing_closing_tags_is_left_unchanged(self):
        self.assertTrue(SCRIPT.exists(), 'scripts/inject_unified_header.py must exist')
        module = load_module()
        source = '<main>fragment only</main>'
        self.assertEqual(module.inject_unified_header(source), source)


if __name__ == '__main__':
    unittest.main()
