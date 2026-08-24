import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]


class ProfessionalUpdatesPageTests(unittest.TestCase):
    def test_ru_and_en_update_pages_exist_and_use_shared_retention_assets(self):
        for rel, lang, title in (
            ('for-doctors/updates/index.html', 'ru', 'Все профессиональные обновления'),
            ('en/for-doctors/updates/index.html', 'en', 'All professional updates'),
        ):
            path = ROOT / rel
            self.assertTrue(path.exists(), rel)
            text = path.read_text(encoding='utf-8')
            self.assertIn(f'<html lang="{lang}">', text)
            self.assertIn(title, text)
            self.assertEqual(text.count('id="doctor-all-updates-list"'), 1)
            self.assertEqual(text.count('/for-doctors/doctor-retention.css?v=20260825-1'), 1)
            self.assertEqual(text.count('/for-doctors/doctor-retention.js?v=20260825-1'), 1)
            self.assertNotIn('style="', text)

    def test_hub_workspace_links_to_full_update_feed_in_both_languages(self):
        ru = (ROOT / 'scripts' / 'inject_doctor_retention.py').read_text(encoding='utf-8')
        self.assertIn('/for-doctors/updates/', ru)
        self.assertIn('/en/for-doctors/updates/', ru)


if __name__ == '__main__':
    unittest.main()
