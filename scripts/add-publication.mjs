#!/usr/bin/env node
// Add a publication from its DOI:   npm run add:doi -- 10.1088/1758-5090/aeb162 [--selected] [--force]
// Looks the DOI up on Crossref (or DataCite), writes src/content/publications/<year>-<author>-<words>.yaml.
// Also runs from Pages CMS (Publications → Add by DOI) and GitHub (Actions → "Add publication by DOI").
// Only papers are accepted: models, datasets and software belong under Projects. --force overrides
// that check and the duplicate-title check.
import { existingPublications, isUpgrade, lookupDoi, normalizeDoi, writePublication } from './lib/publications.mjs';

const args = process.argv.slice(2);
const selected = args.includes('--selected');
const force = args.includes('--force');
const dois = args.filter((a) => !a.startsWith('--'));

if (!dois.length) {
  console.error('Usage: npm run add:doi -- <doi> [<doi> …] [--selected]');
  process.exit(1);
}

const existing = await existingPublications();
let failed = false;
let added = 0;

for (const raw of dois) {
  const doi = normalizeDoi(raw);
  if (existing.dois.has(doi)) {
    console.log(`• ${doi} is already on the site, skipped.`);
    continue;
  }
  try {
    const pub = await lookupDoi(doi);
    if (!pub) throw new Error('not found on Crossref or DataCite');
    if (!pub.title || !pub.authors.length || !pub.year) throw new Error('the record is missing a title, authors or year');
    if (!pub.supported && !force) {
      throw new Error(`Crossref/DataCite calls this "${pub.sourceType}", not a paper. Add it as a project instead (or run locally with --force).`);
    }
    const match = existing.byTitle(pub.title);
    const upgrade = isUpgrade(match, pub);
    if (match && !upgrade && !force) {
      throw new Error(`"${pub.title}" is already on the site as ${match.file} (another DOI: preprint or repository copy?). Edit that entry instead (or run locally with --force).`);
    }
    const file = await writePublication(pub, { selected, replace: upgrade ? match.file : undefined });
    existing.dois.add(doi);
    added++;
    console.log(`✓ ${pub.title}\n  → ${file}  (type: ${pub.type}, status: ${pub.status})`);
    if (upgrade) console.log(`  replaced the ${match.status} entry in place, keeping its topics, projects and links`);
  } catch (err) {
    failed = true;
    console.error(`✗ ${doi}: ${err.message}`);
  }
}

if (added) console.log('\nReview the new file(s): add topics, projects, code/data links, or set selected: true to feature on the home page.');
// Consumed by .github/workflows/add-publication.yml.
if (process.env.GITHUB_OUTPUT) {
  const { appendFile } = await import('node:fs/promises');
  await appendFile(process.env.GITHUB_OUTPUT, `added=${added}\n`);
}
process.exit(failed ? 1 : 0);
