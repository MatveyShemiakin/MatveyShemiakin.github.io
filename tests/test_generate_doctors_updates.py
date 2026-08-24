import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]
SCRIPT = ROOT / 'scripts' / 'generate_doctors_updates.py'


def load_module():
    if not SCRIPT.exists():
        return None
    spec = importlib.util.spec_from_file_location('generate_doctors_updates', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_material(root: Path, slug: str, *, ru_main: str, en_main: str, ru_header: str = 'RU head', en_header: str = 'EN head'):
    ru = root / 'for-doctors' / slug
    en = root / 'en' / 'for-doctors' / slug
    ru.mkdir(parents=True, exist_ok=True)
    en.mkdir(parents=True, exist_ok=True)
    (ru / 'index.html').write_text(
        f'''<!doctype html><html lang="ru"><head><title>RU {slug}</title><meta name="description" content="Описание RU"><script type="application/ld+json">{{"dateModified":"2026-07-20"}}</script></head><body><header>{ru_header}</header><main><h1>RU {slug}</h1>{ru_main}</main><footer>RU footer</footer></body></html>''',
        encoding='utf-8',
    )
    (en / 'index.html').write_text(
        f'''<!doctype html><html lang="en"><head><title>EN {slug}</title><meta name="description" content="EN description"><script type="application/ld+json">{{"dateModified":"2026-07-20"}}</script></head><body><header>{en_header}</header><main><h1>EN {slug}</h1>{en_main}</main><footer>EN footer</footer></body></html>''',
        encoding='utf-8',
    )


class DoctorsUpdatesGeneratorTests(unittest.TestCase):
    def setUp(self):
        self.module = load_module()
        if self.module is None:
            self.fail('scripts/generate_doctors_updates.py is missing')

    def test_new_material_is_one_bilingual_event_and_repeat_is_stable(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_material(root, 'keratitis', ru_main='<p>Клинический текст</p>', en_main='<p>Clinical text</p>')
            feed, manifest = self.module.build_updates(root, '2026-08-16')
            self.assertEqual(len(feed), 1)
            item = feed[0]
            self.assertEqual(item['id'], 'keratitis')
            self.assertEqual(item['kind'], 'new')
            self.assertEqual(item['revision'], 1)
            self.assertEqual(item['event_id'], 'keratitis:1')
            self.assertEqual(item['url'], '/for-doctors/keratitis/')
            self.assertEqual(item['url_en'], '/en/for-doctors/keratitis/')
            self.assertEqual(item['title'], 'RU keratitis')
            self.assertEqual(item['title_en'], 'EN keratitis')
            self.assertEqual(item['description'], 'Описание RU')
            self.assertEqual(item['description_en'], 'EN description')
            self.assertEqual(item['published'], '2026-07-20')
            self.assertEqual(item['updated'], '2026-07-20')

            (root / 'for-doctors' / 'updates-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
            again, again_manifest = self.module.build_updates(root, '2026-08-17')
            self.assertEqual(again, feed)
            self.assertEqual(again_manifest, manifest)

    def test_main_change_creates_updated_revision_but_header_change_does_not(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_material(root, 'pkp', ru_main='<p>Версия 1</p>', en_main='<p>Version 1</p>')
            feed, manifest = self.module.build_updates(root, '2026-08-16')
            (root / 'for-doctors' / 'updates-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')

            write_material(root, 'pkp', ru_main='<p>Версия 1</p>', en_main='<p>Version 1</p>', ru_header='new technical nav', en_header='new technical nav')
            header_only, header_manifest = self.module.build_updates(root, '2026-08-17')
            self.assertEqual(header_only[0]['event_id'], 'pkp:1')
            self.assertEqual(header_only[0]['kind'], 'new')
            self.assertEqual(header_manifest['materials']['pkp']['revision'], 1)

            (root / 'for-doctors' / 'updates-manifest.json').write_text(json.dumps(header_manifest, ensure_ascii=False), encoding='utf-8')
            write_material(root, 'pkp', ru_main='<p>Версия 2 — изменён клинический текст</p>', en_main='<p>Version 2 clinical update</p>', ru_header='new technical nav', en_header='new technical nav')
            updated, updated_manifest = self.module.build_updates(root, '2026-08-18')
            self.assertEqual(updated[0]['kind'], 'updated')
            self.assertEqual(updated[0]['revision'], 2)
            self.assertEqual(updated[0]['event_id'], 'pkp:2')
            self.assertEqual(updated[0]['published'], '2026-07-20')
            self.assertEqual(updated[0]['updated'], '2026-08-18')
            self.assertEqual(updated_manifest['materials']['pkp']['revision'], 2)

    def test_service_pages_are_not_materials(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_material(root, 'bacterial-keratitis', ru_main='<p>RU</p>', en_main='<p>EN</p>')
            (root / 'for-doctors' / 'professional-use.html').write_text('<html><main><h1>Service</h1></main></html>', encoding='utf-8')
            (root / 'for-doctors' / 'index.html').write_text('<html><main><h1>Library</h1></main></html>', encoding='utf-8')
            feed, _ = self.module.build_updates(root, '2026-08-16')
            self.assertEqual([item['id'] for item in feed], ['bacterial-keratitis'])

    def test_professional_metadata_enriches_topics_and_missing_meta_is_safe(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_material(root, 'keratitis', ru_main='<p>RU</p>', en_main='<p>EN</p>')
            write_material(root, 'misc', ru_main='<p>RU</p>', en_main='<p>EN</p>')
            meta_path = root / 'for-doctors' / 'professional-meta.json'
            meta_path.parent.mkdir(parents=True, exist_ok=True)
            meta_path.write_text(json.dumps({
                'keratitis': {'topics': ['cornea', 'research', 'cornea']}
            }), encoding='utf-8')

            feed, _ = self.module.build_updates(root, '2026-08-16')
            by_id = {item['id']: item for item in feed}
            self.assertEqual(by_id['keratitis']['topics'], ['cornea', 'research'])
            self.assertEqual(by_id['misc']['topics'], [])


if __name__ == '__main__':
    unittest.main()
