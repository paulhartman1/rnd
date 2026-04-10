# Calendar & Appointments Setup

## Overview
The admin dashboard now includes a calendar section for managing appointments and scheduling activities with leads.

## Features
- **Appointment Management**: Create, edit, and delete appointments
- **Lead Integration**: Link appointments to specific leads from your CRM
- **Status Tracking**: Track appointment status (scheduled, completed, cancelled, no-show)
- **Time Management**: Set start/end times with automatic 1-hour default duration
- **Location Tracking**: Record where appointments take place
- **Past/Upcoming Views**: Separate views for past and upcoming appointments

## Database Setup

### Option 1: Run Migration (Recommended)
If you already have the leads table, run the migration to add appointments and update policies:

```bash
# Apply the migration to your Supabase database
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/update_policies_for_service_role.sql
```

Or use the Supabase dashboard SQL editor to run `supabase/migrations/update_policies_for_service_role.sql`.

### Option 2: Fresh Install
For a fresh database setup, run the complete schema:

```bash
# Apply the full schema to your Supabase database
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/schema.sql
```

Or use the Supabase dashboard SQL editor to run `supabase/schema.sql`.

## Access
Navigate to `/admin/calendar` after logging into the admin dashboard.

## Calendly Integration (Optional)

If you want to integrate with Calendly for external booking, here are your options:

### Option 1: Embed Calendly Widget
Add a Calendly inline widget to allow leads to book directly:

```tsx
// In your calendar-client.tsx or a new component
<div className="calendly-inline-widget" 
     data-url="https://calendly.com/your-username/appointment-type" 
     style={{ minWidth: '320px', height: '630px' }}></div>

<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js"></script>
```

### Option 2: Sync Calendly Events to Database
Use Calendly's webhook API to sync booked appointments:

1. Set up a webhook endpoint in your API:
   - Create `/api/webhooks/calendly/route.ts`
   - Handle `invitee.created` events
   - Insert appointments into your database

2. Configure webhook in Calendly dashboard:
   - Go to Integrations > API & Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhooks/calendly`
   - Subscribe to `invitee.created` and `invitee.canceled` events

### Option 3: Use Calendly API
Fetch scheduled events from Calendly API and display them:

```typescript
// Example API call
const response = await fetch('https://api.calendly.com/scheduled_events', {
  headers: {
    'Authorization': `Bearer ${process.env.CALENDLY_API_KEY}`,
    'Content-Type': 'application/json'
  }
});
```

## Environment Variables (for Calendly)

Add these to your `.env.local` if using Calendly integration:

```bash
CALENDLY_API_KEY=your_api_key_here
CALENDLY_WEBHOOK_SECRET=your_webhook_secret_here
```

## Service Role Configuration

All admin API routes now use the Supabase service role key (bypassing RLS). Make sure you have set:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Next Steps

1. Apply the database schema
2. Test creating appointments via `/admin/calendar`
3. Optionally integrate Calendly if you need external booking
4. Consider adding calendar view visualizations (month/week grid views)
