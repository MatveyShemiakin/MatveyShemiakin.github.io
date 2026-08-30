import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
SCRIPT = ROOT / 'scripts' / 'inject_doctor_retention.py'


def load_module():
    if not SCRIPT.exists():
        return None
    spec = importlib.util.spec_from_file_location('inject_doctor_retention', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DoctorRetentionInjectorTests(unittest.TestCase):
    def setUp(self):
        self.module = load_module()
        if self.module is None:
            self.fail('scripts/inject_doctor_retention.py is missing')

    def test_hub_injection_adds_workspace_once_in_ru(self):
        source = '<html lang="ru"><head></head><body><main><section class="doctors-hero"></section><section class="library"></section></main></body></html>'
        once = self.module.inject_hub(source, 'ru')
        twice = self.module.inject_hub(once, 'ru')
        self.assertEqual(once, twice)
        self.assertEqual(once.count('id="doctor-workspace"'), 1)
        self.assertIn('Профессиональное рабочее пространство', once)
        self.assertIn('https://t.me/DrShemMYu', once)
        self.assertIn('/for-doctors/updates/', once)
        self.assertNotIn('style="', once)

    def test_hub_injection_localizes_english_copy(self):
        source = '<html lang="en"><head></head><body><main><section class="doctors-hero"></section><section class="library"></section></main></body></html>'
        result = self.module.inject_hub(source, 'en')
        self.assertIn('Professional workspace', result)
        self.assertIn('Continue working', result)
        self.assertIn('Saved', result)
        self.assertIn('/en/for-doctors/updates/', result)

    def test_hub_injection_exposes_ophtha_arcade_in_both_languages(self):
        ru_source = '<html lang="ru"><head></head><body><main><section class="library"><div class="library-grid"><a href="/collaboration/">C</a></div></section></main></body></html>'
        en_source = '<html lang="en"><head></head><body><main><section class="library"><div class="library-grid"><a href="/en/collaboration/">C</a></div></section></main></body></html>'
        ru = self.module.inject_hub(ru_source, 'ru')
        en = self.module.inject_hub(en_source, 'en')
        self.assertIn('href="/for-doctors/ophtha-arcade/"', ru)
        self.assertIn('href="/en/for-doctors/ophtha-arcade/"', en)
        self.assertIn('Ophtha Arcade', en)

    def test_material_injection_adds_tools_related_and_shared_assets_once(self):
        source = '<html lang="ru"><head></head><body><main><article><h1>Материал</h1><p>Текст</p></article></main><footer></footer></body></html>'
        once = self.module.inject_material(source, 'ru')
        twice = self.module.inject_material(once, 'ru')
        self.assertEqual(once, twice)
        self.assertEqual(once.count('id="doctor-material-tools"'), 1)
        self.assertEqual(once.count('id="doctor-bookmark-toggle"'), 1)
        self.assertEqual(once.count('id="doctor-related-list"'), 1)
        self.assertEqual(once.count('/for-doctors/doctor-retention.css'), 1)
        self.assertEqual(once.count('/for-doctors/doctor-retention.js'), 1)
        self.assertNotIn('style="', once)

    def test_material_injection_keeps_existing_main_content(self):
        source = '<html lang="ru"><head></head><body><main><article><h1>Материал</h1><p id="keep-me">Клинический текст</p></article></main><footer></footer></body></html>'
        result = self.module.inject_material(source, 'ru')
        self.assertIn('id="keep-me"', result)
        self.assertIn('Клинический текст', result)

    def test_service_slugs_are_not_material_targets(self):
        self.assertFalse(self.module.is_material_slug('updates'))
        self.assertFalse(self.module.is_material_slug('ophtha-arcade'))
        self.assertTrue(self.module.is_material_slug('bacterial-keratitis'))


if __name__ == '__main__':
    unittest.main()
