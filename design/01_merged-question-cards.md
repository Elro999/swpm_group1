# 01: Merged question cards (role page redesign)

**Status:** design proposal, not built · **Date:** 2026-11-21 · **Owner:** Addyant (with Claude)
**Interactive mockup:** https://claude.ai/artifact/5p7XZFgy6yu3BL3R8YoWL5 (private until shared from its Share menu)
**Source:** `01_merged-question-cards.dc.html` (a Claude Design canvas file; it only renders inside that canvas)
**Changes:** the role page `/i/[id]`, today `product/app/src/app/i/[id]/InterviewHub.tsx` on the `dev/…` branches.

## Problem
The role page has two sections that talk about the same competencies: "Questions to practise" and "What this role tests". A new user has no stories, so the second section is a list of gaps. To get CV prompts they must click "Find stories for this role", then open each gap. That is an extra step and makes the user connect two lists by hand.

## Design
One section, one card per question. Each card holds everything for that question's competency.

| Part of the card | Behaviour |
|---|---|
| Header | Q number, competency chip, status chip: **Story matched** (green), **N from your CV** (neutral), **Gap** (amber) |
| Question + JD quote | Unchanged from today |
| Matched story | Shown when a saved story fits. Title, **Ready / Draft** chip, **Why it fits** quote (verbatim from the story, as today). Links: **Open** (goes to the story on My stories) and **Change** |
| Change | Opens a list inside the card: saved stories, best fit first, current one marked "In use". Picking one swaps it in (label becomes "Chosen by you"). **Unlink this story** removes only the mapping; the question and the story both stay |
| After unlinking | The story returns to the card's suggestions as a **Saved story** row with **Use this story**: right after the top CV prompt (inside "More prompts from your CV and stories"), or as the top suggestion when the card has no CV prompt. The story bank strip shows **Match again**; if the story still fits, matching links it back |
| CV prompts | 0–4 prompts filled in on load (no click). Only the most relevant one shows; the rest sit under **More prompts from your CV (N)**, collapsed. Each prompt quotes the CV line and asks a question; **Build story →** goes to My stories |
| No prompts and no story | Amber **Gap** note with a link to My stories |
| Practise | Always visible. Before consent, pressing it scrolls to the consent banner and highlights it in indigo ("One step before Q3", button "I agree, start Q3") |

Page level:
- **Consent banner** at the top (short, with the details in a fold-out); turns into a green "You're set to record" line after consent.
- **Story bank strip** under the title: matching runs on page load; "Match new story" appears only when a story was added since the last match.
- **No match and errors** (all in the story bank strip; cards keep their CV prompts either way):

  | Case | Message |
  |---|---|
  | No saved stories | "No saved stories yet. Add one and we'll match it to these questions automatically." + Add your first story |
  | Stories saved, none fits | "Checked your 3 saved stories: none fits these questions yet, so each card shows prompts from your CV instead." |
  | Match again after an unlink, story no longer fits | "Checked again: "<story>" doesn't fit any of these questions now. It stays in My stories and in the card's suggestions." |
  | New story doesn't fit | "Checked your new story: it doesn't fit any of these questions. It stays in My stories." |
  | Matching failed (page load or button) | Amber strip: "We couldn't match your stories just now. Nothing is lost: your stories and CV prompts are all still here." + **Try again** |
- **Clear Communication** (a competency with no question) is a one-line note: feedback covers it on every answer.
- **Prep list** and **Delete my data** stay below the questions, as today.
- Removed: "Add my stories", "Find stories for this role", "Match again", the "Add a story" button on cards, and the whole "What this role tests" section.

Visual system follows `product/06_product-engineering-context.md` §3: zinc greys, indigo-600 accent, amber for gaps, Geist, quote style for every JD/CV/story line, light and dark themes, 44 px touch targets.

## Build story → My stories
Source: `01_merged-question-cards-my-stories.dc.html`.

- **Text box:** opens with the CV line as the starting sentence. If the box already has unsaved text, the CV line goes below it after a blank line, so it starts a new story and nothing is overwritten.
- **Guide panel** (above the box, never inside it): "Building a story for Q1 · Problem Structuring", the card's question, the CV line, and four questions to answer in your own words: Situation, Your decision ("say I, not we"), the card's own CV prompt, Result ("how do you know?"). These match what My stories already checks, so the guide and the feedback agree. The guide only asks; it never offers wording.
- **After "Add to my stories":** the story is checked against that one competency only. If it fits, it is linked to the question, with a "Why it fits" quote from the user's own words and a **Back to Q1** button. If not, it is saved but not linked, with a message saying what's missing and **Edit this story**.
- **Back link** at the top goes to the question the user came from.

## Differences from how the app works today (engineering notes)
1. **CV prompts on every card, on load.** Today prompts are fetched only for gap competencies, on click (`/api/competencies/[id]/prompts`, 3–5 prompts). The design needs them for every competency at page load, capped at 4 and ranked by relevance. That is up to one AI call per competency; cache them per interview.
2. **Build story goes to My stories.** Today a gap prompt is answered inline and the typed answer becomes a draft story (`draft-story` route). The design sends the user to My stories instead, so `/stories` needs to know the interview, question and CV prompt when it opens. Today the link carries only the interview (`/stories?from=<interview>`), and CV prompts are generated per click and never saved. So: (a) save each competency's CV prompts when the role page loads (note 1 needs this anyway); (b) give each Build story link **IDs only**, e.g. `/stories?from=<interview>&q=<question>&prompt=<prompt>`, never the CV line or question text, because links end up in browser history and server logs and user text must never reach logs; (c) have `/stories` look up the question and CV line from those IDs on the server, checking they belong to the session. Then it can show the guide, keep the guide text out of the story, and remember which competency the new story was built for so it can be checked against that one only.
3. **Matching on load, then scoped checks.** Today matching runs when the user clicks, across all stories at once. The design runs it once on load, then only scoped checks: **Match again** checks just the unlinked story, **Match new story** checks just stories added since the last match. Each check looks only at cards without a story and never replaces a story the user picked. If both are waiting, the strip shows two rows with one button each. This needs a matching call that takes a set of stories and a set of competencies, and it keeps AI use down (80 calls per session per 24 h).
4. **Change / Remove.** Needs a way to set or clear a competency's story by hand (`competency_map`) without the next automatic match overwriting it.
5. **Practise before consent.** `ConsentGate` today hides Practise until consent; the design always shows it and gates on press.

## Example data in the mockup
Story titles, their "why it fits" lines, the interview date and the prep list items are made up for the mockup. The CV lines are copied from screenshots of the current app; the questions asked about them are written for the mockup.
