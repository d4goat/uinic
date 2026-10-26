# Role & Objective

Act as a Principal Creative Technologist & Senior Frontend Architect (Awwwards Jury level). Your task is to design and build the frontend UI for the **"PPI Link"** project.

First, read and thoroughly analyze the project requirements, user flows, and features defined in the Markdown file located in the project root (`README.md` / `PRD.md` / `requirements.md`). Every section, component, and interactive state you build must strictly fulfill the specifications in that document.

---

# Tech Stack & Core Architecture

- **Framework:** React 18+ with Vite (TypeScript/JavaScript based on repo setup).
- **Styling:** Tailwind CSS (configured with custom design tokens, fluid typography, and strict spacing scales).
- **Animation Engine:** `gsap` (`@gsap/react` using the `useGSAP` hook and `ScrollTrigger` plugin).
- **Smooth Scrolling:** `lenis` (`lenis/react`), tightly synchronized with `gsap.ticker` and `ScrollTrigger.update`.
- **Icons:** Lucide React (used minimally with refined `1.5px` stroke width).

---

# Anti-"AI Slop" Design Manifesto (Impeccable Craft)

You are strictly forbidden from generating generic, recognizable AI-template aesthetics. Adhere to these rules:

1. **BANNED Patterns:**
   - NO purple/indigo-to-cyan neon gradients on dark backgrounds.
   - NO glowing glassmorphic cards with 1px white/20% borders everywhere.
   - NO generic 3-column symmetrical feature cards with centered icons in circles.
   - NO generic stock illustrations or overused SaaS hero layouts.
   - NO default Tailwind shadow classes (`shadow-lg`, `shadow-xl`) without custom opacity tuning.

2. **REQUIRED Editorial & Swiss Grid Direction:**
   - **Layout:** Asymmetric Swiss grids, exposed 1px structural hairlines (`border-neutral-200` or `border-neutral-800`), generous negative space, and architectural alignment.
   - **Typography:** High-contrast editorial pairing. Use a bold, tight-tracking geometric/grotesque sans-serif for display headers (`tracking-[-0.03em]`, `leading-[0.95]`), paired with a crisp humanist sans for body copy and a monospace font (`JetBrains Mono` or `Geist Mono`) for metadata, tags, counters, and timestamps.
   - **Color Palette:** High-craft tonal surface system (e.g., Warm Alabaster `#F7F6F2` with Obsidian Ink `#111111`, plus a single purposeful, high-conviction brand accent derived from PPI Link's identity).
   - **Tactile Details:** Subtle SVG film grain/noise overlay (`opacity: 0.03`), custom interactive cursor states, and razor-sharp micro-borders.

---

# Motion Design Specification (GSAP + Lenis)

Motion must feel physical, intentional, and choreographed—never slapdash:

1. **Lenis + GSAP Integration:**
   - Create a global `<SmoothScrollProvider>` that connects Lenis to GSAP ScrollTrigger:
     ```js
     lenis.on("scroll", ScrollTrigger.update);
     gsap.ticker.add((time) => lenis.raf(time * 1000));
     gsap.ticker.lagSmoothing(0);
     ```
2. **Signature Choreography:**
   - **Page Load / Hero Reveal:** Staggered masked text reveal (`overflow-hidden` line wrappers with `yPercent: 100` to `0`, `power4.out`, `duration: 1.1`, `stagger: 0.06`).
   - **Scroll-Driven Architecture:** Pinned horizontal or stacked sections where appropriate for PPI Link's core workflows, parallax image/card containers, and scrub-linked progress indicators.
   - **Micro-interactions:** Magnetic primary CTA buttons, directional hover fill transitions on links/cards, and smooth layout transitions when filtering or switching views.
   - **Cleanup & Accessibility:** All animations must live inside `useGSAP(() => { ... }, { scope: containerRef })` for automatic cleanup and respect `prefers-reduced-motion`.

---

# Execution Workflow

1. **Step 1 — Context Audit:** Read the root `.md` file and summarize the core entities, pages, and key user journeys of **PPI Link** in 5 bullet points to confirm understanding.
2. **Step 2 — Design System Setup:** Define the color tokens, font pairings, and Tailwind config extensions, and create the `SmoothScrollProvider` utility.
3. **Step 3 — Full UI Implementation:** Build the complete, production-ready components and views required by the Markdown specification with zero placeholder `TODO` blocks. Ensure responsive adaptation from desktop to mobile.
