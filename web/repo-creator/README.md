# repo-creator

Create a new GitHub repository with a branch protection ruleset already in place — pull requests required, reviews required, admins bypass — all from a single page in your browser.

## Usage

1. Open the tool in a browser (locally or via GitHub Pages).
2. Paste a GitHub Personal Access Token. Either:
   - A **fine-grained PAT** with `Administration: Read & Write` and `Contents: Read & Write` on the target user/org, or
   - A **classic PAT** with the `repo` scope (and `admin:org` if creating in an org).
3. Click *Verify token* — confirms auth and pre-fills the owner.
4. Fill in the repo name, description, visibility, and any initial-content options.
5. Adjust the branch protection settings as desired.
6. Click *Create repository*.

The page makes these API calls in order:

- `POST /user/repos` (or `POST /orgs/{org}/repos`) to create the repo.
- *(Optional, scaffold templates only)* `git/trees` + `git/commits` + `git/refs` to land all template files in a single commit, then `POST /repos/{owner}/{repo}/pages` with `build_type: "workflow"` to enable Pages on Actions.
- `POST /repos/{owner}/{repo}/rulesets` to add a branch ruleset on the default branch.

The ruleset can require approving reviews, dismiss stale reviews on push, require code owner review, require last push approval, block force pushes, and block deletion. If "Let repository admins bypass" is checked (default), the built-in `Admin` role is added as a bypass actor so the owner can push/merge directly.

## Notes

- An empty (non-auto-initialized) repo has no default branch yet, so the ruleset step is skipped. Push a first commit, then add a ruleset manually or re-run.
- Your token stays in the browser. The "Remember" checkbox stores it in `localStorage` on this origin.
- No backend, no analytics, no third-party JS.

## Templates

Scaffold templates live in `templates/` and are loaded on demand. Each module exports:

- `id`, `name` — identifiers shown in the dropdown.
- `requiresInit: boolean` — when true, the repo is auto-initialized so the template's commit has a parent.
- `configurePages: boolean` — when true, GitHub Pages is enabled with `build_type: "workflow"` after the commit.
- `commitMessage: string` — the message used for the single scaffold commit.
- `files(repoName): { path, content }[]` — the file set, returned each call so values that depend on the repo name (Vite `base`, package name, etc.) can be templated.

Available templates:

- **`vite-react-ts`** — Vite 5 + React 18 + TypeScript 5 + pnpm 10, with `ci.yml` (typecheck + build on PR/main) and `deploy.yml` (build + `actions/deploy-pages@v4` on `main`). Sets `base: "/<repo>/"` in `vite.config.ts`.

To add a new template, create `templates/<id>.js` with the exports above and add an `<option>` to the `#template` select in `index.html`.

## Local preview

```
python3 -m http.server --directory ../.. 8000
# then open http://localhost:8000/web/repo-creator/
```
