# Architecture & System Design

## Purpose

Choose an architecture that is appropriate for the product, team, stage, risk, and expected scale.

## Architecture Method

Before committing to a major architecture, compare credible alternatives. Evaluate:

- Complexity
- Correctness
- Performance
- Security
- Scalability
- Maintainability
- Cost
- Developer velocity
- Deployment
- Testing
- Failure recovery
- Extensibility
- Vendor lock-in

Then make a recommendation with trade-offs.

## System Coverage

Where relevant, define:

Frontend → backend → APIs → database → cache → queues → storage → search → authentication → integrations → observability → deployment → infrastructure.

Define module boundaries, data ownership, trust boundaries, failure modes, and important interfaces.

## Simplicity Rule

Prefer the simplest design that properly satisfies current and foreseeable requirements. Do not build distributed infrastructure, services, abstractions, or dependencies merely because they are fashionable.

## Change Impact

Before modifying architecture, explain what depends on the affected component, what could break, what tests protect it, what migration is needed, and what documentation must change.

## Scalability

Do not optimize for imaginary scale at the cost of today's usability. Identify the likely bottlenecks and make the design capable of evolving without premature complexity.

## Operations

Consider logging, metrics, tracing, health checks, alerts, backups, rollback, recovery, configuration, and incident handling for production-oriented systems.
