Audit the codebase for security issues. Check for the following:

1. **Injection vulnerabilities** — SQL injection, command injection, XSS
2. **Authentication & session security** — weak secrets, insecure cookie flags, missing expiry
3. **Authorization** — missing access control checks, exposed routes
4. **Sensitive data exposure** — hardcoded secrets, API keys, or credentials in source code
5. **Insecure dependencies** — outdated packages with known CVEs (check package.json)
6. **Input validation** — unvalidated user input at API boundaries
7. **CSRF protection** — missing or misconfigured sameSite cookie settings
8. **Error handling** — stack traces or sensitive info leaked in error responses

For each issue found, report:
- File and line number
- Description of the vulnerability
- Recommended fix

Start with `src/app/api/`, `src/lib/auth.ts`, and `src/lib/` then work outward.
