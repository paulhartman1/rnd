# Rush N Dush API Integration Guide

## Authentication

All API requests require authentication via API key passed in the request header:

```
X-API-Key: your_api_key_here
```

**API Key:** Provided separately upon verification

---

## Leads API

### Create Lead
**Endpoint:** `POST https://rushndush.com/api/leads`

**Headers:**
```
Content-Type: application/json
X-API-Key: <your_api_key>
```

**Required Fields:**
- `listedWithAgent` (string): "Yes" or "No"
- `propertyType` (string): Type of property (e.g., "Single Family", "Condo", "Multi-Family")
- `closeTimeline` (string): When they want to close (e.g., "Within 30 days", "3-6 months")
- `sellReason` (string): Reason for selling
- `acceptableOffer` (string): What offer they'd accept
- `streetAddress` (string): Property street address
- `city` (string): City name
- `state` (string): State abbreviation (e.g., "CO")
- `postalCode` (string): ZIP code
- `fullName` (string): Lead's full name
- `email` (string): Valid email address
- `phone` (string): Phone number
- `smsConsent` (boolean): Must be `true`

**Optional Fields:**
- `ownsLand` (string): "Yes" or "No" - only required if relevant
- `repairsNeeded` (string): Description of needed repairs
- `questionHistory` (array): Array of question/answer objects for tracking intake flow

**Example Request:**
```json
{
  "listedWithAgent": "No",
  "propertyType": "Single Family",
  "ownsLand": "Yes",
  "repairsNeeded": "Minor cosmetic",
  "closeTimeline": "Within 30 days",
  "sellReason": "Downsizing",
  "acceptableOffer": "Market value - 10%",
  "streetAddress": "123 Main Street",
  "city": "Denver",
  "state": "CO",
  "postalCode": "80202",
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phone": "555-123-4567",
  "smsConsent": true,
  "questionHistory": [
    {
      "questionId": "q1",
      "questionText": "Is your property currently listed with a real estate agent?",
      "answer": "No"
    },
    {
      "questionId": "q2",
      "questionText": "What type of property do you have?",
      "answer": "Single Family"
    }
  ]
}
```

**Success Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized. Invalid or missing API key."
}
```

**400 Bad Request:**
```json
{
  "error": "propertyType is required."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Unable to create lead. Verify Supabase table/policies and deployment env vars.",
  "code": "PGRST301"
}
```

---

## Notes

- The API automatically sends SMS and email notifications to the admin when a new lead is created
- Lead status is automatically set to "new"
- All timestamps are automatically generated
- The `questionHistory` field is optional but recommended for tracking the intake flow
- If `LEADS_API_KEY` is not set in environment variables, the endpoint will accept requests without authentication (for backward compatibility with existing frontend)

---

## Testing

Test the integration with curl:

```bash
curl -X POST https://rushndush.com/api/leads \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your_api_key>" \
  -d '{
    "listedWithAgent": "No",
    "propertyType": "Single Family",
    "closeTimeline": "Within 30 days",
    "sellReason": "Testing integration",
    "acceptableOffer": "Test",
    "streetAddress": "123 Test St",
    "city": "Denver",
    "state": "CO",
    "postalCode": "80202",
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "555-0000",
    "smsConsent": true
  }'
```
