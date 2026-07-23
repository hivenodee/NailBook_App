# PoroBook Notion Workspace — Setup Guide

**Time to set up: ~45 minutes. Once done, you never have to think about structure again.**

Designed for an ADHD brain: one home base, kanban for visual progress, low-friction quick-capture, daily/weekly templates so you don't have to decide structure when you're tired.

---

## What you're building

```
🏠 PoroBook HQ                          ← landing page (everything starts here)
├── 📌 Today                            ← daily focus template (use every morning)
├── 🗓️ Weekly Review                    ← Friday wrap-up template
├── 📋 Tasks                            ← all action items (database)
├── 🎯 Features                         ← product roadmap (database)
├── 🐛 Bugs                             ← bug log (database)
├── 💡 Ideas Inbox                      ← brain dump (database)
├── 🚀 Beta Providers                   ← cohort tracking (database)
├── 📣 Marketing Content                ← content calendar (database)
├── 📞 Meeting Notes                    ← calls + onboarding sessions (database)
└── 📚 Project Bible                    ← reference docs (sub-pages)
    ├── Overview
    ├── Product Spec
    ├── Marketing Playbook
    ├── Tech & Infrastructure
    ├── Design System
    └── Decisions & Open Questions
```

---

## Step 1 — Create the workspace (2 min)

1. Go to https://notion.so → click **`+ Add a page`** in the sidebar
2. Name it **`PoroBook HQ`**
3. Add a cover image — drag in `apps/web/public/brand/editorial-hands-marble.jpeg` from your repo
4. Add an icon — type `:home:` or pick the 🏠 emoji
5. Open `page-templates/01-homepage.md`, copy the entire content, paste into the page

You now have the HQ. Everything else hangs off this page.

---

## Step 2 — Create the databases (15 min)

For each database below, **inside the HQ page**:
1. Type `/database` → choose **`Database — Full page`**
2. Name it (see list below)
3. Click the `···` menu → **Merge with CSV** → upload the matching file from `databases/`
4. Configure column types per the schema below

### 2.1 — Tasks (the most important one)

- Page name: **`📋 Tasks`**
- Import: `databases/tasks.csv`
- Columns:

| Column | Type | Settings |
|---|---|---|
| Task | Title | (default) |
| Phase | Select | Options: 0, A, B, C, D, E, F, G, H — color each one differently |
| Priority | Select | Critical (red), Important (yellow), Polish (gray) |
| Status | Select | Not started, In progress, Done, Blocked (each a different color) |
| Effort (hrs) | Number | Format: Plain |
| Owner | Person or Text | Just "Justice" for now |
| Notes | Text | (default) |

**Views to add** (click `+ Add view` after import):

| View name | Type | Filter / Sort |
|---|---|---|
| **🔥 Today (Critical, in progress)** | Table | Filter: Priority = Critical AND Status = In progress |
| **📅 By Phase (Kanban)** | Board | Group by: Phase |
| **🚀 Active sprint** | Board | Group by: Status, Filter: Phase = "0", "C", or "D" |
| **✅ Done this week** | Table | Filter: Status = Done, sort by date |
| **📜 Everything** | Table | (no filter) |

### 2.2 — Features

- Page name: **`🎯 Features`**
- Import: `databases/features.csv`
- Columns:

| Column | Type | Settings |
|---|---|---|
| Feature | Title | (default) |
| Status | Select | Idea, Spec'd, Building, Shipped, Killed |
| Version | Select | V1 (current), V2 (next), V3 (someday), Out of scope |
| Type | Select | Provider, Client, Infrastructure, Admin |
| Description | Text | (default) |
| Notes | Text | (default) |

**Views:**
- **🚧 Building now** — Filter: Status = Building
- **📦 V1 scope** — Board, Group by Status, Filter: Version = V1
- **🔮 V2 roadmap** — Board, Group by Type, Filter: Version = V2
- **All features** — Table

### 2.3 — Bugs

- Page name: **`🐛 Bugs`**
- Import: `databases/bugs.csv`
- Columns:

| Column | Type |
|---|---|
| Bug | Title |
| Severity | Select — Blocker, Bug, Nit |
| Status | Select — Open, Fixing, Closed, Won't fix |
| Reported | Date |
| Page / area | Text |
| Notes | Text |

**Views:**
- **🔴 Open blockers** — Filter: Severity = Blocker AND Status ≠ Closed
- **🟡 All open** — Filter: Status = Open OR Fixing, sort by Severity
- **By page (Kanban)** — Board, Group by: Page / area
- **Closed log** — Filter: Status = Closed

### 2.4 — Ideas Inbox

- Page name: **`💡 Ideas Inbox`**
- Import: `databases/ideas-inbox.csv`
- Columns:

| Column | Type |
|---|---|
| Idea | Title |
| Category | Select — Feature, Marketing, Brand, Pricing, Partnership, Misc |
| Stage | Select — Raw, Considering, Spec'd, Killed |
| Date | Date — default today |
| Notes | Text |

**Views:**
- **📥 Raw inbox** — Filter: Stage = Raw, sort by Date descending
- **By category** — Board, Group by Category

**Purpose:** brain-dump zone. When a thought hits — feature, marketing angle, color idea, partnership lead — drop it here. Triage weekly during Weekly Review. Don't worry about formatting.

### 2.5 — Beta Providers

- Page name: **`🚀 Beta Providers`**
- Import: `databases/beta-providers.csv`
- Columns:

| Column | Type |
|---|---|
| Name | Title |
| Status | Select — Interested, Onboarded, Active, Churned, Declined |
| Onboarded date | Date |
| Verified | Checkbox |
| Bookings this month | Number |
| Last check-in | Date |
| City | Text |
| IG handle | URL |
| Notes | Text |

**Views:**
- **✨ Active** — Filter: Status = Active, sort by Last check-in ascending (most-overdue first)
- **🆕 Recently onboarded** — Filter: Onboarded date is within last 30 days
- **All providers** — Table

### 2.6 — Marketing Content

- Page name: **`📣 Marketing Content`**
- Import: `databases/marketing-content.csv`
- Columns:

| Column | Type |
|---|---|
| Title | Title |
| Channel | Select — Instagram, TikTok, Email, Press, Podcast, X, Threads, Other |
| Status | Select — Idea, Drafting, Scheduled, Published |
| Publish date | Date |
| Type | Select — Post, Story, Reel, Video, Email, Article |
| Asset URL | URL |
| Notes | Text |

**Views:**
- **🗓️ Calendar** — Calendar view, Date property: Publish date
- **📝 Drafting** — Filter: Status = Drafting
- **By channel** — Board, Group by Channel

### 2.7 — Meeting Notes

- Page name: **`📞 Meeting Notes`**
- Skip CSV import — start empty
- Columns:

| Column | Type |
|---|---|
| Title | Title |
| Date | Date |
| Type | Select — Onboarding call, Check-in, Bug review, Investor, Vendor, Other |
| Person | Text |
| Notes | Text |

**Views:**
- **🕓 Recent** — Filter: Date within last 30 days, sort by Date descending
- **By type** — Board, Group by Type
- **Onboarding calls only** — Filter: Type = Onboarding call

When you have a call, click **`+ New`**, use the template from `page-templates/06-onboarding-call-template.md` (paste into a new entry's body).

---

## Step 3 — Create the Project Bible sub-pages (10 min)

Inside HQ, type `/page` → **`Page`**. Create one for each:

1. **Overview** — paste content from `docs/claude-project/01-overview.md`
2. **Product Spec** — paste content from `docs/claude-project/02-product-spec.md`
3. **Marketing Playbook** — paste content from `docs/claude-project/03-marketing.md`
4. **Tech & Infrastructure** — paste content from `docs/claude-project/04-infrastructure.md`
5. **Design System** — paste content from `docs/claude-project/05-design-system.md`
6. **Decisions & Open Questions** — paste content from `docs/claude-project/06-decisions-and-open-questions.md`

Notion handles GitHub-style Markdown well. Tables, headers, checkboxes will render correctly.

Pro tip: group all 6 pages under a single parent page called **`📚 Project Bible`** for cleaner nav.

---

## Step 4 — Create the daily + weekly templates (5 min)

These are reusable templates you'll trigger every morning / Friday.

### Daily Today page

1. In HQ sidebar, create a new page called **`📌 Today`**
2. Paste content from `page-templates/02-today-template.md`
3. Use this page every morning: open it, fill out the 3 things, refer back during the day

OR convert it to a template within a database (advanced):
- Create a database called **`Daily Focus`** with a Date column
- Add a new template using the markdown content
- Every morning, click **`+ New`** → select the template → set Date = today

### Weekly Review page

1. In HQ sidebar, create **`🗓️ Weekly Review`**
2. Paste content from `page-templates/03-weekly-review-template.md`
3. Use every Friday afternoon — takes 15 minutes, prevents the "I lost a week" feeling

---

## Step 5 — Bookmark, install mobile, set notifications (5 min)

1. **Browser bookmark** — `Cmd+D` on the HQ page. Pin to bookmarks bar.
2. **Notion mobile app** — install on phone, sign in. Capture ideas from anywhere.
3. **Notion calendar widget** — optional, syncs to Google/iCal so you see Tasks alongside your real calendar
4. **Notification settings** — turn on for assigned tasks + comments

---

## How to use this workspace (the ADHD-friendly workflow)

### Every morning (5 min)

Open the **`📌 Today`** template. Fill in:
- **Today's 3 things** — the only commitments. If you do these 3, today is a win.
- **What's blocking me** — write down what you're stuck on. Half the time, writing it surfaces the answer.
- **Energy / focus** — rate 1–10. This contextualizes what tasks you should pick. Low-energy day = email + admin. High-energy day = onboarding wizard coding.

Then open **Tasks → 🔥 Today view**. If your 3 things aren't on that list yet, move them in.

### Throughout the day (instant capture)

When a thought hits — bug, idea, marketing angle — open Notion (web or mobile) and dump it in **`💡 Ideas Inbox`** or **`🐛 Bugs`**. Don't think about formatting. You'll triage later.

This is the most important habit. The Ideas Inbox stops your brain from carrying unfinished thoughts.

### Every Friday (15 min)

Open **`🗓️ Weekly Review`** template. Walk through:
- What did I ship this week? (look at Tasks done this week)
- What's still in progress?
- What did I learn?
- Triage the Ideas Inbox — move items to Features / Tasks / kill them
- Set 3 priorities for next week

This single ritual replaces "I have no idea where my week went" with "I can show what I shipped."

### Once a month

- Update **`🚀 Beta Providers`** — bookings this month, last check-in dates
- Snapshot of the **`Tasks → ✅ Done this week`** stats — feel the progress
- Reflect on the Decisions doc — anything need to move from "open" → "decided"?

---

## Optional power-ups (do these later, not now)

| Feature | Effort | Why bother |
|---|---|---|
| **Notion AI** ($10/mo) | 0 | Lets you ask Claude-like questions against your own docs. Worth it once the workspace has substance. |
| **Slack integration** | 15 min | Push task updates to a Slack channel. Skip until you have collaborators. |
| **GitHub integration** | 15 min | Auto-create tasks from new GitHub issues. Useful once you have an issue queue. |
| **Google Calendar 2-way sync** | 20 min | Tasks with due dates show on your real calendar. Worth it if you live in Google Cal. |
| **Notion Forms** | 10 min | Lets beta providers submit feedback via a form that auto-creates a Bug or Idea row. Worth it at 10+ active providers. |

Don't set these up day one. Get the base working first, then layer in as needs surface.

---

## Files in this folder

| File | Purpose |
|---|---|
| `00-SETUP-GUIDE.md` | This file. Walks you through everything. |
| `page-templates/01-homepage.md` | Paste into the **HQ** page after creating it. |
| `page-templates/02-today-template.md` | Paste into the **📌 Today** page. Use every morning. |
| `page-templates/03-weekly-review-template.md` | Paste into the **🗓️ Weekly Review** page. Use every Friday. |
| `page-templates/04-bug-template.md` | Paste into the body of new Bugs database entries when reporting a bug. |
| `page-templates/05-feature-spec-template.md` | Paste into the body of new Features database entries when spec-ing a feature. |
| `page-templates/06-onboarding-call-template.md` | Paste into the body of new Meeting Notes when running a beta onboarding call. |
| `databases/tasks.csv` | Pre-populated with the launch playbook items (Phase 0 through H). |
| `databases/features.csv` | Pre-populated with current V1 features + V2 candidates. |
| `databases/bugs.csv` | Pre-populated with the bugs from `BUGS.md`. Mostly closed. |
| `databases/ideas-inbox.csv` | Empty template — your brain dump zone. |
| `databases/beta-providers.csv` | Empty template — fill in as you recruit. |
| `databases/marketing-content.csv` | Empty template — fill in as you draft posts. |

---

## TL;DR for setup

1. Create HQ page → paste homepage content
2. Create 7 databases, import 6 CSVs, configure column types per spec
3. Add views per database (filtered Today, kanban by Phase, etc.)
4. Create Project Bible sub-pages, paste in the 6 context docs
5. Create Today + Weekly Review pages, paste templates
6. Bookmark, install mobile app
7. Tomorrow morning — open Today, write your 3 things. Go.

This is the only workspace you need until you have 10+ beta providers. After that, revisit and add what's missing.
