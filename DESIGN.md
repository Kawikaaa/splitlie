---
name: Splitlie
description: A calm Swiss-style money workspace with neutral white surfaces, charcoal structure, and precise lime signals.
colors:
  canvas: "#f7f7f3"
  surface: "#ffffff"
  surface-subtle: "#f7f8f5"
  surface-muted: "#eef0eb"
  ink: "#151915"
  ink-soft: "#30352f"
  muted: "#646b61"
  faint: "#70756e"
  line: "#e0e3dc"
  line-strong: "#cbd0c6"
  accent: "#b8f26a"
  accent-soft: "#e8f7c9"
  accent-ink: "#284018"
  positive: "#23633b"
  danger: "#b5473d"
  danger-soft: "#f8e8e5"
  dark: "#151915"
  dark-soft: "#272d27"
  lp-ground: "#f7f7f3"
  lp-ink: "#151915"
  lp-muted: "#646b61"
  lp-rule: "#cbd0c6"
  lp-lime: "#b8f26a"
  lp-lime-hover: "#a6e357"
  lp-lime-active: "#99d54c"
  lp-example: "#f2f3f1"
typography:
  lp-display:
    fontFamily: "Geist Variable, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "clamp(64px, 8.2vw, 126px)"
    fontWeight: 750
    lineHeight: 0.97
    letterSpacing: "-0.04em"
  lp-display-zh:
    fontFamily: "Geist Variable, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "clamp(64px, 7.6vw, 116px)"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  lp-display-mobile:
    fontFamily: "Geist Variable, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "clamp(48px, 11vw, 78px)"
    fontWeight: 750
    lineHeight: 1.04
  lp-body:
    fontFamily: "Geist Variable, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "clamp(20px, 2vw, 28px)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  lp-button:
    fontFamily: "Geist Variable, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 650
  display:
    fontFamily: "Geist Variable, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.055em"
  body:
    fontFamily: "Geist Variable, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist Variable, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.1em"
rounded:
  lp-control: "8px"
  lp-example: "8px"
  lp-ledger: "12px"
  control: "8px"
  card: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  lp-button:
    backgroundColor: "{colors.lp-lime}"
    textColor: "{colors.lp-ink}"
    typography: "{typography.lp-button}"
    rounded: "{rounded.lp-control}"
    padding: "16px 28px"
  lp-button-hover:
    backgroundColor: "{colors.lp-lime-hover}"
  lp-button-active:
    backgroundColor: "{colors.lp-lime-active}"
  lp-ledger:
    backgroundColor: "{colors.lp-ground}"
    textColor: "{colors.lp-ink}"
    rounded: "{rounded.lp-ledger}"
  lp-sharing-example:
    backgroundColor: "{colors.lp-example}"
    textColor: "{colors.lp-ink}"
    rounded: "{rounded.lp-example}"
    padding: "24px"
  button-primary:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.dark}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  safe-to-spend:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "26px 30px"
  navigation:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
---

# Design System: Splitlie

## Overview

**Landing scope:** The `lp-` tokens and landing-specific notes describe only `/welcome`, implemented in `src/pages/LandingPage.jsx` and its stylesheet. They take precedence for that public surface. Existing unprefixed definitions below remain the incumbent system; this merge does not refresh authenticated or authentication design documentation. The landing direction contract remains in `.impeccable/surfaces/landing-page.md`.

**Creative North Star: "The Quiet Money Desk"**

Splitlie feels like a well-organized personal money desk: warm rather than clinical, structured without becoming an accounting terminal, and calm enough for repeated monthly use. Warm paper surfaces hold most information; deep charcoal establishes authority in navigation, key actions, and the Safe to Spend decision area. A single electric-lime signal creates recognition and calls attention to actions or status without becoming a decorative wash.

The interface is intentionally decision-first. Large figures and short labels answer the current financial question before supporting cards explain spending, income, balances, categories, and shared activity. Public pages are more expressive through oversized display type and product mockups, while authenticated screens become denser and operational. Rounded containers and low, soft shadows keep the system approachable without turning it into a bubbly consumer template.

**Key Characteristics:**

- Warm off-white canvas with paper-white and quiet-gray surface layers.
- Dark charcoal navigation, primary actions, and Safe to Spend structure.
- Bright lime used as a precise signal, active navigation state, or action color.
- Oversized, tightly tracked display typography paired with a neutral UI sans.
- Moderately rounded 11px controls and 16px cards.
- Thin borders, restrained shadows, and compact 16–24px internal rhythm.
- Responsive transformation from a fixed sidebar to a top bar and bottom navigation.

## Colors

**Landing only:** Landing White supplies the true-white canvas; Landing Ink supplies text and the illustrative ledger's dark upper panel. Landing Lime identifies registration actions and the ledger icon. Landing Muted supports secondary copy; Landing Rule separates open rows; Landing Example supplies the shared-expense illustration's quiet surface. Hover and active lime roles belong only to landing buttons.

The palette combines warm neutral paper tones with near-black green-charcoal structure. Lime is the only brand accent; semantic green and muted brick red are reserved for financial state and destructive feedback.

### Primary

- **Signal Lime:** The recognizable brand accent. Use it for the sidebar add action, selected navigation, progress, Safe to Spend labels and icons, and small emphasis bars.
- **Quiet Lime:** A pale supporting tint for selected states, contextual finance panels, and low-intensity positive emphasis.
- **Lime Ink:** Dark green text or icons placed on Quiet Lime when plain charcoal would lose semantic meaning.

### Secondary

- **Positive Ledger Green:** Income, favorable movement, and explicitly positive status.
- **Risk Brick:** Destructive actions and error states only. Pair with the pale risk surface and never use it as brand decoration.

### Neutral

- **Warm Canvas:** The global page background, keeping long sessions softer than pure white.
- **Paper Surface:** Cards, fields, menus, auth forms, and raised content.
- **Quiet Surface:** Low-emphasis grouped content, inactive controls, and track backgrounds.
- **Ledger Ink:** Primary copy, values, dark navigation, and primary buttons.
- **Soft Ink:** Supporting text inside strong surfaces.
- **Muted Copy:** Explanations, metadata, secondary labels, and helper copy.
- **Faint Copy:** Disabled or lowest-priority information only.
- **Quiet Rule / Strong Rule:** One-pixel separation for cards, rows, fields, and hover states.

### Named Rules

**The One Signal Rule.** Lime should identify an action, active location, progress, or money state. If it does none of those jobs, remove it.

**The Paper Before Shadow Rule.** Separate ordinary content with surface tone and a one-pixel rule before adding elevation.

**The Semantic Red Rule.** Risk Brick appears only for destructive and error states, never as a general accent.

## Typography

**Landing only:** Self-hosted Geist Variable drives the oversized Swiss display and reading text, with Microsoft YaHei UI and system sans fallbacks. The frontmatter records desktop English, Chinese, and mobile display ramps. At 1000px and below, the English display becomes `clamp(60px, 8vw, 80px)`; at 760px and below, both locales use the mobile ramp while retaining locale-specific tracking. Chinese breaks after the first natural five-character phrase. Landing hero and feature headings remove punctuation; body copy retains its existing translations. Feature titles use 650 weight, `clamp(28px, 3.2vw, 48px)`, 1.12 leading and -0.035em tracking, becoming 32px on mobile.

**Display Font:** Segoe UI Variable Display, with Inter and localized system sans fallbacks.  
**Body Font:** Inter, with Segoe UI Variable Text, Noto Sans SC, Microsoft YaHei UI, and system sans fallbacks.  
**Label Font:** Bahnschrift, with Inter and localized system sans fallbacks.

**Character:** The display face is compact, heavy, and tightly tracked, giving the landing and financial figures a confident editorial presence. Inter handles controls and dense finance content without friction. Bahnschrift is limited to compact uppercase technical labels and falls back to the UI family for Chinese.

### Hierarchy

- **Marketing Display** (700, `clamp(46px, 6vw, 74px)` and larger where space permits, 0.94–0.98 line-height): Landing and authentication statements only.
- **Financial Display** (700–820, `clamp(52px, 5.6vw, 68px)`, 1 line-height): Safe to Spend and other single leading figures; use tabular numerals.
- **Page Headline** (680, `clamp(28px, 3vw, 38px)`, 1.08 line-height): Authenticated page titles, generally uppercase.
- **Section Title** (680, 23px, 1.15 line-height): Card and panel headings.
- **Body** (400, 15px, 1.55 line-height): Explanations, transaction content, and ordinary UI copy.
- **Compact Label** (700, 11–13px, 0.08–0.13em letter spacing): Eyebrows, field labels, navigation section labels, and financial metadata.

### Named Rules

**The Number First Rule.** A decision-driving financial figure should be readable before its explanation; labels and helper copy stay visibly subordinate.

**The Tight Display Rule.** Large display text uses tight tracking and compact leading. Body text never inherits that compression.

**The Bilingual Fit Rule.** English may use uppercase technical labels; Chinese switches back to the UI family and reduced tracking to avoid artificial spacing.

## Layout

**Landing only:** The content caps at 1440px with `clamp(24px, 4vw, 64px)` side gutters. The hero uses 1.85:1 columns, a 32px gap and 48px/64px vertical padding; at 1000px the split becomes 1.4:1, and at 760px it stacks with a 48px gap and fixed 24px gutters. An open three-column capabilities rail and ruled feature rows continue the 8px spacing grammar. Features use .9:1.25 columns, a 48px gap and 64px vertical padding, then one column and 40px vertical padding on mobile. The 104px header becomes 88px; its registration button hides on mobile while the hero and footer retain registration actions.

Authenticated pages use a 260px fixed left sidebar and a centered content column capped at 1180px. The main content area uses 28–48px horizontal padding and a 24px vertical page rhythm. Cards normally use 24px internal padding, 16px gaps between sibling cards, and 12–16px gaps inside controls or compact groups.

The overview begins with one full-width Safe to Spend decision card, followed by a three-column KPI row and denser analytics or utility grids. Public landing content uses a wide editorial split: oversized value proposition on the left and a product-window composition on the right. The authentication page uses a two-panel shell with a dark product story and preview on the left and a warm form surface on the right.

At 980px, dense analytics collapse to one column and the sidebar narrows. At 760px, the sidebar becomes a compact top bar, main content uses 16px side padding, and a dark fixed bottom navigation takes over. KPI cards become a two-column arrangement with the final item spanning the row. Authentication collapses at 900px by hiding the showcase panel; below 520px it becomes a full-viewport edge-to-edge form.

**The Decision Before Detail Rule.** Page order must reveal the current financial state before history, explanation, or secondary actions.

**The Operational Density Rule.** Public pages may use generous editorial space; authenticated pages use compact, repeatable 16–24px rhythms.

## Elevation & Depth

**Landing only:** All landing surfaces are flat with no box shadows. Solid charcoal, true white, the quiet example tone and one-pixel rules establish depth. The ledger enters with a 16px upward settle over 700ms using `cubic-bezier(.16, 1, .3, 1)`; reduced-motion preferences disable that animation and button transitions.

The system uses a restrained hybrid of tonal layering, one-pixel borders, and two shadows. Ordinary cards receive an almost-flat `0 1px 2px rgba(25, 31, 23, 0.04)` shadow. Menus, marketing product windows, auth shells, floating notifications, and modals may use a raised ambient shadow. Dark signature panels such as Safe to Spend remain flat so their solid color carries the hierarchy.

### Shadow Vocabulary

- **Ledger Edge** (`0 1px 2px rgba(25, 31, 23, 0.04)`): Standard cards and panels.
- **Raised Paper** (`0 16px 42px rgba(20, 25, 20, 0.10)`): Auth surfaces, popovers, and prominent floating content.
- **Modal Lift** (`0 24px 60px rgba(16, 20, 16, 0.20)`): Modal dialogs over the blurred backdrop.

### Named Rules

**The Flat Signature Rule.** Dark signature panels and selected navigation rely on color contrast, not shadow.

**The Two-Level Rule.** Do not invent intermediate shadows. Use the quiet card edge, the raised paper level, or the dedicated modal lift.

## Shapes

**Landing only:** Landing controls use the scoped compact corner token, the shared example uses its intermediate corner token, and the illustrative ledger uses its own corner token. The circular brand mark is a stroked ring. These shapes apply only to the landing surface.

Controls are gently rounded rather than pill-like. The standard control radius is 11px and the standard card radius is 16px. Compact tabs and menu items use 8–12px radii; icon tiles use 10–15px. Fully circular geometry is reserved for avatars, tiny marks, progress tracks, and real pills. Borders are normally one pixel and use Quiet Rule; stronger outlines appear on hover, focus, and destructive states.

**The Two-Radius Rule.** Start with 11px for controls and 16px for cards. A different radius needs a compact-tab, icon, avatar, or full-viewport reason.

## Components

### Landing marketing components

Landing registration buttons use lime with dark text, a 56px minimum height, 24px icon gap and a 160ms background transition. The hero variant reaches 64px and a 22px label, then returns to 56px and 18px on mobile. Interactive landing controls receive a two-pixel ink focus outline with 5px offset. The language selector uses text buttons and an underline for the selected language. Login and account links underline on hover. The illustrative ledger is semantic HTML with tabular amounts, a dark available-balance panel, white expense rows, fine dividers and an explicit illustrative-preview caption. No generated raster ships; generated concepts are external composition references only.

The component language is calm and tactile: compact controls, warm paper surfaces, clear state changes, and short 120–160ms transitions.

### Buttons

- **Shape:** 11px radius, 44px minimum height, 14px bold label; public hero actions may reach 48–50px.
- **Primary:** Dark charcoal with white text. Hover shifts to Dark Soft; active state scales to 0.98.
- **Accent:** Signal Lime with dark text for the sidebar add action and other explicitly branded actions.
- **Secondary:** Paper Surface with a Strong Rule border and Ledger Ink text.
- **Focus:** Two-pixel olive outline with 3px offset, or a lime-tinted three-pixel field ring.

### Cards / Containers

- **Corner Style:** 16px standard card radius.
- **Background:** Paper Surface for ordinary cards; Quiet Surface or Quiet Lime for grouped or selected content.
- **Shadow Strategy:** Ledger Edge at rest; most dark cards and dense grid items remain flat.
- **Border:** One-pixel Quiet Rule.
- **Internal Padding:** Normally 24px; compact transaction or metric content may use 15–21px.

### Inputs / Fields

- **Style:** White or Paper Surface, one-pixel Quiet Rule, 10–12px radius, 44–46px height, and 15px horizontal padding.
- **Focus:** Dark border plus a translucent lime three-pixel ring.
- **Disabled:** Reduced opacity; retain readable labels and do not signal state with color alone.

### Navigation

Desktop navigation is a fixed dark sidebar. Default links use muted light text; hover uses Dark Soft and white. The active destination uses Signal Lime with dark text. On mobile, navigation becomes a fixed dark bottom rail; active items use lime text without a filled lime tile. The language switcher stays a compact dark segmented control.

### Safe to Spend

Safe to Spend is the signature decision component: a flat dark panel with a lime label and icon, a large white tabular amount, subdued supporting text, and an optional transparent breakdown control. When no monthly budget exists, the same visual prominence moves to money already spent and a clear budget-setup action rather than displaying a meaningless negative value.

### Tabs and Segmented Controls

Tabs sit on Quiet Surface with a 13px outer radius and 9px inner buttons. The active tab becomes white with a minimal one-pixel shadow; inactive tabs remain transparent and muted.

### Dialogs

Dialogs use a 16px radius, Paper Surface, Modal Lift, and a dark translucent backdrop with 5px blur. Forms inside dialogs reuse the same control treatment as page forms. Entry motion is limited to a subtle upward fade and respects reduced-motion preferences.

## Do's and Don'ts

**Landing scope guardrail:** Do apply `lp-` roles only to the public landing surface and keep its oversized headings free of punctuation. Don't propagate its true-white canvas, Geist display ramps, compact corners or marketing spacing into authenticated screens.

### Do:

- **Do** make the current financial position the first readable layer on authenticated pages.
- **Do** use warm paper neutrals for long-lived surfaces and charcoal for authority.
- **Do** reserve Signal Lime for active, actionable, progressive, or financial-state meaning.
- **Do** keep ordinary cards within the 11px control / 16px card radius system.
- **Do** use tabular numerals for important amounts and align comparable values consistently.
- **Do** preserve visible keyboard focus, reduced-motion behavior, and bilingual text fit.

### Don't:

- **Don't** turn every card lime, dark, or elevated; hierarchy depends on scarcity.
- **Don't** use Risk Brick outside destructive actions and error feedback.
- **Don't** add ornamental gradients, glass panels, glow effects, or decorative charts.
- **Don't** use oversized marketing spacing inside dense authenticated workflows.
- **Don't** let secondary cards compete with Safe to Spend or the no-budget spending state.
- **Don't** invent product claims, recommendations, or financial capabilities that the working application does not have.

## Brand alignment — 2026-10-02

The landing opening uses the product canvas (#f7f7f3), open feature rows use white, and the compact footer uses Signal Lime with a charcoal CTA. All routes share Geist, charcoal text, neutral surfaces, 8px control radii and 12px card radii. The ring mark is shared across landing, authentication and sidebar, with contrast appropriate to its surface. Product page titles retain natural casing; financial figures remain tabular. Marketing display sizes and wide spacing remain scoped to /welcome. Existing operational layouts, real copy, routes, permissions and financial calculations are unchanged.
