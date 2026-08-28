````markdown

\---

name: schedulo-development

description: Develop, debug, refactor, test, and maintain the Schedulo application using its existing React 19 + TypeScript + Vite + Tailwind CSS frontend and Node.js + Express 5 + MySQL backend. Preserve the existing architecture, API contracts, database behavior, authentication, scheduling rules, and UI conventions.

\---



\# Schedulo Development Skill



\## 1. Project Identity



This Skill is specifically for the Schedulo-Individual project.



Repository structure:



\- `Front\_end/` = React frontend

\- `Back\_end/` = Node.js/Express backend



Do not replace the existing architecture with another framework unless the user explicitly requests it.



The current stack is:



\### Frontend



\- React 19

\- TypeScript 5.8

\- Vite 6

\- Tailwind CSS 4

\- `@tailwindcss/vite`

\- Lucide React

\- Motion

\- Google GenAI SDK

\- Node.js tooling

\- TSX test runner



\### Backend



\- Node.js

\- Express 5

\- CommonJS

\- MySQL

\- `mysql2/promise`

\- bcryptjs

\- cors

\- dotenv



\---



\# 2. Mandatory Rules



Before changing code:



1\. Inspect the relevant files first.

2\. Understand the existing implementation and data flow.

3\. Identify the actual root cause before modifying code.

4\. Reuse existing architecture and utilities.

5\. Keep changes focused on the requested problem.

6\. Do not rewrite unrelated code.

7\. Do not introduce a new library when the existing stack can solve the problem.

8\. Do not silently change API response structures.

9\. Do not silently change database column meanings.

10\. Do not remove existing functionality to make an error disappear.



When uncertain about the behavior of an existing feature, inspect the surrounding code before making assumptions.



\---



\# 3. Repository Structure



Treat these directories differently:



```text

Schedulo-Individual/

├── Back\_end/

│   ├── index.js

│   ├── package.json

│   ├── .env

│   ├── image/

│   └── CV/

│

└── Front\_end/

&#x20;   ├── src/

&#x20;   ├── tests/

&#x20;   ├── package.json

&#x20;   ├── tsconfig.json

&#x20;   ├── vite.config.ts

&#x20;   └── index.html

````



Do not mix frontend and backend responsibilities unnecessarily.



\---



\# 4. Frontend Rules



\## 4.1 Framework



The frontend uses React 19.



Use React components and hooks.



Do not introduce:



\* Vue

\* Angular

\* Svelte

\* Next.js

\* Nuxt

\* server-side React architecture



unless explicitly requested.



\---



\## 4.2 TypeScript



Use TypeScript for new frontend code whenever appropriate.



Respect:



\* ES2022

\* ESNext modules

\* React JSX transform

\* Vite bundler resolution

\* `noEmit: true`



Avoid unnecessary `any`.



Prefer explicit interfaces/types for:



\* API responses

\* user objects

\* schedule objects

\* registration requests

\* admin data

\* form state



\---



\## 4.3 React Components



Before creating a new component:



1\. Search existing components.

2\. Check whether an existing component can be reused.

3\. Follow the project's established naming and folder structure.



Do not duplicate an existing component.



Keep components focused.



Separate:



\* UI rendering

\* API calls

\* business logic

\* reusable utilities



when the existing architecture already supports such separation.



\---



\# 5. Styling Rules



The project uses Tailwind CSS 4.



Prefer existing Tailwind classes and existing styling patterns.



Do not introduce:



\* Bootstrap

\* Material UI

\* Ant Design

\* Chakra UI

\* another CSS framework



unless explicitly requested.



When modifying UI:



1\. Preserve the existing visual language.

2\. Preserve existing responsive behavior.

3\. Preserve existing spacing and typography where possible.

4\. Reuse existing Tailwind patterns.

5\. Avoid unnecessary redesign.



Do not change colors, spacing, layout, typography, or responsive behavior unless the task requires it.



\---



\# 6. Icons and Animation



The project uses:



\* `lucide-react`

\* `motion`



Use existing icon and animation libraries rather than adding alternatives.



Do not introduce another icon package just for convenience.



Do not add animation when a simple transition is sufficient.



\---



\# 7. Backend Rules



\## 7.1 Framework



The backend is Node.js + Express 5.



Use:



```javascript

const express = require("express");

```



and CommonJS conventions already used by the project.



Do not convert the project to:



\* Laravel

\* NestJS

\* Fastify

\* Django

\* Spring

\* another backend framework



unless explicitly requested.



\---



\# 8. Database



The backend uses MySQL through:



```javascript

mysql2/promise

```



The application currently uses a MySQL connection pool.



When working with database code:



1\. Inspect the relevant queries.

2\. Inspect affected tables and relationships.

3\. Verify actual column names.

4\. Check unique constraints.

5\. Check foreign-key assumptions.

6\. Check nullability.

7\. Check date/time handling.



Use parameterized queries.



Prefer:



```javascript

connection.execute(...)

pool.execute(...)

```



with parameters.



Never construct SQL using direct user-provided string interpolation.



\---



\# 9. Date and Time



Date handling is important in Schedulo.



The backend intentionally uses MySQL date strings to avoid accidental timezone conversion.



Preserve this behavior.



When changing scheduling logic:



1\. Check the source date.

2\. Check server timezone assumptions.

3\. Check database DATE/DATETIME handling.

4\. Check frontend date parsing.

5\. Check whether a date can shift by one day.



Do not introduce automatic UTC conversion without understanding the existing behavior.



\---



\# 10. Authentication



Authentication currently includes:



\* email/password login

\* password hashing with bcryptjs

\* user status

\* user role

\* registration workflow



Relevant concepts include:



\* `admin`

\* `collaborator`

\* `active`

\* `pending`

\* `disabled`

\* `rejected`



When modifying authentication:



1\. Inspect login API.

2\. Inspect registration API.

3\. Inspect password validation.

4\. Inspect status handling.

5\. Inspect role handling.

6\. Inspect frontend login state.

7\. Verify API response compatibility.



Never weaken authentication or authorization logic to make a test pass.



\---



\# 11. Registration and Approval Workflow



Schedulo has a collaborator registration workflow.



Important states include:



```text

pending

active

disabled

rejected

```



When working on registration:



Trace the complete flow:



```text

Frontend form

&#x20;   ↓

API request

&#x20;   ↓

Validation

&#x20;   ↓

Database transaction

&#x20;   ↓

users

&#x20;   ↓

user\_profiles

&#x20;   ↓

attachments

&#x20;   ↓

API response

&#x20;   ↓

Frontend state

```



For approval/rejection features, inspect:



\* registration request

\* current user status

\* admin review

\* rejection behavior

\* re-registration behavior

\* admin notes

\* approval metadata



Do not fix a registration issue only from the frontend when the real problem is backend/database logic.



\---



\# 12. Scheduling Domain Rules



Scheduling is a core business domain.



Whenever modifying schedule functionality, inspect:



\* collaborator eligibility

\* account status

\* approved/pending status

\* date range

\* week boundaries

\* duplicate registrations

\* conflicting schedules

\* shift availability

\* current week

\* historical schedules

\* schedule updates

\* cancellations

\* admin aggregated schedule

\* changes made during the same week



Always check both:



1\. the individual collaborator schedule

2\. the Admin aggregated schedule



A change to one may affect the other.



\---



\# 13. API Workflow



When changing an API endpoint:



1\. Find the route.

2\. Find the handler.

3\. Trace database queries.

4\. Identify the response structure.

5\. Search the frontend for every consumer.

6\. Update consumers only when necessary.

7\. Verify error handling.

8\. Verify HTTP status codes.



Do not change:



```json

{

&#x20; "id": "...",

&#x20; "status": "...",

&#x20; "message": "..."

}

```



or other response fields casually.



Search for all usages before renaming a field.



\---



\# 14. Error Handling



Do not treat the displayed error message as proof of the root cause.



For every bug:



```text

UI error

↓

Frontend request

↓

HTTP status

↓

Backend endpoint

↓

Validation

↓

Database query

↓

Database state

↓

Returned response

```



Trace the entire chain.



When an API returns an error:



\* inspect actual HTTP status

\* inspect response body

\* inspect backend error

\* inspect database error when applicable



Do not hide real backend errors with generic frontend messages.



\---



\# 15. Transactions



For operations that modify multiple related tables:



\* inspect whether a database transaction is already used

\* preserve transaction boundaries

\* rollback on failure

\* release the connection



Do not partially update related records.



For registration and account workflows, consistency between `users` and `user\_profiles` is important.



\---



\# 16. File Uploads



The backend currently stores uploaded files in:



```text

Back\_end/image/

Back\_end/CV/

```



Existing public paths include:



```text

/image

/CV

```



When modifying file handling:



1\. Preserve existing directories.

2\. Preserve existing public URL behavior.

3\. Validate file metadata where appropriate.

4\. Avoid accidentally deleting old files.

5\. Check database references after changes.



Do not replace the existing file-storage mechanism without explicit instruction.



\---



\# 17. Environment Variables



Respect existing `.env` usage.



Important backend configuration includes concepts such as:



```text

PORT

DB\_HOST

DB\_PORT

DB\_USER

DB\_PASSWORD

DB\_NAME

FRONTEND\_ORIGIN

```



Never hardcode database credentials.



Never commit secrets.



Do not expose `.env` values in logs, responses, screenshots, commits, or generated code.



\---



\# 18. Vite and Frontend Development



The frontend uses Vite.



Current development command:



```bash

npm run dev

```



The configured frontend development server uses port:



```text

3000

```



When debugging Vite problems:



1\. inspect `vite.config.ts`

2\. inspect `package.json`

3\. inspect module imports

4\. inspect TypeScript configuration

5\. check browser console

6\. check network requests



Do not replace Vite configuration with another bundler.



\---



\# 19. Testing



The project currently uses TSX for tests.



Test command:



```bash

npm run test

```



TypeScript check:



```bash

npm run lint

```



Build:



```bash

npm run build

```



When fixing bugs:



1\. Run the smallest relevant verification first.

2\. Run TypeScript validation.

3\. Run tests when available.

4\. Run a production build for changes affecting build-time behavior.

5\. Review modified files.



Do not claim a bug is fixed if the affected behavior was not verified when verification is possible.



\---



\# 20. Debugging Procedure



Use this workflow for all non-trivial bugs.



\## Step 1 — Reproduce



Determine:



\* expected behavior

\* actual behavior

\* exact error

\* affected role

\* affected route

\* affected API



\## Step 2 — Locate



Find:



\* UI component

\* API call

\* backend endpoint

\* database query

\* relevant state



\## Step 3 — Trace



Trace the data from:



```text

User action

→ React

→ API

→ Express

→ MySQL

→ Express response

→ React state

→ UI

```



\## Step 4 — Root Cause



State the concrete root cause internally before editing.



\## Step 5 — Minimal Fix



Change only what is necessary.



\## Step 6 — Regression Check



Check nearby behaviors.



\## Step 7 — Verify



Run relevant checks/tests/build.



\---



\# 21. Code Modification Rules



Before editing:



\* search before creating

\* inspect before replacing

\* reuse before duplicating



Prefer minimal patches.



Avoid large rewrites.



Do not rename public APIs without checking consumers.



Do not rename database columns casually.



Do not remove existing functionality unless explicitly requested.



Do not change package versions unless necessary.



Do not add dependencies unless existing dependencies cannot reasonably solve the requirement.



\---



\# 22. Git Safety



Before making broad changes:



Check:



```bash

git status

```



Review the diff after editing.



Avoid modifying unrelated files.



Do not reset or delete the user's existing work.



Do not force-push.



Do not rewrite Git history unless explicitly instructed.



\---



\# 23. PowerShell / Windows



The primary development environment may be Windows PowerShell.



Prefer commands that work correctly in PowerShell.



Examples:



```powershell

cd Front\_end

npm install

npm run dev

```



and:



```powershell

cd Back\_end

npm install

npm run dev

```



Do not assume Unix-only shell syntax is available.



When giving commands, prefer PowerShell-compatible syntax unless the user is clearly using another shell.



\---



\# 24. Common Schedulo Debugging Priorities



When the issue concerns:



\### Login



Check:



```text

email

password

bcrypt comparison

user status

user role

API response

frontend session/state

```



\### Registration



Check:



```text

email uniqueness

phone

users

user\_profiles

status

transaction

attachments

duplicate records

re-registration

```



\### Admin approval



Check:



```text

registration request

current status

admin action

database update

approval metadata

frontend refresh

```



\### Schedule registration



Check:



```text

user status

approval status

date

week

duplicate registration

conflict

database insert

API response

frontend state

```



\### Admin aggregated schedule



Check:



```text

individual schedule

current week

historical data

updated schedule

cancelled schedule

query filters

date boundaries

frontend aggregation

```



\---



\# 25. UI Bug Rules



For UI bugs:



1\. Inspect the component.

2\. Inspect props/state.

3\. Inspect API data.

4\. Check conditional rendering.

5\. Check loading state.

6\. Check empty state.

7\. Check error state.

8\. Check responsive layout.

9\. Check whether CSS/Tailwind classes are overridden.



Do not assume a visual issue is caused by CSS alone.



\---



\# 26. API + Frontend Contract



Whenever an API response changes, search the entire frontend for:



\* property names

\* destructuring

\* TypeScript interfaces

\* conditional rendering

\* state updates

\* filters

\* tables

\* forms



Example:



If backend changes:



```javascript

status

```



to:



```javascript

account\_status

```



search every consumer before applying the change.



\---



\# 27. Performance



Do not optimize prematurely.



Prefer correctness first.



When performance problems are reported:



1\. identify the actual bottleneck

2\. inspect database query count

3\. inspect unnecessary frontend renders

4\. inspect repeated API requests

5\. inspect large payloads

6\. make targeted improvements



Do not add caching or complex architecture without evidence that it is needed.



\---



\# 28. Security



Always preserve:



\* parameterized SQL

\* password hashing

\* environment variable protection

\* authentication checks

\* authorization checks

\* safe error handling

\* input validation



Never:



\* expose passwords

\* log secrets

\* interpolate untrusted input into SQL

\* return sensitive database details unnecessarily

\* bypass role/status checks



\---



\# 29. Final Verification Checklist



Before finishing a coding task:



\* \[ ] Root cause identified

\* \[ ] Existing architecture preserved

\* \[ ] No unnecessary dependencies added

\* \[ ] API contracts preserved

\* \[ ] Database behavior preserved

\* \[ ] Authentication/authorization preserved

\* \[ ] Date/time behavior checked

\* \[ ] Related frontend consumers checked

\* \[ ] Relevant tests run

\* \[ ] TypeScript validation run when appropriate

\* \[ ] Build run when appropriate

\* \[ ] Diff reviewed

\* \[ ] No unrelated files changed



\---



\# 30. Final Response Requirements



When finishing a task, report:



1\. What was changed.

2\. Root cause.

3\. Files changed.

4\. Verification performed.

5\. Any remaining issue or limitation.



Do not claim successful verification if a command could not be run.



Be precise and technical.



Most importantly:



\*\*Understand the existing Schedulo codebase before changing it.\*\*

\*\*Fix the root cause, not only the visible symptom.\*\*

\*\*Preserve the existing architecture and business logic.\*\*



```

```



