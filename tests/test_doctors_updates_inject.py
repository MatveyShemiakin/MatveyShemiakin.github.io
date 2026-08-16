import importlib.util
import unittest
from pathlib import Path

ROOT=Path(__file__).parents[1]
SCRIPT=ROOT/'scripts'/'inject_doctors_updates.py'


def load_module():
    if not SCRIPT.exists():
        return None
    spec=importlib.util.spec_from_file_location('inject_doctors_updates',SCRIPT)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SOURCE='''<!doctype html><html lang="{lang}"><head></head><body><header class="doctors-header"><div class="container doctors-nav"><a class="monogram">MS</a><div class="doctors-nav-actions"><a>Back</a><div class="doctors-language"><a>RU</a><a>EN</a></div></div></div></header><main><h1>Library</h1></main></body></html>'''


class DoctorsUpdatesInjectTests(unittest.TestCase):
    def setUp(self):
        self.module=load_module()
        if self.module is None:
            self.fail('scripts/inject_doctors_updates.py is missing')

    def test_ru_shell_assets_are_injected_once_before_language_switch(self):
        source=SOURCE.format(lang='ru')
        once=self.module.inject_doctors_updates(source,'ru')
        twice=self.module.inject_doctors_updates(once,'ru')
        self.assertEqual(once,twice)
        self.assertEqual(once.count('id="doctors-updates"'),1)
        self.assertEqual(once.count('/for-doctors/doctors-updates.css?v=20260816-1'),1)
        self.assertEqual(once.count('/for-doctors/doctors-updates.js?v=20260816-1'),1)
        self.assertIn('aria-label="Что нового"',once)
        self.assertIn('id="doctors-updates-mark-all"',once)
        self.assertIn('>Прочитать всё<',once)
        self.assertLess(once.index('id="doctors-updates"'),once.index('class="doctors-language"'))
        self.assertNotIn('style=',once)

    def test_en_shell_is_localized(self):
        once=self.module.inject_doctors_updates(SOURCE.format(lang='en'),'en')
        self.assertIn('aria-label="What’s new"',once)
        self.assertIn('>Mark all read<',once)
        self.assertIn('id="doctors-updates-section-label">Updates<',once)
        self.assertIn('id="doctors-updates-title">What’s new<',once)
        self.assertNotIn('style=',once)


if __name__=='__main__':
    unittest.main()
