# Tools Monorepo

This is a monorepo containing independent tools and libraries, each in its own subdirectory.

## Repo structure

- Each tool lives in its own top-level directory (e.g., `my-tool/`)
- Each tool is self-contained with its own language, dependencies, build system, and docs
- Tool-specific CLAUDE.md files in each subdirectory contain build/test/lint commands for that tool

## When adding a new tool

- Create a new top-level directory with a descriptive name (kebab-case)
- Always include: README.md, CLAUDE.md, .gitignore
- The CLAUDE.md should document: build, test, and lint commands, plus any conventions
- Tools may depend on other tools in the repo during development, but published artifacts should always be usable standalone

## General conventions

- Each tool should work standalone without needing anything else in this repo

## Sections

- `web/` — client-side-only tools (pure HTML/CSS/JS). Deployed to GitHub Pages via `.github/workflows/pages.yml`. See `web/CLAUDE.md` for conventions.
