# Create & Conquer 2026 Hackathon Workspace

Welcome to the documentation and planning workspace for the **Create & Conquer 2026 Hackathon**. This event is proudly organized by the FEU Institute of Technology Computer Engineering Organization (CpEO), in partnership with the FEU Innovation Center and ICpEP.SE-NCR.

This repository serves as the central hub for the event's core guidelines, theme details, and internal notes.

## Ciel — Hackathon Submission (Theme #2)

| Deliverable | File |
|-------------|------|
| Proof of Concept | [`docs/PoC.md`](docs/PoC.md) |
| Project Brief | [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) |
| Video demo script (1–3 min) | [`docs/elimination-video-script.md`](docs/elimination-video-script.md) |
| Finals scoring tool | [`scripts/score_finals.py`](scripts/score_finals.py) |
| Export MD → Word (.docx) | `node scripts/md_to_docx.mjs docs/PoC.md` *(requires [pandoc](https://pandoc.org/))* |

Full documentation index: [`docs/index.md`](docs/index.md)

## � How to Use Ciel

### Try the deployed app (no setup)

The fastest way to explore Ciel is the live deployment:

- **URL:** https://ciel.axonenjin.com/
- **Email:** `geraldberongoy05@gmail.com`
- **Password:** `Password123.`

> Demo credentials for evaluation only. Please don't change the password or delete shared data.

### Run it locally

**Prerequisites**

- **Node.js** (use the workspace version: `nvm use v25.8.2`) + npm
- **Python 3.11+** with `pip`
- A **Supabase** project (URL + keys) and a **Microsoft Foundry** GPT deployment

The stack has two services: the **Next.js web app** (`client/`) and the **Python AI service** (`ai_service/`). Run both.

#### 1. Clone and apply the database schema

```bash
git clone <repo-url> ciel
cd ciel
# Apply migrations in supabase/migrations/ to your Supabase project
# (via the Supabase SQL editor or the Supabase CLI: `supabase db push`)
```

#### 2. Start the AI service (`ai_service/`)

```bash
# from the repo root
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp ai_service/.env.example ai_service/.env   # if present, otherwise create it
```

Set these variables in `ai_service/.env`:

```env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
FOUNDRY_ENDPOINT=https://<resource>.services.ai.azure.com
FOUNDRY_API_KEY=<foundry-api-key>
FOUNDRY_DEPLOYMENT_GPT=gpt-5.4
AI_SERVICE_API_KEY=<shared-secret-with-the-web-app>
```

Verify the DB connection and seed the evidence corpus, then run the API:

```bash
python scripts/setup_db.py --check
python scripts/setup_db.py --seed        # optional: load the evidence corpus
uvicorn ai_service.main:app --reload --port 8000
```

The AI service is now at http://localhost:8000.

#### 3. Start the web app (`client/`)

```bash
nvm use v25.8.2
cd client
npm install
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=<same-shared-secret-as-the-AI-service>
```

Then run the dev server:

```bash
npm run dev
```

Open http://localhost:3000 and sign up (or sign in) to start: turn a social need into a **Theory of Change → grant proposal → predictive M&E loop**.

### Tests

```bash
# Web app
cd client && npm test

# AI service (from repo root)
pytest

# AI quality + safety eval gate
python scripts/run_eval.py --suite core --gate
```

## �📁 Repository Structure

- [**`hackathon-guide.md`**](docs/hackathon-guide.md)
  The comprehensive participant primer and practical working reference. It covers everything from the event timeline and eligibility to submission checklists, team roles, judging criteria, and **Theme #2** (§15).

- [**`judges.md`**](docs/judges.md)
  Profiles, areas of expertise, and internal organizer notes regarding the confirmed judging panel (e.g., Reynaldo Bagua, Engr. John Edward Adriano, Justine Tence).

## 🗓️ Quick Timeline

| Event                       | Date          |
| :-------------------------- | :------------ |
| **Registration Opens**      | June 9, 2026  |
| **Registration Closes**     | June 20, 2026 |
| **Orientation & Kickoff**   | June 23, 2026 |
| **Proposal Deadline**       | June 26, 2026 |
| **Final Output Submission** | June 29, 2026 |
| **Demo Day & Awarding**     | June 30, 2026 |

## 📞 Contact Information

**Event Heads:**

- **Rizza C. Resulta** (Event Head) - cpeo.feutech.vpexternal@gmail.com
- **Gero Achilles H. Fernandez** (Event Co-head) - cpeo.feutech.dfevents@gmail.com

**Official Channels:**

- **Email:** createandconquer.hackathon@gmail.com
- **Facebook:** [facebook.com/feutechCpEO](https://facebook.com/feutechCpEO)
