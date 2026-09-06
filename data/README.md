# Momo Editions public gallery data

`momo-editions-gallery.json` is the content and presentation source for the Kahntra.com Momo Editions gallery.

To add or revise an Edition:

1. Add or replace its compressed WebP under `assets/momo-editions/`.
2. Add or update the exact manifest row, including order, public metadata, alternative text, `showInGallery`, and `railFraming`.
3. Keep manifest image paths in the portable `assets/<filename>.webp` form; the website mounts them from `assets/momo-editions/`.
4. Run:

   ```sh
   node scripts/validate-momo-editions-gallery.mjs
   node --test scripts/validate-momo-editions-gallery.test.mjs
   ```

5. Review the gallery at desktop and mobile widths before deployment.

Selecting the large artwork opens or closes its complete read-only details in one click or tap. Desktop hover remains a title-only preview.

The Kahntra Showcase initially presents a same-size visual curtain. Entering removes that cover without resizing or shifting the page and transfers focus into the gallery.

Use `showInGallery: false` to temporarily remove an Edition from the public gallery presentation while preserving its image, metadata, and ordering for later restoration.

The manifest is public and fail-closed. Do not add private curator notes, ratings, watch history, recommendation evidence, editing state, account data, or application controls.
