"""Synchronize the primary navigation across the static HVT pages."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {"prueba-cuadernillo-latex.html"}
ASSET_VERSION = "navigation-20260816"


LOCALES = {
    "es": {
        "home": "Inicio", "work": "Qué hacemos", "lines": "Líneas de trabajo",
        "projects": "Proyectos", "knowledge": "Conocimiento", "library": "Biblioteca",
        "laboratory": "Laboratorio HVT", "ecosystem": "Ecosistema", "foundation": "Fundación",
        "support": "Apoyar proyectos", "about": "Nosotros", "who": "Quiénes somos",
        "careers": "Trabaja con nosotros", "contact": "Contacto", "label": "Navegación principal",
        "open": "Abrir menú",
    },
    "en": {
        "home": "Home", "work": "What we do", "lines": "Focus areas", "projects": "Projects",
        "knowledge": "Knowledge", "library": "Library", "laboratory": "HVT Laboratory",
        "ecosystem": "Ecosystem", "foundation": "Foundation", "support": "Support projects",
        "about": "About us", "who": "Who we are", "careers": "Careers", "contact": "Contact",
        "label": "Primary navigation", "open": "Open menu",
    },
    "ru": {
        "home": "Главная", "work": "Что мы делаем", "lines": "Направления",
        "projects": "Проекты", "knowledge": "Знания", "library": "Библиотека",
        "laboratory": "Лаборатория HVT", "ecosystem": "Экосистема", "foundation": "Фонд",
        "support": "Поддержать проекты", "about": "О нас", "who": "Кто мы",
        "careers": "Карьера", "contact": "Контакты", "label": "Основная навигация",
        "open": "Открыть меню",
    },
}


def active_group(path: Path) -> str:
    name = path.name
    if name == "index.html" and path.parent == ROOT:
        return "home"
    if name.startswith("proyecto-"):
        return "work"
    if name in {"blog.html", "blog-single.html", "category.html"}:
        return "knowledge"
    if name == "fundacion.html" or name == "investors.html" or name.startswith("curso-") or name == "pueblito-boyacense.html":
        return "ecosystem"
    if name in {"trabaja-con-nosotros.html", "voluntariado-investigacion.html", "aviso-privacidad.html", "politica-tratamiento-datos.html", "terminos-condiciones.html"}:
        return "about"
    return "home"


def current(group: str, active: str) -> str:
    return ' class="current"' if group == active else ""


def submenu(group: str, menu_id: str, label: str, links: list[tuple[str, str]], active: str) -> str:
    items = "\n".join(f'                            <li><a href="{href}">{text}</a></li>' for text, href in links)
    return f'''                    <li class="nav-dropdown{' current' if group == active else ''}">
                        <button class="nav-dropdown__toggle" type="button" aria-expanded="false" aria-controls="{menu_id}">
                            {label} <span class="nav-dropdown__chevron" aria-hidden="true"></span>
                        </button>
                        <ul class="nav-dropdown__menu" id="{menu_id}" hidden>
{items}
                        </ul>
                    </li>'''


def navigation(path: Path, locale: str) -> str:
    text = LOCALES[locale]
    active = active_group(path)
    localized_home = path.parent.name in {"en", "ru"}
    prefix = "" if localized_home else "/"
    home = "#home" if localized_home or path == ROOT / "index.html" else "/"
    section = lambda anchor: f"#{anchor}" if localized_home or path == ROOT / "index.html" else f"/#{anchor}"
    work = [(text["lines"], section("services")), (text["projects"], section("portfolio"))]
    knowledge = [(text["library"], "/blog"), (text["laboratory"], "/laboratorio/")]
    ecosystem = [(text["foundation"], "/fundacion"), ("Logistyka", "https://hidrogenoverdeturquesa.github.io/logistyka/"), (text["support"], "/investors")]
    about = [(text["who"], section("about")), (text["careers"], "/trabaja-con-nosotros")]
    return f'''<nav class="s-header__nav" id="site-navigation" aria-label="{text['label']}">
                <ul>
                    <li{current('home', active)}><a href="{home}">{text['home']}</a></li>
{submenu('work', 'nav-work-menu', text['work'], work, active)}
{submenu('knowledge', 'nav-knowledge-menu', text['knowledge'], knowledge, active)}
{submenu('ecosystem', 'nav-ecosystem-menu', text['ecosystem'], ecosystem, active)}
{submenu('about', 'nav-about-menu', text['about'], about, active)}
                    <li><a href="{section('contact')}">{text['contact']}</a></li>
                </ul>
            </nav>'''


def sync(path: Path, locale: str) -> bool:
    source = path.read_text(encoding="utf-8")
    updated, nav_count = re.subn(
        r'<nav\b[^>]*class="[^"]*s-header__nav[^"]*"[^>]*>.*?</nav>',
        navigation(path, locale), source, count=1, flags=re.DOTALL | re.IGNORECASE,
    )
    if nav_count != 1:
        return False
    toggle = f'''<button class="s-header__menu-toggle" type="button" aria-label="{LOCALES[locale]['open']}" aria-expanded="false" aria-controls="site-navigation">
                <span class="s-header__menu-icon" aria-hidden="true"></span>
            </button>'''
    updated, toggle_count = re.subn(
        r'<(?:a|button)\b[^>]*class="[^"]*s-header__menu-toggle[^"]*"[^>]*>.*?</(?:a|button)>',
        toggle, updated, count=1, flags=re.DOTALL | re.IGNORECASE,
    )
    if toggle_count != 1:
        raise RuntimeError(f"Menu toggle not found in {path}")
    updated = re.sub(
        r'((?:\.\./)?css/styles\.css)\?v=[^"\']+',
        rf'\1?v={ASSET_VERSION}', updated,
    )
    updated = re.sub(
        r'((?:\.\./)?js/main\.js)\?v=[^"\']+',
        rf'\1?v={ASSET_VERSION}', updated,
    )
    if updated != source:
        path.write_text(updated, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> None:
    pages = [p for p in ROOT.glob("*.html") if p.name not in EXCLUDED]
    pages += [ROOT / "en" / "index.html", ROOT / "ru" / "index.html"]
    changed = []
    for page in pages:
        locale = page.parent.name if page.parent.name in {"en", "ru"} else "es"
        if sync(page, locale):
            changed.append(page.relative_to(ROOT).as_posix())
    print(f"Synchronized navigation in {len(changed)} pages")
    for page in changed:
        print(page)


if __name__ == "__main__":
    main()
