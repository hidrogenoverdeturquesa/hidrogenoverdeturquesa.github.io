"""Generate dedicated line pages from the existing expandable home sections.

Edit content in index.html (and its localized sources), never in generated
lineas/**/index.html. Run this script after a source change; --check detects drift.
No network calls or third-party dependencies are required.
"""
from __future__ import annotations

import argparse
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://hidrogenoverdeturquesa.com'
LINES = {'001': 'energia', '002': 'bioeconomia', '003': 'inteligencia-territorial', '004': 'infraestructura'}
COPY = {
    'es': ('Explorar esta línea', 'Volver a esta línea en el inicio', 'Líneas de trabajo', 'Hablemos de tu proyecto', 'Explorar todas las líneas', 'Otras líneas de trabajo'),
    'en': ('Explore this focus area', 'Back to this focus area on the home page', 'Focus areas', 'Let’s talk about your project', 'Explore all focus areas', 'Other focus areas'),
    'ru': ('Подробнее о направлении', 'Вернуться к этому направлению на главной', 'Направления работы', 'Обсудим ваш проект', 'Все направления', 'Другие направления работы'),
}


def match(pattern: str, source: str) -> re.Match:
    result = re.search(pattern, source, re.S)
    if not result:
        raise ValueError(f'Missing source element: {pattern}')
    return result


def home(locale: str) -> str:
    return '/' if locale == 'es' else f'/{locale}/'


def route(locale: str, code: str) -> str:
    return f'{home(locale)}lineas/{LINES[code]}/'


def absolute_assets(markup: str) -> str:
    return re.sub(r'((?:src|href|poster)=")(?:\.\./)*(?=(?:images|videos|css|js|fonts)/)', r'\1/', markup)


def record(source: str, code: str) -> dict:
    card = match(r'<div class="column services-item"[^>]*data-line-card="' + code + r'".*?</button>', source)[0]
    title = match(r'<span class="services-item__title">(.*?)</span>', card)[1]
    summary = match(r'<span class="services-item__summary">(.*?)</span>', card)[1]
    panel = match(r'<article class="line-detail" id="line-detail-' + code + r'".*?</article>', source)[0]
    return {'title': title, 'summary': summary, 'panel': panel}


def update_home(source: str, locale: str) -> str:
    for code in LINES:
        panel = record(source, code)['panel']
        clean = re.sub(r'\s*<div class="line-detail__explore">.*?</div>', '', panel, flags=re.S)
        head = match(r'<div class="line-detail__head">.*?</button></div>', clean)[0]
        link = f'\n                <div class="line-detail__explore"><a href="{route(locale, code)}">{COPY[locale][0]} <span aria-hidden="true">→</span></a></div>'
        source = source.replace(panel, clean.replace(head, head + link, 1), 1)
    if 'css/service-pages.css' not in source:
        prefix = '' if locale == 'es' else '../'
        source = source.replace('</head>', f'<link rel="stylesheet" href="{prefix}css/service-pages.css?v=20260913a">\n</head>', 1)
    source = re.sub(r'js/main\.js\?v=[^"\s]+', 'js/main.js?v=service-pages-20260913a', source)
    return source


def render(source: str, locale: str, code: str) -> str:
    data = record(source, code)
    explore, back, label, contact, all_lines, other = COPY[locale]
    title, summary = data['title'], data['summary']
    canonical = ORIGIN + route(locale, code)
    esc = lambda value: html.escape(html.unescape(value), quote=True)
    header = match(r'<header class="s-header">.*?</header>', source)[0]
    header = header.replace('<li class="current">', '<li>')
    header = re.sub(r'href="#([^"]+)"', lambda m: f'href="{home(locale)}#{m[1]}"', header)
    for lang in COPY:
        header = re.sub(r'<a href="[^"]*" hreflang="' + lang + '"', f'<a href="{route(lang, code)}" hreflang="{lang}"', header)
    footer = match(r'<footer class="s-footer">.*?</footer>', source)[0]
    panel = re.sub(r'<div class="line-detail__head">.*?</button></div>', '', data['panel'], count=1, flags=re.S)
    panel = re.sub(r'\s*<div class="line-detail__explore">.*?</div>', '', panel, flags=re.S)
    panel = panel.replace(' tabindex="-1" hidden', '').replace('<h4', '<h2').replace('</h4>', '</h2>')
    panel = panel.replace('href="#contact"', f'href="{home(locale)}#contact"')
    dialog = ''
    image_metadata = ''
    if 'data-work-gallery' in panel:
        dialog = match(r'<dialog class="work-gallery__viewer".*?</dialog>', source)[0]
        image = match(r'<img src="([^"]+)" alt="([^"]*)"', panel)
        image_url = ORIGIN + '/' + re.sub(r'^(?:\.\./)+', '', image[1]).lstrip('/')
        image_metadata = f'<meta property="og:image" content="{image_url}">\n<meta property="og:image:alt" content="{image[2]}">\n<meta name="twitter:image" content="{image_url}">\n<meta name="twitter:image:alt" content="{image[2]}">'
    links = ''.join(f'<a href="{route(locale, key)}"><span>{record(source, key)["title"]}</span><span aria-hidden="true">→</span></a>' for key in LINES if key != code)
    alternatives = '\n'.join(f'<link rel="alternate" hreflang="{lang}" href="{ORIGIN + route(lang, code)}">' for lang in COPY)
    result = f'''<!DOCTYPE html>
<!-- Generated by tools/build_service_pages.py from the home page. -->
<html class="no-js" lang="{locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{title} | Hidrógeno Verde Turquesa</title>
<meta name="description" content="{esc(summary)}">
<link rel="canonical" href="{canonical}">
{alternatives}
<link rel="alternate" hreflang="x-default" href="{ORIGIN + route('es', code)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hidrógeno Verde Turquesa">
<meta property="og:url" content="{canonical}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(summary)}">
<meta name="twitter:card" content="{'summary_large_image' if image_metadata else 'summary'}">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(summary)}">
{image_metadata}
<link rel="stylesheet" href="/css/styles.css?v=mobile-navigation-20260828a">
<link rel="stylesheet" href="/css/vendor.css?v=sin-prism-20260726">
<link rel="stylesheet" href="/css/work-gallery.css?v=20260914b">
<link rel="stylesheet" href="/css/service-pages.css?v=20260913a">
<link rel="icon" href="/favicon.ico">
<script src="/js/modernizr.js"></script>
<script defer src="/js/fontawesome/all.min.js"></script>
</head>
<body id="top" class="line-page">
{header}
<main>
    <div class="line-page__hero">
        <a class="line-page__back" href="{home(locale)}#line-detail-{code}"><span aria-hidden="true">←</span> {back}</a>
        <p class="line-page__eyebrow">{label}</p>
        <h1>{title}</h1>
        <p class="line-page__summary">{summary}</p>
    </div>
    <div class="line-page__content">
        {panel}
        <div class="line-page__contact"><a href="{home(locale)}#contact">{contact} →</a><a href="{home(locale)}#services">{all_lines} →</a></div>
        <nav class="line-page__related" aria-labelledby="other-lines-title"><h2 id="other-lines-title">{other}</h2><div class="line-page__related-links">{links}</div></nav>
    </div>
</main>
{footer}
{dialog}
<script src="/js/jquery-3.7.1.min.js"></script>
<script src="/js/plugins.js?v=sin-prism-20260726"></script>
<script src="/js/main.js?v=service-pages-20260913a"></script>
<script src="/js/work-gallery.js?v=20260914b"></script>
</body>
</html>
'''
    return absolute_assets(result)


def build_all(check: bool = False) -> None:
    outputs = {}
    for locale in COPY:
        path = ROOT / home(locale).lstrip('/') / 'index.html'
        source = update_home(path.read_text(encoding='utf-8'), locale)
        outputs[path] = source
        for code in LINES:
            outputs[ROOT / route(locale, code).lstrip('/') / 'index.html'] = render(source, locale, code)
    sitemap = ROOT / 'sitemap.xml'
    xml = re.sub(r'\s*<!-- service-pages:start -->.*?<!-- service-pages:end -->', '', sitemap.read_text(encoding='utf-8'), flags=re.S)
    entries = '\n'.join(f'  <url><loc>{ORIGIN + route(locale, code)}</loc><priority>0.8</priority></url>' for locale in COPY for code in LINES)
    outputs[sitemap] = xml.replace('</urlset>', f'  <!-- service-pages:start -->\n{entries}\n  <!-- service-pages:end -->\n</urlset>')
    stale = []
    for path, output in outputs.items():
        previous = path.read_text(encoding='utf-8') if path.exists() else None
        if previous == output:
            continue
        if check:
            stale.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(output, encoding='utf-8', newline='\n')
    if stale:
        raise SystemExit('Regenerate service pages: ' + ', '.join(stale))
    print('Service pages: 4 lines × 3 languages synchronized.' if not check else 'Service pages match their sources.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    build_all(parser.parse_args().check)
