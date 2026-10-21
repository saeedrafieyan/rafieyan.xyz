#!/usr/bin/env node
// Import any paper on your ORCID record that is not on the site yet:   npm run sync:orcid
// Runs weekly on GitHub (Actions → "Check ORCID for new publications") and opens a pull request.
// Datasets, software and duplicates (e.g. Zenodo copies of a paper) are skipped; list DOIs to
// ignore for good in scripts/orcid-ignore.txt.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, existingPublications, isUpgrade, lookupDoi, normalizeDoi, orcidDois, orcidFromProfile, writePublication } from './lib/publications.mjs';

const orcid = process.argv[2] ?? (await orcidFromProfile());
if (!orcid) {
  console.error('No ORCID iD found in src/content/profile/profile.md (profiles.orcid).');
  process.exit(1);
}

const ignore = new Set(
  (await readFile(path.join(ROOT, 'scripts/orcid-ignore.txt'), 'utf8').catch(() => ''))
    .split('\n')
    .map((l) => normalizeDoi(l.replace(/#.*/, '')))
    .filter(Boolean),
);

const existing = await existingPublications();
const added = [];

for (const doi of await orcidDois(orcid)) {
  if (existing.dois.has(doi) || ignore.has(doi)) continue;
  try {
    const pub = await lookupDoi(doi);
    if (!pub) {
      console.log(`? ${doi}: not found on Crossref/DataCite, skipped`);
      continue;
    }
    if (!pub.supported) {
      console.log(`- ${doi}: ${pub.sourceType}, not a paper, skipped`);
      continue;
    }
    // A published version of an entry listed as a preprint / under review is an upgrade, not a copy.
    const match = existing.byTitle(pub.title);
    const upgrade = isUpgrade(match, pub);
    if (match && !upgrade) {
      console.log(`- ${doi}: same title as an existing entry (probably a copy), skipped`);
      continue;
    }
    const file = await writePublication(pub, { replace: upgrade ? match.file : undefined });
    existing.dois.add(doi);
    const note = upgrade ? ` (now published: updates the ${match.status} entry, keeping its topics, projects and links)` : '';
    added.push(`- ${pub.title} (${pub.venue ?? pub.type}, ${pub.year}) → \`${file}\`${note}`);
    console.log(`✓ ${doi} → ${file}`);
  } catch (err) {
    console.error(`✗ ${doi}: ${err.message}`);
  }
}

console.log(added.length ? `\nAdded ${added.length} publication(s).` : '\nNothing new on ORCID.');
// Consumed by .github/workflows/orcid-check.yml for the pull-request body.
if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import('node:fs/promises');
  await appendFile(process.env.GITHUB_OUTPUT, `added=${added.length}\nsummary<<EOF\n${added.join('\n')}\nEOF\n`);
}
