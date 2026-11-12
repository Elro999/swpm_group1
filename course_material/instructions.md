# course_material/: instructions for agents

## What's here
Class notes for SWPM (ISB Hyderabad, instructor Chandrashekhar V), one Markdown file per session, converted from the slide decks. **This is the method**: the frameworks, templates, rules of thumb and PM practitioner insights the course expects us to apply. `research/` is the **evidence** (what users said). Use both together: apply these frameworks *to* the research. Don't treat the frameworks as a substitute for it.

| File | Session | Use it when you are… |
|---|---|---|
| `session-01_intro-to-pm-and-personas.md` | Intro to PM & Personas (20 Oct 2026) | Building or merging personas (six-element decision-tool persona, anti-persona, three failure modes: stereotype / average / self-portrait); checking product sense (six questions, "what does it refuse to do"); grading weights and timeline |
| `session-02_customer-and-problem-discovery.md` | Customer & Problem Discovery (23 Oct) | Writing problem statements (five elements: who/situation, goal, obstacle, cost with a number, workaround); choosing a problem (frequency × severity, reachability, beachhead); **sizing bottom-up**; affinity clustering ("no quote, no claim"; finding vs hypothesis); using AI for synthesis safely |
| `session-03_solutions-and-value-proposition.md` | Solutions & Value Proposition (26 Oct) | Writing **JTBD** ("When…, I want to…, so I can…"; functional / emotional / social); generating solutions (Crazy 8s, How Might We); converging (criteria first, cluster by mechanism, expected-value screen, stress-test); the **hypothesis template**; UX checks; riskiest assumption; evidence ladder (said → did → paid) |
| `session-04_minimum-viable-product.md` | Minimum Viable Product (28 Oct) | Scoping the **MVP** (three questions before building, six MVP shapes, in-list vs written out-list = **goals / non-goals**); anti-patterns; buy / glue / build; prototype fidelity; **briefing an AI prototype** (five things); three events to instrument; seven-day build plan |
| `session-05_products-that-stick.md` | Products That Stick (2 Nov) | Retention and habit design (Hook Model, Fogg B = MAP, variable rewards, investment); Laws of UX for screen design; product-led growth (free tier, viral loop k, time to value) and its traps; ethics / deceptive patterns |
| `session-06_product-metrics-and-analytics.md` | Product Metrics & Analytics (4 Nov) | Choosing metrics (four tests, vanity vs actionable, Goodhart); **GAME** (Goals → Actions → Metrics → Evaluate); **North Star** by game (attention / transaction / productivity), breadth-depth-frequency, counter-metrics, one metric by stage; HEART, AARRR; **tracking spec** and event naming |
| `session-07_product-metrics-continued.md` | Product Metrics, continued (10 Nov) | Funnels, activation and time to first value, cohorts and retention curves, feature adoption (breadth × frequency), troubleshooting a metric change; PM competencies and levels |

## How the sessions map to our deliverables
- **Assignment 1, Personas & Problem Hypotheses (done):** S1, S2. The output is in `research/personas/`.
- **Assignment 2, Problems, Solution Hypothesis, MVP & Prioritisation:** template sections Personas (S1) → JTBD (S3) → Problems, sized by size and frequency (S2) → Current solutions / competitors (S1 product sense, S3 "competitive set rewrites itself") → Value proposition (S3) → MVP, goals and non-goals (S4).
- **Product Metrics, Strategy & Roadmap:** S6, S7 (and S5 for retention).
- **Final demo / prototype:** S4 (AI prototype brief, instrumentation), S5 (UX, habit), S6 (tracking spec).

## Practitioner rules the course keeps repeating (apply these to everything)
1. **Ask about the past, not the future.** Behaviour beats agreement; compliments, generalities and promises are not data (S2).
2. **A problem is not a missing feature.** Who, in what situation, prevented from what, at what cost (with a number), and what workaround they pay for (S2).
3. **No quote, no claim.** Every claim cites a participant code. A pattern in 1–2 interviews is a *hypothesis*; label it (S2).
4. **Size bottom-up** from our 25 interviews, not top-down market numbers (S2).
5. **The job, not the demographic.** Write JTBD as situation → motivation → outcome (S3).
6. **Criteria before options; eight ideas, then one, with written reasons** (S3).
7. **An MVP is defined by the question it answers**: one belief, a pass/fail number agreed in advance, and what we do next. Non-goals are written down (S4).
8. **Instrument before you build**: three events (arrived, got the value, came back), each with a who and a when (S4, S6).
9. **One North Star with a denominator, three inputs, and a counter-metric** (S6).
10. **Analytics locates; interviews explain** (S6, S7).

## Caveats
- These are class notes from decks, not textbooks. Some numbers in examples are illustrative (the notes say so); don't quote them as facts about our market.
- Case studies (Bhavishya, Vaikhari, Wadiya, Kansya Pay, Dolo365) are teaching cases; reuse their *method*, not their numbers.

## Rules for this folder
- **Reference material: don't edit the session files.** If a session is missing, add it as `session-NN_<topic>.md` and log it. Corrections go in a log entry, not in the file.
- Put our own applications of these frameworks in the folder for that work (e.g. a future `synthesis/` or `mvp/`), citing the session, e.g. "(S3: JTBD template)".

## Logging (mandatory for every agent and person)
Every time you add, change, move or delete anything in this folder, append an entry to **this folder's `log.md`**:
- Add your entry at the **bottom**. **Never edit or delete existing entries**, even to fix a typo; write a new entry instead.
- Use the format shown at the top of `log.md`: date, who (person + agent), **What**, **Why**, **Files**.
- If your change spans several folders, log it in each folder you touched **and** in the root `log.md`.
- Creating a new folder? Give it its own `instructions.md` (what's here, what to look for, what it's for) and `log.md` (same format) in the same change.
