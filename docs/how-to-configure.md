# germ//clone — Local Setup Guide (Beta Testers)

_Audience: beta testers running the app locally after cloning the repo._

---

## Prerequisites

Install these before cloning:

| Tool | Purpose | Install |
|---|---|---|
| `uv` | Python package manager | `pip install uv` or [uv.astral.sh](https://uv.astral.sh) |
| `pnpm` | Node package manager | `npm install -g pnpm` |
| `node` ≥ 18 | Frontend runtime | via `nvm` or system |
| Ollama | Local LLM + embeddings (see note below) | [ollama.com](https://ollama.com) |

**Ollama note:** Ollama is only needed if you want to run inference locally. If you switch to free-cloud mode (Groq, etc.), Ollama can be skipped — but the default embedding provider is Google Gemini, so you still need a Gemini API key regardless.

---

## 1. Clone and set up secrets

```bash
git clone <repo-url>
cd germ-clone
cp source/backend/.env.example source/backend/.env
```

Then open `source/backend/.env` and fill in the blanks:

### Required secrets

**`DATABASE_URL`** — your personal Neon branch connection string.
You will be given a Neon project invite; create your own branch from `main` and copy the
`postgresql+asyncpg://...` pooled URL from the Neon dashboard.

```
DATABASE_URL=postgresql+asyncpg://user:password@host/dbname?sslmode=require
```

**`GEMINI_API_KEY`** — needed for query-time embeddings (the corpus is embedded with Gemini
768-dim; switching to a different embedding model without re-indexing breaks retrieval).
Get a free key at [aistudio.google.com](https://aistudio.google.com).

```
EMBEDDING_PROVIDER=google
EMBEDDING_MODEL=gemini-embedding-2
GEMINI_API_KEY=your-key-here
```

### Optional — cloud LLM inference

The default `INFERENCE_BACKEND=ollama`. To use free-cloud LLM instead (faster, no GPU):

```
INFERENCE_BACKEND=groq
GROQ_API_KEY=your-groq-key-here
```

Get a free Groq key at [console.groq.com](https://console.groq.com).

### Leave as-is for local dev

```
PASSPHRASE_REQUIRED=false   # passphrase gate is off locally
LITELLM_LOG=ERROR
```

---

## 2. Ollama setup (if using local inference)

Pull the models the app needs:

```bash
ollama pull nomic-embed-text    # only if switching embeddings to Ollama
ollama pull llama3.2            # or any model you prefer
```

Ollama must be running before `launch.sh`:

```bash
ollama serve   # in a separate terminal, or run as a system service
```

**Cold-start warning:** the first question after Ollama loads a model takes 30–90s on CPU.
Subsequent questions in the same session are faster. If "Thinking…" hangs for more than
2 minutes, check the backend logs for LiteLLM errors.

---

## 3. Run the app

```bash
./launch.sh
```

The script installs dependencies on first run (backend venv via `uv`, frontend via `pnpm`).
Subsequent starts are faster.

- Backend: `http://localhost:8007`
- Frontend: `http://localhost:3007`

Open `http://localhost:3007` in your browser.

---

## 4. First run — profile setup

On first load you will see a profile picker. Enter any name and press Enter. No password.
Your conversation history is stored server-side against this profile name, so use something
you will recognise. Theme preference persists in your browser's localStorage.

---

## 5. Asking a question

The app covers ML modules 3.1–3.10 (bias-variance, regularisation, KNN, gradient descent, etc.).
Ask questions in natural language — it works best when the question is specific to the course
material.

**Difficulty tabs** (top of the composer): ELI5 / Standard / Academia. Sets the language level
of the answer; default is Standard.

**Pipeline stages** — after you submit, a sidebar shows the pipeline progressing through:
`route → rewrite → retrieve → react → reflect → evaluate → compose`. This is the self-correcting
agentic loop. If the evaluation scores (f/r/c) fall below 0.80, the pipeline re-retrieves and
re-evaluates before composing. You can open the Agent Trace drawer (clock icon) for per-stage
detail and scores.

**The first response takes longer** — the LLM route call is the first thing that blocks.
On OpenRouter/Groq free tiers expect 10–20s. On local Ollama expect longer on first model load.

---

## 6. Reading the answer

- **Citations** — superscript `[1]`, `[2]` etc. in the answer text. Click the Sources panel to
  see the source chunk, module attribution, and origin (PDF slide, VTT transcript).
- **Interactive viz** — each answer includes a topic-matched visualisation (regularisation
  sliders, KNN boundary, bias-variance decomposition, gradient descent trace). They are
  interactive — adjust the sliders.
- **Math panel** — KaTeX-rendered equations with plain-language captions. Separate tab from the
  prose answer.

---

## 7. View modes and themes

**View modes** (toggle in the header):
- **Reality** — split-panel layout, pipeline rail on the left, workspace on the right. Good for
  reading answers carefully.
- **Matrix** — terminal/console aesthetic, matrix-green on dark, with a module coverage bar and
  a digital-rain canvas. Same functionality.

**Themes**: three themes available — matrix (dark, default at night), clinical (light, default
during daytime), reality. Theme follows your local clock on first load and then persists your
last choice.

---

## 8. Inference toggle

The settings drawer (gear icon in the header) lets you switch between Ollama-local and
free-cloud backends at runtime. The active model name is shown in the header pill. Changes take
effect on the next question.

---

## 9. Known limitations (beta scope)

| Item | Status |
|---|---|
| Console command chips (`/quiz`, `/sources`, `/eli5`, `/save`) | Rendered in Matrix mode but not yet wired — they do nothing |
| Reloop path (retrieve2/evaluate2) | Only fires when eval mean(f,r,c) < 0.80 — unlikely on well-scoped questions |
| Profile recovery | No password reset; if you forget your profile name, create a new one (history not recoverable) |
| Mobile layout | Not a v1 target — use on desktop |

---

## 10. Reporting issues

When reporting a bug, include:

1. Your question text
2. The inference backend shown in the header (e.g. `llama3.2` or `groq/llama-3.1-8b`)
3. Which pipeline stage it hung or failed on (from the stage rail or Agent Trace drawer)
4. A screenshot
5. Backend terminal output if available (the terminal running `launch.sh` shows uvicorn logs)
