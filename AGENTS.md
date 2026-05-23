# Agent Instructions for Memegern Stack

These instructions provide guidelines, standards, and rules for automated coding agents working on the **memegern** project. 

---

## 🚀 Stack & Environment Context

The project is built on **Next.js** optimized for execution on **Cloudflare Workers/Pages** (using Wrangler for local emulation) paired with a **client-side offline-first PWA architecture**.

### Core Constraints & Rules:
1. **Edge Runtime Compatibility:** 
   - All serverless functions and API endpoints must use `export const runtime = 'edge';`.
   - Avoid executing standard Node.js API globals (e.g., `fs`, `path`, or general native Node stream handlers) or library functions that depend on them.
2. **PWA & Service Worker Rules:**
   - App Shell and crucial layout assets (including meme assets, template designs, and basic system fonts) must be **precached** so the app boots instantly when offline.
   - Serve dynamic state with a Stale-While-Revalidate network strategy wherever possible.
   - Read and write dynamic editor state using IndexedDB or browser local storage so user state persists across application crashes and restarts.

---

## 🎨 Frontend & Canvas Standards

### Template Specifications:
- **Philosoraptor:** Image dimensions must be standard $500 \times 500$ or proportionate aspect ratio. Background color: Green `#00473e` or similar gradient. Text fits standard upper-center and lower-center.
- **Socially Awkward Penguin:** Image dimensions $500 \times 500$. Split blue backgrounds: Top half/left vs bottom half/right color variation.

### Tech Stack Standards:
- **Next.js standard App Router** layout with Tailwind CSS.
- **Canvas Operations:** Must manage canvas elements gracefully using React `useRef` and draw within `requestAnimationFrame` blocks or unified redraw hooks to prevent viewport flicker or slow updates during text input change events.
- **Responsive Web Design:** Mobile-first viewport setups, with full canvas-scaling parameters to fit multi-touch inputs, drag-and-drop handles, and interactive bounding boxes.

---

## 🧪 Testing Standards (Vitest with Coverage)

We enforce blistering fast unit/integration testing with strict coverage rules using **Vitest**.

### Strict Requirements for New Code / Features:
1. **Target Coverage Enforcement:**
   - Branches: $\ge 50\%$
   - Functions: $\ge 70\%$
   - Lines: $\ge 75\%$
   - Statements: $\ge 75\%$
2. **Canvas Rendering Utilities:** Include custom mocks for HTMLCanvasElement APIs (`getContext('2d')`, `toDataURL()`, `toBlob()`, `HTMLImageElement` load cycles) using libraries like `jest-canvas-mock` inside unit test files or global setup files.
3. **Offline Mode Mocks:** When testing components or APIs, explicitly mock `navigator.onLine` and `window.indexedDB` to verify behavior under disconnected conditions.
4. **Cloudflare Bindings Mocking:** Mock local wrangler environments (KV, R2, environment variables) during integration tests using Cloudflare mock integrations or custom jest/vitest spy blocks.

---

## 🛠️ Workflows & Git Conventions

- **Feature Branching:** Core features must follow clean separation of concerns. Keep canvas manipulation separate from state management and styling.
- **File & Folder Structure:**
  - `src/components/*`: Reusable UI elements (Canvas, Form inputs, Gallery).
  - `src/hooks/*`: Core custom canvas operations and store modules.
  - `src/app/api/*`: Cloudflare-compatible Next.js Edge APIs.
  - `src/utils/*`: Image processing hooks, text-wrapping helper functions, and database layers.
  - `src/__tests__/*`: Test suites with high-fidelity mock assets.
- **Testing Script Verification:** Ensure `npm run test` executes successfully without compilation or linting errors, and that `npm run test:coverage` meets target thresholds before completing tasks.
