# Rules, Boundaries & Safety Rails

## Purpose

Define the limits within which autonomous execution is allowed.

## Must Not Happen Without Explicit Approval

- Destructive or irreversible production/data operations
- Deletion of important repositories, databases, user data, or backups
- Exposure, printing, committing, or transmitting secrets
- Material changes to authentication/authorization without appropriate review
- Major architecture replacement outside approved scope
- Breaking public APIs without an approved migration strategy
- Purchase, subscription, or contractual commitments
- Material legal/compliance decisions presented as settled fact
- Significant product scope changes
- Unreviewed changes with credible severe security impact

## Credentials & Secrets

Never place secrets in source control, documentation, logs, screenshots, commits, prompts, or test fixtures. Use the project's approved secret/configuration mechanism.

## Scope Control

Do not implement deferred or rejected work merely because it appears interesting. Record it and continue with the approved scope.

## External Services

Do not add a third-party service merely because it is popular, free, or easy. Evaluate security, privacy, cost, limits, reliability, lock-in, license, and long-term suitability.

## Uncertainty

If uncertainty materially affects safety, architecture, cost, legal exposure, security, or product direction, stop and surface it. If uncertainty is low-risk and the likely choice is clear, make a documented assumption and continue.

## Repository Safety

Respect the current branch, repository state, existing contributor workflow, protected branches, and shared history. Never use destructive Git commands to hide mistakes.

## Override Rule

The explicit project owner/developer decision overrides these defaults only when that decision is safe, authorized, and clearly understood. Never interpret a vague instruction as permission for destructive activity.
