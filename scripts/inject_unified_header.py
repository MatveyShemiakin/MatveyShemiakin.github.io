from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_HREF = '/site-header-unified.css?v=20260826-1'
JS_SRC = '/site-header-unified.js?v=20260826-1'
CSS_TAG = f'<link rel="stylesheet" href="{CSS_HREF}">'
JS_TAG = f'<script defer src="{JS_SRC}"></script>'

EXCLUDED_PARTS = {'.git', '.github', 'tests', 'docs', '.worktrees', 'worktrees'}


def inject_unified_header(text: str) -> str:
    if '</head>' not in text or '</body>' not in text:
        return text

    result = text
    if CSS_HREF not in result:
        result = result.replace('</head>', CSS_TAG + '</head>', 1)
    if JS_SRC not in result:
        result = result.replace('</body>', JS_TAG + '</body>', 1)
    return result


def is_public_html(path: Path) -> bool:
    try:
        relative = path.relative_to(ROOT)
    except ValueError:
        return False
    return not any(part in EXCLUDED_PARTS for part in relative.parts)


def inject_repository(root: Path = ROOT) -> list[Path]:
    changed = []
    for path in sorted(root.rglob('*.html')):
        if not is_public_html(path):
            continue
        original = path.read_text(encoding='utf-8')
        updated = inject_unified_header(original)
        if updated != original:
            path.write_text(updated, encoding='utf-8')
            changed.append(path)
    return changed


if __name__ == '__main__':
    changed = inject_repository()
    print(f'Unified header assets injected into {len(changed)} public HTML files')
