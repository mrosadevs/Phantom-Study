# 👻 Phantom Study

### AI-Powered Study Platform — Flashcards, Quizzes & More

<div align="center">

![AI](https://img.shields.io/badge/AI%20Powered-Study%20Tools-c8ff00?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live-10b981?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Backend-Supabase-7000ff?style=for-the-badge)

**Turn your notes and slides into flashcards, quizzes, and fill-in-the-blank sets instantly with AI. Study smarter, not harder.**

[🌐 Live Site](https://study.mrosadev.site)

</div>

---

## ✨ Features

- 🧠 **AI Generation (bring your own key)** — Paste notes or upload slides, get study sets instantly. Supports OpenAI, Anthropic, and Google Gemini; your key is stored only in your browser.
- 📋 **No-key Import** — Copy a ready-made prompt into any chatbot, paste the JSON back, done
- 📇 **Flashcards** — Flip-style cards with front/back for active recall
- ❓ **Quizzes** — Multiple-choice questions generated from your content
- ✏️ **Fill-in-the-Blank** — Cloze-style exercises for deeper retention
- 🎨 **Cyberpunk Aesthetic** — Electric lime, deep violet, and hot pink on pure black
- 🔊 **Noise Texture Overlay** — SVG-based grain for that premium dark UI feel
- ☕ **Ko-fi Integration** — Support button built right in
- 📱 **Fully Responsive** — Mobile to ultrawide

---

## 🎨 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#c8ff00` | Electric lime — primary accent |
| `--accent2` | `#7000ff` | Deep violet |
| `--accent3` | `#ff2d6b` | Hot pink |
| `--accent4` | `#00d4ff` | Cyan |
| `--bg` | `#06060a` | Background |
| `--text` | `#eeeeff` | Primary text |

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| 📄 Frontend | HTML5, CSS3, Vanilla JS |
| 🗄️ Backend | Supabase (Auth + Database) |
| 🎨 Fonts | Bebas Neue, Barlow Condensed, JetBrains Mono, Syne |
| ☕ Donations | Ko-fi Widget |

---

## 🚀 Getting Started

```bash
# Serve locally (static site with Supabase client)
npx serve .
```

> **Note:** Supabase credentials must be configured in the code for accounts and saved study sets. The landing page works standalone.
>
> **AI keys:** There is no hosted API key and no server proxy. Users paste their own key into **AI Settings** on the module page; it is kept in `localStorage` and sent straight to the provider, never to this app. Model IDs are editable in the same panel, so a provider retiring a model does not require a redeploy. Users without a key can use the copy-prompt / paste-JSON import instead.

---

## 📂 Project Structure

```
Phantom-Study/
├── 📄 index.html    # Full app — markup, styles, scripts, Supabase client
└── 📖 README.md     # You're here
```

---

<div align="center">

👻 **Study smarter. Not harder.** ⚡

</div>
