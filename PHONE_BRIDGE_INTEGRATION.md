# Phone Bridge Integration Guide

## What We Built

A unified calling system that automatically detects iOS and routes to the appropriate transport:
- **Desktop/Android**: WebRTC (browser calling) — works as before
- **iOS Safari**: Phone bridge — calls agent's phone first, then bridges to lead

## Files Created

1. **Migration**: Added `transport` column to track browser vs phone calls
   - Already applied via MCP

2. **Backend**: `/api/calling/phone-bridge/route.ts`
   - Calls agent's phone (from `phone_settings.forward_to_number`)
   - Bridges to lead
   - Handles recording, status callbacks

3. **Hooks**:
   - `/hooks/useUnifiedCalling.ts` — Auto-detects iOS and chooses transport
   - `/hooks/usePhoneBridge.ts` — iOS-specific implementation (created earlier)

4. **Component**: `/components/CallStatusBanner.tsx`
   - Shows iOS vs desktop-specific call status messages

## Integration (2 Steps)

### Step 1: Replace calling hook

**Before:**
```tsx
import { useTwilioVoice } from '@/hooks/useTwilioVoice';

const { makeCall, hangup, callStatus, isConnected } = useTwilioVoice({
  onCallDisconnected: () => { ... },
  onError: (error) => { ... }
});
```

**After:**
```tsx
import { useUnifiedCalling } from '@/hooks/useUnifiedCalling';

const { makeCall, hangup, callStatus, isConnected, isIOS } = useUnifiedCalling({
  onCallDisconnected: () => { ... },
  onError: (error) => { ... }
});
```

### Step 2: Add status banner (optional but recommended)

```tsx
import CallStatusBanner from '@/components/CallStatusBanner';

// In your JSX:
<CallStatusBanner isIOS={isIOS} callStatus={callStatus} />
```

## Complete Example: `/admin/leads`

```tsx
// At top of leads-client.tsx
import { useUnifiedCalling } from '@/hooks/useUnifiedCalling';
import CallStatusBanner from '@/components/CallStatusBanner';

// Replace useTwilioVoice with useUnifiedCalling (line 69)
const { makeCall, hangup, callStatus, isConnected, isMuted, toggleMute, isIOS } = useUnifiedCalling({
  debug: true,
  onCallDisconnected: () => {
    setActiveCallLeadId(null);
    setActiveCallNotes("");
    setTimeout(() => window.location.reload(), 1000);
  },
  onError: (error) => {
    console.error("Voice SDK error:", error);
    alert(`Call failed: ${error.message}`);
    setActiveCallLeadId(null);
    setActiveCallNotes("");
  },
});

// Add banner in the UI (wherever you show call controls):
{activeCallLeadId && (
  <CallStatusBanner isIOS={isIOS} callStatus={callStatus} />
)}
```

## That's It!

The system automatically:
- Detects iOS devices
- Routes to phone bridge on iOS
- Uses WebRTC on desktop
- Tracks transport in database
- Shows appropriate UI messages

All existing features work:
- Call history
- Recordings
- Transcripts
- Notes
- Dispositions

No configuration needed. Just deploy and it works.
