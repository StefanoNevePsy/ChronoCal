# ChronoCal
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
Delegated by user: static HTML, CSS and JavaScript for GitHub Pages; optional local Node server for persistent Google OAuth. No build dependencies.
## Users
The requester wants to count hours from selected Google calendars.
## Product Purpose
Select calendars and a preset or custom date interval, then obtain total hours and per-calendar detail.
## Capabilities and Constraints
Default: overlapping events count once, including overlaps across calendars. Offer sum of durations as alternative. Google Calendar is read-only. Pages cannot store a client secret or refresh token securely; the local companion handles offline OAuth. Local service starts automatically at Mac login as requested. OAuth credentials must be provided by the user.
## Brand Commitments
User supplied DESIGN.md: follow the Taccuino design system. Italian interface.
## Evidence on Hand
Empty target repository StefanoNevePsy/ChronoCal. No Google OAuth credentials provided. Demonstration data must be explicitly labeled.
## Open Decisions
No verified Google account connection until credentials are supplied.

## Update: Mac calendars
Requested 2026-10-13: use Google accounts without Google Cloud configuration. Implement via native EventKit reading accounts already synchronized by Apple Calendar. User connects Google via macOS Internet Accounts once. Scope stays read-only in application code; macOS requires its full-access permission to read calendar events. No permission request during service startup. Explicit user click initiates authorization. Actual Calendar permission and synchronized-account reads need user validation.
