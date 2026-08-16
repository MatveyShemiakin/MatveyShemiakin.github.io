from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'patients' / 'index.html'
CSS_LINK = '<link rel="stylesheet" href="/patients/patients-updates.css?v=20260816-1">'
JS_SCRIPT = '<script defer src="/patients/patients-updates.js?v=20260816-1"></script>'
SHELL = '''<div class="patient-updates" id="patient-updates"><button class="patient-updates-toggle" id="patient-updates-toggle" type="button" aria-expanded="false" aria-controls="patient-updates-panel" aria-label="Что нового"><span class="patient-updates-bell" aria-hidden="true"></span><span class="patient-updates-count" id="patient-updates-count" hidden>0</span></button><section class="patient-updates-panel" id="patient-updates-panel" aria-labelledby="patient-updates-title" hidden><div class="patient-updates-head"><div><span>Обновления</span><h2 id="patient-updates-title">Что нового</h2></div><button class="patient-updates-mark-all" id="patient-updates-mark-all" type="button">Прочитать всё</button></div><div class="patient-updates-list" id="patient-updates-list" aria-live="polite"></div></section></div>'''


def inject_patient_updates(text: str) -> str:
    text = re.sub(r'<link\s+rel="stylesheet"\s+href="/patients/patients-updates\.css(?:\?v=[^"]*)?">', CSS_LINK, text)
    if '/patients/patients-updates.css' not in text and '</head>' in text:
        text = text.replace('</head>', CSS_LINK + '</head>', 1)

    if 'id="patient-updates"' not in text:
        marker = re.search(r'<div\s+class="patient-language-switch"(?=[\s>])', text)
        if marker:
            text = text[:marker.start()] + SHELL + text[marker.start():]

    text = re.sub(r'<script\s+defer\s+src="/patients/patients-updates\.js(?:\?v=[^"]*)?"></script>', JS_SCRIPT, text)
    if '/patients/patients-updates.js' not in text and '</body>' in text:
        text = text.replace('</body>', JS_SCRIPT + '</body>', 1)
    return text


def main() -> None:
    if not TARGET.exists():
        print('Patient hub not found')
        return
    original = TARGET.read_text(encoding='utf-8')
    updated = inject_patient_updates(original)
    if updated == original:
        print('No patient updates changes required')
        return
    TARGET.write_text(updated, encoding='utf-8')
    print('patients/index.html')


if __name__ == '__main__':
    main()
