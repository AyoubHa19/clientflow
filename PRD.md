# ClientFlow — Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** ClientFlow

**Product Type:** Full-stack SaaS web application

**Target Audience:** Freelancers, consultants, independent professionals, and small agencies.

**Primary Goal:** Help users manage clients, leads, projects, tasks, and business activity from one organized workspace.

**Product Vision:** Build a polished, reliable, secure, and maintainable client-management platform that can serve as a professional full-stack portfolio project and evolve into a commercial product.

**Initial Platform:** Responsive web application.

**Interface Language:** English.

**Initial Market:** Global.

## 2. Problem Statement

Freelancers and small agencies often manage client information, project progress, and tasks across spreadsheets, messages, and disconnected tools.

ClientFlow centralizes this information and makes it easier to understand:
- Who the clients are.
- Which leads may become clients.
- Which projects are active.
- What tasks need attention.
- What work is completed or overdue.

## 3. Product Principles

1. Keep the interface simple and intuitive.
2. Prioritize real functionality over decorative features.
3. Build secure data access from the beginning.
4. Keep the codebase maintainable and testable.
5. Make the application responsive across desktop, tablet, and mobile.
6. Avoid unnecessary complexity in the MVP.
7. Use clear loading, empty, success, and error states.
8. Never claim a feature works unless it has been implemented and tested.
9. Never skip an approved development stage.
10. Do not implement features outside the approved scope without permission.

## 4. User Roles

### 4.1 Unauthenticated Visitor
Can access public authentication pages only.

### 4.2 Workspace Owner
Can manage the workspace, access workspace data, manage clients, leads, projects, tasks, and workspace membership if membership management is enabled in the approved stage.

### 4.3 Workspace Member
Can access only the workspace data and actions permitted by their assigned role.

The initial MVP may start with one owner per workspace. Multi-user invitations and advanced roles must be introduced only when their stage is approved.

## 5. MVP Features

### 5.1 Authentication
- Sign up.
- Sign in.
- Sign out.
- Secure password handling.
- Session management.
- Protected application routes.
- Appropriate validation and error messages.
- Password reset only when a reliable email delivery method is configured and approved.

Do not build custom cryptography or store plaintext passwords.

### 5.2 Workspace
- Create a workspace during onboarding.
- Store workspace name and basic settings.
- Associate each user with their authorized workspace.
- Enforce workspace data isolation on the server.
- Prevent users from accessing another workspace's data by changing URLs or request identifiers.

### 5.3 Dashboard
Display useful business summaries:
- Total active clients.
- Open leads.
- Active projects.
- Pending tasks.
- Overdue tasks.
- Recently updated projects or tasks.
- Relevant upcoming deadlines when dates exist.

Dashboard values must be calculated from actual database records, not hardcoded demo values.

### 5.4 Client Management
Users can:
- View a client list.
- Search clients.
- Filter or sort clients.
- Create a client.
- View client details.
- Edit client information.
- Archive or delete a client according to the approved deletion rules.

Client fields:
- ID.
- Workspace ID.
- Name or company name.
- Email, optional.
- Phone, optional.
- Company, optional.
- Notes, optional.
- Status.
- Created timestamp.
- Updated timestamp.

Validate all user inputs on the server.

### 5.5 Lead Management
Users can:
- Create leads.
- View and search leads.
- Update lead details.
- Change lead status.
- Convert a lead into a client without unintentionally duplicating records.

Lead fields:
- ID.
- Workspace ID.
- Contact name.
- Company, optional.
- Email, optional.
- Phone, optional.
- Source, optional.
- Status.
- Notes, optional.
- Created timestamp.
- Updated timestamp.

Suggested statuses:
- New.
- Contacted.
- Qualified.
- Won.
- Lost.

### 5.6 Project Management
Users can:
- Create projects.
- View project lists.
- Open project details.
- Edit project information.
- Assign a project to a client when appropriate.
- Change project status.
- Set a start date and due date.
- View project-related tasks.

Project fields:
- ID.
- Workspace ID.
- Client ID, optional.
- Name.
- Description, optional.
- Status.
- Start date, optional.
- Due date, optional.
- Created timestamp.
- Updated timestamp.

Suggested statuses:
- Planning.
- In Progress.
- On Hold.
- Completed.
- Cancelled.

### 5.7 Task Management
Users can:
- Create tasks.
- Edit tasks.
- Mark tasks as completed.
- Assign tasks to projects when appropriate.
- Set due dates and priority.
- Filter tasks by status, priority, and due date.

Task fields:
- ID.
- Workspace ID.
- Project ID, optional.
- Title.
- Description, optional.
- Status.
- Priority.
- Due date, optional.
- Created timestamp.
- Updated timestamp.

Suggested statuses:
- To Do.
- In Progress.
- Done.

Suggested priorities:
- Low.
- Medium.
- High.

### 5.8 Search, Filtering, and Pagination
- Add search and filters where they improve usability.
- Use server-side pagination for lists that may grow.
- Validate pagination and filter parameters.
- Avoid loading unlimited records into the browser.

### 5.9 User Experience
- Responsive navigation.
- Consistent components and design tokens.
- Accessible labels and keyboard interactions.
- Confirmation before destructive actions.
- Helpful empty states.
- Loading indicators.
- Clear error states.
- Toasts or inline feedback for successful actions.
- Forms with clear validation messages.

## 6. Out of Scope for the Initial MVP

Do not implement these unless explicitly approved later:
- Payment processing or subscriptions.
- AI assistants or AI-generated reports.
- Email campaigns.
- In-app chat.
- Video calls.
- Invoicing and accounting.
- Complex automation workflows.
- Native iOS or Android applications.
- Public API for third-party developers.
- Complex enterprise permissions.
- Real-time collaborative editing.

These features may be considered after the core product is stable.

## 7. Recommended Technology Stack

Use the following stack unless repository inspection or a concrete technical constraint justifies a proposed alternative. Ask for approval before changing the stack.

- Framework: Next.js with App Router.
- Language: TypeScript with strict checking.
- Styling: Tailwind CSS.
- UI: Accessible reusable components.
- Database: PostgreSQL.
- ORM: Prisma.
- Authentication: A maintained authentication library compatible with the chosen Next.js version.
- Validation: Zod or an equivalent maintained validation library.
- Testing: Unit and integration tests, plus end-to-end tests for critical flows.
- Version control: Git.
- Deployment: Vercel or another compatible host.
- Database hosting: A managed PostgreSQL provider.

Before installing dependencies, verify current compatibility and use stable, mutually compatible versions. Avoid unnecessary libraries.

## 8. Architecture Requirements

Keep a clear separation between:
- UI components.
- Pages and layouts.
- Server-side application logic.
- Data access.
- Input validation.
- Authentication and authorization.
- Database schema and migrations.
- Tests.

Rules:
- Keep database access on the server.
- Never expose secrets to client-side code.
- Use environment variables for configuration.
- Keep environment files containing secrets out of Git.
- Use reusable server-side authorization checks.
- Return safe, consistent errors without leaking sensitive implementation details.
- Avoid unnecessary abstraction and premature optimization.
- Do not use mock data as a substitute for required production functionality.

## 9. Data Model

Propose and review the final schema before implementing it.

Expected core entities:

### User
- id
- name
- email
- authentication-related fields appropriate to the selected auth library
- createdAt
- updatedAt

### Workspace
- id
- name
- createdAt
- updatedAt

### WorkspaceMembership
- id
- userId
- workspaceId
- role
- createdAt

Use this entity if the approved authentication and workspace architecture supports membership. Do not add unnecessary duplication if the selected auth library has its own compatible membership model.

### Client
- id
- workspaceId
- name
- email
- phone
- company
- notes
- status
- createdAt
- updatedAt

### Lead
- id
- workspaceId
- contactName
- company
- email
- phone
- source
- status
- notes
- createdAt
- updatedAt

### Project
- id
- workspaceId
- clientId, optional
- name
- description
- status
- startDate, optional
- dueDate, optional
- createdAt
- updatedAt

### Task
- id
- workspaceId
- projectId, optional
- title
- description
- status
- priority
- dueDate, optional
- createdAt
- updatedAt

Add suitable indexes, unique constraints, foreign keys, and deletion rules after reviewing query patterns and data relationships.

All workspace-owned records must be associated with a workspace and protected by server-side authorization.

## 10. Security Requirements

- Hash passwords using the chosen authentication library's supported secure method.
- Never store plaintext passwords.
- Validate all untrusted input on the server.
- Enforce authentication on protected routes and server operations.
- Enforce authorization for every operation that reads or modifies private data.
- Enforce workspace isolation in database queries or a verified equivalent.
- Never trust workspace IDs supplied by the client without authorization checks.
- Prevent insecure direct object reference vulnerabilities.
- Protect session cookies using appropriate secure settings in production.
- Use CSRF protection where required by the selected authentication approach.
- Apply reasonable rate limiting to sensitive authentication endpoints where supported.
- Avoid leaking secrets, tokens, passwords, or private data in logs.
- Keep dependencies maintained and remove unused packages.
- Provide safe database migration and backup practices appropriate to the hosting environment.
- Test unauthorized access and cross-workspace access attempts.
- Never claim that the app is secure based only on a code review.

## 11. Testing Requirements

Add tests incrementally as features are implemented.

Test:
- Input validation.
- Authentication flows.
- Authorization rules.
- Workspace isolation.
- Client creation and editing.
- Lead status updates and conversion.
- Project and task CRUD operations.
- Dashboard calculations.
- Invalid and missing data.
- Loading, empty, and error states where relevant.

At minimum, critical end-to-end flows should cover:
1. A user registers and signs in.
2. The user creates or accesses an authorized workspace.
3. The user creates a client.
4. The user creates a project.
5. The user creates and completes a task.
6. The dashboard reflects the real records.
7. A user cannot access another workspace's private records.

Report which tests were run and their actual results. Do not report tests as passing if they were not executed.

## 12. Design Requirements

Design direction:
- Modern, calm, professional SaaS.
- Clean visual hierarchy.
- Consistent spacing and typography.
- Restrained color palette.
- High-quality responsive layout.
- Clear navigation and page titles.
- Useful dashboard cards and data tables.
- Consistent form controls, dialogs, and notifications.
- Subtle motion only where it improves feedback or usability.
- Respect reduced-motion preferences.
- Good contrast and accessible focus states.

Do not copy another product's interface. Create a coherent visual identity for ClientFlow.

## 13. Core Pages

- Public landing page, only if included in the approved stage.
- Sign up.
- Sign in.
- Password reset, if configured.
- Onboarding and workspace setup.
- Dashboard.
- Clients list.
- Client details.
- Leads list.
- Lead details or editing interface.
- Projects list.
- Project details.
- Tasks list.
- Workspace settings.
- Not-found page.
- Unauthorized or access-denied state.

Build pages only in their approved stages.

## 14. Development Roadmap

### Stage 0 — Repository Audit and Product Specification
Inspect the current environment and agree on scope, architecture, data model, page map, acceptance criteria, and risks. Do not modify project files.

### Stage 1 — Project Foundation
Set up or verify the project, TypeScript, styling, linting, formatting, folder structure, shared UI foundation, and local development workflow.

### Stage 2 — Database and Data Access
Configure PostgreSQL, Prisma, schema, migrations, connection management, and safe server-side data access.

### Stage 3 — Authentication
Implement registration, sign-in, sign-out, session handling, protected routes, and authentication tests.

### Stage 4 — Workspace and Authorization
Implement workspace creation and ownership or membership relationships. Verify strict workspace isolation.

### Stage 5 — Client Management
Implement client CRUD, validation, search, filters, pagination, and tests.

### Stage 6 — Lead Management
Implement lead CRUD, status transitions, conversion into clients, and tests.

### Stage 7 — Project Management
Implement projects, client relationships, project status, dates, and tests.

### Stage 8 — Task Management
Implement tasks, priority, status, due dates, filtering, and tests.

### Stage 9 — Dashboard and Activity
Implement database-driven dashboard summaries, useful recent activity, and correct calculations.

### Stage 10 — UX and Responsive Polish
Improve responsive behavior, accessibility, loading and error states, forms, navigation, and motion.

### Stage 11 — Security and Quality Review
Review access control, workspace isolation, validation, dependencies, error handling, test coverage, and production configuration. Fix discovered issues and retest.

### Stage 12 — Deployment
Configure production environment variables, managed database, migrations, deployment, and a smoke test. Document the process and limitations.

### Stage 13 — Portfolio and Product Readiness
Prepare a README, screenshots, architecture summary, feature list, setup instructions, demo data strategy, known limitations, and future roadmap.

## 15. Stage-Gating Rules

These rules are mandatory.

1. Work on exactly one stage at a time.
2. Before starting a stage, explain its goal, planned changes, expected files or components, dependencies, and acceptance criteria.
3. Wait for explicit user approval before implementing the stage.
4. Implement only the approved stage.
5. Do not start the next stage automatically.
6. After implementation, run the relevant checks and tests that are available.
7. Show a concise report of files changed, features implemented, commands and tests executed, results, known issues, and anything that requires manual verification.
8. If a required dependency or decision is missing, stop and ask instead of guessing.
9. If a serious issue is discovered outside the current stage, explain it and request permission before making unrelated changes.
10. Do not hide failing tests or unresolved errors.
11. Never claim a deployment, migration, test, or configuration succeeded unless the result confirms it.
12. Wait for the user's review and explicit approval before moving forward.
13. If the user requests revisions, remain in the current stage until those revisions are reviewed.
14. Keep changes small enough to inspect and debug.
15. Use Git checkpoints when Git is available. Never overwrite unrelated work or delete user data without permission.
16. Do not modify Pocketwise. ClientFlow must use its own separate project directory and repository.

## 16. Stage Completion Report

At the end of every stage, provide:

- Stage number and name.
- What was implemented.
- Important files created or modified.
- Commands run.
- Tests and checks executed.
- Actual results.
- Known issues or risks.
- Manual steps the user must complete.
- Acceptance criteria checklist.
- Recommended next stage, without implementing it.

Then stop and wait for approval.

## 17. Definition of Done

The MVP is ready for portfolio presentation when:
- The core user flows work end to end.
- Data is persisted in PostgreSQL.
- Authentication and authorization are functional.
- Workspace isolation has been tested.
- Clients, leads, projects, and tasks work as specified.
- Dashboard figures reflect real data.
- Critical tests pass.
- The application has been deployed and smoke-tested.
- Setup and architecture are documented.
- Known limitations are clearly disclosed.

A commercially launched SaaS may require additional privacy, legal, operational, billing, monitoring, support, and backup work beyond this portfolio MVP.

## 18. Instructions for Claude Code

Treat this PRD as the project's source of truth.

Start with Stage 0 only.

Do not immediately build the entire application. Do not implement Stage 1 or any later stage in the same response.

First inspect the existing directory and repository safely, identify existing files and technologies, and present the Stage 0 findings and proposed decisions. Do not delete, overwrite, or initialize over existing work.

If the directory is empty, state that clearly. If the repository already contains code, adapt the plan only after explaining what you found.

At the end of Stage 0, present the proposed architecture, data model, page map, security approach, stage plan, and acceptance criteria for review.

Stop and wait for explicit approval before proceeding to Stage 1.

For every later stage, follow the Stage-Gating Rules and Stage Completion Report above. Never automatically proceed to the next stage.
