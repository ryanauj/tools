# web

Client-side-only tools published to GitHub Pages.

Every tool in this directory is pure HTML/CSS/JS — no build step, no server. The directory is served as-is by the `Deploy web tools to GitHub Pages` workflow (`.github/workflows/pages.yml`), so anything under `web/` becomes a route on the published site.

## Layout

```
web/
├── index.html        # landing page listing the tools
├── styles.css        # shared styles for the landing page
└── <tool>/
    └── index.html    # the tool itself
```

## Adding a new tool

1. Create `web/<tool-name>/` with at least an `index.html`.
2. Keep it self-contained — no shared bundler, no relative imports across tools.
3. Add an entry to the landing page (`web/index.html`).
4. If the tool talks to a third-party API, make sure that API supports CORS from the Pages origin.

## Local preview

Any static file server works:

```
python3 -m http.server --directory web 8000
# then open http://localhost:8000/
```
