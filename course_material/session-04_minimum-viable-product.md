# SWPM Session 4 — Minimum Viable Product

*The smallest thing that answers your riskiest question.*

**Course:** Software Product Management (SWPM) · ISB Hyderabad
**Instructor:** Chandrashekhar V
**Date:** 28 October 2026
**Source deck:** `SWPM_Session_4___Minimum_Viable_Product.pdf` (63 slides)

---

## Contents

1. [Where we sit today](#1-where-we-sit-today)
2. [Agenda and warm-up](#2-agenda-and-warm-up)
3. [What an MVP actually is](#3-what-an-mvp-actually-is)
4. [Before you build anything — three questions](#4-before-you-build-anything--three-questions)
5. [Six shapes an MVP can take](#5-six-shapes-an-mvp-can-take)
6. [Scope: what's in and what's written down as out](#6-scope-whats-in-and-whats-written-down-as-out)
7. [Case study: Wadiya Rations](#7-case-study-wadiya-rations)
8. [Four MVPs to avoid](#8-four-mvps-to-avoid)
9. [Talk tech — enough fluency to stop nodding](#9-talk-tech--enough-fluency-to-stop-nodding)
10. [Prototypes — fidelity and what each proves](#10-prototypes--fidelity-and-what-each-proves)
11. [Measure — instrument before you build](#11-measure--instrument-before-you-build)
12. [Takeaways, homework and FAQs](#12-takeaways-homework-and-faqs)
13. [Credits](#13-credits)
14. [Extras](#14-extras)

---

## 1. Where we sit today

### The Six Ps
Persona (S1–S2) → Problem (S2) → **Proposal (S3–S4) — YOU ARE HERE** → Proposition (S5) → Priority (S6–S7) → Plan (S8–S10).

**The sentence of today:** *The smallest build that answers the riskiest question — and what it will actually cost.*
An MVP is defined by the question it answers. If you can't say the question, you aren't scoping — you're just building less.

| Monday (S3) | Since | Today (S4) |
|---|---|---|
| Concept, value proposition canvas, kill criterion | Five concept tests, a storyboard | The smallest build — and its cost |

### What we leave the room with
*Build the least possible thing that settles the argument — and know what it costs before you start.*
1. **One MVP, scoped to a question** — its type, what's in, what's deliberately out, and the decision it produces.
2. **Enough tech fluency to argue** — not to build it, but to tell when an estimate is a trade and when it's a guess.
3. **Instrumentation from day one** — three events, written down before anything is built. Session 6 depends on it.

> For several of you the right MVP involves no code at all. Not a lesser answer — often the faster one.

### Where today sits in the PM Knowledge Graph
25 topics — the prototyping half of *sol* and the whole of *tech*:

| Box | Scope | Topics |
|---|---|---|
| **sol** — MVP & Prototyping | 5 topics in scope | What an MVP is · MVP types & shapes · Scoping the MVP · Wireframes, mockups, prototypes · AI-generated prototypes |
| **tech** — Technical fluency | 19 topics, 7 taught today | How apps work end to end · Data modelling for PMs · APIs and integration basics · Cloud infrastructure · Reading architecture diagrams · Security & identity, briefly · Cost questions & technical debt |
| **req** — Instrumentation | One topic, nine minutes | The one that decides whether Session 6 has anything to read. Everything you measure later only exists if somebody writes three lines of logging this week. |

The tech module was written specifically for this session.

### Recap — the hypothesis template (from S3)
**We believe** [a concept or capability] **will solve** [the problem] **for** [this one customer] **while they are** [doing this job].
Tie it to S2's problem; make it falsifiable; write eight, pick the strongest.

---

## 2. Agenda and warm-up

**Three blocks. Two drills. One build.**

| # | Block | Time |
|---|---|---|
| 01 | Warm-up — the kill criteria you wrote, read back | 4 min |
| 02 | What an MVP is, and the six shapes it takes | 25 min |
| 03 | Drill 1 — scope your MVP | 13 min |
| 04 | Break | 10 min |
| 05 | Enough technical fluency to make the trade | 25 min |
| 06 | Prototypes — fidelity, and what each one proves | 13 min |
| 07 | Drill 2 — the one-page MVP plan | 13 min |
| 08 | Instrument it before you build it | 9 min |

The one-page plan from Drill 2 is what you build against.

**Warm-up:** four teams' kill criteria read back — two testable, two weak; the room sorts them. The question to every team: *what would you have to build to find that out?*

---

## 3. What an MVP actually is

> **Not the first version of your product. The least work that produces a decision you are currently unable to make.**

### The word that does the damage — "minimum"
1. An MVP is **not a small version of your product**.
2. It is **an experiment with a user interface**.
3. *Minimum* means the least work that answers the question — not the fewest features you could bear to launch with.

Those two readings — *cut-down version* vs *experiment* — produce completely different builds.

### Flow in an MVP
1. **Hypothesis and decision rule** → 2. **Smallest test with real people** → 3. **Measure against the rule** → 4. **Decide: build, change or stop.**
If the answer is "change", the revised hypothesis starts the loop again.

---

## 4. Before you build anything — three questions

Each one is non-negotiable.

1. **Which belief is this testing?** One, named — from Monday's riskiest assumption, not a list of four things you're curious about.
2. **What result would count?** A number, agreed before you build. "We'll see how it goes" is how you build for six weeks and learn nothing.
3. **What will you do then?** Continue, change, or stop — written down while nobody is invested in the answer.

> If you cannot answer all three, you are not building an MVP. You are building. That's allowed — plenty of good work is just building — but call it what it is, and don't expect it to answer whether the idea is right.

---

## 5. Six shapes an MVP can take

*Six shapes — not a progression.*

| # | Shape | What it is | Tests |
|---|---|---|---|
| 01 | **Landing page** | A page, a promise, a sign-up box | Whether anyone wants it |
| 02 | **Fake door** | A button inside something that already exists | Demand for a feature |
| 03 | **Concierge** | You do the work by hand, visibly | Whether the value actually lands |
| 04 | **Wizard of Oz** | Looks automated; is you, at a laptop | The experience without the engine |
| 05 | **Single feature** | One thing, built properly, nothing else | Whether that one thing is enough |
| 06 | **Pre-order** | Money or a deposit before it exists | Willingness to pay — which nothing else tests |

None of these is the whole product. Five of the six can be done in a week by people who can't code.

### Match the shape to the belief

| The belief you are testing | Shape | What you get back |
|---|---|---|
| People have this problem badly enough to look for a fix | Landing page | Sign-ups per hundred visits |
| They'd use a feature like this, inside what they already use | Fake door | Clicks, and who clicked |
| The value actually arrives when the job gets done for them | Concierge | Did they come back and ask again? |
| The experience works, even if we can't build the engine yet | Wizard of Oz | Where they got confused |
| This one capability is enough on its own | Single feature | Repeat use over two weeks |

Read your kill criterion, find the row, build that. *It's usually the row above the one you wanted.*

### The shape that unblocks most teams: Concierge
**Do the thing by hand, for three people, and see** — whether the value actually arrives, not whether you can build it.

| What it proves | What you learn free | What it does not prove |
|---|---|---|
| That the outcome is worth having. Nothing else proves this before you build. | Every edge case, week one — from real data instead of imagination. The list becomes your real spec. | That you can automate it, the economics, or that it works at a thousand customers. Scaling is a problem you earn. |

> It feels like cheating. It's the opposite — you're refusing to build the engine until you know the output is worth having.

---

## 6. Scope: what's in and what's written down as out

| IN — because the question needs it | OUT — and written down as out |
|---|---|
| The one flow that produces the answer | Sign-up, settings, profiles, notifications |
| Whatever the user must see to behave normally | Anything for the second kind of user |
| The three events you will measure | Everything that makes it look finished |
| A way for them to tell you it went wrong | The feature someone on the team is excited about |

> **A non-goal is a decision. An omission is an accident you will have to defend later.**

Write the out-list on the same page as the in-list, before you start. "We decided not to, here's why" is a different conversation from "we ran out of time."

---

## 7. Case study: Wadiya Rations

### The people in the case (Pune · Wakad and Hinjewadi housing societies)
| Person | Role | Part in the story |
|---|---|---|
| Imtiyaz & Shafina | Father and daughter — Imtiyaz is Chief Executive; Shafina is learning the business | Owners |
| Jaspal Girme | Engineering Lead | Proposes the subscription app |
| Jivitesh Gangurde | Head of Product | Asks what must be tested |
| Ishrita Gadekar | Operations Lead | Makes packing and delivery work |
| Households | Customers | Buy and collect monthly baskets |
| Society committee secretaries | Partners | Help the team reach residents |

### "Let's become Tech / AI first" — Jaspal's weekend demo
A polished prototype app: *"Wadiya — your monthly essentials, sorted."* Monthly Essentials basket at ₹2,400/month, UPI AutoPay subscription, scheduled society pickup, delivery tracking, and a society-operations dashboard. **A polished prototype — the business assumptions are still untested.**

### The decision at hand — "Build Now or Learn First?" (Pune, 2 March 2026)
1. **The business today:** pack in Wakad → one society drop point → households collect monthly baskets of everyday staples.
2. **Jaspal's proposal:** a full subscription app — society dashboards, payment mandates, route planning — **₹62 lakh, 14 weeks.**
3. **Jivitesh's dilemma:** *Will households pay in advance for a fixed basket? Can we deliver it at a margin?*

**The stakes:** cash today ₹310 lakh; monthly spend ₹38 lakh; after the build payment ₹248 lakh ≈ **6.5 months** at current spend.
**Commit ₹62 lakh now — or test the assumptions first? What evidence would change your decision?**

### Jivitesh's alternative: test before building
**A six-week concierge MVP, 16 March – 27 April 2026.** *People do the work before software does.*
1. **Make a real offer** — ₹500 deposit · 1,200 households · 4 societies.
2. **Fulfil by hand** — pack, deliver and record actual costs.
3. **Ask for month two** — will households pay again?

**Write the rule BEFORE launch (9 March 2026):**
- **Gate 1 — Will they commit?** Deposit rate **≥ 6%** (base: all 1,200 households offered → at least 72).
- **Gate 2 — Will they return?** Second-basket payment **≥ 70%** (base: depositors, not all households).
- **Original rule:** build only if **both** thresholds are met. (Based on assumed economics — costs and retention still need checking.)
- *What would this test teach us — and what would remain unknown?*

### The MVP: will households commit — and return?
- **One kiosk, a real offer:** pitch the monthly basket → record household + society → take a ₹500 deposit by UPI → log payment + confirm pickup. The team handles orders and fulfilment manually.
- **The offer:** Monthly Essentials, ₹2,400/month — dal, rice, atta, oil, spices. One fixed basket of everyday staples; one scheduled society pickup; reserve with a ₹500 deposit (part of the basket price); pay again for next month.
- **Check the economics:** record actual packing and delivery costs. 12-month retention remains an assumption. Revisit the economics if measured costs change.

### What happened in the societies? (Readout: 27 April 2026)

| | Result | Gate | Outcome |
|---|---|---|---|
| **1. Households committed** | 1,200 offered → **78 paid ₹500 deposit = 6.5%** | ≥ 6% (72 households) | ✅ PASS |
| **2. Households returned** | 78 depositors → **56 paid for basket two = 71.8%** | ≥ 70% (55 depositors) | ✅ PASS |
| **3. Delivery cost surprised** | 134 baskets delivered (78 first + 56 second); total delivery cost ₹21,440 | Assumed ₹120/basket vs **actual ₹160/basket** | ₹40 more per basket |

Contribution fell from ₹300 → ₹260 per basket (₹2,400 − ₹1,980 − ₹160 = ₹260). Total six-week test cost: **₹3,71,440.**
**Both customer gates passed. The delivery-cost assumption did not hold.** Would you release the ₹62 lakh now?

### What was validated and what broke? (Board discussion, 1 May 2026)
**"The gates passed. The economics changed."**

| | Original assumption | Measured delivery cost |
|---|---|---|
| Delivery / basket | ₹120 | ₹160 |
| Contribution / month | ₹300 | ₹260 |
| 12-month contribution | ₹3,600 | ₹3,120 |
| Households to repay ₹62 lakh | 1,723 | 1,988 |
| Rounded deposit threshold | 6% | **7%** |

*(Assumes a 12-month customer life — still untested; 30,000-household market; revised break-even ≈ 6.6%, rounded to 7%.)*

- **Observed deposit rate: 6.5%.** Passed the original 6% rule ✅, but **below the re-derived 7% threshold** ⚠️ (re-derived *after* the test because a measured cost changed an input).
- The margin is within sampling noise — a reason to test again, not proof of failure.
- Jaspal: *the app could improve routing.* Jivitesh: *only if households are clustered.*

**Decision: learn before committing. Do not release ₹62 lakh yet. Run a second six-week test:**
1. Six societies in one 2-km cluster.
2. Same basket offer.
3. Measure delivery cost under denser routing.

> **The MVP bought a better next decision.** What must the next test establish before you would fund the app?

---

## 8. Four MVPs to avoid

*Four ways "minimum" goes wrong.*

| # | Anti-pattern | Why it fails |
|---|---|---|
| 01 | **The thin whole product** | Every feature, badly. Nothing good enough to judge, so the result is unreadable. *(Most common.)* |
| 02 | **The polished demo** | Beautiful, impressive, answers nothing. Built to show, not to learn. |
| 03 | **The platform first** | Six weeks of foundations before anybody sees anything; the belief is still untested. *(Most expensive.)* |
| 04 | **The one that never ends** | No date, no decision rule — quietly becomes version one. |

> Better to do one thing well enough that a stranger can judge it than five things so thinly that nobody can tell whether the idea or the execution failed.

**Drill: Document your MVP.** *(Pause ~6 minutes.)*

---

## 9. Talk tech — enough fluency to stop nodding

*Not to build it. To stop nodding.* (25 min)

### You don't need to build it. You need to stop nodding.
**The cost:** every time you nod at an answer you didn't understand, a decision gets made without you — and it's a decision about what the customer gets.

**Learn to tell** when engineers:
- **state a fact**,
- **describe a trade-off**, or
- **make a craft judgement**.

*Only one of those is yours* — the trade-off.

### What actually happens when someone taps
Four boxes, three arrows: **Their phone** (app/browser) → **The network** (the request) → **Your server** (decides, writes) → **The database** (where things live).

| 01 · Where it is slow | 02 · Where it breaks | 03 · Where it costs |
|---|---|---|
| The network and the database — almost never the code in between | Anything you don't control — the payment gateway, the SMS, the map | Server and database, both metered — per user, per month, forever |

The boxes are content — the lines are where you have leverage.

### "Just" is the tell — "We'll just integrate with it"

| What people assume it means | What it actually involves |
|---|---|
| They have an API, so we can use it | Credentials, and approval to get them |
| A couple of days of plumbing | Rate limits — how many a minute, and what then |
| It will behave like our own code | Their downtime becomes your downtime, visibly |
| Once it's done, it's done | They change it on their schedule; you find out late |

None of these are technical questions — they're all product, and all yours.

### A decision made in week one, without discussion — data modelling
**One quiet assumption:** "A payment belongs to a shop." Sensible, fast to build — and it quietly decides a shop can't have two outlets, a payment can't be split, and nobody can hand over to a second owner.

Ask:
- **One or many?** Can a shop have two outlets? Can an order have two payers? Ask now, not later.
- **What changes over time?** If a price can change, last month's order needs the old price, not the current one.
- **What do you have to keep?** A payment is a record. Deleting is different from hiding — and the law may have a view.
- **What do you not store?** Everything you keep is something you must protect, explain and delete on request.

> Changing a data model after there's real data is the most expensive routine job in software.

### Buy. Glue. Build last.
1. **Buy it (default first)** — payments, SMS, maps, auth, email. Somebody solved this; it's not your product.
2. **Glue it together (the MVP answer)** — a spreadsheet, a form, an automation tool, a WhatsApp group. Perfect for an MVP; embarrassing later — a problem you earn.
3. **Build it (last resort)** — only the part that is your actual idea. If you're building what everyone else sells, ask why.

For a seven-day MVP the answer is almost always glue. You're testing a belief, not founding an engineering organisation.

### Four costs — only one of them is money
| Cost | Note |
|---|---|
| **1. Time to first version** | What everyone estimates; the only one that gets discussed |
| **2. Time to change later** | Much larger, never estimated — the reason week-one choices matter |
| **3. Money to run it** | Per user, per month, forever: servers, storage, messages, model calls |
| **4. Attention to keep alive** | Somebody has to watch it, fix it, answer the emails — usually you |

Ask it as a question, not a challenge: **"If we do it this way and we're wrong, how long does it take to undo?"** A two-day answer and a two-month answer are different products — choose between them.

### "DORA the Explorer" — four questions that change what gets built
1. **"What would it take to do half of it?"** If there's no half, it's genuinely atomic — rare. Usually there is, and nobody asked.
2. **"What are you assuming that I haven't told you?"** Flushes the spec gap before it becomes a build. The best four seconds you'll spend.
3. **"If we're wrong, how long to undo it?"** Separates a reversible choice from a one-way door. Only one needs a meeting.
4. **"What worries you about this?"** Engineers almost always know; they're usually waiting to be asked, not withholding.

None require you to understand the answer in detail. All of them change what gets built.

### Debt is a loan, not a sin
The distinction that matters isn't big vs small — it's **deliberate vs accidental**.

| Deliberate debt | Accidental debt |
|---|---|
| "We know this is the quick way." | Nobody decided; it just happened. |
| Taken on purpose, to learn sooner | Discovered later, usually under pressure |
| Written down, with a condition for paying it | Nothing written, so nobody can judge it |
| The right call for almost every MVP | The expensive kind, and the common kind |

For an MVP, deliberate debt is correct — you're buying time with future work, and may never have to repay it.

### Estimates are wrong, by everyone — three reasons and a two-line repair
**Reasons:**
1. **They estimate what they can see** — the unknown part has no size yet, so it's estimated at zero.
2. **Nobody counts the edges** — the happy path is two days; errors, empty states, permissions are the other eight.
3. **Pressure compresses it** — asked "by Friday?", the answer is yes. It's a different question.

**Repairs:**
1. **Ask for a range, not a number** — "Two days if it's like we think, two weeks if not."
2. **Then ask what decides which end** — that sentence is the real risk, and it's usually testable in an hour.

---

## 10. Prototypes — fidelity and what each proves

*Fidelity costs time, and worse, it costs commitment.* (13 min)

### Fidelity is a question, not a setting — five fidelities, five questions

| Fidelity | Question it answers | Time |
|---|---|---|
| A sentence | Does anyone recognise the problem? | 5 min |
| A storyboard | Does the story make sense in their life? | 15 min |
| Paper screens | Can they work out what to do? | 1 hour |
| Clickable mock | Does the flow hold together end to end? | An afternoon |
| Works, by hand | Does the value actually arrive? | A week |

Nobody throws away the thing they spent a week on.

### A prototype tests comprehension and usability — not desire

| A prototype CAN tell you | It CANNOT tell you |
|---|---|
| Whether they understand what it is | Whether they'd actually use it next Tuesday |
| Whether they can complete the task | Whether they'd pay for it |
| Where they hesitate, and what they expected | Whether it works at a thousand users |
| Which of two versions is less confusing | Whether you can build the real thing at all |

> A glowing prototype session and a dead product are completely compatible.

### AI prototypes, used with eyes open — "the prototype that finishes before dinner"

| What it genuinely changes | What it quietly does not change |
|---|---|
| A working thing from a description, same day | It still only proves comprehension and usability |
| Two versions instead of an argument about one | Plausible doesn't mean it would hold up |
| Non-technical teams can build something real | The hard part was never the first version |
| Throwing it away costs almost nothing | You still have to show it to five strangers |

**The fidelity went up; the evidence did not.**

### The trap with your name on it
> **A good demo is evidence about your demo.**

The room claps, the team feels validated — and nothing was learned, because everyone watching wanted it to work. Five strangers who didn't ask to be there are worth more than a hall. *Build for the second; submissions will be read that way.*

---

## 11. Measure — instrument before you build

*The thing every team skips and every team regrets.* (9 min)

### The asymmetry that decides Session 6
> **You can add a feature in week six. You cannot add week four's data.**

Logging takes an afternoon and is worthless the moment it's retrospective. Whatever you don't record this fortnight simply didn't happen. It's genuinely small: three events, an afternoon — not a data platform.

### Three events, not thirty
| Event | Meaning |
|---|---|
| **1. They arrived** | Someone new turned up — with where they came from, if you can get it |
| **2. They got the thing** | The moment the value actually landed — the match ran, the order went |
| **3. They came back** | A second time, unprompted, on a different day — the hardest to fake |

- **Each one needs a *who* and a *when*.** An anonymous counter gives a total; you need to know whether it was the same three people twice.
- **Write them as sentences first.** "A shop owner saw a completed match for the first time." Then let someone turn that into a log line.

Three events, one afternoon — the direct input to Session 6.

### State versus history

| You can get this back later (state) | This is gone forever (history) |
|---|---|
| How many users you have now | Where the first fifty people came from |
| What the product currently does | What people did before they gave up |
| Anything stored in your database as a record | Whether the second week was better than the first |
| What people say in an interview, now | Which change made the number move |

The right column is behaviour over time — it only exists if you recorded it as it happened.

---

## 12. Takeaways, homework and FAQs

### Three things to leave with
1. **An MVP is defined by the question, not the feature list.** The least work that produces a decision. If you can't name the belief, the number and the consequence, you're just building.
2. **You don't need to build it — you need to stop nodding.** Four questions do most of the work: half of it, what are you assuming, how long to undo, what worries you.
3. **Data you didn't collect is data you can't get back.** Three events, an afternoon, from day one. Session 6 is only as good as what you logged this fortnight.

*If only one survives — make it the third. It's the only one with a deadline you'll otherwise miss.*

### Before next time — three small things before Tuesday
1. **Build it — seven days, not fourteen.** The shape you picked, nothing on the out-list. If late, cut scope rather than moving the date.
2. **Put the three events in first** — before the feature, not after. An afternoon. You'll be asked about it in Session 6.
3. **Fifteen minutes in the graph** — Session 5 link: persuasion, habit, ethics.

Bring the one-page plan and whatever you built — including if it's a spreadsheet and a WhatsApp group.

### FAQs ("Floor is yours")
| Question | Answer |
|---|---|
| Can our MVP be entirely manual? | Yes — and for several of you it should be. |
| What if we can't build it in seven days? | Then you picked the wrong row on the table. Move up it. |
| Does it have to be a prototype? | Whatever answers your belief. Read your kill criterion. |
| **What if nobody uses it?** (the hard one) | That *is* a result. It arrives in week five instead of nine — which is why you wrote the consequence down in advance. |

**Closing — "Build small."** Eight ideas, then one. Draw it in five boxes, with a date on it, three events to log. Now go build the small version.

Next: **Session 5 — Persuasive Technology & Ethics.**

---

## 13. Credits

| Source | Author | Contribution |
|---|---|---|
| *The Lean Startup* | Eric Ries | The MVP as a unit of learning rather than a small product |
| *The Startup Owner's Manual* | Steve Blank & Bob Dorf | Concierge and Wizard of Oz named as legitimate methods |
| *Inspired* | Marty Cagan, SVPG | Prototypes as discovery instruments, and what each kind proves |
| "Do Things That Don't Scale" (essay, 2013) | Paul Graham | The manual version of your product — *if you read one thing*, a ten-minute read and the most persuasive argument for the concierge version |
| PM Knowledge Graph · *tech* | — | Nineteen topics written for this session; start with how web and mobile apps work |

---

## 14. Extras

### A concierge MVP, day by day
Ask three shop owners if you can try something for a week — free, manual, honest about it.
- **Monday** — ask them to send their payment screenshots at closing time.
- **Tuesday** — match them in the spreadsheet yourself; reply by 9 pm.
- **Wednesday** — same; note every case the spreadsheet couldn't handle (that list is your real spec).
- **Thursday** — same, but don't message first. See whether they send anything unprompted.
- **Friday** — ask the only question that matters: *"Shall I keep doing this next week?"*

Three yeses is a product. Three polite declines is a fortnight saved and a better idea.

### Stonewall remedy — when someone says "that's hard"
1. **"Hard how — fiddly, risky, or slow?"** Three problems, three answers: fiddly is time, risky needs a spike, slow may be fine.
2. **"What would make it easy?"** Usually a constraint you can give — one city, one language, no history, fifty users.
3. **"What's the version we could do this week?"** Scope is the lever you control.
4. **"Hard, or hard the way we've asked for it?"** Often the requirement is the expensive part. Ask it gently.

None are challenges — all are requests for information, and good engineers like being asked.

### Twenty terms you shouldn't nod through

| Term | Meaning |
|---|---|
| API | How two systems talk |
| Endpoint | One address in an API |
| Rate limit | How often you may ask |
| Webhook | They call you, not the reverse |
| Schema | The shape of your data |
| Migration | Changing shape, with data in it |
| Cache | A copy kept close, sometimes stale |
| Latency | How long the round trip takes |
| Environment | A copy of the system — dev, staging, production |
| Deploy | Moving new code into one |
| Rollback | Putting the old one back |
| Feature flag | A switch that turns it on for some people |
| Auth | Who you are |
| Permissions | What you're allowed to do |
| Token | A pass that proves you logged in |
| Idempotent | Doing it twice is safe |
| Race condition | Two things at once, wrong answer |
| Tech debt | The quick way, with interest |
| Spike | A time-boxed experiment |
| Observability | Being able to tell what's happening |

### Briefing an AI prototype properly
1. **Who it's for, in one line** — "A shop owner with two staff who takes payments on three apps." Not "a user."
2. **The one task it must support** — the flow that produces your answer.
3. **What the screen must show at rest** — including the empty state, which every new person sees.
4. **What happens when it goes wrong** — wrong input, nothing found, the other system down. Ask, or you won't get them.
5. **What not to build** — your out-list. Without it you'll be handed a settings page and a dashboard.

Same five things you'd tell a designer. The tool is faster; the brief isn't different.

### What we skipped, and where it lives (PM Knowledge Graph)
| Topic | Node | What it covers |
|---|---|---|
| Databases, storage, caching | `tech.databases` | Why a query is slow, and what it would take to fix |
| Scalability, performance | `tech.scalability` | What breaks first when usage goes up ten times |
| CI/CD, environments | `tech.cicd` | How code reaches production, and what a rollback actually is |
| Feature flags | `tech.flags` | Ship dark, ramp slowly, kill fast (Session 8 builds on it) |
| Logging & observability | `tech.observability` | Knowing something is wrong before a customer tells you |
| Infrastructure cost | `tech.cost.of.infra` | Which feature is quietly eating your margin (Session 8) |

Twelve of the nineteen tech topics aren't taught in the room — all are written at two depths, with worked cases.

### Planning the fortnight — what seven days actually looks like
| Day | Work |
|---|---|
| Day 1 | Instrumentation and the skeleton. Nothing user-visible. |
| Days 2–4 | The one flow. Only the one flow. Check the out-list every morning. |
| Day 5 | The ugly bits — empty state, the error, the way they tell you it broke. |
| Day 6 | Show it to two people not on your team. Fix only what blocked them. |
| Day 7 | Put it in front of the real five. Watch. Don't help. *(The day teams skip — the difference between having data in S6 and not.)* |

If you're behind on day four, cut from the in-list. Don't move day seven.
