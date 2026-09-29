<div align="center">

<img src="public/icon-512x512.png" alt="Nate's Portfolio logo" width="96" height="96" />

# ✦ Nate's Portfolio ✦

### Games, renders, and systems — built while studying toward environmental engineering.

<br />

[![Live](https://img.shields.io/badge/LIVE-nateanderson.dev-55FFFF?style=for-the-badge&labelColor=0b0b1a)](https://nateanderson.dev)
[![Deploys](https://img.shields.io/badge/DEPLOYS-Vercel-FFFFFF?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0b0b1a)](https://vercel.com)

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-55FFFF?style=flat-square&logo=react&logoColor=0b0b1a)
![TypeScript](https://img.shields.io/badge/TypeScript-5555FF?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-00AAAA?style=flat-square&logo=tailwindcss&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-FF55FF?style=flat-square&logo=framer&logoColor=0b0b1a)
![Supabase](https://img.shields.io/badge/Supabase-55FF55?style=flat-square&logo=supabase&logoColor=0b0b1a)

<br />

**🟦 [Visit the site](https://nateanderson.dev)** &nbsp;·&nbsp; **🟩 [Play the games](https://nateanderson.dev/creations/games)** &nbsp;·&nbsp; **🟪 [About me](https://nateanderson.dev/about)**

</div>

<br />

---

## ✧ What is this?

My personal corner of the internet: a portfolio, a playground, and a running log of everything I make. The whole site is themed like a **Minecraft / Hypixel SkyBlock menu** — pixel headers, glowing rainbow text, glassy panels, and a floating dock for navigation — while staying fast, responsive, and readable.

> [!NOTE]
> The site is a work in progress. Some pages are placeholders while I build them out one at a time.

---

## ✦ Explore

| | Section | What you'll find |
| :-: | :-- | :-- |
| 🏠 | **[Home](https://nateanderson.dev)** | Glowing rainbow name, rotating tagline, identity marquee, landing timeline |
| 🙋 | **[About](https://nateanderson.dev/about)** | Running stats, race breakdown, philosophy, education timeline, skills tree |
| 🛠️ | **[Creations](https://nateanderson.dev/creations)** | Hub for games, projects, renovations, and artwork |
| 🎮 | **[Games](https://nateanderson.dev/creations/games)** | Browser games — daily puzzles, unlimited practice, and more on the way |
| 📚 | **[Studies](https://nateanderson.dev/studies)** | Coursework explorer and study notes |
| 🗓️ | **[Timeline](https://nateanderson.dev/timeline)** | Milestones and countdowns |
| 📜 | **[History](https://nateanderson.dev/history)** | Commit history pulled live from GitHub |
| ✍️ | **[Blog](https://nateanderson.dev/blog)** | Writing and updates |

---

## 🎮 Games

Playable right in the browser, with a **daily** mode (same puzzle for everyone) and an **unlimited** mode for practice.

| Game | Description |
| :-- | :-- |
| 🗺️ **Outline Guesser** | Worldle-style: identify a country from its outline. Daily schedule, filters, a neighbours round, a flag round, and an end-of-run summary. |
| 🚩 **Flag Guesser** | Name the country from its flag. Tile-flip reveal, country dice, and full keyboard controls. |

More daily and repeatable games are planned.

---

## 🎨 Design language

<table>
<tr>
<td width="50%" valign="top">

**Look & feel**

- Minecraft pixel font for titles and section labels
- Rainbow glow text and animated blinking accents
- Glass panels with a liquid-glass filter
- Floating dock navigation (mobile dock included)
- Page transitions and smooth motion throughout

</td>
<td width="50%" valign="top">

**The palette**

| Token | Color |
| :-- | :-- |
| `mc-aqua` | ![#55FFFF](https://img.shields.io/badge/-55FFFF-55FFFF?style=flat-square) |
| `mc-green` | ![#55FF55](https://img.shields.io/badge/-55FF55-55FF55?style=flat-square) |
| `mc-yellow` | ![#FFFF55](https://img.shields.io/badge/-FFFF55-FFFF55?style=flat-square) |
| `mc-gold` | ![#FFAA00](https://img.shields.io/badge/-FFAA00-FFAA00?style=flat-square) |
| `mc-red` | ![#FF5555](https://img.shields.io/badge/-FF5555-FF5555?style=flat-square) |
| `mc-light-purple` | ![#FF55FF](https://img.shields.io/badge/-FF55FF-FF55FF?style=flat-square) |
| `mc-blue` | ![#5555FF](https://img.shields.io/badge/-5555FF-5555FF?style=flat-square) |

</td>
</tr>
</table>

---

## 🧱 Tech stack

| Layer | Tools |
| :-- | :-- |
| **Framework** | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui, Radix UI, `next-themes` |
| **Motion** | `motion/react` |
| **Maps & data** | `d3-geo`, `topojson-client` (country outlines) |
| **Backend** | Supabase |
| **Hosting** | Vercel, auto-deployed from `main` |

---

## 🚀 Run it locally

```bash
git clone https://github.com/FreezingShock/nateanderson-dev.git
cd nateanderson-dev
npm install
```

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
GITHUB_TOKEN=your-github-token   # optional, used for the History page
```

Start the dev server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

| Command | Does |
| :-- | :-- |
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint the code |
| `npm run format` | Format with Prettier |

---

## 🗂️ Project structure

```text
├── app/            # Routes (App Router): about, creations, studies, timeline, history, blog
├── components/     # Site UI: dock, hero, footer, games, explorers, glass panels
│   └── ui/         # shadcn/ui primitives
├── lib/            # Data and helpers: creations, timeline, studies, GitHub, Supabase
├── actions/        # Server actions
├── scripts/        # Build scripts for game data (outlines, neighbours, flags, daily schedule)
└── public/         # Icons, flags, static assets
```

---

<div align="center">

**Built by [Nate](https://github.com/FreezingShock)** &nbsp;·&nbsp; [nateanderson.dev](https://nateanderson.dev)

<sub>✦ made with too much rainbow ✦</sub>

</div>
