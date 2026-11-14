# modules/discovery

**Purpose:** help the user find a story for a skill they have no story for (PRD SD1, SD2), using only their own experience.

## Intended behaviour
- **CV first:** `saveCv(interviewId, cv)` stores the CV / list of past roles on the interview (20–20,000 chars). Prompts need it; without it `gapPrompts` returns 409 with a plain request to paste one.
- **Prompts (SD1):** `gapPrompts(competencyId)` asks the model (`gap_prompts`) and keeps only prompts that (a) are questions, (b) whose `references` are found **verbatim in the CV**, and (c) whose wording adds no number or name that is not in the CV, the JD or the competency (`findInventions`, ownership verbs allowed because prompts ask, not claim). One retry; if still fewer than 3, `fallbackPrompts` builds prompts straight from CV lines. Returns 3–5.
- **Draft story (SD2):** `draftStoryFromAnswer(competencyId, answer)` runs the answer through `addStories(..., "discovery")`, so the draft is built from **verbatim spans of the answer only**, then replaces that competency's mapping with the new story and a verbatim reason (decision, else situation, else first sentence). Event `gap_story_filled`. The UI marks it "Draft, from your answer" until the user marks it ready.
- **Ownership:** every function resolves competency → interview → `interviews.findForSession`; anything else is 404.

## Files
| File | Role |
|---|---|
| `service.ts` | `saveCv`, `verifyPrompts`, `fallbackPrompts`, `gapPrompts`, `draftStoryFromAnswer`, `DiscoveryError` |
| `deps.ts` | Error → HTTP (also maps `StoryError` from `addStories`) |

## Where it is used
`POST /api/interviews/:id/cv`, `POST /api/competencies/:id/prompts`, `POST /api/competencies/:id/draft-story`; UI `components/GapDiscovery.tsx` on each **Gap** in the hub. Answers are typed; a voice answer (plan 5.2 "optional voice") is not built.

**Tests:** `discovery.test.ts` (prompt verification, fallback, CV required, draft fills the gap in the user's words, ownership), `e2e/phase5-discovery-prep.spec.ts`.
