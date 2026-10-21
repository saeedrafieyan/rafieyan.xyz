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
| Add a new paper                      | **Publications → Add by DOI**, paste the DOI, run. The entry appears in ~1 min. |
| Feature a paper on the home page     | Publications → open it → tick **Show on the home page**                      |
| Post a news item                     | **News & posts → Add**: date, one or two sentences, optional link            |
| Write a longer post                  | News & posts → Add, fill in **Post title** and **Post text**                 |
| Change bio, photo, links, "Now" line | **Profile & home page**                                                      |
| Update the CV                        | **CV**. The PDF at `/files/saeed-rafieyan-cv.pdf` is rebuilt automatically.  |
| Add a project                        | **Projects → Add**. Leave *Project page text* empty for no separate page.    |
| Upload an image or PDF               | Use the image/file fields; uploads go to `public/uploads` and `public/files` |

New papers are also checked automatically: every Monday a GitHub Action compares your
[ORCID record](https://orcid.org/0000-0002-3018-3683) with the site and opens a pull request
with anything missing. Merge it to publish (you can also trigger it from Pages CMS: **Check ORCID for new papers**).

### From your computer

```bash
npm install          # once
npm run dev          # preview at http://localhost:4321
npm run add:doi -- 10.1088/1758-5090/aeb162   # add a paper from its DOI
npm run sync:orcid   # import anything on ORCID that's not on the site yet
npm run cv:pdf       # rebuild public/files/saeed-rafieyan-cv.pdf (needs Chrome)
npm run build        # check everything before pushing
```

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
- **Topics**: tags such as `scaffold-ml` link papers to the *Research focus* items on the home page
  and to the topic filter on the Publications page.
- **Dates**: `YYYY-MM-DD` or `YYYY-MM`.

### Safety net

Content is checked when the site builds: a malformed DOI, a missing alt text, a paper without you
as an author or a broken project → paper link stops the build with a readable error, and **the live
site keeps the previous version**. Check the deployment on Vercel if a change doesn't appear.
You also get build warnings when the CV date is older than your newest paper or the "Now" line is
more than four months old.

## One-time setup

1. **GitHub**: push this folder to a new repository (e.g. `saeedrafieyan/rafieyan.xyz`).
   Settings → Actions → General → Workflow permissions → *Read and write* and tick
   *Allow GitHub Actions to create and approve pull requests* (for the ORCID check).
2. **Vercel**: Add New → Project → import the repository. Framework preset *Astro* is detected;
   no settings or environment variables are needed.
3. **Domain** (Vercel → Project → Settings → Domains): add `rafieyan.xyz` and `www.rafieyan.xyz`
   (redirect `www` to the apex). In Cloudflare DNS for rafieyan.xyz add the records Vercel shows
   (an `A` record for `@`, a `CNAME` for `www`) with the proxy **off** (grey cloud, *DNS only*).
4. **Pages CMS**: open https://app.pagescms.org, sign in with GitHub and install the Pages CMS app
   on **this repository only**.
5. **Old domain**: in Cloudflare for `sraf.ir`, add a Redirect Rule (301) from `sraf.ir/*` and
   `www.sraf.ir/*` to `https://rafieyan.xyz/${1}`. Old links such as `/publications/`, `/cv/`,
   `/blog/` and the old PDF paths keep working. Then update the website link on ORCID, GitHub and
   Google Scholar.
