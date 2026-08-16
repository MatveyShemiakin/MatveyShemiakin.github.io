import importlib.util
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).parents[1]
SCRIPT=ROOT/'scripts'/'inject_patient_updates.py'
spec=importlib.util.spec_from_file_location('inject_patient_updates',SCRIPT)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PatientUpdatesTests(unittest.TestCase):
    def test_injects_shell_assets_once_without_inline_styles(self):
        source='''<!doctype html><html><head></head><body><header class="patient-header"><div class="container header-row"><a class="monogram">МШ</a><nav></nav><div class="patient-language-switch"></div><a class="back-link"></a></div></header></body></html>'''
        once=module.inject_patient_updates(source)
        twice=module.inject_patient_updates(once)
        self.assertEqual(once,twice)
        self.assertEqual(once.count('id="patient-updates"'),1)
        self.assertEqual(once.count('/patients/patients-updates.css?v=20260816-1'),1)
        self.assertEqual(once.count('/patients/patients-updates.js?v=20260816-1'),1)
        self.assertNotIn('style=',once)
        for token in ('aria-expanded="false"','id="patient-updates-count"','id="patient-updates-panel"','id="patient-updates-list"','id="patient-updates-mark-all"'):
            self.assertIn(token,once)

    def test_feed_has_unique_ids_valid_dates_and_local_patient_urls(self):
        data=json.loads((ROOT/'patients'/'updates.json').read_text(encoding='utf-8'))
        self.assertGreater(len(data),0)
        ids=[item['id'] for item in data]
        self.assertEqual(len(ids),len(set(ids)))
        for item in data:
            self.assertRegex(item['published'],r'^\d{4}-\d{2}-\d{2}$')
            self.assertTrue(item['title'].strip())
            self.assertTrue(item['description'].strip())
            self.assertTrue(item['url'].startswith('/patients/'))
            self.assertNotIn('glaucoma',item['url'])

    def test_component_css_exists_and_contains_responsive_panel(self):
        css=(ROOT/'patients'/'patients-updates.css').read_text(encoding='utf-8')
        for selector in ('.patient-updates-toggle','.patient-updates-panel','.patient-update-item','@media(max-width:900px)'):
            self.assertIn(selector,css)
        self.assertNotIn('javascript:',css)

if __name__=='__main__':
    unittest.main()
