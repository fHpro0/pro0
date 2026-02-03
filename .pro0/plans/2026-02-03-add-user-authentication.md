# Add User Authentication

## Summary
- Implement JWT-based authentication
- Add login/register endpoints
- Protect existing routes

## Tasks
1. Create auth middleware
   - Acceptance criteria: Validates JWT tokens
   - Guardrails: Never store tokens in localStorage

2. Add login endpoint
   - Acceptance criteria: Returns JWT on valid credentials
   - Guardrails: Rate limit login attempts

## Verification
- Write tests for auth middleware
- Test protected routes
- Verify logout clears session
