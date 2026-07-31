# Window Depot Visualizer

In-home sales presentation tool for Window Depot of Milwaukee. A rep photographs the
home, confirms which surfaces are changing, picks products, and shows the homeowner a
generated visualization of the finished result — on a tablet, in a landscape 1366×1024
window, with the whole flow usable when the signal drops.

Implemented from the Claude Design handoff in `../project/Window Depot Visualizer.dc.html`,
against the Industry design system in `src/styles/ds-industry.css`.

## Running it

```
npm install
cp .env.example .env      # then fill in OPENAI_API_KEY
npm run dev               # http://localhost:5173
```

```
npm run build && npm run preview    # production build on http://localhost:4173
```

`npm run dev` and `npm run preview` both serve `POST /api/generate` from the same handler
(`server/generate.mjs`), so image generation behaves identically in both.

## Screens

`Home → Customer → Categories → Photos → Areas → Visualizer → Compare → Selections → Summary`,
plus a Product library, a full-screen Presentation mode with a drag-to-reveal
before/after slider, an offline/sync sheet, and toasts. All screens live in `src/screens/`
and share one state hook, `src/store.ts`.

## Image generation

The **Generate visualization** button posts the original photo plus one instruction line
per confirmed area to `/api/generate`. The server composes the final prompt — including
the guardrails that keep camera angle, lighting and everything outside the selected
surfaces unchanged — and calls the OpenAI images edit endpoint.

Configure it in `.env`:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required. Read server-side only; never sent to the browser. |
| `OPENAI_IMAGE_MODEL` | Exact model id from your OpenAI dashboard. Defaults to `gpt-image-1`. |
| `OPENAI_IMAGE_SIZE` | Output size. Defaults to `1536x1024` (landscape). |

If the key is missing or the call fails, the app falls back to the bundled after-photo and
says so in a toast, so a demo never dead-ends in front of a homeowner.

The instructions sent to the model are built by `buildInstructions()` in `src/store.ts` —
it groups the confirmed areas by category and names the product line, colour and
configuration for each. Renders always edit the **original** photo, never a previous
render, so re-rendering never compounds artifacts.

Areas are currently sent as prose ("the rear wall siding and second story siding") rather
than as a pixel mask. The area rectangles in `src/data.ts` carry the geometry if you later
want to rasterise them into a real mask and pass it to the edits endpoint.

## Notes

- Fonts (Barlow, Barlow Condensed) are self-hosted in `public/fonts/`. The design system
  originally imported them from Google Fonts; that would break the offline story this tool
  is built around.
- Customer, project and product data is the fixture data from the design. There is no
  backend or persistence yet — reloading resets the session.
