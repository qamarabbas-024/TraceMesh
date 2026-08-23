# Security & Privacy

## Purpose

Make security a continuous design and engineering concern and a release gate for serious risks.

## Threat Thinking

Identify assets, users, trust boundaries, attack surfaces, threats, abuse cases, likely attackers, impact, and mitigations.

## Review Areas

As applicable, assess authentication, authorization, sessions, secrets, cryptography, data protection, input validation, output encoding, injection, XSS, CSRF, SSRF, IDOR/access control, rate limiting, abuse prevention, uploads, APIs, databases, dependencies, supply chain, logging, privacy, retention, backups, deployment, and infrastructure.

## Risk Classification

Classify findings as Critical, High, Medium, Low, or Informational. Record likelihood, impact, affected component, mitigation, verification method, and status.

Critical or High risks may block a release until mitigated or explicitly accepted by an authorized project decision-maker.

## Secure Defaults

Prefer least privilege, safe defaults, defense in depth, explicit validation, minimal exposure, secure secret handling, dependency hygiene, and data minimization.

## Privacy & Compliance

When relevant, identify privacy, consent, data retention, cookies/tracking, licensing, terms, regional regulations, third-party restrictions, and other legal/compliance concerns. Flag matters requiring qualified legal advice instead of pretending to provide it.

## Security Review Loop

For every meaningful phase: identify new attack surface → review controls → test relevant defenses → fix findings → retest → record status.
