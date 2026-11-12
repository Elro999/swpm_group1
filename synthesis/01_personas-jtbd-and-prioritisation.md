# Team synthesis 1: merged personas, JTBD and which persona to build for

**Status:** Draft for team review (12 Nov 2026). Feeds Assignment 2 slides: Personas (S1), JTBD (S3), and the start of Problems (S2).
**Inputs:** all 25 transcripts in `research/transcripts/` (source of truth) and the 5 persona files in `research/personas/` (15 personas + 1 anti-persona).
**Method:** S2 affinity clustering ("no quote, no claim"; 9+ of 25 = *finding*, 1–2 = *hypothesis*); S1 persona anatomy and anti-persona; S3 JTBD format; S2 frequency × severity, reachability and beachhead. Every claim cites participant codes.

---

## 1. TL;DR

- The 15 teammate personas collapse into **3 team personas + 1 anti-persona**. They split by *what blocks them*, not by who they are.
- **Primary: Kiran, the Experienced Narrator.** Has the experience, loses it in the telling: answer too long, the point comes late, says "we" for his own decision, can't tell before the interview whether it lands. The broadest pain in the sample (**16 of 25**), and the cheapest one to prototype well.
- **Secondary: Kabir, the Case-Prep Grinder.** ISB case prep that stalls when partners are busy; AI interviewers are too easy; unfamiliar industries break recommendations (10 of 25, all on campus). A real problem, but a crowded one (ChatGPT/Claude voice, Nworks) and the fix (a good case interviewer or peer matching) won't fit in 8–10 hours.
- **Tertiary: Arjun, the Off-Campus Switcher.** No placement ecosystem, learns by failing real interviews, spends days gathering company intel (6 of 25). The most severe pain per person, but hard to reach this week and needs data we don't have.
- **Anti-persona: the technical-round grinder** (DSA, system design, GK recall). Already served by LeetCode and upvoted solutions (SAM-3, SAM-2).
- **Update 12 Nov evening, team decision:** the team chose **D. Abhinav, the Placement Candidate Without a System** (section 4D) as the persona to build for: a final-year student in placement season with sporadic prep, who needs a planner, story discovery, story-to-JD fit and mock feedback. His behaviours and pains are backed by A and B's evidence; his life stage (undergrad) is not yet in our sample. See 4D.
- **What runs through all three: nobody gets feedback that points to a specific moment** (15 of 25). Kiran's product delivers that first, so the MVP can later grow into Kabir's and Arjun's jobs.

---

## 2. Theme matrix (affinity clusters across all 25)

Counted from tagged lines in the transcripts, with teammate coding as a cross-check. ✔ = raised it themselves, in the transcript.

| # | Theme (pain) | Count /25 | Who | Status |
|---|---|---|---|---|
| T1 | **Delivery: the answer runs long, the point arrives late, structure slips under pressure** | **16** | ROH-1, ROH-3, ROH-4, ROH-5, SAM-1, SAM-2, SAM-3, SAM-4, SUR-1, SUR-2, SUR-3, SUR-4, SUR-5, ADD-1, ADD-3, ADD-5 | Finding |
| T3 | **Feedback is missing, generic or contradictory**; what works is feedback tied to a specific moment | **15** | ROH-2, ROH-4, ROH-5, SAM-1, SAM-2, SAM-4, SAM-5, SUR-1, SUR-2, SUR-3, SUR-4, SUR-5, ADD-3, ADD-4, ADD-5 | Finding |
| T5 | **AI falls short as a practice partner**: generic, too easy, rewrites inflate their role, loses context, can't see them | **15** (and ~22/25 *use* AI) | ROH-5, SAM-1, SAM-3, SAM-5, SUR-1, SUR-2, SUR-3, SUR-4, SUR-5, SRI-2, SRI-3, SRI-4, SRI-5, ADD-3, ADD-5 | Finding |
| T4 | **A human practice partner is scarce or costly**: schedules, 2-hour sessions, paid counsellors, nobody up at midnight | **13** | ROH-4, ROH-5, SAM-4, SUR-2, SUR-3, SUR-4, SRI-1, SRI-2, ADD-1, ADD-2, ADD-3, ADD-4, ADD-5 | Finding |
| T2 | **Shaping my experience into the right story for this role**: "why I moved / why this job", I vs we, translating domain work | **12** | ROH-1, ROH-2, ROH-4, SAM-1, SAM-4, SAM-5, SUR-1, SUR-2, SUR-3, SRI-3, SRI-5, ADD-5 | Finding |
| T6 | **Lessons fade; can't track what changed or whether it worked** | **11** | ROH-4, ROH-5, SUR-1, SUR-2, SUR-3, SUR-4, SRI-2, ADD-2, ADD-3, ADD-4, ADD-5 | Finding |
| T9 | Company / interviewer insider intel is slow to collect | 8 | ROH-1, ROH-4, ROH-5, SAM-4, SAM-5, SRI-3, SRI-4, SRI-5 | Emerging |
| T7 | Keeping momentum; practice breaks after a few busy days | 7 | ROH-4, SRI-1, SRI-2, ADD-1, ADD-2, ADD-3, ADD-5 | Emerging |
| T8 | Cases in unfamiliar industries | 6 | ROH-2, SUR-5, ADD-1, ADD-2, ADD-3, ADD-4 | Emerging |
| T10 | Don't know which roles to prepare for (shortlists arrive late) | 4 | SRI-1, SRI-3, ADD-2, ADD-3 | Hypothesis |
| — | Live group-discussion entry | 1–2 | SUR-4 (ROH-3 practised GDs) | Hypothesis |
| — | Repetitive job application forms | 1 | SRI-5 | Hypothesis |
| — | Technical / GK recall | 3 | SAM-2, SAM-3, SRI-5 | Anti-persona |

**Caveats.** 17 of 25 are campus MBA candidates (16 ISB + ROH-3), so T1–T6 are mainly a campus finding. SRI interviews are short (6–16 min), which likely undercounts SRI participants. Counts are "raised it", not "suffers from it most".

**Costs people named (for sizing later):** SUR-1 spoke "almost four minutes" before reaching his own decision, then spent "forty-five minutes" reworking it, on top of an hour preparing the example; SUR-2 spent "around an hour" recovering missing evidence; SUR-3 about 90 minutes across mock, roommate and notes; ROH-3 lost 1–1.5 minutes of a time-boxed interview on one missed keyword; SAM-4 "tanked" an IIM interview by misreading what was asked; SAM-5 was rejected after "you don't seem full of energy", the only feedback she got; ADD-4 needs "close to two hours" per pair of cases; ROH-5 spends "2 to 3 days… running around, begging" alumni for questions.

---

## 3. How the 15 teammate personas merge

| Team persona | Absorbs (teammate: persona) | Core participants |
|---|---|---|
| **A. Kiran, the Experienced Narrator** | SAM: Kiran Mehta · SAM: Arnav Rao (the "why" story) · SUR: Intensive Reviser, Role Translator, Experienced Explainer · ROH: Kavya, Occasional Narrator · ROH: Rohan (delivery half) | SAM-4, SUR-1, SUR-2, SUR-3, ROH-1, ROH-2, SAM-2, SAM-5, ADD-5 (+ SAM-1, ROH-3 on delivery) |
| **B. Kabir, the Case-Prep Grinder** | ADD: peer-led momentum seeker · ADD: self-led feedback seeker · SRI: Kabir, Hedged Switcher · SRI: Neel, Self-Built Prep System · SUR: Selective Practiser · ROH: Rohan (case half) | ADD-1–5, SRI-1, SRI-2, SRI-3, SUR-5, ROH-3 |
| **C. Arjun, the Off-Campus Switcher** | ROH: Arjun, Solo Job-Hunter · SRI: Arjun, Working Switcher · SAM: Arnav Rao (abroad / working half) | ROH-4, ROH-5, SAM-1, SRI-4, SRI-5, ROH-2 |
| **Anti: the technical-round grinder** | SAM: anti-persona | SAM-3, SAM-2 (GK), SRI-5 (technical side) |
| *Parked: the live-group practiser* | SUR: Interaction-Dependent Practiser | SUR-4 only. Needs a real group; a solo tool can't reproduce it (SUR-4: "For group discussions, though, I need a group.") |

A person can sit in two personas. ADD-5 and SRI-3 do cases (B) *and* struggle with their fit story (A); ROH-2 is a switcher (C) whose main pain is positioning (A). Personas describe jobs, not people.

---

## 4. The personas (S1 six-element format)

### A. Kiran, the Experienced Narrator (PRIMARY)

> "I know the complete story, but does the delivery actually bring out the fact that I want to bring out?" (SAM-4)

| Element | Detail |
|---|---|
| **Situation** | MBA candidate in placement season (or a professional who interviews rarely) with 3–8 years of experience. Cases eat the evenings; fit and personal-interview prep "fills the gaps" (SUR-1), the night before or the morning of (SAM-4). |
| **The job** | Turn his own experience into a short answer that lands: the listener can say which decision was *his*, and why it fits this role. |
| **What he does today** | A sheet of 6–8 stories (SUR-1, SUR-5); records himself on his phone (SUR-1, SUR-4); asks a roommate or peer to listen (SUR-3, SAM-4); ChatGPT for likely questions, but strips its rewrites (SUR-1, SUR-2, SUR-3); STAR and keyword lists (ROH-4). |
| **Trigger** | A shortlist, or a mock tomorrow. |
| **What would make him switch** | Something available at his hours that points to the exact sentence that went wrong: "If someone points to an actual moment, I can work with it." (SUR-2); "It's available at midnight when my friends are asleep." (SUR-2) |
| **What would make him leave** | It rewrites his story or makes him sound like everyone else: "I have never said orchestrating in my life." (SUR-1); "if the tool rewrites his story instead of helping him say it better" (SAM: Arnav). Or the feedback is generic (ADD-5, SAM-1). |

**Pains:** spoke 4 minutes before reaching his decision (SUR-1); interviewer cut in with "What happened next?" (SAM-4); "we" made him sound "like I was just standing nearby" (SUR-3); can't tell before the interview whether the answer lands (SAM-4); interviewers never say what went wrong (SAM-1, SAM-5); conflicting advice, "Neither advice sounded completely stupid" (SUR-1); AI adds ownership he can't defend (SUR-1, SUR-2, SUR-3).
**Gains:** the listener names his decision without prompting (SUR-1); a fresh question where he applies the fix (SUR-2); feedback on what to stop, start and do better (SAM-2); hearing himself played back (SAM-4).

### B. Kabir, the Case-Prep Grinder (SECONDARY)

> "It's important to keep that muscle active and to not break practice." (ADD-2)

| Element | Detail |
|---|---|
| **Situation** | ISB PGP pivoting into consulting, strategy or PM; about 4 hours of class plus submissions a day, 2–6 hours of prep squeezed in; placements in the first week of December (ADD-1–5). |
| **The job** | Get a realistic case or PM rep every day and walk out knowing exactly what to fix next time. |
| **What he does today** | Friends and case buddies (1–3 hours a session); casebooks; Claude/ChatGPT voice as interviewer, prompted "not to nudge" (ADD-5); Lenny's PM-interview skill plus recorded transcripts (SRI-2); Nworks (ADD-1, ADD-5); a notebook of errors (ADD-2, SUR-5). |
| **Trigger** | A few days off, then a case that goes badly ("guilt or regret", ADD-2); a partner dropping out after their own shortlists (SRI-2). |
| **Switch** | A partner available any time that pushes back like a real interviewer (SRI-2, SUR-5, ADD-4). |
| **Leave** | Easy follow-ups (SUR-5); "doesn't adapt as a real person would" (ADD-3); generic analysis (ADD-5). |

**Pains:** finding a partner is "a bottleneck" (ADD-4); waiting for schedules to line up "leads to inaction" (SRI-1); feedback only fits the case it was given on (ADD-3); unfamiliar industries (ADD-1, ADD-2, ADD-4); AI drifts into deep dives and can't see his face (SRI-3).

### C. Arjun, the Off-Campus Switcher (TERTIARY)

> "Just taking more interviews… made mistakes again and again." (ROH-5)

| Element | Detail |
|---|---|
| **Situation** | Working full-time, or doing a master's abroad; switching field or country; job-hunting alone with 3 days to 3 weeks of notice (ROH-4, ROH-5, SAM-1, SRI-4, SRI-5). |
| **The job** | Get realistic, company-specific practice before the real interview, so the real one isn't the mock. |
| **Today** | Claude/ChatGPT loaded with resume + JD (ROH-4, SRI-5); free tiers juggled for limits (SRI-4); LinkedIn posts for recent questions (SRI-5); alumni outreach (ROH-5); notes, or recording interviews against policy (ROH-4, ROH-5). |
| **Switch / leave** | Switch: company-specific questions in one place (SRI-5: "a one-stop preparation platform"). Leave: generic role questions (SRI-5), lost context on follow-ups (SRI-4). |

### D. Abhinav, the Placement Candidate Without a System (TEAM-SELECTED, 12 Nov discussion)

> Added after the team discussion on 12 Nov evening, which chose this persona to build for because it fits what we can realistically build. Every trait is checked against the 25 interviews below. **Read the evidence-strength column:** the behaviours and pains are well supported, but the *life stage* (final-year undergrad) appears in **none** of our 25 interviews. All 25 have work experience. The life stage is a hypothesis until we talk to 3–5 undergrads (S1: "Could anyone you interviewed be it?"). The persona deliberately does not claim interview inexperience, since we interviewed no first-time interviewees.

> "So my preparation right now is more broad and generic rather than focused." (ADD-2)
> "When I felt bored, I was switching to GenMan." (ROH-3)

| Element | Detail | Evidence | Strength |
|---|---|---|---|
| **Who** | Abhinav, 21–22, final-year student in placement season, on campus and also applying off campus. | No undergrads in sample. On + off campus in parallel: SRI-1, SRI-3 hedge across tracks and roles. | **Hypothesis** |
| **Situation** | Classes, assignments and an active social life fill the day; prep happens in whatever gaps are left. | ~4 h class + 1–2 h submissions a day (ADD-1, ADD-4); "Life in a business school is fast… gym, runs" (SRI-2); case practice "became a socialization thing to just sit" (ADD-1). | Finding (7+) |
| **Behaviour** | Prep is sporadic: no plan, or a plan he doesn't stick to; jumps between domains; prepares broadly because he doesn't know what to focus on. | ROH-3 switched domains when bored; ADD-2 "broad and generic"; ADD-3 "few days you just don't want to do it"; SRI-1 "I could definitely use better time management"; ADD-5 routine "disrupted"; ADD-2 forgot frameworks after a break. | Finding (T7 + T10, ~9) |
| **Knowledge gap** | Doesn't know what interviewers ask or what they're really testing. | SAM-5 Googles generic questions; SAM-4 "tanked" by misreading what was assessed; ROH-5 collects 70 alumni questions; SRI-5 hunts LinkedIn for company questions; SAM-2 asked ChatGPT "what kind of stories should I think about". | Finding (~8) |
| **Story gap** | Hasn't found his stories yet. Can't see which of his experiences matter, or how to tie them to the job. | ROH-2 "people have a very different view of my work"; ROH-1 forgets resume points, picks stale examples; SAM-4 "small small bits and pieces" in every experience; SAM-5 "why this job" narrative "takes some time"; ROH-4 maps projects to each company value; SAM-3 weighs which experience fits the JD. | Finding (T2, 12) |
| **Delivery gap** | When he does speak, the answer runs long or lacks structure. | T1 (16/25): SUR-1, SAM-4, ADD-1 "you just blabber words", ROH-3 40–60 s answers. | Finding |
| **Tools today** | ChatGPT/Claude for questions; friends for mocks; YouTube (often abandoned); notes. | ~22/25 use AI; ADD-2 dropped YouTube ("distracted"); ROH-1 mirror and friends. | Finding |
| **Trigger** | A shortlist, or seeing peers ahead of him. | "Regular practice had definitely helped them up their game and I had fallen behind" (ADD-2); "the fear that comes with the competition" (ADD-1). | Finding |
| **Switch** | A plan made for him that adapts, plus help digging out stories he didn't know he had. | SRI-1 wants accountability "internally"; ADD-1 wished for someone to say "how to go about in a structured way"; SAM-5 sees value in "consolidating your past experience". | Partial |
| **Leave** | Nagging; generic answers; the AI writing his story for him. | SRI-1 "it's not nice to have someone nag you"; SAM-1 AI answers "very general"; SUR-1 "I have never said orchestrating in my life". | Finding |

**Jobs (S3 format)**
- **D-J1 Plan:** **When** placements are weeks away and my week is unpredictable, **I want** a prep plan that fits the time I actually have and adjusts when I miss a day, **so I can** stay consistent without feeling guilty or nagged. (F: a daily plan · E: feel in control, less anxious, SRI-1 · S: don't fall behind peers, ADD-2)
- **D-J2 Discover stories:** **When** I sit down to prepare "tell me about a time…", **I want to** be prompted to dig up experiences from my past I wouldn't think of, **so I can** build a set of real stories that are mine. (ROH-2, ROH-1, SAM-4, SAM-5)
- **D-J3 Tie to the job:** **When** I get a shortlist, **I want to** know which of my stories answers what this role and company will test, **so I can** walk in prepared, not generic. (ROH-4, SAM-3, SAM-5, SAM-1)
- **D-J4 Rehearse with feedback:** **When** I practise an answer, **I want** feedback that points to where it lost the listener, **so I can** fix it before the real interview. (T1, T3: SUR-1, SUR-2, SAM-4, ADD-5)

**How the team's solution maps to the evidence**

| Module (from discussion) | Job | Evidence strength | Watch-out from the interviews |
|---|---|---|---|
| Personalised planner + nudges | D-J1 | Medium (T7 7/25, T10 4/25) | Nudge, don't nag (SRI-1). Must re-plan after a missed day, because breaks are when people fall off (ADD-2). |
| Story-discovery assistant (brainstorm prompts → stories) | D-J2 | **Strong** (T2 12/25) | The AI asks, the user writes. Rewrites get rejected (SUR-1, SUR-2, SUR-3). |
| Tie stories to JD / role | D-J3 | Strong (T2, T9) | Stay with the user's own facts; don't inflate ownership (SUR-3 "led the entire initiative"). |
| Mock + feedback on story presentation | D-J4 | **Strong** (T1 16/25, T3 15/25) | Feedback pinned to a moment, not generic (ADD-5, SUR-2). AI mocks "too easy" (SUR-5). |

**Overlap with A–C:** Abhinav is Kiran's story and delivery pains (A) plus Kabir's momentum and focus pains (B), in someone earlier in their career. Persona A's evidence carries over directly; what's new is the *planner*, which rests on the thinnest evidence (consistency and focus, 7–9 of 25) and has the most competition (calendars, Notion, to-do apps).

**To close the gap before the deck:** run 3–5 quick interviews with final-year undergrads (juniors, siblings, campus contacts). Ask about the *last* time they prepared (S2 Mom Test): did they have a plan, did they stick to it, how did they pick their stories? If they don't confirm sporadic prep and a missing story bank, retarget Abhinav to an *MBA* placement candidate. The evidence above already supports that version.

### Anti-persona: the technical-round grinder

The job is recall and coverage (DSA, system design, GK), not telling one's own story. Already served by LeetCode and upvoted solutions; "sound like everyone else" is no problem in a technical round (SAM-3). We will not design for knowledge recall.

---

## 5. JTBD (S3: When… I want to… so I can…)

### Primary: Kiran

| | Job statement | Functional / Emotional / Social | Evidence |
|---|---|---|---|
| **J1 (core)** | **When** I have a fit interview or mock tomorrow and I've drafted an answer from a team project, **I want to** see exactly where it loses the listener and whether my own decision comes through, **so I can** say it in about two minutes and handle the follow-up without changing the facts. | F: a concise answer with the decision up front. E: walk in confident, not rambling "as a senior professional". S: credible: not inflated, not "standing nearby". | SUR-1, SUR-3, SAM-4, SAM-2, ROH-3, ROH-4 |
| **J2** | **When** I'm asked "why did you move?" or "why this role?", **I want to** connect my past to this role in my own words, **so I can** answer convincingly every time, not just on good days. | F: a "why" narrative. E: same confidence every day. S: sound like me, not like a ChatGPT answer. | SAM-1, SAM-5, ROH-2, SUR-2, SRI-3 |
| **J3** | **When** I've changed an answer after feedback, **I want to** test it on a fresh question, **so I** know the change worked instead of "editing adjectives and feel[ing] productive". | F: a fair before/after test. E: feel I'm improving, not repeating mistakes. | SUR-1, SUR-2, SUR-3, ROH-4, ADD-4 |

### Secondary: Kabir
- **When** placements are weeks away and my case partner is busy, **I want to** run a realistic case that pushes back, **so I can** keep the frameworks fresh without losing a day waiting (ADD-2, SRI-1, SRI-2, ADD-4).
- **When** a mock ends, **I want** feedback on what I said and how I came across that carries over to the next case, **so** each session is clearly better than the last (ADD-3, ADD-4, ADD-5).
- **When** a case lands in an industry I don't know, **I want to** grasp its value chain quickly, **so I can** still give a real recommendation (ADD-1, ADD-2, ADD-4).

### Tertiary: Arjun
- **When** I'm shortlisted by a company I can't reach through alumni, **I want to** know what *this* company and interviewer ask, **so I** don't spend 2–3 days networking or walk in generic (ROH-5, SRI-5, SRI-4).
- **When** I finish a real interview, **I want to** capture what went wrong before it fades, **so the** next interview isn't the practice round (ROH-4, ROH-5).

---

## 6. Which persona to build for (prioritisation, with our build constraint)

S2 says pick by frequency × severity, then reachability and beachhead. Our extra constraint: **one prototype, vibe-coded in 8–10 team-hours, testable within a week.**

| Criterion | A. Kiran (Narrator) | B. Kabir (Case Grinder) | C. Arjun (Off-Campus) |
|---|---|---|---|
| Breadth of evidence | **3**: T1 16/25, T2 12/25 | 3: 10/25, all campus | 2: 6/25 |
| Frequency (per person) | **3**: 2–3 fit sessions a week now (SUR-1, SUR-2) | 3: daily case practice wanted | 2: per interview, spiky |
| Severity (named cost) | 2: 45–90 min rework per story; tanked interviews (SAM-4) | 2: 2 h per session; confidence drops | **3**: burns real interviews; 2–3 days of intel |
| Weak current workaround | **3**: AI rewrites get stripped; peers asleep at midnight | 2: ChatGPT/Claude voice and Nworks are "OK" → crowded | 2: Claude + JD works partly |
| Reachable this week | **3**: our own classmates, placements start early December | 3: same | 1: abroad, working |
| Buildable in 8–10 h | **3**: text or voice in → LLM critique → retry; no data, no network | 1–2: a good case interviewer needs a case bank and multi-turn evaluation; peer matching needs a two-sided network | 1: company question data doesn't exist; we'd need scraping |
| Testable in a week | **3**: fresh-listener test (can they name your decision?) and time to the point | 2: needs several sessions to show progress | 1 |
| **Total (/21)** | **20** | **16–17** | **12** |

**Recommendation: build for Kiran (A), J1 first.** It is the broadest pain, the people are next to us during placements, the mechanism is just an LLM plus a timer (cheap to vibe-code), and the "won't rewrite your story" stance sets us apart from ChatGPT, which the evidence keeps rejecting (SUR-1, SUR-2, SUR-3, SAM-1). B and C are not dropped: J1's core feature (feedback pinned to a moment, then a retry on a fresh question) is also what Kabir wants after a case (ADD-3, ADD-5) and what Arjun wants after a real interview (ROH-4). That makes it a natural V2 path, and worth one line on the value-proposition slide.

**Riskiest assumption to test (S3):** that candidates trust AI feedback on *delivery* of their own story, even though they reject AI *rewrites*. SAM-4 is open to it ("AI would come in handy… I haven't really tried it"), but SAM-4 and SRI-3 doubt AI can read non-verbal cues. That shapes the non-goals: no video or body-language analysis in the MVP.

### MVP sketch this points to (for the MVP slide; not final)
- **In:** pick a common fit question (or paste your own) → speak it (browser speech-to-text) or type it, with a timer → feedback pinned to the exact sentences: when the decision first appears, I vs we, the line where a listener would cut in, claims you'd struggle to defend under a follow-up → **one tough follow-up question** → retry, with before/after shown side by side. No rewriting of the story; it only points and asks.
- **Out (non-goals):** case interviews, peer matching, company-specific question banks, video or non-verbal analysis, GD practice, accounts and sync.
- **Build path:** one-page web app (Lovable / v0 / Cursor) + one LLM API call per step + Web Speech API + localStorage. Roughly 2 h scaffold, 3 h prompt and feedback quality, 2 h retry/compare, 2 h testing with 5 classmates.

---

## 7. Open questions for the team
1. Agree on the merge, especially splitting ROH: Rohan (campus) between A and B, and SAM: Arnav between A and C.
2. Primary JTBD: J1 only for the MVP, or J1 + J2 ("why this role")? J2 adds research about the target role and makes the build harder.
3. Sizing: our only cohort number is a participant's estimate (ADD-4: "approximately 840"). Pull the real batch size before the sizing slide.
