from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CSS_LINK = '<link rel="stylesheet" href="/patients/consultation-cta.css?v=20260816-1">'
START = '<!-- patient-consultation-cta:start -->'
END = '<!-- patient-consultation-cta:end -->'
TELEGRAM = 'https://t.me/ShemMYu'

TARGETS = {
    'patients/glaucoma/index.html': {
        'layout': 'sim',
        'label': 'Очная консультация',
        'heading': 'Нужна индивидуальная оценка тактики лечения?',
        'body': 'Решение зависит от типа глаукомы, стадии заболевания, состояния зрительного нерва, поля зрения и достигнутого внутриглазного давления.',
        'button': 'Написать в Telegram',
    },
    'patients/cataract/index.html': {
        'layout': 'cataract',
        'label': 'Очная консультация',
        'heading': 'Нужно определить оптимальную тактику лечения катаракты?',
        'body': 'Срок операции, выбор интраокулярной линзы и объём вмешательства зависят от выраженности катаракты, состояния роговицы, сетчатки и зрительного нерва, сопутствующих заболеваний и зрительных задач пациента.',
        'button': 'Написать в Telegram',
    },
    'patients/iol-dislocation/index.html': {
        'layout': 'sim',
        'label': 'Очная консультация',
        'heading': 'Нужно определить, можно ли сохранить и зафиксировать ИОЛ или потребуется её замена?',
        'body': 'Тактика зависит от положения и модели ИОЛ, сохранности капсульной и связочной опоры, состояния роговицы, стекловидного тела, сетчатки и внутриглазного давления. Окончательное решение принимается после очного обследования.',
        'button': 'Написать в Telegram',
    },
    'en/patients/glaucoma/index.html': {
        'layout': 'sim',
        'label': 'In-person consultation',
        'heading': 'Do you need an individual assessment of your treatment strategy?',
        'body': 'Management depends on the type and stage of glaucoma, the condition of the optic nerve, visual-field findings and the intraocular pressure achieved.',
        'button': 'Message me on Telegram',
    },
    'en/patients/cataract/index.html': {
        'layout': 'cataract',
        'label': 'In-person consultation',
        'heading': 'Do you need to determine the most appropriate cataract treatment strategy?',
        'body': 'The timing of surgery, choice of intraocular lens and scope of treatment depend on cataract severity, the condition of the cornea, retina and optic nerve, associated eye disease and the patient’s visual needs.',
        'button': 'Message me on Telegram',
    },
    'en/patients/iol-dislocation/index.html': {
        'layout': 'sim',
        'label': 'In-person consultation',
        'heading': 'Do you need to determine whether the IOL can be preserved and stabilised or should be exchanged?',
        'body': 'Management depends on the IOL position and model, remaining capsular and zonular support, and the condition of the cornea, vitreous, retina and intraocular pressure. The final strategy is determined after an in-person examination.',
        'button': 'Message me on Telegram',
    },
}


def build_cta(config: dict) -> str:
    if config['layout'] == 'cataract':
        return (
            f'{START}<section class="patient-consultation-cta" data-patient-consultation-cta="true">'
            '<div class="container"><div class="patient-consultation-card"><div>'
            f'<p class="section-kicker">{config["label"]}</p>'
            f'<h2>{config["heading"]}</h2><p>{config["body"]}</p></div>'
            f'<a class="button primary patient-consultation-link" href="{TELEGRAM}" target="_blank" rel="noopener" data-analytics-cta>'
            f'{config["button"]} <span aria-hidden="true">→</span></a>'
            f'</div></div></section>{END}'
        )

    return (
        f'{START}<div class="section-next consultation-cta" data-patient-consultation-cta="true"><div>'
        f'<span>{config["label"]}</span><h3>{config["heading"]}</h3><p>{config["body"]}</p></div>'
        f'<a class="consultation-cta-link" href="{TELEGRAM}" target="_blank" rel="noopener" data-analytics-cta>'
        f'{config["button"]} <b aria-hidden="true">→</b></a></div>{END}'
    )


def strip_existing_cta(text: str) -> str:
    text = re.sub(
        re.escape(START) + r'.*?' + re.escape(END),
        '',
        text,
        flags=re.DOTALL,
    )
    # Remove the legacy glaucoma CTA that routed to the home-page contacts block.
    text = re.sub(
        r'<div class="section-next"><div><span>(?:Очная консультация|In-person consultation)</span>.*?'
        r'<form action="https://matveyshemyakin\.ru/(?:en/)?#contacts" method="get">.*?</form></div>',
        '',
        text,
        flags=re.DOTALL,
    )
    return text


def inject_stylesheet(text: str) -> str:
    text = re.sub(
        r'<link\s+rel="stylesheet"\s+href="/patients/consultation-cta\.css(?:\?v=[^"]*)?">',
        CSS_LINK,
        text,
    )
    if '/patients/consultation-cta.css' not in text and '</head>' in text:
        text = text.replace('</head>', CSS_LINK + '</head>', 1)
    return text


def inject_cta(text: str, config: dict) -> str:
    text = strip_existing_cta(text)
    text = inject_stylesheet(text)
    cta = build_cta(config)
    marker = '<section class="author-section"' if config['layout'] == 'cataract' else '<section class="author"'
    position = text.find(marker)
    if position == -1:
        raise ValueError(f'Author marker not found: {marker}')
    return text[:position] + cta + text[position:]


def main() -> None:
    changed = []
    for relative, config in TARGETS.items():
        path = ROOT / relative
        if not path.exists():
            raise FileNotFoundError(relative)
        original = path.read_text(encoding='utf-8')
        updated = inject_cta(original, config)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            changed.append(relative)
    print('\n'.join(changed) if changed else 'No patient consultation CTA changes required')


if __name__ == '__main__':
    main()
