# Multi-Phone Support Implementation Plan

## Overview
Enable Mona and DeShawn to manage and call multiple phone numbers per lead in the autodialer. Leads imported from batchleads can have up to 5 phone numbers, and agents need to select which number to call, mark numbers as invalid, and track which numbers work.

## Database Changes

### New Table: `lead_phones`
- **Purpose**: Store multiple phone numbers per lead with validation status
- **Key Fields**:
  - `phone_number`: The actual phone number
  - `phone_type`: Type of phone (mobile, landline, voip, etc.) from batchleads
  - `is_primary`: Boolean flag for the primary/preferred number
  - `is_dnc`: Do Not Call flag from batchleads
  - `validation_status`: Enum - 'unknown', 'valid', 'invalid', 'disconnected', 'wrong_number'
  - `validation_notes`: Free text notes about why it's invalid
  - `last_called_at`: Track when this specific number was last called
  - `call_attempts`: Counter for attempts on this specific number
  - `display_order`: Order to try numbers (0 = first)

### Triggers
1. **ensure_single_primary_phone**: Ensures only one phone per lead is marked as primary
2. **sync_primary_phone_to_lead**: Updates the `leads.phone` column when a phone is set as primary

### Migration
- Automatically migrates existing phone numbers from `leads.phone` to `lead_phones` with `is_primary=true`

## API Endpoints

### 1. `/api/admin/leads/[leadId]/phones` (GET, POST)
- **GET**: Fetch all phone numbers for a lead, ordered by display_order
- **POST**: Add a new phone number to a lead

### 2. `/api/admin/leads/[leadId]/phones/[phoneId]` (PATCH, DELETE)
- **PATCH**: Update phone validation status, set as primary, mark as DNC, etc.
- **DELETE**: Remove a phone number (cannot delete primary)

## UI Changes

### Dialer Workspace - Phone Selector
Location: When viewing a lead in the dialer (active call or post-call)

Components to add:
1. **Phone Number List**
   - Display all phones for current lead
   - Show phone type badge (mobile/landline/voip)
   - Show validation status with color coding:
     - Green: valid
     - Gray: unknown
     - Red: invalid/disconnected/wrong_number
     - Yellow: DNC
   - Show call attempt count for each number
   - Show "Primary" badge on primary phone

2. **Call Button per Phone**
   - When NOT on active call: "Call This Number" button next to each phone
   - During active call: Show which number is currently being called
   - Disable buttons for DNC numbers with tooltip

3. **Validation Controls**
   - Quick action buttons after call ends:
     - ✓ Valid (green button)
     - ✗ Invalid (red button) - opens dropdown for reason
     - 🚫 DNC (yellow button)
   - Dropdown for invalid reasons:
     - Disconnected
     - Wrong Number
     - Invalid Number
     - Other (with text input)

4. **Set as Primary**
   - Button to mark a validated phone as the new primary
   - Confirmation dialog explaining this will update the lead's primary phone

### Import from Batchleads
When importing batchleads to leads, populate `lead_phones` with all 5 phone numbers:
- Map `phone_1` → display_order=0, set as primary
- Map `phone_2` through `phone_5` → display_order=1-4
- Map `phone_X_type` → `phone_type`
- Map `phone_X_dnc` → `is_dnc`

## Calling Flow

### Current Flow
1. Agent clicks "Start Calling"
2. System fetches next lead from queue
3. Dialer calls the lead's `phone` number
4. Call connects/fails
5. Agent takes notes and moves to next lead

### New Flow
1. Agent clicks "Start Calling"
2. System fetches next lead from queue with all phone numbers
3. **Dialer shows all available phone numbers for lead**
4. **Agent selects which number to call** (or auto-call primary if configured)
5. Call connects/fails
6. **Agent marks phone validation status** (valid/invalid/disconnected/etc.)
7. If invalid, **agent can select another number to call** without moving to next lead
8. Agent takes notes and moves to next lead

### Auto-Retry Logic (Future Enhancement)
- If primary phone fails, auto-suggest trying next available number
- Skip DNC numbers automatically
- Skip numbers already marked as invalid/disconnected
- Try numbers in display_order sequence

## Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] Existing leads get their phone migrated to lead_phones
- [ ] Only one primary phone per lead enforced
- [ ] Primary phone syncs back to leads.phone column
- [ ] RLS policies allow authenticated users to read/update

### API
- [ ] Can fetch all phones for a lead
- [ ] Can add new phone to a lead
- [ ] Can update phone validation status
- [ ] Can set phone as primary
- [ ] Cannot delete primary phone
- [ ] Proper error handling for invalid lead/phone IDs

### UI
- [ ] Phone list displays in dialer workspace
- [ ] Validation status shows with correct colors
- [ ] Can mark phone as valid/invalid/dnc
- [ ] Can add notes for invalid phones
- [ ] Can set phone as primary
- [ ] DNC phones are clearly marked
- [ ] Call buttons work for each phone
- [ ] Primary badge shows on correct phone

### Integration
- [ ] Batchlead import populates lead_phones correctly
- [ ] Calling a specific phone updates call_attempts and last_called_at
- [ ] Twilio integration works with selected phone number
- [ ] Queue processing includes phone data

## Rollout Plan

### Phase 1: Database & API (Completed)
- ✅ Migration file created
- ✅ API endpoints created
- Ready to run migration

### Phase 2: UI Implementation (Next)
1. Add phone selector component to dialer-client.tsx
2. Add state management for lead phones
3. Integrate with existing call flow
4. Add validation controls

### Phase 3: Import Integration
1. Update batchlead import to populate lead_phones
2. Add phone deduplication logic
3. Test with real batchlead data

### Phase 4: Testing & Refinement
1. Test with Mona/DeShawn
2. Gather feedback on validation workflow
3. Add auto-retry logic if needed
4. Performance optimization

## Notes for Implementation

### Key Considerations
- **Primary Phone**: Always maintain one primary phone per lead that syncs to `leads.phone`
- **DNC Compliance**: Never show "Call" button on DNC numbers, show warning instead
- **Validation States**: Start all phones as 'unknown', only mark after actual call attempt
- **Display Order**: Respect display_order for suggesting which number to try next
- **Call History**: Track attempts per phone number, not just per lead

### Edge Cases
- What if all phones are marked invalid? → Show "No valid phones" message, suggest manual update
- What if agent wants to add a new phone during call? → Allow inline phone addition
- What if phone is primary but marked invalid? → Suggest setting another as primary
- Import duplicate detection → Check if phone already exists before adding

### Future Enhancements
- SMS integration with phone selection
- Phone number lookup/validation API integration (Twilio Lookup)
- Bulk phone validation via Twilio
- Auto-skip to next number on immediate failure
- Phone number formatting/normalization improvements
- Analytics on which phone types have better connection rates
