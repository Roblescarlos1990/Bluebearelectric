# Phase 4 Visual Baseline

Captured from the local production-equivalent static server after the responsive-media and brand-icon pass.

## Coverage

- `intro-logo-reveal-fullpage.png`: desktop logo-only intro using the approved solid bear mark.
- `mobile-intro-logo-reveal.png`: portrait logo-only intro with no copy.
- `desktop-homepage.png`: desktop home hierarchy and responsive hero.
- `mobile-homepage.png`: 390×844 mobile conversion layout after the CLS fix.

## Automated media gate

- Static images reserve space and declare loading/decoding behavior.
- Core-page images load from responsive generated sources.
- The mobile homepage requests a compact AVIF hero, stays below the payload budget, and records CLS at or below 0.10.
- The install manifest exposes 192×192 and 512×512 app icons plus a 512×512 maskable icon.

The corresponding Phase 0–3 captures remain available for regression comparison.
