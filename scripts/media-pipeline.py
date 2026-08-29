#!/usr/bin/env python3
"""Build deterministic responsive images, app icons, and the image inventory."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_PATTERN = re.compile(
    r"assets/(?:images|branding)/[A-Za-z0-9_./-]+\.(?:avif|ico|jpe?g|png|webp)",
    re.IGNORECASE,
)
SOURCE_EXTENSIONS = {".avif", ".ico", ".jpeg", ".jpg", ".png", ".webp"}
PHOTO_WIDTHS = (480, 960, 1440)
LOGO_WIDTHS = (96, 192, 384)
NAVY = (3, 10, 19, 255)
PRIMARY_PHOTOS = {
    "assets/images/engineering-inspection/case-study/engineering-inspection-hero.webp",
    "assets/images/media/commercial/hero/commercial-hero-01.jpg",
    "assets/images/media/industrial/hero/industrial-hero-01.jpg",
    "assets/images/media/residential/hero/residential-hero-01.jpg",
    "assets/images/media/service-repair/hero/service-repair-hero-01.jpg",
    "assets/images/media/solar-bess/hero/solar-bess-hero-01.jpg",
    "assets/images/site/fuse-panel.jpg",
    "assets/images/site/instagram.jpg",
    "assets/images/site/megger.jpg",
    "assets/images/site/solar-field.jpg",
    "assets/images/site/switchgear.jpg",
    "assets/images/site/truck.jpg",
}


def source_files() -> list[Path]:
    files = (
        list(ROOT.glob("*.html"))
        + list(ROOT.glob("*.css"))
        + list(ROOT.glob("*.json"))
        + list(ROOT.glob("*.webmanifest"))
    )
    for directory in (ROOT / "assets" / "data", ROOT / "assets" / "images" / "media", ROOT / "assets" / "js"):
        if directory.exists():
            files.extend(
                path
                for path in directory.rglob("*")
                if path.is_file() and path.suffix.lower() in {".css", ".html", ".js", ".json"}
            )
    return sorted(
        {
            path
            for path in files
            if "optimized" not in path.parts and path.name != "image-variants.json"
        }
    )


def collect_references(files: list[Path]) -> dict[str, list[str]]:
    references: dict[str, list[str]] = {}
    for source in files:
        text = source.read_text(encoding="utf-8")
        source_name = source.relative_to(ROOT).as_posix()
        for match in ASSET_PATTERN.findall(text):
            references.setdefault(match, [])
            if source_name not in references[match]:
                references[match].append(source_name)
    return references


def clear_derivatives() -> None:
    targets = (
        ROOT / "assets" / "images" / "optimized",
        ROOT / "assets" / "branding" / "blue-bear" / "optimized",
    )
    for target in targets:
        if not target.exists():
            continue
        target.resolve().relative_to(ROOT.resolve())
        for path in sorted(target.rglob("*"), key=lambda item: len(item.parts), reverse=True):
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                path.rmdir()


def resize(image: Image.Image, width: int) -> Image.Image:
    if image.width == width:
        return image.copy()
    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def save_variant(image: Image.Image, target: Path, image_format: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if image_format == "AVIF":
        image.save(target, image_format, quality=50, speed=6)
    else:
        image.save(target, image_format, quality=78, method=6)


def optimize_fallback(source: Path, image: Image.Image) -> None:
    if source.suffix.lower() not in {".jpg", ".jpeg", ".webp"}:
        return
    runtime = image.copy()
    if runtime.width > 1600:
        runtime = resize(runtime, 1600)
    temporary = source.with_suffix(source.suffix + ".phase4")
    if source.suffix.lower() in {".jpg", ".jpeg"}:
        runtime.save(
            temporary,
            "JPEG",
            quality=82,
            optimize=True,
            progressive=True,
            subsampling="4:2:0",
        )
    else:
        runtime.save(temporary, "WEBP", quality=82, method=6)
    if temporary.stat().st_size < source.stat().st_size:
        temporary.replace(source)
    else:
        temporary.unlink()


def build_photo_variants(
    references: dict[str, list[str]], compress_sources: bool = False
) -> dict[str, dict]:
    metadata: dict[str, dict] = {}
    runtime_photos = sorted(
        reference
        for reference in references
        if reference.startswith("assets/images/")
        and "/optimized/" not in reference
        and (ROOT / reference).exists()
    )
    for reference in runtime_photos:
        source = ROOT / reference
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
        original_width, original_height = image.size
        if compress_sources:
            optimize_fallback(source, image)
        variants = []
        requested_widths = PHOTO_WIDTHS if reference in PRIMARY_PHOTOS else PHOTO_WIDTHS[:2]
        widths = sorted({min(width, original_width) for width in requested_widths})
        for width in widths:
            sized = resize(image, width)
            relative = source.relative_to(ROOT / "assets" / "images")
            stem = relative.with_suffix("")
            for extension, image_format in (("avif", "AVIF"), ("webp", "WEBP")):
                target = ROOT / "assets" / "images" / "optimized" / stem.parent / f"{stem.name}-{width}.{extension}"
                save_variant(sized, target, image_format)
                variants.append(
                    {
                        "format": extension,
                        "height": sized.height,
                        "path": target.relative_to(ROOT).as_posix(),
                        "size_bytes": target.stat().st_size,
                        "width": sized.width,
                    }
                )
        with Image.open(source) as runtime_source:
            runtime_width, runtime_height = runtime_source.size
        metadata[reference] = {
            "height": runtime_height,
            "size_bytes": source.stat().st_size,
            "variants": variants,
            "width": runtime_width,
        }
    return metadata


def trimmed_logo() -> Image.Image:
    source = Image.open(ROOT / "assets" / "branding" / "blue-bear" / "logo-mark-solid.png").convert("RGBA")
    alpha = source.getchannel("A")
    bounds = alpha.getbbox()
    return source.crop(bounds) if bounds else source


def place_logo(size: int, padding: float, background: tuple[int, int, int, int]) -> Image.Image:
    logo = trimmed_logo()
    maximum = round(size * (1 - 2 * padding))
    logo.thumbnail((maximum, maximum), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), background)
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas


def build_brand_assets(metadata: dict[str, dict]) -> None:
    brand = ROOT / "assets" / "branding" / "blue-bear"
    logo_reference = "assets/branding/blue-bear/logo-mark-solid.png"
    logo_source = ROOT / logo_reference
    logo = trimmed_logo()
    variants = []
    for width in LOGO_WIDTHS:
        sized = resize(logo, width)
        for extension, image_format in (("avif", "AVIF"), ("webp", "WEBP")):
            target = brand / "optimized" / f"logo-mark-solid-{width}.{extension}"
            save_variant(sized, target, image_format)
            variants.append(
                {
                    "format": extension,
                    "height": sized.height,
                    "path": target.relative_to(ROOT).as_posix(),
                    "size_bytes": target.stat().st_size,
                    "width": sized.width,
                }
            )
    with Image.open(logo_source) as original:
        metadata[logo_reference] = {
            "height": original.height,
            "size_bytes": logo_source.stat().st_size,
            "variants": variants,
            "width": original.width,
        }

    icon_specs = {
        "apple-touch-icon.png": (180, 0.13),
        "icon-192.png": (192, 0.11),
        "icon-512.png": (512, 0.11),
        "maskable-icon-512.png": (512, 0.22),
    }
    for filename, (size, padding) in icon_specs.items():
        place_logo(size, padding, NAVY).convert("RGB").save(brand / filename, "PNG", optimize=True)

    favicon_sizes = (16, 32, 48)
    favicon_images = []
    for size in favicon_sizes:
        icon = place_logo(size, 0.08, NAVY)
        icon.save(brand / f"favicon-{size}.png", "PNG", optimize=True)
        favicon_images.append(icon)
    favicon_images[-1].save(
        ROOT / "favicon.ico",
        "ICO",
        sizes=[(size, size) for size in favicon_sizes],
        append_images=favicon_images[:-1],
    )

    intro_specs = {
        "website-intro-cinematic.webp": (1536, 864, 0.58),
        "website-intro-cinematic-mobile.webp": (900, 1600, 0.84),
    }
    for filename, (width, height, logo_fraction) in intro_specs.items():
        canvas = Image.new("RGBA", (width, height), NAVY)
        intro_logo = trimmed_logo()
        maximum_width = round(width * logo_fraction)
        maximum_height = round(height * 0.62)
        intro_logo.thumbnail((maximum_width, maximum_height), Image.Resampling.LANCZOS)
        canvas.alpha_composite(
            intro_logo,
            ((width - intro_logo.width) // 2, (height - intro_logo.height) // 2),
        )
        canvas.convert("RGB").save(brand / filename, "WEBP", quality=90, method=6)


def presentation_for(reference: str, uses: list[str]) -> str:
    if any(use.endswith(".css") for use in uses):
        return "Decorative background"
    if reference.startswith("assets/branding/"):
        return "Brand artwork"
    if any("home-systems-manifest.json" in use for use in uses):
        return "Manifest alt text"
    if any("media-manifest.json" in use for use in uses):
        return "Managed carousel title/alt"
    if any("photo-slots.json" in use for use in uses):
        return "Photo-slot alt text"
    if any(use.endswith(".html") for use in uses):
        return "HTML alt text"
    return "Runtime-managed description" if uses else "Source/archive only"


def write_inventory(references: dict[str, list[str]], metadata: dict[str, dict]) -> None:
    originals = sorted(
        path
        for parent in (ROOT / "assets" / "branding", ROOT / "assets" / "images")
        for path in parent.rglob("*")
        if path.is_file()
        and path.suffix.lower() in SOURCE_EXTENSIONS
        and "optimized" not in path.parts
    )
    rows = []
    for source in originals:
        reference = source.relative_to(ROOT).as_posix()
        with Image.open(source) as image:
            width, height = image.size
        uses = references.get(reference, [])
        rows.append(
            {
                "bytes": source.stat().st_size,
                "classification": "Runtime" if uses else "Source/archive",
                "height": height,
                "path": reference,
                "presentation": presentation_for(reference, uses),
                "uses": uses,
                "width": width,
            }
        )

    runtime_total = sum(row["bytes"] for row in rows if row["classification"] == "Runtime")
    archive_total = sum(row["bytes"] for row in rows if row["classification"] == "Source/archive")
    optimized_total = sum(
        path.stat().st_size
        for path in (ROOT / "assets").rglob("*")
        if path.is_file() and "optimized" in path.parts
    )
    lines = [
        "# Image Inventory",
        "",
        "Generated by `python scripts/media-pipeline.py`. Optimized derivatives are excluded from the",
        "row-by-row source inventory and are recorded in `assets/data/image-variants.json`.",
        "",
        "## Summary",
        "",
        f"- Source assets: {len(rows)}",
        f"- Runtime source weight: {runtime_total:,} bytes",
        f"- Source/archive weight: {archive_total:,} bytes",
        f"- Responsive derivative weight: {optimized_total:,} bytes",
        "- HTML images use explicit alternative text; CSS images are decorative; managed carousel and",
        "  photo-slot descriptions are supplied by their manifests or published records.",
        "- Full-quality pre-optimization files remain recoverable from Git history. Unreferenced source",
        "  assets remain outside the live reference graph and are not loaded by public pages.",
        "",
        "## Inventory",
        "",
        "| Source | Dimensions | Bytes | Class | Presentation | Used by |",
        "| --- | ---: | ---: | --- | --- | --- |",
    ]
    for row in rows:
        uses = ", ".join(f"`{use}`" for use in row["uses"]) or "—"
        lines.append(
            f"| `{row['path']}` | {row['width']}×{row['height']} | {row['bytes']:,} | "
            f"{row['classification']} | {row['presentation']} | {uses} |"
        )
    (ROOT / "docs" / "IMAGE-INVENTORY.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (ROOT / "assets" / "data" / "image-variants.json").write_text(
        json.dumps({"version": 1, "images": metadata}, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--compress-sources",
        action="store_true",
        help="One-time lossy compression for JPEG/WebP runtime fallbacks.",
    )
    arguments = parser.parse_args()
    clear_derivatives()
    files = source_files()
    references = collect_references(files)
    metadata = build_photo_variants(references, arguments.compress_sources)
    build_brand_assets(metadata)
    write_inventory(references, metadata)
    print(f"Built responsive metadata for {len(metadata)} runtime image sources.")


if __name__ == "__main__":
    main()
