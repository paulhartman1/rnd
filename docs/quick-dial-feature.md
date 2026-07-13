# Quick Dial Feature

## Overview
The Quick Dial feature provides a phone keypad interface at `/admin/dial` that allows users to dial any phone number via Twilio without requiring a lead record.

## Use Cases
- Calling vendors (plumbers, contractors, title companies, etc.)
- Calling partners or service providers
- Quick ad-hoc calls to non-lead contacts
- Testing Twilio setup

## Features
1. **Phone keypad UI** - Touch-friendly 10-key dial pad
2. **Lead lookup** - Automatically checks if the entered number matches an existing lead
3. **Twilio integration** - Initiates calls through existing Twilio setup
4. **No data persistence** - Calls are not tracked/logged in the app (Twilio logs remain)
5. **Feature flagged** - Behind the `quick_dial` database feature flag

## Enabling the Feature

### 1. Add Database Feature Flag
Insert a new feature flag record in your Supabase `feature_flags` table:

```sql
INSERT INTO feature_flags (flag_key, flag_name, description, is_enabled, allowed_users)
VALUES (
  'quick_dial',
  'Quick Dial',
  'Allows quick dialing of any phone number via Twilio without requiring a lead record',
  true,
  NULL  -- NULL means available to all authenticated users, or specify specific emails
);
```

### 2. Verify Twilio Configuration
Ensure these environment variables are set (should already be configured if Twilio is working for leads):

- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID` or `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY_SECRET` (if using API key)
- `TWILIO_PHONE_NUMBER`
- `TWILIO_FORWARD_TO_NUMBER` or `TWILIO_CALL_URL`

## Usage

### From the Leads Dashboard
1. Click the **📞 Quick Dial** button in the top action bar
2. Navigate to `/admin/dial`

### Dialing a Number
1. Use the keypad to enter a phone number
2. If the number matches an existing lead, you'll see their name and status
3. Click the **📞 Call** button to initiate the call via Twilio
4. Success message appears when call is initiated
5. Number clears automatically after 3 seconds

## Technical Details

### Files Created
- `/src/app/api/admin/dial/route.ts` - API route for initiating calls
- `/src/app/admin/dial/page.tsx` - Server component for auth/feature check
- `/src/app/admin/dial/dial-client.tsx` - Client component with keypad UI

### Phone Number Handling
- Phone numbers are NOT normalized before storage or lookup
- Exact string matching is used for lead lookup
- Twilio handles phone number validation

### Security
- Requires authentication (`/login` redirect if not authenticated)
- Checks feature flag on both page load and API call
- Uses existing Twilio credentials (no new secrets required)

## Disabling the Feature
To disable:

```sql
UPDATE feature_flags
SET is_enabled = false
WHERE flag_key = 'quick_dial';
```

This will:
- Hide the Quick Dial button from the leads dashboard
- Return 403 Forbidden if users try to access `/admin/dial` directly
- Return 403 Forbidden if API is called directly

## Future Enhancements (Not Implemented)
- Call history/logging
- Contact management (separate from leads)
- SMS support
- Click-to-dial from other pages
