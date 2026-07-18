# Blue Bear V8.9.1 — Image Replacement and 3D Carousel Operations Guide

## Objective

The website now uses a controlled media-slot architecture. You no longer need to search through HTML to replace ordinary carousel photographs.

## Fast replacement procedure

1. Extract the ZIP.
2. Open:
   `assets/images/media/`
3. Enter the service folder:
   - `residential/hero/`
   - `industrial/hero/`
   - `commercial/hero/`
   - `solar-bess/hero/`
   - `service-repair/hero/`
4. Replace the existing numbered image.
5. Keep the exact filename.
6. Commit and push with GitHub Desktop.
7. Wait for Vercel deployment to finish.
8. Open the page and press `Ctrl + Shift + R`.

Example:

Replace:

`assets/images/media/residential/hero/residential-hero-01.jpg`

with your own photo, but keep the name:

`residential-hero-01.jpg`

## Required production standards

- Landscape orientation.
- Minimum recommended size: 1600 × 1000 pixels.
- Preferred aspect ratio: 16:10 or 16:9.
- JPG quality: approximately 78–86%.
- Preferred maximum size: 700 KB.
- Use real Blue Bear project photographs.
- Remove GPS metadata before public upload when location privacy matters.
- Do not expose customer names, panel schedules, badge numbers, license plates, gate codes, passwords, drawings, or proprietary equipment information.

## Changing titles and captions

Open:

`assets/images/media/media-manifest.json`

Find the correct service section and edit only:

- `title`
- `caption`

The `src` value must continue matching the actual image file.

## Carousel mechanics

The engine is located at:

`assets/js/blue-bear-3d-carousel.js`

The styles are located at:

`assets/css/media-engine-v8-9-1.css`

The carousel supports:

- Previous and next controls.
- Thumbnail navigation.
- Keyboard left/right arrows.
- Swipe gesture.
- Horizontal wheel movement.
- Automatic rotation.
- Click-to-center behavior.
- Full-screen lightbox.
- Pointer-based scene perspective.
- Reduced-motion accessibility.
- Responsive mobile fallback.

## Adding another photo

The supplied carousels use five controlled slots. To add a sixth:

1. Add the image file to the correct folder.
2. Add a sixth object inside the appropriate array in `media-manifest.json`.
3. Add the same object to the page’s `data-items` attribute, or regenerate the page from the manifest.

For normal operation, replacing the five existing slots is safer and requires no code changes.

## Visual inspection checklist

Test each changed page at:

- 1920 × 1080 desktop.
- 1366 × 768 laptop.
- Tablet portrait.
- Mobile portrait.

Verify:

- Active image remains readable.
- Text is not embedded in the image.
- Side cards do not cover page text.
- Arrow buttons remain accessible.
- Swipe works on touch devices.
- Reduced-motion users can still operate the gallery.

## Rollback

GitHub Desktop keeps the prior commit. If an image or layout is wrong:

1. Open GitHub Desktop.
2. Open History.
3. Select the prior working commit.
4. Revert the V8.9.1 media commit or restore the specific file.
