# Search Metadata and Installability

Phase 8 keeps public search metadata, social previews, business facts, and install behavior explicit and testable.

## Source of truth

- `config/site.json` owns every public page title and description, the canonical production origin, shared business facts, and the social-preview asset.
- `scripts/build-shared-html.mjs` generates the marked SEO region in each public HTML page and generates `sitemap.xml`.
- `robots.txt` excludes portal, admin, customization, system-check, password-reset, and API routes.
- `site.webmanifest` owns Android and installed-app presentation. The 192 px, 512 px, maskable, and Apple touch icons all use the approved bear mark.

Do not hand-edit content between `shared:public-seo` markers. After a metadata or business-fact change, run:

```powershell
npm run site:build
npm run test:all
```

## Search and social behavior

The generated public metadata provides:

- one unique description and clean canonical URL per public page;
- Open Graph and large-card social metadata using the Blue Bear logo artwork;
- `Electrician` structured data with the company name, phone, Imperial County service area, and California contractor license identifier;
- an XML sitemap containing only indexable public clean routes.

`security-policy.html` remains reachable but carries `noindex,nofollow` and is omitted from the sitemap. Private routes carry `noindex` in their HTML and are disallowed in `robots.txt`; Vercel also sends a private, no-store cache policy and an `X-Robots-Tag` for those routes.

## Published-claim rules

The current phone number, service area, license number, and credentials are owner-provided business facts centralized in `config/site.json`. Supporting license, insurance, safety-training, and union records are intentionally not stored in this public repository. The business owner must confirm those records before changing or republishing a claim.

The public site does not promise 24-hour staffing or a fixed response time. Urgent electrical work is described as subject to current crew availability, and visitors are directed to call. Estimate confirmation explains that the team will review the details and then contact the requester with availability and next steps.

Portfolio cards use general project labels and work categories. They do not publish customer names, street addresses, testimonial quotes, or review scores. Add customer or reviewer attribution only when written permission and a verifiable source are available.

## Install on Android Chrome

1. Open `https://bluebearelectric.com/` in Chrome.
2. Open the three-dot menu.
3. Choose **Install app** or **Add to Home screen**. The exact label depends on the Chrome and Android version.
4. Confirm **Install**.
5. Launch Blue Bear from the home screen and confirm the bear icon, app name, standalone window, homepage start route, navigation, and phone/estimate actions.

## Add to Home Screen in Safari on iPhone

1. Open `https://bluebearelectric.com/` in **Safari**. Other iPhone browsers may not show the same control.
2. Tap Safari's **Share** button.
3. Scroll down and tap **Add to Home Screen**. If it is hidden, choose **Edit Actions** and enable it.
4. Keep or edit the name, then tap **Add**.
5. Open Blue Bear from the home screen and confirm the bear icon, title, homepage, navigation, and phone/estimate actions.

Safari does not display a custom website-controlled install prompt. The Share-sheet action is the expected iPhone flow.

## Offline decision

No service worker is registered. The site's highest-value actions—submitting an estimate, loading managed content, and signing into portals—require a live connection. Caching an offline copy could show stale operating or project information and could make a failed request look successful. Add a service worker only after defining versioned assets, network-first rules for business content, never-cache rules for APIs and private routes, an update experience, and an offline failure test.

## Release verification

Automated tests validate metadata uniqueness, canonical and social URLs, JSON-LD shape, sitemap contents, private-route exclusions, manifest fields, Apple metadata, and icon responses. A physical Android and iPhone check remains part of final release acceptance because desktop automation cannot reproduce each operating system's install UI.
