# Rethorium Farm website

Public site: https://rethorioum-farm.pages.dev/

Admin sign-in: https://rethorioum-farm.pages.dev/admin/

The private initial password is in `.admin-access.txt` on the owner's computer. This file is ignored by Git and blocked from website requests. Never upload or commit it.

## Manage the catalogue

Sign in, enter a price in Nigerian naira, choose its unit and availability, and select **Save product**. Leave a price blank to show **Request price**. Blank is not zero or free. Saved changes are stored in Cloudflare D1 and are used when visitors load the public site. Each card saves independently. A success message appears only after the server confirms persistence; failed saves keep the entered values. An edit conflict requires refreshing before retrying.

Delivery information is editable below the products. Publish actual delivery areas, fees, collection location and minimum quantities only after confirming them. The initial copy asks customers to confirm these details with the farm.

The public enquiry form prepares a WhatsApp message. The customer reviews it and chooses whether to send it. The website does not receive payment, reserve stock or confirm an order.

## Website content

`farm-data.js` contains category names, descriptions and fallback imagery. The live database owns prices, units, availability and delivery text. The fallback intentionally shows no prices and no confirmed stock if the service is unavailable. Photos for categories without a matching farm photograph use illustrations instead of unrelated stock photographs.

Gallery photos and captions are in `gallery/media-data.js`. Keep captions accurate to the pictured activity. The slideshow supports pause/resume, keyboard controls, focus/hover pauses and reduced-motion preferences.

## Hosting and maintenance

The public site and admin interface use the existing GitHub-connected Pages project. Push checked website changes to `main` to trigger its deployment. Pages Functions proxy the catalogue API so admin cookies stay on the website's own domain.

The catalogue API is the `rethorium-farm-catalogue` Worker in the signed-in Cloudflare account. Its configuration and database migrations are in `backend/`. Use Wrangler 4.118.0 (the validated version) for maintenance:

```powershell
npx wrangler@4.118.0 deploy --config backend/wrangler.jsonc
npx wrangler@4.118.0 d1 migrations apply rethorium-farm-catalogue --remote --config backend/wrangler.jsonc
node --test tests/catalogue.test.mjs tests/site.test.mjs
```

The admin password is stored as a salted PBKDF2 verifier in a Worker secret. Sessions use secure HttpOnly cookies and expire after eight hours. Signing out revokes that session. Do not put authentication secrets in public files or browser storage. Rate limits and version checks protect sign-in and catalogue edits. No customer enquiries are stored by this website.
