import { redirect } from "next/navigation";
import { type LeadRow } from "@/lib/leads";
import { type PropertyRow } from "@/lib/properties";
import { type LeadPhone } from "@/lib/lead-phones";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import AdminNav from "../admin-nav";
import LeadsClient from "./leads-client";

export type LeadAnswer = {
  id: string;
  lead_id: string;
  question_id: string;
  question_text: string;
  answer_value: string;
  created_at: string;
};

export type LeadWithProperties = LeadRow & {
  properties: PropertyRow[];
  phones: LeadPhone[];
};

export default async function AdminLeadsPage() {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
          Supabase is not configured yet. Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to continue.
        </div>
      </main>
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }
  const adminClient = createAdminClient();
  const queryClient = adminClient ?? supabase;

  // Query from properties table with inner join on leads
  // This ensures we only get leads that have at least one property
  const { data: propertiesData, error } = await queryClient
    .from("properties")
    .select(`
      *,
      leads!inner(
        id, status, owner_notes, listed_with_agent, property_type, owns_land, 
        repairs_needed, close_timeline, sell_reason, acceptable_offer, 
        street_address, city, state, postal_code, full_name, email, phone, 
        sms_consent, source_id, isHotLead, created_at, updated_at, deleted_at,
        sources(name)
      )
    `)
    .is("leads.deleted_at", null)
    .order("created_at", { ascending: false });
  
  // Log error for debugging
  if (error) {
    console.error("Leads query error:", error);
  }

  // Group properties by lead_id and restructure data
  const leadsMap = new Map<string, LeadWithProperties>();
  
  (propertiesData ?? []).forEach((property: any) => {
    const lead = property.leads;
    const leadId = lead.id;
    
    if (!leadsMap.has(leadId)) {
      leadsMap.set(leadId, {
        ...lead,
        source_name: lead.sources?.name || null,
        sources: undefined,
        properties: [],
      });
    }
    
    // Remove the nested leads object from property and add to lead's properties array
    const { leads: _, ...propertyData } = property;
    leadsMap.get(leadId)!.properties.push(propertyData as PropertyRow);
  });
  
  const leads = Array.from(leadsMap.values());

  // Fetch all phone numbers for all leads
  const { data: phonesData } = await queryClient
    .from("lead_phones")
    .select("*")
    .order("display_order", { ascending: true });

  // Group phones by lead_id
  const phonesByLeadId = (phonesData ?? []).reduce((acc, phone) => {
    if (!acc[phone.lead_id]) {
      acc[phone.lead_id] = [];
    }
    acc[phone.lead_id].push(phone);
    return acc;
  }, {} as Record<string, LeadPhone[]>);

  // Attach phones to leads
  leads.forEach((lead) => {
    lead.phones = phonesByLeadId[lead.id] || [];
  });

  // Fetch all lead answers for all leads
  const { data: answersData } = await queryClient
    .from("lead_answers")
    .select("*")
    .order("created_at", { ascending: true });

  const leadAnswers = (answersData ?? []) as LeadAnswer[];

  // Group answers by lead_id
  const answersByLeadId = leadAnswers.reduce((acc, answer) => {
    if (!acc[answer.lead_id]) {
      acc[answer.lead_id] = [];
    }
    acc[answer.lead_id].push(answer);
    return acc;
  }, {} as Record<string, LeadAnswer[]>);

  // Check if bulk import is enabled globally
  const canBulkImport = await isFeatureEnabled('bulk_import_leads');
  
  // Check if forms feature is enabled
  const formsEnabled = await isFeatureEnabled('forms', user.email || undefined);

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10 text-[var(--color-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav />
        
        <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Lead dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
            Manage seller leads
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Review intake responses, update lead status, and keep notes in one place.
          </p>
        </header>

        {error ? (
          <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Failed to load leads</p>
            <p className="mt-2 text-xs">{error.message}</p>
            <p className="mt-1 text-xs opacity-75">Check console for details or run the properties migration in Supabase SQL Editor</p>
          </div>
        ) : (
          <LeadsClient initialLeads={leads} leadAnswers={answersByLeadId} canBulkImport={canBulkImport} formsEnabled={formsEnabled} />
        )}
      </div>
    </main>
  );
}
