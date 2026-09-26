# Decision Log — Osiolog

Every meaningful decision on this project, with the reasoning that produced it.

Governed by [`UNIVERSAL PROJECT DECISION & IMPLEMENTATION DOCUMENTATION RULE.md`](../UNIVERSAL%20PROJECT%20DECISION%20&%20IMPLEMENTATION%20DOCUMENTATION%20RULE.md).

**Read this first:** the point of this file is not to list what was built. It is to record *why*, *what else was possible*, and *what was given up*. A decision entry with no rejected alternative is usually an entry that has not been thought through.

**Honesty rules:** never invent reasoning after the fact — if the original rationale is unrecoverable, say so. Never describe an alternative as "tested" unless it was actually run. Keep observed fact, interpretation, and assumption visibly separate. When a decision is reversed, mark it **Superseded** and keep it; do not delete history.

---

## Template

```markdown
## D-XXX — <short title>

- **Date:** YYYY-MM-DD
- **Status:** Active | Superseded by D-YYY | Revisit when <condition>
- **Area:** frontend | backend | auth | data | mobile | infra | tooling | product

### Problem
What forced a decision.

### Context / constraints
What was true at the time that narrowed the options.

### Options considered
1. **<Option A>** — what it is.
2. **<Option B>** — what it is.

### Decision
What was chosen.

### Why this one
The actual reasoning.

### Why not the others
Per option, specifically. If it was never tested, write:
"Not experimentally evaluated; rejected because …"

### Evidence
What this rests on — measurement, doc, observed failure, requirement, or judgement. Label which.

### Trade-off accepted
Gained ___ . Gave up ___ .

### Revisit if
The condition that would make this decision wrong.
```

---

## D-001 — Install the three skill libraries globally, not per-project

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** tooling

### Problem
Three external skill libraries (gstack, Karpathy guidelines, Anthropic Cybersecurity Skills) had to be installed so Claude Code could load them while working on Osiolog. Claude Code discovers skills either globally at `~/.claude/skills/` or per-project at `.claude/skills/`, and the choice affects every other repo on the machine.

### Context / constraints
- Neither directory existed beforehand — this was a clean install, nothing to preserve.
- gstack's own README documents the global path (`~/.claude/skills/gstack`) and its `setup` script assumes it.
- The machine is Windows 10 with Git Bash available; the `claude` CLI is **not** on `PATH`, so plugin-manager installs were unavailable and filesystem placement was the only viable mechanism.

### Options considered
1. **Global** — `C:\Users\midhi\.claude\skills\`, visible to every project.
2. **Project-local** — `.claude/skills/` inside `dental-implant-notes`, committed to the repo.
3. **Split** — gstack global, the other two project-local.

### Decision
Global, with an explicit check that the skills resolve from inside the Osiolog working directory.

### Why this one
User instruction, given directly: *"install global but make sure it works inside this project."* It also matches gstack's documented install path, so its `setup` script and future `gstack-upgrade` runs work unmodified rather than fighting a non-standard layout.

### Why not the others
- **Project-local:** not experimentally evaluated; rejected because it contradicts the explicit instruction, and because committing ~84 MB and 868 skill folders into the app repo would swamp the diff of a dental application with unrelated tooling.
- **Split:** not experimentally evaluated; rejected as strictly more complex than global with no benefit the user asked for.

### Evidence
Observed fact: `~/.claude/skills` and `~/.claude/plugins` did not exist; `which claude` returned not-found; `node v24.14.1`, `npm 11.11.0`, `git 2.45.1.windows.1` present. Decision itself: direct user instruction.

### Trade-off accepted
Gained a single install that every project sees, matching upstream docs. Gave up isolation — every other repo on this machine now carries the context cost of 868 skills, and the skill set is not pinned per-project or version-controlled with the app.

### Revisit if
Another project on this machine suffers from the context cost, or skills need to be pinned per-repo for reproducibility.

---

## D-002 — Install all 818 security skills rather than a curated subset

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** tooling

### Problem
The Anthropic Cybersecurity Skills library ships 818 skills across 34 domains. Claude Code reads every skill's name and description to build its available-skills list, so the whole library is paid for in context on every session — whether or not any of it is used.

### Context / constraints
- Osiolog handles real patient health data, Firebase auth, and S3 uploads, so *some* security coverage is genuinely warranted.
- Most of the library's domains (ICS/SCADA, malware reverse-engineering, disk forensics, fraud frameworks) have no bearing on a React + FastAPI web and mobile app.
- On disk the library is 42 MB — cheap. The real cost is context, not storage.

### Options considered
1. **Curated subset** — roughly 30–60 skills covering web app security, cloud/S3, auth, and health-data privacy.
2. **All 818.**
3. **Skip security entirely** for now.

### Decision
All 818 (813 actually installed — see F-002).

### Why this one
Chosen by the user after the context cost was explained. The stated trade-off was accepted knowingly: full coverage now beats discovering a missing skill mid-task later.

### Why not the others
- **Curated subset:** not rejected on technical grounds — it was the recommended option. The user preferred completeness. Recorded here because it remains the sensible fallback if context pressure becomes a real problem.
- **Skip entirely:** rejected because the app stores patient health data; having zero security tooling available is a poor default for that class of application.

### Evidence
Observed fact: 818 skill directories, 818 `SKILL.md` files, 42 MB. Interpretation (not measured): the per-session context cost is meaningful but tolerable. **This has not been quantified** — no token measurement of the loaded skill list was taken.

### Trade-off accepted
Gained complete security coverage with nothing to fetch later. Gave up context headroom in every session, most of it on domains this project will never touch.

### Revisit if
Sessions start hitting context limits sooner than expected, or the skill list visibly crowds out project context. The fallback is D-002's option 1: prune to the four relevant domains.

---

## D-003 — Register gstack skills with the `gstack-` prefix

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** tooling

### Problem
gstack's `setup` defaults to short skill names (`design`, `review`, `qa`, `ship`). Claude Code already ships a built-in skill called `design`. Two skills with one name is ambiguous at best and silently wrong at worst.

### Context / constraints
`./setup --help` documents both `--prefix` (names like `gstack-review`) and `--no-prefix` (the default, short names).

### Options considered
1. **`--prefix`** — every gstack skill becomes `gstack-*`.
2. **`--no-prefix`** — short names, accept the collision.

### Decision
`--prefix`.

### Why this one
It removes the `design` collision outright rather than relying on undefined resolution order between a built-in skill and a third-party one. It also makes it unambiguous *in the transcript* which library a given skill came from, which matters when three libraries are installed at once.

### Why not the other
**`--no-prefix`:** not experimentally evaluated — the collision was predicted from the skill listings, not observed at runtime. Rejected because the failure mode (wrong `design` skill loads) would be silent and confusing, and the cost of avoiding it is merely longer names.

### Evidence
Observed fact: gstack ships `design/SKILL.md`; Claude Code lists a built-in `design` skill. Inference (not verified): the two would collide. Deliberately not tested — the outcome of a collision is not worth discovering the hard way.

### Trade-off accepted
Gained collision safety and clear provenance. Gave up brevity — `/gstack-review` instead of `/review`. Reversible at any time by re-running `./setup --no-prefix`.

### Revisit if
The prefixed names prove annoying in daily use *and* the built-in `design` skill is no longer needed.

---

## D-004 — Install bun to complete the gstack build

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** tooling

### Problem
gstack's `setup` aborts without bun. It needs bun to compile three binaries: `browse` (headless browser), `make-pdf`, and the diagram renderer behind `design`. The 54 skills themselves are plain markdown and load fine without any of it.

### Context / constraints
- Project rule 12 forbids installing new packages without confirming with the user first.
- Node 24 and npm 11 were already present, so `npm i -g bun` was available without touching the system installer.
- CLAUDE.md rule 5 requires that every change be verified in a real browser — which is precisely what the `browse` binary automates.

### Options considered
1. **Install bun**, run the official setup, get all 54 skills plus working binaries.
2. **Skills only** — hand-copy the 54 folders, skip the binaries, accept that `browse`, `design-review`, `make-pdf` and `diagram` fail at runtime.
3. **Skip gstack** entirely.

### Decision
Install bun via `npm i -g bun` (resolved to 1.4.2), then re-run `./setup --host claude --prefix`.

### Why this one
The browser-automation binary is not a peripheral extra for this project — Rule 5 makes UI verification mandatory on every change, and `browse` is the tool that makes that automatable rather than manual. Installing via npm reuses the Node toolchain already on the machine instead of adding a separate installer.

### Why not the others
- **Skills only:** rejected because it produces a half-working install where several skills exist but fail when invoked — exactly the "partially wired" state rule 2 prohibits. The failure would surface later, mid-task, as a confusing runtime error.
- **Skip gstack:** rejected because the team-roles workflow was the main reason for installing it.

### Evidence
Observed fact: first `./setup` run exited with `Error: bun is required but not installed`. Observed fact: `grep -n bun setup` plus `package.json` show bun is used for `bun build --compile` of `browse`, `make-pdf`, and the diagram renderer. Interpretation: the markdown skills themselves have no bun dependency — supported by the fact that they are plain `SKILL.md` files, but not verified by running a skill without the binaries present.

### Trade-off accepted
Gained a complete, working gstack including browser automation. Gave up a clean dependency footprint — bun is now a global tool on this machine, maintained separately and unrelated to Osiolog's own React/Python stack.

### Consequences observed after install
Recorded because these were side effects of the installer, not things that were chosen:

- **A 114.5 MB Playwright Chromium headless shell** was downloaded to `~/AppData/Local/ms-playwright/`, and an 86 MB `browse.exe` was compiled. Disk cost was not anticipated in advance.
- **`~/.claude/settings.json` was modified** — gstack registered a `Stop` hook (`gstack-timeline-stop`). It backed the file up first (`settings.json.bak.20260912-171118.*`) and tagged its own entry with `_gstack_source`, so removal is clean:
  `~/.claude/skills/gstack/bin/gstack-settings-hook remove-source --source gstack-timeline-stop`
- **Two optional `plan-tune` hooks were declined** — the installer skipped them because the run was non-interactive. They hook `AskUserQuestion`, which interacts with Rule 0; leaving them off for now is the conservative choice and can be revisited.
- **On Windows, skills are installed as file copies, not symlinks.** This is the maintenance catch — see the note in CLAUDE.md.

### Revisit if
bun conflicts with the Node toolchain used by CRACO, or gstack stops requiring it.

---

## D-005 — Leave the 5 Defender-blocked security skills uninstalled

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** tooling / security

### Problem
Five of the 818 security skills could not be read after checkout. See [F-002](FAILURES.md#f-002--five-security-skills-silently-vanished-after-checkout) for the diagnosis. The question was whether to force them through.

### Context / constraints
The five: sigstore signing, SLSA build provenance, container image provenance (cosign), VirusTotal malware-hash enrichment, and XML injection testing.

### Options considered
1. **Leave them out** — ship 813.
2. **Add a Windows Defender exclusion** for `C:\Users\midhi\.claude\skills`, then re-copy.

### Decision
Leave them out.

### Why this one
None of the five applies to Osiolog. It is a React + FastAPI application that speaks JSON, deployed without container image signing; there is no XML parsing surface, no malware analysis workflow, and no SLSA build attestation in its pipeline. The practical loss is zero.

### Why not the other
**Defender exclusion:** rejected on two grounds. It needs an elevated PowerShell prompt, and more importantly it would disable antivirus scanning for a directory now holding 813 offensive-security documents — a materially worse security posture traded for five skills with no use here. Presented to the user as an explicit choice rather than decided unilaterally, because it is a security decision about their machine.

### Evidence
Observed fact: the five files are present in git's index but unreadable on disk (`Permission denied` at correct file size). Judgement, not measurement: their subject matter is irrelevant to this application's architecture.

### Trade-off accepted
Gained full antivirus coverage and no elevation prompt. Gave up five skills, none of which this project has a use for. Reversible if that ever changes.

### Revisit if
Osiolog adopts container image signing, build provenance attestation, or begins parsing XML.

---

## D-006 — Make clarification mandatory before any change (Rule 0)

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** product / process

### Problem
Ambiguous requests were being resolved by inference. On this project a wrong inference does not fail loudly — it silently writes wrong clinical data into a real patient record, where it may go unnoticed for months.

### Context / constraints
The user is a practising implantologist and domain expert, but not a software engineer. Requests arrive in clinical language and are frequently under-specified in software terms — not through carelessness, but because the missing details (field types, defaults, edge cases) are not visible from a clinician's vantage point.

### Options considered
1. **Gate every change** — questions answered freely, but nothing gets written, installed or deployed until scope, behaviour, data, edge cases and blast radius are confirmed.
2. **Gate literally everything**, including plain questions.
3. **Gate only when genuinely ambiguous**, using judgement.

### Decision
Option 1, written as Rule 0 at the top of CLAUDE.md, explicitly outranking all other rules.

### Why this one
It puts the gate exactly where the risk is. Reading and explaining cannot corrupt a patient record; writing can. This preserves fast answers to questions while making the destructive path deliberate.

### Why not the others
- **Gate everything:** rejected because making "what does this file do?" require a clarifying round would make ordinary use tiresome, and a rule that is annoying enough to be bypassed provides no protection at all.
- **Judgement-only:** rejected because it is approximately the existing default, and the existing default is what let wrong assumptions through. A rule that fires only when the model already recognises its own ambiguity cannot catch confident-but-wrong readings — which is the actual failure mode.

### Evidence
User instruction, direct and explicit. The rationale about silent clinical-data corruption is the user's own framing of why it matters, consistent with the existing rule 9 ("Interpret Vague Requests Clinically") already in CLAUDE.md.

### Trade-off accepted
Gained protection against confidently-wrong implementations. Gave up speed — every feature now costs at least one extra round-trip before code exists. Explicitly mitigated by the "one exception" clause: questions already answered in the conversation must not be asked twice.

### Revisit if
The gate produces friction without catching real ambiguities, which would show up as clarification rounds that are consistently answered with "as you'd expect".

---

## D-007 — Two running logs, not one file per decision

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** process

### Problem
The documentation standard requires a decision history (§17) and a failure history (§18). Those records need a home and a shape.

### Context / constraints
The primary reader is non-technical. Whatever structure is chosen has to stay readable without tooling, and `docs/` already holds flat markdown (`architecture.md`, `data-model.md`, `api-contracts.md`).

### Options considered
1. **Two append-only files** — `docs/DECISIONS.md` and `docs/FAILURES.md`.
2. **ADR directory** — `docs/decisions/0001-*.md`, one file per decision, plus an index.

### Decision
Two running files.

### Why this one
Everything is readable in one scroll, searchable with a single `grep`, and diffable as one file per commit. It matches the flat convention `docs/` already uses, and it requires no index file that can drift out of sync with its contents.

### Why not the other
**ADR directory:** not evaluated in practice; rejected because a separate file per decision fragments a history that is most useful read end-to-end, and because an index that must be hand-updated is one more thing to forget. The standard format ADRs provide is captured here by the template instead.

### Evidence
Judgement, based on the existing flat layout of `docs/` and on the primary reader being non-technical. No comparison was run.

### Trade-off accepted
Gained readability and zero tooling. Gave up per-decision granularity — these two files will grow long, and merge conflicts get likelier if several people ever edit them at once. Currently a single-developer project, so that cost is theoretical.

### Revisit if
The files grow unwieldy, or more than one person starts writing entries concurrently.

---

## D-008 — Delete `AGENTS.md`

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** tooling / docs

### Problem
`AGENTS.md` sat in the repo root as a near-copy of CLAUDE.md, five months stale and wrong in ways that matter: it described the database as **MongoDB** (the project runs PostgreSQL), named the app **Osioloc**, and listed auth endpoints that no longer exist. Any tool reading it would be actively misled.

### Context / constraints
- `AGENTS.md` is the `agents.md` convention — read by OpenAI Codex, Cursor, and similar tools, **not** by Claude Code. It is unrelated to the gstack skills installed in [D-004](#d-004--install-bun-to-complete-the-gstack-build), despite the similar name.
- Last modified 2026-04-19 by Rithvik26, whose last commit to the repo was 2026-04-21. 136 commits have landed since, none touching it.
- No other AI-tool configuration exists in the repo — no `.cursor/`, no `.codex/`. Nothing currently reads the file.
- It is committed at `3fc8c11`, so removal is reversible from git history.

### Options considered
1. **Replace with a pointer** — three lines redirecting to CLAUDE.md.
2. **Delete entirely.**
3. **Full sync** — maintain AGENTS.md as a complete duplicate of CLAUDE.md.

### Decision
Delete. Removed via `git rm`; the staged deletion was left uncommitted for the owner to commit.

### Why this one
Chosen by the user once the trade-offs were laid out. The file had no current reader, and a wrong guide is worse than no guide — a tool told "MongoDB" would confidently generate code against a database this project does not use.

### Why not the others
- **Pointer file:** this was the recommended option and was not rejected on technical grounds — the user preferred a clean repo over preserving a redirect for tools not currently in use. It stays the obvious thing to add back if Codex or Cursor is ever adopted here.
- **Full sync:** rejected on evidence. Two hand-maintained copies is exactly the arrangement that produced this staleness in the first place, and the drift ran five months before anyone noticed.

### Evidence
Observed fact: `git log` shows the author and dates above; `git status` confirmed no uncommitted changes; a directory check found no competing AI-tool configs. Observed fact: the file's own contents contradict the current stack. Decision itself: explicit user choice.

### Trade-off accepted
Gained a repo with no contradictory documentation. Gave up any guidance for non-Claude AI tools — if Codex or Cursor is opened on this repo, it starts with nothing: no Rule 0, no design system, no Capacitor warnings.

### Revisit if
Another AI coding tool is adopted for this project. At that point add a pointer file rather than a second full copy — and note gstack itself supports Codex via `./setup --host codex`.

---

## D-009 — Add graphify code knowledge graph, code-only and local

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** tooling

### Problem
Agents working on this repo had to orient themselves by grepping and reading files. That is slow, burns context, and misses cross-file relationships — which route imports which dependency, what a change to `User` actually touches.

### Context / constraints
- Real source is ~250 files (137 Python, 81 JS, 29 markdown). `backend/.venv` (4,214 files) and `node_modules` dwarf it and had to be excluded; graphify prunes both by default, so no configuration was needed.
- `uv 0.11.6` and Python 3.14.4 present; `pipx` absent — so `uv tool install graphifyy` was the only documented path available.
- Graphify parses code locally with tree-sitter (deterministic, no network). Docs, PDFs and configs need an **external LLM API**.
- CLAUDE.md contains the demo account password and OWNERSHIP.md contains personal details — both would have been transmitted under a docs-inclusive scan.

### Options considered
1. **Code only** — local tree-sitter parsing, no API key, no cost.
2. **Code + docs** — richer graph linking code to the PRD and decision log; requires an API key and sends doc contents off-machine.
3. **Code + docs, sensitive files excluded** — middle ground.

### Decision
Code only. Built with `graphify update . --no-cluster` followed by `graphify cluster-only . --no-label`, both of which avoid any LLM call. Result: **2,291 nodes, 5,850 edges from 276 files, 167 communities.**

### Why this one
Chosen by the user once the privacy cost was explained. The structural map — which is what agents actually need to navigate code — comes entirely from the local AST pass. The LLM is only required for prose semantics, which is the least valuable part here and the part carrying the credential exposure.

`--no-label` matters and is easy to miss: clustering itself is local (Leiden), but *naming* the communities calls an LLM by default. Without that flag the "no API" property would have been silently violated.

### Why not the others
- **Code + docs:** rejected on privacy, not capability. Indexing 29 markdown files would ship a live demo password and the owner's personal details to a third-party API for marginal benefit.
- **Sensitive-files-excluded variant:** was offered and not chosen. It remains the sensible upgrade if doc-linking is ever wanted — it needs only an exclusion list plus an API key.

### Evidence
Observed fact: file counts, node/edge/community counts, and tool versions as recorded above. Observed fact: `graphify god-nodes` returned `User` (177 edges), `Patient`, `Implant`, `get_db()`, `get_current_user()` — the genuine hubs of this codebase, confirming the graph is accurate rather than merely populated. Observed fact: `graphify explain "get_current_user()"` returned correct `file:line` references with `[EXTRACTED]`/`[INFERRED]` confidence tags.

### Trade-off accepted
Gained a queryable, accurate, private, zero-cost map of the codebase. Gave up doc-to-code linking, and community names are `Community N` placeholders rather than readable labels — navigable, but less self-describing than it could be.

### Consequences and installer side effects
- `graphify-out/` (8 MB — `graph.json` 2.8 MB, `graph.html` 2.2 MB) is **gitignored**; it is generated and goes stale on every code change. Verified ignored via `git check-ignore`.
- **10 lines appended to CLAUDE.md** by `graphify claude install`. Verified purely additive against a pre-install backup: 0 lines removed, 10 added.
- A **PreToolUse hook** was registered in `.claude/settings.json`; it injects a reminder to query the graph before grepping. Confirmed firing.
- **git `post-commit` and `post-checkout` hooks** installed, plus a merge driver for `graphify-out/graph.json`, so the graph rebuilds automatically on commit. No pre-existing hooks were overwritten — checked first.
- `graphify install --platform claude` additionally **created a global `~/.claude/CLAUDE.md`** (3 lines, points at the skill). This affects every project on the machine, not just Osiolog. Harmless in content but was not requested — recorded here because a global instruction file is easy to forget about later.
- Note the two install commands differ: `graphify claude install` writes the CLAUDE.md section and hook but **does not** install the skill; `graphify install --platform claude` installs the skill. Both were needed.

### Known limitations
- **Markdown still became graph nodes despite the code-only choice.** Headings from `test_result.md` and `docs/system-design-v1.md` appear as nodes. Interpretation (not verified in the source): the AST pass treats markdown structure as parseable without needing an LLM, so "code-only" excludes *semantic* extraction, not markdown entirely. No document prose was sent anywhere — the no-LLM property holds — but the graph carries some prose noise.
- **Broad `query` calls are noisy.** A general auth question matched 708 nodes and truncated at the token budget, surfacing irrelevant doc headings alongside the right files. `explain "<symbol>"` and `path "<A>" "<B>"` are far sharper and should be preferred.
- Three Gradle files (`frontend/android/**/*.gradle`) failed to parse and contributed no symbols. Harmless for this project's purposes.

### Revisit if
Doc-to-code linking becomes valuable enough to justify an API key — in which case use the sensitive-file-exclusion variant, never the unrestricted scan. Also revisit if the prose noise starts degrading query quality, which would argue for excluding `test_result.md` and `docs/` from extraction.

---

## D-010 — Add Rule 18: instructions the user can actually follow

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** process

### Problem
Rule 10 already required reporting finished work in plain language, and it was being followed. But it covers only *reporting*. It says nothing about the separate case where the user has to **perform** a technical step themselves — and that case was being handled badly.

Three instances in the session of 2026-09-12, all left as dead ends with no steps attached:

- "Revoke the token at github.com/settings/tokens"
- "Restart Claude Code (in VS Code: reload the window)"
- "Worth reviewing that pile before you commit it"

Each names an outcome and omits how to reach it. For a reader who has never used a terminal, each is unactionable.

### Context / constraints
The user is a practising implantologist and the sole owner of this project. They are capable of any technical task the project needs, but have no software background to fall back on when an instruction is incomplete — evidenced in the same session by the question "commit means push to github?", where the two operations had simply never been distinguished for them.

### Options considered
1. **Expand Rule 10** to cover instructions as well as reporting.
2. **Add a separate Rule 18** covering only instructions the user must perform.

### Decision
A separate Rule 18, added after Rule 17. Rule 10 was left untouched.

### Why this one
The user asked for "one more hard rule", so a new numbered rule matches the instruction. It is also the better structure: reporting and instructing fail in different ways and need different tests. Merging them into one rule would have produced a long rule that is easy to half-apply — satisfying the reporting half while still leaving instructions abstract, which is the exact failure being fixed.

### Why not the other
**Expanding Rule 10:** not rejected on merit, and it would have worked. Rejected because it does not match what was asked for, and because a single combined rule blurs two distinct obligations.

### What the rule requires
Do the work yourself when a tool can do it; only hand over steps that genuinely need a human. When handing over: numbered steps, name the window or app first, one copy-ready command per line, state what success looks like, state what to do on failure, warn before irreversible steps, and define each technical word in place. A banned-phrase list (*just*, *simply*, *obviously*, *straightforward*, …) targets the specific habit of using a softener to paper over the hard part.

### Evidence
Observed fact: the three unactionable instructions quoted above, and the "commit means push to github?" question, all from the 2026-09-12 session. Judgement, not measurement: the phrasing rules and banned-word list are engineering judgement about what makes instructions followable — they have not been tested against outcomes.

### Trade-off accepted
Gained instructions the owner can act on without a second round of questions. Gave up brevity — step-by-step instructions are longer than "revoke the token", so replies covering user-side actions will grow. The mitigation is the rule's own first clause: do it yourself where possible, so there are fewer steps to hand over at all.

### Revisit if
Replies become bloated with hand-holding for steps the user already does routinely. The rule should then gain a carve-out for actions they have performed before, rather than being weakened overall.

---

## D-009 — Rename the native app ID `com.osioloc.app` → `com.osiolog.app`

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** mobile / build

### Problem
Firebase registers this app as `com.osiolog.app` — that is the only client in
`frontend/android/app/google-services.json` and the `BUNDLE_ID` in
`GoogleService-Info.plist`, both under project `osiolog-prod`. But the native
projects still declared the older spelling `com.osioloc.app`
(`build.gradle` namespace + applicationId, the `MainActivity.java` package, and
`PRODUCT_BUNDLE_IDENTIFIER` twice in the iOS pbxproj). `frontend/capacitor.config.json`
had already been changed to `com.osiolog.app`, so the rename was half-applied.

### Context / constraints
- `frontend/android/app/build.gradle` applies `com.google.gms.google-services`
  whenever `google-services.json` is non-empty, which it is. That plugin fails the
  build when no client matches the applicationId, so an Android **release** build
  could not succeed in this state.
- Both store checklists in `docs/production-checklist.md` are entirely unticked, and
  no store listing exists. Nothing is installed on a user device under either ID.
- Verified: the iOS `Info.plist` display name and all three camera / photo-library
  permission prompts read "Osioloc" — text shown to the dentist at the OS permission
  dialog.

### Options considered
1. **Rename the native IDs to `com.osiolog.app`** — match Firebase.
2. **Add a second `com.osioloc.app` client in Firebase** — make the config match the code.
3. **Fix only the visible iOS strings**, leave the IDs mismatched.

### Decision
Option 1. Renamed namespace + applicationId, `git mv`'d
`java/com/osioloc/app/` → `java/com/osiolog/app/` with its `package` line, updated both
`PRODUCT_BUNDLE_IDENTIFIER` entries, and rewrote the four "Osioloc" strings in `Info.plist`.
`AndroidManifest.xml` needed no change — it refers to `.MainActivity` relatively, so it
follows the namespace.

### Why this one
It is the only option that leaves one identity. The app is unpublished, so the usual
reason to keep a legacy application ID — not orphaning existing installs and Play
Store updates — does not apply. This window closes permanently at first release:
Play Store locks a listing to its package name.

### Why not the others
- **Second Firebase client:** would make `com.osioloc.app` permanent and keep a
  misspelling in front of users in the iOS permission prompts. It solves the build
  error while entrenching the actual problem.
- **Visible strings only:** leaves Android release builds broken.

### Evidence
Observed fact: package name and bundle ID read directly from `google-services.json`
and `GoogleService-Info.plist`. Observed fact: the google-services plugin application
block at `frontend/android/app/build.gradle`. Observed fact: unticked store checklists.
Engineering judgement (not experimentally verified): that the plugin *would* have failed
the build — the error was reasoned from the plugin's documented matching behaviour, not
reproduced, because no Android SDK build was run in this session.

### Trade-off accepted
Anyone holding a debug APK under the old ID gets a side-by-side install rather than an
upgrade, and must uninstall the old one. No production impact.

### Revisit if
Never for this rename. If the app ID must change again after publishing, it cannot be
done in place — it requires a new store listing.

---

## D-010 — Remove 49 dead files; keep four `osioloc` infrastructure names

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** repo hygiene / docs

### Problem
A full-repo audit was requested: find dead code, apply the engineering rules, make every
doc say "Osiolog", and delete what is unnecessary. Three brand names were live in the
tree at once (DentalHub → Osioloc → Osiolog) and it was unclear which `osioloc` strings
were cosmetic and which named real resources.

### Context / constraints
- Dead code was determined by transitive import-graph reachability from the real
  entrypoints (`frontend/src/index.js`, `backend/app/main.py`), not by grep or by eye.
- Frontend: 44 of 125 modules unreachable. Backend `app/`: 97 of 98 reachable — the
  package is clean; all dead backend code sat at the top level.
- `backend/server.py` (2,326 lines) reads `os.environ['MONGO_URL']` at import time. The
  project runs PostgreSQL, so the module cannot even be imported.

### Options considered
1. **Delete everything unreachable**, including all `osioloc` strings.
2. **Delete unreachable code but keep every `osioloc` string** for fear of breaking infra.
3. **Delete unreachable code and rename only the strings proven cosmetic**, keeping
   identifiers that name live resources.

### Decision
Option 3. Removed: 40 unused Shadcn primitives + `hooks/use-toast.js` (the app uses
`sonner` directly), `api/fpd.js` and `api/implants.js`, `components/ToothActionModal.js`,
`backend/server.py`, `backend/import_excel_data.py`, `backend_test.py`, the stray
`backend/package.json` + lockfile, the empty root `tests/` package, the duplicate
`frontend/package-lock.json`, orphan root `android/` + `ios/` icon folders (43 files
wired to no build), and `.emergent/`. Dropped `motor`, `pymongo` and `bcrypt` from
`requirements.txt`.

Four `osioloc` names are **kept deliberately** and documented in CLAUDE.md:
`osioloc-cases-prod` (S3 bucket), `osioloc-db.…rds.amazonaws.com` (RDS host),
`osioloc-backend` (IAM user), `osioloc_dev` (local dev database).

### Why this one
The brand should be consistent, but a "consistent" doc that names a bucket which does
not exist is worse than an inconsistent one. S3 bucket names are immutable — renaming
that bucket means creating a new one and copying every patient image across. The four
kept names are recorded in a table in CLAUDE.md so the next reader knows the
inconsistency is deliberate rather than missed.

### Why not the others
- **Option 1:** would have rewritten `scripts/bootstrap-aws.sh` to create a *different*
  bucket and pointed `alembic.ini` at a local database that does not exist.
- **Option 2:** leaves the misspelling in the iOS permission prompts and in every doc,
  which is the visible half of the problem.

### Evidence
Observed fact: reachability counts above, from scripted import-graph traversal.
Observed fact: `frontend` build after the deletions — *"Compiled successfully"*, with
gzipped CSS **down 3.53 kB** and JS up 54 B, confirming the removed components were
genuinely unused. Observed fact: `create_app()` constructs with 144 routes and title
"Osiolog API" after the backend deletions, proving nothing imported the removed modules.
Not verified: the backend `pytest` suite was **not** run — pytest is not installed in
either interpreter on this machine and Rule 12 forbids installing packages unasked.

### Trade-off accepted
`requirements.txt` no longer pins `motor`/`pymongo`/`bcrypt`, so the deleted MongoDB
code cannot be resurrected by checking it out alone — the dependencies must come back
too. That is intended. Repo history still holds everything.

### Revisit if
Those AWS resources are ever migrated — at which point update the exceptions table in
CLAUDE.md in the same change.

---

## D-011 — Keep the Shadcn/Radix npm dependencies for now

- **Date:** 2026-09-12
- **Status:** Active
- **Area:** frontend / dependencies

### Problem
Deleting 40 unused Shadcn components orphaned roughly 35 npm packages — 28 `@radix-ui/*`
plus `cmdk`, `embla-carousel-react`, `input-otp`, `next-themes`, `react-day-picker`,
`react-resizable-panels`, and separately `react-hook-form`, `zod`, `@hookform/resolvers`,
`date-fns`, `html2canvas`, `cra-template`, none of which are referenced from `src/`.

### Context / constraints
- A naive "not imported in src/" scan produces false positives: `react-scripts`
  (used by CRACO), `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`
  (CLI tooling), and `@capacitor/camera` / `@capacitor/splash-screen` (registered
  through the native layer and configured in `capacitor.config.json`) all show zero
  `src/` references but are required.
- Removing them means editing `package.json`, regenerating `yarn.lock`, reinstalling,
  rebuilding, and re-running `cap sync` for both native platforms.

### Decision
Deferred, not rejected. The dead *source files* were removed; the dependency pruning was
left as a separate change.

### Why this one
The file deletions are verified by a green build. A dependency prune cannot be verified
in the same pass without a full reinstall and native re-sync, and bundling an unverified
change with a verified one makes both harder to trust or revert. Nothing ships the unused
packages to users — tree-shaking already keeps them out of the bundle — so the cost of
waiting is install time and `node_modules` size, not user-facing weight.

### Why not remove them now
The risk is asymmetric: deleting a package that turns out to be needed by the native
layer breaks the mobile build in a way that surfaces only at `cap sync` or at runtime on
a device, not at `craco build`.

### Evidence
Observed fact: the 40-package list and the zero-reference counts come from a scripted
scan of `package.json` dependencies against all of `src/` plus the three config files.
Observed fact: `@capacitor/splash-screen` is configured in `frontend/capacitor.config.json`
despite zero `src/` references — the concrete case that makes the naive list unsafe.

### Revisit if
Install time or `node_modules` size becomes a problem. Prune the 28 `@radix-ui/*` packages
first — those map one-to-one onto components deleted in D-010 — and verify with a build
plus `cap sync` for both platforms.

---

## D-012 — Notification bell reads existing "due" feeds instead of storing notifications

- **Date:** 2026-09-18
- **Status:** Active
- **Area:** frontend / backend — header reminders

### Problem
The header had no notification affordance. Clinical reminders existed only on the
Dashboard ("Ready for Second Stage", "Ready for Implant Placement") and as a daily
FCM push for implant follow-ups, so a doctor on any other page saw nothing.

### Alternatives weighed
1. **Full notification system** — new `notifications` table, per-item read/unread state,
   history, mark-all-read. Rejected: requires a schema migration and a write path, and
   introduces a second source of truth that can disagree with the clinical records.
2. **Bell as a link to the Dashboard** — badge only, no list. Rejected by the user; the
   point is to see and reach the patient without leaving the current page.
3. **Read-only bell over the existing due feeds** — chosen.

### Decision
`NotificationBell.js` calls three endpoints and renders the union, grouped. No storage,
no read/unread state.

Rows are one per patient, not per implant — a patient with eleven implants due is one
reminder listing eleven teeth. Each group is led by its most urgent member, which is the
only choice that cannot hide an overdue tooth behind a comfortable one. The Dashboard's
two reminder sections were later brought to the same shape, and the grouping moved to
`lib/reminderGroups.js` so the two cannot drift: they show the same records to the same
dentist, and disagreeing about how to count them would be its own bug. Counts on both the
bell badge and the section headers follow the rows rather than the underlying records. The badge is the live count of what is due; an item leaves the list
when the clinical record changes (outcome recorded, second stage logged, implant placed).

### Why this one
The reminder *is* the state of the clinical record. Storing a separate "read" flag would
let the bell claim a follow-up was handled while the implant row still has no outcome —
the failure mode would be a silently dismissed reminder for a real patient. Deriving the
list on read makes that class of bug impossible, at the cost of not remembering dismissals.

### New endpoint and why it was needed
`GET /api/implants/due-for-follow-up` (`flat_routes.py`). Second stage and extraction
sites already had HTTP feeds; follow-ups did not — the only consumer was the scheduled
push job, which queries the DB directly.

Two rules were chosen by the user rather than inferred:
- **7-day look-ahead**, matching `send_followup_reminders()` so the bell and the phone
  push agree rather than showing different counts.
- **Past-dated follow-ups are included**, which the push job deliberately filters out
  (`follow_up_date >= today`). A follow-up whose date passed without an outcome being
  recorded previously alerted nowhere at all. It now sorts to the top, marked overdue.

### Rejected in the same round
Unpaid-balance alerts. `financial_line_items` / `patient_payments` carry no due date —
balance is only `charged - paid`, computed in the frontend (`FinancialsSection.js`) — so
"overdue" had no definition in the data. Rather than invent a threshold, the user chose
to leave payments out until the rule is decided. Not experimentally evaluated.

### Verification status
Verified in production after deploy (commit `21c25b7`):
- `GET /api/implants/due-for-follow-up` with a real Firebase token returns HTTP 200 and a
  JSON array — the query executes against the production database without error.
  A deliberately bogus path under `/api/implants/` returns 422 (it falls through to
  `/api/implants/{implant_id}` and fails UUID validation), so the 200 is specific to the
  new handler rather than a catch-all.
- The live frontend bundle at `osiolog.com` contains `notification-bell-trigger` and
  `due-for-follow-up`, so the UI shipped alongside the backend.
- `craco build` clean (+1.79 kB); Rule 13 and Rule 14 greps clean.

End-to-end data check against production, with the user's approval, using throwaway
records in the demo account (`doctor@dentalapp.com`), all deleted afterwards — every feed
returned to `[]` and the temporary patient was removed:

| Seeded record | Expected | Result |
|---|---|---|
| Follow-up dated 5 days ago, no outcome | Listed, `days_until: -5`, sorted first | Pass |
| Follow-up dated 3 days ahead | Listed, `days_until: 3`, sorted second | Pass |
| Follow-up dated 40 days ahead | Excluded by the 7-day window | Pass — absent |
| Surgery 200 days ago, stage 1, 90-day healing | Listed, `days_elapsed: 200` | Pass |
| Extraction 100 days ago, 60-day reminder, no implant | Listed, `days_elapsed: 100` | Pass |

Field names in each payload match what `NotificationBell.js` reads, and the overdue-first
sort is confirmed.

**Still not verified:** nobody has looked at the rendered panel with rows in it. The data
contract is proven and the bundle is deployed, but the visual result is inference from a
clean build, not observation.

**Correction worth recording:** an unauthenticated 401 was briefly taken as proof the
route had deployed. It is not — this API returns 401 before routing, so a nonexistent
path returns 401 too. Only the authenticated call distinguishes deployed from missing.

### Unrelated observation at deploy time
`app.osiolog.com` — the URL named in `render.yaml` as `FRONTEND_URL` and in CLAUDE.md as
the live app — returns Cloudflare 522 (origin unreachable). `osiolog.com` and
`www.osiolog.com` serve the app normally. Observed fact, not diagnosed; predates this
change and is untouched by it. Followed up in [D-013](#d-013).

### Revisit if
The user wants dismissals to persist (then alternative 1 returns, with a migration), or
decides on an overdue-payment rule.


---

## D-013 — Point `FRONTEND_URL` at `osiolog.com`; keep `app.osiolog.com` permitted

- **Date:** 2026-09-18
- **Status:** Active
- **Area:** backend config / deployment

### Problem
`render.yaml` set `FRONTEND_URL` to `https://app.osiolog.com`, which returns Cloudflare
522 (origin unreachable), while `osiolog.com` and `www.osiolog.com` serve the app.

This was not cosmetic. `FRONTEND_URL` has two consumers:
- `main.py` — first entry of the CORS allow list. Harmless here, because `osiolog.com`
  and `www.osiolog.com` are separately hard-coded, which is why the app kept working.
- `storage.py:63` — `settings_url = f"{settings.FRONTEND_URL}/subscription"`, the address
  Google redirects a doctor's browser to after they approve Drive access, and the target
  of every `?drive_error=` failure redirect.

The reasoning above concluded that **connecting a Google Drive was broken in production**.

**That conclusion was wrong, and is retracted.** It was drawn from the config file without
asking the running server. The live redirect target was, and remains:

    https://www.osiolog.com/subscription?drive_error=access_denied

A working host. `FRONTEND_URL` is set in the Render dashboard to `https://www.osiolog.com`,
and that value — not `render.yaml`'s — is what the process runs with. Drive connect was
never broken by this. No user-facing defect existed.

### How it surfaced
Incidentally, while verifying an unrelated deploy (D-012) — not through a bug report, and
not from any observed failure. That absence of a symptom should have prompted a check
against the running server before a production bug was asserted.

### Decision
`render.yaml`'s `FRONTEND_URL` → `https://osiolog.com` (user's choice of canonical host).
`app.osiolog.com` stays in the CORS allow list, with a comment explaining why a dead host
is listed.

This is tidying, not a fix. It removes a dead hostname from a config file that a future
reader would otherwise trust. It changed nothing at runtime.

### Why keep a dead host permitted
Asymmetric cost. Leaving the string costs nothing — CORS entries are matched, not dialled,
so an unreachable origin is inert. Removing it means that reviving the subdomain later
requires a backend change and redeploy to stop browsers being refused, and that failure
would present as an opaque CORS error. Deliberately a decision to revisit rather than a
permanent keep.

### Not done
The 522 itself is untouched — that is DNS/origin configuration outside this repo. This
change routes around it. If `app.osiolog.com` is meant to be the product's address, the
origin still needs fixing and `FRONTEND_URL` moving back.

### Verification status — and what it disproved
Probing the error branch of the callback is a read-only way to read `FRONTEND_URL` off the
running server: `GET /api/storage/google-drive/callback?error=access_denied` returns a
redirect whose target is `f"{FRONTEND_URL}/subscription"`. No Google account or consent
needed.

- Observed before the change: `https://www.osiolog.com/subscription?drive_error=access_denied`.
- Observed 15 minutes after the push, polled every 20s, and again afterwards: **identical**.
  `api.osiolog.com/api/health` reported `ok` throughout.

So `render.yaml`'s value does not reach the process — the dashboard value wins, or the
blueprint does not re-sync env vars on autoDeploy. Not distinguished from outside, and not
worth distinguishing: either way the file is not the source of truth for this variable.

**Consequence:** `render.yaml` now says `osiolog.com` while production runs
`www.osiolog.com`. Less wrong than a dead host, still not the truth. Only a Render
dashboard edit can align them, which is the user's to make.

### Lesson
Two false claims in this session came from the same habit: reading the repo and reporting
it as production. The config file said `app.osiolog.com`; the server ran
`www.osiolog.com`. Earlier, a string absent from a JS bundle was read as proof of a
deploy when the minifier had merely split it. Where a claim is about what production does,
the evidence has to come from production.

### Revisit if
`app.osiolog.com` is revived (move `FRONTEND_URL` back) or formally decommissioned (drop
it from the CORS list), or the dashboard value is changed to match the file.

---

## D-014 — Daily reminder email: opt-out column, shared queries, 8:05 AM digest

- **Date:** 2026-09-18
- **Status:** Active
- **Area:** backend (schema, scheduler, email) / frontend (Account settings)

### Problem
The doctor expected an email when an implant became ready for second stage. None
existed. Before today, second stage and extraction sites had no alert at all outside the
Dashboard, and implant follow-ups had only an FCM push. Email was wired up but used
solely for Contact Us and manual admin sends (see D-012 for the in-app bell).

### Decisions, and who made them
User's choices, asked before any code:
- **All three clinical feeds** in one digest — follow-ups, second stage, extraction sites.
  Unpaid balances stay out; charges still carry no due date, so "overdue" remains
  undefined in the data (same reasoning as D-012).
- **Daily, 8 AM, only when something is due.** No "nothing due today" email. A daily
  email that is usually empty is one the reader stops opening, and the day it matters is
  the day it gets skipped.
- **Per-doctor opt-out**, on by default, in Account settings.
- **To the doctor only.** Patients are never emailed. Stated explicitly by the user.

### Implementation choices not put to the user
- **8:05 AM IST (02:35 UTC)**, five minutes behind the existing FCM job, so the two do not
  contend for the same worker instant. Same morning slot, so push and email agree.
- **Org-scoped, not doctor-scoped.** The three route handlers filter patients by `org_id`,
  so the email reports exactly what that doctor sees in the app. The older FCM job filters
  by `Patient.doctor_id` instead — an inconsistency that predates this and is untouched.
  For solo doctors, which is every current account, the two are identical.
- **Grouped one row per patient**, matching the bell and Dashboard (D-012).

### The queries moved out of the route handlers
`services/reminders.py` now holds all three "due" queries; `flat_routes.py` and
`tooth_extraction.py` delegate to it. A scheduled job cannot call an HTTP route, and the
alternative was a second copy of each query. Two copies would eventually disagree about
what is due, and the symptom would be a recall the email mentions and the app does not —
noticed, if at all, as a missed appointment. Route JSON is unchanged; the route sets were
diffed against `HEAD` to confirm nothing was dropped in the move.

The Python grouping in `reminder_email.py` does duplicate `lib/reminderGroups.js`. That
one is unavoidable — different languages — and is flagged in both files.

### Migration
`e4a9c2b7f1d3` adds `users.reminder_emails_enabled BOOLEAN NOT NULL DEFAULT true`.
Generated SQL was inspected offline before pushing:

    ALTER TABLE users ADD COLUMN reminder_emails_enabled BOOLEAN DEFAULT true NOT NULL;

On PostgreSQL 11+ a non-volatile default makes this metadata-only — no table rewrite, no
row locks, no data touched, and existing doctors read as subscribed. `downgrade()` drops
the column.

### Verification status
- Verified: the whole app imports; the alembic chain resolves to a single head across 31
  revisions; the migration's SQL was generated offline and read; pytest collects 22 tests;
  frontend compiles; the digest was rendered from realistic fixtures, including the
  eleven-implant patient from the Dashboard screenshot, and groups correctly.
- **Not verified, and none of it can be from this machine:** the migration has never been
  executed against any database (no local PostgreSQL, no Docker — see D-012). The
  scheduled job has never run. No reminder email has ever been sent or received. The
  Account toggle has not been clicked.
- **Unknown:** whether `RESEND_API_KEY` is even set in production. It is absent from
  `render.yaml`, but D-013 established that the file is not the source of truth — the
  Render dashboard is. If it is unset, `is_configured()` returns False and the job logs a
  warning and sends nothing. Silent to the doctor.

### Risk accepted
The migration runs automatically via `start.sh` (`alembic upgrade head`) on deploy. A
migration that fails takes the API down, because the process will not start. Judged
acceptable because the statement is the simplest additive form there is and its SQL was
read before pushing — but it is judgement, not a test.

### Revisit if
The FCM job's doctor-scoping vs this job's org-scoping ever diverges in practice, i.e.
when an org first has more than one doctor.

---

## D-015 — Auto-deduct stock when an implant/abutment is logged, via an explicit picker

- **Date:** 2026-09-19
- **Status:** Active
- **Area:** backend (schema, models, routes) / frontend (implant + abutment forms)

### Problem
Logging an implant never touched stock. The doctor had to separately open the Stock page
and use "Log Usage" to record what was actually consumed — an easy step to forget, and one
that duplicates data already entered once on the patient record.

### Why matching wasn't done automatically from typed brand/size
Brand, diameter and length on the implant/abutment forms are free-text, typed fresh each
time — there is nothing forcing "Straumann" logged today to match "Straumann" spelled the
same way on a stock item created months ago. Auto-matching on that text would silently
deduct the wrong item, or nothing, on any spelling drift — a real risk to a real stock
count, not a cosmetic bug. Put to the user directly; they chose the explicit-picker route.

### Decision
Added `inventory_item_id` to `Implant` and `Abutment` (nullable FK → `inventory_items.id`,
`ON DELETE SET NULL`), mirroring the existing `Implant.surgical_kit_id` field exactly — same
type, same nullability, same delete behaviour. A new dropdown in each form ("Stock Item
Used") lists real stock items with live counts; picking one auto-fills brand/system/
diameter/length (or abutment_type/size_label) and is what the backend now uses to move
stock — never the typed text.

Scope, per the user's explicit choices:
- **Implants and abutments both** — abutments have the identical gap and were folded in.
- **Never blocks the save.** Insufficient or zero stock returns a warning string
  (`stock_warning` on the response), shown as a toast; the clinical record always
  persists regardless. Chosen over blocking because gatekeeping "I placed this on a
  patient" behind a stock-room mismatch is worse than a stock count being briefly wrong.
- **Edits and deletes stay in sync automatically.** Changing which item is linked reverses
  the old deduction and applies a new one; deleting the record reverses it. Without this,
  the ledger would quietly drift from reality every time a record is corrected — exactly
  the failure mode the manual workflow already had.

### What was deliberately left out of scope
- **Bulk-import paths** (`BulkImplantModal.js`, the scan-based quick-add in
  `PatientImplantLogForm.js`, `implant-log-import.py`) do not get a stock picker and do not
  deduct stock. These import historical rows against *current* stock, which is not a
  sensible operation, and none of them collect an `inventory_item_id` today. Records made
  through them still save exactly as before — `inventory_item_id` is optional everywhere.
- The now-unused `PUT /api/implants/{id}` route in `flat_routes.py` and the nested
  `POST /api/cases/{case_id}/implants` route were still wired for consistency (so behaviour
  doesn't silently depend on which endpoint happens to be called), even though the current
  frontend only calls `POST /api/implants` and `PATCH /api/implants/{id}`.

### Shared code
The stock-reversal/deduction logic lives in one new module,
`backend/app/services/stock_linking.py`, called from all eight touched routes (implant
create ×2, update ×2, delete ×1; abutment create/update/delete ×1 each) rather than copied
into each. `stock_transactions.source_type` / `source_id` were added to find "the
transaction this implant created" for reversal — copied field-for-field from
`financial_line_items.source_type`/`source_id`, which already solves the identical
"trace a ledger row back to the clinical record that caused it" problem.

`ImplantRead.stock_warning` / `AbutmentRead.stock_warning` are response-only fields, set
after `model_validate()` rather than stored — the same pattern `auth.py`'s
`_user_read_with_pic` already uses for a presigned URL that isn't a real column either.

### Verification status
- Verified: full app import; migration chain resolves to a single head (32 revisions);
  generated SQL for the new migration read offline — three additive columns, two indexes,
  two foreign keys, no table rewrite, no existing row touched; `pytest --collect-only`
  unchanged at 22 tests; frontend compiles; every touched file's diff checked against `HEAD`
  to confirm no unrelated change was swept in.
- **Not yet verified as of writing this entry:** none of this has been deployed. A dry run
  against the live API (demo account, throwaway patient and stock items) correctly showed
  *no* effect — proving the old code is still what's running, not that the new code works.
  Re-run scheduled immediately after this push lands.

### Revisit if
`BulkImplantModal.js` or the scan-based quick-add path are asked to support stock linking
too — the picker and payload field already exist, so wiring is additive.

---

## D-016 — Stock linking for scan-based and bulk implant entry: a post-save dialogue

- **Date:** 2026-09-19
- **Status:** Active
- **Area:** frontend only — no backend or schema change

### Problem
D-015 added a stock-item picker to the single-implant form, but explicitly left
`BulkImplantModal.js` (multi-tooth entry for one patient) and the scan-based tool in
`PatientImplantLogForm.js` (photograph a written log sheet, AI reads it, review before
saving) unlinked. The user asked for those covered too.

### Why not just add a picker column to each row
Both tools already show a wide, editable table/form before save — the scan tool's table is
1300px wide with 14 columns per row. Adding a 15th (stock item) makes an already-dense
review screen worse, and — for the scan tool specifically — a picked stock item can't
really be verified against a row until the row's other fields are actually confirmed by the
doctor, since OCR can misread a row entirely.

### Decision (three choices, all put to the user)
1. **Timing: after the batch saves, not before.** A separate dialogue opens once the
   implants already exist, listing exactly what was created. Rejected: making the link a
   precondition of the save itself — if that step is abandoned partway, the whole batch
   would need re-entering from scratch, which is a much larger loss than an unlinked
   implant.
2. **Matching: every row starts blank.** No suggested match by typed brand/diameter/length,
   consistent with D-015's core reasoning — free-typed text (doubly so here, since one path
   is OCR output) cannot be trusted to identify a stock item, so it isn't given the chance
   to guess wrong even as a "suggestion."
3. **Required: no.** Closing the dialogue without linking anything is always safe — the
   implants are already saved by the time it opens. Matches the single-implant form's own
   rule that a clinical record is never gated on stock bookkeeping.

### Shared code, not two new dialogues
Built once as `LinkImplantStockModal.js` and used by both `BulkImplantModal.js`
(`onImplantsCreated` callback, rendered in `PatientDetails.js`) and
`PatientImplantLogForm.js` (rendered directly inside its own `PhotoMethod`, since that tool
lives on the Account page with no shared parent to hoist state into). Fetches its own stock
list on open rather than taking one as a prop, since the two callers have no natural place
to share it from.

Saving a link reuses the exact `PATCH /api/implants/{id}` endpoint and
`stock_linking.sync_link()` deduction logic D-015 already built and deployed — nothing new
on the backend. `stock_warning` responses surface as the same toast pattern used elsewhere.

### Deliberately out of scope
The Excel-upload path (`implant-log-import.py` / `ExcelMethod` in
`PatientImplantLogForm.js`) is untouched. That import runs server-side in one shot and the
frontend never sees individual created-implant records to build a follow-up dialogue from —
and per D-015's existing reasoning, importing historical rows against *today's* stock isn't
a sensible operation regardless.

### Verification status
- Verified: frontend compiles clean; every touched file's diff checked against `HEAD`
  (7/16/11 lines changed respectively — small, exactly matching the intended edits).
- **Not verified:** no backend change was needed, so no new deploy risk — but the dialogue
  itself has not been opened in a browser. The underlying deduction path it calls
  (`PATCH /api/implants/{id}` with `inventory_item_id`) was already proven end-to-end in
  production for D-015; only the new UI wiring around it is unverified.

### Revisit if
The Excel-import path is ever asked to support this — would need that endpoint to start
returning created implant IDs, which it doesn't today.

---

## D-017 — "Refer a Colleague": a shared link, manual admin approval, a capped storage reward

- **Date:** 2026-09-26
- **Status:** Active
- **Area:** backend (schema, registration flow, admin) / frontend (Account, Admin)

### Problem
The user wanted a way for existing doctors to introduce colleagues to Osiolog. The first
idea raised — scraping doctors' personal contact details (email, phone, home address) off
the AP State Dental Council's public licence-verification registry to send unsolicited
marketing email — was refused. That registry exists to verify who holds a real dental
licence, not as a marketing list; bulk-harvesting it for cold outreach risks breaching the
council's own terms and India's DPDPA, and unsolicited bulk mail risks getting
`hello@osiolog.com` blocked as spam, which would take the reminder and welcome emails down
with it. The user redirected to referrals instead.

### Decisions, each put to the user before building
1. **What a referral actually does: give the doctor a message to send themselves, not have
   Osiolog email the colleague directly.** Rejected the alternative (doctor types a
   colleague's email, Osiolog sends it) because it puts a stranger's email into the database
   on someone else's say-so — a real consent question, avoided entirely by never collecting
   that email at all.
2. **Reward: extra storage, permanently, not a plan-tier bump or a time-limited trial.**
   Storage was chosen deliberately even after being told it currently gates nothing (see
   below) — the user wanted the mechanism in place now as groundwork.
3. **Amount and cap: 500MB per approved referral, capped at 5120MB (5GB) total.** Both
   numbers came from the user; neither was invented.
4. **Tracking: automatic (a code embedded in the link), but reward is not automatic — an
   admin approves each one.** Chosen over pure self-service so a referral link opened by
   mistake, or a doctor testing their own link, can never grant a reward with nobody having
   looked at it.
5. **Placement: Account page**, beside the reminder-email toggle, matching the existing
   settings-style layout there.

### A fact surfaced before building, not after
Storage limits are not enforced anywhere in this codebase — `storage_limit_mb()` is read in
exactly one place (`GET /api/subscription/status`) purely for display, and "used_mb" is
hardcoded to 0 there since real usage isn't measured yet. `patient_limit()` and
`clinic_limit()`, by contrast, are both genuinely enforced (`patients.py`, `clinics.py`).
This was put to the user directly rather than silently building a reward that does nothing
— they chose to keep storage as the reward anyway, explicitly as groundwork for later
enforcement (see the user's separate storage-measurement request, tracked separately).

### Data model
Four columns added to `organizations` (migration `a3e7c1b9d2f5`), no new table:
- `referral_code` — nullable, unique, generated lazily on first use of "Refer a Colleague"
  rather than backfilled for every existing org, so the migration carries no bulk-uniqueness
  risk.
- `referred_by_org_id` — nullable FK to `organizations.id`, `ON DELETE SET NULL`, set once at
  registration if a valid code was supplied.
- `referral_reward_status` — `'none' | 'pending' | 'approved' | 'rejected'`, describing *this*
  org's own referral (whether the org that referred it has been paid out).
- `storage_bonus_mb` — the referrer's cumulative reward, added on top of
  `PLAN_LIMITS[plan]["storage_mb"]` via a new `total_storage_limit_mb()` helper.

One org can only ever have one referrer, so this fits on the referred org's own row without
a join table — the referrer's side (cumulative bonus) is just their own `storage_bonus_mb`.

### Registration flow (Rule 11 — auth — territory)
Only one signup path is actually wired to the frontend: Google sign-in through
`completeGoogleRegistration()` in `AuthContext.js`. A same-named, fully-built email/password
path (`register()`) exists in code but nothing in the UI calls it — both were still wired for
referral tracking, for parity if that path is ever exposed, at no extra cost.

A referral code arriving via `?ref=` on `/register` is stashed in `sessionStorage` (a plain
JS variable would not survive the Google popup redirect and the separate CompleteProfile.js
page that follows it), read once at the actual registration call, and cleared immediately —
so it cannot leak into a later, unrelated signup in the same browser tab. An unknown or
missing code is silently ignored inside `find_referrer()`: **registration itself must never
fail because of a bad referral link**, only the reward is affected.

### Verification status
- Verified: full app import; migration chain resolves to a single head (33 revisions);
  generated SQL read offline — four additive columns/indexes/constraints on one table, no
  rewrite; frontend compiles; every touched file's diff checked against `HEAD`.
- **Pending, before push:** a full round-trip against production — register a throwaway
  referred account through a throwaway referrer's real link, confirm the referrer sees
  "1 referral awaiting review," approve it as admin, confirm the bonus lands — is planned
  next and will be added to this entry once run. Admin approve/reject cannot be tested by
  Claude directly (no admin credentials), only observed indirectly via the referrer's own
  `pending_count`.

### Revisit if
Storage limits become enforced — at that point this reward starts doing something
observable beyond a number on the Subscription page, and it's worth re-confirming the
500MB/5GB figures still make sense once they carry real weight.
