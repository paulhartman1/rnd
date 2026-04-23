# Bulk Import Feature for Leads

## Overview

The bulk import feature allows administrators to import leads in bulk from CSV or Excel files exported from BatchLeads. The system stores all raw data in a dedicated `batchleads` table and optionally creates corresponding entries in the `leads` table with essential fields mapped.

**Supported file formats:**
- CSV (.csv) - comma or tab-delimited
- TSV (.tsv, .txt) - tab-delimited
- Excel (.xlsx, .xls)

## Database Structure

### Tables

1. **`batchleads`** - Stores all raw imported data from BatchLeads CSV exports
   - Contains all fields from the BatchLeads export format
   - Preserves financial data, foreclosure information, MLS details, and loan information
   - All fields are nullable to handle incomplete data

2. **`batchleads_mapping`** - Links batchleads to leads
   - One-to-one mapping between `batchleads` and `leads` tables
   - Ensures traceability between raw import data and processed leads
   - Unique constraints prevent duplicate mappings

3. **`leads`** - Your existing leads table
   - Receives mapped essential fields from batchleads
   - Source is set to "BatchLeads"

### Field Mapping

The following fields are automatically mapped from `batchleads` to `leads`:

| BatchLeads Field | Leads Field | Notes |
|-----------------|-------------|-------|
| `first_name + last_name` | `full_name` | Combined into single field |
| `email` | `email` | Primary email |
| `phone_1` | `phone` | Primary phone |
| `property_address` | `street_address` | - |
| `property_city` | `city` | - |
| `property_state` | `state` | - |
| `property_zip` | `postal_code` | - |
| `notes` | `owner_notes` | - |
| `property_type_detail` | `property_type` | - |
| `lead_status` | `status` | Normalized to valid status values |
| `foreclosure_status` | `sell_reason` | "Foreclosure" or "Inherited" if applicable |

## How to Use

### 1. Prepare Your File

Export leads from BatchLeads as CSV, TSV, or Excel format with the following columns:

```
Lead Status, First Name, Last Name, Mailing Address, Mailing City, Mailing State, 
Mailing Zip, Mailing County, Property City, Property State, Property Address, 
Property Zip, Property County, Owner 2 First Name, Owner 2 Last Name, List Count, 
Tag Count, Email, Email 2, Litigator, Is Vacant, Is Mailing Vacant, Opt-Out, 
Created Date, Updated Date, Apn, Parcel Count, Property Type Detail, Owner Occupied, 
Bedroom Count, Bathroom Count, Total Building Area Square Feet, Lot Size Square Feet, 
Year Built, Total Assessed Value, Zoning Code, Last Sale Date, Last Sale Price, 
Total Loan Balance, Equity Current Estimated Balance, Estimated Value, 
Ltv Current Estimated Combined, Mls Status, Self Managed, Pushed to BatchDialer, 
Loan Recording Date, Loan Type, Loan Amount, Loan Lender Name, Loan Due Date, 
Loan Est Payment, Loan Est Interest Rate, Loan Est Balance, Loan Term (Months), 
ARV, Spread, % ARV, Batchrank Score Category, Tag Names, Notes, 
Foreclosure Document Type, Foreclosure Status, Foreclosure Auction Date, 
Foreclosure Loan Default Date, Foreclosure Loan Recording Date, 
Foreclosure Case Number, Foreclosure Trustee/Attorney Name, Unit Count, 
Commercial Unit Count, Residential Unit Count, Contact Obtained, Mls Listing Date, 
Mls Listing Amount, Mls Listing Agent Fullname, Mls Agent Primary Phone, 
Mls Agent Email, Mls Agent Brokerage Name, Mls Agent Brokerage Phone, Office, 
Phone 1, Phone 1 DNC, Phone 1 TYPE, Phone 2, Phone 2 DNC, Phone 2 TYPE, Phone 3, 
Phone 3 DNC, Phone 3 TYPE, Phone 4, Phone 4 DNC, Phone 4 TYPE, Phone 5, 
Phone 5 DNC, Phone 5 TYPE, List
```

### 2. Access the Bulk Import Feature

1. Navigate to the Admin Leads page (`/admin/leads`)
2. Click the **"📊 Bulk Import"** button in the top-right corner
3. A modal will open with import options

### 3. Upload and Import

1. **Select your file** - Choose the CSV, TSV, or Excel export from BatchLeads
2. **Choose import options:**
   - ✅ **Also create leads in the leads table** (recommended)
     - Imports raw data to `batchleads` table
     - Creates corresponding entries in `leads` table
     - Creates mapping records linking the two
   - ⬜ **Unchecked** - Only imports to `batchleads` table (for review before creating leads)

3. Click **"Import Leads"**

### 4. Review Results

After import completes, you'll see:
- Total rows processed
- Batch leads imported
- Leads created (if option was checked)
- Mappings created

The page will automatically reload to show the newly imported leads.

## Data Validation

The import process validates:
- **Contact Information**: At least one contact method (email or phone) is required to create a lead
- **Email Format**: Valid email format if email is provided
- **Date Parsing**: Dates are parsed and stored in ISO format
- **Numeric Fields**: Currency and numeric values are parsed correctly

## Status Mapping

Lead Status values from BatchLeads are normalized to match the `leads` table:

| BatchLeads Status | Mapped Status |
|------------------|---------------|
| new | new |
| contacted | contacted |
| offer-sent / offer sent | offer-sent |
| under-contract / under contract | under-contract |
| closed | closed |
| archived | archived |
| *(any other)* | new |

## Accessing Raw BatchLeads Data

All imported data is preserved in the `batchleads` table. You can:

1. Query the `batchleads` table directly for detailed information
2. Use the `batchleads_mapping` table to find the corresponding `lead_id`
3. Access financial, foreclosure, and MLS data that isn't mapped to the leads table

Example query:
```sql
SELECT 
  l.full_name,
  l.email,
  b.foreclosure_status,
  b.estimated_value,
  b.total_loan_balance,
  b.mls_listing_amount
FROM leads l
JOIN batchleads_mapping m ON l.id = m.lead_id
JOIN batchleads b ON b.id = m.batchlead_id
WHERE l.id = 'your-lead-id';
```

## Migration

Run the migration to create the necessary tables:

```bash
# Apply the migration
supabase db push

# Or if using migrations directory
supabase migration up
```

The migration creates:
- `batchleads` table with all fields
- `batchleads_mapping` table for relationships
- Indexes for performance
- RLS policies for security

## Troubleshooting

### Import Fails
- Verify the CSV file is tab-delimited
- Check that headers match the expected format
- Ensure at least one contact method (email/phone) per row

### No Leads Created
- Check that "BatchLeads" source exists in the `sources` table
- Verify contact information is present in the CSV
- Review server logs for validation errors

### Missing Data
- All raw data is preserved in `batchleads` table
- Only essential fields are mapped to `leads` table
- Access additional data through the mapping table
