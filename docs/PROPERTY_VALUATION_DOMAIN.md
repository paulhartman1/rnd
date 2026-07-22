# Property Valuation Domain Design

## Current Architecture Analysis

### Existing Properties Table
The `properties` table currently stores property information with:
- **Primary key**: `id` (UUID)
- **Foreign key**: `lead_id` → `leads.id` (one property belongs to one lead)
- **Address fields**: street_address, city, state, postal_code, county
- **Current valuation field**: `estimated_value` (numeric, nullable)
- **Novation calculator fields**: `as_is_market_value`, calculator settings, profit targets
- **Audit timestamps**: created_at, updated_at

### Current Valuation Approach
- `properties.estimated_value` - General estimated value (from BatchLeads or manual entry)
- `properties.as_is_market_value` - Used by novation calculator (currently conflated with ARV in simple mode)
- **Problem**: No valuation history, no tracking of valuation source/purpose, cannot distinguish between as-is value and ARV

### Novation Calculator Current State
Located at `src/components/admin/NovationCalculator.tsx`:
- **Two modes**: Simple (Dashaun) and Detailed (LeadSharks)
- **Simple mode**: Uses `as_is_market_value` as ARV, calculates: `(ARV × ARV%) - Rehab - Profit`
- **Detailed mode**: Full cost breakdown with ACCESS and NO ACCESS scenarios
- **Fields**: Currently reads/writes directly to property fields
- **Issue**: Mixes property valuation data with calculator-specific assumptions

---

## Proposed Domain Design

### Schema: `property_valuations`

```sql
create table public.property_valuations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  
  -- Valuation amount and purpose
  value numeric(15, 2) not null,
  valuation_purpose text not null check (
    valuation_purpose in (
      'as_is_market_value',
      'after_repair_value', 
      'underwriting_value',
      'other'
    )
  ),
  
  -- Valuation metadata
  valuation_method text check (
    valuation_method in (
      'automated_provider',
      'manual_entry',
      'comp_analysis',
      'broker_price_opinion',
      'appraisal',
      'other'
    )
  ),
  valuation_source text,  -- Provider name or 'Manual' or 'BPO from [agent]'
  valuation_date date not null default current_date,
  
  -- Confidence and quality
  confidence_score integer check (confidence_score between 0 and 100),
  comparable_count integer check (comparable_count >= 0),
  
  -- Additional context
  notes text,
  provider_metadata jsonb default '{}'::jsonb,
  
  -- Audit
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_property_valuations_property_id 
  on public.property_valuations (property_id);
create index idx_property_valuations_valuation_date 
  on public.property_valuations (valuation_date desc);
create index idx_property_valuations_purpose 
  on public.property_valuations (valuation_purpose);
create index idx_property_valuations_source 
  on public.property_valuations (valuation_source);
```

### Current Valuation Strategy

**Approach**: Add `current_valuation_id` to properties table

```sql
alter table public.properties 
  add column current_valuation_id uuid 
  references public.property_valuations(id) on delete set null;

create index idx_properties_current_valuation 
  on public.properties (current_valuation_id);
```

**Rationale**:
- Explicit relationship: Clear which valuation is "current"
- Flexible: Can change current valuation without deleting history
- Performant: Single foreign key lookup
- Maintains `estimated_value` as denormalized cache for backwards compatibility

**Alternative considered**: `is_current` boolean flag
- Rejected because it requires constraint to ensure only one is_current=true per property
- More complex to query and maintain consistency

### Maintaining `estimated_value`

Keep `properties.estimated_value` as a **denormalized cache**:
- Updated automatically when `current_valuation_id` changes (via trigger)
- Preserves backwards compatibility with existing UI code
- Convenient for quick queries without JOIN

```sql
create or replace function sync_estimated_value()
returns trigger as $$
begin
  if new.current_valuation_id is not null then
    new.estimated_value := (
      select value 
      from property_valuations 
      where id = new.current_valuation_id
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger sync_estimated_value_trigger
  before update of current_valuation_id on properties
  for each row
  execute function sync_estimated_value();
```

---

## Valuation Purposes

### Key Distinction: ARV vs. As-Is Market Value

**as_is_market_value**:
- Property's current market value in present condition
- What automated providers (RentCast, ATTOM) typically return
- Used for equity calculations, investment analysis

**after_repair_value (ARV)**:
- Projected value after repairs/renovations
- Always >= as_is_market_value
- Used for fix-and-flip, wholesale offer calculations
- Requires assumptions about repair scope and quality

**underwriting_value**:
- Conservative value used for lending decisions
- Typically lowest of the three

**Important**: Never conflate these. The novation calculator's "simple mode" currently uses `as_is_market_value` to represent ARV, which is semantically incorrect.

---

## Provider Integration Architecture

### Provider Service Abstraction

```typescript
// src/lib/valuation/provider.ts

export interface ValuationProvider {
  name: string;
  getValuation(address: PropertyAddress): Promise<NormalizedValuation>;
}

export interface NormalizedValuation {
  value: number;
  valuationPurpose: 'as_is_market_value' | 'after_repair_value' | 'other';
  valuationDate: Date;
  confidence?: number;
  comparableCount?: number;
  metadata: Record<string, any>;
}

// Future providers can be added here:
// - RentCastProvider
// - ATTOMProvider  
// - PropStreamProvider
```

**Benefits**:
- Isolates provider-specific logic
- Consistent interface for all providers
- Easy to add new providers
- Provider metadata preserved in JSONB field

---

## Novation Calculator Integration

### Current State Issues
1. Calculator stores its assumptions directly on property (repair_costs, profit targets)
2. Calculator conflates ARV with as_is_market_value in simple mode
3. No distinction between calculator inputs and property facts

### Refactored Approach

**Property Valuation** (stored in `property_valuations`):
- Source of truth for property values
- Multiple valuations per property, with purposes
- Tracks source, date, confidence

**Calculator Configuration** (remains on `properties` table):
- Calculator-specific assumptions: repair_costs, profit targets, fee percentages
- These are deal assumptions, not property facts
- Appropriate to store on property for convenience

**Calculator Display**:
```typescript
// Fetch current valuation for property
const valuation = await getPropertyValuation(propertyId);

// Display in calculator header:
// "Current Valuation: $450,000 (As-Is Market Value)"
// "Source: RentCast | Date: 2026-07-15 | Confidence: 85%"

// Use valuation.value in calculations
// Keep calculator assumptions separate
```

### Calculator Changes Required
1. Display current valuation with metadata
2. Allow manual valuation entry/selection
3. Distinguish between property value and calculator assumptions
4. Show valuation history timeline

---

## Manual Valuation Support

### User Workflow
1. Navigate to property detail page
2. Click "Add Valuation"
3. Enter:
   - Value amount
   - Purpose (dropdown: as-is, ARV, underwriting, other)
   - Source (text: "Manual", "BPO from Smith Realty", etc.)
   - Date (default: today)
   - Notes (optional)
4. Optionally mark as "Use as Current"
5. Save → Creates `property_valuation` record
6. If marked as current → Updates `properties.current_valuation_id`

### Valuation History View
- Timeline of all valuations for property
- Each shows: value, purpose, source, date, confidence
- Click to set as current valuation
- Cannot delete (preserve audit trail)
- Can add notes to existing valuations

---

## Saved Calculations Integration

### Current State
No saved calculations exist yet, but they should:

### Proposed: `novation_calculations` Table

```sql
create table public.novation_calculations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  
  -- Snapshot of inputs at time of calculation
  valuation_id uuid references public.property_valuations(id) on delete set null,
  valuation_amount numeric(15, 2) not null,
  valuation_purpose text not null,
  
  -- Calculator inputs (snapshot)
  repair_costs numeric(15, 2),
  desired_profit numeric(15, 2),
  formula_mode text,
  -- ... other calculator fields
  
  -- Calculated results
  calculated_offer numeric(15, 2) not null,
  access_mao numeric(15, 2),
  no_access_mao numeric(15, 2),
  
  -- Metadata
  calculation_name text,  -- "Initial offer", "Revised after inspection"
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
```

**Benefits**:
- Historical calculations remain reproducible
- Can see how offers changed as valuations changed
- Can compare different scenarios side-by-side

---

## Security: Row Level Security

```sql
-- Enable RLS
alter table public.property_valuations enable row level security;

-- Authenticated users can read property valuations
create policy "Authenticated users can read valuations"
on public.property_valuations for select
to authenticated
using (true);

-- Authenticated users can insert valuations
create policy "Authenticated users can create valuations"
on public.property_valuations for insert
to authenticated
with check (true);

-- Authenticated users can update their own valuations (notes only)
create policy "Users can update valuation notes"
on public.property_valuations for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- Service role has full access for provider integrations
create policy "Service role has full access"
on public.property_valuations for all
to service_role
using (true)
with check (true);
```

**Important**: Provider API keys remain server-side only (never exposed to client).

---

## Implementation Order

1. **✓ Create feature branch** `feature/property-valuations`
2. **Create migration**: `property_valuations` table
3. **Add current_valuation_id** to properties
4. **Add sync trigger** for estimated_value
5. **Generate TypeScript types** from Supabase schema
6. **Create valuation repository/service** (`src/lib/valuation/repository.ts`)
7. **Add manual valuation UI** (property detail page)
8. **Refactor NovationCalculator** to consume valuations
9. **Create provider abstraction** (`src/lib/valuation/provider.ts`)
10. **Add tests** for valuation logic
11. **Update documentation**

---

## Migration Strategy

### Backwards Compatibility
- Keep `properties.estimated_value` (cached value)
- Keep all existing novation fields on properties
- Existing UI continues to work during migration

### Data Migration (optional)
If desired, seed initial valuations from existing data:

```sql
insert into property_valuations (
  property_id, 
  value, 
  valuation_purpose, 
  valuation_method, 
  valuation_source, 
  valuation_date
)
select 
  id as property_id,
  estimated_value as value,
  'as_is_market_value' as valuation_purpose,
  'manual_entry' as valuation_method,
  'Legacy data' as valuation_source,
  created_at::date as valuation_date
from properties
where estimated_value is not null;

-- Then set as current valuation
update properties p
set current_valuation_id = v.id
from property_valuations v
where p.id = v.property_id
  and v.valuation_source = 'Legacy data';
```

---

## Future Provider Integration Guide

### When integrating RentCast, ATTOM, or another provider:

1. Create provider class implementing `ValuationProvider` interface
2. Store API credentials securely (Supabase secrets or env vars)
3. Implement `getValuation()` method:
   - Call provider API
   - Map response to `NormalizedValuation`
   - Return normalized data
4. Create server-side API route (`/api/valuations/fetch`)
5. Store result as `property_valuation` record:
   - Purpose: `as_is_market_value` (most providers)
   - Source: Provider name (e.g., "RentCast")
   - Method: `automated_provider`
   - Metadata: Store full provider response
6. Optionally set as current valuation
7. UI displays valuation with provider attribution

**Example normalized provider response**:
```json
{
  "value": 450000,
  "valuationPurpose": "as_is_market_value",
  "valuationDate": "2026-07-15",
  "confidence": 85,
  "comparableCount": 12,
  "metadata": {
    "provider": "RentCast",
    "avm_high": 475000,
    "avm_low": 425000,
    "comparable_addresses": ["123 Oak St", "456 Elm St"],
    "raw_response": { ... }
  }
}
```

---

## Testing Strategy

### Unit Tests
- `valuation-repository.test.ts`: CRUD operations
- `valuation-provider.test.ts`: Provider normalization
- `novation-calculator.test.ts`: Calculation logic

### Integration Tests
- Create valuation → Updates properties.estimated_value
- Set current valuation → Syncs correctly
- Provider fetch → Stores correctly
- Calculator → Reads current valuation

### Manual Testing Scenarios
1. Create manual valuation as-is
2. Create manual valuation ARV
3. Switch current valuation
4. View valuation history
5. Run calculator with different valuations
6. Create saved calculation

---

## Product Decisions Needed

1. **Valuation History UI**: Should it be a modal, sidebar, or dedicated page?
2. **Current valuation selection**: Automatic (newest?) or always manual?
3. **Valuation editing**: Should users be able to edit amounts after creation, or only notes?
4. **Provider auto-refresh**: Should valuations auto-update periodically, or only on-demand?
5. **Comparative Market Analysis**: Future feature to show multiple valuations side-by-side?
6. **Valuation alerts**: Notify when property value changes significantly?

---

## Summary

### Key Principles
1. **Property valuation is its own domain** - Not owned by calculator
2. **Valuation purpose is explicit** - Never conflate as-is value with ARV
3. **History is preserved** - All valuations tracked, never deleted
4. **Source is transparent** - User knows where value came from
5. **Provider-agnostic** - Calculator doesn't know/care about provider
6. **Backwards compatible** - `estimated_value` remains for convenience

### What Changes
- ✅ New `property_valuations` table with full history
- ✅ Property has `current_valuation_id` foreign key
- ✅ Calculator consumes current valuation (read-only)
- ✅ Clear separation: property facts vs. deal assumptions
- ✅ Provider abstraction ready for future integrations

### What Stays the Same
- ✅ `properties.estimated_value` (cached for convenience)
- ✅ Calculator fields on properties (deal assumptions)
- ✅ Existing UI continues to work
- ✅ No breaking changes to current workflows
