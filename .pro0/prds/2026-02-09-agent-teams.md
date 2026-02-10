# PRD: Agent Teams for PRO0

**Date**: 2026-02-09  
**Status**: Draft  
**Reference**: https://code.claude.com/docs/en/agent-teams

---

## Executive Summary

Extend PRO0 with agent teams functionality similar to Claude Code's implementation. This enables multiple independent agent sessions to work together on complex tasks with:
- Shared task coordination
- Direct inter-agent messaging
- Team lead orchestration
- Independent context windows per teammate
- User interaction with individual teammates

This transforms PRO0 from a single manager coordinating subagents into a true multi-agent collaboration system.

---

## Problem Statement

**Current State:**
- PRO0's Manager agent spawns subagents via SessionManager
- Subagents can only report back to the Manager (hub-and-spoke)
- No mechanism for agents to communicate with each other
- No shared task coordination (Manager assigns all work)
- User can only interact with Manager, not individual subagents

**Desired State:**
- Manager creates a "team" with shared context
- Teammates can message each other directly
- Shared task list enables self-coordination
- User can interact with any teammate
- Teammates work in independent sessions (not blocking Manager)
- Graceful lifecycle management (spawn, message, shutdown, cleanup)

**Impact:**
- **Parallel exploration**: Research tasks benefit from multiple independent investigators
- **Debate and challenge**: Teammates can critique each other's approaches
- **Independent ownership**: Each teammate owns a module/feature/test suite
- **Faster iteration**: Teams work concurrently rather than sequentially

---

## Goals and Success Metrics

### Goals
1. Enable true multi-agent collaboration in PRO0
2. Match Claude Code's agent teams feature set (core functionality)
3. Maintain backward compatibility with existing SessionManager
4. Provide simple configuration and activation (opt-in)

### Success Metrics
- ✅ Team can be created via natural language request
- ✅ Teammates can message each other successfully
- ✅ Shared task list prevents race conditions (file locking)
- ✅ User can interact with individual teammates
- ✅ Graceful shutdown and cleanup works reliably
- ✅ Token usage is tracked per teammate

---

## User Stories

### As a Developer
- **I want** the Manager to create a team for complex tasks **so that** multiple agents can explore in parallel
- **I want** to message individual teammates **so that** I can guide their work without going through the Manager
- **I want** teammates to challenge each other **so that** the final solution is more robust
- **I want** graceful shutdown **so that** I don't leave orphaned sessions

### As a Manager Agent
- **I want** to create a team config **so that** teammates know who else is on the team
- **I want** to assign tasks or let teammates self-claim **so that** work is distributed efficiently
- **I want** to receive notifications when teammates finish **so that** I can synthesize results
- **I want** to shut down teammates gracefully **so that** resources are cleaned up properly

### As a Teammate Agent
- **I want** to know who else is on the team **so that** I can message them
- **I want** to claim tasks from the shared list **so that** I can work independently
- **I want** to message other teammates **so that** I can share findings or ask questions
- **I want** to notify the lead when I'm done **so that** it can coordinate next steps

---

## Functional Requirements

### 1. Team Configuration
- **R1.1**: Store team config at `~/.pro0/teams/{team-name}/config.json`
- **R1.2**: Config contains: team name, lead agent ID, members array (name, agentId, category)
- **R1.3**: Only the lead can create/modify team config
- **R1.4**: Teammates can read config to discover other members

### 2. Shared Task List
- **R2.1**: Store tasks at `~/.pro0/tasks/{team-name}/tasks.json`
- **R2.2**: Each task has: id, description, status (pending/in_progress/completed), assignee, dependencies
- **R2.3**: Task claiming uses file locking to prevent race conditions
- **R2.4**: Tasks with unresolved dependencies cannot be claimed
- **R2.5**: When a task completes, dependent tasks automatically unblock

### 3. Mailbox Messaging
- **R3.1**: Store messages at `~/.pro0/mailboxes/{team-name}/{agent-id}/messages.json`
- **R3.2**: Messages contain: from, to, timestamp, content, type (message/broadcast/notification)
- **R3.3**: Agents poll their mailbox for new messages
- **R3.4**: Lead receives automatic notifications when teammates go idle

### 4. Team Lead Tools
- **R4.1**: `spawn_teammate(name, category, task, todo_id?)` - create and start a teammate
- **R4.2**: `message_teammate(teammate_name, message)` - send a message to specific teammate
- **R4.3**: `broadcast(message)` - send to all teammates
- **R4.4**: `shutdown_teammate(teammate_name, reason?)` - request graceful shutdown
- **R4.5**: `cleanup_team()` - delete team resources (fails if teammates active)
- **R4.6**: `list_teammates()` - show all teammates and their status

### 5. Teammate Tools
- **R5.1**: `claim_task(task_id)` - attempt to claim a task from the shared list
- **R5.2**: `complete_task(task_id, result)` - mark task complete and unblock dependents
- **R5.3**: `message(to, content)` - send message to another teammate
- **R5.4**: `check_messages()` - poll mailbox for new messages
- **R5.5**: `get_team_members()` - read team config to see who's on the team
- **R5.6**: `approve_shutdown()` or `reject_shutdown(reason)` - respond to shutdown request

### 6. Display Modes
- **R6.1**: In-process mode: all teammates in main terminal, switch with Shift+Up/Down
- **R6.2**: Tmux mode: split panes, one per teammate
- **R6.3**: iTerm2 mode: native split panes via `it2` CLI
- **R6.4**: Auto mode: use tmux if already in tmux session, else in-process

### 7. Lifecycle Management
- **R7.1**: Lead can spawn teammates with specific prompts and categories
- **R7.2**: Teammates inherit lead's permission settings
- **R7.3**: Lead can request shutdown; teammate can approve/reject
- **R7.4**: Cleanup validates no active teammates before deleting resources

---

## Non-Functional Requirements

### Performance
- **NFR1**: File locking for task claims must be atomic (no race conditions)
- **NFR2**: Mailbox polling should not exceed 1 req/second per agent
- **NFR3**: Task list must support up to 100 concurrent tasks

### Security
- **NFR4**: Team config and tasks are local only (no remote sync)
- **NFR5**: Agents cannot access other teams' data (validate team-name in paths)
- **NFR6**: Cleanup must not leave orphaned files

### Scalability
- **NFR7**: Support up to 10 teammates per team (configurable limit)
- **NFR8**: Graceful degradation if system resources are low

### Reliability
- **NFR9**: If a teammate crashes, it must not block the team
- **NFR10**: Cleanup must work even if some teammates are unresponsive

---

## Constraints and Dependencies

### Constraints
- File-based coordination (no database dependency)
- Must work with existing SessionManager architecture
- Backward compatible with non-team usage
- No external services (all local)

### Dependencies
- OpenCode SDK for session management
- Filesystem for team data storage
- Optional: tmux or iTerm2 for split-pane mode

---

## Out of Scope

The following are explicitly **out of scope** for this initial implementation:

- Nested teams (teammates cannot spawn their own teams)
- Remote/distributed teams (all agents must be local)
- Session resumption for teams (will be added in a future phase)
- Automatic conflict resolution for file edits
- Real-time progress visualization (beyond basic status)
- Team templates (predefined team structures)

---

## Risks and Open Questions

### Risks
1. **File locking race conditions**: Mitigate with atomic file operations and retry logic
2. **Orphaned resources**: Mitigate with cleanup validation and manual cleanup commands
3. **Message delivery failures**: Mitigate with polling and retry logic
4. **Teammate zombies**: Mitigate with timeout detection and forced cleanup

### Open Questions
1. **Q**: Should we support nested teams? **A**: No, not in v1
2. **Q**: How do we handle teammates editing the same file? **A**: User must design non-overlapping tasks
3. **Q**: Should we auto-restart failed teammates? **A**: No, lead decides whether to spawn replacement
4. **Q**: Max team size? **A**: 10 teammates (configurable)

---

## Architecture Overview

### Directory Structure
```
~/.pro0/
  teams/
    {team-name}/
      config.json          # Team members, lead info
  tasks/
    {team-name}/
      tasks.json           # Shared task list
      .lock                # File lock for task claims
  mailboxes/
    {team-name}/
      {agent-id}/
        messages.json      # Agent's inbox
```

### Team Config Schema
```json
{
  "name": "feature-auth-team",
  "leadAgentId": "agent-manager-xyz",
  "createdAt": "2026-02-09T10:30:00Z",
  "members": [
    {
      "name": "Frontend Coder",
      "agentId": "agent-frontend-abc",
      "category": "coding",
      "sessionId": "session-123",
      "spawnedAt": "2026-02-09T10:30:05Z"
    },
    {
      "name": "Backend Coder",
      "agentId": "agent-backend-def",
      "category": "coding",
      "sessionId": "session-456",
      "spawnedAt": "2026-02-09T10:30:10Z"
    }
  ]
}
```

### Task List Schema
```json
{
  "tasks": [
    {
      "id": "task-1",
      "description": "Implement login UI",
      "status": "in_progress",
      "assignee": "agent-frontend-abc",
      "dependencies": [],
      "claimedAt": "2026-02-09T10:35:00Z"
    },
    {
      "id": "task-2",
      "description": "Create auth API endpoints",
      "status": "completed",
      "assignee": "agent-backend-def",
      "completedAt": "2026-02-09T10:40:00Z"
    },
    {
      "id": "task-3",
      "description": "Write integration tests",
      "status": "pending",
      "dependencies": ["task-1", "task-2"]
    }
  ]
}
```

### Mailbox Schema
```json
{
  "messages": [
    {
      "id": "msg-1",
      "from": "agent-frontend-abc",
      "to": "agent-backend-def",
      "type": "message",
      "content": "What endpoint should I call for login?",
      "timestamp": "2026-02-09T10:36:00Z",
      "read": false
    },
    {
      "id": "msg-2",
      "from": "agent-manager-xyz",
      "to": "agent-frontend-abc",
      "type": "shutdown_request",
      "content": "Please wrap up and shut down",
      "timestamp": "2026-02-09T10:45:00Z",
      "read": false
    }
  ]
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Team config management (create, read, update)
- Shared task list with file locking
- Mailbox messaging system
- Basic team coordination tools

### Phase 2: Agent Integration (Week 2)
- Extend SessionManager with team support
- Add teammate tools (claim_task, message, etc.)
- Add lead tools (spawn_teammate, message_teammate, etc.)
- Update agent prompts with team instructions

### Phase 3: Display Modes (Week 3)
- In-process mode (Shift+Up/Down to switch)
- Tmux split-pane mode
- iTerm2 integration
- Auto mode detection

### Phase 4: Lifecycle & Polish (Week 4)
- Graceful shutdown protocol
- Cleanup validation and manual cleanup
- Error handling and retry logic
- Documentation and examples

---

## Configuration

### Enable Agent Teams
```json
{
  "experimental": {
    "agentTeams": {
      "enabled": true,
      "maxTeammates": 10,
      "teammateMode": "auto",  // "in-process" | "tmux" | "iterm2" | "auto"
      "pollIntervalMs": 3000,
      "cleanupOnExit": true
    }
  }
}
```

### Environment Variable (Alternative)
```bash
export PRO0_EXPERIMENTAL_AGENT_TEAMS=1
```

---

## Testing Strategy

### Unit Tests
- Task claiming with concurrent access (file locking)
- Mailbox message delivery
- Dependency resolution
- Config validation

### Integration Tests
- Full team lifecycle (create, spawn, message, shutdown, cleanup)
- Multiple teammates claiming tasks concurrently
- Inter-agent messaging with delivery confirmation
- Cleanup with active teammates (should fail)

### Manual Tests
- Create team via natural language
- Message teammates directly
- Switch between teammates in in-process mode
- Shutdown and cleanup

---

## Documentation

### User Guide
- How to enable agent teams
- Creating teams with natural language
- Messaging teammates
- Display modes and configuration
- Best practices (task sizing, file conflicts)

### Developer Guide
- Team architecture
- File-based coordination patterns
- Adding new display modes
- Extending team tools

### API Reference
- Team management tools
- Teammate tools
- Configuration schema

---

## Success Criteria

The implementation will be considered successful when:

1. ✅ A user can create a team via natural language request
2. ✅ Teammates can message each other and the lead
3. ✅ Shared task list prevents race conditions
4. ✅ User can switch between teammates in in-process mode
5. ✅ Graceful shutdown works reliably
6. ✅ Cleanup validates and removes all team resources
7. ✅ Backward compatibility is maintained (non-team usage works)
8. ✅ Documentation is complete and examples work

---

## Appendix: Comparison with Claude Code

| Feature | Claude Code | PRO0 |
|---------|-------------|------|
| **Team creation** | Natural language | ✅ Natural language |
| **Shared task list** | File-based | ✅ File-based |
| **Inter-agent messaging** | Mailbox system | ✅ Mailbox system |
| **Display modes** | In-process, tmux, iTerm2 | ✅ In-process, tmux, iTerm2 |
| **Graceful shutdown** | Request/approve protocol | ✅ Request/approve protocol |
| **Cleanup validation** | Checks for active teammates | ✅ Checks for active teammates |
| **Session resumption** | Known limitation | ❌ Not in v1 |
| **Nested teams** | Not supported | ❌ Not supported |
| **Plan approval** | Optional | ✅ Optional (Phase 2) |
| **Delegate mode** | Coordination-only | ✅ Coordination-only (Phase 2) |

---

## Next Steps

After approval of this PRD:

1. Create detailed execution plan
2. Implement Phase 1 (core infrastructure)
3. Test with simple team scenarios
4. Iterate based on feedback
5. Complete Phases 2-4
6. Document and publish

---

**Approval Required**: Please review and approve before proceeding to execution plan.
