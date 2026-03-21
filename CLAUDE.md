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
```

## Scripts

```
pnpm dev       # Start dev server (localhost:4321)
pnpm build     # Production build
pnpm preview   # Preview production build
```
