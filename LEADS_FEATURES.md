# Leads Dashboard Features

## Overview
The leads dashboard at `/admin/leads` provides comprehensive tools for managing and organizing your property seller leads.

## Search Functionality
Search across multiple lead fields in real-time:
- **Full Name** - Find leads by name
- **Email** - Search by email address
- **Phone** - Search by phone number
- **Street Address** - Find leads by property address
- **City** - Search by city name
- **State** - Filter by state
- **Property Type** - Search by property type (e.g., Single Family, Multi-Family)

The search is case-insensitive and searches across all these fields simultaneously.

## Filtering Options

### Status Filter
Filter leads by their current status:
- **All statuses** - Show all leads
- **new** - Recently submitted leads
- **contacted** - Leads you've reached out to
- **offer-sent** - Leads with pending offers
- **under-contract** - Leads in contract negotiation
- **closed** - Completed deals
- **archived** - Archived leads

### Deleted Leads Toggle
- **Show deleted leads** - Toggle to view leads that have been marked as deleted
- By default, only active (non-deleted) leads are shown

## Sorting Options
Sort your leads by:
- **Newest first** (default) - Most recently created leads appear first
- **Oldest first** - Show oldest leads first
- **Name (A-Z)** - Alphabetical sorting by lead name

## Active Filters Display
When search or filters are active, you'll see:
- **Filter tags** showing active search terms and status filters
- **Quick clear buttons** (×) to remove individual filters
- **"Clear all" button** to reset all filters at once

## Lead Count
The dashboard displays the number of visible leads based on your current filters:
- Updates in real-time as you search and filter
- Shows singular "lead" or plural "leads" appropriately

## Additional Features

### Lead Actions
For each lead, you can:
- **Save** - Update status and owner notes
- **Call Client** - Initiate a Twilio call (if configured)
- **Schedule Appointment** - Create a calendar appointment for this lead
- **Delete Lead** - Mark lead as deleted (soft delete)

### Schedule Appointments
Clicking "Schedule Appointment" opens a modal where you can:
- Set appointment title and description
- Choose start and end times
- Add location information
- Set appointment status (scheduled, completed, cancelled, no-show)

Appointments are integrated with the calendar at `/admin/calendar`.

## Performance
All search, filter, and sort operations happen client-side for instant feedback. The filtering logic is optimized using React's `useMemo` hook to prevent unnecessary re-renders.

## Usage Tips

1. **Combine filters** - Use search + status filter + sort together for precise lead management
2. **Quick contact lookup** - Search by phone or email to quickly find a specific lead
3. **Pipeline management** - Filter by status to see leads in each stage of your pipeline
4. **Location-based workflow** - Search by city to batch process leads in the same area
5. **Timeline review** - Use "Oldest first" to follow up on leads that have been waiting longest

## Navigation
- **Go to Calendar** - Quick link to appointment scheduling
- **Back to landing page** - Return to the public site
- **Sign out** - Log out of the admin dashboard
