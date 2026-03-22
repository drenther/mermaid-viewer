import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputPath = join(__dirname, '..', 'public', 'og-image.png')

const WIDTH = 1200
const HEIGHT = 630

const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="85%" cy="15%" r="60%">
      <stop offset="0%" stop-color="#4493f8" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#4493f8" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0d1117"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

  <!-- Logo (favicon: 4 rounded rects) -->
  <g transform="translate(60, 60) scale(2.2)">
    <rect x="3" y="3" width="7" height="7" rx="1.5" fill="none" stroke="#4493f8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5" fill="none" stroke="#4493f8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="#4493f8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5" fill="none" stroke="#4493f8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
  </g>

  <!-- App name -->
  <text x="126" y="96" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" fill="#e6edf3">Mermaid Viewer</text>

  <!-- Headline -->
  <text x="60" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="700" fill="#e6edf3">Live Mermaid Diagram Editor</text>

  <!-- Sub-headline -->
  <text x="60" y="330" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="400" fill="#9198a1">with SVG &amp; ASCII Preview</text>

  <!-- Decorative mermaid snippet (very subtle) -->
  <g font-family="ui-monospace, monospace" font-size="15" fill="#21262d">
    <text x="780" y="430">graph TD</text>
    <text x="780" y="452">  A[Start] --&gt; B</text>
    <text x="780" y="474">  B{Decision}</text>
    <text x="780" y="496">  B --&gt; C[Result]</text>
    <text x="780" y="518">  B --&gt; D[Other]</text>
    <text x="780" y="540">  C --&gt; E[End]</text>
  </g>

  <!-- Accent line -->
  <rect x="60" y="550" width="200" height="2" rx="1" fill="#4493f8" opacity="0.3"/>

  <!-- CTA / domain -->
  <text x="60" y="580" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="#4493f8">mermaid.drenther.xyz</text>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(outputPath)
console.log(`Generated ${outputPath} (${WIDTH}x${HEIGHT})`)
