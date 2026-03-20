# Beautiful Mermaid Viewer

## Stack

- **Framework**: Astro 6 with React islands (`client:only="react"`)
- **Package manager**: pnpm (enforced via `packageManager` field)
- **Language**: TypeScript (strict Astro preset)
- **Styling**: Plain CSS (no Tailwind, no CSS-in-JS)
- **Editor**: CodeMirror 6 with custom Mermaid syntax highlighting
- **Renderer**: `beautiful-mermaid` (SVG + ASCII)

## Conventions

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
└── styles/       # Global CSS
public/           # Static assets (favicon)
```

## Scripts

```
pnpm dev       # Start dev server (localhost:4321)
pnpm build     # Production build
pnpm preview   # Preview production build
```
