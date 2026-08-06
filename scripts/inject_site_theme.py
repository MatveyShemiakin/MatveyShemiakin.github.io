#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITEMAP = ROOT / "sitemap.xml"
HEAD_ASSETS = (
    '<script src="/site-theme-init.js?v=20260806-1"></script>'
    '<link rel="stylesheet" href="/site-theme.css?v=20260806-1">'
)
BODY_ASSET = '<script defer src="/site-theme.js?v=20260806-1"></script>'


def public_html_paths() -> list[Path]:
    tree = ET.parse(SITEMAP)
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    paths: list[Path] = []
    for loc in tree.findall("sm:url/sm:loc", namespace):
        parsed = urlparse(loc.text or "")
        path = parsed.path
        if path == "/":
            local = ROOT / "index.html"
        elif path.endswith("/"):
            local = ROOT / path.lstrip("/") / "index.html"
        else:
            local = ROOT / path.lstrip("/")
        paths.append(local)
    return paths


def inject_once(text: str, marker: str, payload: str, closing_tag: str) -> str:
    if marker in text:
        return text
    index = text.lower().rfind(closing_tag.lower())
    if index < 0:
        raise ValueError(f"Missing {closing_tag}")
    return text[:index] + payload + text[index:]


def update_public_html() -> None:
    paths = public_html_paths()
    if len(paths) != 27:
        raise RuntimeError(f"Expected 27 public pages, found {len(paths)}")

    for path in paths:
        if not path.exists():
            raise FileNotFoundError(path)
        text = path.read_text(encoding="utf-8")
        text = inject_once(text, "/site-theme-init.js?v=20260806-1", HEAD_ASSETS, "</head>")
        text = inject_once(text, "/site-theme.js?v=20260806-1", BODY_ASSET, "</body>")

        relative = path.relative_to(ROOT).as_posix()
        if relative == "for-doctors/bacterial-keratitis/index.html":
            text = re.sub(
                r"<body(?:\s+class=\"([^\"]*)\")?\s*>",
                lambda match: '<body class="' + (
                    (match.group(1) + " ") if match.group(1) else ""
                ) + 'bacterial-clinical-page">',
                text,
                count=1,
                flags=re.IGNORECASE,
            )
            text = text.replace("bacterial-clinical-page bacterial-clinical-page", "bacterial-clinical-page")

        path.write_text(text, encoding="utf-8")


def bridge_iol_theme() -> None:
    path = ROOT / "patients/iol-dislocation/script.js"
    text = path.read_text(encoding="utf-8")
    text = text.replace("const themeKey='iol_dislocation_theme';", "const themeKey='site_theme_v1';", 1)
    text = text.replace("function setTheme(theme){", "function setTheme(theme,persist=true){", 1)
    text = text.replace(
        "try{localStorage.setItem(themeKey,dark?'dark':'light')}catch(error){}",
        "if(persist){try{localStorage.setItem(themeKey,dark?'dark':'light')}catch(error){}}\n"
        "    document.documentElement.dataset.siteTheme=dark?'dark':'light';\n"
        "    document.documentElement.dataset.theme=dark?'dark':'light';",
        1,
    )
    text = text.replace(
        "let storedTheme='light';\n  try{storedTheme=localStorage.getItem(themeKey)||'light'}catch(error){}\n  setTheme(storedTheme);",
        "let storedTheme=document.documentElement.dataset.siteTheme||'light';\n"
        "  try{storedTheme=document.documentElement.dataset.siteTheme||localStorage.getItem(themeKey)||'light'}catch(error){}\n"
        "  setTheme(storedTheme,false);\n"
        "  window.addEventListener('site-theme-change',event=>setTheme(event.detail&&event.detail.theme?event.detail.theme:'light',false));",
        1,
    )
    path.write_text(text, encoding="utf-8")


def bridge_pkp_theme() -> None:
    for relative in (
        "for-doctors/penetrating-keratoplasty/index.html",
        "en/for-doctors/penetrating-keratoplasty/index.html",
    ):
        path = ROOT / relative
        text = path.read_text(encoding="utf-8")
        text = text.replace(
            "try { storedTheme = localStorage.getItem('skp-theme'); } catch (_) {}",
            "try { storedTheme = localStorage.getItem('site_theme_v1') || localStorage.getItem('skp-theme'); } catch (_) {}",
            1,
        )
        text = text.replace(
            "const initial = storedTheme || (systemDark ? 'dark' : 'light');",
            "const initial = root.dataset.siteTheme || storedTheme || (systemDark ? 'dark' : 'light');",
            1,
        )
        text = text.replace(
            "root.dataset.theme = theme;",
            "root.dataset.theme = theme;\n    root.dataset.siteTheme = theme;",
            1,
        )
        text = text.replace(
            "try { localStorage.setItem('skp-theme', next); } catch (_) {}",
            "try { localStorage.setItem('site_theme_v1', next); localStorage.setItem('skp-theme', next); } catch (_) {}",
            1,
        )
        path.write_text(text, encoding="utf-8")


def compile_bacterial_theme() -> None:
    target = ROOT / "site-theme.css"
    base = target.read_text(encoding="utf-8").rstrip()
    marker = "/* BACTERIAL_THEME_CONTRAST_BUNDLE */"
    if marker in base:
        base = base.split(marker, 1)[0].rstrip()
    chunks = [base, marker]
    for name in (
        "bacterial-theme-contrast-v14-1.css",
        "bacterial-theme-contrast-v14-2.css",
        "bacterial-theme-contrast-v14-3.css",
    ):
        chunks.append((ROOT / name).read_text(encoding="utf-8").strip())
    target.write_text("\n\n".join(chunks) + "\n", encoding="utf-8")


def main() -> None:
    compile_bacterial_theme()
    update_public_html()
    bridge_iol_theme()
    bridge_pkp_theme()


if __name__ == "__main__":
    main()
