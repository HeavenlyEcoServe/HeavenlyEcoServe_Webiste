# Heavenly EcoServe website

Fresh Indian Flavours, Delivered Daily. Static website (no server code, no database) for Hostinger shared hosting.
Last built: 12 Oct 2026 19:34

## Put it on Hostinger (Git, recommended)
1. hPanel > **Websites > Manage > Advanced > Git**.
2. Repository: `https://github.com/HeavenlyEcoServe/HeavenlyEcoServe_Webiste.git`  ·  Branch: `main`  ·  Install path: leave blank (this is `public_html`).
   If hPanel says the folder is not empty, delete Hostinger's placeholder file (for example `default.php`) in File Manager first.
3. Click **Create**, then **Deploy**. Turn on **Auto deployment** and add the webhook URL it shows to this repository's
   GitHub **Settings > Webhooks** so every push goes live by itself.
4. hPanel > **Security > SSL**: install the free certificate. The included `.htaccess` then forces HTTPS.

### Connect www.heavenlyecoserve.com
1. **Domain bought at Hostinger:** hPanel > **Domains** > pick `heavenlyecoserve.com` > connect it to this hosting plan (it points itself).
   **Domain bought elsewhere** (GoDaddy, Namecheap, 123-reg...): at your registrar either change the nameservers to the two Hostinger shows in hPanel
   (**Domains > DNS / Nameservers**), or keep your registrar's DNS and add what hPanel lists: an **A record** for `@` pointing at your hosting IP and a
   **CNAME** for `www` pointing at `heavenlyecoserve.com`. Use the exact values hPanel displays.
2. Wait for DNS (usually minutes, sometimes up to 24 hours), then install the free **SSL** certificate (**Security > SSL**).
3. The included `.htaccess` sends `heavenlyecoserve.com`, `http://` and `www` all to **https://www.heavenlyecoserve.com**, so there is only one address.
4. Tell Google: open Search Console, add `https://www.heavenlyecoserve.com`, then submit `https://www.heavenlyecoserve.com/sitemap.xml`.
5. Check: share the link on WhatsApp (the card image and title should appear) and open the site on a phone.

### Or upload by hand
Download this repository as a zip, extract it and upload everything inside to `public_html` with File Manager (include the hidden `.htaccess`).

## Before you go live (the site shows yellow [CONFIRM] notes until these are filled in)
- WhatsApp number, email, opening hours, Food Hygiene Rating
- Delivery area, days, time slots, cut-off, charge
- Allergen information per product (required before customers buy)
- Packaging material (needed for any eco claim), privacy policy and terms pages
- Real photos and videos of your own food (videos go in `media/` as `name.webm` and `name.mp4`, names in the motion guide)

Fill these in on your computer in the admin (**Admin > Business & delivery**, **Site content**), then **Save & publish**.

## Updating the website
1. On your computer, edit prices and content in the admin and press **Save & publish**.
2. Run `python deploy\prepare_deploy.py` in the project folder.
3. Run `git push` inside `deploy\HeavenlyEcoServe_Website`. Hostinger redeploys.

## What is in this repository
`*.html` pages, `css/`, `js/`, `img/` (logo and icons), `media/photos/` (product photos), `sw.js` (offline cache),
`manifest.webmanifest` (install to home screen), `.htaccess` (one address, HTTPS, caching, security headers, 404 page), `robots.txt` and `sitemap.xml` (for search engines).
The admin tool, company records and customer orders are **not** here; they stay on your computer.

Company: Heavenly EcoServe Ltd, registered in England and Wales, company no. 17408427.
