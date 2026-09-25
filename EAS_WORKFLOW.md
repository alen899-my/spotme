# EAS workflow for SpotMe

Use the smallest possible release path for each change.

## 1. Most changes: push an OTA update

Use an EAS update when you change only JavaScript, TypeScript, styles, routes, text, or API logic that does not require a native rebuild.

Preview branch:

```bash
npm run eas:update:preview -- --message "test update"
```

Production branch:

```bash
npm run eas:update:production -- --message "bug fix"
```

This is the fastest option and avoids shipping a new APK.

## 2. Rebuild only for native changes

Create a new Android build only when you change native dependencies or app config, for example:

- `package.json` installs/removals that affect native modules
- `app.json`
- Expo SDK or React Native version
- app icon, splash, package name, plugins
- anything inside `android/`

Internal APK build:

```bash
npm run eas:build:preview
```

Production Play Store build:

```bash
npm run eas:build:production
```

`production` already builds an Android App Bundle (`.aab`), which is smaller for users than a universal APK.

## 3. Keep OTA updates working

This project uses:

```json
"runtimeVersion": { "policy": "appVersion" }
```

That means:

- keep `expo.version` the same when you want existing installs to receive OTA updates
- bump `expo.version` only when you intentionally want a new native release line

Current version:

- `app.json`: `1.0.0`

## 5. Automatic APK release on version tag (CI)

Pushing a tag like `v1.1.0` triggers `.github/workflows/eas-apk-release.yml`,
which builds `production-apk` on EAS cloud, uploads the `.apk` to R2 via a
presigned URL, and registers it in `app_builds` (channel `production`,
auto-promoted to latest). The admin Builds menu and the main-page download
button pick it up automatically via `GET /updates/latest`.

Release steps:

```bash
# 1. Bump the version (tag MUST equal app.json expo.version)
#    app.json -> expo.version, e.g. "1.1.0"
git add app.json && git commit -m "release v1.1.0"

# 2. Tag and push — CI does the rest
git tag v1.1.0 && git push origin v1.1.0
```

Required GitHub repo secrets:

- `EXPO_TOKEN` — access token from https://expo.dev/accounts/[owner]/settings/access-tokens
- `API_BASE_URL` — e.g. `https://spotme-api.duckdns.org/api`
- `ADMIN_BUILD_TOKEN` — long random string; must also be set as backend env
  `ADMIN_BUILD_TOKEN` (same value). CI uses it only for
  `POST /admin/builds/presigned-url` and `POST /admin/builds`; all other
  admin routes still require a human admin JWT. If the backend env is unset,
  service-token auth is disabled and behaviour is unchanged.

Notes:

- `production-apk` has `autoIncrement: true`, so EAS stamps a fresh
  `versionCode` per build; the publish script registers that exact code so
  in-app update prompts (`updates/latest?version_code=`) keep working.
- JS-only changes should still use `eas update` (sections 1–2) — reserve tags
  for releases that need a new native binary.

## 6. Size tips

- Prefer `eas update` over rebuilds for JS-only changes
- Keep production on `.aab`
- Compress large images and prefer `.webp` where practical
- Remove unused dependencies from `package.json`
- Avoid adding native libraries unless needed
