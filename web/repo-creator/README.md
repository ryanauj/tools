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

The page does two API calls:

- `POST /user/repos` (or `POST /orgs/{org}/repos`) to create the repo.
- `POST /repos/{owner}/{repo}/rulesets` to add a branch ruleset on the default branch.

The ruleset can require approving reviews, dismiss stale reviews on push, require code owner review, require last push approval, block force pushes, and block deletion. If "Let repository admins bypass" is checked (default), the built-in `Admin` role is added as a bypass actor so the owner can push/merge directly.

## Notes

- An empty (non-auto-initialized) repo has no default branch yet, so the ruleset step is skipped. Push a first commit, then add a ruleset manually or re-run.
- Your token stays in the browser. The "Remember" checkbox stores it in `localStorage` on this origin.
- No backend, no analytics, no third-party JS.

## Local preview

```
python3 -m http.server --directory ../.. 8000
# then open http://localhost:8000/web/repo-creator/
```
