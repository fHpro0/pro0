# Execution Plan: Agent Teams for PRO0

**Date**: 2026-02-09  
**PRD**: `.pro0/prds/2026-02-09-agent-teams.md`  
**Status**: Ready for execution

---

## Summary

Implement agent teams functionality in PRO0, enabling multiple independent agent sessions to collaborate through shared task lists, inter-agent messaging, and team lead coordination. This will match Claude Code's agent teams feature set.

---

## Task Breakdown by Category

### Phase 1: Core Infrastructure (coding)

#### Task 1.1: Team Configuration Manager
**Agent**: `backend-coder`  
**Acceptance**:
- Create `src/teams/team-config.ts`
- Implement `createTeam(name, leadAgentId): TeamConfig`
- Implement `getTeamConfig(teamName): TeamConfig | null`
- Implement `addTeammate(teamName, member): void`
- Implement `removeTeammate(teamName, agentId): void`
- Store at `~/.pro0/teams/{team-name}/config.json`
- Validate team name (alphanumeric + hyphens only)

**Guardrails**:
- Must create parent directories if they don't exist
- Must use atomic file writes (write to temp, then rename)
- Must validate TeamConfig schema
- Never allow duplicate agent IDs in members array

**Verification**:
- Unit test: Create team config and verify file exists
- Unit test: Add/remove teammates and verify state
- Unit test: Invalid team name throws error

---

#### Task 1.2: Shared Task List with File Locking
**Agent**: `backend-coder`  
**Acceptance**:
- Create `src/teams/task-list.ts`
- Implement `createTask(teamName, task): string` (returns task ID)
- Implement `claimTask(teamName, taskId, agentId): boolean` (with file lock)
- Implement `completeTask(teamName, taskId, result): void`
- Implement `getTasks(teamName, filter?): Task[]`
- Implement `unblockDependents(teamName, completedTaskId): void`
- Store at `~/.pro0/tasks/{team-name}/tasks.json`
- Use `~/.pro0/tasks/{team-name}/.lock` for atomic operations

**Guardrails**:
- File locking must be atomic (use `lockfile` or similar)
- Lock timeout: 5 seconds max
- Retry logic: 3 attempts with exponential backoff
- Must check dependencies before allowing claim
- Never allow claiming already claimed tasks

**Verification**:
- Unit test: Claim task successfully
- Integration test: Two agents try to claim same task (only one succeeds)
- Unit test: Cannot claim task with unresolved dependencies
- Unit test: Completing task unblocks dependents

---

#### Task 1.3: Mailbox Messaging System
**Agent**: `backend-coder`  
**Acceptance**:
- Create `src/teams/mailbox.ts`
- Implement `sendMessage(teamName, from, to, content): void`
- Implement `broadcast(teamName, from, content): void`
- Implement `getMessages(teamName, agentId, unreadOnly?): Message[]`
- Implement `markRead(teamName, agentId, messageId): void`
- Store at `~/.pro0/mailboxes/{team-name}/{agent-id}/messages.json`
- Support message types: `message`, `broadcast`, `notification`, `shutdown_request`

**Guardrails**:
- Messages must have unique IDs (use UUID)
- Validate sender and recipient exist in team config
- Atomic file writes for message delivery
- Max message size: 10KB

**Verification**:
- Unit test: Send message and verify delivery
- Unit test: Broadcast to all teammates
- Unit test: Get unread messages only
- Unit test: Mark message as read

---

#### Task 1.4: Team Storage Utilities
**Agent**: `backend-coder`  
**Acceptance**:
- Create `src/teams/storage.ts`
- Implement `ensureTeamDirectory(teamName): void`
- Implement `getTeamPath(teamName): string`
- Implement `getTaskPath(teamName): string`
- Implement `getMailboxPath(teamName, agentId): string`
- Implement `deleteTeam(teamName): void` (recursive delete)
- Implement `teamExists(teamName): boolean`

**Guardrails**:
- Base path: `~/.pro0/` (from home directory)
- Never delete if team has active members (validation check)
- Create parent directories recursively
- Validate paths to prevent directory traversal

**Verification**:
- Unit test: Ensure directories created
- Unit test: Get correct paths
- Unit test: Delete team removes all files
- Unit test: Cannot delete team with active members

---

### Phase 2: Agent Integration (coding)

#### Task 2.1: Extend SessionManager for Teams
**Agent**: `backend-coder`  
**Acceptance**:
- Modify `src/sessions/session-manager.ts`
- Add `teamName?: string` to `SpawnResult` and `TaskSession`
- Add `spawnTeammate(agent, taskId, teamName, todoId?): Promise<SpawnResult>`
- Link spawned session to team config
- Send team context in spawn message (team members, mailbox path)

**Guardrails**:
- Backward compatible: existing `spawn()` continues to work
- Validate team exists before spawning teammate
- Auto-register teammate in team config on spawn

**Verification**:
- Unit test: Spawn teammate registers in team config
- Unit test: Spawn without team name works (backward compat)
- Integration test: Spawn teammate and verify team context sent

---

#### Task 2.2: Teammate Tools
**Agent**: `backend-coder`  
**Acceptance**:
- Create `src/tools/team-tools.ts`
- Implement tool: `claim_task({ team_name, task_id })`
- Implement tool: `complete_task({ team_name, task_id, result })`
- Implement tool: `send_message({ team_name, to, message })`
- Implement tool: `check_messages({ team_name })`
- Implement tool: `get_team_members({ team_name })`
- Implement tool: `approve_shutdown({ team_name, reason? })`
- Implement tool: `reject_shutdown({ team_name, reason })`

**Guardrails**:
- All tools validate caller is a team member
- Tools extract caller's agent ID from context
- Return clear error messages for validation failures

**Verification**:
- Unit test: Each tool with valid input succeeds
- Unit test: Non-member cannot use team tools
- Unit test: Invalid team name returns error

---

#### Task 2.3: Manager Tools for Team Coordination
**Agent**: `backend-coder`  
**Acceptance**:
- Create `src/tools/manager-team-tools.ts`
- Implement tool: `create_team({ team_name })`
- Implement tool: `spawn_teammate({ team_name, name, category, task, todo_id? })`
- Implement tool: `message_teammate({ team_name, teammate_name, message })`
- Implement tool: `broadcast({ team_name, message })`
- Implement tool: `shutdown_teammate({ team_name, teammate_name, reason? })`
- Implement tool: `cleanup_team({ team_name })`
- Implement tool: `list_teammates({ team_name })`

**Guardrails**:
- Only team lead can use these tools
- Validate lead is the agent that created the team
- cleanup_team fails if any teammate is active

**Verification**:
- Unit test: Create team and verify config
- Unit test: Spawn teammate and verify registration
- Unit test: Cleanup fails with active teammates
- Integration test: Full team lifecycle

---

#### Task 2.4: Update Manager Prompt with Team Instructions
**Agent**: `backend-coder`  
**Acceptance**:
- Modify `prompts/manager.md`
- Add section: "## Agent Teams (Experimental)"
- Document when to use teams vs subagents
- Add tool usage examples
- Add best practices (task sizing, avoiding file conflicts)
- Add lifecycle workflow (create → spawn → coordinate → cleanup)

**Guardrails**:
- Keep backward compatible (teams are optional)
- Clearly mark as experimental
- Emphasize opt-in nature

**Verification**:
- Manual review: Prompt includes team section
- Manual review: Examples are clear

---

#### Task 2.5: Create Teammate Agent Prompt Template
**Agent**: `backend-coder`  
**Acceptance**:
- Create `prompts/teammate-template.md`
- Include: role explanation, team context, available tools
- Include: communication protocol (message other teammates)
- Include: task claiming workflow
- Include: shutdown protocol (approve/reject)
- Include: constraints (stay in scope, no auto-commit)

**Guardrails**:
- Must include security warning (no .env reading)
- Must explain team context clearly
- Must show how to use team tools

**Verification**:
- Manual review: Template is clear and complete
- Manual review: All team tools documented

---

### Phase 3: Display Modes (ops + coding)

#### Task 3.1: In-Process Display Mode
**Agent**: `devops-engineer`  
**Acceptance**:
- Create `src/teams/display/in-process.ts`
- Implement teammate switching with Shift+Up/Down
- Show active teammate indicator in terminal
- Redirect user input to selected teammate's session
- Poll for teammate output and display in main terminal

**Guardrails**:
- Must work in any terminal (no external dependencies)
- Gracefully handle teammate crashes
- Clear indication of which teammate is active

**Verification**:
- Manual test: Switch between teammates with Shift+Up/Down
- Manual test: Send message to selected teammate
- Manual test: Active teammate indicator updates

---

#### Task 3.2: Tmux Split-Pane Mode
**Agent**: `devops-engineer`  
**Acceptance**:
- Create `src/teams/display/tmux.ts`
- Detect if running inside tmux session
- Create split panes for each teammate
- Map each pane to a teammate session
- Auto-arrange panes (grid or vertical split)

**Guardrails**:
- Require tmux to be installed
- Validate tmux is running before enabling
- Gracefully fallback to in-process if tmux unavailable

**Verification**:
- Manual test: Launch team in tmux and verify split panes
- Manual test: Click into pane and interact with teammate
- Manual test: Fallback to in-process if tmux not found

---

#### Task 3.3: iTerm2 Integration
**Agent**: `devops-engineer`  
**Acceptance**:
- Create `src/teams/display/iterm2.ts`
- Detect iTerm2 terminal
- Use `it2` CLI to create split panes
- Map panes to teammate sessions
- Enable Python API for iTerm2 control

**Guardrails**:
- Require `it2` CLI installed
- Require Python API enabled in iTerm2 settings
- Gracefully fallback if iTerm2 not detected

**Verification**:
- Manual test: Launch team in iTerm2 and verify native splits
- Manual test: Interact with teammates via panes
- Manual test: Fallback if `it2` not found

---

#### Task 3.4: Auto Display Mode Detection
**Agent**: `backend-coder`  
**Acceptance**:
- Create `src/teams/display/auto-detect.ts`
- Detect if running inside tmux session → use tmux mode
- Detect iTerm2 with `it2` available → use iTerm2 mode
- Fallback to in-process mode
- Return display mode config object

**Guardrails**:
- Detection must be fast (< 100ms)
- Clear logging of detected mode
- User can override with config

**Verification**:
- Unit test: Detect tmux correctly
- Unit test: Detect iTerm2 correctly
- Unit test: Fallback to in-process

---

### Phase 4: Lifecycle & Polish (coding + review)

#### Task 4.1: Graceful Shutdown Protocol
**Agent**: `backend-coder`  
**Acceptance**:
- Implement `requestShutdown(teamName, teammateId, reason): void`
- Send `shutdown_request` message to teammate's mailbox
- Implement teammate shutdown approval flow
- If approved: mark inactive and remove from team config
- If rejected: log reason and notify lead
- Timeout: 30 seconds (auto-approve if no response)

**Guardrails**:
- Lead cannot force shutdown (must request)
- Teammate can explain why not ready to shutdown
- Timeout prevents hanging indefinitely

**Verification**:
- Unit test: Request shutdown and receive approval
- Unit test: Request shutdown and receive rejection
- Unit test: Timeout auto-approves

---

#### Task 4.2: Cleanup Validation and Manual Cleanup
**Agent**: `backend-coder`  
**Acceptance**:
- Enhance `deleteTeam(teamName)` with active member check
- If active members exist, return error with list
- Implement `forceCleanup(teamName, confirm: boolean)` (manual)
- Add CLI command: `npx pro0 teams cleanup <team-name> [--force]`
- Log cleanup actions for audit trail

**Guardrails**:
- Never auto-force cleanup
- Require explicit confirmation for force
- Backup team config before deletion (optional)

**Verification**:
- Unit test: Cleanup fails with active members
- Unit test: Force cleanup succeeds
- CLI test: `npx pro0 teams cleanup` command works

---

#### Task 4.3: Error Handling and Retry Logic
**Agent**: `backend-coder`  
**Acceptance**:
- Add retry logic to file lock acquisition (3 attempts, exponential backoff)
- Add retry logic to mailbox delivery (2 attempts)
- Wrap all file operations in try-catch with clear error messages
- Log all errors to `~/.pro0/teams/{team-name}/errors.log`

**Guardrails**:
- Never silently fail
- Always log errors with context (team name, agent ID)
- Return actionable error messages to user

**Verification**:
- Unit test: File lock retry succeeds on second attempt
- Unit test: Error logged to errors.log
- Unit test: Clear error message returned

---

#### Task 4.4: Configuration Schema and Validation
**Agent**: `backend-coder`  
**Acceptance**:
- Update `src/types/config.ts` with agent teams config
- Add schema for `experimental.agentTeams`
- Validate config on load
- Add defaults: `maxTeammates: 10`, `teammateMode: "auto"`, `pollIntervalMs: 3000`

**Guardrails**:
- Validate maxTeammates is 1-20
- Validate teammateMode is valid enum
- Validate pollIntervalMs is 1000-10000

**Verification**:
- Unit test: Valid config loads successfully
- Unit test: Invalid config throws validation error
- Unit test: Defaults applied when not specified

---

#### Task 4.5: Update README and Documentation
**Agent**: `documentation-writer`  
**Acceptance**:
- Add "Agent Teams (Experimental)" section to README.md
- Document how to enable (config + env var)
- Add example: creating a team, messaging teammates
- Document display modes and requirements
- Add troubleshooting section
- Link to PRD for architecture details

**Guardrails**:
- Mark as experimental clearly
- Provide working examples
- Document all configuration options

**Verification**:
- Manual review: README updated
- Manual review: Examples work

---

### Phase 5: Testing (tester + security)

#### Task 5.1: Unit Tests for Core Modules
**Agent**: `tester`  
**Acceptance**:
- Write tests for `team-config.ts` (95%+ coverage)
- Write tests for `task-list.ts` (95%+ coverage)
- Write tests for `mailbox.ts` (95%+ coverage)
- Write tests for `storage.ts` (95%+ coverage)
- Use vitest for all tests

**Guardrails**:
- Mock file system operations
- Test error cases and edge cases
- Use descriptive test names

**Verification**:
- Run: `npm test` (all pass)
- Coverage report shows 95%+

---

#### Task 5.2: Integration Tests for Team Lifecycle
**Agent**: `tester`  
**Acceptance**:
- Test: Create team → spawn teammates → message → shutdown → cleanup
- Test: Concurrent task claiming (simulate race condition)
- Test: Teammate messaging with delivery confirmation
- Test: Cleanup fails with active teammates
- Use real file system (temp directory)

**Guardrails**:
- Clean up temp directories after tests
- Run in isolated test environment
- No network dependencies

**Verification**:
- Run: `npm test` (integration tests pass)
- No leftover files in temp directories

---

#### Task 5.3: Security Audit
**Agent**: `security-auditor`  
**Acceptance**:
- Audit file path validation (prevent directory traversal)
- Audit file locking (prevent race conditions)
- Audit message validation (prevent injection)
- Audit team name validation (prevent malicious names)
- Check for secrets exposure in logs

**Guardrails**:
- No user input should directly construct file paths
- All file operations must be atomic
- Logs must not contain sensitive data

**Verification**:
- Security report with findings
- All critical/high issues resolved

---

#### Task 5.4: Performance Testing
**Agent**: `tester`  
**Acceptance**:
- Test: Task claiming with 10 concurrent agents (measure lock contention)
- Test: Message delivery with 100 messages (measure latency)
- Test: Team cleanup with 10 teammates (measure time)
- Report: p50, p95, p99 latencies

**Guardrails**:
- Task claiming p95 < 500ms
- Message delivery p95 < 100ms
- Team cleanup < 5 seconds

**Verification**:
- Performance report with metrics
- All targets met

---

### Phase 6: Final Review (self-review)

#### Task 6.1: Comprehensive Code Review
**Agent**: `self-review`  
**Acceptance**:
- Review all changes for correctness
- Check code quality (consistency, readability)
- Verify error handling is comprehensive
- Check for potential bugs or edge cases
- Verify backward compatibility

**Guardrails**:
- No auto-fix (report only)
- Provide actionable feedback

**Verification**:
- Review report with findings
- Address all high/medium priority issues

---

## Execution Order

### Parallel Tracks

**Track A (Phase 1)**: Tasks 1.1, 1.2, 1.3, 1.4 (can run in parallel)  
**Track B (Phase 2)**: Tasks 2.1, 2.2, 2.3 (sequential, depends on Track A)  
**Track C (Phase 2 cont.)**: Tasks 2.4, 2.5 (parallel, depends on Track A)  
**Track D (Phase 3)**: Tasks 3.1, 3.2, 3.3, 3.4 (parallel, depends on Track B)  
**Track E (Phase 4)**: Tasks 4.1, 4.2, 4.3, 4.4 (parallel, depends on Track B)  
**Track F (Phase 4 cont.)**: Task 4.5 (depends on all above)  
**Track G (Phase 5)**: Tasks 5.1, 5.2 (parallel, depends on Track E)  
**Track H (Phase 5 cont.)**: Tasks 5.3, 5.4 (parallel, depends on Track E)  
**Track I (Phase 6)**: Task 6.1 (depends on all testing complete)

### Critical Path

1. Phase 1 (Track A) → 2-3 days
2. Phase 2 (Track B + C) → 3-4 days
3. Phase 3 (Track D) → 2-3 days
4. Phase 4 (Track E + F) → 2-3 days
5. Phase 5 (Track G + H) → 2-3 days
6. Phase 6 (Track I) → 1 day

**Total estimated time: 12-17 days**

---

## Verification Steps

### Per-Task Verification
Each task has specific acceptance criteria and verification steps (see task details above).

### Integration Verification (After Phase 5)
1. Create a team via Manager agent with natural language
2. Spawn 3 teammates (frontend, backend, tester)
3. Message teammates directly
4. Verify task claiming works without race conditions
5. Shutdown teammates gracefully
6. Cleanup team and verify all resources deleted

### Final Verification (After Phase 6)
1. Run full test suite: `npm test`
2. Check coverage: `npm run test:coverage` (target: 90%+)
3. Build: `npm run build` (no errors)
4. Lint: `npm run lint` (no errors)
5. Manual test: Full team lifecycle in tmux mode
6. Manual test: Full team lifecycle in in-process mode

---

## Notes

### Risks and Mitigation
1. **File locking race conditions**: Use battle-tested locking library (`proper-lockfile`)
2. **Orphaned resources**: Implement cleanup validation and manual cleanup command
3. **Display mode compatibility**: Provide graceful fallbacks and clear error messages
4. **Performance with many teammates**: Set max limit (10) and monitor resource usage

### Dependencies
- `proper-lockfile`: For atomic file locking
- `uuid`: For message IDs
- `it2`: For iTerm2 integration (optional)
- `tmux`: For split-pane mode (optional)

### Complexity Estimates
- **High complexity**: Tasks 1.2 (file locking), 2.1 (SessionManager extension), 3.1-3.3 (display modes)
- **Medium complexity**: Tasks 1.1, 1.3, 2.2, 2.3, 4.1, 4.2
- **Low complexity**: Tasks 1.4, 2.4, 2.5, 4.3, 4.4, 4.5

---

## Success Criteria

Implementation complete when:

1. ✅ All 27 tasks completed and verified
2. ✅ Test coverage ≥ 90%
3. ✅ All integration tests pass
4. ✅ Security audit shows no critical/high issues
5. ✅ Performance targets met
6. ✅ Documentation complete
7. ✅ Manual testing successful (full lifecycle)
8. ✅ Backward compatibility verified

---

**Ready to begin execution**: Proceed with Phase 1 (Track A) - spawn 4 agents in parallel for tasks 1.1-1.4.
