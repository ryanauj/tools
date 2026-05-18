# tools

A collection of standalone tools, scripts, and libraries — each in its own subdirectory.

## Structure

```
tools/
├── README.md          # This file
├── CLAUDE.md          # AI assistant conventions for the repo
├── .gitignore         # Root-level ignore patterns
├── tool-a/
│   ├── CLAUDE.md      # Tool-specific AI context
│   ├── .gitignore     # Tool-specific ignores
│   ├── README.md      # What it does, how to use it
│   └── ...
├── tool-b/
│   └── ...
└── ...
```

## Adding a new tool

1. Create a new directory at the root: `mkdir my-tool`
2. Add a `README.md` describing what it does and how to use it
3. Add a `CLAUDE.md` with build/test/lint commands and any conventions
4. Add a `.gitignore` if the tool has language-specific artifacts
5. Develop as usual — each tool is self-contained

## Conventions

- Each subdirectory is independent — its own language, dependencies, and build system
- No shared build tooling or dependency management across tools
- Keep each tool focused and small

## Sections

- **`web/`** — client-side-only tools (pure HTML/CSS/JS) published to GitHub Pages via `.github/workflows/pages.yml`. Live at [ryanauj.github.io/tools](https://ryanauj.github.io/tools/). See `web/README.md`.
