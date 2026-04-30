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
