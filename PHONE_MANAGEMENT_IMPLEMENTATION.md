# Multi-Phone Number Management Implementation

## Overview
Leads can now have 0-7 phone numbers with primary selection and direct calling via Twilio.

## What Was Implemented

### 1. Database Structure (Already Existed)
- `lead_phones` table with fields:
  - `phone_number`, `phone_type`, `is_primary`, `is_dnc`
  - `validation_status`, `call_attempts`, `last_called_at`
  - Database triggers ensure only one primary phone per lead
  - Primary phone syncs to `leads.phone` column

### 2. New Components
- **`PhoneNumbersList` component** (`src/app/admin/leads/components/PhoneNumbersList.tsx`)
  - Display all phone numbers for a lead
  - Click any phone number to call it via Twilio
  - Add new phone numbers (up to 7)
  - Set primary phone
  - Delete non-primary phones
  - Shows call attempt counts and timestamps

### 3. API Routes

#### Get/Add Phone Numbers
- `GET /api/admin/leads/[leadId]/phones` - List all phones
- `POST /api/admin/leads/[leadId]/phones` - Add new phone

#### Manage Individual Phones
- `DELETE /api/admin/leads/[leadId]/phones/[phoneId]` - Delete phone
- `PATCH /api/admin/leads/[leadId]/phones/[phoneId]` - Update phone details
- `POST /api/admin/leads/[leadId]/phones/[phoneId]/set-primary` - Set as primary
- `POST /api/admin/leads/[leadId]/phones/[phoneId]/call` - Call specific phone via Twilio

### 4. Updated Functionality

#### In `/admin/leads` Page
- Server-side: Fetches all phone numbers for each lead
- Client-side: Displays `PhoneNumbersList` component in Contact Information section
- Old single phone display replaced with full phone management UI

#### Calling Behavior
- **Contact → Call dropdown**: Calls the primary phone (or first phone if no primary set)
- **Click any phone number**: Calls that specific phone number
- Call attempt tracking increments automatically
- Last called timestamp updates on each call

### 5. Database Function
```sql
increment_call_attempts(phone_id uuid) returns integer
```
Atomically increments call_attempts counter when a call is placed.

## User Flow

### Viewing Phone Numbers
1. Open a lead in `/admin/leads`
2. Phone numbers appear in the Contact Information section
3. Primary phone is labeled with a green badge
4. Each phone shows its type (mobile, home, etc.) if specified

### Adding a Phone Number
1. Click "+ Add Number"
2. Enter phone number and optional type
3. Optionally check "Set as primary"
4. Click "Add"
5. Page reloads with new phone number

### Setting Primary Phone
1. Click "Set Primary" button next to any non-primary phone
2. The trigger automatically unsets the previous primary
3. Primary phone syncs to the main `leads.phone` field

### Calling a Lead
**Method 1: Contact → Call (uses primary phone)**
1. Click "Contact" button
2. Select "Call" from dropdown
3. Twilio initiates call to primary phone number

**Method 2: Click specific phone number**
1. Click any phone number in the phone list
2. Twilio initiates call to that specific number
3. Call attempts and timestamp are tracked per phone

### Deleting a Phone Number
1. Click the "×" button next to any non-primary phone
2. Confirm deletion
3. Primary phone cannot be deleted (must set another as primary first)

## Technical Notes

### Type Definitions
- `LeadPhone` type in `src/lib/lead-phones.ts`
- Extended `LeadWithProperties` to include `phones: LeadPhone[]`

### Security
- All phone operations use admin client
- RLS policies ensure service role access
- Phone validation and normalization before calling

### Call Tracking
- Each phone tracks its own call history
- `call_attempts` counter increments on each call
- `last_called_at` timestamp updates on each call
- Used for validation and reporting

## Future Enhancements
- DNC (Do Not Call) flag management in UI
- Phone validation status updates
- Bulk phone import
- Call history/notes per phone number
