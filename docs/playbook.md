# Universal App Build Playbook (Fork Edition), v2.2

v2.2 adds fixes from two reviews of v2.1: an audit trail gate, safeguards for live smoke tests, and lever settings that always resolve to Full, Compromise, or Bypass. Section 12 lists every change since v1 and why.

A playbook for getting app projects running fast without breaking them. It works for hackathon demos, internal tools, customer products, and regulated pilots. The core rules never change. The methods do, depending on the project. This document names the decisions where methods diverge (the forks), gives the options at each fork, and says which option usually wins under which conditions.

---

## 0. How to use this

1. Fill in the Project Profile (Section 1).
2. Walk the forks (Section 3). Pick one option per fork, or start from a recipe (Section 4) and adjust.
3. Set the release profile (Fork 13) and list the gates that apply (Section 6). The gate table is the only authority on release requirements.
4. Set the Speed Controller (Section 11). Pick a preset or your own settings, then work out the effective settings with the rule in 11.3. The review in step 5 checks them and can recommend changes.
5. Run the AI review of the plan (Section 7).
6. Run the feasibility spike, then Phases 1 to 6 (Section 5).

Steps 1 to 5 are the planning half of Phase 0. The feasibility spike is the second half and comes before Phase 1. If the spike changes the plan, rerun the review.

When in doubt, choose the lighter option and add weight when a real risk appears. Process that doesn't match the risk wastes time on small projects and leaves gaps on large ones.

### Quick start (solo builders)

1. Write a short brief: the app in one sentence, who will rely on it, what live actions it can take, the deadline, data sensitivity, the riskiest dependency, and the demo script.
2. Pick the closest recipe (Section 4). It sets your forks, release profile, and speed preset.
3. Check the profile against Fork 13. Real users, real data, real recipients, or real money make it a Pilot, however few.
4. List the gates for that profile from the summary in Section 6.
5. Write the speed card (11.7): the preset, any overrides, and a note for each bypass. Work out the effective settings with the rule in 11.3.
6. Run the Section 7 review and the feasibility spike (Phase 0), then build.

Treat the full forks and the lever tables (11.4) as a reference for when a default doesn't fit.

---

## 1. Project Profile

| Question | Your answer |
|---|---|
| What is the app, in one sentence? | |
| Who uses it, and how many people? | |
| What is the hard deadline, and what must exist on that date? | |
| What does a successful demo or launch look like? Write the script. | |
| What must a real user be able to accomplish? | |
| What data does it touch, and how sensitive is it? | |
| What actions can it take that are irreversible or costly (money, messages to people, deleting records)? | |
| What is the riskiest external dependency (a provider API, an offline sync, a store review, a platform rule)? | |
| How many humans and how many parallel agents will work on it? | |
| What platforms must it run on? | |
| What rules can't be broken (legal, contractual, platform terms)? | |

The demo or launch script says what to show. The real-user question says what must actually work. Both matter.

---

## 2. Core rules (apply to every project)

- **Set release requirements from risk.** Who relies on the app, what data it handles, and what its actions can affect decide the release requirements. If an applicable gate cannot pass by the deadline, reduce what the release exposes or does, or record an exception where Section 6 allows one. Never skip a gate silently.
- **Define the contracts before the code.** Data shapes, API inputs and outputs, and state changes are written down before anyone builds on them. Every project gets at least a shared types or schema file, written in the first hour, even if the project is solo.
- **One owner per area.** A person or agent owns each folder or module at a time. Nobody edits another owner's area without asking. Areas depend on each other only through shared contracts, never by importing from another area's folder, which also keeps each agent's reading scope small.
- **Serialize schema migrations.** One owner applies migrations in a single sequence, and they never run in parallel across slices. When old and new code can run at the same time, each migration also follows expand-and-contract.
- **Don't change dependencies without approval.** Agents do not add, upgrade, or remove packages (package.json, requirements.txt, Cargo.toml, lockfiles) without explicit human sign-off.
- **Every change is verified.** Automated checks run on every change. Nobody weakens a check to make it pass. A failing check blocks the change.
- **Trade time openly.** The Speed Controller (Section 11) can shrink a time-consuming practice, or skip it with a written reason, but never below a floor. Skipping without a note isn't allowed.
- **Humans judge risk, machines do volume.** Routine changes can merge on green checks. Sensitive areas need a human.
- **Build the demo path first.** The thinnest working version of the main user journey comes before anything else.
- **Separate "done" from "delivered."** A state change is not the same as an external effect (a message sent, a charge made). Track them separately and reconcile them when they disagree.
- **Authorize on the server.** Identity comes from the verified platform context, never from a field the client sends. Hiding a button is not access control.
- **Write down what you skipped.** Every shortcut and every bypass note goes in a known-limitations list in the release notes.

---

## 3. The Forks

Choose one option per fork. Each fork lists when each option wins and a default.

### Fork 1: Project shape

| Option | Choose it when | Implications |
|---|---|---|
| **A. Demo or hackathon** | Judged or shown once, then retired | Thin spine, synthetic data, Demo profile |
| **B. Internal tool** | Used by your team, changes often | Medium spine, real auth, basic monitoring |
| **C. Customer-facing product** | Strangers pay or sign up | Full spine, full verification, release gates |
| **D. Library or API** | Other developers depend on it | Strict versioned contracts, heavy compatibility tests |
| **E. Data or analytics** | Mostly pipelines and dashboards | Data quality checks and metric definitions matter most |
| **F. Mobile or offline** | Must work without a connection, or ships through app stores | Offline tests, device testing, store review time in the schedule |

Shapes can combine. Pick the closest primary shape, then apply the implications of any others that also fit, such as C plus F for a customer app that must work offline.

**Default:** A if the deadline is under a month and the audience is judges. Otherwise, match the closest user type.

### Fork 2: Time horizon

| Option | Choose it when | Implications |
|---|---|---|
| **Sprint (days)** | Hackathon, prototype, pitch | Micro-spine plus demo-path slices with fakes |
| **Build (weeks)** | Internal tool or first version | Spine for the demo path plus core entities, rest added as slices |
| **Product (months)** | Ongoing product | Full spine, migrations under a sequencing owner, observability from the start |

**Default:** Sprint if the deadline is inside two weeks.

### Fork 3: Team and agent structure

| Option | Choose it when | Implications |
|---|---|---|
| **Solo, single agent** | One person, small scope | One builder session per slice, separate test pass, sequential work with checkpoints |
| **Solo, parallel agents** | One person, slices that don't overlap | Separate checkout, branch, and fresh session per slice, one owner per branch, merge one at a time |
| **Small team, humans plus agents** | 2 to 6 people | Owner per folder, a human owns each sensitive area, agents take slices |
| **Multi-team with integrator** | Larger team, many surfaces | Full ownership map, merge queue, integrator role, contract change requests |

**Default:** Solo, single agent, unless the scope has at least three independent surfaces.

**Session rule for agents:** One slice means one fresh agent session, started from the slice card and the repo's current state. Long sessions accumulate stale context and drift. This is the Full setting of Speed lever B5 (Section 11), which can relax it outside sensitive paths.

**Isolation for parallel agents:** Each agent gets its own checkout (a worktree or a clone) and its own runtime: separate ports, its own database schema or container, its own queues, and its own local storage. Separate checkouts alone still let two test runs collide on a shared port or database. Tear the runtime down when the slice merges.

**Circuit breaker:** After three failed verify runs in a row on the same slice, the agent stops, writes a checkpoint of what it tried, and hands the slice to a person or a fresh session. Three is the default, and the speed card can set another number.

### Fork 4: Data sensitivity

| Option | Choose it when | Implications |
|---|---|---|
| **Synthetic only** | Public demos, judging, learning | Generated fixtures. Scan for accidental real data before any push. |
| **Internal, non-personal** | Business data, no individuals identifiable | Access controls, a list of data sources |
| **Personal data** | Names, contact details, addresses, IDs | Data minimization, consent, deletion path, review of every third party that receives data |
| **Regulated** | Health, payments, minors, legal, government | Named compliance owner, legal review, encryption, audit trails. Real data never enters a demo, repo, fixture, log, or screenshot outside a controlled environment. |

**Default:** Synthetic only. Moving up a level requires sign-off from whoever owns the data.

### Fork 5: Exposure

Source visibility and data location are separate decisions. A public repo can talk to a private service that holds sensitive data. Choose each one.

**5a. Source visibility**

| Option | Choose it when | Implications |
|---|---|---|
| **Private** | Default until release | Standard access controls |
| **Public** | Open source, hackathon submissions that require it | Secret scan before every push. Assume every commit is permanent and public. Rotate anything that leaked. |

**5b. Service and data location**

| Option | Choose it when | Implications |
|---|---|---|
| **Local or demo environment only** | Demos, fixtures | No live credentials. No real data. |
| **Hosted, internal users** | Team tools | Real auth, separate preview and live credentials |
| **Hosted, external users** | Customer products | Abuse protection, rate limits, terms of service, data map (see Section 6) |

**Default:** Private source, local or demo service, until release. Scan for secrets before any public push.

### Fork 6: Spine depth

The spine is the shared foundation: contracts, design primitives, and app shell.

| Option | Choose it when | Implications |
|---|---|---|
| **Micro-spine** | Solo builds, any sprint | One shared types or schema file written in the first hour, read by every session. No fakes required. |
| **Thin spine (demo path)** | Sprint or demo with a team | Contracts and fakes for the demo path only |
| **Full spine** | Product, multiple teams starting in parallel | All entities, endpoints, and state machines before parallel work starts |

**Default:** Micro-spine always, thin spine for team sprints, full spine only when several teams start before the core shape is known.

**Time box the spine.** If the spine takes more than about one working day, the scope is too big. Cut it to the first milestone (Section 5, Phase 1).

### Fork 7: Contracts, state, and migrations

| Option | Choose it when | Implications |
|---|---|---|
| **Schema only** | Simple data, no lifecycle | Types and validation at boundaries |
| **Schema plus state machine** | Entities move through stages (orders, requests, approvals, bookings) | One transition function. Invariants written and tested. Shortcuts blocked. |
| **Schema plus state machine plus concurrency controls** | Concurrent or replayed operations could break a business rule, such as two bookings for one slot | Atomic writes, constraints, version checks, or locks. Tested with concurrent and replayed requests. |

**Every option, migrations:** One owner applies schema changes in a single sequence, and two slices never generate migrations at the same time. When old and new code can run at the same time, such as during a rolling deploy, each migration also uses expand-and-contract (add the new shape, move consumers, remove the old) so both versions keep working.

**Interlock with Fork 10:** If an entity has a state machine and a side effect, the pending side effect record is written in the same atomic transaction as the state change. Never fire the side effect from memory after the write.

**Default:** Schema plus state machine for any entity with a lifecycle. Concurrency controls when concurrent or replayed operations could break a business rule.

### Fork 8: Integration

| Option | Choose it when | Implications |
|---|---|---|
| **Direct commits to main** | Solo, fast, low risk | Fastest. Rely on tests and quick reverts. |
| **Branch per slice, strict up-to-date merges** | Parallel work, no merge queue | Each branch is current with main before it merges. One merge at a time. |
| **Merge queue** | Team, many changes per day | Each change is tested on top of everything ahead of it. Confirm your plan and repo type support it. |
| **Trunk-based with feature flags** | Continuous deploy, unfinished work live | Ship everything, hide unfinished work behind flags. Flags get cleaned up. |

These can combine. For example, trunk-based development can run through a merge queue.

**Default:** Branch per slice with strict merges. Direct commits only for solo, low-risk work. Merge queue only when a team exists to need it.

**Verify the merged result.** Test the revision that will actually land, not only the branch.

### Fork 9: Verification

| Option | Choose it when | Implications |
|---|---|---|
| **Lint, typecheck, unit tests** | Every project, the minimum | Always on |
| **Plus end-to-end demo walk** | Anything with a demo or user journey | Walks the demo script on every merge |
| **Plus visual screenshot gate** | UI people judge by looking | Baseline screenshots, diffs on change, a reviewer checks flagged ones |
| **Plus accessibility checks** | Any user-facing UI | Automated checks plus keyboard and screen-reader review of the main journey. Automated checks alone don't establish conformance. |
| **Plus property-based and model-based tests** | Lifecycles, money, scheduling, anything with rules over time | Random event sequences checked against invariants |
| **Plus AI evaluations** | The product includes AI features (classification, extraction, search, agents) | A versioned golden dataset of inputs and expected outputs, scored on each model or prompt change. Deterministic tests can stay green while accuracy drops. Hard safety checks (permissions, privacy, unsafe tool use) pass or fail on their own and are never averaged into the score. |
| **Plus separate test author** | An agent writes both code and tests | A different agent or person writes acceptance tests from the spec, before the builder starts |
| **Plus external review** | High stakes, public launch | Independent reviewer reads the spec and the result |
| **Plus failure injection** | Anything with external dependencies | Timeouts, rate limits, partial failures, expired auth. The app degrades visibly and recovers. |

**Default:** Minimum, plus the end-to-end walk. Add the rest by fork choice and the gate table. This fork decides which checks are in scope. The Speed Controller (Section 11) sets how deep and how often each one runs.

### Fork 10: Side effects and money

| Option | Choose it when | Implications |
|---|---|---|
| **None** | Pure computation, local tools | No extra design |
| **Outbound messages** (email, SMS, notifications) | The app contacts people | Idempotency keys. Delivery status tracked separately from state. Failures visible to a person. |
| **Money or irreversible actions** | Payments, deletions, legal actions | Human approval per action, or a bounded, revocable policy for routine recurring actions, with individual approval for exceptions. Transactional outbox. Audit log. Agents cannot trigger these directly. |

**Reconciliation test for external effects:** Simulate the provider accepting the request while the app loses the response (a crash, a timeout). The app must recover without a duplicate effect. A retry with the same idempotency key is a valid recovery when the provider documents that guarantee. Otherwise, the app reconciles the outcome with the provider, or sends it to review, before acting again. A retry with neither is a failure. The test is required before any effect reaches real people or real money (Section 6) and recommended for demos.

**Duplicate handling:** A user can double-click and a client can retry. Idempotency keys must be enforced in durable storage, not in memory. An outbox can still deliver duplicates, so consumers must be idempotent too.

**Recurring actions:** Allowed under an explicitly approved policy with limits and a way to revoke it. Individual human approval is reserved for exceptions and high-impact actions.

**Operator controls for real-user releases:** An operator can pause new effects, restore important data, and see actions already in flight.

**Default:** Idempotency keys from day one for outbound messages. Money and irreversible actions need human approval, either per action or through a bounded, revocable policy for routine recurring ones.

### Fork 11: Identity and access

| Option | Choose it when | Implications |
|---|---|---|
| **Single user, no auth** | Demo, personal tool | Marked clearly as demo-only |
| **Platform identity** | Runs inside a host platform (a work tool, a chat platform, a cloud account) | Use the platform's verified identity. Never trust a user ID from the request body. |
| **Own accounts** | Standalone product | Use a proven auth provider. Don't write your own. Role checks on the server. |

**Authorization tests:** Unauthenticated and unauthorized requests are denied on every protected read and write, at the resource and tenant level. Reads include search, export, download, and agent tools. Required for Pilot and Production (Section 6).

**Default:** Platform identity when the host provides it. Otherwise, a proven auth provider.

### Fork 12: Agent permissions

Two kinds of agents need separate rules.

**12a. Coding agents** (they write the app)

| Option | Choose it when | Implications |
|---|---|---|
| **Scoped builder** | Most projects | Writes only in its owned folder. Can't change CI, release config, or dependencies without approval. Gets a fresh session per slice. |
| **Supervised builder** | Sensitive areas (auth, payments, data, migrations) | A human reviews every change in these paths |

**12b. Product agents** (they run inside the shipped app)

| Option | Choose it when | Implications |
|---|---|---|
| **Suggest only** | Sensitive domain, early product | Reads and proposes. A human approves every change. |
| **Act within limits** | Routine, reversible tasks | Explicit allow-list of actions. Each action checked in the service layer, not in the prompt. Limits on cost and volume. |
| **Act broadly** | Internal experiments only | Full audit log, kill switch. Never customer-facing. |

**Rules for both:**
- Enforcement lives in code: service-layer checks and allow-lists. Prompts are guidance, not a boundary.
- Agent tool input schemas reuse the spine's contract schemas. The model writes arguments at runtime, so each call's actual arguments are parsed and validated before it runs, and the caller's permissions are checked separately.
- Documents, web pages, and tool results are treated as data, never as instructions that expand the agent's permissions.
- An "internal" agent whose tools can reach real users or real data is treated as customer-facing.

**Default:** Scoped builder for coding agents, suggest-only for product agents until their suggestions prove accurate.

### Fork 13: Release profile

The profile names the level of readiness. The gate table in Section 6 defines what each profile requires. This fork only chooses the profile.

| Profile | Use when |
|---|---|
| **Demo** | Hackathon, prototype, or pitch, with synthetic data, sandbox credentials, test funds, and controlled recipients only |
| **Pilot** | Real users, real data, real recipients, or real money, in a limited scope |
| **Production** | Public, paying, or regulated at scale |

**Default:** Demo when the app will only be shown, not used. Pilot from the moment real users, real data, real recipients, or real money are involved, however few. A small pilot still carries every gate its data and actions trigger. A deadline changes the scope, not the profile (Core rules). Name the profile in the README.

---

## 4. Recipes (starting points)

Each recipe is a set of default fork choices and a speed preset (Section 11). Start here, then change what doesn't fit. Every recipe also includes the micro-spine, the Core rules, and every gate that applies to its profile (Section 6).

**Recipe A: Hackathon sprint (2 to 3 weeks)**
Shape A. Sprint. Solo or small team. Synthetic only. Public source, local demo service. Micro-spine plus thin spine for team builds. Schema plus state machine. Branch per slice with strict merges. Verification: lint, typecheck, unit tests, end-to-end demo walk. Demo profile. Speed: 4 (Fast).

**Recipe B: Solo weekend build**
Shape A or B. Sprint. Solo, single agent per slice. Synthetic only. Private source until submission. Micro-spine. Schema only. Direct commits. Verification: lint, typecheck, unit tests, and a recorded main-journey walk before release. Demo profile until someone relies on it. Speed: 5 (Max).

**Recipe C: Internal team tool (1 to 2 months)**
Shape B. Build. Small team. Internal non-personal data. Private source, hosted for internal users. Thin spine, growing. Schema plus state machine. Branch per slice with strict merges. Verification: lint, typecheck, unit tests, end-to-end walk, accessibility checks, failure injection on external dependencies. Pilot profile. Speed: 3 (Balanced).

**Recipe D: Customer-facing product with payments or messages**
Shape C. Product. Multi-team. Personal data. Private then public. Full spine. Schema plus state machine plus concurrency controls. Merge queue if a team exists. Verification: all of the above plus AI evaluations if applicable, and the external-effect reconciliation test. Production profile. Speed: 2 (Careful).

**Recipe E: Regulated pilot (health, finance, minors)**
Shape C. Build. Small team with a named compliance owner. Regulated data. Private source, hosted with controlled data. Full spine. Schema plus state machine plus concurrency controls. Strict merges. Verification: everything in Recipe D plus a separate test author and external review. Pilot or Production profile. Speed: 1 (Strict). Legal review before any real data is used. Work out which obligations apply to this project, since the playbook routes the work but doesn't define them. Pick a recognized verification standard, such as OWASP ASVS, and record the level you target.

---

## 5. Phases

Scale each phase to the forks you chose.

**Phase 0: Plan and feasibility (1 to 4 hours, human-led)**
Planning half, which is steps 1 to 5 in Section 0: write the Project Profile and the demo script, choose the forks, set the release profile and gates, write the speed card, and run the AI review. List out-of-scope items. Get sign-off on data sensitivity.
Feasibility half: run a spike on the riskiest external dependency from the Profile. Call the real provider API, test the offline sync on a device, check the store submission rule, or confirm the platform allows what you plan. If the spike fails, change the plan and rerun the review before building on it. Reconfirm it at release. Speed lever P2 sets how far the spike goes.

**Phase 1: First milestone (time box to one working day)**
Build the micro-spine, the app shell, the quality bar (lint, typecheck, first tests, CI), and the riskiest shared boundary working end to end, with the contracts the next slices actually need. For full-spine projects, add the entities and state machines. Ship as one PR. A human reads it.
Gate: the app runs end to end on fake or demo data, and every placeholder route renders.

**Phase 2: Build (parallel or sequential, per Fork 3)**
Each slice is one user-visible capability that merges on its own, sized to finish in one session. Each slice gets a card with: scope, owned folders, contracts it uses and provides, acceptance tests (written before building), states (default, loading, empty, error, no permission), dependency rule ("no new dependencies without approval"), and a size limit. Speed levers P3 and B1 set how much of the card to fill in and when the tests get written.
Migrations go through the migration owner (Fork 7). Dependency changes need sign-off.
Before an agent session starts, give it a slice packet: the slice card, the effective settings for the folders it owns (active levers only), and only the contracts it consumes. Agents read the packet, not the whole speed card.

**Phase 3: Integrate (continuous, per Fork 8)**
Review each change against its contract and the demo script. Merge in order. Run the demo walk after each merge. Speed lever C1 sets how often the slow suites run, and at Bypass it moves the walk to just before release. If main breaks, revert first and diagnose on the branch. The integrator never resolves conflicts on main.

**Phase 4: Verify (per Fork 9 and the gate table)**
Run the verification set you chose, at the depth the Speed Controller sets (Section 11). Test lifecycle invariants. Review screenshots at the sizes lever C2 calls for. Run the external-effect reconciliation test and the authorization tests if they apply. For AI features, run the evaluation set.

**Phase 5: Release (per the gate table)**
Work through the gate table for your profile. Missing, failed, or stale evidence blocks release (Section 6). Write the README, setup guide, known limitations (including every bypass note), and the profile name. Run the secrets and data scan. Confirm the platform's submission rules, including repo visibility. Record each N/A with its reason.

**Phase 6: Learn (after release)**
Record what broke, what took longer than planned, and what the checks missed. Feed that back into the next project's forks and speed settings, starting with any bypassed or compromised area that produced a defect.

---

## 6. Gate table (the authority on release requirements)

Each gate has a trigger (when it applies), an owner, required evidence, and a block condition. A gate marked N/A needs a written reason.

**Evidence rule.** Every applicable gate needs passing evidence from the release candidate. Missing, failed, or stale evidence blocks release, whatever a row's own block condition says. Evidence is stale when it comes from a different revision than the release candidate, or describes a system that has changed since, such as a data map written before a new provider was added.

**Exceptions.** An exception lets a release go out with one gate unmet, for a limited time. It needs an approver with authority over that requirement, a mitigation, and an expiry date. A known limitation goes in the release notes, but it doesn't waive a gate, and neither does the Speed Controller (Section 11).

| Requirement comes from | Exception allowed? | Who approves |
|---|---|---|
| Platform rules (an app store, a hackathon, a host platform) | No. Only the platform's own process can change them. | Nobody inside the project |
| Laws, regulations, and contracts | No. The compliance or legal owner decides what applies. | Nobody inside the project |
| Company policy, including company floors | Only through the company's own exception process | The policy owner |
| The secrets and real-data scan, authorization tests once real data is in use, and the reconciliation test once real money moves | No. Reduce scope instead. | Nobody |
| Any other gate, and fork and playbook floors | Yes, with a mitigation and an expiry date | The release owner, plus the data owner when real data is involved |

| Gate | Applies when | Owner | Evidence | Blocks release if |
|---|---|---|---|---|
| Lint, typecheck, unit tests | Always | Builder | CI run on the release revision | Any failure |
| Main-journey walk | Any user journey | Quality | Recorded run of the main journey on the real platform | The walk fails |
| Secrets and real-data scan | Always, before any public push and before release | Release | Scan report covering the repo, fixtures, screenshots, and release materials | Any secret, or any real data outside an approved environment |
| Dependency approval | Any dependency added or changed | Human reviewer | Approval record, or a signed pre-approved list | No approval |
| Migration sequencing | Any schema change | Migration owner | Migration log showing one sequence | Parallel or unsequenced migrations |
| Dependency and advisory check | Hosted service | Named triage owner | Advisory report, with the toolchain and lockfile pinned | An unreviewed critical advisory |
| External-effect reconciliation test | Effects reach real people or real money | Builder with reviewer | Lost-response test for each effect type, showing recovery without a duplicate | A duplicate effect, or an outcome left unknown |
| Data map | Real data in use | Data owner | Written map covering logs, exports, backups, providers, and agent context | Missing or incomplete |
| Migrations tested on realistic data | Pilot or Production with schema changes | Migration owner | Forward test on a realistic copy, a rollback path, and a compatibility check when old and new code run at the same time | The forward test or rollback fails, or old and new code can't run together during the rollout |
| Concurrency tests | Pilot or Production, when concurrent or replayed operations could break a business rule | Builder with reviewer | Concurrent and replayed-request tests for each such rule | Any rule breaks |
| Authorization tests | Pilot or Production | Security owner | Unauthenticated and unauthorized requests denied on every protected read and write, at the resource and tenant level, including search, export, download, and agent tools | Any unauthorized read or write succeeds |
| Audit trail | Pilot or Production with regulated data (Fork 4), money, or irreversible actions (Fork 10) | Security owner | Tamper-evident entries from a test run, recording the verified actor, each state transition, and each external effect | An entry is missing, or one can be changed without detection |
| Accessibility check | Pilot or Production with a user-facing UI | Quality | Automated report, plus a keyboard and screen-reader pass on the main journey | The main journey fails |
| AI evaluation set | Pilot or Production with AI features | Product owner | Versioned golden-set quality scores, plus hard safety checks (permissions, privacy, unsafe tool use) reported separately | Quality below the agreed threshold, or any safety check fails |
| Failure injection | Pilot or Production with external dependencies | Quality | Timeout, rate-limit, partial-failure, and auth-expiry results | Degrades invisibly or corrupts state |
| Monitoring and alerts | Pilot or Production | Operations | Alert list naming who receives alerts and who can halt a rollout | No named recipient |
| Rollback, documented and tested | Pilot or Production | Operations | Rollback test record | The rollback fails |
| Operator pause and recovery | Pilot or Production | Operations | Demonstrated pause of new effects, data restore, and reconciliation of in-flight actions | Any of the three fails |
| Release evidence tied to artifact | Pilot or Production | Release owner | Build ID linked to the evidence above | Not linked |
| Protected CI and code-owner review | Production | Release owner | Repository settings | Not enforced |
| SLO alerting | Production | Operations | Defined SLOs with alerts | Missing |
| Incident runbook | Production | Operations | Runbook with on-call contacts | Missing |
| Access review | Production | Security owner | Record of who can reach production systems and data | Not done |

**Profile requirements, summarized from the table:**

- **Demo:** Synthetic data, sandbox credentials, test funds, and controlled recipients only (Fork 13). Lint, typecheck, and unit tests. The main-journey walk. The secrets and real-data scan. Dependency approval and migration sequencing when they apply, and the advisory check if the demo is hosted. Known limitations stated.
- **Pilot:** Everything in Demo, except that approved real data, recipients, and money replace the sandbox-only rule. Add authorization tests, monitoring, tested rollback, operator pause and recovery, and release evidence. Add the data map when real data is in use, tested migrations when the schema changes, the reconciliation test when effects reach real people or real money, and the audit trail when the data is regulated or the app moves money or takes irreversible actions. Concurrency tests, accessibility, AI evaluations, and failure injection apply when their triggers are met. Size doesn't lower the profile: a pilot with ten users carries every gate its data and actions trigger, including any obligations for regulated data.
- **Production:** Everything in Pilot, plus protected CI and code-owner review, SLO alerting, an incident runbook, and an access review.

**The Demo boundary.** Anything that reaches real people or moves real money is a Pilot from the first send, however few users it has. One case sits outside the profiles: a live smoke test, which is a one-off check with live credentials against controlled recipients, or a minimal real transaction, approved in writing with its scope, recipients, and cleanup. It isn't a release, and it doesn't change the profile. It still carries every safeguard its action triggers. A small real charge, for example, needs evidence that a lost response won't cause a duplicate charge before it runs.

**Decision examples.** Two readers applying the table should reach the same decision in each case.

| Case | Decision | Rule that decides it |
|---|---|---|
| A synthetic weekend demo | Go, with a repeatable build, a main-journey walk, and a secrets scan | Demo profile |
| An appointment pilot that texts ten invited patients | Go only with the Pilot gates in place before the first live reminder, including authorization, reconciliation, and recovery evidence, plus the audit trail if the patient data is regulated | Demo boundary; Pilot profile |
| A subscription service with automatic renewals | Go once duplicate requests are handled and uncertain charges reconcile, under a bounded renewal policy | Reconciliation gate; Fork 10 |
| A "demo" that texts a few real patients to show it works | No-go as a Demo. It's a Pilot from the first send and needs the Pilot gates. | Demo boundary |
| A pilot whose write tests pass, but an export shows another tenant's records | No-go | Authorization tests cover protected reads, including exports |
| A release candidate with no AI evaluation run | No-go | Evidence rule: missing evidence blocks release |

Section 11.8 runs three of these cases, plus a hackathon entry, through the Speed Controller.

---

## 7. AI review prompt

Work out the effective settings with the rule in 11.3 before the review. The review checks them; it doesn't compute them. Then paste this into Claude with the versioned playbook, your Project Profile (redacted of real identifiers), your fork choices, and your speed card.

```
You are reviewing my app build plan against this playbook (version and date below).

[PLAYBOOK VERSION AND DATE]
[PASTE REDACTED PROFILE]
[PASTE FORK CHOICES, one line per fork, e.g. "Fork 4: Personal data"]
[PASTE GATE TABLE ROWS THAT APPLY]
[PASTE SPEED CARD: preset, company floors, overrides, area overrides, effective settings, exceptions, bypass notes]

Please:
1. Check for conflicts between my choices. Flag any combination the playbook doesn't support.
2. For each fork, say whether my choice fits my goals. If not, name the option you would pick and give one sentence of reasoning.
3. Check that every gate whose trigger applies has an owner, evidence from the release candidate, and a block condition. List any gate that is missing an N/A reason, and any exception the playbook doesn't allow or whose approver lacks the authority.
4. Check my effective settings against the rule in Section 11.3. List any lever whose setting doesn't follow from the rule, any setting below a floor without an allowed exception, and any bypass note that is incomplete or boilerplate. Then recommend a preset and overrides for my deadline, with one sentence of reasoning for each change.
5. Name the three biggest risks to my deadline and how each would show up early.
6. Name anything I must verify myself, such as platform rules, legal obligations, or data policies. Don't assume these.
7. Give a go or no-go checklist for my profile, no more than ten items.

Keep the answer under 1,000 words. Lead with conflicts. Don't approve anything that a gate or floor blocks, or anything that lacks evidence.
```

For a second opinion, run the same prompt through a different model and compare the conflicts each one finds. The accountable release owner still needs evidence from tests and reviews, not only AI review.

---

## 8. Mistakes that trip people up

| Mistake | What it looks like | Better choice |
|---|---|---|
| Full spine on a sprint | Two weeks on contracts, no working demo | Micro-spine plus a first milestone, time boxed |
| No shared contract file | A new session invents different field names | Micro-spine in the first hour, read by every session |
| Merge queue for a solo project | Infrastructure for a team of one | Direct commits or strict merges |
| Real data in a demo | Customer or patient records in fixtures, logs, or screenshots | Synthetic only, scanned before any push |
| Parallel migrations | Two slices generate schema changes at once and corrupt history | One migration owner, or expand-and-contract |
| Agent adds dependencies | Heavy or hallucinated packages added to solve small problems | Dependency changes need sign-off |
| Session carried across slices | Stale context drives later changes | One fresh session per slice |
| Agent with direct write access | Agent triggers money or messages | Suggest only, human confirms |
| Verification by the agent that wrote the code | Tests match the code, not the spec | Separate test author writes from the spec |
| Deterministic tests only for AI features | CI stays green while answer quality drops | AI evaluation set, versioned |
| Retry after a lost response | Provider accepted the charge, app retries, customer is charged twice | Reconcile first, then retry |
| Gate weakened to pass | Test skipped or threshold lowered | Fix the cause, or record a known limitation without waiving the gate |
| Platform rules ignored | Repo must be public but was private at submission | Read submission rules in Phase 5 |

---

## 9. Metrics

Measure delivery and whether the core task works. Pull what you can from CI and deployment records before asking anyone to keep a manual log.

| Metric | What it tells you | Source |
|---|---|---|
| Lead time (change to users) | How long a finished change takes to reach people | Version control and deploy records |
| Deploy frequency | How often you can release | Deploy records |
| Change failure rate | How often a change needs a fix or rollback | Incident and rollback records |
| Time to restore | How quickly you recover from a failed release | Incident records |
| Core task success | Whether the main user journey works | Demo walk, real-user analytics where allowed |
| Escaped defects | Bugs found after release, by severity | Issue tracker |

Build-phase metrics (slice lead time, rework rate, auto-merge rate, change size) are useful during a build as diagnostics. Keep them only when they help you act. Targets are starting points, not benchmarks.

---

## 10. Glossary

- **Spine:** the shared foundation (contracts, types, and, for larger builds, fakes, design primitives, and app shell).
- **Micro-spine:** a single shared types or schema file, written first, that every session reads.
- **Slice:** one user-visible capability that merges on its own.
- **Contract:** the agreed shape of data, inputs, outputs, or state changes between two areas.
- **Fake:** a stand-in implementation of a contract, used before the real one exists.
- **Fixture:** synthetic example data used in tests and demos.
- **State machine:** the explicit allowed states and transitions for an entity, and who can trigger each one.
- **Idempotency key:** an identifier that makes a repeated request count only once.
- **Transactional outbox:** a pending external effect recorded in the same write as the state change, then delivered reliably.
- **Expand-and-contract:** a migration pattern: add the new shape, move users to it, then remove the old shape.
- **Gate:** a check, with an owner and evidence, that must pass or be marked N/A with a reason before the next step.
- **Release profile:** the named level of readiness (Demo, Pilot, Production) that sets which gates apply.
- **Main journey:** the demo script for a Demo; what a real user must accomplish for a Pilot or Production.
- **Sensitive paths:** auth, payments, personal or regulated data, migrations, CI and release configuration, dependency manifests, and agent prompts and permissions.
- **Speed Controller:** the layer that sets how much time each time-consuming practice gets (Section 11).
- **Lever:** one time-consuming practice on the Speed Controller, set to Full, Compromise, or Bypass.
- **Preset:** a named set of lever settings, from 1 (Strict) to 5 (Max).
- **Floor:** the lowest setting a lever can have on a project, set by a gate, a fork, the platform, the playbook, or the company.
- **Bypass note:** the written reason, risk, mitigation, revisit point, and owner for a skipped practice.
- **Speed card:** the file in the repo that records the preset, overrides, floors, effective settings, exceptions, and bypass notes.
- **Slice packet:** what an agent session starts with: the slice card, the effective settings for its folders, and the contracts it consumes.
- **Controlled recipients:** team members, or test accounts and numbers, that agreed to receive a demo's messages. Gate triggers that mention real people don't count them.
- **Live smoke test:** a one-off check with live credentials against controlled recipients, or a minimal real transaction, approved in writing. It isn't a release, but it still carries every safeguard its action triggers.
- **Stale evidence:** evidence from a different revision than the release candidate, or about a system that has changed since.

---

## 11. Speed Controller

The forks decide what the project is and which practices apply. The Speed Controller decides how much time each time-consuming practice gets. It never changes a fork choice. If a setting only works with a different fork, change the fork and rerun the review in Section 7.

### 11.1 How it works

Each time-consuming practice is a **lever** with three settings:

- **Full:** do it as the playbook describes.
- **Compromise:** a cheaper version that keeps the main protection. Each lever defines its own.
- **Bypass:** skip it, with a bypass note (11.6).

There are three ways to set the levers:

1. **Preset.** Pick one position on a dial, from 1 (Strict) to 5 (Max). Each recipe has a default (11.5).
2. **AI-recommended.** Step 4 of the Section 7 review recommends a preset and overrides for your profile and deadline.
3. **Manual.** Set each lever yourself, or start from a preset and change single levers (11.7).

Two rules apply however you set them:

- **Floors win.** A setting below a lever's floor is raised to the floor (11.3).
- **Only active levers count.** A lever is active when a fork puts its practice in scope, or when a gate or floor requires it. A command-line tool has no screens, so its visual-check lever stays inactive.

Record the settings in a speed card in the repo (11.7). Each agent session gets its slice's settings through a slice packet (Phase 2).

### 11.2 Always on

These cost little and prevent the costliest failures, so no setting turns them off:

- The micro-spine (Fork 6)
- Lint, typecheck, and unit tests on every change (lever B2 sets how much the unit tests cover)
- The secrets and real-data scan before any public push and before release
- Server-side authorization, with identity from the verified platform context
- Human approval for money and irreversible actions, per action or through an approved policy (Fork 10)
- Serialized schema migrations
- Never weakening a check to make it pass
- The known-limitations list
- The Section 7 review of the plan

Two kinds of decision sit outside the controller:

- **Fork choices**, such as spine depth (Fork 6) or the integration method (Fork 8). To change one, change the fork.
- **Profile gates**, such as the audit trail, monitoring, rollback, operator pause and recovery, release evidence, protected CI, SLO alerting, the incident runbook, and the access review. They follow the release profile, and the profile follows who relies on the app (Core rules). Speed can't lower them.

### 11.3 Floors, and how settings combine

A floor is the lowest setting a lever can have on this project. Floors come from five places:

1. **Gates.** If a gate in Section 6 applies, the lever that produces its evidence can't go below the setting that meets it. The tables in 11.4 mark these "(gate)."
2. **Forks.** Some fork choices set floors. A state machine (Fork 7) means its invariants get tested, and parallel agents (Fork 3) need owned folders on every slice card.
3. **The platform.** Anything the platform or submission rules require, such as a public repo or a demo video, gets done whatever the settings say. Where a requirement matches a lever, it raises that lever to the setting that meets it.
4. **The playbook.** A few levers have floors on sensitive paths, where mistakes cost the most. The tables name them.
5. **Your company.** An organization can raise any floor, such as requiring a human to review every change. Company floors apply to every preset.

To go below a floor, reduce scope until its trigger no longer applies, for example by sending to sandbox recipients instead of real people. Otherwise, ask for an exception where Section 6 allows one, from the approver it names. Platform, legal, and company floors can't be lowered from inside the project, and the controller never grants an exception itself.

**How settings combine.** Work out each lever's effective setting the same way every time, so two reviewers get the same answer:

1. If the lever isn't active (11.1), it has no setting.
2. Start from the preset's setting, or your own if the preset is Manual.
3. Apply the project-wide override for that lever, if there is one.
4. Apply the area override for the slice's folders, if there is one. When area paths overlap, the most specific path wins. When a slice owns folders in more than one area, the strictest result wins.
5. Raise the result to the highest floor that applies, where Full is highest, then Compromise, then Bypass. Only an allowed exception (Section 6) leaves a lever below a floor, and the speed card records it with its approver and expiry date.

Overrides can move a lever up or down. Floors only move it up. Every floor is one of the three settings, so the result is always Full, Compromise, or Bypass. Any lever that ends at Bypass needs a complete bypass note (11.6). A script can apply these steps, check every note and exception for completeness and expiry, and fail CI when a setting sits below its floor without an allowed exception.

### 11.4 Levers

Each table lists when a lever is active ("On when"), its three settings, and its floor. Slow suites are all the checks beyond lint, typecheck, and unit tests. The glossary defines sensitive paths.

**Plan**

| ID | Lever | On when | Full | Compromise | Bypass | Floor |
|---|---|---|---|---|---|---|
| P1 | Brief | Always | The complete Project Profile, demo script, and out-of-scope list | A 15-minute brief: the app in one sentence, who will rely on it, what live actions it can take, the deadline, data sensitivity, the riskiest dependency, and the demo script | Not allowed | Compromise |
| P2 | Feasibility spike | Always | Prove the riskiest dependency end to end on the real platform or provider | One smoke call, or a check of the specific rule or limit in current docs, plus a written fallback | Skip it | None. Full is the safer bet on a deadline, since a broken assumption found late costs more than the spike. |
| P3 | Slice cards | Always | The complete card (Phase 2) | A short card: user story, owned folders, done-when, and the states that matter | A one-line task in a list | Compromise when agents build in parallel (Fork 3) |
| P4 | Contract changes | Contracts are shared across slices | A written change request, consumer contract tests on the change, and breaking changes decided at fixed times | The contract owner merges compatible changes directly, with consumer tests. Breaking changes need a written request. | The owner changes the contract and its consumers in one change | Compromise when slices in flight depend on the contract |

**Build**

| ID | Lever | On when | Full | Compromise | Bypass | Floor |
|---|---|---|---|---|---|---|
| B1 | Test authorship | Fork 9 "separate test author," or a floor | A different agent or person writes acceptance tests from the spec before building starts | The builder writes acceptance tests from the slice card first, in a session that hasn't seen the implementation | The builder writes tests alongside the code | Full for regulated data. Compromise for sensitive-path slices in Pilot or Production. |
| B2 | Unit test scope | Always | All domain logic, contracts, and handlers | Domain logic (state machines, guards, calculations) and contract validation | Not allowed | Compromise (gate) |
| B3 | UI states | The app has a UI | Default, loading, empty, error, and no-permission states on every screen | Main-journey screens get default, loading, and error. Other screens get default and error. | The default state only on read-only screens. Screens that write data or trigger an external effect keep an error state. | None |
| B4 | Dependency approval | Always | A human signs off on each dependency change | A human signs a pre-approved package list once, and agents add only from it | Not allowed | Compromise (gate) |
| B5 | Agent session reset | Agents build slices | A fresh session for every slice (Fork 3) | Reuse a session for small, related slices in one folder. Start fresh after touching another area, a long debugging run, or a failed attempt. | One long session, with a written checkpoint in the repo before each new slice | Full for sensitive-path slices |

**Check**

| ID | Lever | On when | Full | Compromise | Bypass | Floor |
|---|---|---|---|---|---|---|
| C1 | Slow-suite schedule | Any slow suite exists | Every slow suite on every merge | The main-journey walk on every merge. Other slow suites run nightly and on every release candidate. | Slow suites before release only | Compromise when slices merge in parallel. Applicable gates always pass on the release revision. |
| C2 | Visual check | Fork 9 "visual screenshot gate" | Baselines for every route, state, and viewport, with diffs on every UI change and every flagged diff reviewed | Main-journey screens at one viewport, reviewed by a person before each release candidate | A person clicks through before release | None |
| C3 | Accessibility | Fork 9 "accessibility checks," or the gate | Automated checks on every captured state, plus keyboard and screen-reader passes on every core journey | Automated checks on the main journey, plus one keyboard and screen-reader pass on it before release | No checks, stated in known limitations | Compromise in Pilot or Production with a user-facing UI (gate) |
| C4 | Invariant tests | Fork 7 with a state machine | Property-based tests over random event sequences, plus model-based tests of the main journey | Example-based tests for each invariant and each disallowed transition | Not allowed | Compromise (Fork 7) |
| C5 | Concurrency tests | Fork 7 with concurrency controls, or the gate | Concurrent and replayed-request tests for every business rule that parallel or repeated operations could break | The same tests for the most exposed rule, such as double booking | None, with single-operator use stated in known limitations | Full in Pilot or Production when concurrent or replayed operations could break a business rule (gate) |
| C6 | Effect reconciliation | Fork 10 "outbound messages" or "money or irreversible actions" | A lost-response test for every effect type, durable idempotency keys, and idempotent consumers | Durable idempotency keys, plus a lost-response test on the main effect | Idempotency keys only | Full when effects reach real people or real money (gate). Compromise when effects reach other live systems, such as staging endpoints or internal webhooks. None when every effect goes to sandbox or controlled recipients. |
| C7 | Authorization tests | Fork 11 "platform identity" or "own accounts," or the gate | Unauthenticated and unauthorized requests denied on every protected read and write, at the resource and tenant level, including search, export, download, and agent tools | Denial tests on sensitive reads and writes only, such as exports, assign, confirm, pay, delete, and agent actions | None, stated in known limitations | Full in Pilot or Production (gate) |
| C8 | Failure injection | Fork 9 "failure injection," or the gate | Timeouts, rate limits, partial failures, and expired auth on each external dependency | One injected failure on the main journey, showing a visible failure and recovery | None, stated in known limitations | Full in Pilot or Production with external dependencies (gate) |
| C9 | AI evaluations | Fork 9 "AI evaluations," or the gate | A versioned golden dataset of main tasks and known failure cases, scored on every model or prompt change against an agreed threshold, plus hard safety checks that must all pass | A small golden set drawn from the main journey, plus the hard safety checks, run after any prompt change and before each release candidate | The main-journey walk only | Full in Pilot or Production with AI features (gate) |

**Review and release**

| ID | Lever | On when | Full | Compromise | Bypass | Floor |
|---|---|---|---|---|---|---|
| R1 | Review and change size | Always | A human reviews every change, and every change stays under the size limit | A human reviews shared contracts and sensitive paths, and the rest merges on green checks. The size limit applies to reviewed changes. | A human reviews sensitive paths only, with no size limit | A human reviews every sensitive-path change before it lands, which all three settings do. Compromise in Production (gate). |
| R2 | External review | Fork 9 "external review," or a floor | An independent person reviews the spec, the evidence, and the result | The Section 7 review run through a second model, plus the release owner's go or no-go checklist | Nothing beyond the Section 7 review | Full for regulated data (Fork 4) |
| R3 | Release docs | Always | README, setup guide, architecture notes, screenshots, a demo script or runbook as needed, known limitations, and the profile name | README with setup steps, known limitations, and the profile name | Not allowed | Compromise. Platform and submission requirements apply on top (11.3). |

### 11.5 Presets

| Preset | Use it for | Default for |
|---|---|---|
| 1. Strict | Regulated work, or a company that requires full process | Recipe E |
| 2. Careful | Customer-facing products | Recipe D |
| 3. Balanced | Internal tools and pilots | Recipe C |
| 4. Fast | Hackathons and sprints | Recipe A |
| 5. Max | Solo weekend builds, throwaway prototypes, and spikes | Recipe B |
| M. Manual | Your own mix (11.7) | None |

Settings by preset (F = Full, C = Compromise, B = Bypass). A preset never sets Bypass where a lever doesn't allow it, and floors still win. Presets don't change with the profile. When a gate applies, its floor raises the lever whatever the preset says, so in a Pilot several of Balanced's Compromise settings become Full, as the third example in 11.8 shows.

| Lever | 1 Strict | 2 Careful | 3 Balanced | 4 Fast | 5 Max |
|---|---|---|---|---|---|
| P1 Brief | F | F | F | C | C |
| P2 Feasibility spike | F | F | F | F | B |
| P3 Slice cards | F | F | C | C | B |
| P4 Contract changes | F | F | C | C | B |
| B1 Test authorship | F | F | C | C | B |
| B2 Unit test scope | F | F | C | C | C |
| B3 UI states | F | F | F | C | B |
| B4 Dependency approval | F | F | C | C | C |
| B5 Agent session reset | F | F | F | C | B |
| C1 Slow-suite schedule | F | C | C | C | B |
| C2 Visual check | F | F | C | C | B |
| C3 Accessibility | F | F | C | C | B |
| C4 Invariant tests | F | F | C | C | C |
| C5 Concurrency tests | F | F | C | C | B |
| C6 Effect reconciliation | F | F | C | B | B |
| C7 Authorization tests | F | F | C | C | B |
| C8 Failure injection | F | F | C | C | B |
| C9 AI evaluations | F | F | C | C | B |
| R1 Review and change size | F | C | C | C | B |
| R2 External review | F | F | C | B | B |
| R3 Release docs | F | F | C | C | C |

### 11.6 Bypass notes

Every Bypass needs a note with six fields:

- **Levers:** which ones the note covers
- **Why:** the project reason, such as the deadline, the audience, or the data
- **Risk:** what could go wrong because of the skip
- **Mitigation:** what partly covers it, if anything
- **Revisit when:** the date, event, or profile change that turns it back on
- **Owner:** who decided

Rules for notes:

- Every note becomes a line in the known limitations (Phase 5).
- A note can't take a lever below its floor. That takes an exception that Section 6 allows.
- Bypasses set by a preset can share one note when the why, risk, and revisit point are the same. Each manual bypass gets its own note.
- When a revisit point arrives, set the lever again or write a new note.
- Notes must be specific. The why names this project's deadline, audience, or data, and the risk names what could go wrong in this app. The Section 7 review flags boilerplate.

A Compromise needs no note. The speed card records it, and the lever's definition says what was cut.

### 11.7 Manual control and the speed card

Use Manual when your style, stack, or company rules don't fit a preset.

- **Start anywhere.** Take a preset and override single levers, or set every lever yourself (`preset: manual`).
- **Set areas differently.** Give a folder its own settings (`area_overrides`), such as Full test authorship for auth code and a bypassed visual check for an internal admin screen.
- **Add company floors.** Raise any floor to match policy, such as signing off on every dependency change. Company floors apply to every preset and every area.
- **Add your own levers.** Add practices your company or stack needs, such as a security review board, design sign-off, load tests, or localization checks. Give each one an ID (X1, X2, and so on) and the same fields as the tables: on when, Full, Compromise, Bypass, and floor.
- **Shift gears.** You can change the preset mid-project, for example Fast while building and Careful for the release candidate. Record the change in the speed card. Gates are checked on the release revision either way.

The speed card lives in the repo, for example at `docs/speed.yml`:

```yaml
# docs/speed.yml: the source for each slice packet (Phase 2)
playbook: Universal App Build Playbook v2.2
profile: demo                  # Fork 13: demo | pilot | production
preset: fast                   # strict | careful | balanced | fast | max | manual
circuit_breaker: 3             # failed verify runs in a row before an agent stops (Fork 3)
company_floors:                # optional; applies to every preset and area
  B4: full                     # policy: sign off on every dependency change
overrides:                     # changes to the preset
  C2: bypass
area_overrides:                # optional; settings for one path
  src/auth/:
    B1: full
    C7: full
effective:                     # computed with the rule in 11.3; the Section 7 review checks it
  P1: compromise
  P2: full
  B4: full                     # raised by the company floor
  C4: compromise               # Fork 7 floor; Bypass not allowed
  # one line per active lever
exceptions: []                 # allowed Section 6 exceptions: lever, approver, mitigation, expiry
bypass_notes:
  - levers: [C2]
    why: Judges watch a recorded demo at one screen size, with 14 days to the deadline
    risk: A layout bug at another screen size goes unnoticed
    mitigation: A person clicks through at the recording size before release
    revisit_when: Before any Pilot
    owner: <name>
  - levers: [C6]
    why: Demo profile, and every message goes to sandbox recipients
    risk: A retry during the demo could send a duplicate message
    mitigation: A durable idempotency key on every send
    revisit_when: Before any message reaches a real person
    owner: <name>
```

**Load it automatically.** Keep a copy of this playbook in the repo, such as `docs/playbook.md`. Then add a line to the instruction file your coding agents read at session start, such as AGENTS.md or CLAUDE.md, so no session starts without its settings:

```
Before starting a slice, read its slice packet. If it has none, read docs/speed.yml and apply the rule in Section 11.3 of docs/playbook.md to the folders you own.
```

### 11.8 Worked examples

| Case | Profile and preset | Loosened | Held |
|---|---|---|---|
| Solo weekend demo with synthetic data | Demo, 5 Max | The feasibility spike, slice cards, extra UI states, review outside sensitive paths, and any optional checks the forks turned on, under one shared bypass note. Slow suites run before release only. | Brief, unit test scope, dependency list, and release docs at Compromise. Invariant tests at Compromise if there's a state machine. Error states on screens that write data or trigger effects, which B3's Bypass keeps. Fresh sessions and human review on sensitive paths. The main-journey walk and the secrets scan before release. |
| Hackathon entry with an AI agent inside a work platform | Demo, 4 Fast | A short brief and short slice cards. Fewer UI states, with loading and error kept on the main journey. Slow suites nightly, except the main-journey walk. A visual check on main-journey screens at one viewport. One concurrency test on the double-booking path. Denial tests on sensitive writes, such as the agent trying to confirm. One injected provider failure. A small golden set for the agent. Review of contracts and sensitive paths only. Effect reconciliation bypassed, since messages go to sandbox recipients and the idempotency key stays. | The feasibility spike at Full (preset). Invariant tests at Compromise, since the request lifecycle is a state machine. Release docs plus the submission rules, such as a public repo and a video. Fresh sessions on sensitive paths. |
| Appointment pilot that texts reminders to real people | Pilot, 3 Balanced | Short slice cards. Fast-path contract changes. Tests written first from the card on sensitive slices. Domain-level unit tests. A pre-approved dependency list. Slow suites nightly, except the main-journey walk. A visual check on the main journey. Review of contracts and sensitive paths only. | Raised to Full by Pilot gates: concurrency tests (two staff can book one slot), effect reconciliation (reminders reach real people), authorization tests, and failure injection (the text provider). Accessibility at Compromise, which meets its gate. The Pilot profile gates: data map, monitoring, tested rollback, operator pause and recovery, release evidence, and the audit trail if the data is regulated. |
| Subscription service with automatic renewals | Production, 2 Careful | Slow suites nightly, except the main-journey walk. Human review of contracts and sensitive paths only. | Everything else at Full, including effect reconciliation (real money) and concurrency tests. Review stays at Compromise, the minimum the code-owner gate allows. Renewals run under an approved policy with limits and a way to revoke it (Fork 10). Every Production gate. |

### 11.9 Mistakes and tracking

| Mistake | What it looks like | Better choice |
|---|---|---|
| Silent skip | A check quietly stops running | Bypass it with a note, or keep it |
| Speed used to dodge a gate | A faster preset on a release that real people rely on | Floors hold. Reduce scope or record an exception (Section 6). |
| Same settings everywhere | Payment code gets the same light touch as a settings page | Area overrides: stricter on sensitive paths, lighter elsewhere |
| Bypasses that never come back | Notes with no revisit point | Give every note a revisit point and review the notes in Phase 6 |
| Skimping on the spike | A platform limit discovered in week two | Keep P2 at Full on any platform you haven't shipped on |
| Live sends from a demo | A demo texts real patients to show it works | It's a Pilot from the first send (Section 6) |
| Letting the AI compute settings | Two reviews of the same card give different answers | Apply the rule in 11.3, by hand or with a script. The AI review checks the result. |
| Agents looping on a failure | A builder retries the same broken fix for an hour | The circuit breaker in Fork 3 stops it after three failed runs |

Track three things from the speed card: active bypasses, bypasses past their revisit point, and escaped defects in bypassed or compromised areas. If one area keeps producing defects, raise its lever on the next project.

---

## 12. Changes, and why

### 12.1 Changes in v2.2

Two reviews of v2.1 were read in full. Numbering continues from v2.1: Review 4 (live operations) and Review 5 (structure and consistency).

| Change | Source | Where |
|---|---|---|
| A live smoke test still carries every safeguard its action triggers | Review 4 | Section 6; glossary |
| An audit trail gate for regulated data, money, and irreversible actions | Review 5 | Section 6; 11.2; 11.8 |
| B3's Bypass keeps error states on screens that write data or trigger effects, so its floor no longer creates a fourth setting | Review 5 | Lever B3; 11.8 |
| Every floor is one of the three settings. Platform requirements apply on top of the levers, and the R3 and C6 floors are restated to fit. | Follow-up to Review 5 | 11.3; levers R3 and C6 |
| C6 says when Compromise applies, and the presets note that gate floors raise settings in a Pilot | Review 5 | Lever C6; 11.5 |
| Controlled recipients don't count as real people in gate triggers | Follow-up to Review 5 | Glossary |
| Section 0's planning steps form the first half of Phase 0, and the feasibility spike follows them | Review 5 | Section 0; Phase 0; quick start |
| A bootstrap line for AGENTS.md or CLAUDE.md that points agents at their slice packet, with the speed card as the fallback | Review 5 | 11.7 |
| Version set to v2.2 in the title, the file name, and the speed card | Review 5 | Title; 11.7 |

Not adopted: raising Balanced's C6 to Full. The same reasoning would apply to C5, C7, C8, and C9, and their gate floors already raise them in a Pilot. Review 5 also suggested pointing agents at the whole speed card. The bootstrap line points them at their slice packet instead, which keeps the smaller context that slice packets were added for.

### 12.2 Changes in v2.1

Three reviews of v2 were read in full. Most changes come from the first, which tested whether two readers would reach the same release decision. The reviews are numbered in the order received: 1 (decision rules), 2 (executive review), and 3 (blind spots at scale).

| Change | Source | Where |
|---|---|---|
| Missing, failed, or stale evidence blocks release | Review 1 | Section 6; Phase 5 |
| Exceptions name who can approve them, and some requirements can't be excepted | Review 1 | Section 6; Core rules; 11.3 |
| Demo boundary: sandbox credentials, test funds, and controlled recipients only. Anything live is a Pilot from the first send, and live smoke tests sit outside the profiles. | Review 1 | Fork 13; Section 6; glossary |
| A small pilot carries every gate its data and actions trigger | Review 1 | Fork 13; Section 6 |
| Authorization tests cover protected reads, including search, export, download, and agent tools, at the resource and tenant level | Review 1 | Fork 11; Section 6; lever C7 |
| Agent tool calls are validated at runtime, and permissions are checked separately. This corrects v2's wording about the type checker. | Review 1 | Fork 12 |
| AI safety checks pass or fail on their own, apart from quality scores | Review 1 | Fork 9; Section 6; lever C9 |
| Routine recurring money actions can run under a bounded, revocable policy, stated in the table and default | Review 1 | Fork 10 |
| A retry with the same key counts as recovery when the provider guarantees it | Review 1 | Fork 10; Section 6 |
| Concurrency covers any business rule that concurrent or replayed operations could break | Review 1 | Fork 7; Section 6; lever C5 |
| Migrations always run in one sequence, with expand-and-contract added when old and new code run together | Review 1 | Core rules; Fork 7; Section 6 |
| The short brief keeps who relies on the app and what live actions it can take | Review 1 | Lever P1; Section 0 |
| Quick start for solo builders | Reviews 1 and 3 | Section 0 |
| A written rule for combining presets, overrides, and floors. The AI review checks the result instead of computing it. | Reviews 1 and 3 | 11.3; Section 7 |
| Decision examples, including three no-go cases | Review 1 | Section 6 |
| Bypass notes must be specific, and the review flags boilerplate | Review 2 | 11.6; Section 7 |
| Runtime isolation and teardown for parallel agents | Reviews 2 and 3 | Fork 3 |
| Slice packets in place of the whole speed card | Review 3 | Phase 2; 11.1; 11.7 |
| A circuit breaker after three failed verify runs | Review 3 | Fork 3; 11.7 |

Not adopted: a command-line tool that resolves settings and fails CI on floor violations (Review 3). That's a tool to build, not a rule, and 11.3 now defines the rule it would apply. Reference links named in Review 1 aren't added until they're checked against their current text.

### 12.3 Changes in v2

v2 adds the Speed Controller and the changes accepted from three outside critiques of v1. Praise-only points needed no change.

| Change | Source | Where |
|---|---|---|
| Speed Controller: levers, presets, floors, bypass notes, manual control, and a speed card | New in v2 | Section 11, with hooks in Sections 0, 2, 4, 5, 6, and 7, Forks 3 and 9, and the glossary |
| Release requirements set from risk; reduce exposure if a gate can't pass | Codex critique | Core rules; Section 6 |
| Gate table is the single authority; recipes and profiles match it | Codex critique; checked against v1 | Fork 13; Sections 4 and 6 |
| Gates have triggers, owners, evidence, block conditions, and N/A reasons | Codex critique | Section 6 |
| Gate triggers tied to the release profile, so a Demo isn't held to Pilot checks, and the table resolves the critique's three test cases | Codex critique | Section 6; Forks 10, 11, and 13 |
| Production gates kept from v1: tested migrations, incident runbook, access review | Comparison with v1 | Section 6 |
| Profile follows who relies on the app, not the deadline | Codex critique | Fork 13 |
| Project shapes can combine | Codex critique | Fork 1 |
| Source visibility split from service and data location | Codex critique | Fork 5 |
| Phase 0 feasibility spike on the riskiest dependency | Codex critique | Phase 0; Profile |
| Separate checkouts and test data for parallel agents | Codex critique | Fork 3 |
| Migration serialization rule | Gemini critique | Core rules; Fork 7 |
| Dependency sign-off rule restored | Gemini critique | Core rules; Phase 2; Section 8 |
| Areas depend on each other only through contracts | Gemini critique | Core rules |
| Micro-spine replaces "no spine" | Gemini critique | Fork 6 |
| AI evaluations for AI features | Gemini critique | Fork 9; Section 6 |
| One fresh agent session per slice | NotebookLM critique | Fork 3; Speed lever B5 |
| Outbox and state change in one transaction | NotebookLM critique | Fork 7 |
| Agent tool schemas mirror contracts | NotebookLM critique | Fork 12 |
| Lost-response reconciliation test | Codex critique | Fork 10; Section 6 |
| Separate coding-agent and product-agent permissions; internal agents with real reach count as customer-facing | Codex critique | Fork 12 |
| Dependency and advisory baseline, and a data map for real data | Codex critique | Section 6 |
| Operator pause and recovery for real-user releases | Codex critique | Fork 10; Section 6 |
| Verification standard and obligations for regulated work | Codex critique | Recipe E |
| Metrics reduced to delivery measures plus the core task | Codex critique | Section 9 |
| AI review prompt checks gates and speed settings, with a second-model option | Codex critique; Speed Controller | Section 7 |

Left out: the critique's external links, which should be checked against their current text before they're added. Merge queue support stays a "confirm your plan" note rather than a specific rule, since plan support changes.
