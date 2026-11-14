# modules/stories

**Purpose:** the story bank and story-to-role matching (PRD SB1–SB5; goals G3 "every competency has a story or a gap", G4 "decision first, team vs own split", G5 "never invent").

## Intended behaviour
- **Paste (SB1):** `addStories` accepts 40–20,000 characters, one or many stories (blank lines help). The model's `story_structure` output is verified by `structureFromModel`; one row per story; event `story_added {count, dropped_spans, source}`.
- **Decision first, in their words (SB2):** situation / decision / result are **verbatim spans** of the user's text (`rawText.slice(start, end) === text`). Wrong offsets are repaired with `locateQuote`; text that is not in the paste is **dropped and counted**, never shown. Each story's `rawText` is the pasted text between its first and last verified piece, widened to whole sentences; overlapping stories are dropped. If nothing verifies, the whole paste becomes one **draft** story.
- **Team vs own (SB3):** sentences come from code (`labelSentences`). The actor uses the model's label when it lines up with a sentence, otherwise a code heuristic ("we"-forms → team, "I"-forms → own). Flags are **code-owned**: `we`, and `no_evidence` (a result word such as "improved" with no number). Flags are questions in the UI, never edits.
- **Never invent (SB5, G-NO-INVENT):** `guard.findInventions(output, source)` lists numbers, proper names and ownership verbs ("led", "owned", "drove"…) in generated text that the source does not contain. Phase 4 fields are verbatim spans (so they cannot invent); Phase 5 draft stories must pass this guard.
- **Ready / edit (4.5):** `updateStory` with `{ ready }` toggles `structured ↔ ready` (draft stories cannot be marked ready: 409 with a plain reason; event `story_marked_ready`). With `{ rawText }` it re-structures the edited text as one story and returns it to `structured`.
- **Match to a role (SB4, G3):** `mapStories(interviewId)` asks the model (`story_map`) for each competency's best story. Code accepts a match only if the story belongs to this session and the **reason is a verbatim quote from that story**; everything else becomes a **gap**, so every competency always has exactly one row. Stored in `competency_map` (replaced on each run).

## Files
| File | Role |
|---|---|
| `guard.ts` | G-NO-INVENT: `findInventions` |
| `structure.ts` | `structureFromModel`, `labelSentences` (verbatim spans, code-owned flags) |
| `service.ts` | `addStories`, `updateStory`, `mapStories`, `StoryError` (400/404/409/422) |
| `deps.ts` | Route wiring, `StoryView` (no session id), error → HTTP |

## Where it is used
`POST /api/stories`, `PATCH /api/stories/:id`, `POST /api/interviews/:id/map`; pages `/stories` (`StoryBank`, `StoryCard`) and the hub's "What this role tests" section (`MatchStoriesButton`). Stories are **session-wide**: one bank serves every interview.

## Data notes
Migration `0003_competency_map_cascade.sql` fixes a latent conflict in 0001 (`ON DELETE SET NULL` vs the "story or gap" check): deleting a story now deletes its mapping rows.

**Tests:** `stories.test.ts` (guard, verbatim spans and repairs, flags, draft fallback, add/ready/edit, ownership, mapping with gaps and rejected inventions), `e2e/phase4-stories.spec.ts`.
