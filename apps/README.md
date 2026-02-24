# Hop Suite (Mobile-First MVP)

This folder contains three connected apps for the Hop MVP:

- `greech-app/index.html`
- `geer-app/index.html`
- `hop-app/index.html`
- shared contract: `shared/contract.js`

## What Each App Does

- `Greech`: text workflows (Text/Slang/Forum) + send selected text to Geer.
- `Geer`: accepts handoff/custom text, generates captions with presets, supports copy one/all.
- `Hop`: unified home dashboard with app entry points, quick actions, and recent activity preview.

## Shared Contract (Handoff)

Contract is implemented in `shared/contract.js` via `window.HopContract`.

Payload fields:

- `text`
- `sourceType` (`library` | `custom` | `greech`)
- `selectedTextId`
- `language` (`hy` | `en`)
- `context` (object)

Used by:

- `Greech -> Geer` send flow
- `Hop` quick action handoff
- `Geer` draft + incoming resolver

## Usage Notes

1. Open `hop-app/index.html` for the main entry.
2. Use `Open Greech` to prepare text, then `Use in Geer`.
3. In `Geer`, choose preset (`Short/Medium/Punchline`) and generate captions.
4. Use `Copy` or `Copy all` on generated caption cards.

## Accessibility Basics Included

- Focus-visible outline for keyboard/touch-assist navigation.
- `aria-label` added for bottom nav buttons.
- `aria-label` added for icon-only reply send button in Greech forum.

## Mobile QA Checklist (Required)

Test on these viewport widths:

- `360x800`
- `390x844`
- `412x915`

Run through:

1. `Hop` home cards, quick actions, recent activity visibility.
2. `Greech` text source switch (`Library/Custom`) and active text updates.
3. `Greech` Slang highlighting + explanation panel.
4. `Greech` Forum create/reply flows and thread filtering per active text.
5. `Greech -> Geer` handoff carries text + source + language metadata.
6. `Geer` input source label correctness after handoff.
7. `Geer` generate/regenerate states (`loading/empty/error`).
8. `Geer` copy one/copy all behavior (clipboard + fallback).
9. Bottom nav does not overlap tappable content.
10. No clipped cards/buttons in safe-area regions.

## Known Scope

- Forum is local-state MVP only (no backend persistence yet).
- Caption generation is deterministic local logic (no external model yet).
