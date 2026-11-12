# SWPM Session 6 — Product Metrics & Analytics

*What to count. What to leave uncounted. And the data you must build, before you need it.*

**Course:** Software Product Management (SWPM) · ISB Hyderabad
**Instructor:** Chandrashekhar V
**Date:** 4 November 2026
**Source deck:** `SWPM_Session_6___Product_Metrics.pdf` (64 slides)

---

## Contents

1. [Opening: general news & a consulting story](#1-opening-general-news--a-consulting-story)
2. [Where we are: the seam between two halves](#2-where-we-are-the-seam-between-two-halves)
3. [Section 01 — Why metrics, which ones](#3-section-01--why-metrics-which-ones)
4. [Section 02 — Derive from the user's goal: GAME](#4-section-02--derive-from-the-users-goal-game)
5. [Section 03 — One number on the wall: the North Star](#5-section-03--one-number-on-the-wall-the-north-star)
6. [Section 04 — Data, on purpose](#6-section-04--data-on-purpose)
7. [Section 05 — Going deeper](#7-section-05--going-deeper)
8. [Summary](#8-summary)

---

## 1. Opening: general news & a consulting story

**General news discussed in class:**
- Uber's CFO noted ~320 million rides and Uber Eats orders during Halloween week — of which only **four** rides (and ~500 Eats orders) came from AI agents. "The agentic commerce revolution still has a long way to go."
- a16z chart: demand for technical roles (and not just technical roles) appears to be on the rise again (job postings indexed to Feb 2020).
- Canva reportedly laid off ~22% of its workforce, with a generous package (keep laptops, severance, equity vesting cliff removed, extended healthcare, career support, a founder grant fund).
- a16z: "AI Jobs FUD Fades" — news reports on AI job loss and AI-related layoff announcements trending down.
- India now makes more steel than the US and Japan combined (World Steel Association 2025: China 960.8 Mt, India 164.9 Mt, US 82.0 Mt, Japan 80.7 Mt…).

**"X and its gifts" — a story about management consulting, women's empowerment and motorcycles** (retold from a post by Ritesh Banglani; author's anecdote, illustrative scenes):
1. **The market puzzle** — a muscular mid-range motorcycle reportedly held 60% segment share in North India but never exceeded 4% in the South, despite decades of dealer-building and marketing.
2. **A massive investigation, one small workstream** — consultants planned reviews of sales, incentives, working capital, advertising and dealers. Consumer insights was a small line item for the junior-most team. The major reviews found improvements, but no explanation.
3. **The junior team finds a clue** — across Karnataka and Telangana, the bike regularly made buyers' shortlists but rarely won. Prices were comparable; the drop-off appeared *after the test ride*.
4. **Watch the ride, then ask** — buyers brought their wives, tried the bike, then ignored dealer calls. Observation and post-ride conversations exposed the problem: side-saddle passengers felt uncomfortable and feared falling.
5. **Why did the North look different?** — northern buyers came alone or with male companions, so the seating problem stayed hidden. Women were excluded from the decision, even when the bride's family paid for the motorcycle.
6. **The seat was the flaw; voice exposed it** — the report diagnosed a pillion-seat design mismatch. The deeper discovery: where women had a voice in the purchase, a hidden product problem became a lost sale.

*Lesson for today:* the dashboards located the drop-off (after the test ride); only observation and conversation explained it.

---

## 2. Where we are: the seam between two halves

| First half — already done (S1–S5) | Second half — this week on (S6–S10) |
|---|---|
| Understanding, hypothesis, building with the right tenets: who the user is, what their problem is, what solution might fix it, prototyping, habits | Measuring, building, and the craft of product management. Today is the foundation — every later session needs a number to argue with |

> For five sessions you've been building conviction. From today the product starts answering back — in numbers.

### Six threads across the sessions
- **S1 · The users** — who they are, where they live, what their day looks like.
- **S2 · The problem** — how often it hurts, how badly, who else has tried to fix it.
- **S3 · The solution** — a value proposition worth defending; lenses for choosing one.
- **S4 · The prototype** — the least work that settles the argument; everything beyond that is waste.
- **S5 · The stickiness** — habits, familiar patterns, products that sell themselves.
- **S6 · You are here** — decide what the product measures, and build the data on purpose.

### Goal of this session
> **To decide what your product should measure — and what data you need to measure it.**

Not a statistics class, not a tool tutorial. The skill is **judgement** — choosing what to count, and knowing what you gave up by choosing it.

| This session is NOT | This session IS | Session 7 takes over |
|---|---|---|
| A statistics class; a tool review; a funnel workshop | A decision about measurement: choose what to count; build what makes it countable | Reading the data: funnels, cohorts, retention curves, root cause |

**Graduation bar:** every team leaves with one number on paper that they can defend.

---

## 3. Section 01 — Why metrics, which ones

*Four tests every number on your dashboard should pass — and the ones that flatter you instead.*

### Provoke
> **Your dashboard has forty numbers on it. Which one changed a decision last week?**

Most proposed metrics fail that question. Revenue went up — so what did you change? You didn't. Then revenue is a *report*, not a metric you manage by.

### A metric worth having is four things (Croll & Yoskovitz, *Lean Analytics*)

| Test | Meaning |
|---|---|
| **Comparative** | Against last week, another cohort, or a target. A number with nothing to compare it to means nothing. |
| **Understandable** | If the team can't repeat the definition from memory, they won't use it. |
| **A rate or a ratio** | Rates are harder to flatter yourself with than totals, and they survive growth. |
| **Behaviour-changing** | Some value of it would make you do something different tomorrow. |

**The fourth test fails most dashboards. Apply it ruthlessly to your own.**

### Vanity vs actionable — "Mirror, mirror on the wall, who is most data-driven of all?"
*Key insight:* cumulative totals obscure active engagement trends. Total registered users rise continuously even as weekly active users plateau or decay — vanity metrics create a false sense of growth while core usage deteriorates.

| Flatters you — vanity metrics | Works for you — actionable metrics |
|---|---|
| Total registered users | Weekly actives doing the core action |
| App downloads | Day-7 retention by sign-up week |
| Page views · impressions | Conversion rate, split by source |

**Fastest finger first (3 volunteers):** pick any app on your phone; name one vanity metric and one that would change a decision.

### The honest slide — you never measure what you actually care about

| What you care about | What you can observe |
|---|---|
| Did this person get the value we promised? | They completed the core action twice this week |
| Do they trust us with something that matters? | They saved a payment method |
| Would they be upset if we disappeared? | They came back on day 7 without a notification |

Every metric is a **proxy**. The skill is choosing one that stays honest as the product changes. *Proxies drift:* "minutes in app" measured value until the team added autoplay — then it measured the feature, not the user.

### One warning before you choose — Goodhart's law / the cobra effect
> **Every metric you make a target will be gamed** — usually not by cheats, but by well-meaning people optimising exactly what you asked for.

| Ask for… | You will get… |
|---|---|
| DAU | More notifications |
| Time in app | Autoplay, infinite scroll, watching to count |
| Tickets closed | Tickets closed fast, problems unsolved |

The fix (later): a **counter-metric**, owned by the same team, that says what the chase must not cost. *Gaming is rarely dishonest — a growth team told to raise DAU raises DAU. Nobody did anything wrong; the metric did the damage on its own.*

---

## 4. Section 02 — Derive from the user's goal: GAME

*Most teams pick metrics by looking at what the tool counts. GAME reverses the direction.*

### Most teams pick metrics backwards

| What usually happens | What should happen |
|---|---|
| Open the analytics tool | Start with what the user is trying to do |
| See what it already counts | Name actions that show they're doing it |
| Put the biggest numbers on a slide | Decide how each action gets counted |
| Discover later that none of them moved | Agree in advance what would make you act |

You already did the hard part in Sessions 1–3 — the goals are in your personas.

### GAME — a direction of travel
Bottom-up, from the user's goal; never top-down from what the dashboard shows.

| | Step | Question |
|---|---|---|
| **G** | Goals | What is the user trying to achieve? Their goal — not your revenue. |
| **A** | Actions | What do they do that shows it? Acquire · Retain · Monetise. |
| **M** | Metrics | How is each action counted, and normalised by what? |
| **E** | Evaluate | What value would make you act? Decide before you look. |

*A teaching device, not a famous framework. Its value is the direction: goals first, counting last.*

### G · Goal — the user's goal, not yours

| Not a goal (company voice) | A goal (user's voice) |
|---|---|
| "Increase revenue by 20%" | "Get dinner sorted before the kids get hungry" |
| "Become the default app for groceries" | "Stop paying interest I did not know I owed" |
| "Drive engagement" | "Get to the office without negotiating a fare" |

Read the right column out loud, in normal speaking register — the difference lands without explanation.

### A · Action — the actions that prove it
Where an abstraction becomes something an engineer can build.
1. **Acquire** — they found you and got far enough in to see the point.
2. **Retain** — they came back, without being pushed.
3. **Monetise** — they paid, or did the thing that eventually leads to paying.

**Test:** could a stranger watching the screen tell that the action happened? "Understood the value proposition" fails. "Placed a second order within seven days" passes.

### M and E — counting, and deciding in advance

| M — how it gets counted (three questions, out loud) | E — what would make you act |
|---|---|
| Per what? Per user, per session, per week | Set the threshold before you see the number |
| Magnitude or ratio? Prefer the ratio | Name the action each side of it triggers |
| Direct or proxy? Write the assumption down | Decide who looks, and how often |
| | Agree what would make you kill the feature |

**One sentence, said out loud:** *"If second-week reorder is below 15% by 30 October, we stop building features and go back to interviews."*

### Worked example — a two-wheeler ride-hailing app (illustrative)

| Goal | Action | Metric (with a denominator) | Evaluate (with a trigger) |
|---|---|---|---|
| Get to work without negotiating a fare | Books a ride during the morning peak | Share of peak requests matched within 2 minutes | Below 80% → add driver incentives |
| Not be left waiting in the rain | Books again within seven days | Week-1 repeat rate, by pickup pin code | Below 25% → go back to interviews |
| Pay what was quoted | Completes payment in-app | Fare variance: quoted vs charged | Above ±10% → stop all other work |

Each row has all four parts. The numbers are illustrative — the shape is what to copy.

### Workshop 01 (8 min) — Run GAME on your product
In project teams, on paper. Grid columns: *Goal — in their words · Action · Metric (per what, per when) · Evaluate.* Three rows is enough; a fourth is a bonus. Keep it on one sheet — you'll need it after the break.

---

## 5. Section 03 — One number on the wall: the North Star

*The North Star, three inputs underneath it, and a counter-metric that keeps the chase honest.*

### One number, on a screen, visible to everyone every morning. What is it?
- **Listen for:** nobody can move it · targets wearing a hat · vanity totals.
- **Push with:** "What would you actually do if that number fell 20% next week?"
- **The number:** e.g. *Orders per active user, per week* — a row out of your GAME grid, sharpened.
- **Tie-back:** good answers already have a denominator.

> Teams that cannot name one number have not agreed what the product is for.

### A North Star metric is / is not

| It IS | It is NOT |
|---|---|
| An expression of the value the customer gets | Revenue, or any lagging financial total |
| A leading indicator of the money that follows | Monthly active users |
| Something your team can move this month | A target with a deadline attached |
| One number — not a scorecard | Whatever your investor asked about last |

**Test:** if this number goes up for a year and the business doesn't improve, you chose the wrong one.

### Which game is your product playing?
The classification decides the direction of "good."

| Game | You win when… | North Star looks like | Examples |
|---|---|---|---|
| **01 · Attention** | People spend time | Time, sessions, content consumed | Streaming, social, news |
| **02 · Transaction** | People buy | Purchases per active user per period | Quick commerce, travel, fintech |
| **03 · Productivity** | People finish faster | Tasks completed, time saved, fewer clicks | Tools, B2B software, workflow |

**Trap:** a productivity product that starts optimising for time-in-app has quietly switched games — and will lose. Pick one.

### Three games, three directions of good
*Engagement is not universally good. A user spending longer in your expense tool last month is a user with a worse month.*

| Attention ↑ | Transaction ↑ | Productivity ↓ |
|---|---|---|
| More time spent is success — but time with the core action (the playlist, article, watch party, conversation), not every screen | More transaction events, at sustainable margin per event. Don't chase GMV alone — contribution margin per order survives the investor call | Less time, more tasks completed per period. Time is a tax; reward holds value only if the user gets to pack up sooner |

Marketplaces feel like two games; they're usually one — transaction, with an attention problem on the side.

### Decompose — nobody moves a North Star directly
**North Star: orders per active user, per week.** Teams move one of three inputs and the North Star follows:

| 01 · Breadth | 02 · Depth | 03 · Frequency |
|---|---|---|
| How many people do it at all? | How much do they do each time? | How often do they come back? |
| New buyers activated this week | Items per basket | Days between orders |

When the North Star moves and you can't explain why, the three legs tell you which. *Breadth usually moves first, frequency last.*

### Inputs you act on; outputs you report

| Output · lagging — you can only watch | Input · leading — you can change this week |
|---|---|
| Revenue this quarter | Time from sign-up to first order |
| Monthly retention | Share of orders using a saved address |
| Net promoter score | Support tickets per hundred orders |

**Put outputs in the board deck; put inputs in the stand-up.** A team held accountable only for outputs feels powerless, because nothing they do this week moves them.

### The one metric that matters, by stage
At any moment, one number worth obsessing over — and it changes as the company changes.

| Stage | Question you're answering | Metric that matters |
|---|---|---|
| Problem/solution fit | Does anyone actually have this problem? | Interviews that confirm the problem |
| **Early product** | Does anyone come back without being pushed? | **Week-1 repeat rate** |
| Product/market fit | Does a group of people keep coming back? | Retention curve flattening |
| Growth | Can we reach more of them affordably? | Activated users per rupee spent |
| Scale | Does it hold together as it gets bigger? | Contribution margin per order |

*Most of you are on row two. Row-four metrics on a row-two product will mislead you for months.* Tracking five rows at once is how a small team stops making decisions.

### Every target needs a counter — guardrail metrics
*The thing that must not get worse while you chase it.*

| If you chase this | You'll likely get | So pair it with |
|---|---|---|
| Daily active users | Three notifications a day | Uninstalls per thousand users |
| Orders per week | Discounts nobody can afford | Contribution margin per order |
| Time in app | Autoplay, infinite scroll | Sessions ending in a completed task |
| Tickets closed per agent | Tickets closed, problems unsolved | Repeat contacts on the same issue |

> A North Star without a counter-metric is an instruction to damage something you forgot to measure.

The counter-metric should be **owned by the same team, reviewed in the same meeting, with a threshold that stops work.**

### Three pairings worth stealing
- **Quick commerce — order frequency.** Target: orders per active user per week. Counter: share of orders with no promo code applied. *Receipt checks fell in the third week after a discount push; metric and counter corrected together.*
- **Ed-tech — lesson completion.** Target: lessons per active learner per week. Counter: share of lessons quit before the assessment. *A wireframe that skipped the assessment step inflated completions by 38% before the counter caught it.*
- **Ride-hailing — match rate.** Target: requests matched within 2 min. Counter: share of matched requests with fare variance > ±10%. *Match rate rose by adding auto-accept drivers; fare variance caught what match rate celebrated.*

### Workshop 02 (6 min) — Name your North Star
Back to your GAME grid. **Choose, don't generate.** Mark your NSM on the grid.

*(Break — after the break: choosing the one number you'd put on the wall.)*

---

## 6. Section 04 — Data, on purpose

*You decided what to measure. Now: what has to exist in the product for you to measure it?*

### Everything is three objects
Every analytics tool you'll ever use (Mixpanel, Amplitude, PostHog) uses this model under different names.

| 01 · Events | 02 · Properties | 03 · Identity |
|---|---|---|
| Something happened, at a moment in time | The details attached to it | Who did it — stitched across logins |
| `order_placed` | `city · payment_method` | `user_id · anon_id` |
| Verbs in the past tense, always | Adjectives — what lets you segment | The thread that says "same person" |

**Identity is where most pain lives.** Anonymous browsing → sign-up: unless someone deliberately stitches `anon_id` to `user_id`, the whole pre-sign-up journey is lost. Every tool supports it; almost no small team does it before they need it.

### Question → structure: every question needs four things
Miss any one and the question is unanswerable.

| The question | Event | Property | Window |
|---|---|---|---|
| Where do people drop out of checkout? | `checkout_step_viewed` | `step_name` | last 14 days |
| Did the new onboarding help? | `first_order_placed` | `signup_cohort` | week over week |
| Is anyone using what we shipped? | `reorder_tapped` | `entry_point` | since release |
| Which city is actually working? | `order_completed` | `pincode` | rolling 4 weeks |
| Are we losing people to failures? | `payment_failed` | `failure_reason` | last 7 days |

> The questions you can answer are exactly the ones somebody thought about in advance.

### Name events once, properly — chaos vs convention
This looks trivial; it's the most common reason a company's analytics are useless.
- **Chaos:** `Order Placed` · `order-placed` · `placedOrder` — three engineers, three names for the same action across six months. The funnel is wrong in a way that's invisible: the chart renders, it just doesn't mean anything. Also `clicked_button_3` (means nothing to next-quarter you) and `user_did_thing`.
- **Convention:** `order_placed` · `payment_failed` — **object_action · lower case · past tense**, where *object* is what it was and *action* is what happened. One name, agreed, written down; new events need someone's sign-off.

*Practically:* tonight, open your analytics tool and count how many names refer to the same action. Most teams find at least one duplicate.

### The thing you cannot undo
> **You can add an event next week. You can never add a property to last week.**

| Cheap · asymmetry | Expensive · irreversible |
|---|---|
| Adding events is fine — a new event fired next Tuesday gives data from next Tuesday onward, often good enough (e.g. `new_post_attempted` — ship next month) | Adding properties is permanent — ship `order_placed` without `city` and you can never ask which city works for users who already ordered |

When specifying an event, ask: **"What will I want to cut this by in three months?"** Put those properties in now, even the ones that seem unnecessary.

### The tracking spec — a PM writes this
The artefact that makes funnels and cohorts possible. Nobody else will write it for you.

| Event | Fires when | Properties | Feeds which metric |
|---|---|---|---|
| `signup_completed` | Account created and verified | `source · device · city` | Breadth |
| `first_order_placed` | First-ever order confirmed | `minutes_since_signup · basket_size` | Time to first value |
| `order_placed` | Payment confirmed, not on tap | `items · city · entry_point · is_reorder` | North Star |
| `payment_failed` | Gateway returns a failure | `failure_reason · attempt_number` | Counter-metric |

If an event doesn't feed a metric, ask why you're capturing it. If a metric has no event feeding it, you can't compute it.

### What the numbers will never tell you
*Analytics is excellent at locating a problem and incapable of explaining one.*

| Analytics answers | It never answers |
|---|---|
| What happened | Why they left |
| How many, how often, to whom | What they expected instead |
| Which step they leave at | What they tried to give up on |
| Whether it changed after the release | What they would have paid for |

Five interviews explain a drop-off that five million events only located. **The quant tells you where to point the qual.**

### Why two dashboards never agree — four causes
1. **Definition** — nobody owns it. Two people compute "active user" differently and both are sure they're right.
2. **Window** — rolling 30 days vs calendar month: same data, different answer, endless meeting.
3. **Audience** — bots and internal users. Your own team can be 40% of traffic on a 200-user product. Exclude internal users from day one.
4. **Tracking** — events that silently stopped. A release broke tracking; the chart renders, it just shows flat.

**The fix (for all four):** one definition per metric, one owner, written down where the team can find it.

---

## 7. Section 05 — Going deeper

*Frameworks, real examples and failure modes a working PM needs.*

### North Stars you may have used this week

| Product | North Star | Why it fits |
|---|---|---|
| Swiggy · Zomato | Orders per active user, per week | A transaction product; frequency of return, normalised |
| Duolingo | Lessons completed per active learner per week | A habit product; streak retained, frequency locked |
| PhonePe · GPay | Share of monthly transactions through us | A fintech product; habit baked into the bill, not the app |
| Notion | Weekly active creators | A productivity tool where actions are documents created, not sessions spent |
| CRED | Bill paid through CRED per month per active user | Not transactions — share of credit-card bill routed through the product |
| Ola · Rapido | Requests matched within 3 minutes, by hour | Supply speed at the moment of asking — operating, not reporting |

None of these are the only right answer.

### NSM deep-dive by game

**Attention products — time on the right thing, not on every screen**
- Recommended shape: *time spent with the core action, per user, per week* — hours of lesson actually watched (not playlist time); articles scrolled past the headline (not opened); listening sessions > 90 seconds (not sessions opened).
- Decompose to: **frequency / depth / session quality** — the third leg must answer "what kind of time" before "how much."
- Pair with: newsfeed activeness — engagement is only as good as the day the user comes back.
- Trap: an attention product whose NSM drifts toward installs or registrations stops being an attention product.

**Transaction products — don't chase GMV alone**
- Recommended shape: *contribution margin per order, growing, sustainable* — per order not per attempt (denied/refunded orders don't count); net of promotional discount, not gross; per active user per month, not absolute order count.
- Decompose to: **frequency / basket / margin** — margin as the third leg saves you from chasing GMV.
- Pair with: refund rate · repeat contacts — if margin rises while complaints rise, you're wrong about what improved.
- Marketplaces often pretend to be in two games; they're usually here, with an attention problem on the supply side.

**Productivity products — time is a tax**
- Recommended shape: *tasks completed per paid seat, per month* — reports generated (not sessions opened); workflows finished (not started); hours saved, where the user logged it.
- Decompose to: **adoption / repeat / quality** — "repeat" means they come back next month, not that they lingered.
- Pair with: time-to-first-value · support load — support tickets tell you if adoption actually worked.
- Under growth pressure, a productivity product starts optimising for sessions. *It's the beginning of the end.*

### HEART — Google's framework for UX-heavy products
Use when GAME rows over-index on clicks and under-index on feeling.

| | Dimension | What it captures |
|---|---|---|
| **H** | Happiness | Surveys, NPS, sentiment — attitudes predict behaviour, sometimes |
| **E** | Engagement | Depth of involvement, frequency, time-on-task — the legs, not the headline |
| **A** | Adoption | New users finding the new thing — first-time, with a cohort caveat |
| **R** | Retention | Did they stay? In cohorts, over months — not a cumulative total |
| **T** | Task success | Efficiency and errors — did they finish, how often, how cleanly? |

HEART names five *dimensions*, not five metrics. Pick one or two per dimension depending on stage, and write the goal each serves in one line.

**Worked example — a booking app:** H: post-booking satisfaction score · E: sessions per active booker per month · A: share of monthly active bookers among new sign-ups · R: 30-day repeat-booker share, by origin city · T: bookings confirmed without a human call; average duration from intent to booking.

### AARRR — Pirate Metrics (acquisition to revenue)
Five stages — not five metrics.

| Stage | Question | Note |
|---|---|---|
| **Acquisition** | How do users find you? | Acquisition spend is a leading indicator only when paired with activation quality |
| **Activation** | Did they do the thing the product exists to do? | Often the right North Star for early products |
| **Retention** | Are they still doing it a month later? Six? | A cohort question by definition |
| **Referral** | Do they bring others? | k-factor territory — not all products need it |
| **Revenue** | They paid. Eventually. Sometimes. | Often a lagging output |

**The order matters. If retention is poor, acquisition is a leak with a marketing budget.**

### Two lenses on the same building — HEART vs AARRR

| HEART (Google · UX-heavy) | AARRR (Lean startup · growth-heavy) |
|---|---|
| Happiness, Engagement, Adoption, Retention, Task success | Acquisition, Activation, Retention, Referral, Revenue |
| Like a check-up: feelings first, behaviour after; each axis asked "how is this going?" over weeks | Like a funnel: a user passes through stages, and you can lose them at each |
| Best for tools and consumer products where satisfaction drives retention | Best for growth-focused funnels where the unit is the user journey |

A working PM borrows one, names it, and resists combining them into one dashboard.

### DAU/MAU = stickiness — three caveats
The ratio is helpful — and the worst-traded metric on the internet.
1. **Active means the core action.** If "active" means "opened the app", you're measuring notifications.
2. **Window matters more than people think.** DAU today vs MAU last 30 days ≠ DAU today vs MAU calendar month. Pick one; say the window out loud.
3. **Productivity products lie.** A tool used once a week but essential has high value without ever being "engaging." Read it as part of a portfolio, not the headline.

*Best read:* a sanity check on retention, not a North Star by itself.

### WAU/MAU — a softer stickiness
Suits products whose core action is weekly (groceries, laundry, bill pay). **WAU/MAU** = how many of this month's users showed up this week.

| Category | Typical band | Reading |
|---|---|---|
| Quick commerce | 30–40% | High; the category is supposed to live here — below is a real warning |
| Social or messaging | 50–60% | WhatsApp-class; habit-shaped products live here, often higher |
| Productivity tools | 15–25% | Lower is normal — read it as every-other-week usage, not failure |

Use the bands as a starting question: are we in the right band for our category, and where is the band moving?

---

## 8. Summary

> **One number. Three inputs. Counter-metric in the seat next to it. And a tracking spec the PM wrote.**

- Metrics must be **comparative, understandable, a ratio, and behaviour-changing**. Prefer actionable over vanity.
- Every metric is a **proxy**, and every target gets **gamed** — pair it with a counter-metric.
- Derive metrics **bottom-up with GAME**: Goals → Actions → Metrics → Evaluate (thresholds decided in advance).
- Pick **one North Star** that expresses customer value, fits your **game** (attention / transaction / productivity), decomposes into **breadth, depth, frequency**, and suits your **stage**.
- Build data **on purpose**: events, properties, identity; `object_action` naming; properties can't be back-filled; write the **tracking spec** yourself.
- Analytics locates; interviews explain.
