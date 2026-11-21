# Change log: design/

<!-- APPEND-ONLY. Add new entries at the BOTTOM. Never edit or delete an existing entry. -->
<!-- Entry format:
## YYYY-MM-DD: <who> (<person and/or agent, e.g. "Samyak via Claude Code">)
- **What:** what you added / changed / removed
- **Why:** the reason or the task you were doing
- **Files:** paths touched (relative to this folder)
-->

## 2026-11-21: Addyant via Claude Code
- **What:** Created `design/` with the merged question cards proposal: spec, mockup source, `instructions.md` and this log.
- **Why:** The role page splits each competency across two sections; the proposal merges them into one card per question with CV prompts filled in automatically.
- **Files:** `01_merged-question-cards.md`, `01_merged-question-cards.dc.html`, `instructions.md`, `log.md`

## 2026-11-21: Addyant via Claude Code
- **What:** Renamed "Remove from this question" to "Unlink this story". An unlinked story now returns to the card as a "Saved story" suggestion (after the top CV prompt, or on top when there is none) with "Use this story"; the Undo note is gone. "Match again" appears after an unlink and re-links the story if it still fits.
- **Why:** The old label read as removing the question. Unlinking should only drop the mapping and keep the story available.
- **Files:** `01_merged-question-cards.md`, `01_merged-question-cards.dc.html`

## 2026-11-21: Addyant via Claude Code
- **What:** Added the no-match and error cases for story matching: page-load results "noMatch" and "loadError", and a "matchResult" setting (match / noMatch / error) for Match again and Match new story. The story strip shows a message for each case; a failure turns it amber with "Try again".
- **Why:** The design only showed matching that succeeds; it needs the empty result and the failure message too.
- **Files:** `01_merged-question-cards.md`, `01_merged-question-cards.dc.html`

## 2026-11-21: Addyant via Claude Code
- **What:** Scoped matching. "Match again" checks only the unlinked story; "Match new story" checks only stories added since the last match; both look only at cards without a story and never replace a story the user picked. When both are waiting, the story strip shows them as two rows, each with its own button. A retry after a failure repeats only the check that failed.
- **Why:** "Match again" re-ran matching for every story, so it also linked stories the user had not asked about.
- **Files:** `01_merged-question-cards.md`, `01_merged-question-cards.dc.html`

## 2026-11-22: Addyant via Claude Code
- **What:** Added the My stories screen for "Build story": the CV line is the starting sentence in the text box (below any unsaved text, after a blank line), a guide panel beside it holds the card's question and four guiding questions (situation, your decision, the card's prompt, result), and adding the story links it back to that question or explains why it isn't linked. "Build story" rows on the role page now link to this screen.
- **Why:** Give users a scaffold for turning a CV line into a story, the same way My stories already asks for a missing decision, situation or result.
- **Files:** `01_merged-question-cards.md`, `01_merged-question-cards.dc.html`, `01_merged-question-cards-my-stories.dc.html`, `instructions.md`

## 2026-11-22: Addyant via Claude Code
- **What:** Expanded engineering note 2: save CV prompts per competency, give Build story links IDs only (interview, question, prompt), and look the text up on the server.
- **Why:** Each Build story link must open My stories for its own question and CV line, without putting user text in URLs, browser history or logs.
- **Files:** `01_merged-question-cards.md`

## 2026-11-22: Addyant via Claude Code
- **What:** Moved the Practise button to the bottom right of each question card.
- **Why:** Requested placement for the card's main action.
- **Files:** `01_merged-question-cards.md`, `01_merged-question-cards.dc.html`
