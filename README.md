# Gauvaani Amrit - Dairy Sathi ERP (login + backend + frontend)

```
backend/   FastAPI + SQLite + JWT login + Gemma proxy + Vaani chat endpoint
frontend/  React + Vite + Tailwind (login page + your dashboard)
```

## 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then edit .env (see below)
uvicorn main:app --reload --port 8000
```
Edit `backend/.env`:
- `GEMMA_API_KEY=` your Google AI Studio key (paste it HERE, not in chat or in frontend code)
- `JWT_SECRET=` run `python -c "import secrets; print(secrets.token_urlsafe(48))"`

Check it: http://localhost:8000/api/health  (shows `ai_configured: true` once the key is set)

## 2. Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
Open the site -> "Create account" -> you land in the dashboard. Each account only ever sees its own data.

## 3. Production (single server)
```bash
cd frontend && npm run build        # creates frontend/dist
cd ../backend && uvicorn main:app --host 0.0.0.0 --port 8000
```
The backend serves `frontend/dist` automatically. Put it behind HTTPS (Nginx/Caddy), set `CORS_ORIGINS` to your domain.

## What is stored per user
`pnlData`, `loans`, `inventory`, `farm`, `settings` (auto-saved ~0.6 s after any change) and every milk batch you "Save to Ledger".
New accounts start with the sample data from your original file; edit it freely.

## What's new in v5
- **Left sidebar navigation** (slide-in drawer on phones). Gemma API and Yield AI pages were removed.
- **Home = Vaani chat.** Vaani is a calm, sweet female assistant (Hindi + English, soft female voice where the browser has one). Under the chat: today's milk, today's profit/loss, monthly profit, credit, a 7-day chart and a farm profile.
- **Vaani can edit everything on command**: daily milk records, milk-lab values, monthly P&L entries, loan accounts and payments, inventory, farm profile, language/theme/voice. Examples:
  - "Add today's record: morning 12 L, evening 10 L, rate 52, feed 400"
  - "Rameshwar paid 500" / "Add a loan for Mahesh, 15000" / "Remove Sunita's account"
  - "Straw stock is 600 kg now" / "Change fat to 6.8 and save the batch"
  - Every change is validated by the app before it is applied, and the latest change has an **Undo** button.
- **Financials -> Daily register**: record morning/evening litres, litres sold, rate, other income, feed/labour/medicine/other costs for every day. Shows profit or loss per day, a month summary, a chart, an editable table and CSV export. Daily records also keep the monthly P&L chart in step.
- New per-user data key `dailyRecords`; new endpoint `POST /api/ai/chat`.

Voice notes: spoken replies and the microphone use your browser's built-in speech (Chrome/Edge work best). Which female voice you hear depends on the voices installed on the device.

## If Vaani says she can't think / can't reach the AI
From the `backend` folder (virtual environment active) run:

    python check_ai.py

It checks your `.env`, internet/DNS access to Google, whether your key works, which models your key can use,
and sends a real test message to each model. It never prints your key. After changing `.env`, restart `uvicorn`.
The backend tries `GEMMA_MODEL` first. If it is slow, overloaded or missing, it asks Google which models your key can use and
automatically falls back to the newest stable Gemini Flash (you can also list models in `FALLBACK_MODELS`).
Google retires model names often (e.g. `gemini-2.5-*`), so this avoids hard-coding one.

## Make sure the NEW backend is the one running
Open http://localhost:8000/api/health. It must show `"build": "2026-11-14-autopick"` (and `running_from`, the exact file being used).
If `build` is missing or different, an old server is still running. On Windows:

    netstat -ano | findstr :8000          (note the PID in the last column)
    taskkill /PID <that number> /F

then start again from the `backend` folder: `uvicorn main:app --reload --port 8000`.

## Cattle Management (new sidebar section)
- Add each animal with its **cattle number (tag)**, type (cow / buffalo / bull / calf), **breed** (common Indian breeds suggested), **age** (years + months; it keeps growing by itself), **count** (use more than 1 for a group such as 5 calves) and **health status**.
- Every animal has a **health report history**: date, status (healthy / under observation / sick / recovering), findings, treatment or vaccine, vet name and **next checkup date**. Overdue checkups (or due within 7 days) are flagged, and the sidebar shows how many animals need attention.
- Search by number or breed and filter by health status. The Farm profile's "Animals" number on Home is counted from these records.
- Vaani can do it all by voice or text, for example: "Add cow 112, Gir breed, 4 years 3 months", "Cow 12 has fever, vet Dr Singh gave antibiotics, check again on 25 November", "Change buffalo 7 age to 5 years", "Remove calf C-7".
- New per-user data key `cattle`; the backend `BUILD` is now `2026-11-20-cattle` (check http://localhost:8000/api/health after restarting).

## Sign in with email or mobile number (login page)
- The sign-in box accepts **either an email address or a 10-digit Indian mobile number** (`98765 43210`, `+91 98765 43210`, `09876 54321` and Devanagari digits all work).
- **Create account** takes an email, a mobile number, or both (at least one). Accounts made with only a mobile number work fine.
- **Existing accounts:** click your name at the bottom of the sidebar -> "Sign-in details" to add a mobile number (or change the email). You can then sign in with either.
- The login page has **हिन्दी / English** buttons (the choice is remembered and shared with the dashboard) and follows your device's **light / dark** setting automatically. The round button next to the language buttons cycles Automatic -> Light -> Dark.
- The database upgrades itself on the first start (a `phone` column is added; nothing is deleted). Copy `gauvaani.db` somewhere safe before the first run if you want a backup.
- Note: mobile numbers are **not verified by SMS/OTP** yet, so treat them as a convenient sign-in name, not proof of ownership. Passwords are still required, and sign-in attempts are rate limited.

## Faster, more reliable Vaani
- The newest **Gemini Flash** model answers first (`AI_MODEL_ORDER=fast`, the default) and your `GEMMA_MODEL` is the backup. Set `AI_MODEL_ORDER=configured` in `.env` to try Gemma first again.
- Gemini 3 models "think" at a high level by default, which is slow for chat. The backend asks for `thinkingLevel: low` and a JSON answer. If Google rejects a setting, the backend asks again without it.
- One shared connection to Google (no new secure handshake per message), the model list is looked up when the server starts, and each message has a hard 40-second limit.
- In the chat, a failed answer has a **Try again** button, and after 7 seconds a "still thinking" note appears.
- `python check_ai.py` now also times the exact request the chat sends (step 5).

### Slow models no longer block Vaani
Models are asked fastest first (newest Gemini Flash, then Flash-Lite, then older Flash, then your Gemma model). If a model has not answered after 6 seconds the next one is asked **as well** and the first answer wins. A model that was too slow is tried last for a few minutes. After 40 seconds in total the chat shows which models were tried. `python check_ai.py` step 6 checks whether large requests are being stalled by your network.

