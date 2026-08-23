# Documentation & Knowledge Management

## Purpose

Keep project knowledge accurate, discoverable, and useful to both humans and future AI agents.

## Documentation Reality Rule

Documentation must describe what actually exists. Do not document planned capabilities as if they are implemented.

## Typical Documentation

Use the project's normal documentation structure as appropriate:

- README.md — purpose, key features, setup, usage, architecture overview, contribution basics
- Development guide — local setup and workflow
- Architecture documentation — system structure and boundaries
- Security documentation — relevant controls and security notes
- Testing documentation — test strategy and execution
- Deployment/operations documentation — deployment, configuration, monitoring, recovery
- Decision records — important durable choices

## Update Trigger

When implementation materially changes architecture, behavior, security, setup, APIs, configuration, or user-facing functionality, determine whether documentation must change in the same phase.

## Temporary AI System

Knowledge that must survive deletion of `.project-ai/` must be migrated into normal project documentation before final cleanup.
