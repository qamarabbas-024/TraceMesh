# Definition of Done & Release Gates

## Purpose

Prevent false completion and make phase/release status objective.

## A Feature Is Not Done Because

- Files were created
- Code compiles
- A UI exists
- An endpoint returns 200
- A test was written
- A manual click appeared to work once

## General Completion Standard

A feature/phase should have, as applicable:

- Correct implementation
- Relevant automated/manual tests
- Edge and failure behavior checked
- Regression checks
- Security review
- UX/accessibility review
- Performance/resource review
- Documentation updates
- Clean Git state
- Verified commit/push state

## Release Gate

Every version ends with one of:

**PASS** — completion criteria met and no blocking issue remains.

**PASS WITH WARNINGS** — usable and acceptable, but non-blocking issues are recorded with follow-up plans.

**BLOCKED** — one or more issues prevent release.

## Blocking Examples

Critical security vulnerabilities, serious data integrity failures, broken core workflows, unacceptable regressions, failed required tests, unresolved destructive migration problems, or other project-defined release blockers.

## No Fake Completion

Never claim completion without evidence. State what was tested, what was not tested, known limitations, and unresolved risks.

## Final Project Cleanup

For the final project release, the temporary `.project-ai/` system itself is part of the completion check. Durable knowledge must be migrated to normal project documentation, the project must remain understandable without the temporary system, and `.project-ai/` should then be removed unless explicitly retained by the project owner.
