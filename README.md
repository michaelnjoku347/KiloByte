# Syllabus

Local-first academic deadline calendar for Farmingdale State College coursework across **Brightspace**, **Cengage**, **Zybooks**, and **VHL Central**.

## What this is (and is not)

- A calendar UI with Quick Add, filters, and reminders
- Brightspace support via **uploaded `.ics` files**
- Demo deadlines on first launch (fake sample courses — not live campus data)
- **Not** a scraper: nothing logs into Brightspace, Cengage, Zybooks, or VHL

Browser notifications only fire while this tab is open. For phone alerts, **Export ICS** and import that file into Google Calendar or Apple Calendar.

## Run

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run build   # typecheck + production build
npm run test    # unit tests
npm run lint
npm run smoke   # optional headed browser smoke (needs Chromium via puppeteer)
```

## Syncing platforms

| Platform | How |
| --- | --- |
| Brightspace (FSC) | Calendar → download/export `.ics` → **Sync → Upload** |
| Cengage / Zybooks / VHL | **Quick Add** |
| Phone reminders | **Export ICS** → import into Google/Apple Calendar |
| Backup | **Backup JSON** / restore from Sync |

Pasting a Brightspace ICS *URL* usually fails because browsers block cross-origin calendar feeds (CORS). File upload is the supported path.

## Privacy

All data stays in `localStorage` on your device unless you export it.
