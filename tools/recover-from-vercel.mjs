// Downloads the source code of a Vercel deployment into this repo.
// Usage (PowerShell, from the repo root):
//   $env:VERCEL_TOKEN="<token from vercel.com/account/tokens>"
//   node tools/recover-from-vercel.mjs
// Optional: $env:DEPLOYMENT_ID="dpl_..." to pick another deployment.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const TOKEN = process.env.VERCEL_TOKEN;
const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_wnbhfk7945aXLA9pCiWX8hUn';
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID || 'dpl_8hw3JppUEu1yydTDNBWpLU9LTJRx';
const OUT_DIR = resolve(process.env.OUT_DIR || '.');

if (!TOKEN) {
  console.error('Set VERCEL_TOKEN first. Create one at https://vercel.com/account/tokens (scope: Option Rangers team).');
  process.exit(1);
}

const api = (path) =>
  fetch(`https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${TEAM_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

const treeRes = await api(`/v6/deployments/${DEPLOYMENT_ID}/files`);
if (!treeRes.ok) {
  console.error('Could not list files:', treeRes.status, await treeRes.text());
  process.exit(1);
}
const tree = await treeRes.json();

// Collect source files. Vercel puts uploaded source under "src"; skip build output ("out").
const files = [];
function walk(nodes, prefix) {
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'directory') walk(n.children || [], p);
    else if (n.type === 'file') files.push({ path: p, uid: n.uid });
  }
}
const srcRoot = tree.find((n) => n.name === 'src' && n.type === 'directory');
walk(srcRoot ? srcRoot.children : tree.filter((n) => n.name !== 'out'), '');

console.log(`Found ${files.length} source files in ${DEPLOYMENT_ID}`);

for (const f of files) {
  const res = await api(`/v8/deployments/${DEPLOYMENT_ID}/files/${f.uid}`);
  if (!res.ok) {
    console.error(`  FAILED ${f.path}: ${res.status}`);
    continue;
  }
  const type = res.headers.get('content-type') || '';
  let buf;
  if (type.includes('application/json')) {
    const body = await res.json();
    buf = typeof body.data === 'string' ? Buffer.from(body.data, 'base64') : Buffer.from(JSON.stringify(body, null, 2));
  } else {
    buf = Buffer.from(await res.arrayBuffer());
  }
  const target = join(OUT_DIR, f.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buf);
  console.log(`  saved ${f.path} (${buf.length} bytes)`);
}

console.log('Done. Review the files, then commit. Do NOT commit any .env file.');
