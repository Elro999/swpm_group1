# modules/stories

**Purpose:** the story bank and story-to-role matching (PRD SB1–SB5; goals G3 "every competency has a story or a gap", G4 "decision first, team vs own split", G5 "never invent").

## Intended behaviour
- **One story per save (SB1, 2026-11-22):** `addStory({ text, title }, source)` takes ONE story of 40–20,000 characters (blank lines do not split it) and a title of 1–80 characters (required for pasted stories; discovery drafts have none and are named by their first words, `storyName`). Event `story_added {count: 1, dropped_spans, source}`.
- **STAR in their words (SB2):** the model's `story_structure` output labels each sentence with a STAR part (situation / task / action / result) and an actor. `structureStar` re-splits the text in code and borrows a label only where the model's sentence is really in the text (offsets checked, else `locateQuote`); others are dropped and counted. Every sentence lands in exactly one part (an unlabelled one joins the part before it), so nothing is lost. A part with no sentence is shown as a question from the STAR rule (`STAR_QUESTION` in `star.ts`), never as wording. New rows have `format: "star"`; older rows are `"sdr"` (decision first) and keep that view until edited.
- **Team vs own (SB3):** actors come from the model when a sentence lines up, otherwise a code heuristic ("we"-forms → team, "I"-forms → own). The UI shows them on Action sentences. Flags are **code-owned**: `we` on Action sentences, `no_evidence` (a result word such as "improved" with no number) on Result sentences. Flags are questions in the UI, never edits.
- **Never invent (SB5, G-NO-INVENT):** `guard.findInventions(output, source)` lists numbers, proper names and ownership verbs ("led", "owned", "drove"…) in generated text that the source does not contain. Phase 4 fields are verbatim spans (so they cannot invent); Phase 5 draft stories must pass this guard.
- **Ready / edit / rename (4.5):** a STAR story is `draft` while any part is missing and `structured` when all four are there. `updateStory` with `{ ready }` toggles `structured ↔ ready` (a draft gets 409 naming the missing parts; event `story_marked_ready`). `{ rawText }` re-sorts the edited text and returns it to `draft` / `structured`; `{ title }` renames without touching the story.
- **Delete (2026-11-22):** `deleteStory` (owner only, else 404) removes the row; its `competency_map` rows go with it (FK cascade, migration 0003; the memory repo mirrors this). Event `story_deleted {source}`. The UI asks first in a modal dialog.
- **Match to a role (SB4, G3):** `mapStories(interviewId)` asks the model (`story_map`) for each competency's best story. Code accepts a match only if the story belongs to this session and the **reason is a verbatim quote from that story**; everything else becomes a **gap**, so every competency always has exactly one row. Stored in `competency_map` (replaced on each run).

## Files
| File | Role |
|---|---|
| `guard.ts` | G-NO-INVENT: `findInventions` |
| `structure.ts` | `structureStar` (STAR labels on code-split sentences, code-owned flags) |
| `star.ts` | Pure helpers for server and browser: `starGroups`, `missingParts`, `storyName`, `keySentence`, STAR labels and questions |
| `service.ts` | `addStory`, `updateStory`, `deleteStory`, `mapStories`, `StoryError` (400/404/409/422) |
| `deps.ts` | Route wiring, `StoryView` (no session id), error → HTTP |

## Where it is used
`POST /api/stories`, `PATCH /api/stories/:id`, `DELETE /api/stories/:id`, `POST /api/interviews/:id/map`; pages `/stories` (`StoryBank`, `StoryCard`) and the hub's "What this role tests" section (`MatchStoriesButton`). Stories are **session-wide**: one bank serves every interview.

## Data notes
Migration `0003_competency_map_cascade.sql` fixes a latent conflict in 0001 (`ON DELETE SET NULL` vs the "story or gap" check): deleting a story now deletes its mapping rows.

**Tests:** `stories.test.ts` (guard; STAR labels only from verbatim sentences, lossless, flags by part; one story per save, title rules, ready needs all four parts, rename, edit, delete with matches; ownership; mapping with gaps and rejected inventions), `e2e/phase4-stories.spec.ts` (form, collapsed cards, missing parts, ready, edit/rename, delete dialog, matching, strangers get 404).

## Review fixes (2026-11-14)
- **Lossless pasting:** text outside every verified story is kept as a draft story; a leftover of fewer than 3 words (a heading) joins the next story (or the previous one at the end). The union of saved stories always contains every word pasted.
- **Edits invalidate evidence:** changing a story's text turns every competency mapped to it into a gap (`competencyMap.invalidateStory`) until matching runs again. The interview hub also hides any mapping whose "why it fits" quote is no longer in the story.

## STAR redesign (2026-11-22)
Replaced multi-story pasting and the decision-first card with one titled story per save, sorted into STAR; added delete. The review fix "lossless pasting" now holds by construction (every sentence is in one part). `structureFromModel` and `labelSentences` were removed.

## Role page cards (2026-11-22, design/01)
- `matchStories(interviewId, { storyIds?, competencyIds?, includeLinked?, replaceChosen? })` replaces "match everything, replace everything": it checks only competencies without a story, never replaces a match or a row with `chosenByUser`, writes a gap where a checked competency has no fit, and sets `interviews.matched_at` once every story added since the last match has been checked. `mapStories` is a thin wrapper for a full run.
- `setCompetencyStory(competencyId, storyId | null)`: Change (marks `chosenByUser`) and Unlink (gap row; the story stays). Route `PUT /api/competencies/:id/story`.
- `linkBuiltStory(storyId, competencyId)`: "Build story" checks a new story against one competency only; links it with a verbatim reason or leaves the card as it was. Event `gap_story_filled {source: "build_story"}` when it filled a gap. `POST /api/stories` takes `forCompetencyId` (ownership checked before saving).
