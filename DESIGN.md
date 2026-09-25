---
name: ana
description: A sadhana journal that feels like a calm cream notebook; night journal is the same world with the lamp off.
colors:
  cream-paper: "#fbf8f2"
  cream-card: "#f3ecdd"
  cream-card-deep: "#eae1cd"
  parchment-line: "#e2d8c2"
  nav-cream: "#f7f2e7"
  ink: "#18160f"
  ink-soft: "#686152"
  isha-teal: "#2f6b5e"
  isha-teal-wash: "rgba(47, 107, 94, 0.1)"
  saffron: "#f37021"
  good: "#3f7a55"
  danger: "#9a3b3b"
  night-paper: "#13120e"
  night-card: "#1d1b16"
  night-card-deep: "#27241d"
  night-line: "#36322a"
  night-nav: "#17160f"
  lamplight-ink: "#f1eadb"
  lamplight-ink-soft: "#a69d8b"
  night-teal: "#7dbfae"
  night-teal-wash: "rgba(125, 191, 174, 0.13)"
  night-saffron: "#f58a45"
  night-good: "#8db88f"
  night-danger: "#e08a7e"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
    fontVariation: "'opsz' auto"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.3
  quote:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.55
  journal:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  body-strong:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
    fontFeature: "'tnum' 1"
  micro:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
rounded:
  tile: "10px"
  nav: "12px"
  control: "14px"
  card: "16px"
  group: "18px"
  panel: "20px"
  hero: "22px"
  sheet: "24px"
  pill: "9999px"
spacing:
  gutter-phone: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "48px"
  row: "16px"
  section: "32px"
  column-reading: "560px"
  column-page: "860px"
  sidebar: "248px"
  column-sheet: "560px"
  column-sheet-wide: "680px"
  column-search: "600px"
components:
  button-primary:
    backgroundColor: "{colors.isha-teal}"
    textColor: "{colors.cream-paper}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-primary-lg:
    backgroundColor: "{colors.isha-teal}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.cream-card-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.isha-teal}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.isha-teal-wash}"
  button-danger:
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    height: "44px"
  button-google:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream-paper}"
    rounded: "{rounded.control}"
    height: "52px"
    width: "100%"
  input-field:
    backgroundColor: "{colors.cream-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  input-field-in-sheet:
    backgroundColor: "{colors.cream-card-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  sheet:
    backgroundColor: "{colors.cream-paper}"
    rounded: "{rounded.sheet}"
    padding: "16px 20px 24px"
    width: "{spacing.column-sheet}"
  sheet-close:
    backgroundColor: "{colors.cream-card}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    size: "36px"
  search-dialog:
    backgroundColor: "{colors.cream-paper}"
    rounded: "{rounded.hero}"
    width: "{spacing.column-search}"
  moment-card:
    backgroundColor: "{colors.cream-card}"
    rounded: "{rounded.group}"
    padding: "16px"
  moment-kind-well:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.isha-teal}"
    rounded: "{rounded.control}"
    size: "36px"
  person-chip:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 12px 0 4px"
    height: "32px"
  person-avatar:
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    size: "36px"
  chart-panel:
    backgroundColor: "{colors.cream-card}"
    rounded: "{rounded.panel}"
    padding: "16px"
  card-group:
    backgroundColor: "{colors.cream-card}"
    rounded: "{rounded.group}"
    padding: "16px"
  option-card:
    backgroundColor: "{colors.cream-card}"
    rounded: "{rounded.card}"
    padding: "16px"
  option-card-selected:
    backgroundColor: "{colors.isha-teal-wash}"
    textColor: "{colors.ink}"
  chip:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  chip-selected:
    backgroundColor: "{colors.isha-teal-wash}"
    textColor: "{colors.isha-teal}"
  segmented-track:
    backgroundColor: "{colors.cream-card}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-active:
    backgroundColor: "{colors.cream-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
  nav-link:
    textColor: "{colors.ink-soft}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.nav}"
    padding: "10px 12px"
  nav-link-active:
    backgroundColor: "{colors.isha-teal-wash}"
    textColor: "{colors.isha-teal}"
  tab-bar:
    backgroundColor: "{colors.nav-cream}"
    height: "64px"
  practice-tile:
    backgroundColor: "{colors.cream-card-deep}"
    textColor: "{colors.isha-teal}"
    rounded: "{rounded.tile}"
    size: "36px"
  practice-library-row:
    backgroundColor: "{colors.cream-card}"
    rounded: "{rounded.card}"
    padding: "10px 12px 10px 10px"
  practice-library-row-selected:
    backgroundColor: "{colors.isha-teal-wash}"
  practice-library-tile:
    backgroundColor: "{colors.cream-card-deep}"
    rounded: "{rounded.nav}"
    size: "48px"
  switch-on:
    backgroundColor: "{colors.isha-teal}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "26px"
  switch-off:
    backgroundColor: "{colors.parchment-line}"
---

# Design System: ana

## Overview

**Creative North Star: "The Cream Notebook"**

ana is a sadhana journal that should feel like the physical practice notebook it replaces: warm cream paper, ink that reads like a pen rather than a screen, and a single deep Isha teal used the way a practitioner would use a single colored pen. Surfaces are paper on paper. Cards are a slightly deeper cream sitting on a lighter cream ground, with no borders and almost no shadow, so the page reads as one quiet sheet rather than a dashboard of boxes. Saffron, the Isha orange, is kept for moments of arrival: the splash, the small dot beside today's date, a birthday coming up, a waiting admin count. The paper is literally paper: a fixed, very soft fractal-noise grain (7% multiply on cream, 12% inverted screen at night) sits between the ground and the content on every screen.

The night journal is not a separate theme; it is the same notebook with the lamp off. Every role keeps its meaning: the paper goes to a warm near-black, the ink becomes lamplight cream, the teal lifts to a pale sea-glass so it still reads as the one accent. Theme is set by the person (a cookie read on the server and a `data-theme` attribute), never by the OS, and it cross-fades only while switching, never on first paint.

Density is low and unhurried. Content sits in one column: a sidebar on desktop, a bottom tab bar on phones, and a page title in Fraunces with today's date beside it. Sadhguru's presence (photo, a traced vector signature, the daily quote in Fraunces italic) and the Isha practice illustrations carry the imagery; the interface itself is code-drawn, with a line lotus as the mark, Phosphor icons for navigation, and a small set of Isha line ornaments (divider, flourish, leaves, kolam, vine) drawn as masks in the current text colour. Waiting is shown by the lotus breathing, never by a spinner. Adding or editing anything happens in a sheet that rises from the bottom on phones and sits centred on desktop. The look was pinned by the user to the Isha reference app (sadhana-pwa-demo-vercel.vercel.app), from which the practice images and splash artwork come.

**Key Characteristics:**
- Cream-on-cream tonal layering; borderless cards; teal as the only accent.
- Fraunces for titles and reflective text, Public Sans for every interface string.
- Saffron appears only at moments of arrival, never as decoration.
- Soft, generous radii (10 to 22px) and full pills for chips and segmented controls.
- Tactile press (scale 0.97) and expo-out springs; nothing bounces, nothing shouts.
- The browser surface (status bar, selection, caret, focus ring, scrollbar) wears the palette too.
- Paper grain under everything; Isha line ornaments in faint current colour; a breathing lotus instead of spinners.

## Colors

A warm, low-chroma paper palette with one deep teal accent and a single saffron signal, mirrored into a lamp-off night palette.

### Primary
- **Isha Teal** (isha-teal; night-teal in dark): the one accent. Primary buttons, the active nav item (text plus a teal wash behind it), switches that are on, the focus ring, the text caret, selected chips and option cards, progress bars, the lotus mark, and chart lines. On primary buttons the label is the paper color, not white.
- **Teal Wash** (isha-teal-wash; night-teal-wash): a 10 to 13% veil of the accent. The ground of every selected or active state: nav highlight, selected chip, selected option card, ghost-button hover, avatar initials, stamp-guide wells, the "everything came across" confirmation.

### Secondary
- **Isha Saffron** (saffron; night-saffron): the splash background, the dot beside today's date in the top bar, the "Today / In 3 days" label on an upcoming birthday, the admin crown, and a non-zero pending count. It is a signal of arrival or of something waiting, never a fill for controls.

### Neutral
- **Cream Paper** (cream-paper; night-paper): the page ground, the browser theme-color, and the label color on teal and ink buttons.
- **Cream Card** (cream-card; night-card): every card, list group, input field, segmented-control track and dialog.
- **Deep Cream** (cream-card-deep; night-card-deep): the secondary button fill, input fields inside sheets, the audio-player well, hover on cards, the ground behind practice illustrations and search result icons, empty chart cells and bar tracks, skeleton fill.
- **Nav Cream** (nav-cream; night-nav): the sidebar and the phone tab bar (at 95% with a blur), a half-step off the page so navigation recedes.
- **Parchment Line** (parchment-line; night-line): hairline dividers inside groups, the sidebar edge, the tab-bar top edge, unselected chip outlines, the switch track when off, scrollbar thumbs.
- **Ink** (ink; lamplight-ink): headings, primary text, and the fill of the Google sign-in button.
- **Soft Ink** (ink-soft; lamplight-ink-soft): secondary text, descriptions, dates, inactive nav, the daily quote.
- **Good / Danger** (good, danger; night-good, night-danger): status only. Danger is used as text (errors, destructive ghost buttons and menu items with a 10% danger hover), never as a filled block.

### Derived Mixes
- **Teal Ramp** (`color-mix(in srgb, var(--accent) N%, var(--surface-2))` at 20 / 40 / 60 / 80 / 100%): the one sequential scale, used for the mood grid. It is built from the accent and deep cream, so it follows the lamp-off switch with no second palette.
- **Tinted Tile** (accent at 16% into deep cream): the fallback tile behind a practice that has no illustration.
- **Scrim** (`rgba(24,22,15,0.36)`; 0.30 under the tab bar's More sheet): the ink-tinted veil behind sheets and the search dialog.
- **Person Tones** (six muted warm hues, listed in the sidecar, with white initials): a person without a photo gets one, chosen by a hash of their name so they always keep it. They are identity, not state, so they do not change with the lamp.

### Named Rules
**The One Pen Rule.** Teal is the only interactive accent. If something is selected, active, focused or on, it is teal (text, fill or wash); nothing else competes for that meaning.

**The Arrival Rule.** Saffron marks arrival or something waiting (splash, today, a pending count). A saffron button, saffron card or saffron heading is off-system.

**The Lamp-Off Rule.** Every color is a role with a light and a night value. Never hard-code a hex in a component; use the role (`bg-surface`, `text-ink-soft`, `bg-accent-soft`) so the night journal follows automatically. The only literal colors allowed are the splash saffron (it runs before the tokens exist), the theme-color values that mirror the paper, the ink-tinted scrim, and the six person tones.

**The One Ramp Rule.** Charts measure with a single hue: the teal ramp mixed into deep cream. Every level is named in a legend beside the grid, and "not marked" is paper with a hairline, so colour is never the only key. No rainbow scales, no red-to-green.

## Typography

**Display Font:** Fraunces (with Georgia, serif), variable optical size, normal and italic. The legacy `font-hand` and `font-serif` names both map to Fraunces.
**Body Font:** Public Sans (with system-ui, sans-serif), weights 400 / 500 / 600 / 700

**Character:** Fraunces is the pen: a soft, slightly old-style serif that makes a page title feel written. Public Sans is the ruled line: plain, legible, and never decorative. The two never swap jobs.

### Hierarchy
- **Display** (Fraunces 600, 28px on phones / 34px on desktop, line-height 1.1, -0.015em): the page title in the top bar, one per screen, beside today's date.
- **Headline** (Fraunces 600, 30 to 36px, line-height 1.1 to 1.15, -0.02em): the one sentence that opens sign-in and each onboarding step.
- **Title** (Fraunces 600, 18 to 20px; sheet titles 24px at -0.015em; a person's name 24 to 28px): section headings inside a page (Appearance, Practices, Birthdays this week, chart titles), moment titles, sheet titles.
- **Quote** (Fraunces italic 400, 14 to 17px, line-height 1.55; the Today quote card 20 to 24px at 1.45): the daily Sadhguru quote, the one-line lead under a page title, empty-state invitations, a person's reason for joining. Soft ink, except the Today quote card (ink) and over the photo.
- **Journal** (Fraunces 400, 16 to 19.5px, line-height 1.65 to 1.8): what the person wrote: moment bodies, the commitment letter, person notes, the practice-and-mood sentences.
- **Body** (Public Sans 400, 15 to 16px, line-height 1.6 to 1.65): lead paragraphs and descriptions. Inputs are 16px so iOS never zooms.
- **Body Strong** (Public Sans 600, 14.5 to 15px): row titles, button labels, nav labels (nav at 500).
- **Label** (Public Sans 500, 12.5 to 13px): dates, meta lines, form labels (600), helper text, chart legends. Group headings inside lists (a day in the moment timeline, "Commonly practiced") are 13px 600 soft ink in sentence case. Numbers use tabular figures.
- **Micro** (Public Sans 500/600, 11px): tab-bar labels, the weekday letters and week dates of the mood grid, the ⌘K key cap.

### Named Rules
**The Pen and Ruler Rule.** Fraunces for anything a person would write by hand (titles, quotes, reflections); Public Sans for anything the app says (labels, buttons, meta). No Fraunces on buttons, no Public Sans page titles.

**The Tabular Rule.** Every time, count and date uses tabular figures (the `.tabular` utility) so columns and counters do not shimmer.

**The No-Eyebrow Rule.** Headings stand alone. No uppercase tracked kickers above titles; hierarchy comes from Fraunces against Public Sans.

## Layout

One quiet column. On desktop (1024px and up) a 248px sticky sidebar holds the lotus wordmark, navigation, the daily quote with Sadhguru's signature, footer links (Settings, Admin) and the person's avatar; content sits in a column capped at 860px with 48px side padding. Below 1024px the sidebar disappears, a 64px bottom tab bar (capped at 560px wide, safe-area padded) takes over with at most five slots: sections are ranked for phones (Today, Tracker, Expressions, People, Daily, Weekly, Insights, Commitment, then Settings and Admin), and when they do not fit the first four stay and the rest move under a fifth "More" tab that opens a small bottom sheet of 48px rows, the lotus wordmark sits above the page title, and the day's quote moves under the title as a two-line clamp that expands on tap. Phone gutters are 16px, 24px from 640px.

Focused flows (sign-in, onboarding) drop the shell. Onboarding is a 560px reading column with a sticky blurred header (back, segmented progress, step count) and a footer action bar fixed to the bottom on phones and inline on desktop. Sign-in is a two-column split on desktop (Sadhguru photo at 1.1fr, a 380px form at 1fr) that stacks with the photo at 42dvh on phones.

Sheets are the one pattern for adding and editing (a practice, a moment, a person): a bottom sheet up to 94dvh on phones with a grab handle, a centred dialog on desktop at 560px (680px for the wide variant) and up to 88dvh, with a sticky header (title, close) and an optional sticky footer for the save action. Search is a 600px dialog pinned 12vh from the top, opened by ⌘K or "/".

Timelines group by day: a 13px soft-ink day heading, then its cards 10px apart, groups 24px apart, newest first.

Rhythm: 16px inside cards and rows, 8px between stacked option cards, 24 to 32px between sections, 32px between a headline and its first control, 32 to 40px between sections on Today and Insights. A page that scrolls to an end closes with a faint centred divider ornament. Safe areas are respected on every fixed edge (`env(safe-area-inset-*)`).

## Elevation & Depth

Depth is tonal first: paper, then a deeper cream card, then a deeper cream still on hover. Shadows are rare, warm (tinted with ink, not grey), and soft. Only two exist as tokens, and in the night journal they deepen to black.

### Shadow Vocabulary
- **Soft** (`0 1px 2px rgba(24,22,15,0.04), 0 8px 24px -12px rgba(24,22,15,0.12)`): the primary and Google buttons, and the raised thumb of a segmented control (theme toggle, admin filter).
- **Lift** (`0 2px 4px rgba(24,22,15,0.05), 0 18px 40px -16px rgba(24,22,15,0.22)`): floating layers only: sheets, the search dialog, the More sheet, the people-picker dropdown and overflow menus. Floating layers sit on the paper colour (not card cream) over the ink scrim, so they read as a fresh sheet laid on top.

### Named Rules
**The Paper Stack Rule.** Cards sit on the page by tone alone. Borders are not used to separate a card from the page; hairlines appear only as dividers inside a group, as navigation edges, as the edge of a sheet footer or search field, around small floating menus, and as outlines on unselected chips. A teal-wash card (a selected option, the commitment reminder) may carry a faint teal border (30 to 40%).

## Shapes

Soft, generous rounding with a clear ladder by size: practice tiles and menu items 10px, nav items, icon wells, library tiles and photos 12px, buttons, inputs and the audio player 14px (small buttons and moment kind wells 11px), option cards and list rows 16px, list groups, moment cards and person rows 18px, chart panels and weekly cards 20px, hero cards (the Today quote, a person's header, the commitment letter) and the search dialog 22px, sheets 24px (top corners only on phones). Chart cells are nearly square: 3px for month-grid days, 6px for mood days, 4px for legend swatches. Chips, segmented controls, switches, avatars, progress segments and the tab-bar active pill are full pills or circles. The lotus mark is a 1.7px round-capped line drawing that takes the current text color. Sadhguru's signature is a traced vector in the current text colour (soft ink in the shell, near-white over the photo). The Isha ornaments are masks filled with `currentColor`, always `aria-hidden`: the divider (a page's closing mark, the sidebar above the quote), the flourish (under the sign-in and onboarding headline), leaves (a large watermark at 10 to 15% bleeding off a hero edge, desktop only), the kolam (above an empty-state invitation, in teal at 50 to 60%) and the vine (the head of the commitment letter). Ornaments stay faint: soft ink at 10 to 45% or teal at 50 to 60%. The focus ring is a 2px teal outline, 2px offset, 8px radius (0 offset on text fields).

## Components

### Buttons
Tactile and calm: they press in (scale 0.97, 160ms expo-out) rather than light up.
- **Shape:** gently rounded (14px; 11px at small size). Heights 36 / 44 / 52px.
- **Primary:** teal fill, paper label, Public Sans 600, soft shadow; hover brightens 10%.
- **Secondary:** deep cream fill, ink label; hover deepens it with 8% ink.
- **Ghost:** teal label, teal wash on hover. **Danger:** danger label, 10% danger wash on hover.
- **Google sign-in:** ink fill, paper label, 52px, full width, the Google G on a small white disc.
- **Disabled:** 45% opacity, no shadow.
- **Loading:** the button keeps its full colour (it is working, not disabled). The label stays in place but invisible so the width never changes, and three 6px breathing dots in the label colour sit centred over it; `aria-busy` is set.

### Chips
- **Style:** 32 to 36px pills, Public Sans 12.5 to 13px, a leading 14 to 15px Phosphor icon.
- **State:** unselected is a hairline outline with soft-ink text; selected is teal wash, a teal border and a teal label, with the icon switching to its filled weight. In admin, a disallowed feature chip is struck through.

### Cards / Containers
- **Corner Style:** 16px for option cards, 18px for groups and rows, 20px for dialogs.
- **Background:** cream card; deep cream on hover; teal wash with a 40% teal border when selected.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** none, except hairline dividers between rows in a group.
- **Internal Padding:** 16px (14px vertical for settings rows).

### Inputs / Fields
- **Style:** 14px radius, 48px tall, 16px padding, 16px text, a transparent 1px border. The fill is one step deeper than what it sits on: cream card on the page, deep cream inside sheets. Search fields carry an 18px magnifier at 16px in and a round clear button.
- **Focus:** the border turns teal; the caret is teal.
- **Error:** a 13px danger-colored line below, announced with `role="alert"`.

### Navigation
- **Sidebar:** nav-cream, hairline right edge. Links are 14.5px Public Sans 500 with a 21px Phosphor icon; inactive is soft ink with a faint card hover; active is teal text on a teal-wash pill (12px) that glides between items (spring, stiffness 500, damping 40) and the icon switches to filled.
- **Phone tab bar:** nav-cream at 95% with a backdrop blur, hairline top edge, 64px. Each tab is a 22px icon over an 11px label; the active tab gets a teal-wash capsule behind the icon that glides between tabs, a filled icon and a semibold teal label.
- **More sheet:** paper ground, 24px top corners, grab handle, lift shadow; rows are 48px, 14px radius, 15px 600, teal wash and filled icon when active.
- **Top bar:** Fraunces page title left, today's date right in 13px tabular soft ink with a 6px saffron dot.
- **Search:** a ghost search button in the header (a 36px icon well, or a full-width row with a ⌘K key cap in the sidebar). The dialog is paper, 22px radius, lift shadow: a 56px field row over a hairline, then results grouped under 12px 600 soft-ink labels (People, Moments, Reflections), each a row with a 32px deep-cream icon well or an avatar; the active row follows the keyboard.

### Sheet
The one surface for adding and editing. Paper ground over the ink scrim, lift shadow, 24px corners. It rises 40px while fading in (360ms, expo-out; fade only under reduced motion), locks page scroll, and closes on Escape or a scrim tap. Phones get a 40 by 4px line-coloured grab handle. Header: a 24px Fraunces title and a 36px round cream-card close button; optional tabs sit under the title. Body scrolls on its own; the footer (the save action) is sticky, edged with a hairline, and padded for the home indicator.

### Loader
The lotus, breathing: the teal line lotus (22 / 32 / 44px) scales 0.94 to 1.04 over 2.4s with a teal-wash halo swelling behind it, and an optional 13px soft-ink label. Used for a section or page waiting on data; a full-screen variant sits on paper at 80% with a light blur, and an overlay variant covers a reloading container. Inside buttons and small controls it becomes three breathing dots (1.1s, 160ms stagger). Reduced motion slows the breath to 3.6s linear rather than stopping it.

### Segmented Control
A cream-card pill track with 4px inset; the active segment is a paper-colored pill with the soft shadow and ink label, inactive segments are soft ink. Used for the theme toggle and the admin filter (where the active pill glides).

### Switch
44 by 26px pill; teal when on, parchment line when off; a white 20px thumb with a small shadow slides 18px on the expo-out curve.

### Practice Tile (signature)
Every practice is shown by its Isha illustration (from the reference app's practice set) on a deep-cream 10px tile: 26px in the insights month grid, 36px in lists, 48px at 12px radius in the practice library. A practice without an illustration falls back to its Phosphor icon (52% of the tile) in teal on the tinted tile (16% teal into deep cream).

### Practice Library
A searchable list of the 52 catalogued practices, grouped (Commonly practiced, Daily rhythm, All practices) under 13px soft-ink group headings. Each row is a 16px-radius cream-card button with a 48px tile, a 15px 600 name and a 13px meta line (minutes · kind). Chosen rows turn teal wash. In the tracker the trailing control is a 36px, 11px-radius Add button (teal outline at 40%, then a teal fill reading "Added"); in onboarding it is a 24px round tick.

### Moment Card
A borderless 18px cream card, 16px padding (20px from 640px). Header: a 36px paper well with the kind icon (writing, audio, video, photo) in teal, an optional 18px Fraunces title, and a 12.5px tabular meta line (time, place, a teal "back on" date). Media follows, then the body in Fraunces 16px at 1.65. The footer holds person chips (paper pill, 24px avatar, 13px 600 name) and stamp chips (hairline pill). Options live in an overflow menu: a 160px paper panel, 14px radius, hairline edge, lift shadow. Moments list as a day-grouped timeline.

### Media
Audio plays in a 14px deep-cream well with a 40px round teal play button (paper icon), a teal-accented scrubber and tabular time. Photos sit on 12px deep-cream frames (one full width, several in a 2 to 3 column square grid); video on 14 to 16px black frames. The recorder is an 18px cream-card panel around an 80px round record button.

### People
- **Avatar:** a circle; the photo when there is one, otherwise 600-weight white initials (38% of the size) on the person's tone. Sizes 24 (chips), 30 (lists, charts), 36, 40, 52 (the People grid).
- **People picker:** a deep-cream 14px field that holds paper person chips with a remove button and grows as they wrap; its focus turns the border teal. Suggestions drop into a paper panel with the lift shadow, ending in a teal "Add" row with a teal-wash plus.
- **Person header:** a 22px cream hero card with the avatar, a 24 to 28px Fraunces name, relation in soft ink and a teal moment count; details below a hairline.

### Insights (charts)
Each chart sits in a 20px cream-card panel under a Fraunces 20px title and a 13.5px soft-ink lead that says how to read it; the page opens with a Fraunces italic line and closes with the divider ornament.
- **Month grid:** one row per practice (tile, name, "12 of 20 days" in tabular soft ink), one 3:4 cell per day with 2px gaps: teal when kept, deep cream when not logged, a dashed hairline outline for days still to come, today ringed in soft ink.
- **Mood grid:** eight Monday-first weeks of square 6px-radius cells on the teal ramp, "not marked" on paper, weekday letters above and week dates beside, a named legend below, and a screen-reader summary of the counts.
- **Ranked bars:** avatar, name and count per row, with an 8px pill bar in teal on a deep-cream track, longest first.
- **Tooltips:** every cell is focusable and shows a small label, paper text on an ink ground (8px radius, 12px) on hover or focus.

### Splash (signature)
Once per browser session, before first paint: a full-bleed saffron field with the Isha lotus still and the snake turning slowly around its coil (2.4s linear), fading out over 450ms. The browser theme-color follows it (saffron, then paper). Reduced motion stops the turning.

## Do's and Don'ts

### Do:
- **Do** use role tokens (`bg-bg`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-soft`, `bg-accent-soft`) so every screen works in both the cream and night journals.
- **Do** mark selection, activity and focus with teal: teal text or fill plus the teal wash, and switch Phosphor icons to the filled weight.
- **Do** add the `.press` utility to anything that acts like a button, and use the expo-out curve (`cubic-bezier(0.16, 1, 0.3, 1)`) for movement.
- **Do** set titles and reflective text in Fraunces and everything the app says in Public Sans; use tabular figures for times, counts and dates.
- **Do** let Sadhguru's photo, signature and the practice illustrations carry the imagery; the signature takes the current text colour (soft ink in the shell, near-white over the photo).
- **Do** use one Isha ornament per place it belongs (a closing divider, a kolam above an empty state, a flourish under a focused-flow headline), faint, in `currentColor`, hidden from assistive tech.
- **Do** open every add or edit flow in the Sheet, with the save action in its sticky footer.
- **Do** show waiting with the breathing lotus, and busy buttons with the breathing dots at full colour and unchanged width.
- **Do** build any chart scale from the teal ramp and name every level in a legend.
- **Do** keep inputs at 16px text and respect safe-area insets on every fixed edge.

### Don't:
- **Don't** use saffron for buttons, cards, headings or decoration; it is for arrival and waiting only.
- **Don't** put borders around cards to separate them from the page; separate by tone.
- **Don't** add streaks, badges, points, scores or celebratory motion; patterns are shown gently or not at all.
- **Don't** hard-code hex colors or Tailwind palette colors (`gray-*`, `stone-*`, `shadow-xl`) in components; white is reserved for text over photographs, avatar initials, the switch thumb and the Google disc.
- **Don't** use spinners or rotating loaders anywhere but the splash snake; waiting breathes.
- **Don't** fade a button that is loading, or swap its label for a loader in a way that changes its width.
- **Don't** add uppercase tracked eyebrows or kickers above headings.
- **Don't** follow the OS color scheme or animate colors on first paint; theme is the person's choice and cross-fades only while switching.
