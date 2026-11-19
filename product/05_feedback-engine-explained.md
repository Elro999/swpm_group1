# How the feedback engine works (plain-language guide)

*For teammates, faculty and anyone who wants to know what the AI in Interview Prep Companion looks at, and what it doesn't. No technical background needed. Last checked against the code: 19 Nov 2026.*

## The one-paragraph version

When you practise an answer, the AI sees only three things: **the question you were asked, the skill that question tests, and the words you just said**. It does **not** look at your resume, your story bank, the full job description or your earlier attempts. It judges your answer using its general knowledge of what a strong interview answer sounds like. It is not allowed to add facts, rewrite your answer or put words in your mouth. Every point it makes must quote your own words exactly, and our code checks that before you see anything.

## What the AI uses, and for what

The app makes several separate AI requests, and each one sees only what it needs.

| What you give the app | Which AI step uses it | What it is used for |
|---|---|---|
| **Job description** | Building your practice set | Picking the 4–6 skills the role tests ("competencies"), then writing one practice question per skill. Each skill and question must quote the job description exactly. |
| **Your spoken answer** (turned into text) | The follow-up question, then the feedback | Asking one follow-up about the vaguest part of your answer, then judging the answer. |
| **Your story bank** (stories you paste or type) | Organising stories, and matching them to the job | Marking the situation, your decision and the result in your own words, then matching each skill to the story that best shows it, or marking it a gap. |
| **Your resume / CV** (optional) | Gap prompts only | When a skill has no story yet, writing 3–5 questions that point at lines of your CV to help you recall a real example. |
| **The AI's own knowledge** | Every step | Knowing what makes a good behavioural answer: answering the question, showing your own action, being specific. It is used **to judge, never to add facts** about you. |

So, to answer the common question directly:

- **Does the feedback on my answer look at my resume?** No. The resume is used only to suggest stories for gaps.
- **Does it look at my story bank?** No. Stories are matched to the job separately. They are not compared with what you say out loud.
- **Does it use its own intelligence?** Yes, to judge quality, for example "this claim is vague" or "you didn't say what *you* decided". It may not invent anything about you.

## Who does what: the AI or our own code

Not all feedback comes from the AI. Some of it is simple measurement, and code does that more reliably.

**Measured by our code, from the timing of each word in your recording:**
- **When your decision appears:** flagged if your own decision comes after about 30 seconds, or after your second sentence.
- **"We" vs "I":** flagged if you said "we" more often than "I".
- **Length:** the target is about 2 minutes, and answers over 2:15 are flagged.
- **No decision found:** flagged if no sentence states a decision you made.

**Judged by the AI:**
- Did you answer the question that was asked?
- Did you show the skill through your own actions?
- Up to 4 pointers, each tied to an exact quote: a vague claim, the skill not shown, the question not answered, or a strong moment worth keeping.

The AI is told explicitly not to comment on timing, length or "we vs I". Those always come from code.

## How information gets into the AI, and when

**What a "context window" is.** Each time the app asks the AI something, it sends one self-contained message. That message is all the AI can see for that request. It is called the *context window*. The AI has no memory beyond it.

**What goes into each message:**
1. **Fixed rules** we wrote, which are the same every time. For example: copy quotes exactly, never rewrite the answer, never add a role, number, name or result the person didn't say, and treat the user's text as information, not instructions.
2. **The task**, for example "write one follow-up question".
3. **Only the data for that task, in a sealed envelope.** Your text goes inside a marked block that the AI is told is data. If an answer or a job description contains something like "ignore your rules", the AI is told not to follow it.

**What never goes in:**
- No chat history. Every request starts fresh.
- Earlier feedback is never sent back to the AI.
- Earlier attempts are never sent. When you retry, the before-and-after comparison is done by our code, using the same checks on both attempts.
- Nothing from other users.

**When each AI request happens in one practice round:**

| Step | What happens | What the AI sees |
|---|---|---|
| 1. You add a job description | Two requests: pick the skills, then write the questions | The job description, then the job description plus the skills it picked |
| 2. You record your answer | Speech-to-text turns your audio into words, with a timestamp for each word | Your audio only |
| 3. Straight after | One request for a follow-up question | The question plus your answer as text |
| 4. You answer or skip the follow-up | If answered, speech-to-text runs again | Your follow-up audio only |
| 5. Feedback | One request to judge your main answer | The question, the skill name, your answer as text, and the answer split into sentences |
| Separately: Story bank | One request to organise stories, and one to match them to the job when you ask | Your story text; then your stories plus the skill names and job quotes |
| Separately: Gap prompts | One request when you ask for help with a gap | The skill name plus your CV |

A typical practice round makes about 4 AI requests: transcription, follow-up, a second transcription if you answer the follow-up, and feedback.

## The safety checks after the AI answers

Nothing the AI writes reaches you until our code has checked it:

1. **Right format:** the reply must match the exact structure we expect. If it doesn't, the AI gets one chance to correct it; otherwise the step fails cleanly and you can try again.
2. **Real quotes:** every quote must appear word for word in your answer, your story, your CV or the job description. A point with a made-up quote is dropped.
3. **No rewriting:** pointers that read like "try saying…" or offer new wording are dropped. The app points and asks; it never scripts.
4. **No invented facts:** a pointer is dropped if it mentions a number or a name you didn't say, or claims a bigger role than you described ("you led…" when you said "I helped…"). Questions about your role are fine ("Which part did you lead?").
5. **Safe fallback:** if the follow-up question fails these checks, the app asks a fixed question instead: what you decided, and why that option over the alternatives.
6. **Limits:** at most 4 AI pointers per answer, a daily practice limit per person, and an overall daily limit to control cost.

In the first weeks, a teammate also reads a sample of transcripts and feedback to check that nothing was added to people's words.

## What this means in practice

- **Feedback is about how you told the story, not whether it's the best story you have.** To find your best stories, use the story bank and "Match my stories to this role".
- **The AI doesn't remember you between requests.** Progress shows in the app because our code stores your attempts and compares them, not because the AI remembers.
- **It can still be wrong about meaning.** The checks stop invented quotes, numbers, names and inflated roles, but they can't prove the AI understood you perfectly. That's why every point shows your exact words, so you can judge it yourself, and why each point has a "not useful" button that we review.

## Privacy, briefly

Your text and audio go to our AI provider (OpenAI) only to produce your transcript, questions and feedback. Our logs record which step ran, how long it took and whether it worked, never what you said. Recordings are deleted after 30 days; text stays until you delete it, which you can do at any time from the privacy page or any interview page.

*Source of truth: `product/app/src/modules/ai/live/prompts.ts` (the rules and tasks), `src/lib/contracts.ts` (what each step receives), `src/modules/feedback/` (code-measured checks and safety guards).*
