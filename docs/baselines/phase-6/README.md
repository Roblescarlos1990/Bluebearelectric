# Phase 6 CSS baselines

These viewport screenshots gate the high-risk CSS cleanup. They were captured with Chromium, dark color scheme, reduced motion, blocked service workers, and deterministic empty managed-content responses.

| Baseline            | Viewport |
| ------------------- | -------: |
| `mobile-320.jpg`    |  320×568 |
| `mobile-375.jpg`    |  375×667 |
| `mobile-390.jpg`    |  390×844 |
| `tablet-768.jpg`    | 768×1024 |
| `landscape-844.jpg` |  844×390 |
| `desktop-1024.jpg`  | 1024×768 |
| `desktop-1280.jpg`  | 1280×800 |
| `desktop-1440.jpg`  | 1440×900 |

The compact `before/` and `after/` JPEGs are byte-for-byte identical for all eight viewports. This is expected: Phase 6 removed unreachable intro generations and consolidated equal token values without redesigning active pages.

Regenerate a set with:

```powershell
npm run css:baseline -- before
npm run css:baseline -- after
```

The structured selector/cascade inventories alongside the images can be regenerated with:

```powershell
npm run css:audit -- --ref HEAD --output docs/baselines/phase-6/css-before.json --quiet
npm run css:audit -- --output docs/baselines/phase-6/css-after.json --quiet
```

See `docs/CSS-CASCADE-AUDIT.md` for the measured result and removal decision log.
