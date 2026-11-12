# SWPM Session 3 — Exploring Solutions & Value Proposition

**Course:** Software Product Management (SWPM) · ISB Hyderabad
**Instructor:** Chandrashekhar V
**Date:** 26 October 2026
**Source deck:** `SWPM_Session_3___Exploring_Solutions___Value_Proposition.pdf` (73 slides)

---

## Contents

1. [Opening: check-in & news of the day](#1-opening-check-in--news-of-the-day)
2. [Course map — where each session leaves you](#2-course-map--where-each-session-leaves-you)
3. [Framework: Jobs to be Done (JTBD)](#3-framework-jobs-to-be-done-jtbd)
4. [Explode, then reduce — the goal of today](#4-explode-then-reduce--the-goal-of-today)
5. [Diverge](#5-diverge)
6. [Case study: Vaikhari Kitchens](#6-case-study-vaikhari-kitchens)
7. [Crazy 8s / How Might We](#7-crazy-8s--how-might-we)
8. [Converge — choosing without the loudest voice](#8-converge--choosing-without-the-loudest-voice)
9. [The hypothesis template](#9-the-hypothesis-template)
10. [UX, briefly](#10-ux-briefly)
11. [Validate — find the one that would end it](#11-validate--find-the-one-that-would-end-it)
12. [Quick reference](#12-quick-reference)

---

## 1. Opening: check-in & news of the day

- **"How are you doing now?"** — check-in using the Hoffman Institute *Feelings List* (feelings grouped as accepting/open, angry/annoyed, connected/loving, disconnected/numb, embarrassed/shame, fear, grateful, guilt, hopeful, powerless, tender, stressed/tense, unsettled/doubt, plus body sensations).
- **News today — Microsoft:** Forbes report that Microsoft offered buyout packages to a large share of its workforce (headline "Microsoft Offers Buyouts To 25% Of Company"), shown alongside a Bloomberg chart *"Microsoft headcount flattened as revenue exploded"* (employee growth vs revenue growth since 2007). A LinkedIn post discussed which levels (Level 70 and below) were in scope — the point being it's not just junior roles; experienced, highly compensated technical and management talent is affected as AI infrastructure spending continues.
- **News today — Anthropic IPO:** charts discussed in class —
  - Anthropic's revenue grew ~31× in five quarters.
  - Customers spending $100K+ a year rose sharply.
  - Compute cost per $1 of revenue fell quarter on quarter.
  - Operating margin moved from deeply negative to turning positive.
  - Share of revenue from the top 5 customers fell (concentration decreasing).

---

## 2. Course map — where each session leaves you

*"The sentence, not the syllabus."*

| # | Session | The sentence |
|---|---|---|
| 1 | Intro to Product Management | Accountable for an outcome in a system you do not control. |
| 2 | Customer & Problem Discovery | Ask about the past. A problem is not a missing feature. |
| 3 | Solutions & Value Proposition | Eight ideas, then one. Value is what stops hurting. |
| 4 | Minimum Viable Product | The smallest thing that answers your riskiest question. |
| 5 | Persuasive Tech & Ethics | Why they come back — and where that turns into manipulation. |
| 6 | Metrics & Experiments | One number, three inputs, and a counter-metric. |
| 7 | Execution & the PM Role | Shipping with people who do not report to you. |
| 8 | Strategy, GTM & Monetisation | What you are compared to, and what they pay. |
| 9 | Product Analytics | A chart tells you where. It never tells you why. |
| 10 | AI & PM | If you cannot write the eval, you have not specified it. |

### Where we are on the six-phase spine
**Persona** (S1–S2, who specifically) → **Problem** (S2, what hurts and how much) → **Proposal** (S3–S4, *YOU ARE HERE* — what you would build, framed; S4 = MVP & prototype) → **Persuade** (S5, why they come, & ethics) → **Priority** (S6–S7, what first, what never) → **Plan** (S8–S10, how it reaches people & pays).

> A weak problem surfaces much later — usually around S6/S7, when nothing persuades. Today's job is to keep that from happening.

---

## 3. Framework: Jobs to be Done (JTBD)

**People do not buy products. They hire them to do a job.**
(Christensen, Ulwick & Bob Moesta — "read with care.")

### Theory 1 — People hire products. Then they fire them.
- **Hiring:** a small daily ritual, on tap. They let the product into the day; it has to do its job — and it outsells whatever does it worse.
- **Firing:** slow, rude or broken? It's gone the same week. The customer doesn't owe you another chance.

> Demographics are a label. The job is what you actually have to win.

### Theory 2 — Define the job, not the customer
- **What you usually say:** "Our customer is a 28-year-old Tier-2 male." — a label; says nothing about what the product has to do.
- **What you should say:** "**When** X, **I want to** Y, **so I can** Z." — a situation, a motive, an outcome. *Who* is irrelevant; *what for* is everything.

> Customers change. Jobs outlast the customer — and that is what you build against.

### Theory 3 — The job statement format
**When** *[situation]*, **I want to** *[motivation]*, **so I can** *[outcome]*.

| Situation | Motivation | Outcome |
|---|---|---|
| Where they are, what just happened | What they are trying to do | What better looks like, in their hands |

Not a tagline, not a value prop — a working sentence you can disagree with. A team that can't finish this sentence for its own product hasn't found the job yet.

### Theory 4 — Three jobs in one (dimensions)
Hired for one; returns for three at once.

| Functional | Emotional | Social |
|---|---|---|
| The task itself — get there, get a meal, send the money, find the file | How it has to feel — less anxious, less embarrassed, in control. Without it, the functional job fails | How others see it — what the family/colleagues think; the version of the user the product lets them be in public |

A cheap functional answer that ignores the emotional and social jobs loses anyway.

### Four Indian cases

**01 · Morning ritual — "The first ten minutes of the day, hired out to an app."**
- **Job:** When the alarm rings, I want warmth and wakefulness without effort, so the day begins in three minutes — without leaving the house.
- **Old way:** walk to the corner stall (8 min one-way); brew at home (15 min, dishes after); skip the ritual (the day drags).
- **App version (Swiggy, Blinkit):** cutting chai or filter coffee ordered at 7:02, in hand by 7:14.
- **Insight:** *The job was not tea. The job was the day, starting without effort.*

**02 · The late ride home — "A known route home, booked at 22:08."**
- **Job:** When I shut my laptop at 10 pm, I want a known fare, ETA and driver — so I don't have to solve logistics while tired.
- **Old way:** wave one down at the kerb (he refuses long trips); accept whatever shows up and watch the meter; call relatives to collect you.
- **App version (Ola, Uber, Namma Yatri, Rapido):** fare quoted before the car arrives, ETA on the map. Namma Yatri adds no surge, metered only — "closer to dignity than to a deal."
- **Insight:** *The job was not a vehicle. The job was home, without negotiating it.*

**03 · Six of us, one bill — "Six friends, one bill, settled at the table."**
- **Job:** When we finish at the dhaba, I want the meal closed now, in front of everyone, so nobody keeps score into Monday morning.
- **Old way:** one pays and others owe "later"; find an ATM and make change; PhonePe in the morning (half forget, half feel stiffed); split unevenly, quietly, badly.
- **App version (GPay, PhonePe, Paytm, Splitwise):** each scans, types ₹90, done in ninety seconds; PhonePe's request-money fires prompts for you.
- **Insight:** *The job was not moving money. The job was closing the meal.*

**04 · Fever at 23:07 — "An answer in fifteen minutes."**
- **Job:** When my daughter is burning at 11 pm, I want a paediatric-trusted answer in fifteen minutes — so I'm not guessing alone in the dark.
- **Old way:** wake her and drive half-asleep to a paediatric ER; poll three parenting WhatsApp groups; give a half-remembered syrup; wait till morning with Crocin and hope.
- **App version (1mg, PharmEasy, Apollo 24/7, Practo):** a paediatrician on chat in two minutes (Apollo 24/7); the named brand delivered in thirty (1mg).
- **Insight:** *The job was not medicine. The job was stopping the panic, alone.*

Reading: *Know Your Customers' "Jobs to Be Done"* (HBR, Christensen et al.). Related nodes are in the PM Knowledge Graph.

### What JTBD changes
1. **You stop arguing about features** — you argue about the job, and that argument has a winner.
2. **Your competitive set rewrites itself** — stall chai competes with *skipping*, not cold brew.
3. **You start listening for it** — in interviews, ask "what were you trying to get done?" before "what do you use?"

> The framework is not a personality test. It is a sentence you can disagree with, followed by a product smarter for it.

---

## 4. Explode, then reduce — the goal of today

> **More solutions than you need. Then one, with written reasons.**

Today is not "pick a feature to ship." It's about generating more options than you can finish, narrowing to one, and writing the reason down so someone else can check it.

| Eight solutions | One value proposition |
|---|---|
| Generate faster than taste. Crazy 8s count — the good ones show up around idea five. | One sentence, specific enough to be wrong: who it helps, what job, what pain it lifts, what gain it enables. |

### Ways of exploding possibilities

| Tool | What it is | Origin |
|---|---|---|
| **Brainstorming** | A group session producing options under a rule of deferred judgement | Alex Osborn, advertising executive at BBDO; described in *Applied Imagination* (1953) |
| **Crazy 8s** | Eight rough sketches of eight different ideas, one minute each, drawn alone | Associated with Jake Knapp at Google and Google Ventures; set out in *Sprint* (2016) |
| **How Might We (HMW)** | A question that frames a problem so that it invites answers without containing one | Usually credited to Min Basadur at Procter & Gamble in the 1970s; spread by IDEO and Stanford's d.school |

**Joint development & context** — the team works from a shared drive (product, research, engineering, design, operations, marketing, legal, finance, customer experience, sales folders), so ideation happens with shared context rather than in silos.

---

## 5. Diverge

*Open wider than feels safe. Quietly, on paper.* (22 min)

### "If I had asked people what they wanted, they would have said a faster horse."
— attributed, loosely, to Henry Ford.
> **Customers are problem experts, solution amateurs.**

### Three lessons from the faster horse
1. **The first idea is rarely the right one.** It's usually the most familiar — closest to the symptom. The job is to outlast it.
2. **Customers can't ask for what doesn't exist.** They know the pain deeply; they have no opinion on how to fix it — and that's correct.
3. **Job > solution.** Compare the job your customer is trying to get done to the one Ford solved.

Most of your first three ideas are variants of "faster horse."

### Why teams stop at idea one
"Generation feels like delay. It is the only antidote. Anchor this, or it owns you."
1. **They had it already** — the first idea feels earned, not generated; naming it feels like work to celebrate.
2. **Generating looks like delay** — three more sheets of paper look like "we haven't started." Eight sheets is the only defence.
3. **Someone said it first** — anchoring runs in three seconds. Force silent, individual, timed generation to defeat it.
4. **Ownership** — about ninety seconds in, it stops feeling like a draft. Generator and idea become the same person, so critique of one feels like critique of the other. A timer prevents that.

**Defence is procedural:** HMW format, visible timer, five lenses, silent individual first pass.

---

## 6. Case study: Vaikhari Kitchens

*(In the PM Knowledge Graph — Practitioners section.)*

### The business
**Vaikhari Kitchens — weekday lunch, on subscription.** Cooked in two kitchens, delivered by bike, lunch for the working week. Cities: Bengaluru + Hyderabad. Average subscription ₹3,500/month.

### The churn problem — 1,240 subscribers lapsed in three months
- **9,300** active subscribers on 1 Oct 2025.
- **1,240 lapsed** (13.3% of the starting cohort) by 31 Dec 2025. *Lapsed = 30 days without an order.*
- **41 of 60** lapsed subscribers interviewed cited **repetitive meals** (68.3% of interviewees, Jan–Feb 2026). "By about week three, meals felt repetitive."
- **₹43.4 lakh** in monthly billings represented by lapsed subscribers (1,240 × ₹3,500).

### The characters
| Person | Role | Part in the story |
|---|---|---|
| Harshil Fakhri | Chief Executive | Proposes "Thali Remix" |
| Gunita Fadnis | Head of Product | Leads the decision and ideation session |
| Hetansh Fatnani | Design Lead | Joins the ideation session |
| Gulbahar Faldu | Operations, Hyderabad kitchen | Brings the kitchen and cost perspective |
| Hemlin Fidai | Researcher, Singapore (joins remotely) | Interviewed 60 lapsed subscribers |
| Two engineers | Engineering team | Join the six-person ideation session |

Tuesday's ideation group: Gunita, Hetansh, Gulbahar, Hemlin and two engineers.

### The HiPPO in the room — "Thali Remix"
CEO Harshil's suggestion: refresh recipes so weekday lunches feel less repetitive — a recipe-refresh feature inspired by his own cooking. **Proposed build cost: ₹26 lakh.**
- Illustrative rotation: Week 1 dal tadka, jeera rice, aloo gobi, roti → Week 2 rajma, steamed rice, bhindi, roti → Week 3 chole, peas pulao, cabbage sabzi, roti (rotate the main dish, vary the sides, refresh rice preparations).
- **Hypothesis:** more recipe variety could make lunches feel less repetitive. *Impact on retention remains untested.*

### Gunita's predicament — "A real problem. One proposed answer. A decision due Thursday."
- **The problem is real:** 1,240 lapsed (13.3%); ₹43.4 lakh/month in billings.
- **Only one proposal:** Thali Remix — CEO-backed, ₹26 lakh to build; no different solution proposed yet.
- **One scarce engineering slot:** six engineers, six weeks, starting 13 April. If it fails to reduce lapses, the next free slot is in June.
- Timeline: Mon 9 March (one option) → Thu 12 March (decision due).
- **The question:** *"Have we generated enough alternatives to be allowed to choose?"* The risk: committing to the first answer before exploring different ways to solve the problem.

---

## 7. Crazy 8s / How Might We

**Fold A4 into eight. Eight ideas in eight minutes.**

**Rules:** Silent. Individual. Timed. One minute per cell. Sketches only — not explanations. Skipping is allowed; perfection is not.

**What this buys you:** Eight isn't the point; *volume* is. The interesting ideas show up around five — after the obvious ones have left the room.

### Illustrative example (one person's sheet)
1. Menu rotation · 2. Skip-a-day swap · 3. Office group order · 4. Half-portion pack · 5. Taste feedback loop · 6. Late-slot delivery · 7. Regional theme week · 8. Chef-pick surprise
*(8 panels × 1 minute = 8 minutes per person.)*

### Gunita's ideation workshop (Tuesday 10 March 2026 · six participants · explore before choosing)
HMW: **"How might we make the fifteenth lunch feel as considered as the first?"**
1. **Frame** — agree the question.
2. **Sketch alone** — 8 ideas × 1 minute each.
3. **Share & cluster** — merge duplicates, group by mechanism.
4. **Check breadth, then vote** — six mechanisms, three dots each.

Result: **48 sketches → 36 distinct ideas → 6 mechanisms.** Defer judgement while generating; dot votes show enthusiasm, not proof.

### Worked example — six people × 8 sketches = 48; after merging duplicates, 36 distinct ideas

| Mechanism | Distinct ideas |
|---|---|
| Menu variety and rotation | 9 |
| Schedule flexibility (skip, swap, pause) | 8 |
| Portion, price and bundle | 6 |
| Social and office ordering | 5 |
| Delivery timing and packaging | 4 |
| Taste personalisation | 4 |
| **Total** | **36** |

*(In-class exercise: Crazy 8s / HMW, 8 min 6 sec.)*

---

## 8. Converge — choosing without the loudest voice

*Forty ideas down to one — written specifically enough to be wrong.* (20 min)

### Cluster. Score against criteria. Dot-vote.
**Criteria are written first; options seen later. The other way round is theatre.**

| Step | Action | Detail |
|---|---|---|
| 01 | **Cluster silently** | Without labels. By what each cell *does*, not what it is. Themes emerge; don't pre-name them. |
| 02 | **Write criteria first** | e.g. Saves Saturday's pain. Reaches. Testable by Session 4. Requires no habit change. |
| 03 | **Two dots each** | Stack them on one if you must. You may not vote on your own. Read why losers lost before you leave. |
| 04 | **One winner** | Ties walk both into the canvas; narrow there. Then one, with reasons — written. |

> "Criteria set after you have seen the options are not criteria — they're rationalisations."

### Vaikhari, step by step

**Share & cluster** — group by how an idea *changes behaviour*, not by how it's worded. 48 raw sketches → merge duplicates → 36 distinct ideas → 6 mechanisms:
1. **Menu variety & rotation** (9 ideas) — change what the customer eats: menu rotation, regional theme week, chef-pick surprise.
2. **Schedule flexibility** (8) — change when the subscription is used: skip-a-day swap, swap-a-meal, pause subscription.
3. **Portion, price & bundle** (6) — change quantity or value: half-portion pack, portion options, meal bundles.
4. **Social & office ordering** (5) — change how people order together: office group order, shared office order.
5. **Delivery timing & packaging** (4) — change when and how lunch arrives: late-slot delivery, packaging options.
6. **Taste personalisation** (4) — adapt meals using taste information: taste feedback loop, taste preferences.

> **Different wording is not a different mechanism.** Menu rotation, regional weeks and chef surprises differ as ideas, but all work through variety.

**Is the search broad enough? Count new *mechanisms*, not just new ideas.**
- By sketch 5: 24 distinct ideas, 6 mechanisms.
- Sketches 6–8: +12 ideas, +0 mechanisms.
- After sketch 8: 36 distinct ideas, 6 mechanisms.
- New ideas continued; new mechanisms stopped. **Takeaway:** enough breadth to shortlist — not proof that all ideas are exhausted.

**Dot vote — 6 people × 3 dots = 18 votes**

| Mechanism | Distinct ideas | Votes |
|---|---|---|
| Menu variety & rotation | 9 | 7 |
| Schedule flexibility | 8 | 5 |
| Portion, price & bundle | 6 | 2 |
| Social & office ordering | 5 | 2 |
| Delivery timing & packaging | 4 | 1 |
| Taste personalisation | 4 | 1 |
| **Total** | **36** | **18** |

Variety: 25% of ideas, 38.9% of votes. *Votes reveal preference — not evidence of impact.* **Do not let a dot vote become a build decision.**

**Compare on explicit criteria**
- **Reach** — share of lapsed subscribers addressed.
- **Save rate** — share reached who would be retained.
- **Cost** — full-feature build and run cost.
- **Retained = 1,240 × reach × save rate**; **Efficiency = retained ÷ cost in ₹ lakh.** (Reach and save rates are assumptions.)

| Concept | Reach | Save rate | Cost (₹ lakh) | Retained | Retained per ₹ lakh |
|---|---|---|---|---|---|
| A. Regional menu weeks | 70% | 10% | 4 | 86.8 | 21.7 |
| B. Swap-a-meal | 45% | 15% | 9 | 83.7 | 9.3 |
| C. Office group ordering | 20% | 30% | 14 | 74.4 | 5.3 |

*Expected-value screen, not a forecast.*

**Stress-test the favourite — one uncertain assumption can change the ranking.**
- Original screen — A: Regional menu weeks at 10% save rate → 86.8 retained → 21.7 per ₹ lakh → **A leads**.
- Lower save-rate scenario — A at 4% save rate: 1,240 × 70% × 4% = 34.7 retained → 34.7 ÷ ₹4 lakh ≈ 8.7 per ₹ lakh → **B now leads** (B: Swap-a-meal stays at 9.3 per ₹ lakh at 15% save rate).
- **Threshold:** A needs a save rate above about 4.3% to beat B.
- **Takeaway:** which unmeasured number would flip your favourite? *(Scenario analysis, not an observed test result.)*

**Keep a shortlist across mechanisms — preserve two different ways to address the problem.**
- **A. Regional menu weeks** — mechanism: menu variety; ₹4 lakh full-feature build cost.
- **B. Swap-a-meal** — mechanism: schedule flexibility; ₹9 lakh full-feature build cost.
- **Proposed next step:** two parallel two-week **fake-door tests**; measure reach and save rate. (Build costs shown are not test budgets.) The shortlist spans mechanisms, so a change in evidence has somewhere to land.
- **Choose using measured retained subscribers per ₹ lakh of build cost.**

---

## 9. The hypothesis template

**One sentence, written before any idea. If you can't fill it in, the problem isn't ready.**

> **We believe** *[a concept or capability]* **will solve** *[the Saturday problem]* **for** *[this one customer]* **while they are** *[doing this job]*.

| Rule | Detail |
|---|---|
| **Tie it to Session 2's definition of PROBLEM** | If it doesn't reference the problem from S2, it isn't yet a hypothesis — it's a feature. |
| **Make it falsifiable** | Bin abstractions and tautologies. If swapping the customer doesn't break it, the hypothesis is generic. |
| **One of eight** | You'll write eight. Pick the strongest as your drill sheet; keep the others as alternatives. |

---

## 10. UX, briefly

*Design is the work, not the styling of it. And your judgement runs the room.* (15 min)

### What UX actually means — the shape of the work, not its skin
UX is texture, copy, defaults and order — not the colour.
1. **Step count** — not the happy path; the real one, with the OTP and the two permission taps almost no one finishes.
2. **The critical flow** — the one path the business lives or dies by. Define it before anything else.
3. **Error behaviour** — what it does when wrong; the option most screens never draw because nobody asked.
4. **Onboarding** — the first ninety seconds, where people leave without telling you.

Visual style is the last layer. If you can't say why a step exists, the layer before it is broken.

### Where your judgement actually lives — two edges, a wide middle
| Your judgement STOPS where | Your judgement STARTS where |
|---|---|
| Visual design, illustration, motion | Steps, copy, defaults, errors |
| You don't pick the colours, typeface or icon style. A designer does; you don't override by taste — learn what they decided and live with it. | What the screen needs the user to do, in what order. Which error path, which defaults, which words — yours or theirs. |

> **Most screens get reviewed like paintings. Review yours like promises.**

### Story before screens — the journey, not the screen
A screen is one frame of a film. Build the film first.
01 **Trigger** — a customer notices X → 02 **Look** — they go look for help → 03 **Try** — first attempt → 04 **Stuck** — where it falls apart → 05 **Or** — workaround (the cousin) → 06 **Your screen lives here.**

A screen designed in isolation is optimised for one happy customer on their best day; most don't live there. *Map the journey before you draw the screen — the map is the design.*

### Rule of thumb — count, then remove three
- **What you draw first:** the real path, including log-in, OTP, permission prompt and the two taps almost no one finishes. Count the steps; write the number down.
- **What you remove: −3.** Any three, even if each felt essential.
- If a step ends in a tap that doesn't change anything, it ends here. *Useful* is the test, not *necessary*.

### Six checks on every screen (five minutes, before critique)
1. **A stranger can use it cold** — no callbacks, no jargon, no demo.
2. **The error path is drawn** — and it isn't a dead end.
3. **A step's purpose is visible** — if you can't say it, remove it.
4. **The defaults favour the user** — not the house, not your team.
5. **Copy is what they would say** — read it aloud; rewrite every word that jars.
6. **The next step is obvious** — if it isn't, the screen asks something.

### The cheapest usability tool — watch five people use it
Think-aloud. Forty minutes. The fastest usability method there is.
- **Why five:** three shows you the "you" problem; five catches the layout traps. After that, diminishing returns — until you have new ideas.
- **Rules:** don't help, don't explain. Note only where they hesitate, tap wrong or give up. They aren't being tested — the product is.
- Two hours, not four weeks — and it finds more than a focus group of twenty.

### Two things that aren't decoration — defaults & empty states
- **Defaults** — what shows when no one has chosen yet. Pick the option that benefits the user, not the house. *A default is a decision, repeated a million times.*
- **Empty states** — the screen with no data yet. Tell users what they're looking at, why it's empty, and the one thing they can do next. *Empty is honest — missing is unkind.*

Don't ship without one of each.

### Critique without designing — replace "make it better" with a concern

| Instructions (less useful) | Concerns (useful) |
|---|---|
| "Make it more intuitive." | "I couldn't find the close button on a 13" screen." |
| "Add a settings panel." | "It asked three things in a row before I knew why." |
| "Use a different colour." | "Half of 'save' lives in two places." |

Designers hear the left column and leave the room. PMs who do the right column keep designers. Bring evidence, not opinion — walk someone through what they tapped.

### Vaikhari UX concepts — Simple vs High cognitive load
For each of the six mechanisms, two illustrative app screens compare effort, clarity and control:

| Mechanism | A · Simple | B · High cognitive load |
|---|---|---|
| Menu variety | "Your lunches next week" — pick one option per day | "Configure your lunch menu" — many filters, cuisines, spice, exclusions |
| Schedule flexibility | "Manage your meals" — tap a day to skip; credit stays in balance | "Schedule preferences" — rules, recurring skips, credit handling, exceptions |
| Portions & bundles | "Choose your portion" — Regular or Small | Per-day, per-component portion grid with bundles |
| Office group ordering | "Join the office lunch" — pick your dish, deliver with the office order | Full group order setup — team, location, cut-offs, approvals, split billing |
| Delivery & packaging | "When should lunch arrive?" — two time windows | Delivery windows, addresses, packaging and instructions on one form |
| Taste personalisation | "Make lunch more you" — spice level + dislikes | Full taste & flavour profile with many sliders and toggles |

The lesson: the same mechanism can be delivered with radically different effort for the user — keep the critical flow simple.

---

## 11. Validate — find the one that would end it

*Find the one that would end it — then run that one.* (14 min)

### Four kinds of failure (Marty Cagan's four risks)
**Test only the riskiest. Don't test all four at once — you'll learn nothing.**

| Failure | Note | Detail |
|---|---|---|
| **01 · Value** | Kills most student projects | Nobody wants this — in a way that survives contact with their day |
| **02 · Usability** | Cheapest failure to find | Only resolved by watching — five people, think-aloud, forty minutes |
| **03 · Feasibility** | Over-estimated by non-technical teams | Fix: a time-boxed spike, before you promise a date |
| **04 · Viability** | Session 8 | You can build it, you can use it, you can't sell it. We get there later |

The riskiest one gets an experiment; the other three get appointments.

### Find the riskiest assumption — eight or nine assumptions, one you test

|  | Low confidence | High confidence |
|---|---|---|
| **Fatal if wrong** | **TEST THIS ONE** — low confidence + fatal | Already covered — likely fatal, high confidence |
| **Not fatal** | Don't bother — cheap to learn later | Safe · building — confident it works, ship it |

Rule of thumb: list 8–9, then pick one. It's almost always about the **customer**. Test only if the answer is unknown *and* would change course; otherwise you've spent the time.

> If you can't name what would kill the project, you haven't thought hard enough about what would matter.

### The evidence ladder — said, did, paid
Each rung costs more than the last. Aim for the highest true answer.

| Rung | Evidence | Weight |
|---|---|---|
| 01 | They said they liked it | Worth nothing by itself |
| 02 | They said they'd use it | Better — still cheap |
| 03 | They gave time | |
| 04 | They gave data or contacts | |
| 05 | They paid — or pre-paid | Strongest |

Read your submission on it: what rung is your evidence at? A survey at rung 02 is weaker than five paying users at rung 05. **A "yes" at rung 05 outweighs a hundred nods at rung 01.**

### Match the risk to the test

| Risk | Test | Time |
|---|---|---|
| **Value** | Concept test with five people — they tell you if they recognise themselves | 2 h |
| **Usability** | Watch five people think-aloud — learn more than a focus group of twenty | 2 h |
| **Won't pay** | Price conversation, pre-order, the morning post | ½ day |
| **Findability** | Landing page, paper poster, a flyer at the counter | 1 day |
| **Feasibility** | Spike — time-boxed. If it can't work in two days, name the constraint | 2 days |
| **Impossible work** | Concierge for three customers — last resort; the truth is what they actually do | 1 week |

(A script for the solution interview lives in the extras at the back of the deck.)

---

## 12. Quick reference

- **JTBD statement:** When *[situation]*, I want to *[motivation]*, so I can *[outcome]*. Consider functional, emotional and social jobs.
- **Diverge:** silent, individual, timed (Crazy 8s, HMW). Good ideas arrive around #5.
- **Converge:** cluster by mechanism → criteria first → dot vote (preference, not evidence) → explicit expected-value screen → stress-test → keep a shortlist across mechanisms → test.
- **Hypothesis:** We believe [concept] will solve [problem] for [customer] while they are [doing job].
- **UX:** review screens like promises; count steps, remove three; draw the error path; defaults favour the user; test with five people.
- **Validate:** pick the riskiest (low confidence + fatal) assumption; climb the said → did → paid ladder; match the test to the risk.
