# Phase 7 JavaScript cleanup

Phase 7 simplifies the browser runtime without changing public content, authentication rules,
Supabase schema names, storage policy assumptions, or quote-delivery behavior.

## Changes

- Added a deterministic JavaScript inventory and CI gate covering every root HTML script load,
  browser module, storage key, static or dynamic Supabase target, storage bucket, RPC call, custom
  event, fetch target, and `data-*` hook.
- Removed one duplicate `company-profile.js` load from `admin.html`. The module still loads once,
  before every administrator module that depends on company data.
- Removed three unreferenced historical portal implementations totaling 22,042 bytes. All 38
  remaining browser modules are loaded by at least one current route.
- Removed the unpaired `voltflow:data-updated` listener. No active module dispatched that event, and
  the intelligence dashboard retains its authenticated initial load and explicit refresh controls.
- Hardened smooth-scroll links so a missing or non-fragment destination cannot throw a runtime
  error.
- Scoped the floating phone conversion control to generated public pages with `main#main-content`,
  keeping it out of portal, reset-password, customization, and administrator contexts.

## Preserved security boundaries

- Public, employee, employee-administration, and VoltFlow administrator modules remain separate.
- Employee approval and administrator membership are still queried before protected UI is shown.
- Sign-in and sign-out continue through Supabase Auth. Password updates continue through
  `auth.updateUser` from the password-recovery entry point.
- Browser authorization still depends on authentication plus database and storage RLS policies, not
  hidden controls.
- No table, bucket, field, API endpoint, storage key, or publishable Supabase configuration value was
  renamed.

## Reproducible checks

Generate the inventory after an intentional JavaScript contract change:

```powershell
npm run js:audit
```

Verify that the route graph is complete and the committed inventory is current:

```powershell
npm run js:check
```

The browser suite uses a local Supabase test double to cover employee sign-in, pending-approval
routing, sign-out, and password update without reading or writing production data. The full Phase 7
gate remains `npm run test:all`.
