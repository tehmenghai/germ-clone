# Handoff: Germayne//clone — Module 3 ML Tutor

## Overview
An AI-powered ML tutor interface designed as a "digital twin" of an instructor named Germayne. Students ask questions about ML concepts covered in modules 3.1–3.10, and the app simulates a Retrieval-Augmented Generation (RAG) agent pipeline — routing, retrieving, self-evaluating, and composing answers grounded in course transcripts and textbooks. Every answer is accompanied by an interactive visualization and the underlying math.

## About the Design Files
The files in `design_files/` are **HTML/JSX prototypes** created as design references — not production code. The task is to **recreate these designs in your target codebase** (React, Next.js, or similar) using its established patterns, libraries, and infrastructure. Do not ship the prototype files directly.

The prototype uses React 18 + Babel-in-browser for rapid prototyping. In production you would use a proper build pipeline, real RAG backend, and an actual LLM.

## Fidelity
**High-fidelity.** The prototype is pixel-close to the intended final design: final colors, typography, spacing, component structure, interactions, animations, and copy are all defined. Recreate as closely as possible using your codebase's libraries.

---

## File Map

| File | Purpose |
|---|---|
| `design_files/index.html` | Entry point — loads fonts, CSS, and all JSX modules |
| `design_files/styles.css` | Full design system: tokens, layout, all component styles |
| `design_files/app.jsx` | App shell, state, Header, Welcome, Convo, Reading mode, Console mode, Settings drawer |
| `design_files/pipeline.jsx` | RAG pipeline stages, PipelineRail, AgentGraph, TerminalTrace, Gauge |
| `design_files/workspace.jsx` | MLWorkspace panel, AnswerProse, Sources, CodeBlock, MathView |
| `design_files/viz.jsx` | 4 interactive ML visualizations (BiasVarianceViz, RegViz, KNNViz, GradDescViz) |
| `design_files/content.jsx` | Corpus content: TOPICS data, TOPIC_ORDER, routeQuery() |

---

## Design Tokens

All tokens are CSS custom properties on `:root[data-theme="matrix"]` (dark) and `:root[data-theme="clinical"]` (light). Implement as your system's token layer.

### Matrix theme (dark — default)
```
--bg:          oklch(0.15 0.018 152)      /* near-black green-tinted bg */
--bg-2:        oklch(0.185 0.022 152)     /* slightly lighter bg variant */
--panel:       oklch(0.205 0.024 152)     /* card/panel surface */
--panel-2:     oklch(0.235 0.028 152)     /* raised panel surface */
--line:        oklch(0.32 0.04 152)       /* border / divider */
--line-soft:   oklch(0.27 0.03 152 / 0.6)/* subtle border */
--txt:         oklch(0.92 0.05 150)       /* primary text */
--txt-dim:     oklch(0.74 0.06 150)       /* secondary text */
--txt-faint:   oklch(0.55 0.05 150)       /* tertiary / placeholder */
--green:       oklch(0.88 0.21 150)       /* primary accent — #34e08a approx */
--green-2:     oklch(0.80 0.20 152)       /* secondary green */
--green-deep:  oklch(0.55 0.16 152)       /* dark green for borders/glows */
--cyan:        oklch(0.83 0.11 195)       /* secondary accent — #5fd2e6 approx */
--amber:       oklch(0.84 0.14 80)        /* warning / re-loop — #f0c560 approx */
--red:         oklch(0.72 0.18 25)        /* error / diverge — #ef7a63 approx */
--on-green:    #04130b                    /* text on green bg */
--glow:        0 0 0.5px var(--green), 0 0 14px oklch(0.88 0.21 150 / 0.30)
--shadow:      0 18px 50px -20px #000
```

### Clinical theme (light)
```
--bg:          oklch(0.975 0.006 220)
--bg-2:        oklch(0.955 0.008 220)
--panel:       oklch(1 0 0)
--panel-2:     oklch(0.97 0.006 220)
--line:        oklch(0.88 0.012 220)
--txt:         oklch(0.27 0.02 230)
--green:       oklch(0.55 0.13 165)       /* darker green for light bg */
--cyan:        oklch(0.55 0.11 230)
--amber:       oklch(0.66 0.13 65)
--red:         oklch(0.58 0.2 25)
--on-green:    #ffffff
```

Theme is stored in `localStorage` under the key `gc-theme`. Toggle via `data-theme` on `<html>`.

### Typography
| Use | Family | Size | Weight |
|---|---|---|---|
| UI / mono | JetBrains Mono (Google Fonts) | 14px base | 400/500/700 |
| Prose / math | Newsreader (Google Fonts) | 16.5px prose, 23px equations | 400/500/600 |
| Labels / caps | JetBrains Mono | 10–11px, letter-spacing 1–2px | 400 |
| Code | JetBrains Mono | 12–12.5px | 400 |

### Spacing & Radius
- Base spacing unit: 8px
- Common radii: 7px (small controls), 9–10px (buttons/inputs), 11–13px (cards/panels), 14px (major panels)
- Header height: 58px
- Workspace rail width: 372px
- Composer max-width: 760px; scroll-inner max-width: 760px

---

## Screens / Views

### 1. App Shell
**Layout:** Full-viewport flex column. Fixed header (58px) + body (flex:1, overflow hidden).

**Header** (`header.header`):
- Left: Avatar (34×34px, border-radius 9px, green gradient `linear-gradient(160deg, --green-2, --green-deep)`), brand name "germ//clone" + subtitle "module 3 tutor · ML 3.1–3.10". Online indicator dot (10×10px green circle, border 2px `--bg`) at avatar bottom-right.
- Right toolbar (gap 9px): View mode segmented control → Difficulty segmented control → "◷ RAG pipe" pill button (disabled until a topic is active) → LLM name pill → theme toggle icon button → settings icon button.

**Segmented controls** (`.seg`): `display:flex`, `border:1px solid --line`, `border-radius:9px`, `overflow:hidden`. Buttons: 11px, `padding:7px 11px`. Active: `background:--panel-2`, `color:--green`.

**View modes:** `▤ Reality` (reading layout) and `⌅ Matrix` (console layout). Default: Reality.

**Difficulty levels:** `ELI5`, `Standard`, `Academia`. Default: Standard.

---

### 2. Reality Mode (Reading View)
**Layout:** CSS grid `grid-template-columns: minmax(380px, 44fr) 56fr`. Left = conversation column. Right = ML workspace panel.

**Left — Conversation column** (`.convo`):
- Flex column, full height.
- Scroll area (`.scroll`): `overflow-y:auto`, `padding: 26px clamp(18px, 4vw, 54px) 30px`. Inner wrapper max-width 760px, centered.
- Composer (`.composer-wrap`): fixed to bottom of column, blurred bg. Contains a textarea (auto-resize up to 120px, `border-radius:13px`, `font-size:13.5px`) + send button (40×40px green, `↑` glyph).
- Composer hint below: "↵ send" and "grounded in your course corpus · faithful & cited" in faint text.

**Welcome state** (shown when `msgs.length === 0`):
- Dedication line: "— a digital twin of your instructor, germayne" (11px, faint, with 16×1px green-deep line decoration).
- H1: `font-family:Newsreader`, `font-size:clamp(28px, 4vw, 42px)`, weight 500. Text: "Ask me anything from modules 3.1 – 3.10."
- Lede paragraph: 13.5px, `--txt-dim`, `max-width:60ch`.
- Chips section: label "TRY ONE" (uppercase, 10.5px, green-2, letter-spacing 2px). Each chip is a `<button>` with `border-radius:11px`, `padding:13px 15px`, module badge (green bg, 9.5px bold), question text, `↗` arrow (margin-left auto). Hover: `translateX(3px)`.

**Message rendering:**
- User messages (`.msg-user`): align-self flex-end, max-width 80%, `border-radius:13px 13px 4px 13px`, `padding:12px 16px`, `font-size:13.5px`.
- Bot messages (`.msg-bot`): flex row, gap 14px. Left: 30×30px avatar (same gradient as header avatar, 8px radius, "G"). Right: answer card.

**Answer card** (`.ans`):
- `border:1px solid --line-soft`, `border-radius:14px`, semi-transparent panel bg.
- Header row: "germ//clone" label (11px dim, weight 600) + PASS score badge (green bordered pill) | "◷ agent trace" action button (right).
- Body: prose only (no tabs in this prototype — Explain tab is shown directly). Prose is `font-family:Newsreader`, `font-size:16.5px`, `line-height:1.62`. Inline `<code>` gets `--panel-2` bg, green text. Citations: `<sup class="cite">` — green bg badge, superscript, hover shows source highlight.
- Action row: `+notebook` button, `⌥ N sources` toggle button, "switch difficulty in header ↑" hint.
- Sources panel (`.sources`): shown when srcOpen=true. Each source card shows [id] badge (green), module, filename, timestamp, and a serif italic snippet. Active citation highlighted with green border + glow.

**Thinking state:** Shown while `phase === 'running'`. Card with 3-dot typing animation + current pipeline stage name (e.g., "⛁ Retrieve · hop 1…"). Right label: "watch the agent →".

**Right — ML Workspace** (`.wspane`):
- `border-left:1px solid --line-soft`, padded, semi-transparent panel bg.
- Contains `<MLWorkspace>` (see §5) + Sources list.
- Responsive: hidden below 920px.

---

### 3. Console Mode (Matrix View)
**Layout:** Flex column. Coverage map bar at top → `grid-template-columns: minmax(380px, 44fr) 56fr` main area.

**Coverage map bar** (`.cov`): Horizontal scrolling row. "⊞ corpus coverage" label. Grid of module chips: `3.1 Prob/Stat`, `3.2 Intro ML`, …`3.10 NLP+`. Active modules get green border + glow. Right: "142 hrs transcripts · 4 textbooks · 38 notebooks indexed".

**Left — Terminal** (`.console-left`):
- Scroll area with monospaced terminal trace (`.termtrace`). Each line: line number gutter (2-char, faint, non-selectable) + content.
- Color coding: `--green` for `[ok]` values; `--amber` for warnings/low scores; `--red` for BELOW threshold; `--cyan` for intermediate values; `--txt-faint` for stage labels.
- Below trace: answer prose section + shortcut kbd chips (`/quiz`, `/eli5`, `/save`, `/sources`).
- Bottom: Console composer — "germ>" prompt (green, 12px) + inline input (bg `--bg-2`, `border-radius:9px`) + `↵` send button.
- Empty state: centered chip list (same as Welcome).

**Right — Workspace + Gauge:**
- Same `<MLWorkspace>` as Reality mode but `compact` flag (max-height 380px on body).
- Sources list.

---

### 4. RAG Pipeline Panels

#### 4a. Pipeline Rail (Reading mode, slide-out)
Opens as a drawer overlay from the right (`.raildrawer`), width 372px, animated `slidein`. Contains `<PipelineRail>`.

**Rail** (`.rail`):
- Header: "◷ agent trace" label + pass indicator (amber) + collapse icon button.
- Body: 9 stage rows (`.rstage`). Each: 24×24px icon badge + stage name + chevron + status. States: `pending` (opacity 0.4) / `active` (green border + glow, pulsing icon) / `done` (✓) / `reloop` (amber).
- Expanded detail: 10.5px faint text, indented 34px, showing per-stage verbose output.
- Bottom gauge box (`.gaugebox`): circular progress ring (74×74px, `conic-gradient`) + 3 horizontal metric bars (faithfulness / relevance / completeness).

**Pipeline stages (in order):**
1. `⟁ Route` — classifies query to modules
2. `✎ Rewrite` — expands query with synonyms
3. `⛁ Retrieve · hop 1` — first vector search
4. `◈ ReAct` — think/act/observe loop
5. `◎ Reflect / Correct` *(reloop)* — grounds & corrects
6. `▦ Evaluate · pass 1` — scores faithful/relevant/complete (typically fails ≈0.73 avg)
7. `⛁ Re-retrieve · hop 2` *(reloop)* — second retrieval pass
8. `▦ Evaluate · pass 2` — re-scores (passes ≥0.80 avg)
9. `✦ Compose answer` — final answer assembly

#### 4b. RAG Graph Panel (bottom overlay, both modes)
Shown when "◷ RAG pipe" pill is active and a topic is loaded. Fixed position, slides up from bottom (`slideup` animation). Height ~230px graph area.

Graph nodes (absolutely positioned within `.graphwrap`):
| Node | Icon | Position (% left, % top) |
|---|---|---|
| Route | ⟁ | 11%, 26% |
| Rewrite | ✎ | 31%, 26% |
| Retrieve | ⛁ | 54%, 24% |
| ReAct | ◈ | 60%, 62% |
| Reflect | ◎ | 32%, 64% (amber) |
| Evaluate | ▦ | 82%, 46% (amber) |

SVG paths connect nodes. Re-retrieve loop path gets animated dashed amber stroke (`stroke-dashoffset` CSS animation). Active node: `border-color:--green-deep`. Pulsing node: icon scale animation. Mini Gauge badge at top-right of graph.

#### 4c. Terminal Trace (Console mode)
Lines rendered progressively as `activeIdx` advances. Format per stage:
```
[route]       <classified route string>
[rewrite]     <expanded query string>
[retrieve·hop1] <chunk summary>          (green)
[react]       <thought/act/obs string>
[reflect]     <correction note>          (amber)
[evaluate]    faithful X.XX · complete X.XX → BELOW 0.80, reloop  (red)
[retrieve·hop2] <additional chunks>      (green)
[evaluate]    faithful X.XX · relevant X.XX · complete X.XX → PASS ✓  (green)
```

---

### 5. ML Workspace Panel

Header bar: "⊞ ML WORKSPACE" (uppercase label) + truncated topic question (italic Newsreader) + tab buttons (Visualize / Math).

**Empty state:** Dashed border, centered. Large "∂" glyph (Newsreader 54px, `--green-deep`, opacity 0.5). "The ML workspace lands here." + description.

**Visualize tab:** Wraps the topic's visualization in a `.viz` card with header showing viz title and "drag the control — it's live" hint.

**Math tab:** Vertical stack of equation + note pairs. Equations: `font-family:Newsreader`, `font-size:23px`, italic, centered, `border:1px solid --line-soft`, `border-radius:10px`, `background:--bg-2`. Variable names in green. Notes: 12.5px mono, `--txt-dim`.

---

### 6. Interactive Visualizations

All visualizations use an SVG/Canvas approach with a range slider control and a color legend. They respond to the active theme (matrix vs clinical).

**6a. Bias–Variance (topic: overfitting)**
- SVG chart, 520×270 viewBox.
- 4 curves: training error (cyan), test error (green, thicker), bias² (faint dashed), and a "sweet spot" marker (amber circle).
- Background zones: left = underfitting (amber tint), right = overfitting (red tint).
- Slider: "tree depth" 1–10, integer steps. Moving it moves a vertical dashed green line and updates the live training/test error values and gap warning in the legend.

**6b. L1 vs L2 Regularization (topic: regularization)**
- SVG chart, 360×300 viewBox. Axes for w₁, w₂.
- Loss contours: 5 ellipses centered at OLS solution (cyan dot, labeled).
- Constraint region: circle (L2 / Ridge) or diamond polygon (L1 / Lasso) in green fill + stroke.
- Solution point (green circle) moves along constraint boundary as λ slider changes.
- Toggle buttons: "L2 · Ridge" / "L1 · Lasso". Sparsity indicator: when L1 solution hits axis, amber badge "● sparse — a weight hit exactly 0 (feature dropped)".
- Slider: "λ (penalty)" 0–0.95.

**6c. KNN Decision Boundary (topic: knn)**
- Canvas element, full-width × 300px, drawn at 2× DPR.
- Background: colored grid cells (step=14px) showing predicted class region (green tint = class A, cyan tint = class B).
- Data points: 36 fixed points (18 per class), filled circles (9px radius), white stroke.
- Slider: "k (neighbours)" 1–25, odd steps. Redraws on each change.
- Legend: "k≤3 → jagged, low bias/high variance" / "k≥15 → smooth, high bias/low variance" / "balanced boundary".

**6d. Gradient Descent (topic: gradient descent)**
- Canvas element, full-width × 300px. Loss surface shown as 6 concentric ellipses. Minimum at center (amber dot).
- Path: green line + dots tracing descent from fixed start `[-4.2, 3.3]` over 42 steps.
- Animated: "▸ run descent" button starts interval (90ms per step). "step +1" advances manually. "↺ reset" clears path.
- Divergence detection: if path escapes bounds → red warning "⚠ diverging — lr too high".
- Slider: "learning rate η" 0.02–0.95.

---

### 7. Settings Drawer
Slide-in overlay from right, width `min(420px, 92vw)`. Backdrop blur overlay behind.

Sections:
1. **LLM backend** — 3 radio option cards (Ollama local / Alt vLLM / Cloud API). Each: radio dot, label, name, description, badge chips.
2. **Theme** — segmented: "◖ Matrix (dark)" / "◗ Clinical (light)".
3. **Answer difficulty** — segmented: ELI5 / Standard / Academia.
4. **View mode** — segmented: Reality / Matrix.
5. **Corpus** — static info: 10 modules, 142h transcripts, 4 textbooks, 38 notebooks.

---

## State Management

| State | Type | Description |
|---|---|---|
| `theme` | `'matrix' \| 'clinical'` | Persisted to `localStorage['gc-theme']` |
| `mode` | `'reading' \| 'console'` | Active view layout |
| `diff` | `'eli5' \| 'standard' \| 'rigorous'` | Answer difficulty level |
| `llm` | `'ollama' \| 'alt' \| 'cloud'` | Selected LLM config (UI only in prototype) |
| `drawer` | boolean | Settings drawer open |
| `railOpen` | boolean | Pipeline rail open (Reading mode) |
| `graphOpen` | boolean | RAG graph panel visible (bottom overlay) |
| `wsTab` | `'visualize' \| 'math'` | Workspace active tab |
| `srcOpen` | boolean | Sources panel expanded |
| `citeHot` | number \| null | Citation ID being hovered (highlights source card) |
| `input` | string | Composer textarea value |
| `msgs` | `{role, text?, topicId?, note?}[]` | Conversation history |
| `topicId` | string \| null | Current topic key (drives workspace + pipeline) |
| `phase` | `'idle' \| 'running' \| 'done'` | RAG run state |
| `activeIdx` | number | Current pipeline stage index (−1 = idle) |
| `scores` | `{f,r,c} \| null` | Current eval scores |

### RAG run sequence (simulated in prototype)
When a question is submitted:
1. Route query to topic via `routeQuery()` regex matching.
2. Advance `activeIdx` 0→8 with timeouts (~560ms per step, 1100ms on evaluate pass 1, 900ms on evaluate pass 2).
3. At stage 5 (evaluate pass 1): set scores to `topic.evalP1` (typically failing ≈0.73 avg).
4. At stage 7 (evaluate pass 2): set scores to `topic.evalP2` (passing ≥0.80 avg).
5. After all stages: `phase = 'done'`, append bot message.

---

## Animations & Transitions

| Element | Animation | Duration / Easing |
|---|---|---|
| Settings drawer open | `translateX(40px) → 0, opacity 0.4→1` | 280ms `cubic-bezier(.4,0,.2,1)` |
| RAG graph panel open | `translateY(60px) → 0, opacity 0.3→1` | 320ms `cubic-bezier(.4,0,.2,1)` |
| Rail drawer open | `translateX(40px) → 0` | 300ms `cubic-bezier(.4,0,.2,1)` |
| Message entry | `translateY(8px) → 0, opacity 0→1` | 500ms ease (`.fadein`) |
| Workspace grid cols | `grid-template-columns` change | 350ms `cubic-bezier(.4,0,.2,1)` |
| Pipeline stage icon (active) | scale 1→1.12→1 pulse | 1s infinite |
| Re-retrieve edge (graph) | `stroke-dashoffset` — dashed amber march | 1s linear infinite |
| Typing indicator dots | opacity 0.3→1→0.3 stagger | 1.2s infinite, delays 0 / 0.2s / 0.4s |
| Gauge fill bar | `width` CSS transition | 600ms |
| Gauge ring | `conic-gradient --p` CSS transition | 600ms |
| Chip hover | `translateX(3px)` | 150ms |
| Digital rain canvas | Slow downward glyph trail, `rgba(8,16,11,0.025)` fade trail | ~60fps, drops move at 0.08 units/frame — paused in Clinical theme |

---

## Digital Rain Background
Canvas element `#rain`, `position:fixed; inset:0; z-index:0; pointer-events:none`. Opacity controlled by `--rain` CSS variable (1 in matrix, 0 in clinical, transitions at 0.6s).

Glyphs drawn from a mix of ASCII operators, katakana, and math symbols. Two opacity levels per glyph: 40% (standard) and 55% (rare bright flash). Font: 8px JetBrains Mono. Column spacing: `fs * 2.2`. Drop speed: 0.08 units/frame.

---

## Assets
- **JetBrains Mono** — Google Fonts (`ital,wght@0,400;0,500;0,700;1,400`)
- **Newsreader** — Google Fonts (`ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400`)
- No image assets — all visuals are SVG/Canvas drawn in code.

---

## Content / Data
All topic content lives in `content.jsx` → `TOPICS` object. 4 topics in the prototype:

| Key | Module | Viz | Question |
|---|---|---|---|
| `overfit` | 3.3 · 3.4 | biasvar | Why does my decision tree overfit? |
| `reg` | 3.4 | reg | L1 vs L2 regularization — when to use each? |
| `knn` | 3.2 · 3.3 | knn | How do I choose k in KNN? |
| `grad` | 3.7 | grad | What does the learning rate do in gradient descent? |

Each topic contains: `explain` (eli5/standard/rigorous HTML strings with citation `<sup>` markers), `code` (Python string), `math` (array of `{eq, note}`), `sources` (array of `{id, mod, file, ts, snip}`), RAG trace strings (`route`, `rewrite`, `retrieve1`, `retrieve2`, `react`, `reflect`), and eval scores (`evalP1`, `evalP2`).

In production, all of this content comes from your RAG backend — the prototype hardcodes it for design demo purposes.

---

## Implementation Notes for Claude Code

1. **Use React** — The entire UI is React. The component split in the prototype files maps cleanly to a React component tree.

2. **CSS custom properties** — Implement the design token system as-is (CSS vars on `html[data-theme]`). This is the simplest path to theme switching.

3. **Fonts** — Load JetBrains Mono and Newsreader from Google Fonts (or self-host). These are load-bearing — the visual identity depends on them.

4. **Visualizations** — The 4 viz components (`viz.jsx`) are self-contained React components using SVG + HTML Canvas. They can be ported directly with minimal changes.

5. **Pipeline simulation** — The `ask()` function in `app.jsx` drives the fake RAG sequence with `setTimeout` chains. In production, replace with real streaming events from your backend.

6. **Scroll persistence** — Store `topicId` / `msgs` in session/localStorage so users can refresh without losing their session.

7. **Responsive** — The workspace panel hides below 920px. The pipeline rail hides below 880px. Console mode right panel hides below 1000px.

8. **Accessibility** — The prototype does not implement ARIA. Add `aria-label` to icon buttons, `role="status"` to the thinking indicator, and keyboard navigation for chips.
