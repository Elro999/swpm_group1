# SWPM Session 7 — Product Metrics & Analytics (Continued)

*What to count. What to leave uncounted. And the data you must build, before you need it.*

**Course:** Software Product Management (SWPM) · ISB Hyderabad
**Instructor:** Chandrashekhar V
**Date:** 10 November 2026
**Source deck:** `SWPM_Session_7_Product_Metrics - Continued.pdf` (47 slides)

---

## Contents

1. [Quick recap of Session 6](#1-quick-recap-of-session-6)
2. [Today's focus — five questions, by difficulty](#2-todays-focus--five-questions-by-difficulty)
3. [Section 01 — Instrumentation & data capture (recap)](#3-section-01--instrumentation--data-capture-recap)
4. [Section 02 — Funnels](#4-section-02--funnels)
5. [Section 03 — Activation: the first moment of value](#5-section-03--activation-the-first-moment-of-value)
6. [Section 04 — Cohorts](#6-section-04--cohorts)
7. [Feature adoption — which of the things you built actually matter](#7-feature-adoption--which-of-the-things-you-built-actually-matter)
8. [Section 05 — Troubleshooting: something moved, now what?](#8-section-05--troubleshooting-something-moved-now-what)
9. [Going deeper — frameworks (reference)](#9-going-deeper--frameworks-reference)
10. [Section 07 — PM competencies, titles & bands](#10-section-07--pm-competencies-titles--bands)

---

## 1. Quick recap of Session 6

- Introduction to metrics; characteristics of a good/bad metric; vanity metrics.
- Metrics are always a **proxy** for what you actually care about.
- Metrics from first principles — **GAME** (Goals → Actions → Metrics → Evaluate).
- **North Star Metrics** — what is your product optimising for?
- Gotchas around metrics (Goodhart's law, counter-metrics, dashboards that disagree).

---

## 2. Today's focus — five questions, by difficulty

*Funnels, activation, cohorts, adoption and cause — in order of how hard the question is.*

| # | Topic | Question | What it gives you | Difficulty |
|---|---|---|---|---|
| 01 | **Funnels** | Where do users leave? | The foundational baseline question everyone starts with | Easiest |
| 02 | **Activation** | Did they get value? | How long it took, and how many never got there | Moderate |
| 03 | **Cohorts** | Did anyone stay? | Retention curves over time — honest signals | Challenging |
| 04 | **Adoption** | Are features used? | Depth and breadth of usage across segments | Complex |
| 05 | **Cause** | Why did it change? | Root-cause analysis requiring judgement beyond data | Hardest |

From straightforward quantitative tracking → nuanced qualitative root-cause synthesis.

---

## 3. Section 01 — Instrumentation & data capture (recap)

### Everything is three objects
| 01 · Events | 02 · Properties | 03 · Identity |
|---|---|---|
| Something happened, at a moment in time — verbs in the past tense, always (e.g. `order_placed`, `hp_widget_type`) | The details attached — adjectives that let you segment (e.g. `city · payment_method`, `pet_care`) | Who did it, stitched across logins — `user_id · anon_id`, the thread that says "same person" |

**Identity is where most pain lives:** unless someone stitches `anon_id` to `user_id`, the whole pre-sign-up journey is lost. Mixpanel, Amplitude, PostHog — same model, different names.

### Name events once, properly
- **Chaos:** `Order Placed` · `order-placed` · `placedOrder` — three names for one action; funnels silently wrong. Avoid `clicked_button_3`, `user_did_thing`.
- **Convention:** `object_action` · lower case · past tense (`order_placed`, `payment_failed`). One name, agreed, written down; new events need sign-off.

### The tracking spec — a PM writes this

| Event | Fires when | Properties | Feeds which metric |
|---|---|---|---|
| `signup_completed` | Account created and verified | `source · device · city` | Breadth |
| `first_order_placed` | First-ever order confirmed | `minutes_since_signup · basket_size` | Time to first value |
| `order_placed` | Payment confirmed, not on tap | `items · city · entry_point · is_reorder` | North Star |
| `payment_failed` | Gateway returns a failure | `failure_reason · attempt_number` | Counter-metric |

If an event doesn't feed a metric, ask why you're capturing it. If a metric has no event, you can't compute it.

---

## 4. Section 02 — Funnels

> **No matter how useful or lucrative your product is, you will have drop-off.**

### Illustrative funnel — a quick-commerce checkout, one week

| Step | Users | Drop from previous |
|---|---|---|
| 1. Opened the app | 8,400 | — |
| 2. Added to basket | 3,100 | −63% |
| 3. Reached address screen | 2,700 | −13% |
| 4. Reached payment | 900 | **−67%** |
| 5. Order placed | 740 | −18% |

**Critical insight:** two-thirds of people who reached the address step didn't reach payment. That's not a conversion problem — it's **address-entry friction**.

### Case: the funnel for Dolo365 — diagnostics / health

| Step | Users | Step conversion | Absolute drop |
|---|---|---|---|
| 1. Opens app | 100,000 | — | — |
| 2. Searches a test | 70,000 | 70% | 30,000 |
| 3. Views a specific test | 52,500 | 75% | 17,500 |
| 4. Adds to cart | 21,000 | **40%** | **31,500** |
| 5. Completes address & slot | 15,750 | 75% | 5,250 |
| 6. Completes payment | 11,025 | 70% | 4,725 |

### The nuances of reading a funnel
- **Percentage vs absolute loss.** Conversion rate and the number of people a step costs are different questions. Prioritising by the scarier-looking percentage, rather than by the largest absolute loss (or loss × value), routinely sends teams to fix the wrong step.
- **Definitions decide the answer.** Whether "viewed a test" means a page load, a three-second dwell or a scroll past the price changes every downstream percentage; two analysts can produce two defensibly different funnels from the same behaviour.
- **Drop-off blends intenders and browsers.** Those "lost" at a step include people who tried and failed alongside people who never meant to continue — a price-comparer checking Paidan against Tata 1mg was never going to buy this session — and the funnel can't separate the two.
- **Time windows can manufacture leaks.** A journey that naturally spans two days shows huge drop-off in a single-session window — not because anyone abandoned, but because the analyst's clock ran out before the user's did.
- **Mixed cohorts hide the real leak.** Combining first-time and repeat users, or app and mobile-web traffic, can average away a severe leak in one segment against a healthy rate in another.
- **A rate is *where*, never *why*.** The funnel can say with confidence that 31,500 people stopped between viewing and adding to cart; it can't say whether price, a slow page or a distrusted payment method deterred them. That needs session recordings, exit surveys or usability sessions — and a guessed cause is often the wrong one.

### What a funnel cannot tell you
| Why anyone left | Whether the step should exist | Who the leavers were |
|---|---|---|
| It locates the door they walked out of; it has nothing to say about what was on the other side | A step with a huge drop might simply be a step you should delete | Until you segment, the funnel is an average of people with nothing in common |

> Five interviews with people who dropped will explain what five million events only located. You already know how to run that interview (Session 2) — the funnel just tells you who to call.

---

## 5. Section 03 — Activation: the first moment of value

### Did they ever get value?

| Sign-up is NOT activation | The activation event |
|---|---|
| Creating an account is paperwork — the cost the user pays, not the value they get | The core action that delivers value: first order placed, first ride completed. Every product has a moment after which the point lands |

**Measure two things:** what share get there, and **how long it takes**.

> **Time to first value** is the number almost nobody measures and everybody could fix.

Founders never see their own onboarding — they have seeded data, saved addresses and a mental model. *Open your product in an incognito window tonight and time yourself from landing page to the moment it's useful. It's almost always worse than you think.*

### Activation case study — Kansya Pay (a bank-linked fintech app)
*"From a rewarded sign-up to a reason to return."* (Concept illustration based on the supplied case, 6 February 2024.)

1. **Meet Kansya Pay** — Meher Kohli, Head of Growth, asks: *How do we turn new sign-ups into lasting users?*
2. **Getting started** — sign up → complete KYC → link bank account. **61%** of new sign-ups complete KYC; **88%** of KYC-complete users link a bank account. Both rates steady for two quarters.
3. **The referral offer** — cricket-season campaign: **₹50 for you + ₹50 for your friend** when a friend joins.
4. **More people arrive** — **+41%** downloads month over month; the referral campaign is bringing people in.
5. **…but fewer stay** — people finish onboarding, yet still leave: **30-day retention fell from 19% → 14%**.
6. **The missing moment: activation** — *which action separates users who stay from users who churn?* Onboarding → **first real value** → return. Activation is the moment a user experiences the product's value; the action was still to be discovered.

**Testing a candidate activation event:** Meher pulled 4,000 sign-ups from November 2023 and tested "completed a peer-to-peer transfer of ₹100 or more within 72 hours." Of the 4,000, 1,240 met that condition (31%) and 2,760 didn't. She checked day 25–35 retention in each group:

| Group | Sign-ups | Retained (days 25–35) | Retention rate |
|---|---|---|---|
| Transferred ≥ ₹100 within 72 hrs | 1,240 | 521 | **42.0%** |
| Did not | 2,760 | 235 | **8.5%** |
| All sign-ups (blended) | 4,000 | 756 | 18.9% |

**Takeaway:** a ~5× retention gap points to "first P2P transfer of ₹100+ within 72 hours" as a strong candidate activation event. The referral campaign grew the top of the funnel but didn't move people to that moment — so growth should focus on getting new users to first real value, not just through sign-up and KYC. (Correlation, not yet proof of cause — it's a hypothesis to test.)

---

## 6. Section 04 — Cohorts

### The idea
A **cohort** is a group of users who share a starting point in time — typically the week or month they signed up, made their first purchase, or were first exposed to a product. Cohort analysis tracks each group separately over the weeks or months since it started, rather than looking at the whole user base as one undifferentiated pool on a single calendar timeline.

The technique predates software by decades: actuaries and epidemiologists used it to compare life expectancy of people born in different years without being fooled by a population's average age shifting; consumer lenders adapted it as "vintage analysis," tracking the default rate of loans originated each quarter separately (a blended default rate says nothing about whether this quarter's loans are riskier). Web and mobile teams borrowed it in the 2000s as usage data became cheap; Mixpanel and Amplitude built cohort tables into core dashboards.

### Cohort table — grouping by arrival week
*Everyone who signed up in the same week, followed forward.*

| Signed up | Week 0 | Week 1 | Week 2 | Week 3 | Week 4 |
|---|---|---|---|---|---|
| Week of 1 Sep | 100% | 41% | 28% | 24% | 23% |
| Week of 8 Sep | 100% | 38% | 26% | 22% | |
| Week of 15 Sep | 100% | 44% | 31% | | |
| Week of 22 Sep | 100% | 46% | | | |

- **Read down a column** to compare cohorts — *is the product getting better for new arrivals?*
- **Read across a row** to see one group age — *does anyone stay?*

### The retention curve — the only honest signal you have

| If it flattens | If it decays to zero |
|---|---|
| A group of people genuinely need this | You rented attention; nobody stayed |
| That group is a business you can build on | More acquisition makes the hole bigger, not smaller |
| Now go and find more people like them | Go back to the problem, not the funnel |

---

## 7. Feature adoption — which of the things you built actually matter

Plot every feature on **breadth** (few ↔ many people) × **frequency** (once ↔ often):

| | **Few people** | **Many people** |
|---|---|---|
| **Often** | **Niche** — few people, often. Keep it; someone depends on it | **Core** — many people, often. This is your product. Defend it |
| **Once** | **Expendable** — few people, once. Delete it; it's costing you | **Tried once** — many people, once. *The trap.* It looked like a hit |

- **The trap:** "Tried once" fools teams. Launch-week numbers look spectacular, the feature gets celebrated, and nobody checks whether anyone came back to it.
- **The discipline:** plot every feature you've shipped, then say out loud which one you'd delete. If the answer is none, you haven't measured it.

---

## 8. Section 05 — Troubleshooting: something moved, now what?

*A method, not an instinct — run it in this order.*

1. **Check the instrumentation before the product.** Did an event stop firing? Did a release rename something? Half of all mysteries end here.
2. **Segment it.** Platform, cohort, city, acquisition source, new vs returning. A change that's everywhere is rare.
3. **Put it on a timeline.** Line the change up against your release log, a campaign, a competitor's launch, a festival, a weekend.
4. **Find the smallest group where it's worst.** That group's story is the hypothesis.
5. **Then go and talk to five of them.** The data has done all it can; the explanation is with the people.

---

## 9. Going deeper — frameworks (reference)

*(Repeated from Session 6 for reference — see the Session 6 notes for full detail.)*

### North Stars by game
| Game | Recommended shape | Decompose to | Pair with | Trap |
|---|---|---|---|---|
| **Attention** | Time spent with the core action, per user, per week (lesson hours actually watched; articles scrolled past the headline; listening sessions > 90 s) | Frequency / depth / session quality | Newsfeed activeness | NSM drifting toward installs or registrations |
| **Transaction** | Contribution margin per order — per order not attempt; net of discount; per active user per month | Frequency / basket / margin | Refund rate · repeat contacts | Chasing GMV; marketplaces pretending to be in two games |
| **Productivity** | Tasks completed per paid seat, per month (reports generated, workflows finished, hours saved as logged by the user) | Adoption / repeat / quality | Time-to-first-value · support load | Optimising for sessions under growth pressure — the beginning of the end |

### HEART (Google, UX-heavy)
**H**appiness (surveys, NPS, sentiment) · **E**ngagement (depth, frequency, time-on-task) · **A**doption (new users finding the new thing) · **R**etention (in cohorts, over months) · **T**ask success (efficiency, errors). Five dimensions, not five metrics — pick one or two per dimension by stage.
*Booking app example:* H post-booking satisfaction · E sessions per active booker per month · A share of monthly active bookers among new sign-ups · R 30-day repeat-booker share by origin city · T bookings confirmed without a human call; average time from intent to booking.

### AARRR (Pirate Metrics, growth-heavy)
**A**cquisition (how users find you — a leading indicator only paired with activation quality) · **A**ctivation (did they do the thing? often the right NSM early) · **R**etention (a cohort question by definition) · **R**eferral (k-factor territory; not all products need it) · **R**evenue (often a lagging output).
*The order matters: if retention is poor, acquisition is a leak with a marketing budget.*

**HEART vs AARRR:** a check-up (feelings first, behaviour after) vs a funnel (stages where you lose users). Borrow one, name it, and resist combining them into one dashboard.

### Stickiness ratios
- **DAU/MAU** — define "active" as the core action; state the window (rolling 30 days vs calendar month); productivity products "lie" (essential weekly tools look unsticky). A sanity check on retention, not a North Star.
- **WAU/MAU** — suits weekly core actions. Typical bands: quick commerce **30–40%** (below is a warning); social/messaging **50–60%**; productivity tools **15–25%** (every-other-week usage is normal).

---

## 10. Section 07 — PM competencies, titles & bands

### From APM to CPO — PM titles and organisational hierarchy

| Level | Experience | FAANG depth | Indian unicorns (hybrid) | Startups (breadth) |
|---|---|---|---|---|
| **Leadership** | 8–12+ yrs | Principal / Group PM (L7+ Google, L7+ Amazon) — strategy across orgs, managing managers | Director / AVP / GM (Flipkart, Zomato) — P&L ownership, business-unit head | VP Product / CPO — company strategy, board interaction |
| **Senior** | 5–8 yrs | Senior / Lead PM (L5 Google, E5 Meta) — complex ambiguity; terminal level for many | Senior PM (Uber India) | Head of Product — reports to founder; sole ownership of roadmap |
| **Mid-level** | 2–5 yrs | Product Manager (L4 Google, E4 Meta) — independent execution of features | PM I / PM II (Swiggy) — leading key pods; faster promotion cycles | Senior PM — high growth, title inflation; rapid shipping, ops-heavy |
| **Entry** | 0–2 yrs | APM / RPM (L3 Google; rotational) — structured mentorship, elite cohorts | Associate PM (Flipkart APM) — generalist | Founding PM — full lifecycle ownership, zero support; trial by fire |

- **FAANG depth:** structured ladders; L5 is often a "terminal" level where PMs stay for years focusing on deep complexity.
- **Indian hybrid:** combines FAANG rigour with startup speed; faster vertical promotion than US counterparts.
- **Startup breadth:** flat hierarchy; titles fluid/inflated; breadth of scope over depth of scale; chaos management and execution focus.

### Compensation by level
- Pave / Lenny's Newsletter data on total compensation by level — levels map as P1 = entry, P2–P3 = mid, P4–P6 = senior, M3–M4 = manager, M5–M6 = director, E8 = VP, E9 = CPO. Compensation rises steeply at senior and executive levels, with equity becoming a larger share.
- Levels.fyi (India, Product Manager, updated 9 Nov 2026): **median total comp ≈ ₹45.0 lakh**; 25th percentile ₹29.3 lakh, 75th ₹68.3 lakh, 90th ₹92.6 lakh (based on 1,517 reported salaries). *(Shown with a disclaimer — self-reported data.)*

### PM Skills Radar (Ravi Mehta, *Product Competency Toolkit*)
A competency assessment: current proficiency vs role expectations. Twelve competencies in four groups:

| Product execution (Product Builder) | Customer insight (Product Architect) | Influencing people (Product Leader) | Product strategy |
|---|---|---|---|
| Feature specification · Product delivery · Quality assurance | Fluency with data · Voice of the customer · User experience design | Stakeholder management · Team leadership · Managing up | Business outcome ownership · Product vision & roadmapping · Strategic impact |

**Interpreting your shape — manager vs leader:** as PMs become more senior, they shift focus from managing products (execution, customer insight) to leading strategy and people (influencing, strategy).

### Role profiles (Ravi Mehta framework)
| Role | Experience & scope | Focus |
|---|---|---|
| **Product Manager** | 2–5 years; 1–2 features; reports to GPM/Director | Strong execution and customer insight |
| **Senior Product Manager** | 5–8 years (Level 2 / IC); owns a product area with 3–5 features | Balanced strategy and execution; mentors junior PMs & APMs |
| **Director of Product** | 10+ years; manages Senior PMs and PMs; owns a major product line or division | Sets vision/strategy for the division; shifts from "how" to "what" and "why"; portfolio management; heavy focus on hiring, coaching, org design |
| **VP of Product** | 12+ years; owns the entire product organisation; partners with CEO and board on strategy and P&L | Sets product vision and culture; org design, hiring executives, scaling processes; executive presence, strategic foresight, talent magnetism — "builds the machine that builds the product" |

---

**Thank you.** — Chandrashekhar V, SWPM · ISB Hyderabad · 10 November 2026
