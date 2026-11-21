# Gaia — site redesign

Standalone redesign of the Kizuna project site, rebuilt around the Gaia identity:
warm editorial, analog film, scrapbook details. No build step, no dependencies.

## Run it

Open `index.html` in a browser. That's it.

To serve it locally:

```
npx serve .
```

## Files

| File | What it holds |
|---|---|
| `index.html` | All five sections: hero, Our Story, The Five Pillars, Knowledge Bridge, Community |
| `styles.css` | The whole visual system — palette, type, film grain, polaroids, torn edges, responsive rules |
| `app.js` | Scroll reveals, hero parallax, and the Knowledge Bridge matcher |

## The palette

| Token | Hex | Used for |
|---|---|---|
| `--butter` | `#F4D875` | The signature yellow — flower fields, accents |
| `--cream` | `#FFF8E9` | Page background |
| `--ivory` | `#F5EEDC` | Alternate section background |
| `--sage` | `#B6C0A0` | Soft green details |
| `--olive` | `#89936A` | Foliage, decorative green |
| `--brown` | `#8A6548` | Secondary text |
| `--terracotta` | `#C98D70` | Warm accents |
| `--forest` | `#344A38` | Headings, dark sections |

Darker variants (`--brown-deep`, `--terracotta-deep`, `--olive-deep`) exist because the
base tones don't reach 4.5:1 contrast on cream. Use the `-deep` ones for any text.

## Photographs

Every image is a **labelled placeholder**, not an invented URL. Each one describes the
shot it needs — look for `class="photo"` in `index.html`.

To drop in a real photo, replace:

```html
<div class="photo"><span>PHOTO — description of the shot</span></div>
```

with:

```html
<img src="images/your-photo.jpg" alt="What the photo shows" style="border-radius:4px">
```

Use real agricultural photography. The polaroid frames, tape and torn edges are all CSS,
so they'll wrap a real photo exactly as they wrap the placeholder.

## The Knowledge Bridge

`app.js` holds a `MATCHES` table: each entry is a Tunisian field condition paired with a
documented Japanese practice, plus the combined recommendation. The form picks the first
match whose `when()` returns true.

When the model is ready, replace `pickMatch()` with a call to your API and keep the same
shape — `render()` won't need to change.

## Still to fill in

Search the files for square brackets:

- `[TEAM MEMBERS]`, `[CONTACT EMAIL]` — footer
- `[EXAMPLE PROFILE]` — the four community cards
- The demo metrics in the Knowledge Bridge are marked as demonstration values in the UI.
  Replace them with your real model output before the pitch, or keep the disclaimer.

## Porting into a React / Next.js project

Each `<section>` is self-contained and uses no JS except what's in `app.js`:

1. Move the `:root` block from `styles.css` into your global stylesheet.
2. Copy each section into its own component (`Hero.jsx`, `Story.jsx`, …).
3. The reveal and parallax logic goes in a `useEffect`; the Knowledge Bridge becomes
   component state instead of `document.getElementById`.

## Accessibility

Skip link, real `<button>` / `<a>` / `<label>` elements, 44px minimum touch targets,
`aria-live` on the Knowledge Bridge result, decorative SVG marked `aria-hidden`, and a
full `prefers-reduced-motion` path that disables parallax and reveals.
