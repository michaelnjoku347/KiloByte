# Syllabus

High-end academic deadline calendar for Farmingdale State College coursework across **Brightspace**, **Cengage**, **Zybooks**, and **VHL Central**.

## Run

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Features

- Month, week, and agenda views
- Color-coded sources for each platform
- Quick-add assignments with course, due time, notes, and link
- Reminder offsets (1 week / 3 days / 1 day / 1 hour / at due time)
- Browser notifications while the app tab is open
- ICS import via Brightspace calendar feed URL or `.ics` file upload
- Local-only storage in your browser (no account required)

## Syncing platforms

| Platform | How to get deadlines into Syllabus |
| --- | --- |
| Brightspace (FSC) | Calendar → Subscribe / export ICS → Import ICS in Syllabus |
| Cengage | Quick Add with source set to Cengage |
| Zybooks | Quick Add with source set to Zybooks |
| VHL Central | Quick Add with source set to VHL |

Automated login scraping of those sites is intentionally not included. Use official ICS exports where available, and Quick Add for the rest.

## Build

```bash
npm run build
npm run preview
```
