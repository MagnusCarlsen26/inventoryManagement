/** Return the next patch version after the highest vMAJOR.MINOR.PATCH tag on origin. */
const { execFileSync } = require('node:child_process');

const remoteTags = execFileSync('git', ['ls-remote', '--tags', '--refs', 'origin', 'v*'], {
  encoding: 'utf8',
});

const versions = remoteTags
  .split('\n')
  .map((line) => /^\S+\s+refs\/tags\/v(\d+)\.(\d+)\.(\d+)$/.exec(line))
  .filter(Boolean)
  .map((match) => match.slice(1).map(Number));

if (versions.length === 0) {
  throw new Error('No vMAJOR.MINOR.PATCH tags found on origin');
}

versions.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
const [major, minor, patch] = versions.at(-1);
console.log(`v${major}.${minor}.${patch + 1}`);
