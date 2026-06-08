# Self-Service Campaign Builder with Lead Scoring

## ✅ What's Been Built

### Backend (Complete)

#### 1. Database Migration
**File:** `supabase/migrations/20260507005222_add_lead_scoring_and_campaign_filters.sql`
- Added `priority_score INTEGER` to `leads` table
- Added `computed_tags TEXT[]` to `leads` table  
- Created indexes for fast filtering on both columns

#### 2. Lead Scoring Logic
**File:** `src/app/api/admin/leads/bulk-import/route.ts`

**Functions Added:**
- `calculatePriorityScore(mapped)` - Returns 0-100 score based on:
  - Spread × 0.4 (normalized to 100k max)
  - Equity × 0.3 (normalized to 200k max)
  - Distress signals × 0.3:
    - Foreclosure: +40 points
    - Vacant: +30 points
    - High LTV (>85%): +20 points
    - Self-managed absentee: +10 points

- `computeTags(mapped)` - Returns array of tags:
  - `high-profit` - spread > $30k AND equity > $50k
  - `distressed` - foreclosure OR vacant OR ltv > 90%
  - `foreclosure` - any foreclosure status
  - `pre-foreclosure-urgent` - auction within 60 days
  - `absentee` - owner_occupied = false
  - `absentee-high-value` - self-managed absentee + value > $200k
  - `vacant` - is_vacant = true
  - `failed-listing` - mls_status expired/withdrawn
  - `older-owner-high-equity` - year_built < 1980, last_sale < 2000, loan < $10k

**Integration:** Scores and tags are calculated and stored when creating leads from BatchLeads (lines 626-634)

#### 3. Campaign Templates
**File:** `src/lib/campaign-templates.ts`

8 pre-configured templates:
1. **High-Profit Potential** (Priority: 100) - spread > 30k, equity > 50k
2. **Distressed/Motivated** (Priority: 90) - foreclosure/vacant/high LTV
3. **Pre-Foreclosure Rush** (Priority: 95) - auction within 60 days
4. **Absentee Owners - High Value** (Priority: 80) - tired landlords
5. **Failed MLS Listings** (Priority: 75) - expired/withdrawn
6. **Older Owners - High Equity** (Priority: 70) - downsizing prospects
7. **Vacant Properties** (Priority: 65) - carrying costs motivation
8. **All Foreclosures** (Priority: 85) - any foreclosure status

**API Endpoint:** `src/app/api/admin/dialer/templates/route.ts`
- GET `/api/admin/dialer/templates` - Returns all templates

#### 4. Enhanced Campaign Filters
**File:** `src/app/api/admin/dialer/campaigns/[id]/start/route.ts`

**New filters added (lines 102-110):**
```typescript
// Filter by priority score
if (filters.priorityScoreMin && typeof filters.priorityScoreMin === 'number') {
  query = query.gte("priority_score", filters.priorityScoreMin);
}

// Filter by computed tags (lead must have ALL specified tags)
if (filters.hasComputedTags && Array.isArray(filters.hasComputedTags) && filters.hasComputedTags.length > 0) {
  query = query.contains("computed_tags", filters.hasComputedTags);
}
```

#### 5. Campaign Preview Endpoint
**File:** `src/app/api/admin/dialer/campaigns/[id]/preview/route.ts`

**Endpoint:** GET `/api/admin/dialer/campaigns/:id/preview`

**Returns:**
```json
{
  "count": 45,
  "avgPriorityScore": 67,
  "maxPriorityScore": 92,
  "minPriorityScore": 34,
  "tagDistribution": {
    "high-profit": 12,
    "distressed": 28,
    "foreclosure": 15,
    "vacant": 8
  }
}
```

### Frontend (Partial - Needs Completion)

#### What's Done:
1. Type definitions for templates and preview added
2. State variables for templates, preview added
3. `loadTemplates()` call added to `loadData()`

#### What Still Needs to Be Done:
Add the following functions to `dialer-client.tsx`:

```typescript
const loadTemplates = async () => {
  const response = await fetch("/api/admin/dialer/templates");
  const data = await response.json();
  if (data.templates) setTemplates(data.templates);
};

const applyTemplate = (template: CampaignTemplate) => {
  setNewCampaign({
    name: template.name,
    description: template.description,
    priority: template.priority,
    lead_filters: {
      status: template.filters.status || ["new"],
      isHotLead: template.filters.isHotLead || false,
      sourceIds: template.filters.sourceIds || [],
      assignedUserIds: template.filters.assignedUserIds || [],
      unassignedOnly: template.filters.unassignedOnly || false,
      lastContactedDaysMin: template.filters.lastContactedDaysMin || null,
      lastContactedDaysMax: template.filters.lastContactedDaysMax || null,
      leadIds: template.filters.leadIds || [],
      priorityScoreMin: template.filters.priorityScoreMin,
      hasComputedTags: template.filters.hasComputedTags || [],
    },
  });
  setShowTemplates(false);
};
```

And add this UI after the campaign name/description inputs (around line 1042):

```tsx
{/* Campaign Templates */}
<div>
  <button
    onClick={() => setShowTemplates(!showTemplates)}
    className="text-sm text-blue-600 hover:text-blue-800 underline"
  >
    {showTemplates ? "Hide Templates" : "Use a Template"}
  </button>
  
  {showTemplates && (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {templates.map(template => (
        <button
          key={template.id}
          onClick={() => applyTemplate(template)}
          className="p-3 text-left border rounded hover:bg-blue-50 hover:border-blue-500"
        >
          <div className="font-medium text-sm">{template.name}</div>
          <div className="text-xs text-gray-600 mt-1">{template.description}</div>
        </button>
      ))}
    </div>
  )}
</div>

{/* Priority Score Filter */}
<div>
  <label className="block text-sm font-medium mb-2">
    Minimum Priority Score (0-100)
  </label>
  <input
    type="number"
    min="0"
    max="100"
    placeholder="e.g., 50"
    value={newCampaign.lead_filters.priorityScoreMin ?? ""}
    onChange={(e) => setNewCampaign({
      ...newCampaign,
      lead_filters: { 
        ...newCampaign.lead_filters, 
        priorityScoreMin: e.target.value ? parseInt(e.target.value) : undefined
      }
    })}
    className="w-full px-3 py-2 border rounded"
  />
  <p className="text-xs text-gray-500 mt-1">
    Higher scores = better spread, equity, and distress signals
  </p>
</div>
```

## How Deshawn and Mona Will Use It

### Option 1: Use a Template
1. Click "Create Campaign"
2. Click "Use a Template"
3. Click one of the 8 pre-configured templates
4. (Optional) Adjust filters
5. Click "Create"
6. Click "Start" when ready

### Option 2: Manual Setup with Scoring
1. Click "Create Campaign"
2. Enter name and description
3. Set "Minimum Priority Score" (e.g., 50 for leads with good potential)
4. Click "Create"
5. Click "Start"

## Testing

Once frontend is complete, test with:
1. Import BatchLeads CSV with the new scoring
2. Check that leads have `priority_score` and `computed_tags` populated
3. Create a campaign using "High-Profit Potential" template
4. Preview the campaign to see lead count and stats
5. Start the campaign and verify correct leads are queued

## Files Modified

✅ Backend Complete:
- `supabase/migrations/20260507005222_add_lead_scoring_and_campaign_filters.sql`
- `src/app/api/admin/leads/bulk-import/route.ts`
- `src/lib/campaign-templates.ts`
- `src/app/api/admin/dialer/templates/route.ts`
- `src/app/api/admin/dialer/campaigns/[id]/preview/route.ts`
- `src/app/api/admin/dialer/campaigns/[id]/start/route.ts`

⚠️ Needs Frontend Addition:
- `src/app/admin/dialer/dialer-client.tsx` - Add `loadTemplates()`, `applyTemplate()`, and template UI
