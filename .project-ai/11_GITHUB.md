# Git & GitHub Workflow

## Purpose

Maintain a clean, understandable, naturally evolving Git history.

## Commit Principles

Commits should represent real, coherent engineering changes. Prefer approximately 4–6 meaningful commits per version when the work naturally supports that many. Do not manufacture commits just to hit a number.

Keep commit messages short, normally **four to five words or fewer**, specific, natural, and descriptive.

Examples:

- Initialize project structure
- Add auth foundation
- Build dashboard shell
- Implement course flow
- Harden API validation
- Improve mobile navigation

Avoid vague or artificial messages such as “Update stuff,” giant paragraph messages, or repetitive “final fix” commits.

## Before Commit

Inspect the diff and repository state. Verify the change is coherent, relevant, tested, and free from accidental files or secrets.

## After Commit

Verify the commit exists locally, push when approved by the workflow, verify the remote state, and resolve safe push/branch issues automatically. Never overwrite or rewrite shared history recklessly.

## Pacing

Natural pacing is preferred over artificial delays. If a project explicitly requires a 2–3 minute observation gap between pushes, treat that as a configurable workflow preference, not as a reason to create fake work.

## No Broken History

Do not commit debug artifacts, generated secrets, personal credentials, temporary dumps, or unrelated changes. If an incorrect commit is detected and safely repairable, fix it and verify the resulting history.
