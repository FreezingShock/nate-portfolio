---
name: develop-feature
description: End-to-end feature development for nateanderson-dev — from ideation through GitHub deployment with integrated memory and browser verification
---

# 🚀 nateanderson-dev Feature Development Pipeline

**Use this skill whenever you want to:** Add a new page, implement a feature, refactor components, theme content with Minecraft colors, or surgically update the portfolio site.

---

## The Pipeline (in order)

### 1️⃣ DISCOVERY & PLANNING
- **Understand the requirement** — What are you building and why?
- **Check existing code** — Read relevant components, pages, lib files
- **Identify files to change** — Which files need edits? What new components?
- **Plan the structure** — Component hierarchy, color theming, data flow

### 2️⃣ COMPONENT CREATION (if needed)
- **Build reusable components** in `components/` 
- **Use existing UI patterns** — BentoGrid, MagicCard, ShineBorder, SectionLabel
- **Theme with Minecraft colors** — `var(--mc-aqua)`, `var(--mc-gold)`, etc.
- **Leverage `mcColorFor()`** for dynamic tag coloring

### 3️⃣ PAGE IMPLEMENTATION
- **Create or update page file** in `app/[route]/page.tsx`
- **Import components** and data
- **Use PageHero** for titles/descriptions with accent colors
- **Organize with SidebarNav** and section anchors
- **Add responsive grid layouts** (mobile-first: 1 col → tablet: 2 col → desktop: 3 col)

### 4️⃣ DATA STRUCTURE (if needed)
- **Define TypeScript interfaces** for type safety
- **Create mock data** or query from Supabase
- **Use consistent naming** — slug, title, description, tags, status

### 5️⃣ BUILD & VERIFY
- **Run `npm run build`** — Catch TypeScript errors early
- **Start dev server** — `npm run dev` in background
- **Open `/path` in browser** — Use built-in browser to preview
- **Test responsive design** — Check mobile/tablet/desktop viewports
- **Verify all content** — Text, colors, icons, layout

### 6️⃣ PERSISTENCE & MEMORY
- **Save to session memory** — Document what was built and why
- **Update Obsidian vault** (if applicable) — Create/update related notes
- **File location:** `/Users/natea/.claude/projects/-Users-natea-Downloads-Obsidian-Vaults-FracturedVault/memory/`
- **Update MEMORY.md index** with reference to new memory file

### 7️⃣ COMMIT & PUSH
- **Stage changes** — `git add -A` or specific files
- **Review status** — `git status` to verify
- **Commit with message** — Concise, imperative, explains WHY
- **Include attribution** — End with: `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`
- **Push to GitHub** — `git push origin main`
- **Verify on GitHub** — Check commit appears on main branch

### 8️⃣ DEPLOYMENT CONFIRMATION
- **Vercel auto-deploys** on main branch push
- **Check site is live** — Visit nateanderson.dev (or staging)
- **Final screenshot** — Show user the live result

---

## Quick Reference: Design System

### Minecraft Colors Available
```
mc-aqua         #55ffff  (cyan)
mc-dark-aqua    #00aaaa  (dark cyan)
mc-gold         #ffaa00  (orange)
mc-green        #55ff55  (bright green)
mc-dark-green   #00aa00  (dark green)
mc-blue         #5555ff  (blue)
mc-red          #ff5555  (red)
mc-light-purple #ff55ff  (magenta)
mc-dark-purple  #aa00aa  (dark purple)
mc-yellow       #ffff55  (yellow)
```

### Component Patterns
```tsx
// Page layout
<PageHero eyebrow="Category" title="Title" description="..." accent="var(--mc-blue)" />
<SectionLabel accent="var(--mc-blue)">Section</SectionLabel>
<CourseworkGrid courses={courses} />  // or WorkGrid, BentoGrid

// Cards
<MagicCard gradientFrom={color} gradientTo="var(--chart-4)">
  <ShineBorder borderWidth={1} shineColor={[color, "var(--chart-4)"]} />
  {content}
</MagicCard>

// Tags
<span style={{
  color: tagColor,
  borderColor: `color-mix(in oklch, ${tagColor} 55%, transparent)`,
  backgroundColor: `color-mix(in oklch, ${tagColor} 15%, var(--background) 60%)`
}}>
  Tag
</span>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {/* 1 col mobile, 2 col tablet, 3 col desktop */}
</div>
```

---

## Files You'll Touch

### Always Read First
- `lib/mc-colors.ts` — Color hash function
- `lib/content.ts` — Data queries & types
- `components/page-hero.tsx` — Hero component
- `app/globals.css` — CSS variables & layout

### Common Edits
- `app/[route]/page.tsx` — Page implementation
- `components/[component].tsx` — Create or modify
- `.env.local` — Environment vars (if needed)

### Never Edit (Auto-generated)
- `.next/` — Build artifacts
- `node_modules/` — Dependencies

---

## Commit Message Template

```
Brief imperative summary

- Bullet point of what changed
- Why it matters
- Any breaking changes or notes

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

**Example:**
```
Add coursework page with senior year classes

Display all six senior year courses on /studies page:
- Custom CourseworkGrid component with MagicCard theming
- Minecraft color-coded cards (gold, red, green, aqua, purple, blue)
- Key focus areas and responsive 3-column layout

Connects to environmental engineering college pathway.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

## When Things Go Wrong

| Problem | Fix |
|---------|-----|
| TypeScript error after edit | Run `npm run build` to see full error; fix type in file |
| Component not importing | Check exact export name in source file; verify path |
| Page doesn't load | Check route file exists; verify imports; look at console |
| Styles not applying | Check color var name (use `--mc-` prefix); verify class names |
| Build times slow | Kill dev server; clear `.next/`; restart |
| Git conflict | Read conflict markers; keep both if needed; test after merge |

---

## Success Checklist

- [ ] Feature built and TypeScript compiles (`npm run build` ✓)
- [ ] Verified in browser at correct route
- [ ] Responsive design tested (mobile/tablet/desktop)
- [ ] Memory file saved with context
- [ ] Commit message clear and attributed
- [ ] Pushed to GitHub `origin/main`
- [ ] Deployment confirmed (Vercel auto-deploys)

---

## Next Steps After Using This Skill

After completing a feature:
- Ask Claude to take screenshots for your portfolio
- Consider adding a blog post explaining the feature
- Update the vault with lessons learned
- Archive this skill invocation for future reference

**Last Updated:** 2026-09-28  
**Pipeline Validated:** Timeline revolution feature (4-phase structure, event hierarchy, expandable details, full commit → deploy cycle)

### Recent Success: Timeline Revolution
- ✅ Created `TimelinePhase` and `TimelineEvent` components with server/client boundary handling
- ✅ Implemented string-based iconMap to pass icons across component boundaries
- ✅ 4-phase structure: High School, SMC, Cal Poly Pomona, Personal Studies (Sept 2026 → May 2031)
- ✅ Event hierarchy with major/minor distinctions and expandable details
- ✅ Current status indicator ("● Now" badge) for September 2026
- ✅ Minecraft color theming (blue, dark-aqua, dark-green, light-purple)
- ✅ Committed with full attribution and pushed to GitHub (commit 9bbc401)
- ✅ Auto-deployed to nateanderson.dev via Vercel
