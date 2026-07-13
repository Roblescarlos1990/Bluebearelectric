# Recommended Vercel Firewall Rules

Configure these in the Vercel dashboard; they cannot be fully represented by `vercel.json`.

## Bot Protection

- Start: Bot Protection managed ruleset → Log
- After 24–48 hours: Challenge
- Create bypasses only for trusted automated traffic you explicitly use.

## Quote API rate limit

Create a custom rule matching pathname `/api/quote` and method `POST`.

Recommended second-layer threshold:

- 10 requests per 10 minutes per IP
- Begin in Log mode
- Change to Deny after reviewing legitimate traffic

The API applies stricter accepted-submission limits by IP, email, and phone.

## AI crawlers

- Enable AI Bots managed ruleset in Log mode.
- If you want the same policy as `robots.txt`, deny broad AI-training crawlers while allowing search and user-initiated fetches through explicit user-agent rules where needed.

## Geographic control

Do not block the public website globally. Apply geographic rules only to `/api/quote` after reviewing traffic. The application defaults to monitoring countries outside US/CA/MX; `GEO_MODE=restrict` enforces blocking.

## Observability

Review Firewall → Observability for:

- top challenged paths
- top countries
- repeated IPs
- bot classifications
- false positives

Keep screenshots or exported records when changing enforcement modes.
