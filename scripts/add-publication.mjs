#!/usr/bin/env node
// Add a publication from its DOI:   npm run add:doi -- 10.1088/1758-5090/aeb162 [--selected]
// Looks the DOI up on Crossref (or DataCite), writes src/content/publications/<year>-<author>-<words>.yaml.
// Also runs from GitHub: Actions → "Add publication by DOI" → Run workflow.
import { existingPublications, lookupDoi, normalizeDoi, writePublication } from './lib/publications.mjs';

const args = process.argv.slice(2);
const selected = args.includes('--selected');
const dois = args.filter((a) => !a.startsWith('--'));

if (!dois.length) {
  console.error('Usage: npm run add:doi -- <doi> [<doi> …] [--selected]');
  process.exit(1);
}

const existing = await existingPublications();
let failed = false;

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
    const file = await writePublication(pub, { selected });
    existing.dois.add(doi);
    console.log(`✓ ${pub.title}\n  → ${file}  (type: ${pub.type}, status: ${pub.status})`);
    if (!pub.supported) console.log(`  note: Crossref/DataCite calls this "${pub.sourceType}"; check the type field.`);
  } catch (err) {
    failed = true;
    console.error(`✗ ${doi}: ${err.message}`);
  }
}

console.log('\nReview the new file(s): add topics, projects, code/data links, or set selected: true to feature on the home page.');
process.exit(failed ? 1 : 0);
