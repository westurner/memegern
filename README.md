
# memegern

Design, develop, and E2E test a meme generation and sharing site using Next.js with Cloudflare Workers (or local Wrangler environment) based on [cloudflare-workers-nextjs-saas-template](https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template).

The meme generator must be a **client-side offline PWA** built using Next.js and TSX, featuring offline meme editing and rendering. The application features **Philosoraptor** and **Socially Awkward Penguin** as the core preloaded meme templates.

---

## 📅 Development Plan

This development plan breaks down the construction of the offline-first meme generator and sharing platform into 5 coherent, executable sprints.

### Phase 1: Environment & Tooling Setup
- **Objective:** Configure a local development environment running Next.js compatible with Cloudflare Pages/Workers runtime via Wrangler, install dependencies, and set up Vitest.
- **Tasks:**
  1. Scaffold Next.js project layout compatible with Cloudflare Workers (e.g., standard Edge runtime configurations, `next.config.js` edge runtime configuration, Wrangler configurations for KV/R2).
  2. Implement PWA configuration (`@ducanh2912/next-pwa` or customized Serwist/workbox) with persistent offline caching.
  3. Set up Vitest (`vitest`) and React Testing Library (`@testing-library/react`) for unit & integration tests, alongside coverage tools (`@vitest/coverage-v8`).
  4. Ensure base layout is responsive, containing navigation and space for offline notification banners.

### Phase 2: Offline-First Client-Side Meme Editor
- **Objective:** Construct a highly interactive, interactive canvas-based meme generator capable of processing adjustments entirely offline.
- **Tasks:**
  1. Package and optimize SVG/WebP assets for both meme templates:
     - **Philosoraptor** (Green background, questioning raptor)
     - **Socially Awkward Penguin** (Left-facing penguin, split blue background detailing awkward/social behaviors)
  2. Implement an HTML5 canvas rendering engine in a reusable React Hook/custom utility to combine the base image template with user-defined overlays.
  3. Build form layout for adjusting text overlays:
     - Top Text, Bottom Text, and custom intermediate text blocks.
     - Styling features: Color selection, stroke/border thickness, text alignment, and dynamic resizing.
     - Moveable text placement (by canvas coordinates/drag-and-drop).
  4. Save/export capabilities allowing instantaneous download as JPEG/PNG using client-side `canvas.toDataURL()` or `canvas.toBlob()`.

### Phase 3: PWA Manifest & Service Worker Strategy
- **Objective:** Deliver a seamless installable Progressive Web Application that retains fully operational editing capacity without an internet connection.
- **Tasks:**
  1. Design install configurations, including `manifest.json` containing icons, theme colors, display modes, and offline shortcuts.
  2. Implement Service Worker caching rules:
     - Precache assets (Philosoraptor and Socially Awkward Penguin template assets, core UI, font-families like Impact or Arial).
     - Stale-while-revalidate or Network-first strategy for remaining assets and standard application routing.
  3. Develop a persistent UX indicating connection fallback states (Offline mode indicator, install banner triggers, and clear notifications).

### Phase 4: Local Storage, Sharing & Cloudflare Integration
- **Objective:** Integrate local-first storage using `IndexedDB` or `localStorage` alongside Cloudflare's edge capabilities (Wrangler/KV/R2) for publishing and sharing.
- **Tasks:**
  1. Build an offline repository ("My Memes" gallery) where generated memes are stored locally in IndexedDB as Base64 strings or Blobs.
  2. Implement Web Share API capabilities on standard mobile/desktop browsers to easily share locally saved memes.
  3. Develop edge functions (Cloudflare Workers) that expose `/api/share` endpoint to allow users who are back online to upload their memes to Cloudflare KV / R2 storage, generating static permalinks (`/m/:id`) for public viewing.

### Phase 5: Polishing, Refinement & E2E Validation
- **Objective:** Complete the UI/UX polish and verify end-to-end operation across mobile and web platforms.
- **Tasks:**
  1. Enhance accessibility (ARIA labels, keyboard navigation for canvas adjustments, accessible color palettes).
  2. Test local PWA behavior using Wrangler emulation (`npx wrangler pages dev` or local emulation).
  3. Polish animations and fluid interactions using Tailwind CSS.

---

## 🧪 Test Coverage Plan (Vite / Vitest with Coverage)

Our testing strategy leverages **Vitest** for blistering fast unit/integration testing with strict coverage enforcement and **Playwright/Cypress** for end-to-end cross-browser workflows.

### 1. Test Architecture & Libraries
- **Unit & Integration:** [Vitest](https://vitest.dev/) with `@testing-library/react` and `@testing-library/jest-dom`.
- **Mocking:** Setup standard canvas mock engines (`jest-canvas-mock`) since browser standard HTML5 Canvas is not natively run inside JSDOM.
- **E2E Testing:** Playwright to validate service worker behavior, installation prompt triggers, and complete offline flow.
- **Coverage Provider:** `@vitest/coverage-v8`.

### 2. Targeting Coverage Thresholds
We enforce the following minimum coverage rules globally inside config file `vitest.config.ts`:
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: {
    branches: 85,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

### 3. Core Test Scenarios
- **Canvas Rendering Hooks / Utilities (Unit):**
  - Verify that canvas element loads templates successfully.
  - Test custom wrapping algorithm for long text on templates (impact font wrapping).
  - Ensure coordinates match and trigger changes when scaling or position values are modified.
- **Editor Component (Integration):**
  - Verify template selection shifts between Philosoraptor and Socially Awkward Penguin.
  - Test input changes automatically trigger redrawing on the canvas.
  - Confirm download trigger invokes browsers behavior contextually.
- **Service Worker / Offline Capability (E2E Integration):**
  - Mock offline network status (`navigator.onLine = false`) and verify app shells render.
  - Verify cached assets (core templates) load instantly under slow/no network simulations.
  - Validate IndexedDB reads and writes while offline.
- **Cloudflare Edge Upload APIs (Unit / Edge Integration):**
  - Mock wrangler storage bindings to test endpoints without calling actual Cloudflare servers.
  - Validate edge schema checks, ID generation, response formatting, and error handling.

---

## 🛠️ Command-Line Recipes

```bash
# Start local development with Wrangler emulation
npm run dev

# Run all Vitest suites once
npm run test

# Run Vitest in watch mode
npm run test:watch

# Generate code coverage reports
npm run test:coverage
```
