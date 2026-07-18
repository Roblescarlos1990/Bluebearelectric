# V8.9.2 Residential Home Systems

## Public behavior

Clicking Panel, EV Charging, Lighting or Garage changes:

- the 3D image deck
- image thumbnails
- title
- description
- technical feature list

The matching service cards at the top of the page also open the correct system and scroll to the explorer.

## Admin photo management

Open:

VoltFlow Admin → Branding & Website → Home Systems Carousel Manager

Select:

- Main Electrical Panel
- EV Charging
- Lighting & Controls
- Garage & Shop Power

You can:

- upload a new image
- set the title and accessible description
- publish or hide the image
- move images up or down
- permanently delete an image
- preview the published set

## Database

Run:

`docs/sql/V8-9-2-WEBSITE-CAROUSEL-MANAGER.sql`

The manager uses the existing public `site-media` Supabase Storage bucket.

## Fallback

Until database images are uploaded, the website uses the local files in:

`assets/images/media/residential/home-systems/`

This prevents a blank section and keeps the page functional during setup.
