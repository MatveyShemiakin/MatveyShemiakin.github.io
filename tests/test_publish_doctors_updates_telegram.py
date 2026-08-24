import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
SCRIPT = ROOT / 'scripts' / 'publish_doctors_updates_telegram.py'


def load_module():
    if not SCRIPT.exists():
        return None
    spec = importlib.util.spec_from_file_location('publish_doctors_updates_telegram', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DoctorsTelegramPublisherTests(unittest.TestCase):
    def setUp(self):
        self.module = load_module()
        if self.module is None:
            self.fail('scripts/publish_doctors_updates_telegram.py is missing')

    def test_detects_only_event_ids_not_present_in_previous_feed(self):
        previous = [
            {'id': 'a', 'event_id': 'a:1'},
            {'id': 'b', 'event_id': 'b:1'},
        ]
        current = [
            {'id': 'a', 'event_id': 'a:2'},
            {'id': 'b', 'event_id': 'b:1'},
            {'id': 'c', 'event_id': 'c:1'},
        ]
        self.assertEqual(
            [item['event_id'] for item in self.module.detect_new_events(previous, current)],
            ['a:2', 'c:1'],
        )

    def test_stable_feed_is_a_noop(self):
        feed = [{'id': 'a', 'event_id': 'a:1'}]
        self.assertEqual(self.module.detect_new_events(feed, feed), [])

    def test_formats_new_material_post_with_canonical_absolute_url(self):
        item = {
            'kind': 'new',
            'title': 'Бактериальный кератит',
            'description': 'Практический клинический конспект.',
            'url': '/for-doctors/bacterial-keratitis/',
        }
        text = self.module.format_message(item)
        self.assertIn('Новый материал для врачей', text)
        self.assertIn('Бактериальный кератит', text)
        self.assertIn('Практический клинический конспект.', text)
        self.assertIn('https://matveyshemyakin.ru/for-doctors/bacterial-keratitis/', text)

    def test_formats_updated_material_post_with_update_label(self):
        item = {
            'kind': 'updated',
            'title': 'OphthaSearch',
            'description': 'Обновлён поиск исследований.',
            'url': '/for-doctors/ophthasearch/',
        }
        text = self.module.format_message(item)
        self.assertIn('Обновление для врачей', text)
        self.assertNotIn('Новый материал для врачей', text)

    def test_rejects_non_site_relative_url(self):
        item = {
            'kind': 'new',
            'title': 'Bad',
            'description': 'Bad',
            'url': 'https://evil.example/',
        }
        with self.assertRaises(ValueError):
            self.module.format_message(item)


if __name__ == '__main__':
    unittest.main()
