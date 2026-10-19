# Beautiful Mermaid Viewer

## Stack

- **Framework**: Astro 6 with React islands (`client:only="react"`)
- **Package manager**: pnpm (enforced via `packageManager` field)
- **Language**: TypeScript (strict Astro preset)
- **Styling**: Plain CSS (no Tailwind, no CSS-in-JS)
- **Editor**: CodeMirror 6 with custom Mermaid syntax highlighting
- **Renderer**: `beautiful-mermaid` (SVG + ASCII)
- **State management**: `@xstate/store` (`createStore` from `@xstate/store`, React hooks from `@xstate/store/react`)

## Conventions

### State management

- Use `@xstate/store` for everything — `createStore` from `@xstate/store`, React hooks (`useStore`, `useSelector`) from `@xstate/store/react`, persistence from `@xstate/store/persist`
- Do **not** use `@xstate/store-react` — planned migration when it re-exports `persist`
- Use `useStore()` hook for local component stores (like `useReducer`), not manual `useRef`-based initialization

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `ci`, `build`

### Dependencies

- Use **exact versions** (no `^` or `~` prefixes) in `package.json`
- Keep dependencies minimal — only add what is actually used

## Project Structure

```
src/
├── components/   # React components (App, MermaidEditor, SvgViewer)
├── layouts/      # Astro layouts (HTML shell, SEO, fonts)
├── pages/        # Astro pages (routes)
├── stores/       # XState stores (layoutStore)
└── styles/       # Global CSS
public/           # Static assets (favicon)
claude-plugin/    # Claude Code mod: links mermaid blocks to the viewer (#code/ format)
.claude-plugin/   # marketplace.json that makes this repo installable
```

## Scripts

```
pnpm dev       # Start dev server (localhost:4321)
pnpm build     # Production build
pnpm preview   # Preview production build
```

## Supply Chain Config — Do Not Modify Without Approval

This repo enforces strict install-time supply chain defenses:

- Exact pinned versions (no `~`/`^`).
- `minimumReleaseAge` of 7 days (pnpm: minutes, bun: seconds).
- Install/lifecycle scripts disabled by default; only packages in
  `onlyBuiltDependencies` (pnpm) or `trustedDependencies` (bun) may run them.
- pnpm: `block-exotic-subdeps=true`, `trust-policy=no-downgrade`.
- bun: Socket security scanner enabled in `bunfig.toml`.

**Never disable, loosen, or bypass these settings** — including adding packages
to the script allow-list, shortening `minimumReleaseAge`, or setting
`dangerouslyAllowAllBuilds` — without explicit confirmation from the user in
the current conversation. A prior approval does not carry over.
