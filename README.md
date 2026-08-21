[README.md](https://github.com/user-attachments/files/31305728/README.md)
<div align="center">

# 🏦 Apex Capital Bank

### An AI-native banking CRM — where every feature has an agent behind it.

Core banking, live market data, Gmail, Google Calendar, and a fleet of
purpose-built AI assistants, wired into one clean React + FastAPI app.

[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind](https://img.shields.io/badge/Styling-Tailwind_v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-lightgrey)]()

</div>

---

## Why this project is different

Most student/portfolio banking apps stop at CRUD: create an account, move
some money, show a table. Apex Capital Bank treats **every domain as its
own AI agent** — banking, email, calendar, weather, crypto, web search, and
image generation each get a dedicated Gemini-powered assistant with its
own tools, its own guardrails, and its own personality — all sitting behind
a single polished dashboard.

It's a real answer to the question: *"What does a banking app look like
when an LLM is a first-class citizen of the architecture, not a chatbot
bolted on the side?"*

---

## ✨ Features

### 💳 Core Banking
Full account lifecycle — create accounts, deposit, withdraw, transfer
between accounts, view balances, and browse transaction history — with
strict per-user account ownership enforced on every operation.

### 🤖 Your AI Assistant
A Gemini-powered banking agent with **function calling** wired directly
into the bank's own tools. Ask it to check a balance, move money, or pull
a transaction history in plain English — it calls the real backend logic,
never hallucinates numbers, and refuses to touch any account that isn't
yours.

### 📚 Policy-Aware RAG
Ask questions about the bank's actual terms and conditions and get answers
grounded in the real policy document — retrieved with a lightweight
TF-IDF search (no multi-gigabyte ML dependencies) and answered by Gemini.

### 📧 AI Email Agent (Gmail-integrated)
- **Draft & Send** — describe an email in plain language, review an
  AI-written draft, edit it, and send it through your own connected
  Gmail account. Nothing goes out without your approval.
- **Email Reader** — ask natural-language questions about your recent
  inbox and get summarized, sourced answers.

### 📅 AI Calendar Agent
Connected to Google Calendar via OAuth — ask about upcoming events or have
the agent create new ones for you, in conversation.

### 🌦️ Weather Agent
Live, tool-grounded weather for Lahore, Karachi, Islamabad, Peshawar, and
Quetta — never invented, always fetched.

### 📈 Crypto Agent
Real-time market data for BTC, ETH, BNB, SOL, and XRP — price, 24h change,
high/low, and volume, via live function calling.

### 🔎 Web Search Agent
A Tavily-powered research agent for grounded, up-to-date web answers
inside the app.

### 🎨 AI Image Generator
Text-to-image generation via Cloudflare Workers AI (FLUX).

### 🔐 Secure Google Integration
Full OAuth 2.0 + **PKCE** flow for Gmail and Calendar, with per-user
encrypted token storage, incremental scope authorization, and safe
token refresh — connect once, and every Google-powered agent just works.

---

## 🧠 How it's built

Every AI feature follows the same disciplined pattern: a narrow **system
instruction** that locks the agent to its domain, a small set of
**real, callable tools** (never free-form guesses), and a strict refusal
rule for anything outside its lane. The banking assistant, for example,
is hard-scoped to the signed-in user's own accounts — it will not read,
touch, or discuss anyone else's balance, no matter how it's asked.

```
Frontend (React 18 + Tailwind v4 + Recharts)
        │  fetch / JSON
        ▼
Backend (FastAPI)
        │
        ├── bank_logic.py        → accounts, transactions, auth
        ├── agent_logic.py       → banking AI agent (Gemini + tools)
        ├── rag_agent.py         → policy Q&A (TF-IDF + Gemini)
        ├── email_agent.py       → draft/send (Gmail API)
        ├── email_reader_agent.py→ inbox Q&A (Gmail API)
        ├── calendar_agent.py    → Google Calendar (events)
        ├── weather_agent.py     → weather (live tool calls)
        ├── crypto_agent.py      → market data (live tool calls)
        ├── tavily_agent.py      → web search
        ├── image_agent.py       → image generation (Cloudflare AI)
        └── google_oauth.py      → OAuth 2.0 + PKCE, encrypted tokens
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, Recharts |
| Backend | FastAPI, Uvicorn |
| AI | Google Gemini (`google-genai`), function calling |
| Retrieval | scikit-learn (TF-IDF) |
| Integrations | Gmail API, Google Calendar API, Tavily Search, Cloudflare Workers AI |
| Auth | OAuth 2.0 with PKCE, encrypted token storage (`cryptography`) |
| Database | SQLite |

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/Wahaj-A/APEX-BANK.git
cd APEX-BANK
```

### 2. Backend setup
```bash
cd Backend
pip install -r requirements.txt
cp .env.example .env   # fill in your API keys — see below
uvicorn main:app --reload
```

### 3. Frontend setup
```bash
cd Frontend
npm install
cp .env.example .env   # point VITE_API_URL at your backend
npm run dev
```

The app runs at `http://localhost:5173`, talking to the API at
`http://localhost:8000`.

### 4. Configure your `.env`
You'll need API keys for:

| Service | Used for |
|---|---|
| `GEMINI_API_KEY` | All AI agents |
| `TAVILY_API_KEY` | Web Search Agent |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail + Calendar OAuth |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | Image Generator |

Full step-by-step setup for Google OAuth and the Calendar agent is in
[`GOOGLE_OAUTH_SETUP.md`](./GOOGLE_OAUTH_SETUP.md) and
[`CALENDAR_AGENT_SETUP.md`](./CALENDAR_AGENT_SETUP.md).

---

## 🗺️ Roadmap

- [ ] Move Google OAuth from Testing to Production (Google verification)
- [ ] Multi-currency account support
- [ ] Push notifications for transactions
- [ ] Voice input for the AI Assistant

---

## 📄 License

Proprietary — all rights reserved. This project is a portfolio /
demonstration application and is not licensed for redistribution.

---

<div align="center">
Built with care by <a href="https://github.com/Wahaj-A">Wahaj-A</a>
</div>
