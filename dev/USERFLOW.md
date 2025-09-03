User Flow: USERFLOW.md

> **🌐 Localization Requirement**: 
> Ensure that the TrailGuide PWA supports Hebrew with proper RTL layout for the Israeli audience.
> All text content should be stored in separate language-specific files (e.g., he.json or he.md), so that adding English (or other languages) in the future will be straightforward and maintainable.

1. Organizer Flow
This flow describes the journey of an organizer from logging in to publishing a new guidance.
┌──────────────────┐
│  Login Page      │
│  (Existing user) │
│ - Username       │
│ - Password       │
└──────────────────┘
        │
        │ [Successful Login]
        ▼
┌──────────────────┐
│ Organizer        │
│ Dashboard        │
│ (Screen 1)       │
│ - View existing  │
│   guidances      │
│ - See stats      │
│ - ➕ Create New   │
└──────────────────┘
        │
        │ [Click "Create New Guidance"]
        ▼
┌──────────────────┐
│ Create Guidance  │
│ (Screen 2)       │
│ - Step 1:        │
│   General Info   │
│   - Event Name   │
│   - Expiration   │
│ - Step 2:        │
│   Guidance Steps │
│   - ➕ Add Step   │
│   - Upload Image │
│   - Add Text     │
│ - Step 3:        │
│   Final Actions  │
│   - Preview      │
│   - Publish      │
└──────────────────┘
        │
        │ [Click "Preview"]
        ▼
┌──────────────────┐
│ Preview Flow     │
│ (Screen 3)       │
│ - Start screen   │
│ - Step by step   │
│   navigation     │
│ - "Back to Edit" │
└──────────────────┘
        │
        │ [Click "Publish" from Create/Edit screen]
        ▼
┌──────────────────┐
│ Publish Complete │
│   - Confirmation │
│   - Copy Link    │
└──────────────────┘

2. End-User Flow (The Blayer's Journey)
This flow describes the journey of a user who receives a guidance link and uses it on-site.
┌──────────────────┐
│ Receive Link     │
│ - Shared via SMS,│
│   WhatsApp, etc. │
└──────────────────┘
        │
        │ [Click Link]
        ▼
┌──────────────────┐
│ PWA Start Screen │
│ (Mobile-only view)│
│ - Event Title    │
│ - Main "Start"   │
│   Button         │
└──────────────────┘
        │
        │ [Click "Start"]
        ▼
┌──────────────────┐
│ Step 1 Screen    │
│ (Guidance 1/N)   │
│ - Image          │
│ - Text           │
│ - Navigation     │
│   (Next/Previous)│
└──────────────────┘
        │
        │ [Click "Next"]
        ▼
┌──────────────────┐
│ Step 2 Screen    │
│ (Guidance 2/N)   │
│ - Image          │
│ - Text           │
│ - Navigation     │
└──────────────────┘
        │
        │ [Repeat for all steps]
        ▼
┌──────────────────┐
│ Final Screen     │
│ (Last step)      │
│ - Confirmation   │
│   message        │
│ - "Restart"      │
│   option         │
└──────────────────┘

3. Error & Alternative Flows
This section covers common alternative scenarios.
 * Invalid Login: If the username/password is incorrect, a clear error message appears on the login page.
 * Back Button from Create/Edit: Clicking "Back" returns the organizer to the Dashboard without saving changes. A confirmation popup may be added in the future ("Are you sure you want to exit without saving?").
 * Invalid/Expired Link: If a blayer clicks a link that has been canceled or expired, a simple, clear message appears (e.g., "This guidance has expired" or "The event is over"). No other actions are needed on this screen.
This User Flow document provides a clear, high-level map for everyone on the team. It ensures that the product's logic is fully understood before starting development.
Ready to move on to the next document? Let's tackle the Data Model and API Contract to define the product's technical backbone.

