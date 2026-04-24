# Twilio Callback Configuration Verification

## Environment Variables to Check

Run this to verify your .env.local has the required variables:
```bash
grep -E "(NEXT_PUBLIC_BASE_URL|TWILIO_PHONE_NUMBER|TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN)" .env.local
```

**Required Variables:**
- `NEXT_PUBLIC_BASE_URL` - Should be `https://www.rushndush.com`
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (e.g., `+15551234567`)
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token

## Twilio Console Configuration

### 1. TwiML App Configuration
Go to: https://console.twilio.com/us1/develop/voice/manage/twiml-apps

Find your TwiML app and verify:

**Voice Configuration:**
- **Request URL:** `https://www.rushndush.com/api/twilio/voice-client`
- **HTTP Method:** `POST`
- **Fallback URL:** (Optional) Same as Request URL
- **Status Callback URL:** Leave blank (we set this dynamically)

### 2. Verify Phone Number Configuration (Optional)
Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming

If you're using phone number for incoming calls:
- **Voice & Fax → A Call Comes In:** Should point to your voice webhook
- For the dialer, this is less important since calls originate from the browser

## Test Your Endpoints

### Test Voice Client Endpoint
```bash
curl -X POST https://www.rushndush.com/api/twilio/voice-client \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "queueItemId=test-123"
```

**Expected:** Should return TwiML XML

### Test Call Status Endpoint
```bash
curl -X POST "https://www.rushndush.com/api/twilio/call-status?queueItemId=test-123" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CAtest123&CallStatus=completed&CallDuration=60"
```

**Expected:** Should return 200 OK

## Callback Flow

Here's what happens when a call is made:

1. **Browser → Twilio:**
   - Browser calls `device.connect({ params: { queueItemId: "xyz" }})`
   
2. **Twilio → Your Server (Voice Client):**
   - POST to `/api/twilio/voice-client` with `queueItemId`
   - Server returns TwiML with `<Dial action="...">` pointing to call-status endpoint
   
3. **Call Happens:**
   - Twilio dials the lead's phone number
   - Queue item status set to "calling"
   
4. **Twilio → Your Server (Call Status):**
   - POST to `/api/twilio/call-status?queueItemId=xyz`
   - Receives: `CallSid`, `CallStatus`, `CallDuration`
   - Updates call logs and queue item status
   
5. **Browser Disconnect Event:**
   - Browser receives disconnect event
   - Calls `/api/admin/dialer/queue/{id}/complete` (backup cleanup)

## Common Issues

### Issue: Queue items stuck in "calling" status
**Solution:** Already fixed! We added browser-side cleanup:
- Queue items now marked complete on disconnect/cancel/error
- No longer relies solely on Twilio callbacks

### Issue: Callbacks not received
**Possible causes:**
1. Wrong URL in TwiML app configuration
2. `NEXT_PUBLIC_BASE_URL` not set or wrong
3. Server not accessible from Twilio (firewall/SSL issues)

**Debug:**
- Check Twilio debugger: https://console.twilio.com/us1/monitor/logs/debugger
- Check your application logs for `[Call Status]` and `[Voice Client]` messages

### Issue: Call status not updating
**Check:**
- Make sure the action URL in TwiML includes `queueItemId` parameter
- Verify `/api/twilio/call-status` endpoint is accessible
- Check database for `dialer_call_logs` entries

## Monitoring Callbacks

To see if callbacks are working, check your logs:
```bash
# If using Vercel
vercel logs --follow

# Or check server logs for these patterns:
grep "Call Status" logs.txt
grep "Voice Client" logs.txt
```

**Successful callback log should show:**
```
[Call Status] Received: { callSid: 'CAxxxx', callStatus: 'completed', callDuration: '45', queueItemId: 'xxx' }
```

## Quick Verification Commands

```bash
# 1. Check if endpoints are accessible
curl -I https://www.rushndush.com/api/twilio/voice-client
curl -I https://www.rushndush.com/api/twilio/call-status

# 2. Verify environment variable is set
echo $NEXT_PUBLIC_BASE_URL

# 3. Check Twilio configuration
npx twilio api:core:applications:list
```

## What's Already Working

✅ Browser-side cleanup (queue items marked complete on disconnect)
✅ Callback URL automatically includes `queueItemId`
✅ Call status endpoint handles all Twilio status updates
✅ Retry logic for failed calls (up to 3 attempts)
✅ Lead status auto-update on successful calls

## What to Check in Twilio Console

1. Go to TwiML Apps: https://console.twilio.com/us1/develop/voice/manage/twiml-apps
2. Click on your TwiML app (should match the SID in your token generation)
3. Verify Voice Request URL is: `https://www.rushndush.com/api/twilio/voice-client`
4. Save if you made any changes
5. Test a call and check the debugger for any errors
