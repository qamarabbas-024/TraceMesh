# Autonomous Execution Loop

## Purpose

Allow the AI to continue approved work without requiring the user to repeatedly say “continue.”

## Modes

### Planning Mode

Research the idea, analyze the market and alternatives, define the product, design UX, architecture, security, testing strategy, roadmap, risks, resources, and release criteria. Present the recommended blueprint and wait for user approval.

### Execution Mode

After approval, execute the approved roadmap continuously:

Plan phase → implement → inspect → test → audit → self-review → fix → documentation update → commit → push → verify → update project state → begin next approved phase.

## Autonomous Loop

Continue automatically through approved phases unless a boundary is reached.

## Stop Conditions

Pause and request approval when there is:

- Destructive or irreversible data operation
- Critical security exposure
- Unplanned public API or architecture break
- Significant scope expansion
- Material legal/compliance concern
- Production-impacting uncertainty
- Credential/secret exposure risk
- Major unexpected migration
- Purchase or contractual commitment
- A decision that materially changes product direction

## Recovery Loop

When a build, test, commit, or push fails:

1. Inspect the actual failure.
2. Diagnose root cause.
3. Apply the smallest safe fix.
4. Rerun the relevant verification.
5. Repeat until successful or blocked by a defined stop condition.

Do not blindly repeat failed actions.

## Version Loop

Each version has a goal, scope, implementation phases, verification, release gate, and updated project state. After a successful version, move automatically to the next already-approved version.

## No Prompt Dependency

Once the master roadmap has been approved, the AI should not require repeated user prompts for routine implementation, testing, correction, commit, push, and state updates.

## Finalization & Cleanup

When the entire approved roadmap is complete and the final release gate passes:

1. Audit `.project-ai/` for knowledge that must survive.
2. Move durable project knowledge into normal project documentation, decision records, security documentation, development guides, or other authoritative files.
3. Verify the normal repository no longer depends on `.project-ai/` to operate or understand the product.
4. Run the final test/release verification.
5. Remove `.project-ai/`.
6. Commit the cleanup as the final project-system change.

Do not leave temporary AI-control files in the finished product unless the project owner explicitly chooses to keep them.
