---
name: brote-visual-guide
description: 'Visual design system and UI guidelines for Brote. Use this skill whenever building or modifying UI components, screens, or styling. Defines the color palette, typography, iconography, illustration style, component shapes, animation principles, and the Flora AI companion avatar.'
---

## Visual Concept

**"A modern botanical notebook."**

Imagine a thick-paper gardening journal, illustrated with watercolors, but built with the cleanliness and precision of a modern app.

This is not a forest. Not a nursery. Not a plant shop.

It is **your corner for caring for what grows at home.**

> **Silent technology in service of a calm experience.** — as if Airbnb, Pinterest, and Nothing co-designed a plant-care app.

---

## Visual Pillars

### 1. Calm
Everything must breathe. Generous whitespace. Nothing crammed. Nothing feels urgent. No reds scattered around. The feeling should be: *"I have time."*

### 2. Natural
Nature appears in the *materials*, not the decoration. Instead of leaves everywhere: soft textures, organic colors, botanical illustrations, light shadows, rounded shapes.

### 3. Home
This app lives inside a home, not a greenhouse. Warm colors and a cozy interface.

---

## Color Palette

| Role              | Hex       | Notes                              |
| ----------------- | --------- | ---------------------------------- |
| Primary green     | `#6E8E6A` | Sage green. Calm, natural, adult.  |
| Secondary green   | `#A8C29A` | Lighter sage.                      |
| Background        | `#F8F6F2` | Warm white. Never pure `#FFFFFF`.  |
| Earth (secondary buttons) | `#C7A47B` | Warm beige-brown.            |
| Dark text         | `#3F3A36` | Brown-black. Never pure `#000000`. |
| Secondary text    | `#7B756E` | Warm gray.                         |
| Accent — mustard  | `#D7B65A` | Small details only.                |
| Accent — terracotta | `#C87C5A` | Small details only.               |

**Rules:**
- Never use bright/saturated greens.
- Never use pure black (`#000`) or pure white (`#FFF`).
- Text on background must meet WCAG AA contrast (4.5:1 minimum for body text).
- Accents are for highlights only — one or two elements per screen max.

---

## Typography

### Headlines — Fraunces
Serif with personality. Editorial feel. Slightly botanical. Use for screen titles, large headings, and key moments.

### Body — Inter or Manrope
Clean, modern, highly readable sans-serif. Use for all body text, labels, buttons, and UI copy.

**Rules:**
- Never use handwriting/script fonts.
- Never use overly technical monospaced fonts for UI.
- The Fraunces + Inter contrast is the brand signature — don't dilute it.

---

## Iconography

Nothing-style icons:
- **2px stroke width**
- No fills (or minimal fills on very few icons)
- Rounded caps and joins
- Simple, essential shapes
- Never use emoji as icons (`🌿`, `🪴`, etc.)

Use minimal, line-based icon sets (e.g. Phosphor Icons, Lucide).

---

## Illustrations — Watercolor

Watercolor is the thread connecting the entire visual identity. It's not decoration — it's the visual language of the app.

**Use watercolor illustrations for:**
- Empty states
- Loading states
- Achievements ("your plant grew a new leaf!")
- Flora's conversation cards
- Onboarding screens
- The app icon

**Style rules:**
- Minimalist botanical illustrations (a single leaf, a monstera, a pot, a watering can, a flower).
- Plenty of whitespace around each illustration.
- Never cartoonish or childish.
- As if painted for a botanical book.
- Same artist/style across all illustrations — consistency is critical.

**Photos vs illustrations:**
- Photos belong to the user (their plant pictures).
- Illustrations belong to Brote.
- They never compete. Photos are the protagonist; watercolors accompany.

---

## Components

### Border Radius
Everything is rounded. Nothing is sharp or square.

- **Cards:** 16–20px radius
- **Buttons:** fully rounded (pill shape) but not giant capsules — ~24px radius
- **Inputs:** 12–16px radius
- **Modals / bottom sheets:** 20–24px top radius

### Cards
```
╭──────────────────╮
│                  │
│   Monstera       │
│   Water today    │
│                  │
╰──────────────────╯
```
- Soft shadows (never harsh drop shadows).
- Subtle border or no border.
- Background: `#FFFFFF` with 90–95% opacity over warm-white bg, or a very light tint.

### Buttons
- Primary: sage green (`#6E8E6A`) background, warm white (`#F8F6F2`) text.
- Secondary: earth (`#C7A47B`) background or outline.
- Ghost/tertiary: no background, sage green text.
- Destructive: terracotta (`#C87C5A`), used sparingly. Never bright red.

### Inputs
- Light background (slightly darker than screen bg).
- Subtle border in secondary text color.
- Focus state: sage green border, no glow.

---

## Animations

**Critical.** Animations are not decoration — they set the emotional pace.

**Principles:**
- Not fast. Not bouncy/elastic.
- Everything breathes. Subtle fade + slight scale.
- Duration: 200–400ms for micro-interactions, up to 600ms for transitions.

**Signature animations:**
- **Watering complete →** A tiny water droplet fades away.
- **New leaf growth →** A small leaf animates growing/unfurling.
- **Flora responding →** Three tiny watercolor leaves animate in place of the classic three-dot typing indicator.
- **Screen transitions →** Gentle fade or shared element transitions. No hard cuts.

**Easing:** Use ease-in-out or a custom cubic-bezier that feels organic. Never linear.

**Implementation:** Use `react-native-reanimated` for all animations.

---

## Flora — The AI Companion

Flora is **not** a human avatar, a cartoon woman, or a robot.

Flora is a **flower** (or small plant):
- Painted in watercolor style.
- Minimal features — tiny eyes at most.
- Never childish.
- Something between 🍃, 😊, and an editorial illustration.
- Appears *only* when speaking.

Flora's presence should feel like a gentle companion, not a mascot.

---

## Dashboard (Home Screen)

The home screen should feel like opening a personal agenda/journal.

```
Good morning ☀️

Today your garden needs a little attention.

────────────

💧 Water
2 plants

────────────

🌞 Find better light
1 plant

────────────

🌱 Latest joy
Your Pothos grew a new leaf.

────────────

💬 Ask Flora
```

**Rules:**
- Never more than 5 cards.
- Each card answers a single clear question or action.
- The user should know what to do in under 5 seconds.

---

## The Golden Rule

Every screen must answer:

> **"Does this invite me to stay five more minutes?"**

If it feels like a productivity tool disguised as a plant app, simplify it.

---

## Inspiration Moodboard

| Reference        | Takeaway                                                |
| ---------------- | ------------------------------------------------------- |
| **Airbnb**       | Generous whitespace, clear visual hierarchy, homey feel |
| **Pinterest**    | Large photos, pleasant exploration, constant inspiration |
| **Nothing X**    | Minimalism, clean iconography, intentional micro-animations |
| **Gemini**       | Relaxed conversations, content-first layout             |
| **Apple Journal** | Intimate tone, personal diary feel, calm pacing        |
| **Apple Health** | Organized info, easy to scan, doesn't feel technical    |

**Do not** look at other gardening/plant apps for design inspiration.

---

## Checklist: Before Writing Any UI Code

1. Is the background warm white (`#F8F6F2`), not pure white?
2. Is body text `#3F3A36`, not pure black?
3. Is the primary accent sage green (`#6E8E6A`), not a saturated green?
4. Are fonts Fraunces (headlines) + Inter/Manrope (body)?
5. Are icons 2px stroke, no fills?
6. Are border radii generous (12px minimum)?
7. Are animations slow and breathing, not fast and bouncy?
8. Are there fewer than 6 visible cards/tasks on the home screen?
9. Would I want to stay five more minutes on this screen?
