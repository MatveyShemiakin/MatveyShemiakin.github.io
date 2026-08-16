from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
TELEGRAM = 'https://t.me/ShemMYu'
TARGETS = {
    'patients/glaucoma/index.html': 'Нужна индивидуальная оценка тактики лечения?',
    'patients/cataract/index.html': 'Нужно определить оптимальную тактику лечения катаракты?',
    'patients/iol-dislocation/index.html': 'Нужно определить, можно ли сохранить и зафиксировать ИОЛ или потребуется её замена?',
    'en/patients/glaucoma/index.html': 'Do you need an individual assessment of your treatment strategy?',
    'en/patients/cataract/index.html': 'Do you need to determine the most appropriate cataract treatment strategy?',
    'en/patients/iol-dislocation/index.html': 'Do you need to determine whether the IOL can be preserved and stabilised or should be exchanged?',
}


class PatientConsultationCtaTests(unittest.TestCase):
    def test_all_target_pages_have_one_consultation_cta(self):
        for relative, heading in TARGETS.items():
            with self.subTest(relative=relative):
                text = (ROOT / relative).read_text(encoding='utf-8')
                self.assertEqual(text.count('data-patient-consultation-cta="true"'), 1)
                self.assertIn(heading, text)
                self.assertIn(f'href="{TELEGRAM}"', text)
                self.assertIn('target="_blank"', text)
                self.assertIn('rel="noopener"', text)
                self.assertIn('data-analytics-cta', text)
                self.assertEqual(text.count('/patients/consultation-cta.css'), 1)

    def test_glaucoma_legacy_contact_cta_is_removed(self):
        ru = (ROOT / 'patients/glaucoma/index.html').read_text(encoding='utf-8')
        en = (ROOT / 'en/patients/glaucoma/index.html').read_text(encoding='utf-8')
        self.assertNotIn('form action="https://matveyshemyakin.ru/#contacts"', ru)
        self.assertNotIn('Перейти к контактам', ru)
        self.assertNotIn('form action="https://matveyshemyakin.ru/en/#contacts"', en)
        self.assertNotIn('Go to contacts', en)

    def test_cta_stylesheet_contains_mobile_and_dark_support(self):
        css = (ROOT / 'patients/consultation-cta.css').read_text(encoding='utf-8')
        self.assertIn('@media(max-width:680px)', css)
        self.assertIn('data-site-theme="dark"', css)
        self.assertIn('.consultation-cta-link', css)
        self.assertIn('.patient-consultation-card', css)


if __name__ == '__main__':
    unittest.main()
