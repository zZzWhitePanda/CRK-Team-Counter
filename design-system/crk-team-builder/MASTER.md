# CRK Team Builder — Design System (MASTER)

This is the single source of truth for how the website looks.
The colors come from my Unit 3 mockup designs (the hex codes
#202442 and #25294A are written on the mockups themselves).
Typography and the quality checklists come from the ui-ux-pro-max
skill's esports recommendations.

When building a page, check `pages/<page>.md` first — if it exists
its rules override this file. Otherwise use this file only.

---

## Theme: Dark Esports (from mockup designs 1–4)

Dark navy base, purple primary actions, blue secondary navigation,
teal for rankings/success, red strictly for the ENEMY team, cyan
strictly for YOUR team. Those last two are a core meaning rule:
red = "VS." (them), cyan = "USE" (you) — never swap or reuse them
for anything else.

## Color Tokens

| Role | Hex | CSS Variable | Used for |
|------|-----|--------------|----------|
| Sidebar background | `#202442` | `--color-sidebar` | left nav rail (mockup bottom-left label) |
| Page background | `#25294A` | `--color-bg` | main content area (mockup bottom-right label) |
| Card background | `#1D2140` | `--color-card` | team cards, panels, settings rows |
| Input background | `#171A33` | `--color-input` | search bars, drop-downs, cookie slots |
| Primary (purple) | `#8B7CF6` | `--color-primary` | Submit, Top, active filter pills |
| Primary hover | `#A395FF` | `--color-primary-hover` | hover state of primary |
| Secondary (blue) | `#5B6FD8` | `--color-secondary` | sidebar nav buttons, secondary filters |
| Rank/success (teal) | `#2DD4BF` | `--color-rank` | #1 rank badges, success states |
| Enemy (red) | `#F87171` | `--color-enemy` | "VS." labels, enemy team slot borders |
| Ally (cyan) | `#22D3EE` | `--color-ally` | "USE" labels, your-team slot borders |
| Text heading | `#FFFFFF` | `--color-text` | headings, button labels |
| Text body | `#C7CBE8` | `--color-text-body` | paragraphs, card text (9.5:1 on bg ✓) |
| Text muted | `#8A90B8` | `--color-text-muted` | hints, timestamps (4.6:1 on bg ✓) |
| Border | `#34395E` | `--color-border` | card outlines, dividers |
| Danger | `#EF4444` | `--color-danger` | errors, delete actions |

All text colors were checked against WCAG: body text ≥4.5:1 on
every surface it sits on; muted text is only used at 16px+.

## Typography (from ui-ux-pro-max esports pairing)

- **Headings:** Russo One — chunky, game-style, matches the mockup lettering
- **Body/UI:** Chakra Petch — squared techy sans that stays readable small
- Base size 16px, line-height 1.5. Scale: 14 / 16 / 18 / 24 / 32 / 40.

```css
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Russo+One&display=swap');
```

## Layout (from mockups)

- Desktop: fixed left sidebar (~230px) with logo + 4 nav buttons
  (Community Builds, Counter Tool, Cookies, Settings); content fills the rest.
- Mobile (<768px): sidebar collapses to a bottom nav bar with the same
  4 items (icon + label, max 5 per Material guidance).
- Cards: 12px radius, 1px `--color-border`, subtle shadow. No glassmorphism.
- Spacing on an 8px rhythm: 8 / 16 / 24 / 32 / 48.
- Content max-width 1200px, centred on very wide screens.

## Component rules

- Cookie slots: square, 8px radius, dashed border when empty (mockup 2),
  red border for enemy row, cyan border for your row (mockup 1).
- Rank badges: teal square with white number (mockup 1).
- Filter pills: rounded-full; active = purple fill, inactive = `--color-input`.
- Buttons: min height 44px (touch target), cursor-pointer, 150–250ms
  ease-out transitions on hover/press, visible focus ring (2px purple).
- Like button: heart icon + count; filled purple when already liked.

## Rules I must follow (skill checklist, kept)

- SVG icons only (Lucide), never emoji icons
- One primary action per screen
- Loading: skeleton cards after 300ms, never a blank page
- Empty results: friendly message + "be the first to add a team" action (FR10)
- Errors shown near the thing that caused them, with how to fix
- Respect `prefers-reduced-motion`; animate transform/opacity only
- No horizontal scroll at 375px; test 375 / 768 / 1024 / 1440
- Semantic tokens only in components — no raw hex outside `theme.css`

## Anti-patterns (do NOT do)

- Light backgrounds anywhere (this is a dark-only theme, per mockups)
- 3D/WebGL effects, parallax, heavy decoration (skill suggested these;
  rejected — they hurt performance and my users need speed mid-battle)
- Using red/cyan for anything other than enemy/ally meaning
- Emoji as icons, placeholder-only form labels, hover-only interactions
