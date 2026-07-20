# Rate Limiting Implementation

## Overview
The public lead submission endpoint (`POST /api/leads/web`) is now protected against abuse with:
- **Rate limiting**: Max 5 submissions per 60 minutes per IP address
- **Honeypot protection**: Hidden field to catch bots
- **Submission logging**: All attempts (accepted and rejected) are tracked

## Implementation Details

### Database Schema
Created `lead_submissions` table to track all submission attempts:
- `id`: UUID primary key
- `source_id`: Reference to sources table
- `ip_address`: Client IP address
- `user_agent`: Browser user agent
- `email`: Email from submission (if provided)
- `phone`: Phone from submission (if provided)
- `accepted`: Boolean - true if lead was created, false if rejected
- `rejection_reason`: Reason for rejection (honeypot, rate_limit_exceeded, database_error, etc.)
- `created_at`: Timestamp

### Security Features

#### 1. Rate Limiting
- **Default**: 5 submissions per 60 minutes per IP address
- **Implementation**: Queries `lead_submissions` table to count recent attempts
- **Behavior**: Returns HTTP 429 when limit exceeded
- **Fail-open**: If rate limit check fails (DB error), allows the request to proceed

#### 2. Honeypot Protection
- **Field name**: `website`
- **Purpose**: Hidden field that humans won't fill but bots will
- **Behavior**: Returns HTTP 400 if field contains any value
- **Frontend requirement**: Add hidden `website` field to the form with `display: none` or similar

#### 3. IP Address Detection
Supports multiple proxy headers in order of priority:
1. `x-forwarded-for` (Vercel)
2. `cf-connecting-ip` (Cloudflare)
3. `x-real-ip` (Generic proxies)
4. Falls back to "unknown"

### Files Changed

#### New Files
1. `supabase/migrations/20260720000000_create_lead_submissions_table.sql`
   - Creates `lead_submissions` table
   - Adds indexes for efficient queries
   - Sets up RLS policies

2. `src/lib/security/rate-limit.ts`
   - `getClientIp()`: Extracts client IP from request headers
   - `checkRateLimit()`: Checks if IP has exceeded rate limit
   - `logLeadSubmission()`: Logs submission attempt

#### Modified Files
1. `src/app/api/leads/web/route.ts`
   - Added honeypot check at start of request
   - Added rate limit check before processing
   - Added submission logging for all outcomes (honeypot, rate limit, database error, success)
   - Source remains "Website" for all requests

## Testing Instructions

### Prerequisites
1. Apply the migration:
   ```bash
   npx supabase db reset
   ```
   or
   ```bash
   npx supabase migration up
   ```

### Test 1: Successful Submission
**Goal**: Verify legitimate submissions work

```bash
curl -X POST http://localhost:3000/api/leads/web \
  -H "Content-Type: application/json" \
  -d '{
    "listedWithAgent": false,
    "propertyType": "Single Family",
    "repairsNeeded": "Needs minor updates",
    "closeTimeline": "Within 1 month",
    "sellReason": "Job relocation",
    "acceptableOffer": "$300,000",
    "streetAddress": "123 Main St",
    "city": "Denver",
    "state": "CO",
    "postalCode": "80202",
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "555-1234",
    "smsConsent": true
  }'
```

**Expected**:
- HTTP 201
- Lead created in `leads` table
- Entry in `lead_submissions` with `accepted=true`
- Source remains "Website"

### Test 2: Honeypot Rejection
**Goal**: Verify bot protection works

```bash
curl -X POST http://localhost:3000/api/leads/web \
  -H "Content-Type: application/json" \
  -d '{
    "website": "https://bot-filled-this.com",
    "fullName": "Bot User",
    "email": "bot@example.com"
  }'
```

**Expected**:
- HTTP 400
- Error: "Invalid submission"
- NO lead created in `leads` table
- Entry in `lead_submissions` with `accepted=false`, `rejection_reason='honeypot'`

### Test 3: Rate Limit Exceeded
**Goal**: Verify rate limiting works

```bash
# Run this 6 times in quick succession
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/leads/web \
    -H "Content-Type: application/json" \
    -d "{
      \"listedWithAgent\": false,
      \"propertyType\": \"Single Family\",
      \"repairsNeeded\": \"Needs minor updates\",
      \"closeTimeline\": \"Within 1 month\",
      \"sellReason\": \"Job relocation\",
      \"acceptableOffer\": \"$300000\",
      \"streetAddress\": \"123 Main St $i\",
      \"city\": \"Denver\",
      \"state\": \"CO\",
      \"postalCode\": \"80202\",
      \"fullName\": \"Test User $i\",
      \"email\": \"test$i@example.com\",
      \"phone\": \"555-123$i\",
      \"smsConsent\": true
    }"
  echo ""
done
```

**Expected**:
- First 5 requests: HTTP 201 (success)
- 6th request: HTTP 429 (Too Many Requests)
- Error: "Too many submissions. Please try again later."
- 5 leads created, 6th rejected
- 6 entries in `lead_submissions`: 5 with `accepted=true`, 1 with `accepted=false` and `rejection_reason='rate_limit_exceeded'`

### Test 4: Verify Source Assignment
**Goal**: Confirm all submissions use "Website" source

```sql
-- Check recent lead_submissions
SELECT 
  ls.accepted,
  ls.rejection_reason,
  s.name as source_name,
  ls.created_at
FROM lead_submissions ls
LEFT JOIN sources s ON s.id = ls.source_id
ORDER BY ls.created_at DESC
LIMIT 10;

-- Check recent leads
SELECT 
  l.full_name,
  l.email,
  s.name as source_name,
  l.created_at
FROM leads l
LEFT JOIN sources s ON s.id = l.source_id
ORDER BY l.created_at DESC
LIMIT 5;
```

**Expected**:
- All entries show `source_name='Website'`

## Frontend Integration

### Required: Add Honeypot Field
Add this hidden field to your lead submission form:

```html
<input
  type="text"
  name="website"
  id="website"
  value=""
  tabindex="-1"
  autocomplete="off"
  style="position: absolute; left: -9999px;"
/>
```

**Important**:
- Do NOT use `display: none` (some bots detect this)
- Use `position: absolute; left: -9999px;` to truly hide it
- Add `tabindex="-1"` and `autocomplete="off"`
- Do NOT label it "honeypot" or similar - use a realistic field name like "website"

### Rate Limit User Feedback
When you receive HTTP 429, show a friendly message:

```javascript
if (response.status === 429) {
  showError(
    'You\'ve submitted multiple requests recently. Please wait a few minutes and try again.'
  );
}
```

## Configuration

### Adjusting Rate Limits
To change rate limits, modify the call in `src/app/api/leads/web/route.ts`:

```typescript
// Current: 5 submissions per 60 minutes
const rateLimit = await checkRateLimit(clientIp, 5, 60);

// Example: 3 submissions per 30 minutes
const rateLimit = await checkRateLimit(clientIp, 3, 30);

// Example: 10 submissions per 2 hours
const rateLimit = await checkRateLimit(clientIp, 10, 120);
```

### Future: Source-Specific Configuration
The current implementation is hardcoded to the "Website" source. Future enhancement would be to store rate limit configuration per source:

```sql
ALTER TABLE sources ADD COLUMN rate_limit_enabled BOOLEAN DEFAULT false;
ALTER TABLE sources ADD COLUMN rate_limit_max INTEGER DEFAULT 5;
ALTER TABLE sources ADD COLUMN rate_limit_window_minutes INTEGER DEFAULT 60;
```

## Monitoring

### Check Recent Rejections
```sql
SELECT 
  rejection_reason,
  COUNT(*) as count,
  COUNT(DISTINCT ip_address) as unique_ips
FROM lead_submissions
WHERE accepted = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY rejection_reason
ORDER BY count DESC;
```

### Check Top IPs
```sql
SELECT 
  ip_address,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE accepted = true) as accepted,
  COUNT(*) FILTER (WHERE accepted = false) as rejected
FROM lead_submissions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY ip_address
HAVING COUNT(*) > 10
ORDER BY total_attempts DESC;
```

### Cleanup Old Submissions
Consider setting up a cron job to delete old submission logs:

```sql
-- Delete submissions older than 90 days
DELETE FROM lead_submissions
WHERE created_at < NOW() - INTERVAL '90 days';
```
