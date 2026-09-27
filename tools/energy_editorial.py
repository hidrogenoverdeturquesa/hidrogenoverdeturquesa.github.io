"""Energy landing: Tella's photographic scale, using HVT's existing design language."""
import re

PHOTO_ROOT = '/images/energia/'


def photo(name: str, alt: str, *, hero: bool = False, attrs: str = '') -> str:
    dimensions = {
        'solar-territorio.webp': (1600, 1200),
        'parque-eolico.webp': (1600, 1060),
        'vivienda-solar.webp': (1200, 800),
        'inspeccion-solar.webp': (1200, 800),
        'electrolizador.jpg': (960, 1275),
    }
    width, height = dimensions[name]
    loading = 'fetchpriority="high" class="energy-hero__image is-active"' if hero else 'loading="lazy" decoding="async"'
    responsive = ''
    if name == 'solar-territorio.webp':
        sizes = '100vw' if 'data-energy-photo' in attrs else '(max-width: 600px) 100vw, 50vw'
        responsive = f' srcset="{PHOTO_ROOT}solar-territorio-800.webp 800w, {PHOTO_ROOT}solar-territorio.webp 1600w" sizes="{sizes}"'
    return f'<img src="{PHOTO_ROOT}{name}"{responsive} width="{width}" height="{height}" alt="{alt}" {loading} {attrs}>'


def decorate_energy_page(page: str, title: str, summary: str) -> str:
    heading = title.replace('Energía y ', '<span class="energy-title__lead">Energía</span> <span class="energy-title__rest">y ', 1) + '</span>'
    guide = re.search(r'<p class="line-detail__guide">.*?</p>', page, re.S)[0]
    services = re.findall(r'<details class="line-service">.*?</details>', page, re.S)
    if not services:
        raise ValueError('Energy source has no service details')
    services[0] = services[0].replace('<details class="line-service">', '<details class="line-service" open>', 1)
    service_html = '\n'.join(services)
    project_source = re.search(r'<div class="line-projects">(.*?)</div>', page, re.S)[1]
    images = {
        '/proyecto-planta-hidrogeno': ('electrolizador.jpg', 'Electrolizador expuesto en el Science Museum de Londres'),
        '/proyecto-parque-solar': ('solar-territorio.webp', 'Parque solar visto desde el aire'),
        '/proyecto-granja-eolica': ('parque-eolico.webp', 'Aerogeneradores en un paisaje rural'),
        '/proyecto-hogares-eficientes': ('vivienda-solar.webp', 'Cubiertas de viviendas con paneles solares'),
    }
    projects = []
    for url, content in re.findall(r'<a href="([^"]+)">(.*?)</a>', project_source, re.S):
        image, alt = images[url]
        projects.append(f'<a href="{url}"><div class="energy-project__photo">{photo(image, alt)}</div><div class="energy-project__text">{content}</div></a>')
    project_html = '\n'.join(projects)
    contact = re.search(r'<div class="line-page__contact">.*?</div>', page, re.S)[0]
    related = re.search(r'<nav class="line-page__related".*?</nav>', page, re.S)[0]

    main = f'''<main>
    <section class="line-page__hero energy-hero" aria-labelledby="energy-title" data-energy-gallery>
        <div class="energy-hero__media" role="region" aria-label="Fotografías de energías renovables">
            {photo('parque-eolico.webp', 'Aerogeneradores en un campo bajo el cielo, fotografía de Arteum.ro', hero=True, attrs='id="energy-photo-0" data-energy-photo data-credit="Eólica · Arteum.ro"')}
            {photo('solar-territorio.webp', 'Vista aérea de paneles solares en Rockbeare, fotografía de Red Zeppelin', attrs='id="energy-photo-1" data-energy-photo data-credit="Solar · Red Zeppelin" aria-hidden="true"')}
            {photo('inspeccion-solar.webp', 'Inspección de una instalación solar, fotografía de Gustavo Fring', attrs='id="energy-photo-2" data-energy-photo data-credit="Trabajo técnico · Gustavo Fring" aria-hidden="true"')}
        </div>
        <div class="energy-hero__inner">
            <a class="line-page__back" href="/#line-detail-001"><span aria-hidden="true">←</span> Volver a esta línea en el inicio</a>
            <div class="energy-hero__copy">
                <p class="line-page__eyebrow">Hidrógeno Verde Turquesa / Líneas de trabajo</p>
                <h1 id="energy-title">{heading}</h1>
                <a class="energy-hero__explore" href="#enfoque">Conoce esta línea <span aria-hidden="true">↓</span></a>
            </div>
            <div class="energy-hero__footer">
                <div class="energy-gallery-controls" aria-label="Seleccionar fotografía" hidden>
                    <button type="button" data-energy-select="0" aria-controls="energy-photo-0" aria-pressed="true">Eólica</button>
                    <button type="button" data-energy-select="1" aria-controls="energy-photo-1" aria-pressed="false">Solar</button>
                    <button type="button" data-energy-select="2" aria-controls="energy-photo-2" aria-pressed="false">Trabajo técnico</button>
                </div>
                <p class="energy-hero__credit"><span data-energy-credit aria-live="polite">Eólica · Arteum.ro</span><a href="#creditos-fotograficos">Fotografías de referencia</a></p>
            </div>
        </div>
    </section>

    <section class="energy-overview energy-wrap" id="enfoque" aria-labelledby="energy-overview-title">
        <div class="energy-section-heading">
            <div><p class="energy-kicker">Qué hacemos</p><h2 id="energy-overview-title">Investigación y diseño<br>de sistemas energéticos.</h2></div>
            <div><p class="line-page__summary">{summary}</p><nav class="energy-chapter-nav" aria-label="Explorar esta línea"><a href="#servicios">Nuestros servicios <span aria-hidden="true">↓</span></a><a href="#proyectos">Proyectos relacionados <span aria-hidden="true">↓</span></a></nav></div>
        </div>
        <div class="energy-feature">
            <figure>{photo('inspeccion-solar.webp', 'Profesionales revisando documentación frente a paneles solares; fotografía de referencia del sector')}<figcaption>Inspección fotovoltaica. Gustavo Fring / Pexels.</figcaption></figure>
            <div class="energy-feature__copy"><h3>Del estudio del recurso<br>al diseño del sistema.</h3><p>Evaluamos la demanda, las condiciones del lugar y las alternativas de generación, conversión y almacenamiento.</p><p>El trabajo combina formulación de proyectos, desarrollo experimental e instrumentación para verificar el desempeño.</p><a class="energy-text-link" href="#servicios">Explorar las capacidades <span aria-hidden="true">→</span></a></div>
        </div>
    </section>

    <div class="line-page__content">
        <article class="line-detail" id="line-detail-001">
            <div class="line-detail__layout">
                <section class="energy-services" id="servicios" aria-labelledby="energy-services-title">
                    <p class="energy-kicker">Servicios</p><h2 id="energy-services-title">Capacidades de la línea.</h2>
                    {guide}<div class="line-detail__services">{service_html}</div>
                </section>
                <aside class="energy-study" aria-labelledby="energy-study-title">
                    <figure>{photo('electrolizador.jpg', 'Electrolizador de hidrógeno expuesto en el Science Museum de Londres; referencia tecnológica')}<figcaption>Electrolizador · Science Museum, Londres.<br><a href="https://commons.wikimedia.org/wiki/File:Hydrogen_electrolyser_-_Science_Museum,_London.jpg">The wub</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</figcaption></figure>
                    <h3 id="energy-study-title">Hidrógeno y conversión energética.</h3><p>Investigamos rutas de producción, acondicionamiento y uso del hidrógeno, con balances de masa y energía y criterios de seguridad.</p>
                </aside>
                <section class="energy-projects" id="proyectos" aria-labelledby="energy-projects-title">
                    <div class="energy-section-heading"><div><p class="energy-kicker">Portafolio de proyectos</p><h2 id="energy-projects-title">Conoce los proyectos<br>de esta línea.</h2></div><p>Explora los diseños, los fundamentos técnicos y los cuadernillos que acompañan cada proyecto.</p></div>
                    <div class="line-projects">{project_html}</div>
                    <p class="energy-photo-note">Fotografías de referencia de las tecnologías; no corresponden a obras ejecutadas por HVT.</p>
                </section>
            </div>
        </article>
        <details class="energy-credits" id="creditos-fotograficos"><summary>Créditos fotográficos y licencias</summary><div>
            <p>Las fotografías son referencias del sector; las personas y las instalaciones no se presentan como equipo u obras de HVT.</p>
            <ul>
                <li>Solar: <a href="https://www.pexels.com/photo/solar-panels-on-a-green-field-4148472/">Red Zeppelin / Pexels</a>.</li>
                <li>Eólica: <a href="https://unsplash.com/photos/photo-of-wind-turbines-on-green-grass-ZYu6P9-Glic">Arteum.ro / Unsplash</a>.</li>
                <li>Vivienda solar: <a href="https://unsplash.com/photos/a-house-with-a-solar-panel-on-the-roof-_ciUqT1HEuY">Vivint Solar / Unsplash</a>.</li>
                <li>Inspección fotovoltaica: <a href="https://www.pexels.com/photo/electricians-inspecting-the-solar-panels-4254169/">Gustavo Fring / Pexels</a>.</li>
                <li>Electrolizador: <a href="https://commons.wikimedia.org/wiki/File:Hydrogen_electrolyser_-_Science_Museum,_London.jpg">The wub / Wikimedia Commons</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Reducción de Wikimedia a 960 píxeles y encuadre de presentación mediante CSS.</li>
            </ul><p>Fotografías usadas conforme a las licencias gratuitas de <a href="https://www.pexels.com/license/">Pexels</a> y <a href="https://unsplash.com/license">Unsplash</a>. Archivos optimizados y encuadres adaptados para la web.</p>
        </div></details>
        {contact}
        {related}
    </div>
</main>'''
    page = re.sub(r'<main>.*?</main>', lambda _: main, page, count=1, flags=re.S)
    page = page.replace('class="line-page"', 'class="line-page energy-page"', 1)
    page = page.replace('</head>', '<link rel="stylesheet" href="/css/energy-editorial.css?v=20260927c">\n<script defer src="/js/energy-gallery.js?v=20260927c"></script>\n</head>', 1)
    page = page.replace('<meta name="twitter:card" content="summary">', '<meta name="twitter:card" content="summary_large_image">')
    image_url = 'https://hidrogenoverdeturquesa.com' + PHOTO_ROOT + 'parque-eolico.webp'
    page = page.replace('</head>', f'<meta property="og:image" content="{image_url}">\n<meta property="og:image:alt" content="Parque eólico; fotografía de referencia de Arteum.ro">\n<meta name="twitter:image" content="{image_url}">\n</head>', 1)
    return re.sub(r'[ \t]+$', '', page, flags=re.M)
