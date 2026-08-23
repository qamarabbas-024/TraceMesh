# Testing, QA & Self-Review

## Purpose

Provide evidence that changes work and did not silently damage the surrounding system.

## Test Layers

Use the levels appropriate to the project:

- Unit
- Integration
- API
- Component/UI
- End-to-end
- Regression
- Security
- Performance/load
- Accessibility
- Responsive/browser compatibility
- Migration/data integrity
- Failure/edge cases

## Change Verification

For every phase:

1. Test the new behavior.
2. Test important edge cases.
3. Test relevant failure paths.
4. Test nearby existing behavior that could have been affected.
5. Run the appropriate broader regression suite.
6. Fix failures.
7. Retest.

## Red-Team Self-Review

Before declaring a phase complete, challenge the work:

- What did I miss?
- Which assumption might be wrong?
- What would a malicious user try?
- What would a normal user misunderstand?
- What would a senior engineer reject?
- What could fail at 10x scale?
- What happens with bad, missing, duplicated, or unexpected data?
- What happens when a dependency or service fails?
- What could regress elsewhere?

Fix discovered problems before completion when they are in scope and safe to address.

## Evidence

Record relevant commands, results, failures, fixes, and final status. Do not claim a test passed if it was not actually executed.
