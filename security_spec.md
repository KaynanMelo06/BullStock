# BullStock Security Specifications & Data Invariants (Zero-PII & Category Approval)

## 1. Data Invariants
1. **Zero-PII Identity**: Users do NOT provide email, real name, phone, or photo. Authentication utilizes pseudo-emails `<usuario>@usuarios.estoque.local`. The `users/{uid}` collection contains only `uid`, `username` and `createdAt`.
2. **Category Isolation & Approval Gate**: Any non-superadmin user must have a membership in `categories/{catId}/members/{uid}` with `status == 'aprovado'` to read or write any inventory or shopping content in that category.
3. **Strict Self-Registration**: When requesting membership or signing up, an authenticated user can only write a member document for their own UID (`request.auth.uid == memberId`) strictly with `status: 'pendente'` and `role: 'membro'`.
4. **Privilege Escalation Prevention**: Users cannot update their own member document. Only a confirmed Captain (`role == 'capitao'`) of that category or a Superadmin (`config/superadmins`) can alter status to `'aprovado'` or change roles.
5. **Role Hierarchy**:
   - `capitao`: Full category administration, approve/reject requests, manage member roles, create/edit items and shopping lists, delete items.
   - `membro`: Read and write inventory items, adjust stock, log movement history, create/edit shopping lists and items, toggle purchased state.
   - `visualizador`: Read-only access to inventories and shopping lists.
6. **Superadmin Power**: Defined in `config/superadmins` (`uids: string[]`). Superadmins have full access across all categories and can create/delete categories, appoint captains, and oversee all memberships.

## 2. Dirty Dozen Attack Scenarios Checked
1. *Bypass Pending Status*: User attempts to write `status: 'aprovado'` upon requesting entry. -> REJECTED by rules.
2. *Self-Promote to Captain*: User attempts to write `role: 'capitao'` on join. -> REJECTED by rules.
3. *Cross-Category Data Leak*: Member of Category A attempts to read inventory of Category B. -> REJECTED by rules.
4. *Viewer Modifying Quantities*: User with role `visualizador` attempts to update stock or shopping list. -> REJECTED by rules.
5. *PII Injection*: User tries to store email, phone or photo in `users/{uid}`. -> REJECTED by `hasOnly(['uid', 'username', 'createdAt'])`.
6. *Malicious Username*: User attempts to register with SQL/script or disallowed characters. -> REJECTED by regex `^[a-z0-9._-]+$`.
7. *Direct Superadmin Self-Designation*: Non-superadmin user attempts to add their UID to `config/superadmins` when it already exists. -> REJECTED.
8. *Member Approving Other Members*: Non-captain member attempts to approve a pending join request. -> REJECTED.
9. *Unauthenticated Scraping*: Unauthenticated user tries to read category names or items. -> REJECTED.
10. *Falsified History Entry*: User tries to record inventory movement under someone else's UID. -> REJECTED by `incoming().userId == request.auth.uid`.
11. *Unauthorized Category Creation*: Regular member attempts to create a new category. -> REJECTED (only superadmin).
12. *Orphaned Request Tampering*: Rejected user attempts to overwrite captain's decision. -> REJECTED.
