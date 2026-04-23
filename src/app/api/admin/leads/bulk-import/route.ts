import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from 'xlsx';

type CSVRow = Record<string, string | number | boolean>;

function parseExcel(buffer: ArrayBuffer): CSVRow[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as CSVRow[];
    
    console.log('Excel file parsed successfully');
    console.log('Rows:', jsonData.length);
    if (jsonData.length > 0) {
      console.log('Headers:', Object.keys(jsonData[0]));
    }
    
    return jsonData;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file');
  }
}

function parseCSV(csvText: string): CSVRow[] {
  try {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Try to detect delimiter - check if first line has tabs or commas
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: CSVRow[] = [];

    console.log('CSV Headers:', headers);
    console.log('Delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    return rows;
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    throw new Error('Failed to parse CSV file');
  }
}

function parseBool(value: string | number | boolean): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  const lower = String(value).toLowerCase().trim();
  if (lower === 'true' || lower === 'yes' || lower === '1') return true;
  if (lower === 'false' || lower === 'no' || lower === '0') return false;
  return null;
}

function parseNumber(value: string | number | boolean): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(String(value).replace(/[,$]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

function parseInt(value: string | number | boolean): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  if (typeof value === 'number') return Math.floor(value);
  const parsed = Number.parseInt(String(value).replace(/[,$]/g, ''), 10);
  return isNaN(parsed) ? null : parsed;
}

function parseDate(value: string | number | Date | boolean): string | null {
  if (!value || typeof value === 'boolean') return null;
  try {
    // Excel stores dates as numbers (days since 1900-01-01)
    if (typeof value === 'number') {
      // Excel date serial number
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return isNaN(date.getTime()) ? null : date.toISOString();
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

function mapCSVToBatchLead(row: CSVRow) {
  // Helper to safely convert to string
  const toString = (val: string | number | boolean | null | undefined): string | null => {
    if (val === null || val === undefined || val === '') return null;
    return String(val);
  };

  return {
    // Lead Status & Identifiers
    lead_status: toString(row["Lead Status"]),
    
    // Owner Information
    first_name: toString(row["First Name"]),
    last_name: toString(row["Last Name"]),
    owner_2_first_name: toString(row["Owner 2 First Name"]),
    owner_2_last_name: toString(row["Owner 2 Last Name"]),
    
    // Mailing Address
    mailing_address: toString(row["Mailing Address"]),
    mailing_city: toString(row["Mailing City"]),
    mailing_state: toString(row["Mailing State"]),
    mailing_zip: toString(row["Mailing Zip"]),
    mailing_county: toString(row["Mailing County"]),
    
    // Property Address
    property_address: toString(row["Property Address"]),
    property_city: toString(row["Property City"]),
    property_state: toString(row["Property State"]),
    property_zip: toString(row["Property Zip"]),
    property_county: toString(row["Property County"]),
    
    // Contact Information
    email: toString(row["Email"]),
    email_2: toString(row["Email 2"]),
    phone_1: toString(row["Phone 1"]),
    phone_1_dnc: parseBool(row["Phone 1 DNC"]),
    phone_1_type: toString(row["Phone 1 TYPE"]),
    phone_2: toString(row["Phone 2"]),
    phone_2_dnc: parseBool(row["Phone 2 DNC"]),
    phone_2_type: toString(row["Phone 2 TYPE"]),
    phone_3: toString(row["Phone 3"]),
    phone_3_dnc: parseBool(row["Phone 3 DNC"]),
    phone_3_type: toString(row["Phone 3 TYPE"]),
    phone_4: toString(row["Phone 4"]),
    phone_4_dnc: parseBool(row["Phone 4 DNC"]),
    phone_4_type: toString(row["Phone 4 TYPE"]),
    phone_5: toString(row["Phone 5"]),
    phone_5_dnc: parseBool(row["Phone 5 DNC"]),
    phone_5_type: toString(row["Phone 5 TYPE"]),
    office: toString(row["Office"]),
    
    // Flags
    litigator: parseBool(row["Litigator"]),
    is_vacant: parseBool(row["Is Vacant"]),
    is_mailing_vacant: parseBool(row["Is Mailing Vacant"]),
    opt_out: parseBool(row["Opt-Out"]),
    contact_obtained: parseBool(row["Contact Obtained"]),
    
    // Counts
    list_count: parseInt(row["List Count"]),
    tag_count: parseInt(row["Tag Count"]),
    parcel_count: parseInt(row["Parcel Count"]),
    unit_count: parseInt(row["Unit Count"]),
    commercial_unit_count: parseInt(row["Commercial Unit Count"]),
    residential_unit_count: parseInt(row["Residential Unit Count"]),
    
    // Property Details
    apn: toString(row["Apn"]),
    property_type_detail: toString(row["Property Type Detail"]),
    owner_occupied: parseBool(row["Owner Occupied"]),
    bedroom_count: parseInt(row["Bedroom Count"]),
    bathroom_count: parseInt(row["Bathroom Count"]),
    total_building_area_sqft: parseInt(row["Total Building Area Square Feet"]),
    lot_size_sqft: parseInt(row["Lot Size Square Feet"]),
    year_built: parseInt(row["Year Built"]),
    zoning_code: toString(row["Zoning Code"]),
    
    // Financial Information
    total_assessed_value: parseNumber(row["Total Assessed Value"]),
    last_sale_date: parseDate(row["Last Sale Date"]),
    last_sale_price: parseNumber(row["Last Sale Price"]),
    total_loan_balance: parseNumber(row["Total Loan Balance"]),
    equity_current_estimated_balance: parseNumber(row["Equity Current Estimated Balance"]),
    estimated_value: parseNumber(row["Estimated Value"]),
    ltv_current_estimated_combined: parseNumber(row["Ltv Current Estimated Combined"]),
    arv: parseNumber(row["ARV"]),
    spread: parseNumber(row["Spread"]),
    pct_arv: parseNumber(row["% ARV"]),
    
    // MLS Information
    mls_status: toString(row["Mls Status"]),
    mls_listing_date: parseDate(row["Mls Listing Date"]),
    mls_listing_amount: parseNumber(row["Mls Listing Amount"]),
    mls_listing_agent_fullname: toString(row["Mls Listing Agent Fullname"]),
    mls_agent_primary_phone: toString(row["Mls Agent Primary Phone"]),
    mls_agent_email: toString(row["Mls Agent Email"]),
    mls_agent_brokerage_name: toString(row["Mls Agent Brokerage Name"]),
    mls_agent_brokerage_phone: toString(row["Mls Agent Brokerage Phone"]),
    
    // Loan Information
    loan_recording_date: parseDate(row["Loan Recording Date"]),
    loan_type: toString(row["Loan Type"]),
    loan_amount: parseNumber(row["Loan Amount"]),
    loan_lender_name: toString(row["Loan Lender Name"]),
    loan_due_date: parseDate(row["Loan Due Date"]),
    loan_est_payment: parseNumber(row["Loan Est Payment"]),
    loan_est_interest_rate: parseNumber(row["Loan Est Interest Rate"]),
    loan_est_balance: parseNumber(row["Loan Est Balance"]),
    loan_term_months: parseInt(row["Loan Term (Months)"]),
    
    // Foreclosure Information
    foreclosure_document_type: toString(row["Foreclosure Document Type"]),
    foreclosure_status: toString(row["Foreclosure Status"]),
    foreclosure_auction_date: parseDate(row["Foreclosure Auction Date"]),
    foreclosure_loan_default_date: parseDate(row["Foreclosure Loan Default Date"]),
    foreclosure_loan_recording_date: parseDate(row["Foreclosure Loan Recording Date"]),
    foreclosure_case_number: toString(row["Foreclosure Case Number"]),
    foreclosure_trustee_attorney_name: toString(row["Foreclosure Trustee/Attorney Name"]),
    
    // Other
    self_managed: parseBool(row["Self Managed"]),
    pushed_to_batchdialer: parseBool(row["Pushed to BatchDialer"]),
    batchrank_score_category: toString(row["Batchrank Score Category"]),
    tag_names: toString(row["Tag Names"]),
    notes: toString(row["Notes"]),
    list: toString(row["List"]),
    
    // Timestamps
    batch_created_date: parseDate(row["Created Date"]),
    batch_updated_date: parseDate(row["Updated Date"]),
  };
}

function mapStatusToLeadStatus(batchStatus: string): string {
  const statusMap: Record<string, string> = {
    'new': 'new',
    'contacted': 'contacted',
    'offer-sent': 'offer-sent',
    'offer sent': 'offer-sent',
    'under-contract': 'under-contract',
    'under contract': 'under-contract',
    'closed': 'closed',
    'archived': 'archived',
  };
  
  const normalized = (batchStatus || 'new').toLowerCase().trim();
  return statusMap[normalized] || 'new';
}

type BatchLead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_1: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  notes: string | null;
  property_type_detail: string | null;
  lead_status: string | null;
  foreclosure_status: string | null;
};

function mapBatchLeadToLead(batchLead: BatchLead, sourceId: string) {
  // Combine first and last name
  const fullName = [batchLead.first_name, batchLead.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || null;

  // Determine sell reason from foreclosure status
  let sellReason = null;
  if (batchLead.foreclosure_status) {
    const foreclosureStatus = batchLead.foreclosure_status.toLowerCase();
    if (foreclosureStatus.includes('foreclosure')) {
      sellReason = 'Foreclosure';
    } else if (foreclosureStatus.includes('inherit')) {
      sellReason = 'Inherited';
    }
  }

  return {
    full_name: fullName,
    email: batchLead.email,
    phone: batchLead.phone_1,
    street_address: batchLead.property_address,
    city: batchLead.property_city,
    state: batchLead.property_state,
    postal_code: batchLead.property_zip,
    owner_notes: batchLead.notes,
    source_id: sourceId,
    sms_consent: false,
    status: mapStatusToLeadStatus(batchLead.lead_status || ''),
    // Optional fields
    listed_with_agent: null,
    property_type: batchLead.property_type_detail,
    owns_land: null,
    repairs_needed: null,
    close_timeline: null,
    sell_reason: sellReason,
    acceptable_offer: null,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const createLeads = formData.get('createLeads') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

    let rows: CSVRow[] = [];
    const fileName = file.name.toLowerCase();
    
    try {
      // Determine file type and parse accordingly
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || file.type.includes('spreadsheet')) {
        console.log('Parsing as Excel file');
        const buffer = await file.arrayBuffer();
        rows = parseExcel(buffer);
      } else {
        console.log('Parsing as CSV/TSV file');
        const csvText = await file.text();
        rows = parseCSV(csvText);
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return NextResponse.json(
        { 
          error: "Failed to parse file",
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File is empty or contains no valid data rows" },
        { status: 400 }
      );
    }

    console.log(`Successfully parsed ${rows.length} rows from file`);

    // Validate that we have expected columns
    const firstRow = rows[0];
    const hasRequiredColumns = firstRow && (
      'First Name' in firstRow || 
      'Last Name' in firstRow || 
      'Email' in firstRow || 
      'Phone 1' in firstRow
    );

    if (!hasRequiredColumns) {
      console.warn('Missing expected columns. Found columns:', Object.keys(firstRow));
      return NextResponse.json(
        { 
          error: "File format not recognized",
          details: "Expected columns like 'First Name', 'Last Name', 'Email', 'Phone 1' not found",
          foundColumns: Object.keys(firstRow).slice(0, 10)
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const totalRows = rows.length;
    const skippedRows: Array<{ row: number; reason: string; data?: string }> = [];

    // Map CSV rows to batchleads format and track duplicates
    const batchLeadsToInsert = [];
    const seen = new Set<string>();

    console.log(`Processing ${totalRows} rows from file`);

    for (let i = 0; i < rows.length; i++) {
      const mapped = mapCSVToBatchLead(rows[i]);
      
      // Create deduplication key
      const dedupKey = `${(mapped.first_name || '').toLowerCase()}|${(mapped.last_name || '').toLowerCase()}|${(mapped.property_address || '').toLowerCase()}`;
      
      if (seen.has(dedupKey)) {
        skippedRows.push({
          row: i + 2,
          reason: "Duplicate in file",
          data: `${mapped.first_name || ''} ${mapped.last_name || ''} - ${mapped.property_address || ''}`.trim()
        });
        continue;
      }
      
      seen.add(dedupKey);
      batchLeadsToInsert.push(mapped);
    }

    // Log first row for debugging
    if (batchLeadsToInsert.length > 0) {
      console.log('First mapped batch lead:', JSON.stringify(batchLeadsToInsert[0], null, 2));
    }

    // Insert in batches to handle large datasets
    const BATCH_SIZE = 500; // Insert 500 records at a time
    const insertedBatchLeads = [];
    
    console.log(`Inserting ${batchLeadsToInsert.length} batch leads in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < batchLeadsToInsert.length; i += BATCH_SIZE) {
      const batch = batchLeadsToInsert.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(batchLeadsToInsert.length / BATCH_SIZE);
      
      console.log(`Inserting batch ${batchNumber}/${totalBatches} (${batch.length} records)`);
      
      const { data: batchData, error: batchError } = await supabase
        .from("batchleads")
        .insert(batch)
        .select();
      
      if (batchError) {
        console.error(`Batch ${batchNumber} insert error:`, batchError);
        return NextResponse.json(
          { 
            error: `Failed to import batch ${batchNumber}/${totalBatches}`,
            details: batchError.message,
            hint: batchError.hint,
            code: batchError.code,
            imported: insertedBatchLeads.length,
            totalRows,
            skipped: skippedRows.length,
            skippedRows
          },
          { status: 500 }
        );
      }
      
      if (batchData) {
        insertedBatchLeads.push(...batchData);
      }
    }

    if (!insertedBatchLeads || insertedBatchLeads.length === 0) {
      console.error('No batch leads were inserted');
      return NextResponse.json(
        { error: "No batch leads were inserted" },
        { status: 500 }
      );
    }

    console.log(`Successfully inserted ${insertedBatchLeads.length} batch leads`);

    let leadsCreated = 0;
    let mappingsCreated = 0;

    // If requested, also create leads and mappings
    if (createLeads && insertedBatchLeads) {
      // Use the BatchLeads source ID
      const batchSourceId = "b77cdad8-fadd-4910-87f6-d6112c760f02";
      
      // Verify the source exists
      const { data: batchSource, error: sourceError } = await supabase
        .from("sources")
        .select("id")
        .eq("id", batchSourceId)
        .single();

      if (sourceError || !batchSource) {
        console.error("BatchLeads source error:", sourceError);
        return NextResponse.json({
          success: true,
          totalRows,
          batchLeadsImported: insertedBatchLeads.length,
          leadsCreated: 0,
          skipped: skippedRows.length,
          skippedRows,
          error: "BatchLeads source not found. Batch leads imported but no leads created.",
        });
      }

      // Check for existing leads with same first name, last name, and property address
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("id, full_name, street_address")
        .is("deleted_at", null);

      const existingLeadsSet = new Set(
        (existingLeads || []).map(l => {
          const [firstName, ...lastNameParts] = (l.full_name || '').split(' ');
          const lastName = lastNameParts.join(' ');
          return `${firstName.toLowerCase()}|${lastName.toLowerCase()}|${(l.street_address || '').toLowerCase()}`;
        })
      );

      const leadsToInsert = [];

      for (const batchLead of insertedBatchLeads) {
        // Skip if no contact method
        if (!batchLead.email && !batchLead.phone_1) {
          skippedRows.push({
            row: -1,
            reason: "No contact method (email or phone)",
            data: `${batchLead.first_name || ''} ${batchLead.last_name || ''}`.trim()
          });
          continue;
        }

        // Check for duplicate in existing leads
        const dedupKey = `${(batchLead.first_name || '').toLowerCase()}|${(batchLead.last_name || '').toLowerCase()}|${(batchLead.property_address || '').toLowerCase()}`;
        
        if (existingLeadsSet.has(dedupKey)) {
          skippedRows.push({
            row: -1,
            reason: "Already exists in database",
            data: `${batchLead.first_name || ''} ${batchLead.last_name || ''} - ${batchLead.property_address || ''}`.trim()
          });
          continue;
        }

        leadsToInsert.push(mapBatchLeadToLead(batchLead, batchSourceId));
      }

      if (leadsToInsert.length > 0) {
        console.log(`Creating ${leadsToInsert.length} leads in batches`);
        
        const insertedLeads = [];
        const LEAD_BATCH_SIZE = 500;
        
        for (let i = 0; i < leadsToInsert.length; i += LEAD_BATCH_SIZE) {
          const leadBatch = leadsToInsert.slice(i, i + LEAD_BATCH_SIZE);
          const leadBatchNumber = Math.floor(i / LEAD_BATCH_SIZE) + 1;
          const totalLeadBatches = Math.ceil(leadsToInsert.length / LEAD_BATCH_SIZE);
          
          console.log(`Creating lead batch ${leadBatchNumber}/${totalLeadBatches} (${leadBatch.length} leads)`);
          
          const { data: leadBatchData, error: leadsInsertError } = await supabase
            .from("leads")
            .insert(leadBatch)
            .select();

          if (leadsInsertError) {
            console.error(`Lead batch ${leadBatchNumber} insert error:`, leadsInsertError);
            return NextResponse.json({
              success: true,
              totalRows,
              batchLeadsImported: insertedBatchLeads.length,
              leadsCreated: insertedLeads.length,
              skipped: skippedRows.length,
              skippedRows,
              error: `Batch leads imported but failed to create leads at batch ${leadBatchNumber}/${totalLeadBatches}`,
              details: leadsInsertError.message,
              hint: leadsInsertError.hint,
              code: leadsInsertError.code,
            });
          }
          
          if (leadBatchData) {
            insertedLeads.push(...leadBatchData);
          }
        }

        if (insertedLeads.length === 0) {
          console.warn('No leads were created');
        } else {
          console.log(`Successfully created ${insertedLeads.length} leads`);
        }

        leadsCreated = insertedLeads?.length || 0;

        // Create mappings - need to track which batchlead maps to which lead
        if (insertedLeads && insertedLeads.length > 0) {
          // Map by matching batchlead to inserted lead using dedupKey
          const mappingsToInsert = [];
          let leadIndex = 0;

          for (const batchLead of insertedBatchLeads) {
            // Skip if no contact method (same check as above)
            if (!batchLead.email && !batchLead.phone_1) {
              continue;
            }

            // Skip if was a duplicate
            const dedupKey = `${(batchLead.first_name || '').toLowerCase()}|${(batchLead.last_name || '').toLowerCase()}|${(batchLead.property_address || '').toLowerCase()}`;
            if (existingLeadsSet.has(dedupKey)) {
              continue;
            }

            if (leadIndex < insertedLeads.length) {
              mappingsToInsert.push({
                batchlead_id: batchLead.id,
                lead_id: insertedLeads[leadIndex].id,
              });
              leadIndex++;
            }
          }

          if (mappingsToInsert.length > 0) {
            const { data: insertedMappings, error: mappingsError } = await supabase
              .from("batchleads_mapping")
              .insert(mappingsToInsert)
              .select();

            if (!mappingsError) {
              mappingsCreated = insertedMappings?.length || 0;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalRows,
      batchLeadsImported: insertedBatchLeads?.length || 0,
      leadsCreated,
      mappingsCreated,
      skipped: skippedRows.length,
      skippedRows,
    });

  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
