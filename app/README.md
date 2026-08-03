# Window Depot Visualizer

In-home sales presentation tool for Window Depot. A rep photographs the home, confirms
which surfaces are changing, picks products, and shows the homeowner a generated
visualization of the finished result — on a tablet, in a landscape window, with the whole
flow usable when the signal drops.

Implemented from the Claude Design handoff in `../project/Window Depot Visualizer.dc.html`,
against the Industry design system in `src/styles/ds-industry.css`.

## Running it

```
npm install
cp .env.example .env      # then fill in the keys below
npm run dev               # http://localhost:5173
```

```
npm run build && npm run preview    # production build on http://localhost:4173
```

`npm run dev`, `npm run preview` and the Vercel deployment all serve `/api/generate`,
`/api/detect` and `/api/settings` from the same handlers in `server/`, so behaviour is
identical in all three. Tests: `npx vitest run`. Typecheck: `npx tsc -b --noEmit`.

## Screens

`Home → Customers → Photos → Areas → Design → Compare → Selections → Summary`, plus a
product library, a Settings screen, a full-screen presentation mode with a drag-to-reveal
before/after slider, an offline/sync sheet, and toasts. Screens live in `src/screens/` and
share one state hook, `src/store.ts`.

## How a render is built

1. **Photos** are normalised at capture to one of the image API's output sizes
   (`src/lib/image.ts`), cover-cropped and EXIF-rotated. That single decision is what lets
   the photo, the mask and the result share one coordinate system.
2. **Areas** are found by Claude reading the photograph (`server/detect.mjs`), returned as
   normalised 0..1 polygons, and editable by hand — drag a vertex, alt-click to delete one,
   or draw a new area from scratch. Detection is only ever allowed to return categories the
   catalogue can price; the client sends that list with the request.
3. **Design** collects a product line and colour per category.
4. **Render** posts, in one call to `/api/generate`: the photo, a mask that is the union of
   every confirmed polygon, and one *material reference image* per category — real texture
   art if the catalogue has it, otherwise a flat tile of the chosen colour. The image API
   takes up to ten images and applies the mask to the first, so the photograph leads.
   Instruction lines cite their reference by ordinal.

Renders always edit the **original** photo, never a previous render, so re-rendering never
compounds artifacts. Re-rendering one category is the same code path with one category.

The output size is derived from the photograph rather than configured, so the result comes
back in the same frame as the original and the before/after slider lines up.

## Configuration

Provider keys are read server-side only and are never sent to the browser. There is no way
to enter one in the app: this tablet spends its day unlocked on other people's tables, and
a key held in the browser is readable by anyone who picks it up.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required for rendering. Without it every other screen still works. |
| `OPENAI_IMAGE_MODEL` | Defaults to `gpt-image-1`. |
| `OPENAI_IMAGE_SIZE` | Fallback only, used when a photo's dimensions cannot be read. |
| `ANTHROPIC_API_KEY` | Required for area detection. Without it, areas are drawn by hand. |
| `ANTHROPIC_MODEL` | Defaults to `claude-opus-5`. |
| `GENERATE_TIMEOUT_MS` | Server-side render budget. `vercel.json` sets 55s to stay inside the function ceiling. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Optional. Without them the app is local-only. |

`/api/settings` reports whether each key is present, which model it will be used with, and
its last four characters — never the key itself. `POST {"test":"render"}` makes a free
metadata call against the provider to prove the key works and the model name is real.

## Settings

Everything else is configured in-app and stored on the tablet:

- **This rep** — name, market, number, phone, email. Appears in the header and on the PDF
  the homeowner keeps.
- **Rendering** — client-side render timeout, and how many material references to attach.
- **Product catalogue** — categories, product lines, colours, prices, and the configuration
  details read out to the homeowner. Two fields reach beyond the screen: `visualizable`
  decides what detection may return, and an uploaded swatch texture becomes the material
  reference sent to the renderer.
- **Pricing import** — merges a CSV or the older app's JSON export. Rows key on category
  and series; existing colours are never touched.
- **Data** — export/import the settings and catalogue as one file, or restore the defaults.

The catalogue is seeded from `PANEL` in `src/data.ts` on first run and owned by the rep
after that. `src/lib/catalog.ts` caches it at module level and `src/main.tsx` primes it
before the first paint, because the prompt and reference builders read it synchronously.

## Storage

IndexedDB is the source of truth during an appointment (`src/lib/db.ts`): customers,
projects, photos, areas, selections, renders, the catalogue and these settings. Writes also
go to an outbox (`src/lib/sync.ts`) that drains to Supabase when there is signal, dropping a
row after six failed attempts rather than blocking the queue forever. Schema and RLS
policies are in `../supabase/migrations/0001_init.sql`.

A service worker caches the app shell so a reload in a driveway with no bars still opens.
API responses are never cached — a stale render would be worse than an honest failure.

## Notes

- Fonts (Barlow, Barlow Condensed) are self-hosted in `public/fonts/`. The design system
  originally imported them from Google Fonts; that would break the offline story.
- The PDF stack (~390 kB) and the settings screen are code-split, loaded only when used.
