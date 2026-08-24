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

    def test_formats_new_material_as_human_first_person_post(self):
        item = {
            'kind': 'new',
            'title': 'Бактериальный кератит',
            'description': 'Практический клинический конспект по диагностике и стартовой терапии.',
            'url': '/for-doctors/bacterial-keratitis/',
            'topics': ['cornea'],
        }
        text = self.module.format_message(item)
        self.assertTrue(text.startswith('Доброго времени суток! 👋'))
        self.assertIn('Сегодня работал над', text)
        self.assertIn('я', text.lower())
        self.assertIn('коллег', text.lower())
        self.assertIn('📌', text)
        self.assertIn('🔗', text)
        self.assertIn('#офтальмология', text)
        self.assertIn('#роговица', text)
        self.assertIn('https://matveyshemyakin.ru/for-doctors/bacterial-keratitis/', text)
        self.assertNotIn('Новый материал для врачей', text)
        self.assertNotIn('revision', text.lower())

    def test_formats_updated_material_as_author_update_not_technical_log(self):
        item = {
            'kind': 'updated',
            'title': 'OphthaSearch',
            'description': 'Обновлён поиск исследований и региональных научных источников.',
            'url': '/for-doctors/ophthasearch/',
            'topics': ['research'],
        }
        text = self.module.format_message(item)
        self.assertIn('Сегодня вернулся к', text)
        self.assertIn('почему', text.lower())
        self.assertIn('#наука', text)
        self.assertNotIn('Обновление для врачей', text)
        self.assertNotIn('Новый материал для врачей', text)

    def test_topic_context_changes_who_the_post_is_for(self):
        cornea = self.module.format_message({
            'kind': 'updated',
            'title': 'Кератопластика',
            'description': 'Тактика наблюдения после операции.',
            'url': '/for-doctors/penetrating-keratoplasty/',
            'topics': ['cornea', 'surgery'],
        })
        events = self.module.format_message({
            'kind': 'updated',
            'title': 'Календарь офтальмологических событий',
            'description': 'Добавлены новые конференции и дедлайны.',
            'url': '/for-doctors/events/',
            'topics': ['events'],
        })
        self.assertIn('роговиц', cornea.lower())
        self.assertIn('конференц', events.lower())
        self.assertNotEqual(cornea, events)

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
