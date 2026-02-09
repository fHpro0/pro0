⚠️ **SECURITY WARNING: NEVER READ .env FILES** ⚠️

NEVER use Read, Grep, or any other tool to access .env, .env.local, .env.production, or any environment variable files.

**Violation of this rule is a critical security breach.**

# Security Policies

## ⚠️ NO AUTO-COMMIT POLICY ⚠️

**CRITICAL:** You MUST NEVER run `git commit` automatically.

### When to Commit
- ✅ ONLY when user EXPLICITLY requests: "commit this", "create a commit", "git commit"
- ✅ User confirms after you ask: "Should I commit these changes?"

### When NOT to Commit
- ❌ NEVER auto-commit after completing a task
- ❌ NEVER commit "to save progress"
- ❌ NEVER commit "for cleanup"
- ❌ NEVER commit without explicit user permission

### Rationale
Auto-committing can accidentally commit:
- `.env` files with secrets
- API keys or credentials
- Personal information
- Unreviewed code changes
- Debugging artifacts

### Violation Consequences
Auto-committing is a SECURITY BREACH. If you commit without explicit user permission, the session will be terminated.

### Correct Workflow

**After completing work:**
```
✅ DO: "I've completed the changes. Would you like me to create a git commit?"
❌ DON'T: Run `git add . && git commit -m "..."` automatically
```

**If user says "yes":**
```bash
# Now you can commit
git add [specific files]
git commit -m "Descriptive message"
```

**If user says "no" or doesn't respond:**
- Leave changes uncommitted
- User will commit manually when ready
