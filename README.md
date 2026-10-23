# rafieyan.xyz

Personal academic website of Saeed Rafieyan. Built with [Astro](https://astro.build), hosted on [Vercel](https://vercel.com), edited with [Pages CMS](https://pagescms.org).

All content is plain Markdown and YAML in [`src/content/`](src/content). Every change pushed to `main` (or saved in Pages CMS) is live in about a minute.

## Updating the site

### In the browser (also works on a phone)

1. Open **https://app.pagescms.org** and sign in with GitHub.
2. Choose this repository.
3. Edit, then **Save**. Vercel rebuilds the site automatically.

| You want to…                         | In Pages CMS                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Add a new paper                      | **Publications → Add by DOI**, paste the DOI, run. The entry appears in ~1 min. If the paper is already listed as *under review* or *preprint*, that entry is updated in place. |
| Feature a paper on the home page     | Publications → open it → tick **Show on the home page**                      |
| Post a news item                     | **News & posts → Add**: date, one or two sentences, optional link            |
| Write a longer post                  | News & posts → Add, fill in **Post title** and **Post text**                 |
| Change bio, themes, photo, links     | **Profile & home page**                                                      |
| Update the CV                        | **CV**. The PDF at `/files/saeed-rafieyan-cv.pdf` is rebuilt automatically.  |
| Add a project                        | **Projects → Add**: pick the section (current research, or tools and resources) and a status label. Only projects with *Project page text* get their own page; leave it empty for work that is not yet published. |
| Help Google Scholar list a paper     | Give it an **Abstract** (and, if the publisher allows, a **PDF**): every such paper gets its own page at `/publications/<file-name>/`. |
| Upload an image or PDF               | Use the image/file fields; uploads go to `public/uploads` and `public/files`. Resized WebP copies are made at build time. |

New papers are also checked automatically: every Monday a GitHub Action compares your
[ORCID record](https://orcid.org/0000-0002-3018-3683) with the site and opens a pull request
with anything missing. Merge it to publish (you can also trigger it from Pages CMS: **Check ORCID for new papers**).
While that pull request is open, later checks add to it without touching your edits.

*Add by DOI* only accepts papers. Models, datasets and software (e.g. Hugging Face or Zenodo DOIs)
go under **Projects**.

### From your computer

```bash
npm install          # once
npm run dev          # preview at http://localhost:4321
npm run add:doi -- 10.1088/1758-5090/aeb162   # add a paper from its DOI (--force to skip the checks)
npm run sync:orcid   # import anything on ORCID that's not on the site yet
npm run cv:pdf       # rebuild public/files/saeed-rafieyan-cv.pdf (needs Chrome)
npm run build        # check everything before pushing
```

## Search engines and AI search (SEO / GEO)

All of this is generated from the content above; there is nothing to maintain by hand.

- **One page per paper** (`/publications/<id>/`) with the visible abstract, all authors, a ready-made
  reference, BibTeX and Google Scholar `citation_*` tags. PDFs you upload are served from the paper's
  own folder, as Scholar requires; the `/files/` copies (including the CV PDF) are kept out of search,
  and the `/cv/` page is the version search engines index.
- **Structured data** (schema.org JSON-LD): one connected graph of the site, your profile page and
  you as a Person (ORCID, IChF's ROR ID, group, alumni institutions, research topics, profile links),
  with every paper and project pointing back to you. Pages also carry breadcrumbs.
- **Sitemap** (`/sitemap-index.xml`) with real last-modified dates taken from your content.
- **IndexNow**: after each deploy, `.github/workflows/indexnow.yml` tells Bing (and so Copilot) and
  other engines which pages changed. Google reads the sitemap instead.
- **`/llms.txt`**: a plain-text summary of you, your projects and papers for AI tools.
- **Weekly check** (`.github/workflows/redirect-check.yml`): emails you if the sraf.ir redirects
  break or a search/AI crawler is blocked.
- Clean titles and descriptions, `rel="me"` profile links, a `noindex` 404 page, and the
  `rafieyan-xyz.vercel.app` duplicate redirects to the real domain.

## Where things live

```
src/content/profile/profile.md     name, role, links, research focus; body = home-page text
src/content/publications/*.yaml    one file per paper (BibTeX is generated)
src/content/projects/*.md          one file per project; body = optional project page
src/content/news/*.md              news items; with a title + body they become posts
src/content/cv/cv.yaml             education, positions, skills, …
public/uploads/  public/files/     images and PDFs
src/styles/global.css              all design tokens and styles
```

### Conventions

- **Authors**: one per line, `Given Family`. For two-word family names write `Family, Given`
  (e.g. `Partovi Nasr, Minoo`) so initials and BibTeX come out right. Your own name is found and
  bolded automatically (add spelling variants under *Profile → Other spellings of your name*).
- **Topics**: tags such as `scaffold-ml` link papers to the *Research themes* (and *Other research
  collaborations*) on the home page and to the topic filter on the Publications page.
- **Dates**: `YYYY-MM-DD` or `YYYY-MM`.
- **Photos**: phone photos can carry the GPS location where they were taken. The site only serves
  stripped copies, but the original file stays in the (public) repository, so turn location off
  before uploading (iPhone: *Options → Location* off when sharing; Mac Photos: *Export → Remove
  location info*) or upload a screenshot.
- **CV PDF**: rebuilt automatically from the CV page after every CV or publication change. Never
  upload a PDF containing your phone number or referees' details: everything here is public.

### Safety net

Content is checked when the site builds: a malformed DOI, a missing alt text, a paper without you
as an author or a broken project → paper link stops the build with a readable error, and **the live
site keeps the previous version**. Check the deployment on Vercel if a change doesn't appear.
You also get build warnings when the CV date is older than your newest paper or the "Now" line is
more than four months old.

## One-time setup

1. **GitHub**: push this folder to a new **public** repository (e.g. `saeedrafieyan/rafieyan.xyz`).
   On Vercel's free Hobby plan, commits made by GitHub Actions (Add by DOI, CV PDF rebuild) are
   only deployed from public repositories, and everything in it is published on the site anyway.
   Settings → Actions → General → Workflow permissions: leave *Read repository contents* selected
   and tick *Allow GitHub Actions to create and approve pull requests* (for the ORCID check).
   Each workflow asks for the write access it needs.
2. **Vercel**: Add New → Project → import the repository. Framework preset *Astro* is detected;
   no settings or environment variables are needed.
3. **Domain** (Vercel → Project → Settings → Domains): add `rafieyan.xyz` and `www.rafieyan.xyz`
   (redirect `www` to the apex). In Cloudflare DNS for rafieyan.xyz add the records Vercel shows
   (an `A` record for `@`, a `CNAME` for `www`) with the proxy **off** (grey cloud, *DNS only*).
4. **Pages CMS**: open https://app.pagescms.org, sign in with GitHub and install the Pages CMS app
   on **this repository only**.
5. **Old domain**: in Cloudflare, zone `sraf.ir` → Rules → Redirect Rules → Create rule:
   - *Custom filter expression*: `(http.host in {"sraf.ir" "www.sraf.ir"})`
   - *Then*: URL redirect, **Dynamic**, expression `concat("https://rafieyan.xyz", http.request.uri.path)`,
     status **301**, *Preserve query string* on.

   Check it with `curl -I https://sraf.ir/cv/` (expect `301` to `https://rafieyan.xyz/cv/`). Old links
   such as `/publications/`, `/cv/`, `/blog/` and the old PDF paths keep working.
6. **Take the old site down**: the old CV PDFs contain your phone numbers and your referees' emails
   and phone numbers, and they are still public in the old repository. Once the redirect works,
   open github.com/saeedrafieyan/saeedrafieyan.github.io → Settings → *Danger zone* and make the
   repository **private** (or delete it). Deleting the files in a new commit is not enough: every old
   version stays reachable on raw.githubusercontent.com. sraf.ir keeps redirecting because
   Cloudflare answers it. Optionally ask the Internet Archive (info@archive.org) to remove the
   snapshot of `https://sraf.ir/assets/pdf/CV%20-%20Saeed%20Rafieyan.pdf`, and use Google Search
   Console → Removals if the old PDFs appear in search results.
7. **Update links elsewhere**: set the website to https://rafieyan.xyz on ORCID, Google Scholar,
   GitHub, Hugging Face (profile and the TissueGPT model card), LinkedIn and X, and claim your
   Semantic Scholar author page. Search and AI engines use these to recognise you as one person.
8. **Search Console and Bing** (the biggest step for being found, about 30 minutes):
   - At https://search.google.com/search-console, signed in with the Google account that owns the
     sraf.ir property: Add property → Domain → `rafieyan.xyz`, verify with the DNS TXT record
     (Cloudflare → rafieyan.xyz → DNS → TXT `@`). Never delete that record.
   - Submit `https://rafieyan.xyz/sitemap-index.xml`.
   - In the **sraf.ir** property: Settings → Change of address → rafieyan.xyz.
   - At https://www.bing.com/webmasters: add and verify both domains, and submit the same sitemap.
     Bing's current console has no Site Move tool; it follows the 301 redirect.
   - Optional: submit the main pages at https://search.brave.com/submit-url (Brave's index is
     reportedly used by Claude's web search).
   Keep sraf.ir registered and its redirect rule in place for at least a year.
