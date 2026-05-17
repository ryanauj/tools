# web

Client-side-only tools published to GitHub Pages via `.github/workflows/pages.yml`.

## Conventions

- Pure HTML/CSS/JS. No build step, no bundler, no framework that requires compilation.
- Each tool lives in `web/<tool-name>/` with its own `index.html`.
- Tools must work when served as static files from any subpath (Pages serves under `/<repo>/`). Use relative URLs, never absolute paths starting with `/`.
- Third-party APIs must support CORS from the Pages origin.
- When adding a new tool, also add a card to `web/index.html`.

## Local preview

```
python3 -m http.server --directory web 8000
```

## Test

No automated tests — verify by loading in a browser.
