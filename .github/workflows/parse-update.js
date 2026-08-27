/**
 * Pulls the update id, group and runtime version out of `eas update --json` so the
 * workflow can stamp them onto the ota-* tag.
 *
 * --json has emitted a bare object, an array of one entry per platform, and an
 * { updates: [...] } wrapper across CLI versions, so all three are accepted. The
 * update is already published by the time this runs — a shape it cannot read is
 * worth an "unknown" in the tag, never a failed run.
 */

const fs = require('fs');
const path = require('path');

function pick(raw) {
  if (Array.isArray(raw)) return raw[0] || {};
  if (raw && Array.isArray(raw.updates)) return raw.updates[0] || {};
  return raw || {};
}

let id = '';
let group = '';
let runtime = '';

try {
  const file = path.join(process.cwd(), 'update.json');
  const update = pick(JSON.parse(fs.readFileSync(file, 'utf8')));
  id = update.id || '';
  group = update.group || '';
  runtime = update.runtimeVersion || '';
} catch (err) {
  console.error('could not read update.json:', err.message);
}

console.log(`id=${id} group=${group} runtime=${runtime}`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `id=${id}\ngroup=${group}\nruntime=${runtime}\n`,
  );
}
