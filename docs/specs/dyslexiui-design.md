# Dyslexia-First Chat Wrapper — Design Rationale

## Core Philosophy

This is not a "chat app with accessibility features." It is a **reading-stress reduction environment** that happens to chat with AI. Every decision prioritizes cognitive load reduction over visual polish.

---

## Typography

### Font Choice: Lexend
- **Why:** Designed specifically for reading fluency. Wide letterforms, heavy bottom weighting, and open apertures reduce character confusion (b/d/p/q, n/u, m/nn).
- **Fallbacks:** OpenDyslexic (if locally installed), Comic Sans MS (surprisingly effective for dyslexia due to irregular letterforms), then system sans-serif.
- **Why not Inter/Roboto:** Geometric precision creates mirror-image confusion. Perfect circles in 'o' and 'b' increase substitution errors.

### Spacing
- **Line height: 1.8** (default). Standard web line-height (1.4-1.5) creates crowding. Dyslexic readers need white space to anchor their gaze.
- **Letter spacing: +0.04em.** Tight kerning (default in most fonts) causes letters to bleed together. Slight expansion improves letter-level decoding.
- **Word spacing: +0.08em.** Prevents word crowding and reduces the "river effect" in justified text.
- **Paragraph spacing: 1.5em.** Clear chunking between ideas reduces working memory overload.

### Measure (Line Width)
- **Default: 65ch.** The dyslexic eye struggles with long saccades. 45-75 characters is the optimal range; we default to the middle and allow adjustment.
- **Never justified.** Ragged right edges create consistent spacing between words. Justification creates variable spacing that disrupts rhythmic reading.

---

## Color & Contrast

### Background: Warm Paper (#F5F2EB)
- **Why not white:** Pure white (#FFFFFF) causes visual stress and halation (light scatter in the eye). Warm cream reduces glare and mimics physical paper.
- **Dark mode:** Warm dark (#1C1A16), not pure black. Pure black creates halation with light text. Warm dark maintains the paper metaphor.

### Text: Soft Black (#1E1B16)
- **Why not pure black:** Maximum contrast (#000 on #FFF) causes eye strain and letter vibration. We use ~90% contrast instead of 100%.
- **Accent: Deep Teal (#2D6B6B).** Blue-green tones are dyslexia-friendly. We avoid red/green combinations (colorblindness co-occurrence).

---

## Motion & Animation

### Policy: None by default
- **No fade-ins** on messages. Appearing text creates a tracking challenge.
- **No smooth scroll.** Automatic motion disorients readers who use their finger or cursor to track lines.
- **Respects `prefers-reduced-motion`.** If the OS requests reduced motion, all transitions collapse to 0.01ms.

---

## Layout & Visual Hierarchy

### Sidebar + Main Split
- **Fixed width sidebar (320px).** Predictable spatial memory — the history is always in the same place.
- **Messages centered with max-width.** Prevents the eye from wandering across the full viewport width.

### Message Design
- **Left border accent:** 4px colored bar on the left edge of each message bubble. Creates a visual anchor without adding background noise.
- **User vs. AI distinction:** Warm sepia for user, white for AI. No bright blues or greens that compete with text.
- **No bubbles with tails.** Chat "bubbles" with speech tails add visual clutter. We use simple bordered cards.

---

## Brand Agnosticism

### API Layer
The wrapper accepts any **OpenAI-compatible HTTP endpoint**:
- Kimi (`https://api.moonshot.cn/v1`)
- OpenAI (`https://api.openai.com/v1`)
- Groq, Together, Fireworks, local proxies (Ollama, llama.cpp server)
- Any custom base URL + bearer token

### Why this approach
Instead of hardcoding SDKs for each provider, we use the de facto standard: HTTP + JSON + SSE streaming. This keeps the wrapper a single HTML file with zero build steps and zero dependencies.

---

## Data Privacy

- **All data stays in the browser.** API keys are stored in `localStorage` (encrypted at rest by the OS/browser, never transmitted to any server except the configured API endpoint).
- **No analytics, no telemetry, no external assets** except the Google Fonts CDN for Lexend (which can be self-hosted by downloading the font).
- **Export/Import:** Pure JSON files. No lock-in.

---

## Keyboard & Screen Reader Support

- **Enter to send, Shift+Enter for newline.** Standard, predictable.
- **Focus indicators:** 3px solid outline on all focusable elements. Never rely on color alone.
- **ARIA labels** on input and send button.
- **Semantic HTML:** `<aside>` for sidebar, `<main>` for chat, `<textarea>` for input (not a div with `contenteditable`).

---

## Customization Dials

The settings panel exposes the variables that actually matter for reading comfort:

| Control | Range | Why |
|---------|-------|-----|
| Font size | 14–26px | Not everyone wants 18px; some need larger |
| Line height | 1.4–2.4 | Crowding vs. scattering preference varies |
| Letter spacing | 0–0.15em | Some dyslexics need heavy expansion |
| Line width | 45–90ch | Saccade length control |

These are saved to `localStorage` and applied instantly via CSS custom properties.

---

## Why Single-File HTML?

1. **Zero build step.** Open the file, configure API, chat.
2. **Auditable.** You can read every line of code in one view.
3. **Hostable anywhere.** GitHub Pages, Netlify, or `file://` locally.
4. **No dependency rot.** No npm, no webpack, no left-pad.

---

## Future Extensions (if you fork this)

- **OpenDyslexic font injection** (self-hosted WOFF2)
- **Ruler/screen tint overlay** (colored overlay reduces visual stress for some Irlen syndrome readers)
- **Text-to-speech integration** (Web Speech API for reading responses aloud)
- **Syllable highlighting** (auto-color alternation of syllable breaks)
- **Bionic reading mode** (bold first half of words to anchor fixation)
