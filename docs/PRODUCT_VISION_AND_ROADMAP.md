# VoltFlow — Product Vision and Master Roadmap

## Mission

VoltFlow exists to become the operating system for field-service professionals, beginning with electrical contractors. It combines customer management, project operations, field data, estimating, invoicing, scheduling, documentation, and AI-assisted workflows in one configurable platform.

## Founding model

Blue Bear Electric is VoltFlow's first customer and proving ground, not the only intended customer. The product must remain reusable for other contractors without copying or rewriting the codebase.

## Core principles

1. One shared codebase, configurable per company.
2. Strict company data isolation and role-based permissions.
3. Branding, services, forms, pricing, and workflows are configuration—not hardcoded forks.
4. Mobile field workflows are first-class.
5. AI assists licensed professionals; it does not replace technical review or judgment.
6. Security, auditability, backups, and maintainability are product features.
7. Every release should reduce complexity and improve reuse.
8. Electrical contracting is the initial focus, while the core remains extensible to related industries.

## Initial market

- Residential electrical contractors
- Commercial electrical contractors
- Industrial electrical service companies
- Solar and BESS contractors
- Testing, commissioning, and preventive-maintenance providers

## Future markets

- Industrial maintenance
- Telecommunications
- Water and wastewater
- Facilities services
- Renewable-energy operations

## Core modules

- CRM and lead management
- Customer and company profiles
- Projects, tasks, milestones, and closeout
- Estimates, proposals, invoices, and payments
- Scheduling and dispatch
- Employee and customer portals
- Field reports, safety forms, time entries, and signatures
- Photos, documents, inspections, and equipment history
- Inventory, tools, fleet, and calibration tracking
- Analytics and reporting
- AI-assisted proposals, scopes, reports, and operational search
- Subscription, tenant, plan, and feature management

## Multi-tenant architecture

Every business record must belong to a tenant/company. Users may belong to one or more companies through memberships and roles. Row-level security must ensure a company can only access its own customers, projects, files, employees, estimates, invoices, and settings.

## Branding model

Each tenant can configure its company name, logo, colors, license information, contact information, document templates, terminology, and enabled modules. VoltFlow remains the platform identity; the tenant's brand appears on customer-facing documents and portals.

## Subscription direction

Illustrative tiers:

- Starter: CRM, projects, photos, basic estimates
- Professional: scheduling, portals, invoices, field operations, AI tools
- Enterprise: advanced permissions, integrations, inventory, fleet, analytics, API, and custom onboarding

Pricing must be validated through contractor interviews and real usage before launch.

## Product roadmap

### V8 — SaaS foundation

- VoltFlow platform identity
- Tenant/company data model
- Memberships and roles
- Tenant branding and settings
- Migration plan for Blue Bear Electric as tenant one

### V9 — Operational core

- CRM 2.0
- Kanban projects and tasks
- Estimating and invoice workflows
- Scheduling and notifications

### V10 — Field and asset operations

- Dispatch
- Equipment history
- Inventory and fleet
- Advanced mobile workflows

### V11 — Commercial SaaS readiness

- Subscription billing
- Onboarding
- Tenant administration
- Usage limits and plan controls
- Audit logs, monitoring, backups, and support tools

## Success metrics

- Time from lead to estimate
- Estimate acceptance rate
- Administrative hours saved
- Project closeout completeness
- Invoice collection time
- Weekly active users
- Customer retention
- Platform stability and security incidents

## Product statement

VoltFlow exists to become the operating system for field-service professionals—starting with electrical contractors. By combining operational workflows, field data, AI-assisted documentation, and deep industry knowledge into one platform, VoltFlow aims to reduce administrative work, improve consistency, and provide visibility into every project from first contact to final closeout.
