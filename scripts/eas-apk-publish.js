'use strict';

/**
 * CI helper: publish a finished EAS cloud APK to the SpotMe backend.
 *
 * Input (env):
 *   EAS_BUILD_JSON   path to `eas build --json` output (object or array)
 *   API_BASE_URL     e.g. https://spotme-api.duckdns.org/api
 *   ADMIN_BUILD_TOKEN  service token (backend ADMIN_BUILD_TOKEN)
 *   RELEASE_TAG      e.g. v1.1.0
 *   BUILD_CHANNEL    default "production"
 *   APK_OUT          default "spotme-release.apk"
 *
 * Flow: parse build URL -> download APK -> presigned R2 URL -> PUT file ->
 * POST /admin/builds -> verify GET /updates/latest.
 * Only node built-ins are used so CI needs no extra install.
 */

const fs = require('fs');
const path = require('path');

const MAX_BYTES = 1024 * 1024 * 1024; // 1GB, mirrors backend + admin form limit
const APK_MIME = 'application/vnd.android.package-archive';

function fail(msg) {
  console.error(`[eas-apk-publish] ERROR: ${msg}`);
  process.exit(1);
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function asBuildObject(parsed) {
  if (Array.isArray(parsed)) {
    // Prefer the newest finished build; fall back to last element.
    const finished = parsed.filter(
      (b) => b?.status === 'finished' || b?.buildStatus === 'FINISHED'
    );
    return finished[finished.length - 1] ?? parsed[parsed.length - 1];
  }
  // Some CLI versions nest under { builds: [...] } or { build: {...} }.
  if (parsed?.builds) return asBuildObject(parsed.builds);
  if (parsed?.build) return parsed.build;
  return parsed;
}

async function downloadToFile(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) fail(`APK download failed: HTTP ${res.status} from EAS artifact URL`);
  const total = Number(res.headers.get('content-length') || 0);
  if (total > MAX_BYTES) fail(`APK size ${total} exceeds 1GB limit`);
  const file = fs.createWriteStream(dest);
  let received = 0;
  for await (const chunk of res.body) {
    received += chunk.length;
    if (received > MAX_BYTES) {
      file.destroy();
      fs.rmSync(dest, { force: true });
      fail('APK stream exceeded 1GB limit');
    }
    file.write(chunk);
  }
  await new Promise((resolve, reject) => {
    file.end((err) => (err ? reject(err) : resolve()));
  });
  return received;
}

async function api(base, token, method, route, body) {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    fail(`${method} ${route} -> HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return data;
}

async function main() {
  const base = (process.env.API_BASE_URL || '').replace(/\/$/, '');
  const token = process.env.ADMIN_BUILD_TOKEN;
  const tag = process.env.RELEASE_TAG || '';
  const channel = process.env.BUILD_CHANNEL || 'production';
  const jsonPath = process.env.EAS_BUILD_JSON || 'eas-build.json';
  const apkOut = process.env.APK_OUT || 'spotme-release.apk';

  if (!base) fail('API_BASE_URL env is required');
  if (!token) fail('ADMIN_BUILD_TOKEN env is required');
  if (!fs.existsSync(jsonPath)) fail(`EAS build JSON not found: ${jsonPath}`);

  const version = tag.replace(/^v/, '').trim();
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    fail(`RELEASE_TAG must look like v1.2.3 (got "${tag}")`);
  }

  const build = asBuildObject(JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
  const artifacts = build?.artifacts ?? {};
  const buildUrl =
    pick(artifacts, ['buildUrl', 'applicationArchiveUrl', 'artifactUrl']) ??
    pick(build, ['buildUrl', 'artifactUrl', 'artifactURL']);
  if (!buildUrl) fail('No artifact URL found in EAS build JSON');

  const easBuildId = pick(build, ['id', 'buildId', 'build_id']) ?? 'unknown';
  console.log(`[eas-apk-publish] EAS build id: ${easBuildId}`);

  // versionCode: prefer what EAS actually stamped (autoIncrement), then the
  // live latest row +1, then app.json. Missing code disables in-app update
  // prompts (updates.service requires non-null), so never silently omit it.
  let versionCode =
    pick(build?.android ?? {}, ['versionCode', 'version_code']) ??
    pick(build, ['versionCode', 'buildVersion', 'version_code', 'appVersionCode']);
  let codeSource = 'eas-build-json';
  if (versionCode == null) {
    const latest = await api(base, token, 'GET', `/updates/latest?channel=${channel}`);
    const live = latest?.build?.version_code;
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    const local = appJson?.expo?.android?.versionCode;
    versionCode = live != null ? Number(live) + 1 : local;
    codeSource = live != null ? 'latest-plus-one' : 'app.json';
  }
  versionCode = Number(versionCode);
  if (!Number.isInteger(versionCode) || versionCode < 1) {
    fail(`Could not resolve a valid versionCode (got "${versionCode}")`);
  }
  console.log(`[eas-apk-publish] version=${version} versionCode=${versionCode} (source: ${codeSource})`);

  const bytes = await downloadToFile(buildUrl, apkOut);
  console.log(`[eas-apk-publish] downloaded ${(bytes / 1048576).toFixed(1)} MB -> ${apkOut}`);
  if (bytes < 1024 * 1024) fail(`Downloaded file suspiciously small (${bytes} bytes)`);

  const filename = `spotme-v${version}-${String(easBuildId).slice(0, 8)}.apk`;
  const presigned = await api(base, token, 'POST', '/admin/builds/presigned-url', {
    filename,
    fileType: APK_MIME,
    fileSize: bytes,
  });
  if (!presigned?.uploadUrl || !presigned?.fileKey || !presigned?.fileUrl) {
    fail('presigned-url response missing uploadUrl/fileKey/fileUrl');
  }

  const putRes = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': APK_MIME, 'Content-Length': String(bytes) },
    body: fs.readFileSync(path.resolve(apkOut)),
    duplex: 'half',
  });
  if (!putRes.ok) fail(`R2 upload failed: HTTP ${putRes.status}`);
  console.log(`[eas-apk-publish] uploaded to R2: ${presigned.fileUrl}`);

  const created = await api(base, token, 'POST', '/admin/builds', {
    title: `SpotMe v${version} production`,
    description: `Automated EAS release ${tag} (production-apk). EAS build ${easBuildId}.`,
    build_channel: channel,
    version,
    version_code: String(versionCode),
    force_update: '0',
    file_key: presigned.fileKey,
    file_url: presigned.fileUrl,
    file_size: bytes,
    file_type: 'apk',
  });
  console.log(`[eas-apk-publish] build row id: ${created?.build?.id ?? 'unknown'}`);

  const verify = await api(base, token, 'GET', `/updates/latest?channel=${channel}`);
  if (verify?.build?.file_url !== presigned.fileUrl) {
    fail('Verification failed: /updates/latest did not return the new file_url');
  }
  console.log('[eas-apk-publish] verified: latest build serves the new APK.');
}

main().catch((err) => fail(err?.message || String(err)));
