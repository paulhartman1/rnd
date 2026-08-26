"use client";

import { useEffect, useMemo, useState } from "react";
import { leadStatuses, type LeadRow, type LeadStatus } from "@/lib/leads";
import {
  appointmentStatuses,
  type AppointmentStatus,
} from "@/lib/appointments";
import { createClient } from "@/lib/supabase/client";
import type { LeadAnswer, LeadWithProperties } from "./page";
import PhoneNumbersList from "./components/PhoneNumbersList";
import { useUnifiedCalling } from "@/hooks/useUnifiedCalling";
import dynamic from 'next/dynamic';
import NovationCalculator, { type NovationFormData } from '@/components/admin/NovationCalculator';

// Dynamically import map to avoid SSR issues with Leaflet
const LeadsMap = dynamic(
  () => import('./components/LeadsMap'),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center">Loading map...</div> }
);

type LeadDraftState = {
  status: LeadStatus;
  ownerNotes: string;
  isSaving: boolean;
  isCalling: boolean;
  isRemoving: boolean;
  error: string | null;
  callMessage: string | null;
  showContactMenu: boolean;
  showQuestions: boolean;
  showContactInfo: boolean;
  showPropertyDetails: boolean;
  showFinancial: boolean;
  showForeclosure: boolean;
};

type Props = {
  initialLeads: LeadWithProperties[];
  leadAnswers: Record<string, LeadAnswer[]>;
  canBulkImport: boolean;
  formsEnabled: boolean;
};

function toLeadDraft(lead: LeadRow): LeadDraftState {
  return {
    status: lead.status,
    ownerNotes: lead.owner_notes ?? "",
    isSaving: false,
    isCalling: false,
    isRemoving: false,
    error: null,
    callMessage: null,
    showContactMenu: false,
    showQuestions: false,
    showContactInfo: true,
    showPropertyDetails: true,
    showFinancial: false,
    showForeclosure: false,
  };
}

export default function LeadsClient({ initialLeads, leadAnswers, canBulkImport, formsEnabled }: Props) {
  const [leads, setLeads] = useState<LeadWithProperties[]>(initialLeads);
  const [activeCallLeadId, setActiveCallLeadId] = useState<string | null>(null);
  const [activeCallNotes, setActiveCallNotes] = useState("");
  
  // Route mobile/PWA calls through the phone bridge and desktop calls through WebRTC.
  const { makeCall, hangup, callStatus, isConnected, isMuted, toggleMute, transport } = useUnifiedCalling({
    debug: true, // Enable debug logging
    onCallDisconnected: () => {
      // Clear active call state
      setActiveCallLeadId(null);
      setActiveCallNotes("");
      // Reload to update call attempt counts
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error) => {
      console.error("Voice SDK error:", error);
      alert(`Call failed: ${error.message}`);
      setActiveCallLeadId(null);
      setActiveCallNotes("");
    },
  });
  const [drafts, setDrafts] = useState<Record<string, LeadDraftState>>(() => {
    const nextState: Record<string, LeadDraftState> = {};
    initialLeads.forEach((lead) => {
      nextState[lead.id] = toLeadDraft(lead);
    });
    return nextState;
  });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [hotLeadsOnly, setHotLeadsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "hot" | "source">("hot");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [geocodedProperties, setGeocodedProperties] = useState<any[]>([]);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [schedulingLeadId, setSchedulingLeadId] = useState<string | null>(null);
  const [appointmentDraft, setAppointmentDraft] = useState({
    title: "",
    description: "",
    startTime: new Date().toISOString().slice(0, 16),
    endTime: "",
    location: "",
    status: "scheduled" as AppointmentStatus,
    isSaving: false,
    error: null as string | null,
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailingLeadId, setEmailingLeadId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState({
    subject: "",
    message: "",
    isSending: false,
    error: null as string | null,
    success: false,
  });
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [createLeadDraft, setCreateLeadDraft] = useState({
    fullName: "",
    email: "",
    phone: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    ownerNotes: "",
    sourceName: "manual",
    isCreating: false,
    error: null as string | null,
    success: false,
  });
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportStep, setBulkImportStep] = useState<'choose' | 'upload' | 'pull' | 'skiptrace'>('choose');
  const [showExportCsv, setShowExportCsv] = useState(false);
  const [bulkImportDraft, setBulkImportDraft] = useState({
    file: null as File | null,
    createLeads: true,
    createCampaign: false,
    campaignName: "",
    isUploading: false,
    error: null as string | null,
    success: false,
    result: null as { 
      totalRows: number; 
      batchLeadsImported: number; 
      leadsCreated: number; 
      mappingsCreated: number; 
      skipped: number;
      campaignId?: string;
      campaignName?: string;
      skippedRows?: Array<{ row: number; reason: string; data?: string }>;
    } | null,
  });
  type SkipTraceResult = {
    dryRun: boolean;
    total: number;
    matched: number;
    matched_no_lead: number;
    unmatched: number;
    ambiguous: number;
    malformed: number;
    phones_added: number;
    emails_added: number;
    dupes_ignored: number;
    unmatchedRows?: Array<{ apn: string | null; state: string | null; county: string | null; owner: string | null; reason?: string }>;
    ambiguousRows?: Array<{ apn: string | null; state: string | null; county: string | null; owner: string | null; reason?: string; candidateLeadIds?: string[] }>;
    malformedRows?: Array<{ apn: string | null; state: string | null; county: string | null; owner: string | null; reason?: string }>;
  };
  const [skipTraceDraft, setSkipTraceDraft] = useState({
    file: null as File | null,
    isRunning: false,
    error: null as string | null,
    preview: null as SkipTraceResult | null,
    result: null as SkipTraceResult | null,
  });
  const [attomPullDraft, setAttomPullDraft] = useState({
    minScore: 70,
    maxCount: 50,
    zipcodes: '',
    isPulling: false,
    isLoadingZipcodes: false,
    availableZipcodes: [] as string[],
    error: null as string | null,
    success: false,
    result: null as { converted: number; leadIds: string[] } | null,
  });

  // Get unique sources for the filter dropdown (from existing leads)
  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    leads.forEach((lead) => {
      if (lead.source_name) {
        sources.add(lead.source_name);
      }
    });
    return Array.from(sources).sort();
  }, [leads]);

  // State for all active sources from database
  const [allActiveSources, setAllActiveSources] = useState<string[]>([]);

  // Fetch all active sources on mount
  useEffect(() => {
    const fetchSources = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('sources')
        .select('name')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setAllActiveSources(data.map(s => s.name));
      }
    };
    fetchSources();
  }, []);

  // Fetch geocoded properties for map view
  useEffect(() => {
    if (viewMode === 'map') {
      const fetchGeocodedProperties = async () => {
        setIsLoadingMap(true);
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('properties')
          .select(`
            id,
            latitude,
            longitude,
            street_address,
            city,
            state,
            postal_code,
            lead_id,
            leads(
              id,
              full_name,
              email,
              phone,
              status,
              priority_score,
              deleted_at
            )
          `)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
        
        if (error) {
          console.error('Error fetching geocoded properties:', error);
        }
        
        // Filter out properties with deleted leads
        console.log('Sample property data:', data?.[0]);
        const filtered = (data || []).filter(p => {
          const lead = Array.isArray(p.leads) ? p.leads[0] : p.leads;
          if (!lead) {
            console.log('Property has no lead:', p.id);
            return false;
          }
          const isDeleted = !!lead.deleted_at;
          if (isDeleted) {
            console.log('Lead is deleted:', lead.id, lead.deleted_at);
          }
          return !isDeleted;
        });
        
        console.log('Fetched geocoded properties:', filtered.length, 'out of', data?.length || 0);
        setGeocodedProperties(filtered);
        setIsLoadingMap(false);
      };
      
      fetchGeocodedProperties();
    }
  }, [viewMode]);

  const visibleLeads = useMemo(() => {
    let filtered = leads.filter((lead) => showDeleted || !lead.deleted_at);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.full_name?.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query) ||
          lead.street_address?.toLowerCase().includes(query) ||
          lead.city?.toLowerCase().includes(query) ||
          lead.state?.toLowerCase().includes(query) ||
          lead.property_type?.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    // Apply source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter((lead) => lead.source_name === sourceFilter);
    }

    // Apply hot leads filter
    if (hotLeadsOnly) {
      filtered = filtered.filter((lead) => lead.isHotLead === true);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "hot") {
        // Sort by hot leads first, then by newest
        if (a.isHotLead !== b.isHotLead) {
          return (b.isHotLead ? 1 : 0) - (a.isHotLead ? 1 : 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "source") {
        return (a.source_name || "").localeCompare(b.source_name || "");
      } else {
        // name
        return (a.full_name || "").localeCompare(b.full_name || "");
      }
    });

    return filtered;
  }, [leads, showDeleted, searchQuery, statusFilter, sourceFilter, hotLeadsOnly, sortBy]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(visibleLeads.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = visibleLeads.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sourceFilter, hotLeadsOnly, sortBy, showDeleted]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const hasVisibleLeads = visibleLeads.length > 0;

  const updateDraft = (leadId: string, patch: Partial<LeadDraftState>) => {
    setDrafts((previous) => ({
      ...previous,
      [leadId]: {
        ...previous[leadId],
        ...patch,
      },
    }));
  };

  const saveLead = async (leadId: string) => {
    const draft = drafts[leadId];
    if (!draft) return;

    updateDraft(leadId, { isSaving: true, error: null });

    const response = await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: draft.status,
        ownerNotes: draft.ownerNotes,
      }),
    });

    if (!response.ok) {
      updateDraft(leadId, {
        isSaving: false,
        error: "Could not save this lead. Please try again.",
      });
      return;
    }

    setLeads((previous) =>
      previous.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: draft.status,
              owner_notes: draft.ownerNotes || null,
              updated_at: new Date().toISOString(),
            }
          : lead,
      ),
    );
    updateDraft(leadId, { isSaving: false, error: null });
  };

  const toggleContactMenu = (leadId: string) => {
    const draft = drafts[leadId];
    if (!draft) return;
    updateDraft(leadId, { showContactMenu: !draft.showContactMenu });
  };

  const callLeadPhone = async (leadId: string, phoneId: string) => {
    const draft = drafts[leadId];
    const lead = leads.find((l) => l.id === leadId);
    if (!draft || !lead) return;

    const phone = lead.phones?.find((p) => p.id === phoneId);
    if (!phone) {
      updateDraft(leadId, {
        error: "Phone number not found.",
      });
      return;
    }

    updateDraft(leadId, { isCalling: true, error: null, callMessage: null, showContactMenu: false });

    try {
      // Set active call state
      setActiveCallLeadId(leadId);
      setActiveCallNotes(lead.owner_notes || "");
      
      // Use Voice SDK to make the call
      await makeCall({
        phoneNumber: phone.phone_number,
        phoneId: phoneId,
      });

      // Track call attempt
      await fetch(`/api/admin/leads/${leadId}/phones/${phoneId}/call-attempt`, {
        method: "POST",
      });

      updateDraft(leadId, {
        isCalling: false,
        error: null,
        callMessage: transport === 'phone' ? "Calling your phone first, then connecting to the lead." : "Call connected.",
      });
    } catch (error) {
      updateDraft(leadId, {
        isCalling: false,
        error: error instanceof Error ? error.message : "Could not place call.",
      });
      setActiveCallLeadId(null);
      setActiveCallNotes("");
    }
  };

  const saveActiveCallNotes = async () => {
    if (!activeCallLeadId) return;

    const response = await fetch(`/api/admin/leads/${activeCallLeadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerNotes: activeCallNotes,
      }),
    });

    if (response.ok) {
      // Update lead in local state
      setLeads((previous) =>
        previous.map((lead) =>
          lead.id === activeCallLeadId
            ? { ...lead, owner_notes: activeCallNotes || null }
            : lead
        )
      );
    }
  };

  const callLead = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Find primary phone or use first phone
    const primaryPhone = lead.phones?.find((p) => p.is_primary);
    const phoneToCall = primaryPhone || lead.phones?.[0];

    if (!phoneToCall) {
      updateDraft(leadId, {
        error: "No phone numbers found for this lead.",
      });
      return;
    }

    await callLeadPhone(leadId, phoneToCall.id);
  };

  const openEmailModal = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const firstName = lead.full_name ? lead.full_name.split(' ')[0] : 'there';
    const subject = lead.street_address ? `Re: ${lead.street_address}` : 'Following up';

    setEmailingLeadId(leadId);
    setEmailDraft({
      subject,
      message: `Hi ${firstName},\n\n`,
      isSending: false,
      error: null,
      success: false,
    });
    setShowEmailModal(true);
    updateDraft(leadId, { showContactMenu: false });
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailingLeadId(null);
  };

  const sendEmail = async () => {
    if (!emailingLeadId || !emailDraft.message.trim()) return;

    setEmailDraft((prev) => ({ ...prev, isSending: true, error: null, success: false }));

    const response = await fetch(`/api/admin/leads/${emailingLeadId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: emailDraft.subject,
        message: emailDraft.message,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setEmailDraft((prev) => ({
        ...prev,
        isSending: false,
        error: body?.error ?? "Could not send email. Please try again.",
      }));
      return;
    }

    setEmailDraft((prev) => ({ ...prev, isSending: false, error: null, success: true }));
    
    // Auto-close after 2 seconds on success
    setTimeout(() => {
      closeEmailModal();
    }, 2000);
  };

  const removeLead = async (leadId: string) => {
    const draft = drafts[leadId];
    if (!draft) return;

    const confirmed = window.confirm(
      "Mark this lead as deleted? It will be hidden from the dashboard.",
    );
    if (!confirmed) {
      return;
    }

    updateDraft(leadId, { isRemoving: true, error: null, callMessage: null });
    const response = await fetch(`/api/admin/leads/${leadId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      updateDraft(leadId, {
        isRemoving: false,
        error: body?.error ?? "Could not delete this lead. Please try again.",
      });
      return;
    }

    setLeads((previous) => previous.filter((lead) => lead.id !== leadId));
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[leadId];
      return next;
    });
  };

  const signOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/admin/login");
  };

  const getDefaultEndTime = (startTime: string) => {
    const start = new Date(startTime);
    start.setHours(start.getHours() + 1);
    return start.toISOString().slice(0, 16);
  };

  const openAppointmentModal = (leadId: string) => {
    const now = new Date().toISOString().slice(0, 16);
    setSchedulingLeadId(leadId);
    setAppointmentDraft({
      title: "",
      description: "",
      startTime: now,
      endTime: getDefaultEndTime(now),
      location: "",
      status: "scheduled",
      isSaving: false,
      error: null,
    });
    setShowAppointmentModal(true);
    updateDraft(leadId, { showContactMenu: false });
  };

  const closeAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSchedulingLeadId(null);
  };

  const saveAppointment = async () => {
    if (!schedulingLeadId || !appointmentDraft.title) return;

    setAppointmentDraft((prev) => ({ ...prev, isSaving: true, error: null }));

    const response = await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: schedulingLeadId,
        title: appointmentDraft.title,
        description: appointmentDraft.description || null,
        startTime: new Date(appointmentDraft.startTime).toISOString(),
        endTime: new Date(appointmentDraft.endTime).toISOString(),
        location: appointmentDraft.location || null,
        status: appointmentDraft.status,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setAppointmentDraft((prev) => ({
        ...prev,
        isSaving: false,
        error: body?.error ?? "Could not create appointment. Please try again.",
      }));
      return;
    }

    setAppointmentDraft((prev) => ({ ...prev, isSaving: false, error: null }));
    closeAppointmentModal();
  };

  const openCreateLeadModal = () => {
    // Default to first available source or 'manual'
    const defaultSource = allActiveSources.length > 0 ? allActiveSources[0] : "manual";
    setCreateLeadDraft({
      fullName: "",
      email: "",
      phone: "",
      streetAddress: "",
      city: "",
      state: "",
      postalCode: "",
      ownerNotes: "",
      sourceName: defaultSource,
      isCreating: false,
      error: null,
      success: false,
    });
    setShowCreateLeadModal(true);
  };

  const closeCreateLeadModal = () => {
    setShowCreateLeadModal(false);
  };

  const createManualLead = async () => {
    // Validate at least one contact method
    if (!createLeadDraft.email.trim() && !createLeadDraft.phone.trim()) {
      setCreateLeadDraft((prev) => ({
        ...prev,
        error: "Either phone or email is required.",
      }));
      return;
    }

    setCreateLeadDraft((prev) => ({ ...prev, isCreating: true, error: null, success: false }));

    const response = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: createLeadDraft.fullName || null,
        email: createLeadDraft.email || null,
        phone: createLeadDraft.phone || null,
        streetAddress: createLeadDraft.streetAddress || null,
        city: createLeadDraft.city || null,
        state: createLeadDraft.state || null,
        postalCode: createLeadDraft.postalCode || null,
        ownerNotes: createLeadDraft.ownerNotes || null,
        sourceName: createLeadDraft.sourceName,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setCreateLeadDraft((prev) => ({
        ...prev,
        isCreating: false,
        error: body?.error ?? "Could not create lead. Please try again.",
      }));
      return;
    }

    const { lead } = (await response.json()) as { lead: LeadRow };
    
    // Add the new lead to the list and initialize its draft state
    // New leads don't have properties or phones yet, so add empty arrays
    setLeads((prev) => [{ ...lead, properties: [], phones: [], smsEligiblePhones: [] }, ...prev]);
    setDrafts((prev) => ({
      ...prev,
      [lead.id]: toLeadDraft(lead),
    }));

    setCreateLeadDraft((prev) => ({ ...prev, isCreating: false, error: null, success: true }));
    
    // Auto-close after 1 second on success
    setTimeout(() => {
      closeCreateLeadModal();
    }, 1000);
  };

  const openBulkImportModal = () => {
    setShowBulkImportModal(true);
    setBulkImportStep('choose');
  };

  const closeBulkImportModal = () => {
    setShowBulkImportModal(false);
    setBulkImportStep('choose');
    setBulkImportDraft({
      file: null,
      createLeads: true,
      createCampaign: false,
      campaignName: "",
      isUploading: false,
      error: null,
      success: false,
      result: null,
    });
    setSkipTraceDraft({
      file: null,
      isRunning: false,
      error: null,
      preview: null,
      result: null,
    });
    setAttomPullDraft({
      minScore: 70,
      maxCount: 50,
      zipcodes: '',
      isPulling: false,
      isLoadingZipcodes: false,
      availableZipcodes: [],
      error: null,
      success: false,
      result: null,
    });
  };

  const handleBulkImport = async () => {
    if (!bulkImportDraft.file) {
      setBulkImportDraft((prev) => ({ ...prev, error: "Please select a file" }));
      return;
    }

    setBulkImportDraft((prev) => ({ ...prev, isUploading: true, error: null, success: false }));

    const formData = new FormData();
    formData.append('file', bulkImportDraft.file);
    formData.append('createLeads', bulkImportDraft.createLeads.toString());
    formData.append('createCampaign', bulkImportDraft.createCampaign.toString());
    if (bulkImportDraft.createCampaign && bulkImportDraft.campaignName) {
      formData.append('campaignName', bulkImportDraft.campaignName);
    }

    const response = await fetch("/api/admin/leads/bulk-import", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setBulkImportDraft((prev) => ({
        ...prev,
        isUploading: false,
        error: body?.error ?? "Could not import leads. Please try again.",
      }));
      return;
    }

    const result = await response.json();
    setBulkImportDraft((prev) => ({ ...prev, isUploading: false, error: null, success: true, result }));
    
    // Reload page after 2 seconds on success
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // Skip-trace enrichment import (distinct from property import — never creates leads)
  const runSkipTrace = async (dryRun: boolean) => {
    if (!skipTraceDraft.file) {
      setSkipTraceDraft((prev) => ({ ...prev, error: "Please select a file" }));
      return;
    }

    setSkipTraceDraft((prev) => ({ ...prev, isRunning: true, error: null }));

    const formData = new FormData();
    formData.append("file", skipTraceDraft.file);
    formData.append("dryRun", dryRun.toString());

    try {
      const response = await fetch("/api/admin/leads/skip-trace-import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSkipTraceDraft((prev) => ({
          ...prev,
          isRunning: false,
          error: body?.error ?? "Skip-trace import failed. Please try again.",
        }));
        return;
      }

      const result = (await response.json()) as SkipTraceResult;
      setSkipTraceDraft((prev) => ({
        ...prev,
        isRunning: false,
        error: null,
        preview: dryRun ? result : prev.preview,
        result: dryRun ? null : result,
      }));
    } catch {
      setSkipTraceDraft((prev) => ({
        ...prev,
        isRunning: false,
        error: "Skip-trace import failed. Please try again.",
      }));
    }
  };

  const loadAvailableZipcodes = async () => {
    setAttomPullDraft((prev) => ({ ...prev, isLoadingZipcodes: true }));
    
    try {
      const response = await fetch('/api/attom/zipcodes');
      if (response.ok) {
        const data = await response.json();
        setAttomPullDraft((prev) => ({
          ...prev,
          availableZipcodes: data.zipcodes || [],
          isLoadingZipcodes: false,
        }));
      } else {
        setAttomPullDraft((prev) => ({ ...prev, isLoadingZipcodes: false }));
      }
    } catch (error) {
      setAttomPullDraft((prev) => ({ ...prev, isLoadingZipcodes: false }));
    }
  };

  const handleAttomPull = async () => {
    setAttomPullDraft((prev) => ({ ...prev, isPulling: true, error: null, success: false }));

    const response = await fetch("/api/attom/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minScore: attomPullDraft.minScore,
        maxCount: attomPullDraft.maxCount,
        zipcodes: attomPullDraft.zipcodes ? attomPullDraft.zipcodes.split(',').map(z => z.trim()).filter(Boolean) : undefined,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setAttomPullDraft((prev) => ({
        ...prev,
        isPulling: false,
        error: body?.error ?? "Could not pull leads from Attom. Please try again.",
      }));
      return;
    }

    const result = await response.json();
    setAttomPullDraft((prev) => ({ ...prev, isPulling: false, error: null, success: true, result }));
    
    // Reload page after 2 seconds on success
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };


  // Get active call lead data
  const activeCallLead = activeCallLeadId ? leads.find(l => l.id === activeCallLeadId) : null;
  const activeCallProperty = activeCallLead?.properties?.[0];

  // Debug logging
  console.log('[Workspace Debug]', {
    isConnected,
    callStatus,
    activeCallLeadId,
    activeCallLead: activeCallLead ? 'found' : 'null',
    shouldShowWorkspace: (isConnected || callStatus === 'ringing') && !!activeCallLead
  });

  return (
    <section className="space-y-4">
      {/* Active Call Workspace Modal */}
      {(isConnected || callStatus === 'ringing') && activeCallLead && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
          <div className="w-full max-w-2xl rounded-[1.4rem] border-2 border-green-500 bg-white shadow-2xl">
            {/* Call Status Header */}
            <div className="border-b border-green-200 bg-green-50 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-3 w-3">
                    <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                  </div>
                  <span className="font-semibold text-green-900">Call in progress</span>
                  <span className="hidden text-sm text-green-700 sm:inline">{callStatus}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-initial ${
                      isMuted
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-white text-green-900 hover:bg-green-100"
                    }`}
                  >
                    {isMuted ? "🔇 Unmute" : "🔊 Mute"}
                  </button>
                  <button
                    type="button"
                    onClick={saveActiveCallNotes}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:flex-initial"
                  >
                    💾 Save
                  </button>
                  <button
                    type="button"
                    onClick={hangup}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 sm:flex-initial"
                  >
                    ☎️ Hang Up
                  </button>
                </div>
              </div>
            </div>

            {/* Lead Info & Workspace */}
            <div className="space-y-4 p-6">
              {/* Lead Name & Address */}
              <div>
                <h3 className="text-xl font-bold text-[var(--color-navy)]">
                  {activeCallLead.full_name || "Unknown"}
                </h3>
                {activeCallLead.street_address && (
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {activeCallLead.street_address}
                    {activeCallLead.city && `, ${activeCallLead.city}`}
                    {activeCallLead.state && `, ${activeCallLead.state}`}
                    {activeCallLead.postal_code && ` ${activeCallLead.postal_code}`}
                  </p>
                )}
              </div>


              {/* Notes Textarea */}
              <div>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">Call Notes</span>
                  <textarea
                    value={activeCallNotes}
                    onChange={(e) => setActiveCallNotes(e.target.value)}
                    rows={10}
                    placeholder="Take notes during the call..."
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none transition focus:border-[var(--color-primary-gold)] focus:ring-2 focus:ring-[var(--color-primary-gold)]/20"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-first View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* View Mode Tabs - Mobile First */}
        <div className="inline-flex w-full sm:w-auto rounded-lg border border-black/10 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-initial rounded-md px-4 py-2 text-sm font-semibold transition ${
              viewMode === 'list'
                ? 'bg-[var(--color-primary-gold)] text-[var(--color-navy)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
            }`}
          >
            📋 List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex-1 sm:flex-initial rounded-md px-4 py-2 text-sm font-semibold transition ${
              viewMode === 'map'
                ? 'bg-[var(--color-primary-gold)] text-[var(--color-navy)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
            }`}
          >
            🗺️ Map
          </button>
        </div>

        {/* Action Buttons - Stack on mobile */}
        <div className="flex flex-wrap gap-2">
          {canBulkImport && (
            <button
              type="button"
              onClick={openBulkImportModal}
              className="flex-1 sm:flex-initial rounded-lg bg-[var(--color-navy)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
            >
              <span className="hidden sm:inline">📊 Bulk Import</span>
              <span className="sm:hidden">📊 Import</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowExportCsv(true)}
            className="flex-1 sm:flex-initial rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
          >
            <span className="hidden sm:inline">📥 Export CSV</span>
            <span className="sm:hidden">📥 CSV</span>
          </button>
          <button
            type="button"
            onClick={openCreateLeadModal}
            className="flex-1 sm:flex-initial rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
          >
            <span className="hidden sm:inline">+ Create Lead</span>
            <span className="sm:hidden">+ Lead</span>
          </button>
          <button
            type="button"
            onClick={signOut}
            disabled={isSigningOut}
            className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSigningOut ? "..." : "Sign out"}
          </button>
        </div>

        {showExportCsv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="max-w-sm w-full rounded-lg border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
              <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
                Export Leads CSV
              </h3>
              <p className="mb-6 text-sm text-[var(--color-muted)]">
                Generating CSV with lead, contact, and property information. This may take a moment for large datasets.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportCsv(false);
                    window.location.href = "/api/admin/leads/export-csv";
                  }}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
                >
                  Generate and Download
                </button>
                <button
                  type="button"
                  onClick={() => setShowExportCsv(false)}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'list' && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-navy)]">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(event) => setShowDeleted(event.target.checked)}
              className="h-4 w-4 rounded border-black/20 text-[var(--color-primary-gold)] focus:ring-[var(--color-primary-gold)]"
            />
            Show deleted leads
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-muted)]">
              {visibleLeads.length} {visibleLeads.length === 1 ? "lead" : "leads"} total
              {visibleLeads.length > itemsPerPage && (
                <span className="ml-2">
                  (showing {startIndex + 1}-{Math.min(endIndex, visibleLeads.length)})
                </span>
              )}
            </span>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="font-semibold text-[var(--color-navy)]">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded border border-black/10 px-2 py-1 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <>
      <div className="rounded-[1.4rem] border border-black/6 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, email, phone, address..."
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Filter by Status
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              >
                <option value="all">All statuses</option>
                {leadStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Filter by Source
              </span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              >
                <option value="all">All sources</option>
                {uniqueSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Sort by
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "name" | "hot" | "source")}
                className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              >
                <option value="hot">🔥 Hot Leads First</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name (A-Z)</option>
                <option value="source">Source (A-Z)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hotLeadsOnly}
              onChange={(e) => setHotLeadsOnly(e.target.checked)}
              className="h-4 w-4 rounded border-black/20 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm font-semibold text-[var(--color-navy)]">
              🔥 Show Hot Leads Only
            </span>
          </label>
          <span className="text-xs text-[var(--color-muted)]">
            (Close in ≤30 days + Inherited/Foreclosure)
          </span>
        </div>

        {(searchQuery || statusFilter !== "all" || sourceFilter !== "all" || hotLeadsOnly) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]"
              >
                Search: {searchQuery}
                <span className="text-lg leading-none">×</span>
              </button>
            )}
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]"
              >
                Status: {statusFilter}
                <span className="text-lg leading-none">×</span>
              </button>
            )}
            {sourceFilter !== "all" && (
              <button
                type="button"
                onClick={() => setSourceFilter("all")}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]"
              >
                Source: {sourceFilter}
                <span className="text-lg leading-none">×</span>
              </button>
            )}
            {hotLeadsOnly && (
              <button
                type="button"
                onClick={() => setHotLeadsOnly(false)}
                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
              >
                🔥 Hot Leads Only
                <span className="text-lg leading-none">×</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setSourceFilter("all");
                setHotLeadsOnly(false);
              }}
              className="text-xs font-semibold text-[var(--color-muted)] underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {!hasVisibleLeads ? (
        <article className="rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 text-sm text-[var(--color-muted)] shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          {showDeleted
            ? "No deleted leads found."
            : "No active leads found. Enable “Show deleted leads” to view deleted entries."}
        </article>
      ) : (
        <>
          {paginatedLeads.map((lead) => {
          const draft = drafts[lead.id];
          if (!draft) {
            return null;
          }
          const isDeleted = Boolean(lead.deleted_at);

          return (
            <article
              key={lead.id}
              className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
            >
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-3 text-sm text-[var(--color-navy)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black tracking-tight">
                          {lead.full_name || "(No name)"}
                        </h2>
                        {lead.isHotLead && (
                          <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white" title="Hot Lead: Close in ≤30 days + Inherited/Foreclosure">
                            🔥 HOT
                          </span>
                        )}
                      </div>
                    </div>
                    {isDeleted && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700">
                        Deleted
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {lead.source_name && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                        <span>📍</span>
                        Source: {lead.source_name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-muted)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                      <span>📅</span>
                      Created: {new Date(lead.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Property Information */}
                  {lead.properties && lead.properties.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {lead.properties.slice(0, 1).map((property, idx) => (
                        <div key={property.id} className="space-y-3">
                          {/* Contact Section */}
                          <div className="rounded-xl border border-black/10 bg-white">
                            <button
                              type="button"
                              onClick={() => updateDraft(lead.id, { showContactInfo: !draft.showContactInfo })}
                              className="w-full border-b border-black/10 bg-[var(--color-surface-soft)] px-4 py-3 text-left transition hover:bg-black/5 flex items-center justify-between"
                            >
                              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                                Contact Information
                              </h3>
                              <span className="text-xs text-[var(--color-accent)]">
                                {draft.showContactInfo ? '▲' : '▼'}
                              </span>
                            </button>
                            {draft.showContactInfo && (
                            <div className="grid gap-3 p-4 text-sm">
                              {lead.email && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Email</span>
                                  <a href={`mailto:${lead.email}`} className="mt-1 block font-medium text-[var(--color-primary-gold)] hover:underline">
                                    {lead.email}
                                  </a>
                                </div>
                              )}
                              {property.email2 && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Email 2</span>
                                  <a href={`mailto:${property.email2}`} className="mt-1 block font-medium text-[var(--color-primary-gold)] hover:underline">
                                    {property.email2}
                                  </a>
                                </div>
                              )}
                              <PhoneNumbersList
                                leadId={lead.id}
                                phones={lead.phones || []}
                                onUpdate={() => window.location.reload()}
                                onCall={(phoneId, phoneNumber) => callLeadPhone(lead.id, phoneId)}
                                isCalling={draft.isCalling}
                              />
                              {property.owner2_first_name && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Owner 2</span>
                                  <p className="mt-1 font-medium">
                                    {property.owner2_first_name} {property.owner2_last_name}
                                  </p>
                                </div>
                              )}
                              {property.street_address && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Property Address</span>
                                  <p className="mt-1 font-medium">
                                    {property.street_address}
                                    {property.city && `, ${property.city}`}
                                    {property.state && `, ${property.state}`}
                                    {property.postal_code && ` ${property.postal_code}`}
                                  </p>
                                </div>
                              )}
                            </div>
                            )}
                          </div>

                          {/* Property Details Section */}
                          <div className="rounded-xl border border-black/10 bg-white">
                            <button
                              type="button"
                              onClick={() => updateDraft(lead.id, { showPropertyDetails: !draft.showPropertyDetails })}
                              className="w-full border-b border-black/10 bg-[var(--color-surface-soft)] px-4 py-3 text-left transition hover:bg-black/5 flex items-center justify-between"
                            >
                              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                                Property Details
                              </h3>
                              <span className="text-xs text-[var(--color-accent)]">
                                {draft.showPropertyDetails ? '▲' : '▼'}
                              </span>
                            </button>
                            {draft.showPropertyDetails && (
                            <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
                              <div>
                                <span className="text-xs font-semibold text-[var(--color-muted)]">Address</span>
                                <p className="mt-1 font-medium">{property.street_address}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-[var(--color-muted)]">City</span>
                                <p className="mt-1 font-medium">{property.city}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-[var(--color-muted)]">State</span>
                                <p className="mt-1 font-medium">{property.state}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-[var(--color-muted)]">Zip</span>
                                <p className="mt-1 font-medium">{property.postal_code}</p>
                              </div>
                              {property.county && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">County</span>
                                  <p className="mt-1 font-medium">{property.county}</p>
                                </div>
                              )}
                              {property.apn && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">APN</span>
                                  <p className="mt-1 font-medium">{property.apn}</p>
                                </div>
                              )}
                              {property.parcel_count !== null && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Parcel Count</span>
                                  <p className="mt-1 font-medium">{property.parcel_count}</p>
                                </div>
                              )}
                              {property.property_type_detail && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Property Type</span>
                                  <p className="mt-1 font-medium">{property.property_type_detail}</p>
                                </div>
                              )}
                              {property.bedroom_count !== null && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Bedrooms</span>
                                  <p className="mt-1 font-medium">{property.bedroom_count}</p>
                                </div>
                              )}
                              {property.bathroom_count !== null && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Bathrooms</span>
                                  <p className="mt-1 font-medium">{property.bathroom_count}</p>
                                </div>
                              )}
                              {property.total_building_area_sqft && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Building Sq Ft</span>
                                  <p className="mt-1 font-medium">{property.total_building_area_sqft.toLocaleString()}</p>
                                </div>
                              )}
                              {property.lot_size_sqft && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Lot Sq Ft</span>
                                  <p className="mt-1 font-medium">{property.lot_size_sqft.toLocaleString()}</p>
                                </div>
                              )}
                              {property.year_built && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Year Built</span>
                                  <p className="mt-1 font-medium">{property.year_built}</p>
                                </div>
                              )}
                              {property.zoning_code && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Zoning</span>
                                  <p className="mt-1 font-medium">{property.zoning_code}</p>
                                </div>
                              )}
                              {property.owner_occupied !== null && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Owner Occupied</span>
                                  <p className="mt-1 font-medium">{property.owner_occupied ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {property.is_vacant !== null && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Vacant</span>
                                  <p className="mt-1 font-medium">{property.is_vacant ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {property.self_managed !== null && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Self Managed</span>
                                  <p className="mt-1 font-medium">{property.self_managed ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {property.opt_out !== null && (
                                <div>
                                  <span className="text-xs font-semibold text-[var(--color-muted)]">Opt-Out</span>
                                  <p className="mt-1 font-medium">{property.opt_out ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                            </div>
                            )}
                          </div>

                          {/* Financial Section */}
                          <div className="rounded-xl border border-black/10 bg-white">
                            <button
                              type="button"
                              onClick={() => updateDraft(lead.id, { showFinancial: !draft.showFinancial })}
                              className="w-full border-b border-black/10 bg-[var(--color-surface-soft)] px-4 py-3 text-left transition hover:bg-black/5 flex items-center justify-between"
                            >
                              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                                Financial Information
                              </h3>
                              <span className="text-xs text-[var(--color-accent)]">
                                {draft.showFinancial ? '▲' : '▼'}
                              </span>
                            </button>
                            {draft.showFinancial && (
                            <div className="space-y-4 p-4">
                              {/* Property Financial Summary */}
                              <div className="grid gap-3 text-sm sm:grid-cols-2">
                                {property.total_assessed_value && (
                                  <div>
                                    <span className="text-xs font-semibold text-[var(--color-muted)]">Assessed Value</span>
                                    <p className="mt-1 font-medium">${property.total_assessed_value.toLocaleString()}</p>
                                  </div>
                                )}
                                {property.estimated_value && (
                                  <div>
                                    <span className="text-xs font-semibold text-[var(--color-muted)]">Estimated Value</span>
                                    <p className="mt-1 font-medium">${property.estimated_value.toLocaleString()}</p>
                                  </div>
                                )}
                                {property.last_sale_date && (
                                  <div>
                                    <span className="text-xs font-semibold text-[var(--color-muted)]">Last Sale Date</span>
                                    <p className="mt-1 font-medium">{new Date(property.last_sale_date).toLocaleDateString()}</p>
                                  </div>
                                )}
                                {property.last_sale_price && (
                                  <div>
                                    <span className="text-xs font-semibold text-[var(--color-muted)]">Last Sale Price</span>
                                    <p className="mt-1 font-medium">${property.last_sale_price.toLocaleString()}</p>
                                  </div>
                                )}
                                {property.total_loan_balance && (
                                  <div>
                                    <span className="text-xs font-semibold text-[var(--color-muted)]">Loan Balance</span>
                                    <p className="mt-1 font-medium">${property.total_loan_balance.toLocaleString()}</p>
                                  </div>
                                )}
                                {property.equity_current_estimated_balance && (
                                  <div>
                                    <span className="text-xs font-semibold text-[var(--color-muted)]">Equity</span>
                                    <p className="mt-1 font-medium">${property.equity_current_estimated_balance.toLocaleString()}</p>
                                  </div>
                                )}
                                {property.ltv_current_estimated_combined !== null && (
                                  <div>
                                    <span className="text-xs font-semibold text-[var(--color-muted)]">LTV %</span>
                                    <p className="mt-1 font-medium">{property.ltv_current_estimated_combined}%</p>
                                  </div>
                                )}
                                {property.mls_status && (
                                  <div>
                                    <span className="text-xs font-semibold text-[var(--color-muted)]">MLS Status</span>
                                    <p className="mt-1 font-medium">{property.mls_status}</p>
                                  </div>
                                )}
                              </div>

                              {/* Novation Calculator */}
                              <div className="border-t border-black/10 pt-4">
                                <NovationCalculator
                                  initialValues={{
                                    as_is_market_value: property.as_is_market_value || 0,
                                    percent_of_market_value: property.percent_of_market_value || 95,
                                    realtor_fee_percent: property.realtor_fee_percent || 3,
                                    double_close_fee_percent: property.double_close_fee_percent || 0.75,
                                    closing_attorney_fee: property.closing_attorney_fee || 500,
                                    title_insurance: property.title_insurance || 500,
                                    efile_fee: property.efile_fee || 100,
                                    recording_fee: property.recording_fee || 100,
                                    transfer_tax: property.transfer_tax || 0,
                                    flat_fee_listing: property.flat_fee_listing || 400,
                                    photographer_fee: property.photographer_fee || 150,
                                    other_expenses: property.other_expenses || 0,
                                    repair_costs: property.repair_costs || 0,
                                    interest_costs: property.interest_costs || 0,
                                    months_held: property.months_held || 6,
                                    desired_profit_access: property.desired_profit_access || 30000,
                                    desired_profit_no_access: property.desired_profit_no_access || 35000,
                                  }}
                                  onSave={async (values: NovationFormData) => {
                                    const response = await fetch(`/api/admin/properties/${property.id}/novation`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(values),
                                    });
                                    
                                    if (!response.ok) {
                                      const error = await response.json().catch(() => ({ error: 'Failed to save' }));
                                      throw new Error(error.error || 'Failed to save novation data');
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            )}
                          </div>

                          {/* Foreclosure Section - Only show if has foreclosure data */}
                          {(property.foreclosure_status || property.foreclosure_document_type || property.foreclosure_auction_date || property.foreclosure_loan_default_date) && (
                            <div className="rounded-xl border border-red-200 bg-red-50">
                              <button
                                type="button"
                                onClick={() => updateDraft(lead.id, { showForeclosure: !draft.showForeclosure })}
                                className="w-full border-b border-red-200 bg-red-100 px-4 py-3 text-left transition hover:bg-red-200 flex items-center justify-between"
                              >
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-red-900">
                                  ⚠️ Foreclosure Information
                                </h3>
                                <span className="text-xs text-red-900">
                                  {draft.showForeclosure ? '▲' : '▼'}
                                </span>
                              </button>
                              {draft.showForeclosure && (
                              <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
                                {property.foreclosure_status && (
                                  <div>
                                    <span className="text-xs font-semibold text-red-700">Status</span>
                                    <p className="mt-1 font-medium text-red-900">{property.foreclosure_status}</p>
                                  </div>
                                )}
                                {property.foreclosure_document_type && (
                                  <div>
                                    <span className="text-xs font-semibold text-red-700">Document Type</span>
                                    <p className="mt-1 font-medium text-red-900">{property.foreclosure_document_type}</p>
                                  </div>
                                )}
                                {property.foreclosure_auction_date && (
                                  <div>
                                    <span className="text-xs font-semibold text-red-700">Auction Date</span>
                                    <p className="mt-1 font-medium text-red-900">{new Date(property.foreclosure_auction_date).toLocaleDateString()}</p>
                                  </div>
                                )}
                                {property.foreclosure_loan_default_date && (
                                  <div>
                                    <span className="text-xs font-semibold text-red-700">Default Date</span>
                                    <p className="mt-1 font-medium text-red-900">{new Date(property.foreclosure_loan_default_date).toLocaleDateString()}</p>
                                  </div>
                                )}
                              </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Show "View More Properties" if there are additional properties */}
                      {lead.properties.length > 1 && (
                        <div className="rounded-lg border border-black/10 bg-[var(--color-accent)]/5 px-4 py-3 text-center">
                          <p className="text-sm font-semibold text-[var(--color-accent)]">
                            + {lead.properties.length - 1} more {lead.properties.length - 1 === 1 ? 'property' : 'properties'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Display all answered questions */}
                  {leadAnswers[lead.id] && leadAnswers[lead.id].length > 0 && (
                    <div className="rounded-xl border border-black/10 bg-[var(--color-surface-soft)]">
                      <button
                        type="button"
                        onClick={() => updateDraft(lead.id, { showQuestions: !draft.showQuestions })}
                        className="w-full flex items-center justify-between p-4 text-left transition hover:bg-black/5"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                          Answered Questions ({leadAnswers[lead.id].length})
                        </p>
                        <span className="text-xs text-[var(--color-accent)]">
                          {draft.showQuestions ? "▲" : "▼"}
                        </span>
                      </button>
                      {draft.showQuestions && (
                        <div className="space-y-2.5 border-t border-black/10 p-4">
                          {leadAnswers[lead.id].map((answer) => (
                            <div key={answer.id} className="border-l-2 border-[var(--color-primary-gold)] pl-3 py-1">
                              <p className="text-xs font-semibold text-[var(--color-muted)]">
                                {answer.question_text}
                              </p>
                              <p className="mt-0.5 text-sm font-medium text-[var(--color-navy)]">
                                {answer.answer_value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>

                <div className="space-y-3 rounded-xl border border-black/8 bg-[var(--color-surface-soft)] p-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Status
                  </span>
                  <select
                    value={draft.status}
                    disabled={isDeleted}
                    onChange={(event) =>
                      updateDraft(lead.id, { status: event.target.value as LeadStatus })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Owner notes
                  </span>
                  <textarea
                    value={draft.ownerNotes}
                    disabled={isDeleted}
                    onChange={(event) =>
                      updateDraft(lead.id, { ownerNotes: event.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                      }
                    }}
                    rows={5}
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  />
                </label>

                {draft.error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <p className="font-semibold">{draft.error}</p>
                    {(draft.error.includes('Microphone') || draft.error.includes('permission')) && (
                      <p className="mt-2 text-xs">
                        <a 
                          href="/docs/MICROPHONE_PERMISSIONS.md" 
                          target="_blank"
                          className="underline hover:text-red-900"
                        >
                          See microphone setup guide →
                        </a>
                      </p>
                    )}
                  </div>
                ) : null}
                {draft.callMessage ? (
                  <p className="text-sm text-emerald-700">{draft.callMessage}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">                  <button
                    type="button"
                    onClick={() => saveLead(lead.id)}
                    disabled={isDeleted || draft.isSaving || draft.isCalling || draft.isRemoving}
                    className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary-gold)] px-4 py-2.5 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 min-h-[44px]"
                  >
                    {draft.isSaving ? "Saving..." : "Save"}
                  </button>
                  <div className="relative flex-1 sm:flex-initial">
                    <button
                      type="button"
                      onClick={() => toggleContactMenu(lead.id)}
                      disabled={isDeleted || draft.isSaving || draft.isCalling || draft.isRemoving}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-black/12 px-4 py-2.5 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45 min-h-[44px]"
                    >
                      {draft.isCalling ? "Calling..." : "Contact"}
                      <span className="text-xs">{draft.showContactMenu ? "▲" : "▼"}</span>
                    </button>
                    {draft.showContactMenu && !isDeleted && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => updateDraft(lead.id, { showContactMenu: false })}
                        />
                        <div className="absolute left-0 right-0 sm:left-0 sm:right-auto top-full z-30 mt-1 sm:min-w-[240px] overflow-hidden rounded-lg border border-black/12 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.15)]">
                          <button
                            type="button"
                            onClick={() => callLead(lead.id)}
                            className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 flex items-center gap-3 min-h-[52px]"
                          >
                            <span className="text-xl sm:text-base">📞</span>
                            <span>Call</span>
                          </button>
                          {(lead.smsEligiblePhones && lead.smsEligiblePhones.length > 0) ? (
                            <button
                              type="button"
                              onClick={() => {
                                const phone = lead.smsEligiblePhones[0];
                                window.location.href = `/admin/comms?replyTo=${encodeURIComponent(phone)}&leadId=${lead.id}`;
                              }}
                              className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 flex items-center gap-3 min-h-[52px]"
                              title={`SMS available — ${lead.smsEligiblePhones.length} number(s) have texted in`}
                            >
                              <span className="text-xl sm:text-base">💬</span>
                              <span>SMS</span>
                              {lead.smsEligiblePhones.length > 1 && (
                                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  {lead.smsEligiblePhones.length} numbers
                                </span>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-muted)] cursor-not-allowed opacity-50 flex items-center gap-3 min-h-[52px]"
                              title="SMS unavailable — this lead hasn't texted in yet"
                            >
                              <span className="text-xl sm:text-base">💬</span>
                              <span>SMS</span>
                              <span className="text-xs text-red-500 ml-auto">Not available</span>
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={() => openEmailModal(lead.id)}
                          className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 flex items-center gap-3 min-h-[52px]"
                        >
                          <span className="text-xl sm:text-base">✉️</span>
                          <span>Email</span>
                        </button>
                          <button
                            type="button"
                            onClick={() => openAppointmentModal(lead.id)}
                            className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 flex items-center gap-3 min-h-[52px] border-t border-black/6"
                          >
                            <span className="text-xl sm:text-base">📅</span>
                            <span>Schedule Appointment</span>
                          </button>
                          {formsEnabled && (lead.status === 'under-contract' || lead.status === 'closed') && (
                            <button
                              type="button"
                              onClick={() => window.location.href = `/admin/forms?leadId=${lead.id}`}
                              className="w-full px-5 py-3.5 text-left text-base sm:text-sm font-semibold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10 flex items-center gap-3 min-h-[52px] border-t border-black/6"
                            >
                              <span className="text-xl sm:text-base">📄</span>
                              <span>Create Purchase Agreement</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLead(lead.id)}
                    disabled={isDeleted || draft.isRemoving || draft.isSaving || draft.isCalling}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 min-h-[44px]"
                  >
                    {isDeleted ? "Deleted" : draft.isRemoving ? "Deleting..." : "Delete Lead"}
                  </button>
                </div>

                {/* Mini Map Preview */}
                {lead.properties && lead.properties.length > 0 && lead.properties[0].latitude && lead.properties[0].longitude && (
                  <div className="mt-4 overflow-hidden rounded-lg border border-black/10">
                      <LeadsMap
                        properties={[{
                          ...lead.properties[0],
                          lead: {
                            id: lead.id,
                            full_name: lead.full_name || '',
                            email: lead.email,
                            phone: lead.phone,
                            status: lead.status,
                            priority_score: null,
                          }
                        }]}
                        onPropertyClick={() => {}}
                        zoom={15}
                        height="200px"
                      />
                  </div>
                )}
              </div>
            </div>
          </article>
          );
        })}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Previous
              </button>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => {
                  const isEdgePage = page === 1 || page === totalPages;
                  const isNearbyPage = Math.abs(page - currentPage) <= 1;
                  const shouldShow = isEdgePage || isNearbyPage;

                  if (!shouldShow) {
                    const shouldShowEllipsis =
                      page === currentPage - 2 || page === currentPage + 2;

                    return shouldShowEllipsis ? (
                      <span
                        key={`ellipsis-${page}`}
                        className="px-1 text-sm text-[var(--color-muted)]"
                      >
                        …
                      </span>
                    ) : null;
                  }

                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      aria-current={page === currentPage ? "page" : undefined}
                      className={
                        page === currentPage
                          ? "min-w-[2.5rem] rounded-lg bg-[var(--color-primary-gold)] px-3 py-2 text-sm font-bold text-[var(--color-navy)]"
                          : "min-w-[2.5rem] rounded-lg border border-black/12 px-3 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
                      }
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((previous) => Math.min(totalPages, previous + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showEmailModal && emailingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
              Compose Email
            </h3>

            {(() => {
              const lead = leads.find((l) => l.id === emailingLeadId);
              if (!lead) return null;
              return (
                <div className="mb-4 rounded-lg bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-navy)]">
                  <p className="font-bold">{lead.full_name || "(No name)"}</p>
                  <p className="text-[var(--color-muted)]">{lead.email || "(No email)"}</p>
                </div>
              );
            })()}

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Subject
                </span>
                <input
                  type="text"
                  value={emailDraft.subject}
                  onChange={(e) =>
                    setEmailDraft({ ...emailDraft, subject: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Email subject"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Message
                </span>
                <textarea
                  value={emailDraft.message}
                  onChange={(e) =>
                    setEmailDraft({ ...emailDraft, message: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  rows={12}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Type your message here..."
                />
              </label>

              {emailDraft.error && (
                <p className="text-sm text-red-700">{emailDraft.error}</p>
              )}
              {emailDraft.success && (
                <p className="text-sm text-emerald-700">✓ Email sent successfully!</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={sendEmail}
                  disabled={emailDraft.isSending || !emailDraft.message.trim() || emailDraft.success}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {emailDraft.isSending ? "Sending..." : emailDraft.success ? "Sent!" : "Send Email"}
                </button>
                <button
                  type="button"
                  onClick={closeEmailModal}
                  disabled={emailDraft.isSending}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {emailDraft.success ? "Close" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAppointmentModal && schedulingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
              Schedule Appointment
            </h3>

            {(() => {
              const lead = leads.find((l) => l.id === schedulingLeadId);
              if (!lead) return null;
              const address = [lead.street_address, lead.city, lead.state].filter(Boolean).join(", ");
              return (
                <div className="mb-4 rounded-lg bg-[var(--color-surface-soft)] p-3 text-sm text-[var(--color-navy)]">
                  <p className="font-bold">{lead.full_name || "(No name)"}</p>
                  {address && (
                    <p className="text-[var(--color-muted)]">{address}</p>
                  )}
                </div>
              );
            })()}

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Title
                </span>
                <input
                  type="text"
                  value={appointmentDraft.title}
                  onChange={(e) =>
                    setAppointmentDraft({ ...appointmentDraft, title: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Property visit, Follow-up call, etc."
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Description
                </span>
                <textarea
                  value={appointmentDraft.description}
                  onChange={(e) =>
                    setAppointmentDraft({ ...appointmentDraft, description: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Additional notes..."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Start Time
                  </span>
                  <input
                    type="datetime-local"
                    value={appointmentDraft.startTime}
                    onChange={(e) =>
                      setAppointmentDraft({
                        ...appointmentDraft,
                        startTime: e.target.value,
                        endTime: getDefaultEndTime(e.target.value),
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    End Time
                  </span>
                  <input
                    type="datetime-local"
                    value={appointmentDraft.endTime}
                    onChange={(e) =>
                      setAppointmentDraft({ ...appointmentDraft, endTime: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Location
                </span>
                <input
                  type="text"
                  value={appointmentDraft.location}
                  onChange={(e) =>
                    setAppointmentDraft({ ...appointmentDraft, location: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Property address, office, phone, etc."
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Status
                </span>
                <select
                  value={appointmentDraft.status}
                  onChange={(e) =>
                    setAppointmentDraft({
                      ...appointmentDraft,
                      status: e.target.value as AppointmentStatus,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                >
                  {appointmentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              {appointmentDraft.error && (
                <p className="text-sm text-red-700">{appointmentDraft.error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveAppointment}
                  disabled={appointmentDraft.isSaving || !appointmentDraft.title}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {appointmentDraft.isSaving ? "Saving..." : "Create Appointment"}
                </button>
                <button
                  type="button"
                  onClick={closeAppointmentModal}
                  disabled={appointmentDraft.isSaving}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
              Create Lead Manually
            </h3>

            <p className="mb-4 text-sm text-[var(--color-muted)]">
              At least one contact method (phone or email) is required.
            </p>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Source
                </span>
                <select
                  value={createLeadDraft.sourceName}
                  onChange={(e) =>
                    setCreateLeadDraft({ ...createLeadDraft, sourceName: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                >
                  {allActiveSources.length > 0 ? (
                    allActiveSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))
                  ) : (
                    <option value="manual">manual</option>
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Full Name
                </span>
                <input
                  type="text"
                  value={createLeadDraft.fullName}
                  onChange={(e) =>
                    setCreateLeadDraft({ ...createLeadDraft, fullName: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="John Doe"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Email
                  </span>
                  <input
                    type="email"
                    value={createLeadDraft.email}
                    onChange={(e) =>
                      setCreateLeadDraft({ ...createLeadDraft, email: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                    placeholder="john@example.com"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Phone
                  </span>
                  <input
                    type="tel"
                    value={createLeadDraft.phone}
                    onChange={(e) =>
                      setCreateLeadDraft({ ...createLeadDraft, phone: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                    placeholder="(555) 123-4567"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Street Address
                </span>
                <input
                  type="text"
                  value={createLeadDraft.streetAddress}
                  onChange={(e) =>
                    setCreateLeadDraft({ ...createLeadDraft, streetAddress: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="123 Main St"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    City
                  </span>
                  <input
                    type="text"
                    value={createLeadDraft.city}
                    onChange={(e) =>
                      setCreateLeadDraft({ ...createLeadDraft, city: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                    placeholder="City"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    State
                  </span>
                  <input
                    type="text"
                    value={createLeadDraft.state}
                    onChange={(e) =>
                      setCreateLeadDraft({ ...createLeadDraft, state: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                    placeholder="CA"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Postal Code
                  </span>
                  <input
                    type="text"
                    value={createLeadDraft.postalCode}
                    onChange={(e) =>
                      setCreateLeadDraft({ ...createLeadDraft, postalCode: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                    placeholder="12345"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Owner Notes
                </span>
                <textarea
                  value={createLeadDraft.ownerNotes}
                  onChange={(e) =>
                    setCreateLeadDraft({ ...createLeadDraft, ownerNotes: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  placeholder="Any notes about this lead..."
                />
              </label>

              {createLeadDraft.error && (
                <p className="text-sm text-red-700">{createLeadDraft.error}</p>
              )}
              {createLeadDraft.success && (
                <p className="text-sm text-emerald-700">✓ Lead created successfully!</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={createManualLead}
                  disabled={createLeadDraft.isCreating || createLeadDraft.success}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {createLeadDraft.isCreating ? "Creating..." : createLeadDraft.success ? "Created!" : "Create Lead"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateLeadModal}
                  disabled={createLeadDraft.isCreating}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {createLeadDraft.success ? "Close" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <h3 className="mb-4 text-xl font-black text-[var(--color-navy)]">
              {bulkImportStep === 'choose' ? 'Bulk Import Leads' : bulkImportStep === 'upload' ? 'Import from CSV' : bulkImportStep === 'skiptrace' ? 'BatchLeads Skip Trace' : 'Pull from Attom API'}
            </h3>

            {bulkImportStep === 'choose' && (
              <>
                <p className="mb-4 text-sm text-[var(--color-muted)]">
                  Choose how you want to import leads:
                </p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setBulkImportStep('upload')}
                    className="w-full rounded-lg border-2 border-black/10 p-5 text-left transition hover:border-[var(--color-primary-gold)] hover:bg-[var(--color-surface-soft)]"
                  >
                    <div className="mb-2 text-2xl">📊</div>
                    <h4 className="font-bold text-[var(--color-navy)]">Upload CSV / Excel File</h4>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Import leads from a BatchLeads CSV or Excel file
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkImportStep('skiptrace')}
                    className="w-full rounded-lg border-2 border-black/10 p-5 text-left transition hover:border-[var(--color-primary-gold)] hover:bg-[var(--color-surface-soft)]"
                  >
                    <div className="mb-2 text-2xl">🔎</div>
                    <h4 className="font-bold text-[var(--color-navy)]">BatchLeads Skip Trace (enrich existing)</h4>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Match a skip-trace report to existing properties by state + county + APN and add phone/email contact data. Does not create new leads.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkImportStep('pull')}
                    className="w-full rounded-lg border-2 border-black/10 p-5 text-left transition hover:border-[var(--color-primary-gold)] hover:bg-[var(--color-surface-soft)]"
                  >
                    <div className="mb-2 text-2xl">🏘️</div>
                    <h4 className="font-bold text-[var(--color-navy)]">Pull New Data from Attom API</h4>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Convert high-scoring properties from Attom database to leads
                    </p>
                  </button>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={closeBulkImportModal}
                    className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {bulkImportStep === 'pull' && (
              <>
                <p className="mb-4 text-sm text-[var(--color-muted)]">
                  Convert Attom properties to leads based on their scoring. Properties are scored based on factors like absentee ownership, equity percentage, and property age.
                </p>

                <div className="space-y-4">
                  {attomPullDraft.availableZipcodes.length === 0 && !attomPullDraft.isLoadingZipcodes && (
                    <button
                      type="button"
                      onClick={loadAvailableZipcodes}
                      className="text-sm text-[var(--color-primary-gold)] hover:underline font-semibold"
                    >
                      → Show available zipcodes in database
                    </button>
                  )}
                  {attomPullDraft.isLoadingZipcodes && (
                    <p className="text-sm text-[var(--color-muted)]">Loading zipcodes...</p>
                  )}
                  {attomPullDraft.availableZipcodes.length > 0 && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm">
                      <p className="font-semibold text-[var(--color-navy)] mb-2">Available zipcodes ({attomPullDraft.availableZipcodes.length}):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {attomPullDraft.availableZipcodes.map((zip) => (
                          <button
                            key={zip}
                            type="button"
                            onClick={() => {
                              const current = attomPullDraft.zipcodes.split(',').map(z => z.trim()).filter(Boolean);
                              if (current.includes(zip)) {
                                setAttomPullDraft({ 
                                  ...attomPullDraft, 
                                  zipcodes: current.filter(z => z !== zip).join(', ') 
                                });
                              } else {
                                setAttomPullDraft({ 
                                  ...attomPullDraft, 
                                  zipcodes: [...current, zip].join(', ') 
                                });
                              }
                            }}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                              attomPullDraft.zipcodes.split(',').map(z => z.trim()).includes(zip)
                                ? 'bg-[var(--color-primary-gold)] text-[var(--color-navy)]'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[var(--color-primary-gold)]'
                            }`}
                          >
                            {zip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                      Zipcodes (Optional)
                    </span>
                    <input
                      type="text"
                      value={attomPullDraft.zipcodes}
                      onChange={(e) =>
                        setAttomPullDraft({ ...attomPullDraft, zipcodes: e.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                      placeholder="90210, 90211, 90212"
                    />
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Filter by specific zipcodes from your imported properties. Leave blank to include all zipcodes.
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                      Minimum Score (0-100)
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={attomPullDraft.minScore}
                      onChange={(e) =>
                        setAttomPullDraft({ ...attomPullDraft, minScore: parseInt(e.target.value) || 0 })
                      }
                      className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                      placeholder="70"
                    />
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Only convert properties with a score of {attomPullDraft.minScore} or higher
                    </p>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                      Maximum Count
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={attomPullDraft.maxCount}
                      onChange={(e) =>
                        setAttomPullDraft({ ...attomPullDraft, maxCount: parseInt(e.target.value) || 1 })
                      }
                      className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                      placeholder="50"
                    />
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Maximum number of properties to convert to leads
                    </p>
                  </label>

                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                    <p className="font-semibold mb-1">What happens during pull:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Searches for properties not yet converted to leads</li>
                      {attomPullDraft.zipcodes && <li>Filters by zipcodes: {attomPullDraft.zipcodes}</li>}
                      <li>Filters by minimum score ({attomPullDraft.minScore}+)</li>
                      <li>Converts up to {attomPullDraft.maxCount} highest-scoring properties</li>
                      <li>Creates lead records with owner info and property details</li>
                    </ul>
                  </div>

                  {attomPullDraft.error && (
                    <p className="text-sm text-red-700">{attomPullDraft.error}</p>
                  )}
                  {attomPullDraft.success && attomPullDraft.result && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                      <p className="font-semibold">✓ Pull successful!</p>
                      <p className="mt-2 text-xs">
                        Converted {attomPullDraft.result.converted} properties to leads
                      </p>
                      <p className="mt-1 text-xs">Reloading page...</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAttomPull}
                      disabled={attomPullDraft.isPulling || attomPullDraft.success}
                      className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {attomPullDraft.isPulling ? "Pulling..." : attomPullDraft.success ? "Pulled!" : "Pull Leads"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkImportStep('choose')}
                      disabled={attomPullDraft.isPulling}
                      className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {attomPullDraft.success ? "Close" : "Back"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {bulkImportStep === 'upload' && (
              <>
                <p className="mb-4 text-sm text-[var(--color-muted)]">
                  Upload a CSV or Excel file from BatchLeads. The file should include columns like Lead Status, First Name, Last Name, Property Address, Email, Phone, etc.
                </p>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  CSV or Excel File
                </span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    // Auto-populate campaign name from filename (remove extension)
                    const campaignName = file ? file.name.replace(/\.[^/.]+$/, '') : "";
                    setBulkImportDraft({ ...bulkImportDraft, file, campaignName, error: null });
                  }}
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
                {bulkImportDraft.file && (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Selected: {bulkImportDraft.file.name} ({(bulkImportDraft.file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkImportDraft.createLeads}
                  onChange={(e) =>
                    setBulkImportDraft({ ...bulkImportDraft, createLeads: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-black/20 text-[var(--color-primary-gold)] focus:ring-[var(--color-primary-gold)]"
                />
                <span className="text-sm font-semibold text-[var(--color-navy)]">
                  Also create leads in the leads table (recommended)
                </span>
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={bulkImportDraft.createCampaign}
                  onChange={(e) =>
                    setBulkImportDraft({ ...bulkImportDraft, createCampaign: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-black/20 text-[var(--color-primary-gold)] focus:ring-[var(--color-primary-gold)]"
                />
                <span className="text-sm font-semibold text-[var(--color-navy)]">
                  Automatically create a dialer campaign from these leads
                </span>
              </label>

              {bulkImportDraft.createCampaign && (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Campaign Name
                  </span>
                  <input
                    type="text"
                    value={bulkImportDraft.campaignName}
                    onChange={(e) =>
                      setBulkImportDraft({ ...bulkImportDraft, campaignName: e.target.value })
                    }
                    placeholder="Enter campaign name"
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                  />
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Campaign will include all imported leads from the batch-leads source
                  </p>
                </label>
              )}

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                <p className="font-semibold mb-1">What happens during import:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All data is saved to the <code>batchleads</code> table</li>
                  {bulkImportDraft.createLeads && (
                    <>
                      <li>Essential fields are mapped to create entries in the <code>leads</code> table</li>
                      <li>A mapping record links each batch lead to its corresponding lead</li>
                    </>
                  )}
                  <li>You can access all raw data from the batchleads table later</li>
                </ul>
              </div>

              {bulkImportDraft.error && (
                <p className="text-sm text-red-700">{bulkImportDraft.error}</p>
              )}
              {bulkImportDraft.success && bulkImportDraft.result && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                    <p className="font-semibold">✓ Import successful!</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>Total rows in file: {bulkImportDraft.result.totalRows}</li>
                      <li>Batch leads imported: {bulkImportDraft.result.batchLeadsImported}</li>
                      {bulkImportDraft.createLeads && (
                        <>
                          <li>Leads created: {bulkImportDraft.result.leadsCreated}</li>
                          <li>Mappings created: {bulkImportDraft.result.mappingsCreated}</li>
                        </>
                      )}
                      {bulkImportDraft.result.campaignId && bulkImportDraft.result.campaignName && (
                        <li className="font-semibold">Campaign created: {bulkImportDraft.result.campaignName}</li>
                      )}
                      <li className="font-semibold">Skipped: {bulkImportDraft.result.skipped}</li>
                    </ul>
                    <p className="mt-2 text-xs">Reloading page...</p>
                  </div>
                  
                  {bulkImportDraft.result.skippedRows && bulkImportDraft.result.skippedRows.length > 0 && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                      <p className="font-semibold mb-2">Skipped Rows ({bulkImportDraft.result.skippedRows.length}):</p>
                      <div className="max-h-40 overflow-y-auto space-y-1.5">
                        {bulkImportDraft.result.skippedRows.slice(0, 20).map((skip, idx) => (
                          <div key={idx} className="text-xs border-l-2 border-yellow-400 pl-2 py-0.5">
                            <span className="font-semibold">{skip.reason}</span>
                            {skip.data && <span className="text-yellow-700"> - {skip.data}</span>}
                          </div>
                        ))}
                        {bulkImportDraft.result.skippedRows.length > 20 && (
                          <p className="text-xs italic pt-1">...and {bulkImportDraft.result.skippedRows.length - 20} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={bulkImportDraft.isUploading || !bulkImportDraft.file || bulkImportDraft.success}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {bulkImportDraft.isUploading ? "Importing..." : bulkImportDraft.success ? "Imported!" : "Import Leads"}
                </button>
                <button
                  type="button"
                  onClick={closeBulkImportModal}
                  disabled={bulkImportDraft.isUploading}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {bulkImportDraft.success ? "Close" : "Cancel"}
                </button>
               </div>
             </div>
               </>
             )}

            {bulkImportStep === 'skiptrace' && (
              <>
                <p className="mb-4 text-sm text-[var(--color-muted)]">
                  Upload a BatchLeads skip-trace report. Each row is matched to an
                  existing property by <strong>state + county + APN</strong> and its
                  phone/email data is added. This never creates new leads or properties.
                </p>

                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".csv,.tsv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSkipTraceDraft((prev) => ({ ...prev, file, error: null, preview: null, result: null }));
                    }}
                    className="w-full rounded-lg border border-black/12 px-3 py-2 text-sm"
                  />
                  {skipTraceDraft.file && (
                    <p className="text-xs text-[var(--color-muted)]">
                      Selected: {skipTraceDraft.file.name} ({(skipTraceDraft.file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}

                  {skipTraceDraft.error && (
                    <p className="text-sm text-red-700">{skipTraceDraft.error}</p>
                  )}

                  {(skipTraceDraft.preview || skipTraceDraft.result) && (() => {
                    const r = (skipTraceDraft.result ?? skipTraceDraft.preview)!;
                    return (
                      <div className="rounded-lg border border-black/10 bg-[var(--color-surface-soft)] p-4 text-sm">
                        <p className="mb-2 font-bold text-[var(--color-navy)]">
                          {skipTraceDraft.result ? "Import complete" : "Preview (no changes written)"}
                        </p>
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[var(--color-ink)]">
                          <li>Total rows: {r.total}</li>
                          <li>Matched: {r.matched}</li>
                          <li>Matched (no lead): {r.matched_no_lead}</li>
                          <li>Unmatched: {r.unmatched}</li>
                          <li>Ambiguous: {r.ambiguous}</li>
                          <li>Malformed: {r.malformed}</li>
                          <li>Phones added: {r.phones_added}</li>
                          <li>Emails added: {r.emails_added}</li>
                          <li>Duplicates ignored: {r.dupes_ignored}</li>
                        </ul>

                        {r.ambiguousRows && r.ambiguousRows.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer font-semibold text-amber-700">
                              Ambiguous ({r.ambiguousRows.length}) — review manually
                            </summary>
                            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
                              {r.ambiguousRows.map((row, i) => (
                                <li key={i} className="border-b border-black/5 pb-1">
                                  {row.state}/{row.county}/{row.apn} — {row.owner || "(no name)"} — {row.reason}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}

                        {r.unmatchedRows && r.unmatchedRows.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer font-semibold text-[var(--color-muted)]">
                              Unmatched ({r.unmatchedRows.length})
                            </summary>
                            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
                              {r.unmatchedRows.map((row, i) => (
                                <li key={i} className="border-b border-black/5 pb-1">
                                  {row.state}/{row.county}/{row.apn} — {row.owner || "(no name)"} — {row.reason}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}

                        {r.malformedRows && r.malformedRows.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer font-semibold text-red-700">
                              Malformed ({r.malformedRows.length})
                            </summary>
                            <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
                              {r.malformedRows.map((row, i) => (
                                <li key={i} className="border-b border-black/5 pb-1">
                                  {row.state || "?"}/{row.county || "?"}/{row.apn || "?"} — {row.reason}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setBulkImportStep('choose')}
                    disabled={skipTraceDraft.isRunning}
                    className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:opacity-45"
                  >
                    Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => runSkipTrace(true)}
                      disabled={!skipTraceDraft.file || skipTraceDraft.isRunning || !!skipTraceDraft.result}
                      className="rounded-lg border border-[var(--color-navy)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {skipTraceDraft.isRunning ? "Working..." : "Preview"}
                    </button>
                    <button
                      type="button"
                      onClick={() => runSkipTrace(false)}
                      disabled={!skipTraceDraft.file || skipTraceDraft.isRunning || !!skipTraceDraft.result}
                      className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {skipTraceDraft.result ? "Imported!" : "Run Import"}
                    </button>
                    <button
                      type="button"
                      onClick={closeBulkImportModal}
                      disabled={skipTraceDraft.isRunning}
                      className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:opacity-45"
                    >
                      {skipTraceDraft.result ? "Close" : "Cancel"}
                    </button>
                  </div>
                </div>
              </>
            )}
           </div>
         </div>
       )}
         </>
       ) : (
         <>
           {/* Map View */}
          <div className="rounded-[1.4rem] border border-black/6 bg-white overflow-hidden shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
            <div className="h-[calc(100vh-280px)] min-h-[500px]">
              {isLoadingMap ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-2 text-lg font-semibold text-gray-700">Loading map...</div>
                    <div className="text-sm text-gray-500">Fetching geocoded properties</div>
                  </div>
                </div>
              ) : (
                <LeadsMap
                  properties={geocodedProperties.map(p => ({
                    ...p,
                    lead: p.leads
                  }))}
                  onPropertyClick={(propertyId, leadId) => {
                    setViewMode('list');
                    if (leadId) {
                      console.log('Navigate to lead:', leadId);
                    }
                  }}
                />
              )}
            </div>

            {/* Map Stats */}
            <div className="border-t border-black/6 bg-[var(--color-surface-soft)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="font-semibold text-[var(--color-navy)]">{geocodedProperties.length}</span>
                  <span className="ml-1 text-[var(--color-muted)]">geocoded properties</span>
                </div>
                <div>
                  <span className="font-semibold text-[var(--color-navy)]">{leads.length}</span>
                  <span className="ml-1 text-[var(--color-muted)]">total leads</span>
                </div>
                {geocodedProperties.length < leads.length && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsGeocoding(true);
                      try {
                        const response = await fetch('/api/admin/properties/geocode', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ limit: 50 }),
                        });
                        if (response.ok) {
                          const result = await response.json();
                          console.log('Geocoding result:', result);
                          // Reload to show new geocoded properties
                          window.location.reload();
                        } else {
                          const error = await response.json();
                          console.error('Geocoding failed:', error);
                          alert(`Geocoding failed: ${error.error || 'Unknown error'}`);
                          setIsGeocoding(false);
                        }
                      } catch (error) {
                        console.error('Geocoding error:', error);
                        alert('Geocoding failed. Please try again.');
                        setIsGeocoding(false);
                      }
                    }}
                    disabled={isGeocoding}
                    className="ml-auto rounded-lg bg-[var(--color-primary-gold)] px-3 py-1.5 text-xs font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGeocoding ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Geocoding...
                      </>
                    ) : (
                      'Geocode More Properties'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
