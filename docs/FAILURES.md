# Failure & Lesson Log — Osiolog

What went wrong, how it was found, what it cost, and what to do differently.

Governed by [`UNIVERSAL PROJECT DECISION & IMPLEMENTATION DOCUMENTATION RULE.md`](../UNIVERSAL%20PROJECT%20DECISION%20&%20IMPLEMENTATION%20DOCUMENTATION%20RULE.md) §5 and §18.

**Read this first:** a failure stays in this log even after it is fixed. Deleting a resolved failure destroys the only record of *why* the current approach looks the way it does, and invites someone to repeat the mistake. Record dead ends and wrong assumptions, not just bugs.

**Honesty rules:** distinguish the cause you *verified* from the cause you *suspect*. If the root cause was never actually confirmed, say so — a confident wrong diagnosis in this file is worse than an honest "not confirmed".

---

## Template

```markdown
## F-XXX — <short title>

- **Date:** YYYY-MM-DD
- **Severity:** blocker | major | minor
- **Status:** Resolved | Worked around | Open | Accepted

### What was attempted, and why
### What was expected
### What actually happened
### How it was detected
The signal that revealed it.

### Investigation
Steps actually taken, in order.

### Root cause
State plainly whether this was **confirmed** or **suspected**.

### Fix
What was done. Did it work?

### Alternatives considered
### Lesson
### Could it recur?
What would prevent it, or catch it faster next time.
```

---

## F-001 — gstack setup aborted: bun missing

- **Date:** 2026-09-12
- **Severity:** blocker (for the gstack install only)
- **Status:** Resolved

### What was attempted, and why
Running gstack's official installer, `./setup --host claude --prefix`, to register its 54 skills with Claude Code.

### What was expected
The README advertises a 30-second install: clone, run `./setup`, done. Nothing in it mentions a prerequisite runtime.

### What actually happened
The script exited immediately:

```
Error: bun is required but not installed.
```

No skills were registered.

### How it was detected
Immediate, loud, non-zero exit. This is the good case — the script checks its prerequisite up front (line 52) and refuses to half-install.

### Investigation
1. `head -c 600 setup` → a bash script, `#!/usr/bin/env bash`, explicitly documented as bash-3.2-clean, so Git Bash on Windows is a supported host.
2. `grep -n "bun" setup` → the dependency is real, not incidental.
3. `cat package.json` → located the actual use: `bun build --compile` produces three binaries — `browse`, `make-pdf`, and the diagram renderer.
4. Confirmed the 54 `SKILL.md` files are plain markdown with no build step of their own.

### Root cause
**Confirmed.** gstack compiles native binaries at install time and bun is the compiler. bun was not present on the machine, and is not a dependency of anything else Osiolog uses.

### Fix
`npm i -g bun` (resolved to 1.4.2, reusing the existing Node 24 toolchain), then re-ran `./setup --host claude --prefix`. Worked. Recorded as [D-004](DECISIONS.md#d-004--install-bun-to-complete-the-gstack-build) because it adds a global tool to the machine.

### Alternatives considered
Hand-copying the 54 skill folders and skipping the binaries. Rejected — it yields an install where `browse`, `design-review`, `make-pdf` and `diagram` exist but fail when invoked. A loud failure at install time is much better than a silent one mid-task.

### Lesson
A README's "30-second install" describes the author's machine, not yours. Read the prerequisite check before assuming a clone is sufficient — and when a dependency appears, find out *what it is actually used for* before deciding whether it matters. Here it turned out to gate browser automation, which this project's own rules require.

### Could it recur?
Yes — `gstack-upgrade` may need bun again, and bun must stay on `PATH`. If a future gstack run fails the same way, `npm i -g bun` is the fix. Nothing else in Osiolog depends on bun, so it can be removed if gstack is ever dropped.

---

## F-002 — Five security skills silently vanished after checkout

- **Date:** 2026-09-12
- **Severity:** major (silent data loss during install)
- **Status:** Worked around — see [D-005](DECISIONS.md#d-005--leave-the-5-defender-blocked-security-skills-uninstalled)

### What was attempted, and why
Copying all 818 skills from the cloned Anthropic Cybersecurity Skills repo into `~/.claude/skills/` so Claude Code could discover them.

### What was expected
820 loadable skills: 818 security + `karpathy-guidelines` + gstack's root skill.

### What actually happened
Only **815**. Five directories existed with their `LICENSE`, `references/` and `scripts/` intact, but no `SKILL.md`. A skill folder without `SKILL.md` is silently ignored — it does not error, it simply never appears.

### How it was detected
A count check immediately after copying:

```bash
ls -1 ~/.claude/skills | wc -l                        # 820 directories
find ~/.claude/skills -maxdepth 2 -name SKILL.md | wc -l   # 815 files
```

The five-file gap between directories and loadable skills is the only reason this was caught. **Without that check the install would have looked completely successful.**

### Investigation
1. Listed the five offenders — each had everything *except* `SKILL.md`.
2. Checked the source clone — the same five were missing there too, so the copy was faithful and the problem predated it.
3. `git status --short` in the clone → all five listed as ` D` (deleted from working tree, present in index). So git checked them out and something removed them afterwards.
4. `git checkout -- skills/` to restore → they came back as ` M` (**modified**), not clean. Something was rewriting them on contact.
5. `head -5` on two of them → `Permission denied`, despite `ls -l` reporting correct sizes (8,041 and 14,781 bytes).

### Root cause
**Suspected, not confirmed.** Every symptom matches on-access antivirus quarantine: files deleted post-checkout, restored-then-immediately-altered, and locked against reads while still showing their true size. The five subjects — sigstore signing, SLSA provenance, cosign image provenance, VirusTotal malware-hash enrichment, XML injection testing — are exactly the kind of content a heuristic scanner flags.

Windows Defender is the overwhelmingly likely agent, but **this was not verified** — Defender's quarantine log was never inspected and no exclusion was tested to confirm the files survive without it. Recorded as inference.

### Fix
None applied. The five were deliberately left out after presenting the choice to the user; none of the five is relevant to a JSON-based React + FastAPI app with no container signing and no XML parsing. Full reasoning in [D-005](DECISIONS.md#d-005--leave-the-5-defender-blocked-security-skills-uninstalled).

### Alternatives considered
Adding a Defender exclusion for `~/.claude/skills`. Rejected — needs elevation, and disables antivirus scanning for a directory holding 813 offensive-security documents. That is a real reduction in the machine's security posture in exchange for five unusable-here skills. Treated as the user's decision to make, not an implementer's.

### Lesson
Two distinct lessons, and the second is the more important one.

1. **On Windows, a successful `git clone` does not mean the files are on disk.** Security tooling can remove or lock files *after* checkout reports success. `git status` in a fresh clone is a cheap way to catch it: anything showing ` D` or ` M` in an untouched clone means something external is interfering.
2. **Count what you installed, don't assume the copy worked.** `cp -r` exited 0 and printed nothing. The only reason this was caught is that directories and `SKILL.md` files were counted separately and compared. Any bulk install of many small units should end with a count assertion — otherwise partial failure looks identical to success.

### Could it recur?
Yes, on every re-clone or `git pull` of this repo, and plausibly with any other security-content repo on this machine. It will also recur silently if the count check is skipped. Verification command:

```bash
find ~/.claude/skills -maxdepth 2 -name SKILL.md | wc -l   # expect 870
```

Verified totals as installed on 2026-09-12: **870** loadable skills = 813 security (818 minus these 5) + 1 `karpathy-guidelines` + 56 gstack (54 user-facing `gstack-*`, 1 `gstack` root alias, 1 internal `_gstack-command`).

---

## F-003 — Android release keystore committed to git, password in a tracked doc

- **Date found:** 2026-09-12
- **Area:** security / release
- **Cost:** none yet — caught before first publish

### What was expected
`docs/production-checklist.md` stated, in its own words:
*"**File location:** `~/Desktop/osioloc-release.keystore` (NOT in git — keep this file safe)"*.

### What actually happened
The keystore was in git. `git ls-files` returned
`frontend/android/app/osioloc-release.keystore`, and `git check-ignore` confirmed no
rule covered it. The same doc listed the keystore password, key alias and key password
in a plaintext table, and repeated the password twice more in a copy-paste
`./gradlew bundleRelease` command.

So the signing key and its password sat in the same tracked repository, two files apart,
while the document asserted the opposite.

### Root cause
Two separate causes compounding:
1. `.gitignore` had no `*.keystore` rule. The file was added before anyone thought to
   write one, and nothing ever flagged it.
2. The "NOT in git" line described an **intent** at the time of writing, and was never
   re-checked against reality. A claim about repository state was recorded in prose and
   left to rot instead of being enforced by a rule.

A third factor made it easy to miss: the `.gitignore` "Mobile development" section was
malformed. `android-sdk/` had lost its newline and was glued to the next path, producing
the single meaningless entry
`android-sdk/frontend/node_modules/.cache/default-development/4.pack`, plus a stray
`-e ` line from a bad `echo -e >>` append. The section looked populated while ignoring
almost nothing.

### Fix
- `git rm --cached` on the keystore — untracked, file preserved on disk.
- Added `*.keystore` and `*.jks` to `.gitignore`; verified with `git check-ignore`.
- Repaired the malformed `.gitignore` block so `android-sdk/` is actually ignored.
- Replaced the password table and the build command in `docs/production-checklist.md`
  with password-manager references and a `read -rsp` prompt, plus an explicit warning
  that the old key must be treated as compromised.

### Why this was recoverable
Osiolog has not been published. Both store checklists are unticked, so no listing is
locked to that key. Generating a fresh keystore before first release closes the issue
completely. **Had this been found after publishing, it could not have been fixed** —
Google Play binds a listing to its signing key permanently, so a leaked key would mean
either shipping updates signed with a compromised key or abandoning the listing.

### Lesson
1. **A comment claiming something is not in git is not a control.** `.gitignore` is the
   control. If a doc asserts a file is untracked, there must be a rule enforcing it —
   otherwise the sentence is a guess that ages badly.
2. **Never write a credential into a file that lives in the repo**, including as part of
   a convenient copy-paste command. The convenience is what gets it committed.
3. **Check `.gitignore` renders as the rules you think it does.** A missing newline
   silently merged two entries here and neither was ever in effect.

### Could it recur?
The keystore specifically, no — `*.keystore` and `*.jks` are now ignored. Other secrets,
yes. Verification command:

```bash
git ls-files | grep -Ei '\.(keystore|jks|pem|p12|key)$'   # expect no output
```

---

## F-004 — Scripted edit clobbered the Contact Us email body, caught before commit

- **Date:** 2026-09-18
- **Severity:** Would have broken Contact Us in production had it shipped
- **Status:** Fixed before commit; nothing reached the repo

### What was expected
Adding `send_welcome_email()` to `app/services/email.py` should have touched only the new
function. An earlier scripted edit had mangled its body, so a follow-up script replaced
the block between `    body_text = (` and the next `    )`.

### What happened
`s.index("    body_text = (")` matched the **first** occurrence in the file, which belongs
to `send_contact_notification()` — not the intended one further down. The contact email
body was overwritten with the welcome text, leaving that function referencing an undefined
`who`:

    def send_contact_notification(name, email, subject, message):
        ...
        body_text = f"""Hi {who},          # NameError at runtime

Contact Us would have returned 500 on every submission. It was found by reading the file
after a syntax check failed for an unrelated reason, not by the check itself.

### Root cause
Two compounding habits, both mine:

1. **Editing source by index-matching on a generic string.** `body_text = (` is not a
   unique anchor; `def send_welcome_email` is. The script asserted nothing about *which*
   occurrence it found, so it silently hit the wrong function.
2. **Heredoc escape collapse.** The original mangling came from passing Python containing
   `\n` and `\b` through `python - <<'PY'`; the escapes did not survive intact. `\b`
   became a literal backspace byte (0x08) inside a regex — visible only in `od -c`, not in
   `sed` or an editor. Each repair attempt introduced the next problem.

### Fix
- Restored `send_contact_notification()` and verified it byte-identical to `HEAD` with
  `diff` against `git show HEAD:...`, rather than by eye.
- Replaced escape-bearing heredocs with either the Edit tool (no shell layer) or
  `chr(92)`-built strings (no escape to collapse).
- Anchored the remaining edit on the function name, not the generic assignment.

### Lesson
1. **Anchor a scripted edit on something unique, and assert the match count.** Every other
   edit in this session used `assert s.count(old) == 1` and none of them went wrong. This
   one used `index()` with no assertion, and it did. The assertion was the control.
2. **Verify a repair against the committed version, not against reading it.** `diff`
   against `git show HEAD:<path>` is the check; "it looks right" is not.
3. **Do not push escapes through a shell heredoc into Python.** Use the editing tool, or
   build the characters explicitly.
4. **A corrupted byte can be invisible.** `sed` rendered the backspace as `\b` and looked
   correct. `od -c` is what showed it.

### Could it recur?
Yes, for any scripted multi-line edit. The guard is the habit in Lesson 1, and checking
the whole diff before committing — which is what caught it here, since the file was read
in full before the commit rather than after.
