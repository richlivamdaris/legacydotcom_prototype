# dev_project_scope.md

## Overall Purpose
Scope, plan and estimate the development of the project embodied by the prototype in this directory:
- Use the tech stack defined below
- Implement only the features in the prototype
- Estimate a team size, team composition and project duration
- Provide a timeline for implementation 
- Observe all the constraints in this document when doing so
- Always go in stages and check correctness of assumptions before continuing

## Primary constraints
- Assume we can use AI to analyse codebase in an initial Discovery phase 
- Keep it as as simple as possible
- Fit in with paradigms used by the existing codebase: resist the temptation to re-engineer poor practices as this application is old
- Avoid unnecessary abstractions, frameworks, or dependency bloat.
- No internationalisation implemented or required, platform is English language only 
- Use the existing authorisation/sign in model as implemented in the application today
- Use Java best practice where possible: SOLID principles, DRY

## Tech stack
- Frontend: Java Server pages,STL (Standard Template Library) jquery.version 3.6.1, jquery-ui.version 1.13.2, jquery.validation 1.19.5, bootstrap
- Backend: JDK 17, Spring Boot
- Database: MySQL (version unknown)
- ORM: Hibernate (version unknown)
- Platform: AWS EC2 with primary and failover
- SCCS: Bitbucket
- Dev tooling: IntelliJ
- CI/CD: Jenkins anbd Snyk for security scanning
- Payments: Stripe
- Webhooks: Stripe 
- Styling: CSS

## Code style
- Use Legacy.com code standards.

## Testing rules
- QA automation using Playwright 

## What to avoid
- No heavy UI libraries.
- No microservices.
- No background job system.
