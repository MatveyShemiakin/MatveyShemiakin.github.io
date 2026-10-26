"""The calendar must contain useful, visible event content before JavaScript."""
import importlib.util
import json
from datetime import date, datetime
from html import escape
from pathlib import Path
import sys
import unittest
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from site_header import Elements


class StaticEventsTests(unittest.TestCase):
    def renderer(self):
        path = ROOT / 'scripts/render_events.py'
        self.assertTrue(path.exists(), 'Searchable calendar renderer is missing')
        spec = importlib.util.spec_from_file_location('render_events', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_published_html_contains_visible_dates_places_and_official_links(self):
        for lang in ('ru', 'en'):
            with self.subTest(lang=lang):
                page = ROOT / ('en/' if lang == 'en' else '') / 'for-doctors/events/index.html'
                text = page.read_text()
                nodes = Elements(text).nodes
                grid = next(n for n in nodes if n['attrs'].get('id') == 'events-grid')
                content = text[grid['open_end']:grid['close_start']]
                dataset = json.loads((ROOT / f'assets/data/ophthalmology-events.{lang}.json').read_text())
                today = datetime.now(ZoneInfo('Europe/Moscow')).date().isoformat()
                upcoming = [e for e in dataset['events'] if e['end'] >= today]
                cards = [n for n in Elements(content).nodes if n['tag'] == 'article' and n['attrs'].get('class') == 'event-card']
                self.assertEqual(len(cards), len(upcoming), 'The original HTML must expose the current catalogue')
                for event in upcoming:
                    self.assertIn(escape(event['title']), content)
                    self.assertIn(f'datetime="{event["start"]}"', content)
                    self.assertIn(escape(event['city']), content)
                    self.assertIn(escape(event['official'], quote=True), content)
                self.assertNotIn('style=', text)
                self.assertEqual(text.count('id="events-grid"'), 1)

    def test_renderer_uses_catalogue_and_is_idempotent(self):
        module = self.renderer()
        for lang in ('ru', 'en'):
            dataset = json.loads((ROOT / f'assets/data/ophthalmology-events.{lang}.json').read_text())
            page = ROOT / ('en/' if lang == 'en' else '') / 'for-doctors/events/index.html'
            text = module.render_page(page.read_text(), dataset, lang, date(2026, 10, 26))
            nodes = Elements(text).nodes
            cards = [n for n in nodes if n['tag'] == 'article' and 'event-card' in n['attrs'].get('class', '').split()]
            expected = [e for e in dataset['events'] if e['end'] >= '2026-10-26']
            self.assertEqual(len(cards), len(expected))
            self.assertEqual(module.render_page(text, dataset, lang, date(2026, 10, 26)), text)
            self.assertIn('Матвея' if lang == 'ru' else 'Matvey', text[text.index('<main'):text.index('class="dashboard"')])

    def test_empty_catalogue_shows_an_honest_message(self):
        module = self.renderer()
        page = (ROOT / 'for-doctors/events/index.html').read_text()
        for events in ([], [{'end': '2020-01-01'}]):
            text = module.render_page(page, {'events': events}, 'ru', date(2026, 10, 26))
            self.assertIn('Ближайших мероприятий пока нет', text)
            self.assertIn('id="stat-events">0</strong>', text)
            self.assertNotIn('Загрузка…', text)

    def test_catalogue_text_cannot_inject_html(self):
        module = self.renderer()
        dataset = json.loads((ROOT / 'assets/data/ophthalmology-events.ru.json').read_text())
        event = next(e for e in dataset['events'] if e['id'] == 'apao-2027').copy()
        event['title'] = '<script>alert("x")</script> & congress'
        event['description'] = '</p><img src=x onerror=alert(1)>'
        page = (ROOT / 'for-doctors/events/index.html').read_text()
        text = module.render_page(page, {'events': [event]}, 'ru', date(2026, 10, 26))
        self.assertIn('&lt;script&gt;', text)
        self.assertIn('&lt;/p&gt;&lt;img', text)
        self.assertNotIn('<script>alert', text)
        self.assertNotIn('<img src=x', text)


if __name__ == '__main__':
    unittest.main()
