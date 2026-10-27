# तहसील सहायक

हिंदी में अधिकारियों के लिए आय प्रमाण पत्र की समीक्षा। हर शर्त पास या फेल दिखती है। सुझाव नियमों से बनता है। अधिकारी फ़ाइल पर सवाल पूछ सकता है, और स्वीकृति, अस्वीकृति या वापसी खुद दर्ज करता है।

English and Hindi use the same screens. Applicant names stay as stored, because a name is data, not interface text.

## The problem

Tehsil staff in Hindi-speaking states still clear income-certificate files from flat lists. A file stalls because an affidavit is missing, the declared family income does not match the proof, the address on the form does not match the identity proof, or the same person already has another open application. The officer sees that only by reading every page. People need the certificate for scholarships, rations, and scheme benefits. This sample service has a 15-day disposal limit.

**Who it is for:** a reviewing officer (the demo role is तहसीलदार) working a queue of citizen applications. There is no citizen portal. Files arrive as seeded samples.

**Data:** fictional tehsil `डेमो तहसील, ज़िला नमूना`, made-up people, and identity numbers such as `DEMO-ID-1001`. An approved file is watermarked `नमूना — प्रशिक्षण प्रति`. It is not a real certificate.

## What the officer can do

1. Open the day on a prioritized queue: open files, missing documents, a second open application, a near time limit, and decisions recorded today.
2. Open one file and see the facts, the document checklist, and every condition of the scheme marked met or not met, with the specific failure.
3. Read a suggestion (approve, reject, or return) with a reason and a confidence label. The panel says the suggestion is not the decision.
4. Ask a question about that file. The answer uses only the details and conditions already on the page, in the language of the screen.
5. Approve, reject, or return. A note is required for a rejection, a return, or a choice that differs from the suggestion. The officer, time, suggestion, and note are stored. **Decision history** shows those entries. An empty history means nobody has recorded a decision on that file yet.

## The scheme

Service code: `income-certificate`. Department: revenue. These numbers are a training rule book, not a live state rule. They are explicit so the same file always produces the same suggestion.

| Condition | If it fails | Why |
| --- | --- | --- |
| Father or spouse, occupation, both income figures, both addresses, and purpose are filled in | Return | A blank detail can be corrected. |
| Identity proof, address proof, income proof, affidavit, and photo are attached and legible. Bank passbook is optional | Return | A missing or unreadable paper can be sent again. |
| A document with an expiry date is still valid today. The expiry date itself still counts as valid | Return | An expired proof can be replaced. |
| Application address matches the address on the identity proof | Return | A mismatch is an inconsistency to correct, not a refused claim. |
| Declared family income and the proof differ by at most 15 percent | Return | A small gap can be a writing error. A larger gap needs the applicant to explain it. |
| Declared annual family income is at most ₹1,00,000. Exactly ₹1,00,000 still passes | Reject | No added document brings an income above the ceiling inside the scheme. |
| No other open application exists for the same sample identity number | Return | A double entry should be sent back. Rejecting it would throw away a claim that may still be valid. |

Rejection wins over return when both apply. A file that is over the ceiling and also missing a paper is rejected, because fixing the paper would not make the income eligible.

The queue sorts by the severity of the failed condition, then by days left, then by age. The reason on a row is the failure that drives the suggestion, so the officer sees the income breach before a missing paper when both are present.

## Design choices

- **One workflow, Hindi first.** An income certificate is a real tehsil task with a checklist, a numeric ceiling, and a real split between “send it back” and “refuse it.” Hindi is the default (`/hi`). English (`/en`) exists so a second language is a catalog, not a second app.
- **The scheme is a content pack** in `src/content/services/`. The queue, the file page, and the decision bar do not mention income or Hindi. Fields, documents, thresholds, and Hindi/English labels live in the pack and are loaded into the database. A similar certificate is a new pack. The screens stay.
- **Six generic checks, not one income-only script.** Required fields, required documents, expiry, duplicate identity, field comparison, and a numeric threshold live in `src/lib/rules/`. The ceiling and the 15 percent gap are parameters on the income pack. A check these six cannot express is one new module and a test. The numbers are covered by `npm test`, including the exact ceiling and a gap inside 15 percent, both of which must pass.
- **Rules decide. The model explains.** The checklist and the suggested action are computed from the scheme. If `AI_API_KEY` is set, a model may rewrite the two-sentence summary from the failed lines, and it may answer a question from that file’s facts, documents, and conditions. It is told the action the rules already chose and is not allowed to recommend another one. With no key, or when the call fails, the summary is the written template and the question box says an answer is not available. The file opens on that written summary immediately. The model sentence replaces it when the reply arrives, so a slow call does not hold the checklist. The officer still sees every condition.
- **The question stays on the file.** It sits under the checklist so the written conditions remain the record. The server loads the file again for each question. The browser cannot supply its own facts. Earlier questions on that page are sent only so a follow-up can refer to them. They are dropped when they disagree with the file.
- **A note when the officer disagrees.** Approving a file the rules already clear needs no note. A rejection, a return, or any choice other than the suggestion needs at least one sentence, because the history has to show why.
- **SQLite for local use.** Docker is not required to run the console. The Prisma models are ordinary tables plus JSON, so a later hosted Postgres database is a provider and a URL change. Decisions are stored, so a refresh keeps them.
- **Officers belong to departments.** Two seeded accounts sign in with Auth.js credentials. There is no public sign-up. Assignment is in the data from the start, so a second department does not need a new access model.
- **Cache Components is off.** Every screen is the signed-in officer’s live queue. A cached shell would show another officer’s files or a decision that had already changed.

## Run it locally

```bash
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to Hindi.

| Officer | Email | Password |
| --- | --- | --- |
| सीमा यादव, तहसीलदार | seema.yadav@demo.local | Sahayak@2026 |
| राहुल वर्मा, राजस्व निरीक्षक | rahul.verma@demo.local | Sahayak@2026 |

`npx prisma db seed` resets the sample files and clears recorded decisions. `npm test` runs the scheme checks.

The same console is published at [https://helpify-tehsil.netlify.app](https://helpify-tehsil.netlify.app). Sign in with the accounts above.

Copy `.env.example` to `.env` if you do not already have one. The model is optional:

```
AI_API_KEY=...
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL=gemini-3.5-flash-lite
```

`gemini-3.5-flash-lite` is the free Gemini model this console was checked with. A heavier model on the same free quota can sit until the request times out, and the page then keeps the written summary. Restart the dev server after changing `.env`.

## Add a department or a language

- **Language:** add `messages/mr.json` with the same keys as `messages/hi.json`, add `mr` to `src/i18n/locales.ts`, and add an `mr` string on each label in the content pack. Re-seed. Pages do not change.
- **Similar service:** add a pack next to `src/content/services/income-certificate.ts`, export it from `src/content/registry.ts`, and add fictional applications. Re-seed. Use the existing rule codes and set thresholds in `params`.

## Known limitations

- **Free model quota.** The Gemini free tier allows only a few requests a minute. Opening a file (the summary) and each question count toward that quota. When the limit is reached, the call fails or times out. The summary stays on the written conditions, and the question box says an answer is not available yet. The checklist does not change.
- **The model can misread a number.** The question box is told to use only the open file and to say when the file does not contain the answer. It can still phrase a figure poorly. The condition list is the record. The suggestion does not move.
- **Questions are not stored.** They remain on the page until a refresh. Decision history stores only the officer’s approve, reject, or return.
- **One filled scheme, two filled languages.** Hindi and English are wired through. A third language or a second department is the path above. It is not populated in this copy.
- **Database.** Locally, SQLite is a file on this machine (`prisma/dev.db`). The hosted site starts from that same seed. A recorded decision stays only until that server instance is recycled, because the host disk is read-only and there is no shared database.
- **Training data only.** Names, villages, and identity numbers are invented. The certificate watermark says it is a training copy.

## Out of scope

Citizen submission, DigiLocker, real identity checks, and a clerk-versus-tehsildar approval chain. A different approval chain would change the decision step, not the queue or the file layout.
