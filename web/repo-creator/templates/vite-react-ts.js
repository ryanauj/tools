export const id = "vite-react-ts";
export const name = "Vite + React + TS + pnpm + GH Pages";
export const requiresInit = true;
export const configurePages = true;
export const commitMessage = "Scaffold Vite + React + TypeScript + GitHub Pages";

export function files(repoName) {
  const base = `/${repoName}/`;
  return [
    { path: "package.json", content: packageJson(repoName) },
    { path: "tsconfig.json", content: tsconfig },
    { path: "vite.config.ts", content: viteConfig(base) },
    { path: "index.html", content: indexHtml(repoName) },
    { path: "src/main.tsx", content: mainTsx },
    { path: "src/App.tsx", content: appTsx(repoName) },
    { path: "src/styles.css", content: stylesCss },
    { path: ".gitignore", content: gitignore },
    { path: ".github/workflows/ci.yml", content: ciYml },
    { path: ".github/workflows/deploy.yml", content: deployYml },
    { path: "README.md", content: readme(repoName) },
  ];
}

const packageJson = (name) => JSON.stringify({
  name,
  private: true,
  version: "0.0.0",
  type: "module",
  packageManager: "pnpm@10.33.0",
  scripts: {
    dev: "vite",
    build: "tsc && vite build",
    preview: "vite preview",
    typecheck: "tsc --noEmit",
  },
  dependencies: {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
  },
  devDependencies: {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    typescript: "^5.6.3",
    vite: "^5.4.10",
  },
}, null, 2) + "\n";

const tsconfig = JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    module: "ESNext",
    moduleResolution: "Bundler",
    jsx: "react-jsx",
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    isolatedModules: true,
    skipLibCheck: true,
    useDefineForClassFields: true,
    types: ["vite/client"],
  },
  include: ["src", "vite.config.ts"],
}, null, 2) + "\n";

const viteConfig = (base) => `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '${base}',
})
`;

const indexHtml = (name) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const mainTsx = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`;

const appTsx = (name) => `export default function App() {
  return (
    <main>
      <h1>${name}</h1>
      <p>Vite + React + TypeScript, deployed to GitHub Pages.</p>
      <p>Edit <code>src/App.tsx</code> and save to start.</p>
    </main>
  )
}
`;

const stylesCss = `:root {
  color-scheme: dark light;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

body { margin: 0; }

main {
  max-width: 720px;
  margin: 64px auto;
  padding: 0 24px;
}

h1 { margin-top: 0; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.95em;
}
`;

const gitignore = `node_modules
dist
.vite
coverage
*.log
.env
.env.*
!.env.example
.DS_Store
`;

const ciYml = `name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
      - run: pnpm run build
`;

const deployYml = `name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;

const readme = (name) => `# ${name}

Vite + React + TypeScript single-page app, deployed to GitHub Pages via Actions.

## Local

\`\`\`sh
pnpm install
pnpm dev
\`\`\`

## Build

\`\`\`sh
pnpm build      # tsc --noEmit + vite build to dist/
pnpm preview    # serve the production build locally
pnpm typecheck  # tsc --noEmit
\`\`\`

## Deploy

Push to \`main\` — the \`Deploy\` workflow publishes \`dist/\` to GitHub Pages.

One-time repo setting (already configured if you used \`repo-creator\`):
**Settings → Pages → Source = GitHub Actions**.

The site is served under the repo's base path. \`vite.config.ts\` already sets
\`base: '${base(name)}'\` to match.
`;

function base(name) { return `/${name}/`; }
