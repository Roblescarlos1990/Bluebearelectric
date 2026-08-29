# Media Pipeline

## Purpose

The Phase 4 media pipeline keeps the current Blue Bear content and stable file paths while delivering smaller responsive images. It generates AVIF and WebP derivatives, intrinsic image metadata, browser/app icons, the clean logo-only intro artwork, and the repository image inventory.

## Canonical sources and generated files

- `assets/branding/blue-bear/logo-mark-solid.png` is the approved bear mark.
- Existing photographs under `assets/images/` are canonical runtime fallbacks unless they are inside `assets/images/optimized/`.
- `assets/images/optimized/` and `assets/branding/blue-bear/optimized/` are generated and may be replaced by the pipeline.
- `assets/data/image-variants.json` and `docs/IMAGE-INVENTORY.md` are generated.
- `favicon.ico`, Apple touch, app, and maskable icons are generated from the approved bear mark.
- Full pre-optimization source revisions remain recoverable from Git history.

The generator only clears the two exact `optimized` directories. It validates that both resolve inside the repository before removing generated files.

## Normal update workflow

1. Replace the canonical source at the same path, or add the new file to the relevant media/photo-slot manifest.
2. Keep the source orientation correct and provide useful managed alt text for meaningful content images.
3. Install the pinned dependency once with `python -m pip install -r requirements-media.txt`.
4. Run `npm run media:build`.
5. Format generated HTML, JSON, and Markdown with Prettier.
6. Run `npm run test:all` and visually inspect desktop and mobile.

The pipeline creates 480 px and 960 px variants for runtime images. Primary hero and first-carousel sources also receive a 1440 px derivative when the original is large enough. Runtime JavaScript adds responsive `srcset`/`sizes` metadata to managed images, while CSS heroes use format-aware `image-set()` sources.

## Source compression

`npm run media:compress-sources` recompresses JPEG/WebP fallback sources only when the result is smaller. Use it once for a deliberate optimization change and review the visual result before committing. Do not use it for routine regeneration because repeated lossy encoding can reduce quality.

## Loading policy

- Below-the-fold content images use `loading="lazy"` and `decoding="async"`.
- A page may have at most one `fetchpriority="high"` image; it must also load eagerly.
- CSS page heroes have responsive AVIF/WebP sources and a source-format fallback.
- All static images reserve layout space with explicit width and height.
- External Supabase overrides keep their published URL and clear stale local responsive metadata.

## Brand icon policy

The regular app icons use the approved mark centered on the Blue Bear navy background. The maskable 512×512 icon uses approximately 22% edge padding so the complete bear and lightning bolt stay inside common launcher masks. The generated ICO contains 16×16, 32×32, and 48×48 sizes.

## Verification and rollback

`scripts/validate-site.mjs` verifies local source and `srcset` references, required image attributes, the responsive metadata manifest, and the complete web-app icon set. `tests/browser/media.spec.mjs` verifies browser loading, responsive selection, mobile payload, layout stability, and manifest icon availability.

To roll back a generated-media change, restore the source revision and rerun `npm run media:build`. If source fallback compression must be undone, restore that source from Git history before rebuilding.
