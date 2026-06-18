# PORTFOLIO PROJECT MEMORY

This document establishes product vision, architectural direction, UX philosophy, and decision-making principles for the Portfolio project.

Treat this as persistent project context for future discussions unless explicitly superseded.

---

# Project

Portfolio

Primary domain:

loveondev.com

Owner:

Paul Hartman

Purpose:

A web development studio platform that combines:

1. Public marketing website
2. Portfolio and case studies
3. Internal studio operating system
4. Client collaboration portal
5. Protected website preview environments

---

# Product Vision

loveondev.com is not simply a portfolio website.

The long-term vision is a studio platform where:

* prospects discover the studio
* clients collaborate on projects
* website work is reviewed and approved
* communication is centralized
* feedback is captured and preserved
* project status is transparent

The platform should reduce the need for status emails, scattered feedback, and disconnected communication channels.

The system should become the single source of truth for client projects.

---

# Core Users

## Studio Admin

Initially this is Paul.

Responsibilities:

* manage clients
* manage projects
* manage communications
* manage feedback
* manage approvals
* track project progress
* operate the studio

Future support for internal collaborators should be considered but not optimized for initially.

---

## Clients

Clients receive access to a dedicated workspace.

Example:

firehousearts.loveondev.com

Clients are not project managers.

Clients should never feel like they have logged into Jira, Linear, ClickUp, Azure DevOps, or an internal engineering tool.

The experience should feel:

* professional
* polished
* premium
* simple
* reassuring

---

# Primary Client Goals

When clients log in they should feel:

## Confidence

"My project is moving."

## Clarity

"I know exactly what is happening."

## Low Friction

"I do not need to email Paul for status."

---

# Product Principles

Optimize for:

* reassurance
* transparency
* communication
* approvals
* feedback
* simplicity

Avoid:

* complexity
* engineering jargon
* internal workflows
* technical implementation details
* overwhelming dashboards

Clients care about outcomes.

Clients do not care about developer processes.

---

# Most Important Feature

Protected Preview Environments

Every client workspace is centered around a working website preview.

Examples:

* firehousearts.loveondev.com
* clientname.loveondev.com

The preview environment should feel like a real website rather than a staging system.

Clients should be able to:

* navigate pages
* review content
* review layouts
* evaluate progress
* leave feedback
* request changes
* approve work

---

# Feedback Philosophy

Feedback is a first-class feature.

The system should eliminate feedback loss.

Client comments must:

* persist permanently
* be tied to a client
* be tied to a project
* be tied to a page or URL
* preserve conversation history
* support status workflows

Potential statuses:

* New
* Acknowledged
* In Progress
* Resolved
* Rejected

The platform should become the canonical source of project feedback.

Email feedback should eventually become the exception rather than the norm.

---

# Preferred Client Navigation

Current working assumption:

* Overview
* Preview Site
* Feedback
* Approvals
* Files
* Updates

Tasks should only exist if they support client action items.

Avoid exposing internal project management concepts.

---

# Client Dashboard Philosophy

The dashboard should answer:

"What is happening with my website project?"

The dashboard should emphasize:

* current status
* progress
* upcoming milestones
* waiting on client items
* recent updates
* outstanding approvals

The dashboard should not feel operational or technical.

It should feel informative and reassuring.

---

# Communication Philosophy

Communication should be centralized.

The platform should reduce:

* status emails
* text messages
* forgotten requests
* duplicated conversations

Clients should have a clear view of:

* recent progress
* decisions
* requests
* approvals
* blockers requiring client action

---

# MVP Philosophy

Favor simplicity over completeness.

The best MVP is:

* easy to understand
* easy to maintain
* easy to extend

Avoid building enterprise features before proving client value.

---

# Explicit Anti-Goals

Do not optimize for:

* sprint planning
* velocity tracking
* story points
* developer metrics
* complex workflow engines
* resource planning
* gantt charts
* engineering dashboards

This is a client experience platform.

Not a software development management platform.

---

# Design Philosophy

The desired feeling is:

"A concierge for my website project."

Not:

"A project management system."

Every design and architecture decision should be evaluated against that standard.

If a feature increases complexity without increasing client confidence, clarity, communication, approvals, or feedback quality, challenge the feature before implementing it.

---

# Future Claude Behavior

When discussing this project:

* challenge unnecessary complexity
* recommend pragmatic MVP solutions
* prioritize client trust and clarity
* prioritize maintainability
* preserve architectural flexibility
* avoid enterprise software thinking
* optimize for a solo studio that may grow later

Always ask:

"Does this help the client understand and participate in their project more effectively?"

before recommending additional functionality.
