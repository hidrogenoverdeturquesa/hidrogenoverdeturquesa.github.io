"""Photographic Spanish focus-area pages; technical content stays in the home source.

The shared Energy stylesheet and manual gallery supply the Tella-inspired layout.
Stock photographs are references, never presented as HVT's field work.
"""
import html
import re

from energy_editorial import photo as energy_photo


PHOTOS = {
    'paisaje-productivo': (1600, 1199, 'Cultivos junto a un bosque tropical, vistos desde el aire', 'Mikhail Nilov', 'https://www.pexels.com/photo/aerial-view-of-agricultural-land-with-green-trees-6964930/'),
    'investigacion-biologica': (1600, 1067, 'Investigadores trabajando con bandejas de cultivo en un laboratorio', 'ThisIsEngineering', 'https://www.pexels.com/photo/scientist-in-laboratory-3912470/'),
    'territorio-urbano': (1600, 1099, 'Vista aérea del tejido urbano de Yakarta, Indonesia', 'Tom Fisk', 'https://www.pexels.com/photo/aerial-photography-of-city-2126390/'),
    'cuenca-forestal': (1600, 1063, 'Curso de agua entre vegetación, visto desde el aire en Minnesota', 'Tom Fisk', 'https://www.pexels.com/photo/aerial-photography-of-a-river-in-the-middle-of-the-forest-9708018/'),
    'arquitectura-vegetacion': (1600, 2240, 'Fachada residencial con balcones y vegetación', 'Anna Tarazevich', 'https://www.pexels.com/photo/plants-on-balconies-of-an-apartment-building-5435086/'),
}

LINES = {
    '002': {
        'slug': 'bioeconomia', 'lead': 'Bioeconomía',
        'hero': [('paisaje-productivo', 'Recursos biológicos'), ('investigacion-biologica', 'Investigación')],
        'overview': 'Recursos biológicos.<br>Procesos con valor.',
        'feature': 'investigacion-biologica', 'feature_title': 'De la materia prima<br>a una ruta de aprovechamiento.',
        'feature_copy': 'Caracterizamos residuos y biomasa para evaluar su transformación en productos útiles. Cada ruta se estudia a partir de su composición, calidad, trazabilidad y condiciones de operación.',
        'study': 'paisaje-productivo', 'study_title': 'Circularidad con criterios verificables.',
        'study_copy': 'Balances de materia, estabilidad del producto y evaluación del ciclo de vida orientan la comparación de alternativas. El aprovechamiento debe responder a una demanda y a las condiciones del lugar.',
        'projects_title': 'De los ciclos biológicos<br>al desarrollo experimental.',
        'projects_copy': 'Conoce las propuestas de aprovechamiento, los experimentos y sus conexiones con energía y hábitat.',
    },
    '003': {
        'slug': 'inteligencia-territorial', 'lead': 'Inteligencia Territorial',
        'hero': [('territorio-urbano', 'Territorio'), ('cuenca-forestal', 'Agua y paisaje')],
        'overview': 'Entender el territorio.<br>Fundamentar las decisiones.',
        'feature': 'cuenca-forestal', 'feature_title': 'Del paisaje observado<br>a la información útil.',
        'feature_copy': 'Integramos cartografía, mediciones y modelos para explorar relaciones entre recursos, infraestructura y condiciones ambientales. La escala y la incertidumbre de los datos forman parte del análisis.',
        'study': 'territorio-urbano', 'study_title': 'Medir, modelar y contrastar.',
        'study_copy': 'El diseño de experimentos, los sensores y la validación estadística permiten contrastar hipótesis y dar seguimiento al comportamiento de los sistemas.',
        'projects_title': 'Herramientas para explorar.<br>Evidencia para decidir.',
        'projects_copy': 'Accede al observatorio abierto y conoce las aplicaciones de análisis, instrumentación y modelación en los proyectos.',
    },
    '004': {
        'slug': 'infraestructura', 'lead': 'Infraestructura',
        'hero': [('arquitectura-vegetacion', 'Arquitectura'), ('paisaje-productivo', 'Hábitat y entorno')],
        'overview': 'Habitar mejor.<br>Diseñar desde el lugar.',
        'feature': 'arquitectura-vegetacion', 'feature_title': 'Vivienda, comunidad<br>y recursos conectados.',
        'feature_copy': 'El diagnóstico del lugar orienta el diseño: clima, agua, materiales, energía y necesidades de quienes lo habitan. Integramos estas condiciones en propuestas de mejoramiento y hábitat sostenible.',
        'study': 'cuenca-forestal', 'study_title': 'Agua y paisaje como parte del diseño.',
        'study_copy': 'El abastecimiento, el saneamiento y el manejo de escorrentías se evalúan junto con la topografía, la disponibilidad de recursos y las posibilidades de mantenimiento.',
        'projects_title': 'Propuestas para viviendas<br>y comunidades sostenibles.',
        'projects_copy': 'Explora cómo se conectan energía, agua, alimentos y materiales en las propuestas de esta línea.',
    },
}

PROJECT_PHOTOS = {
    '/proyecto-hidroecocaja': 'paisaje-productivo',
    '/experimentos/fibras-queratinicas-suelo/': 'investigacion-biologica',
    '/proyecto-planta-hidrogeno': 'electrolizador.jpg',
    '/proyecto-ecoaldea': 'arquitectura-vegetacion',
    '/observatorio-satelital/': 'territorio-urbano',
    '/proyecto-parque-solar': 'solar-territorio.webp',
    '/proyecto-granja-eolica': 'parque-eolico.webp',
    '/proyecto-hogares-eficientes': 'vivienda-solar.webp',
}


def photo(name, *, hero=False, attrs=''):
    if name not in PHOTOS:
        return energy_photo(name, {
            'electrolizador.jpg': 'Electrolizador expuesto en el Science Museum de Londres; referencia tecnológica',
            'solar-territorio.webp': 'Vista aérea de un parque solar; fotografía de referencia',
            'parque-eolico.webp': 'Aerogeneradores en un paisaje rural; fotografía de referencia',
            'vivienda-solar.webp': 'Viviendas con paneles solares; fotografía de referencia',
        }[name])
    width, height, alt, _, _ = PHOTOS[name]
    loading = 'fetchpriority="high" class="energy-hero__image is-active"' if hero else 'loading="lazy" decoding="async"'
    sizes = '100vw' if 'data-energy-photo' in attrs else '(max-width: 600px) 100vw, 50vw'
    return f'<img src="/images/lineas/{name}.webp" srcset="/images/lineas/{name}-800.webp 800w, /images/lineas/{name}.webp 1600w" sizes="{sizes}" width="{width}" height="{height}" alt="{alt}" {loading} {attrs}>'


def figure(name):
    _, _, alt, author, url = PHOTOS[name]
    return f'<figure>{photo(name)}<figcaption>{alt}. <a href="{url}">{author} / Pexels</a>. Referencia del sector.</figcaption></figure>'


def decorate_line_page(page, code, title, summary):
    data = LINES[code]
    panel = re.search(r'<article class="line-detail".*?</article>', page, re.S)[0]
    services = re.findall(r'<details class="line-service">.*?</details>', panel, re.S)
    if not services:
        raise ValueError(f'No services for {code}')
    services[0] = services[0].replace('<details class="line-service">', '<details class="line-service" open>', 1)
    guide = re.search(r'<p class="line-detail__guide">.*?</p>', panel, re.S)
    note = re.search(r'<p class="line-detail__note">.*?</p>', panel, re.S)
    # Keep the entire project column, including the protected-work notice and observatory.
    project_column = re.search(r'</details>\s*</div></div><div>(.*?)</div></div>\s*</article>', panel, re.S)
    if not project_column:
        raise ValueError(f'Missing project column for {code}')
    projects = project_column[1]
    used = {key for key, _ in data['hero']} | {data['feature'], data['study']}

    def decorate_projects(match):
        def card(link):
            url, attributes, content = link.groups()
            name = PROJECT_PHOTOS[url]
            used.add(name)
            return f'<a href="{url}"{attributes}><div class="energy-project__photo">{photo(name)}</div><div class="energy-project__text">{content}</div></a>'
        return '<div class="line-projects">' + re.sub(r'<a href="([^"]+)"([^>]*)>(.*?)</a>', card, match[1], flags=re.S) + '</div>'

    projects = re.sub(r'<div class="line-projects">(.*?)</div>', decorate_projects, projects, flags=re.S)
    projects = re.sub(r'<h2([^>]*)>(.*?)</h2>', r'<h3\1>\2</h3>', projects, flags=re.S)
    gallery = re.search(r'<!-- work-gallery:start -->.*?<!-- work-gallery:end -->', panel, re.S)
    fieldwork = f'<div class="line-fieldwork" id="trabajo-en-campo">{gallery[0]}</div>' if gallery else ''
    field_link = '<a href="#trabajo-en-campo">Trabajo en campo <span aria-hidden="true">↓</span></a>' if gallery else ''
    contact = re.search(r'<div class="line-page__contact">.*?</div>', page, re.S)[0]
    related = re.search(r'<nav class="line-page__related".*?</nav>', page, re.S)[0]
    hero_images, buttons = [], []
    for index, (name, label) in enumerate(data['hero']):
        credit = html.escape(f'{label} · {PHOTOS[name][3]}', quote=True)
        attrs = f'id="energy-photo-{index}" data-energy-photo data-credit="{credit}" aria-hidden="{str(index != 0).lower()}"'
        hero_images.append(photo(name, hero=index == 0, attrs=attrs))
        buttons.append(f'<button type="button" data-energy-select="{index}" aria-controls="energy-photo-{index}" aria-pressed="{str(index == 0).lower()}">{label}</button>')
    first, label = data['hero'][0]
    first_credit = f'{label} · {PHOTOS[first][3]}'
    heading = f'<span class="energy-title__lead">{data["lead"]}</span> <span class="energy-title__rest">{title[len(data["lead"]):].strip()}</span>'
    credits = ''.join(f'<li><a href="{PHOTOS[key][4]}">{PHOTOS[key][2]} — {PHOTOS[key][3]} / Pexels</a>.</li>' for key in sorted(used) if key in PHOTOS)
    reused_credits = {
        'electrolizador.jpg': '<a href="https://commons.wikimedia.org/wiki/File:Hydrogen_electrolyser_-_Science_Museum,_London.jpg">Electrolizador — The wub / Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Reducción a 960 píxeles y encuadre mediante CSS.',
        'solar-territorio.webp': '<a href="https://www.pexels.com/photo/solar-panels-on-a-green-field-4148472/">Parque solar — Red Zeppelin / Pexels</a>.',
        'parque-eolico.webp': '<a href="https://unsplash.com/photos/photo-of-wind-turbines-on-green-grass-ZYu6P9-Glic">Parque eólico — Arteum.ro / Unsplash</a>.',
        'vivienda-solar.webp': '<a href="https://unsplash.com/photos/a-house-with-a-solar-panel-on-the-roof-_ciUqT1HEuY">Vivienda solar — Vivint Solar / Unsplash</a>.',
    }
    credits += ''.join(f'<li>{reused_credits[key]}</li>' for key in sorted(used) if key in reused_credits)
    main = f'''<main>
    <section class="line-page__hero energy-hero" aria-labelledby="line-title" data-energy-gallery>
        <div class="energy-hero__media" role="region" aria-label="Fotografías de referencia de esta línea">{''.join(hero_images)}</div>
        <div class="energy-hero__inner">
            <a class="line-page__back" href="/#line-detail-{code}"><span aria-hidden="true">←</span> Volver a esta línea en el inicio</a>
            <div class="energy-hero__copy"><p class="line-page__eyebrow">Hidrógeno Verde Turquesa / Líneas de trabajo</p>
                <h1 id="line-title">{heading}</h1><a class="energy-hero__explore" href="#enfoque">Conoce esta línea <span aria-hidden="true">↓</span></a>
            </div>
            <div class="energy-hero__footer"><div class="energy-gallery-controls" aria-label="Seleccionar fotografía" hidden>{''.join(buttons)}</div>
                <p class="energy-hero__credit"><span data-energy-credit aria-live="polite">{first_credit}</span><a href="#creditos-fotograficos">Fotografías de referencia</a></p>
            </div>
        </div>
    </section>
    <section class="energy-overview energy-wrap" id="enfoque" aria-labelledby="line-overview-title">
        <div class="energy-section-heading"><div><p class="energy-kicker">Qué hacemos</p><h2 id="line-overview-title">{data['overview']}</h2></div>
            <div><p class="line-page__summary">{summary}</p><nav class="energy-chapter-nav" aria-label="Explorar esta línea"><a href="#servicios">Nuestros servicios <span aria-hidden="true">↓</span></a><a href="#proyectos">Proyectos relacionados <span aria-hidden="true">↓</span></a>{field_link}</nav></div>
        </div>
        <div class="energy-feature">{figure(data['feature'])}<div class="energy-feature__copy"><h3>{data['feature_title']}</h3><p>{data['feature_copy']}</p><a class="energy-text-link" href="#servicios">Explorar las capacidades <span aria-hidden="true">→</span></a></div></div>
    </section>
    <div class="line-page__content"><article class="line-detail" id="line-detail-{code}">
        {fieldwork}
        <div class="line-detail__layout">
            <section class="energy-services" id="servicios" aria-labelledby="line-services-title"><p class="energy-kicker">Servicios</p><h2 id="line-services-title">Capacidades de la línea.</h2>{guide[0] if guide else ''}<div class="line-detail__services">{''.join(services)}</div></section>
            <aside class="energy-study" aria-labelledby="line-study-title">{figure(data['study'])}<h3 id="line-study-title">{data['study_title']}</h3><p>{data['study_copy']}</p>{note[0] if note else ''}</aside>
            <section class="energy-projects" id="proyectos" aria-labelledby="line-projects-title"><div class="energy-section-heading"><div><p class="energy-kicker">Proyectos y aplicaciones</p><h2 id="line-projects-title">{data['projects_title']}</h2></div><p>{data['projects_copy']}</p></div>
                {projects}<p class="energy-photo-note">Fotografías de referencia de las tecnologías y contextos; no corresponden a los proyectos ni a obras ejecutadas por HVT.</p>
            </section>
        </div>
    </article>
    <details class="energy-credits" id="creditos-fotograficos"><summary>Créditos fotográficos y licencias</summary><div><p>Las fotografías de referencia ilustran los temas de la línea; las personas y las instalaciones no se presentan como equipo u obras de HVT. La sección «Así trabajamos», cuando aparece, conserva los registros propios de campo.</p><ul>{credits}</ul><p>Uso conforme a las licencias gratuitas de <a href="https://www.pexels.com/license/">Pexels</a> y <a href="https://unsplash.com/license">Unsplash</a>, y la licencia indicada para Wikimedia. Optimización web y encuadres mediante CSS.</p></div></details>
    {contact}{related}</div>
</main>'''
    page = re.sub(r'<main>.*?</main>', lambda _: main, page, count=1, flags=re.S)
    page = page.replace('class="line-page"', f'class="line-page energy-page editorial-line editorial-line--{data["slug"]}"', 1)
    page = re.sub(r'<meta (?:property="og:image(?::alt)?"|name="twitter:image(?::alt)?") content="[^"]*">\n?', '', page)
    page = page.replace('<meta name="twitter:card" content="summary">', '<meta name="twitter:card" content="summary_large_image">')
    image_url = f'https://hidrogenoverdeturquesa.com/images/lineas/{first}.webp'
    assets = f'''<link rel="stylesheet" href="/css/energy-editorial.css?v=20260927c">
<link rel="stylesheet" href="/css/lines-editorial.css?v=20260927a">
<script defer src="/js/energy-gallery.js?v=20260927c"></script>
<meta property="og:image" content="{image_url}">
<meta property="og:image:alt" content="{PHOTOS[first][2]}">
<meta name="twitter:image" content="{image_url}">
<meta name="twitter:image:alt" content="{PHOTOS[first][2]}">
'''
    page = page.replace('</head>', assets + '</head>', 1)
    return re.sub(r'[ \t]+$', '', page, flags=re.M)
