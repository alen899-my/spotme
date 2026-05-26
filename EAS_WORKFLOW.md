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

## 4. Size tips

- Prefer `eas update` over rebuilds for JS-only changes
- Keep production on `.aab`
- Compress large images and prefer `.webp` where practical
- Remove unused dependencies from `package.json`
- Avoid adding native libraries unless needed
