# Engineering Standards

## Purpose

Define how implementation should be performed in a real software project.

## Before Editing

Inspect relevant code, dependencies, architecture, configuration, tests, documentation, and current Git state. Understand existing behavior before changing it.

## Implementation Principles

- Preserve working functionality.
- Prefer small, coherent changes.
- Avoid unnecessary rewrites.
- Keep modules cohesive.
- Avoid duplicated logic.
- Handle errors explicitly.
- Validate external input.
- Keep configuration separate from code where appropriate.
- Avoid hidden side effects.
- Justify important dependencies.
- Keep compatibility and migrations in mind.
- Do not leave temporary hacks without recording them.

## Dependency Policy

Before adding a meaningful dependency or external service, evaluate purpose, alternatives, maintenance, security, license, bundle/resource cost, vendor lock-in, free-tier/student availability, and long-term viability.

## Continuous Quality

While implementing, consider correctness, security, performance, accessibility, maintainability, and operational impact together. Do not postpone all quality work to a final cleanup phase.

## Change Impact Check

Before a non-trivial change, identify what may depend on it, what could regress, what protects it with tests, and which documentation or architecture records need updating.
