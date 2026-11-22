# design/: instructions for agents

## What's here
UI design proposals for the product, each as a written spec plus the source of its interactive mockup. Files are numbered in the order they were made.

| File | What it is | Feeds |
|---|---|---|
| `01_merged-question-cards.md` | Spec for merging "Questions to practise" and "What this role tests" on the role page into one card per question, with engineering notes on what differs from the current app | Role page (`/i/[id]`) changes |
| `01_merged-question-cards.dc.html` | Source of the role page mockup (Claude Design canvas file; renders only inside the canvas linked from the spec) | Reference for the spec |
| `01_merged-question-cards-my-stories.dc.html` | Source of the My stories mockup for "Build story" (same canvas) | Reference for the spec |

## Rules
- A design here is a proposal until it is built in `product/`. Say what differs from the current app.
- Follow the design language in `product/06_product-engineering-context.md` §3 (on the `dev/…` branches).
- Label example data in mockups as example data.

## Logging (mandatory)
Append an entry at the bottom of this folder's `log.md` for every change (date, who, **What**, **Why**, **Files**), and in the root `log.md` if you touched other folders too. Never edit past entries.

## Privacy
No names, emails or identifying details of interviewees or users in mockups.
