---
description: Perform security audit on the codebase
---

# Security Audit

Comprehensive security review focusing on web application vulnerabilities.

## Audit Areas

1. **API Route Security**
   - Check API key exposure in client-side code
   - Verify environment variables are properly used
   - Review API route authentication/authorization
   - Check for rate limiting on AI endpoints

2. **Input Validation**
   - Review user input handling in game state
   - Check for XSS vulnerabilities in entity rendering
   - Validate AI-generated content sanitization
   - Review drag-and-drop implementation for injection risks

3. **Data Storage**
   - Check localStorage usage for sensitive data
   - Review game state schema for security issues
   - Verify no secrets are persisted client-side

4. **Dependencies**
   - Check for known vulnerabilities in dependencies
   - Review shadcn/ui components for security issues

Focus on OWASP Top 10 vulnerabilities relevant to this Next.js app.
