# Sunset Cover Studio — Make GTA 6 Cover Art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/oxizbinance-aox/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/oxizbinance-aox/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A web app that turns your photo and a caption into GTA-style poster art —
multi-panel covers with bold lettering and a sunset or neon grade — exported
as a PNG to share.

**Entry for the make.fun bounty [`gta6-cover-art-01`](https://make.fun/bounty/gta6-cover-art-01)**
— $250 in prizes over 50 places. Deadline 21 Nov 2026.

## What it does

1. **Any photo.** Add your own photos from your machine (or use the built-in
   original sample art) and fill one panel or several.
2. **Crop and position.** Click a panel to select it, drag to move its photo,
   scroll or slide to zoom, swap photos between panels.
3. **Four layouts.** Hero + Duo, Quad, Duo and Solo — the multi-panel poster
   look with a white poster frame.
4. **Caption your way.** Editable title and tagline, four title colours,
   Anton display type with a poster underline bar.
5. **Four colour grades.** Vice City Sunset, Neon Night, Golden Hour and Noir
   — each a photo filter plus a tint, a low sun and a vignette.
6. **One-click export.** PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## Run it

Serve the `app/` folder with any static server and open `index.html` in
desktop Chrome. It works with no network request — every script, font and
image is a file under `app/`, and photos are read on your own machine, never
uploaded.

```sh
cd app
python3 -m http.server 8080
# open http://localhost:8080
```

## Files

- `app/index.html`, `app/style.css`, `app/app.js` — the editor and canvas renderer
- `app/sample.svg` — original sunset illustration (sample art, drawn for this app)
- `app/fonts/Anton-Regular.ttf` — Anton typeface, SIL Open Font License
- `main.ts` — hands the entry in (copies `app/` + `screenshots/`, writes `dossier.json`)
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged
- `screenshots/` — the cover and the app at work

Everything in this app is original: no Rockstar Games logo, artwork or font.
