# Gallery Upload Guide

Use this folder for all slideshow media.

## Folder Structure

- `gallery/images/` for photos (`.jpg`, `.jpeg`, `.png`, `.webp`)
- `gallery/videos/` for videos (`.mp4`, `.webm`, `.ogg`)
- `gallery/media-data.js` is the list the website reads

## How to Add New Media

1. Copy your file into `gallery/images/` or `gallery/videos/`.
2. Open `gallery/media-data.js`.
3. Add one item with `src` and `caption`.

Example:

```js
{
  src: 'gallery/images/harvest-day.jpg',
  caption: 'Harvest day at Rethorium Farm'
}
```

For a video:

```js
{
  src: 'gallery/videos/greenhouse-tour.mp4',
  caption: 'Greenhouse tour'
}
```

Then refresh the website. The gallery slideshow updates automatically from this list.

## Removing Photos

1. Delete the unwanted photo from its folder.
2. Remove its entry from `gallery/media-data.js`.
3. If it appears on the homepage or a produce card, update its reference in `index.html` or `farm-data.js` to a remaining photo and adjust the caption or alternative text.
4. Run `node --test tests/site.test.mjs` to check for missing files before publishing.

Keep the remaining filenames unchanged; gaps in the harvest numbers are expected after removals. The slideshow count comes from `gallery/media-data.js` automatically. Publish the file removals and reference updates together through the existing GitHub-connected Pages deployment.
