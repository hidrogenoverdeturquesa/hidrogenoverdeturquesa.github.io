"""Build complete localized home pages from the Spanish source.

The Spanish ``index.html`` remains the single structural source. This script
changes text nodes and locale metadata only, so media, sections, modals,
classes, IDs and JavaScript behavior remain identical in every language.

Translations are cached in ``translations/<locale>.json``. Edit those JSON
files to review technical terminology; subsequent builds reuse the edits.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from threading import Lock

import requests


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "index.html"
CACHE_DIR = ROOT / "translations"
TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
SKIP_TAGS = {"script", "style", "svg", "code", "pre", "math", "textarea"}
SKIP_CLASSES = {
    "line-service__equation",
    "line-project-card--protected",
    "contact-email",
}
LOCAL_ASSET_PREFIXES = ("images/", "videos/", "css/", "js/", "fonts/", "Certificados/")
TRANSLATABLE_ATTRIBUTES = ("alt", "title", "aria-label", "placeholder")
MANUAL_OVERRIDES = {
    "en": {
        "Inicio": "Home",
        "Iniciativa Fundación": "Foundation Initiative",
        "Apoyar proyectos": "Support projects",
        "Líneas": "Focus areas",
        "Proyectos": "Projects",
        "Noticias": "News",
        "Nosotros": "About us",
        "Contacto": "Contact",
        "Somos": "We are",
        "una empresa colombiana de investigación y desarrollo de proyectos sostenibles para LATAM": "a Colombian research and development company creating sustainable projects for Latin America",
        "Conoce nuestros": "Explore our",
        "contáctanos": "contact us",
        "Ver servicios y proyectos": "View services and projects",
        "Ver detalles": "View details",
        "Ver publicación →": "View publication →",
    },
    "ru": {
        "Inicio": "Главная",
        "Iniciativa Fundación": "Инициатива фонда",
        "Apoyar proyectos": "Поддержать проекты",
        "Líneas": "Направления",
        "Proyectos": "Проекты",
        "Noticias": "Новости",
        "Nosotros": "О нас",
        "Contacto": "Контакты",
        "Somos": "Мы —",
        "una empresa colombiana de investigación y desarrollo de proyectos sostenibles para LATAM": "колумбийская компания, занимающаяся исследованиями и разработкой устойчивых проектов для Латинской Америки",
        "Conoce nuestros": "Познакомьтесь с нашими",
        "contáctanos": "свяжитесь с нами",
        "Ver servicios y proyectos": "Услуги и проекты",
        "Ver detalles": "Подробнее",
        "Ver publicación →": "Смотреть публикацию →",
    },
}


def should_translate(value: str) -> bool:
    text = value.strip()
    if not text or len(text) == 1:
        return False
    if re.fullmatch(r"[\W\d_]+", text, flags=re.UNICODE):
        return False
    if "@" in text or text.startswith(("http://", "https://", "+57")):
        return False
    if re.search(r"[=∑∫≤≥λθẋŷ]", text):
        return False
    return bool(re.search(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]", text))


class SourceScanner(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.stack: list[bool] = []
        self.texts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        classes = set((attr.get("class") or "").split())
        inherited = self.stack[-1] if self.stack else False
        skip = inherited or tag in SKIP_TAGS or attr.get("translate") == "no" or bool(classes & SKIP_CLASSES)
        self.stack.append(skip)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        return

    def handle_endtag(self, tag: str) -> None:
        if self.stack:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if not (self.stack[-1] if self.stack else False) and should_translate(data):
            self.texts.append(data.strip())


class LocalizedRenderer(HTMLParser):
    def __init__(self, translations: dict[str, str]) -> None:
        super().__init__(convert_charrefs=False)
        self.translations = translations
        self.stack: list[bool] = []
        self.output: list[str] = []

    def handle_decl(self, decl: str) -> None:
        self.output.append(f"<!{decl}>")

    def handle_comment(self, data: str) -> None:
        self.output.append(f"<!--{data}-->")

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        classes = set((attr.get("class") or "").split())
        inherited = self.stack[-1] if self.stack else False
        skip = inherited or tag in SKIP_TAGS or attr.get("translate") == "no" or bool(classes & SKIP_CLASSES)
        self.stack.append(skip)
        self.output.append(self.get_starttag_text())

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.output.append(self.get_starttag_text())

    def handle_endtag(self, tag: str) -> None:
        if self.stack:
            self.stack.pop()
        self.output.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        skip = self.stack[-1] if self.stack else False
        key = data.strip()
        if not skip and key in self.translations and should_translate(data):
            leading = data[: len(data) - len(data.lstrip())]
            trailing = data[len(data.rstrip()) :]
            self.output.append(leading + html.escape(self.translations[key], quote=False) + trailing)
        else:
            self.output.append(data)

    def handle_entityref(self, name: str) -> None:
        self.output.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self.output.append(f"&#{name};")

    def handle_pi(self, data: str) -> None:
        self.output.append(f"<?{data}>")


def translate_one(text: str, locale: str, session: requests.Session) -> str:
    response = session.get(
        TRANSLATE_URL,
        params={"client": "gtx", "sl": "es", "tl": locale, "dt": "t", "q": text},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    translated = "".join(part[0] for part in payload[0] if part and part[0])
    return translated.strip() or text


def load_cache(locale: str) -> dict[str, str]:
    path = CACHE_DIR / f"{locale}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_cache(locale: str, cache: dict[str, str]) -> None:
    CACHE_DIR.mkdir(exist_ok=True)
    path = CACHE_DIR / f"{locale}.json"
    path.write_text(json.dumps(dict(sorted(cache.items())), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def collect_texts(source: str) -> list[str]:
    scanner = SourceScanner()
    scanner.feed(source)
    return list(dict.fromkeys(scanner.texts))


def collect_attribute_texts(source: str) -> list[str]:
    names = "|".join(re.escape(name) for name in TRANSLATABLE_ATTRIBUTES)
    values = re.findall(rf'(?:{names})="([^"]+)"', source, flags=re.IGNORECASE)
    meta_values = re.findall(
        r'<meta\s+(?:name="description"|property="og:(?:title|description|image:alt)")\s+content="([^"]+)"',
        source,
        flags=re.IGNORECASE,
    )
    return [html.unescape(value) for value in values + meta_values if should_translate(html.unescape(value))]


def protect_terminology(source: str, translated: str, locale: str) -> str:
    """Restore registered names and personal names after machine translation."""
    if source in MANUAL_OVERRIDES.get(locale, {}):
        return MANUAL_OVERRIDES[locale][source]
    if "Hidrógeno Verde Turquesa" in source:
        variants = (
            "Turquoise Green Hydrogen",
            "Turquoise Green hydrogen",
            "Turquoise-Green Hydrogen",
            "Бирюзово-зеленый Hydrogen",
            "Бирюзово-зеленый водород",
            "Бирюзово-Зеленый Водород",
            "Бирюзовый Зеленый Водород",
        )
        for variant in variants:
            translated = translated.replace(variant, "Hidrógeno Verde Turquesa")
    for variant in ("HydroEcoBox", "ГидроЭкоБокс", "ГидроЭкоКоробка"):
        translated = translated.replace(variant, "HidroEcoCaja")
    if source.strip() == "Logistyka":
        translated = "Logistyka"
    name_variants = {
        "John Avella": "Jhon Avella",
        "Джон Авелла": "Jhon Avella",
        "Oscar Torres": "Oscar Torres",
        "Оскар Торрес": "Oscar Torres",
        "Lizeth Torres": "Lizeth Torres",
        "Лизет Торрес": "Lizeth Torres",
    }
    for variant, official in name_variants.items():
        if official in source:
            translated = translated.replace(variant, official)
    return translated


def fill_cache(locale: str, texts: list[str], cache: dict[str, str], workers: int) -> None:
    missing = [text for text in texts if text not in cache]
    if not missing:
        return
    print(f"{locale}: translating {len(missing)} new text nodes")
    lock = Lock()

    def task(text: str) -> tuple[str, str]:
        with requests.Session() as session:
            for attempt in range(4):
                try:
                    return text, translate_one(text, locale, session)
                except Exception:
                    if attempt == 3:
                        raise
                    time.sleep(1.5 * (attempt + 1))
        return text, text

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(task, text) for text in missing]
        for number, future in enumerate(as_completed(futures), 1):
            source_text, translated = future.result()
            with lock:
                cache[source_text] = translated
                if number % 20 == 0:
                    save_cache(locale, cache)
            print(f"{locale}: {number}/{len(missing)}", end="\r", flush=True)
    print()
    save_cache(locale, cache)


def localize_document(source: str, locale: str, translations: dict[str, str]) -> str:
    renderer = LocalizedRenderer(translations)
    renderer.feed(source)
    output = "".join(renderer.output)

    for source_text, translated in translations.items():
        protected = protect_terminology(source_text, translated, locale)
        source_attr = html.escape(source_text, quote=True)
        translated_attr = html.escape(protected, quote=True)
        for attribute in TRANSLATABLE_ATTRIBUTES:
            output = output.replace(f'{attribute}="{source_attr}"', f'{attribute}="{translated_attr}"')
        output = output.replace(f'content="{source_attr}"', f'content="{translated_attr}"')

    output = re.sub(r'<html([^>]*?)lang="es"', rf'<html\1lang="{locale}-x-mtfrom-es"', output, count=1)
    output = output.replace(
        '<link rel="canonical" href="https://hidrogenoverdeturquesa.com/">',
        f'<link rel="canonical" href="https://hidrogenoverdeturquesa.com/{locale}/">',
    )
    output = output.replace(
        '<meta property="og:url" content="https://hidrogenoverdeturquesa.com/">',
        f'<meta property="og:url" content="https://hidrogenoverdeturquesa.com/{locale}/">',
    )
    output = output.replace('"inLanguage": "es-CO"', f'"inLanguage": "{locale}"')
    output = output.replace(
        '<link rel="alternate" hreflang="es" href="https://hidrogenoverdeturquesa.com/">',
        '<link rel="alternate" hreflang="es" href="https://hidrogenoverdeturquesa.com/">\n'
        '    <link rel="alternate machine-translated-from" hreflang="es" href="https://hidrogenoverdeturquesa.com/">',
        1,
    )

    for prefix in LOCAL_ASSET_PREFIXES:
        # Covers ordinary attributes and every candidate in a multiline srcset.
        # The lookbehind leaves absolute URLs and paths already beginning in ../ intact.
        output = re.sub(
            rf'(?<![./A-Za-z0-9_-]){re.escape(prefix)}',
            f'../{prefix}',
            output,
        )
    for filename in ("apple-touch-icon.png", "favicon-32x32.png", "favicon-16x16.png", "site.webmanifest"):
        output = output.replace(f'href="{filename}', f'href="../{filename}')

    output = output.replace('href="/"', f'href="/{locale}/"', 1)
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", choices=("en", "ru", "all"), default="all")
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    source = SOURCE.read_text(encoding="utf-8")
    texts = list(dict.fromkeys(collect_texts(source) + collect_attribute_texts(source)))
    print(f"source: {len(texts)} unique translatable text nodes")
    if args.dry_run:
        return

    locales = ("en", "ru") if args.locale == "all" else (args.locale,)
    for locale in locales:
        cache = load_cache(locale)
        fill_cache(locale, texts, cache, args.workers)
        cache = {key: protect_terminology(key, value, locale) for key, value in cache.items()}
        save_cache(locale, cache)
        localized = localize_document(source, locale, cache)
        destination = ROOT / locale / "index.html"
        destination.parent.mkdir(exist_ok=True)
        destination.write_text(localized, encoding="utf-8", newline="\n")
        print(f"wrote {destination.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
