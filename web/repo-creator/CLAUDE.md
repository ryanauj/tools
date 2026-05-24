# repo-creator

Client-side tool to create a GitHub repo + branch ruleset via the REST API.

## Files

- `index.html` — form UI.
- `styles.css` — extends `../styles.css`.
- `app.js` — ES module: token verification, repo creation, scaffold commit, Pages setup, ruleset creation.
- `templates/<id>.js` — scaffold modules, dynamically `import()`ed by id. Each exports `id`, `name`, `requiresInit`, `configurePages`, `commitMessage`, and `files(repoName)`.

## Conventions

- Pure HTML/CSS/JS — no build step (see `../CLAUDE.md`).
- All API calls go through the `gh()` helper in `app.js`. Use `Authorization: Bearer <token>` and `X-GitHub-Api-Version: 2022-11-28`.
- Token lives in memory; `localStorage` only when the user opts in. Never log it.
- Ruleset bypass for repo admins uses `actor_type: "RepositoryRole", actor_id: 5` (the built-in Admin role).

## Test

Manual only — open `index.html` from a local static server, paste a test PAT, create a throwaway repo, confirm the ruleset shows up under repo *Settings → Rules*.
