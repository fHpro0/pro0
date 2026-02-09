## MANDATORY: TodoWrite Tool Usage

**Create todos when:**
{TRIGGERS}

**Critical rule:** UI checkboxes only update when you call `TodoWrite` with updated task statuses. Narrative progress text does NOT update checkboxes.

**Always keep exactly one active todo in_progress (unless intentionally running true parallel work).**

**Required status transitions:**
- `pending` -> `in_progress` when you start or assign the task
- `in_progress` -> `completed` immediately after the responsible agent reports done
- `in_progress` -> `cancelled` if you intentionally stop that task

**Agent completion hook (MANDATORY):**
- Every time `check_agent` returns `status: "completed"` for a task tied to a todo, call `TodoWrite` immediately to mark that todo `completed` before any long prose update.

**Example:**
```markdown
TodoWrite([
  { id: "1", content: "{EXAMPLE_TASK_1}", status: "pending", priority: "high" },
  { id: "2", content: "{EXAMPLE_TASK_2}", status: "pending", priority: "high" }
])
```

**Threshold guidance:** {THRESHOLD}
