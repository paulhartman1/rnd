"use client";

import { useEffect, useState, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import type { LeadStatus } from "@/lib/leads";
import { leadStatuses } from "@/lib/leads";

type Agent = {
  user_id: string;
  email: string | null;
  phone_number: string | null;
  is_active: boolean;
  max_concurrent_calls: number;
  has_settings: boolean;
  created_at: string;
};

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  lead_filters: Record<string, unknown>;
  priority: number;
  created_at: string;
};

type QueueItem = {
  id: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  created_at: string;
  campaign: { id: string; name: string } | null;
  lead: { id: string; full_name: string; phone: string; street_address: string } | null;
  agent: { id: string; name: string } | null;
};

type WorkspaceLead = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  status: LeadStatus;
  owner_notes: string | null;
};

type Tab = "campaigns" | "agents" | "queue" | "stats";

export default function DialerClient() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Voice SDK state
  const deviceRef = useRef<Device | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [currentLead, setCurrentLead] = useState<WorkspaceLead | null>(null);
  const [currentLeadNotes, setCurrentLeadNotes] = useState("");
  const [currentLeadStatus, setCurrentLeadStatus] = useState<LeadStatus | null>(null);
  const [currentQueueItemId, setCurrentQueueItemId] = useState<string | null>(null);
  const [isFetchingNextLead, setIsFetchingNextLead] = useState(false);
  const [isSavingLeadNotes, setIsSavingLeadNotes] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [awaitingNextLead, setAwaitingNextLead] = useState(false);
  
  // Appointment scheduling state
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");
  const [isSchedulingAppointment, setIsSchedulingAppointment] = useState(false);
  
  // Lead editing state
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [leadEdit, setLeadEdit] = useState({ full_name: "", phone: "", email: "" });
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Redistribute and assignment state
  const [isRedistributing, setIsRedistributing] = useState(false);
  const [selectedQueueItems, setSelectedQueueItems] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Lead selection for campaigns
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [searchedLeads, setSearchedLeads] = useState<any[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);

  // Computed filtered queue: only active campaigns, deduplicated by phone
  const filteredQueue = (() => {
    const activeCampaignIds = new Set(
      campaigns.filter(c => c.is_active).map(c => c.id)
    );
    
    const seenPhones = new Set<string>();
    
    return queue.filter(item => {
      // Only include items from active campaigns
      if (!item.campaign || !activeCampaignIds.has(item.campaign.id)) {
        return false;
      }
      
      // Deduplicate by phone number
      const phone = item.lead?.phone;
      if (!phone || seenPhones.has(phone)) {
        return false;
      }
      
      seenPhones.add(phone);
      return true;
    });
  })();

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    priority: 0,
    lead_filters: { status: ["new"] as string[], isHotLead: false, agentIds: [] as string[], leadIds: [] as string[] },
  });

  const [campaignEdit, setCampaignEdit] = useState({
    name: "",
    description: "",
    priority: 0,
    lead_filters: { status: ["new"] as string[], isHotLead: false, agentIds: [] as string[], leadIds: [] as string[] },
  });

  const [agentEdit, setAgentEdit] = useState({
    phone_number: "",
    max_concurrent_calls: 1,
  });

  useEffect(() => {
    loadData();
    // Set up polling for queue and stats when active
    const interval = setInterval(() => {
      if (activeTab === "queue") {
        loadQueue();
      } else if (activeTab === "stats") {
        loadStats();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "campaigns") {
        // Load both campaigns and agents for campaign creation UI
        await Promise.all([loadCampaigns(), loadAgents()]);
      } else if (activeTab === "agents") {
        await loadAgents();
      } else if (activeTab === "queue") {
        // Load campaigns, queue, and agents for assignment UI
        await Promise.all([loadCampaigns(), loadQueue(), loadAgents()]);
      } else if (activeTab === "stats") {
        await loadStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeadStatus = async (newStatus: LeadStatus) => {
    if (!currentLead) return;

    setIsUpdatingStatus(true);
    const previousStatus = currentLeadStatus;

    // Optimistically update UI
    setCurrentLeadStatus(newStatus);

    try {
      const response = await fetch(`/api/admin/leads/${currentLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ownerNotes: currentLeadNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update lead status");
      }

      setCurrentLead((previous) =>
        previous
          ? {
              ...previous,
              status: newStatus,
            }
          : previous,
      );
    } catch (error) {
      console.error("[Dialer] Failed to update lead status:", error);
      alert(error instanceof Error ? error.message : "Failed to update lead status");
      // Revert on error
      setCurrentLeadStatus(previousStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const markQueueItemCompleted = async (queueItemId: string) => {
    try {
      await fetch(`/api/admin/dialer/queue/${queueItemId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Dialer] Failed to mark queue item complete:", error);
    }
  };

  const persistCurrentLeadNotes = async () => {
    if (!currentLead || !currentLeadStatus) {
      return true;
    }

    setIsSavingLeadNotes(true);

    try {
      // Auto-advance from "new" to "contacted" if still new
      const nextStatus: LeadStatus =
        currentLeadStatus === "new" ? "contacted" : currentLeadStatus;

      const response = await fetch(`/api/admin/leads/${currentLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          ownerNotes: currentLeadNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save lead notes");
      }

      setCurrentLead((previous) =>
        previous
          ? {
              ...previous,
              status: nextStatus,
              owner_notes: currentLeadNotes.trim() || null,
            }
          : previous,
      );
      setCurrentLeadStatus(nextStatus);

      // Mark queue item as completed
      if (currentQueueItemId) {
        await markQueueItemCompleted(currentQueueItemId);
      }

      return true;
    } catch (error) {
      console.error("[Dialer] Failed to save lead notes:", error);
      alert(error instanceof Error ? error.message : "Failed to save lead notes");
      return false;
    } finally {
      setIsSavingLeadNotes(false);
    }
  };

  const clearCurrentWorkspace = () => {
    setCurrentCall(null);
    setCurrentLead(null);
    setCurrentLeadNotes("");
    setCurrentLeadStatus(null);
    setCurrentQueueItemId(null);
    setIsMuted(false);
    setAwaitingNextLead(false);
  };

  const loadCampaigns = async () => {
    const response = await fetch("/api/admin/dialer/campaigns");
    const data = await response.json();
    if (data.campaigns) setCampaigns(data.campaigns);
  };

  const loadAgents = async () => {
    const response = await fetch("/api/admin/dialer/agents");
    const data = await response.json();
    if (data.agents) setAgents(data.agents);
  };

  const loadQueue = async () => {
    const response = await fetch("/api/admin/dialer/queue");
    const data = await response.json();
    if (data.queue) setQueue(data.queue);
  };

  const loadStats = async () => {
    const response = await fetch("/api/admin/dialer/stats");
    const data = await response.json();
    setStats(data);
  };

  const createCampaign = async () => {
    const response = await fetch("/api/admin/dialer/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCampaign),
    });

    if (response.ok) {
      setShowCreateCampaign(false);
      setNewCampaign({ 
        name: "", 
        description: "", 
        priority: 0, 
        lead_filters: { status: ["new"] as string[], isHotLead: false, agentIds: [] as string[], leadIds: [] as string[] } 
      });
      setLeadSearchQuery("");
      setSearchedLeads([]);
      await loadCampaigns();
    }
  };

  const startCampaign = async (id: string) => {
    const response = await fetch(`/api/admin/dialer/campaigns/${id}/start`, {
      method: "POST",
    });
    const data = await response.json();
    if (response.ok) {
      alert(data.message || "Campaign started");
      await loadCampaigns();
    } else {
      alert(data.error || "Failed to start campaign");
    }
  };

  const stopCampaign = async (id: string) => {
    const response = await fetch(`/api/admin/dialer/campaigns/${id}/stop`, {
      method: "POST",
    });
    if (response.ok) {
      await loadCampaigns();
    }
  };

  const updateCampaign = async (id: string) => {
    const response = await fetch(`/api/admin/dialer/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campaignEdit),
    });

    if (response.ok) {
      setEditingCampaign(null);
      setCampaignEdit({ name: "", description: "", priority: 0, lead_filters: { status: ["new"], isHotLead: false, agentIds: [], leadIds: [] } });
      await loadCampaigns();
    } else {
      const data = await response.json();
      alert(data.error || "Failed to update campaign");
    }
  };

  const deleteCampaign = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the campaign "${name}"? This will remove all associated queue items.`)) {
      return;
    }

    const response = await fetch(`/api/admin/dialer/campaigns/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      await loadCampaigns();
      await loadQueue(); // Refresh queue since items may have been removed
    } else {
      const data = await response.json();
      alert(data.error || "Failed to delete campaign");
    }
  };

  const saveAgentSettings = async (userId: string) => {
    const response = await fetch(`/api/admin/dialer/agents/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentEdit),
    });

    if (response.ok) {
      setEditingAgent(null);
      setAgentEdit({ phone_number: "", max_concurrent_calls: 1 });
      await loadAgents();
    } else {
      alert("Failed to save agent settings");
    }
  };

  const toggleAgentActive = async (userId: string, currentStatus: boolean) => {
    await fetch(`/api/admin/dialer/agents/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentStatus }),
    });
    await loadAgents();
  };

  const initializeDevice = async () => {
    try {
      console.log("[Dialer] Requesting microphone permission...");
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log("[Dialer] Microphone permission granted");

      // Get access token
      console.log("[Dialer] Fetching access token...");
      const tokenResponse = await fetch("/api/dialer/token");
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error || "Failed to get access token");
      }
      
      const { token } = tokenData;
      if (!token || typeof token !== 'string') {
        console.error("[Dialer] Invalid token received:", tokenData);
        throw new Error("Invalid token received from server");
      }
      console.log("[Dialer] Access token received");

      // Initialize Twilio Device
      console.log("[Dialer] Initializing Twilio Device...");
      const device = new Device(token, {
        logLevel: 1, // Enable debug logging
        edge: 'ashburn' // Use closest edge location
      });
      deviceRef.current = device;

      device.on("registered", () => {
        console.log("[Dialer] Device registered and ready for calls");
        setCallStatus("Device ready");
      });

      device.on("error", (error) => {
        console.error("[Dialer] Device error:", error);
        console.error("[Dialer] Error code:", error.code);
        console.error("[Dialer] Error message:", error.message);
        console.error("[Dialer] Error details:", JSON.stringify(error));
        setCallStatus(`Error: ${error.message}`);
      });

      console.log("[Dialer] Registering device...");
      await device.register();
      console.log("[Dialer] Device initialization complete");
      return device;
    } catch (error) {
      console.error("[Dialer] Failed to initialize device:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to initialize calling device: ${errorMessage}`);
      throw error;
    }
  };

  const makeCall = async (queueItem: any) => {
    try {
      console.log('[Dialer] makeCall called with:', queueItem);
      const device = deviceRef.current;
      if (!device) {
        throw new Error("Device not initialized");
      }
      const lead = queueItem.leads as WorkspaceLead;
      console.log('[Dialer] Lead data:', lead);
      setCurrentQueueItemId(queueItem.id);
      setCurrentLead(lead);
      setCurrentLeadNotes(lead.owner_notes || "");
      setCurrentLeadStatus(lead.status);
      setAwaitingNextLead(false);
      setCallStatus("Initiating call...");
      setQueue((previous) => previous.filter((item) => item.id !== queueItem.id));

      // Connect call with queue item ID
      console.log('[Dialer] Connecting with queue item ID:', queueItem.id);
      const call = await device.connect({
        params: { queueItemId: queueItem.id }
      });

      console.log('[Dialer] Call object created:', call);
      setCurrentCall(call);

      call.on("accept", () => {
        setCallStatus(`Connected to ${lead.full_name || lead.phone}`);
      });

      call.on("disconnect", async () => {
        setCallStatus("Call ended. Review notes, then click Next Lead.");
        setCurrentCall(null);
        setIsMuted(false);
        // Mark queue item as complete to prevent stuck "calling" status
        if (currentQueueItemId) {
          await markQueueItemCompleted(currentQueueItemId);
        }
        // Always show workspace after call ends, keep processing state
        setAwaitingNextLead(true);
        void loadQueue();
        void loadStats();
      });

      call.on("cancel", async () => {
        setCallStatus("Call cancelled. Review notes, then click Next Lead.");
        setCurrentCall(null);
        // Mark queue item as complete even on cancel
        if (currentQueueItemId) {
          await markQueueItemCompleted(currentQueueItemId);
        }
        setAwaitingNextLead(false);
      });

      call.on("error", async (error) => {
        console.error("Call error:", error);
        setCallStatus(`Call error: ${error.message}. Review notes, then click Next Lead.`);
        setCurrentCall(null);
        // Mark queue item as complete even on error
        if (currentQueueItemId) {
          await markQueueItemCompleted(currentQueueItemId);
        }
        setAwaitingNextLead(false);
      });

    } catch (error) {
      console.error("Failed to make call:", error);
      setCallStatus("Failed to initiate call");
      setAwaitingNextLead(false);
    }
  };

  const processNext = async (forceProcess = false) => {
    // Check if processing was stopped (unless forced)
    if (!forceProcess && !isProcessing) {
      console.log('[Dialer] Processing stopped by user');
      await loadQueue();
      await loadStats();
      return;
    }
    
    // If forcing, ensure processing state is active
    if (forceProcess) {
      setIsProcessing(true);
    }
    
    try {
      setIsFetchingNextLead(true);

      if (awaitingNextLead || currentLead) {
        const saved = await persistCurrentLeadNotes();
        if (!saved) {
          return;
        }
      }

      clearCurrentWorkspace();
      // Get next queue item and process it
      console.log('[Dialer] Fetching next queue item...');
      const response = await fetch("/api/admin/dialer/process", {
        method: "POST",
      });
      const data = await response.json();
      console.log('[Dialer] Process response:', data);
      
      if (!response.ok) {
        console.error('[Dialer] Process error:', data.error);
        alert(`Error: ${data.error}`);
        setIsProcessing(false);
        return;
      }
      
      if (data.queueItems && data.queueItems.length > 0) {
        console.log('[Dialer] Making call to:', data.queueItems[0]);
        await makeCall(data.queueItems[0]);
      } else {
        console.log('[Dialer] No more queue items. Stopping.');
        setIsProcessing(false);
        await loadQueue();
        await loadStats();
      }
    } catch (error) {
      console.error('[Dialer] processNext error:', error);
      setIsProcessing(false);
    } finally {
      setIsFetchingNextLead(false);
    }
  };

  const processDialer = async () => {
    setIsProcessing(true);
    try {
      // Initialize device if not already done
      if (!deviceRef.current) {
        await initializeDevice();
      }

      // Start processing - force first call since state update is async
      await processNext(true);
    } catch (error) {
      console.error("Process error:", error);
      setIsProcessing(false);
    }
  };

  const hangupCall = () => {
    if (currentCall) {
      currentCall.disconnect();
    }
  };

  const stopWorkspace = () => {
    setIsProcessing(false);
    setAwaitingNextLead(false);
  };

  const updateLead = async () => {
    if (!currentLead) return;

    // Warn about phone number changes
    if (leadEdit.phone !== currentLead.phone) {
      if (!confirm(
        "⚠️ WARNING: Changing the phone number will affect:\n" +
        "• Call history linked to this lead\n" +
        "• Appointment records\n" +
        "• Text message history\n" +
        "\nAre you sure you want to change the phone number?"
      )) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/leads/${currentLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: leadEdit.full_name,
          phone: leadEdit.phone,
          email: leadEdit.email || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update lead");
      }

      // Update local state
      setCurrentLead(prev => prev ? {
        ...prev,
        full_name: leadEdit.full_name,
        phone: leadEdit.phone,
        email: leadEdit.email || null,
      } : prev);

      setIsEditingLead(false);
      alert("Lead updated successfully");
    } catch (error) {
      console.error("[Dialer] Failed to update lead:", error);
      alert(error instanceof Error ? error.message : "Failed to update lead");
    }
  };

  const scheduleAppointment = async (autoAdvance = false) => {
    if (!currentLead || !scheduledDateTime) {
      alert("Please select a date and time for the appointment");
      return false;
    }

    setIsSchedulingAppointment(true);

    try {
      const startTime = new Date(scheduledDateTime);
      const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes later

      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: currentLead.id,
          title: `Follow-up call with ${currentLead.full_name || currentLead.phone}`,
          description: currentLeadNotes.trim() || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: "scheduled",
          location: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to schedule appointment");
      }

      alert(`Appointment scheduled for ${startTime.toLocaleString()}`);
      setScheduledDateTime("");
      
      if (autoAdvance) {
        // Save notes and move to next lead
        await processNext();
      }
      
      return true;
    } catch (error) {
      console.error("[Dialer] Failed to schedule appointment:", error);
      alert(error instanceof Error ? error.message : "Failed to schedule appointment");
      return false;
    } finally {
      setIsSchedulingAppointment(false);
    }
  };

  const toggleMute = () => {
    if (currentCall) {
      currentCall.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    // Reorder the filtered queue items
    const newFiltered = [...filteredQueue];
    const [draggedItem] = newFiltered.splice(draggedIndex, 1);
    newFiltered.splice(dropIndex, 0, draggedItem);
    setDraggedIndex(null);

    // Send the new order to the server (only reorder the filtered items)
    const orderedIds = newFiltered.map(item => item.id);
    await fetch("/api/admin/dialer/queue/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    
    // Reload queue to get updated order
    await loadQueue();
  };

  const handleRedistribute = async () => {
    setIsRedistributing(true);
    try {
      const response = await fetch("/api/admin/dialer/redistribute", {
        method: "POST",
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || `Claimed ${data.redistributed} lead(s)`);
        await loadQueue();
      } else {
        alert(data.error || "Failed to redistribute leads");
      }
    } catch (error) {
      console.error("Redistribute error:", error);
      alert("Failed to redistribute leads");
    } finally {
      setIsRedistributing(false);
    }
  };

  const toggleQueueItemSelection = (itemId: string) => {
    setSelectedQueueItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllQueueItems = () => {
    setSelectedQueueItems(new Set(filteredQueue.map(item => item.id)));
  };

  const deselectAllQueueItems = () => {
    setSelectedQueueItems(new Set());
  };

  const assignSelected = async (userId: string | null) => {
    if (selectedQueueItems.size === 0) {
      alert("Please select queue items first");
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch("/api/admin/dialer/queue/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueItemIds: Array.from(selectedQueueItems),
          userId,
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || "Assignment updated");
        setSelectedQueueItems(new Set());
        await loadQueue();
      } else {
        alert(data.error || "Failed to assign leads");
      }
    } catch (error) {
      console.error("Assignment error:", error);
      alert("Failed to assign leads");
    } finally {
      setIsAssigning(false);
    }
  };

  const searchLeads = async (query: string) => {
    if (!query.trim()) {
      setSearchedLeads([]);
      return;
    }

    setIsSearchingLeads(true);
    try {
      const response = await fetch(`/api/admin/leads/search?q=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchedLeads(data.leads || []);
      } else {
        console.error("Search error:", data.error);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearchingLeads(false);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setNewCampaign(prev => {
      const currentLeadIds = (prev.lead_filters.leadIds as string[]) || [];
      const updated = currentLeadIds.includes(leadId)
        ? currentLeadIds.filter(id => id !== leadId)
        : [...currentLeadIds, leadId];
      return {
        ...prev,
        lead_filters: { ...prev.lead_filters, leadIds: updated }
      };
    });
  };

  const toggleAgentSelection = (agentId: string) => {
    setNewCampaign(prev => {
      const currentAgentIds = (prev.lead_filters.agentIds as string[]) || [];
      const updated = currentAgentIds.includes(agentId)
        ? currentAgentIds.filter(id => id !== agentId)
        : [...currentAgentIds, agentId];
      return {
        ...prev,
        lead_filters: { ...prev.lead_filters, agentIds: updated }
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(["campaigns", "agents", "queue", "stats"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "queue" ? "Dialer" : tab}
          </button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Campaigns</h2>
            <button
              onClick={() => setShowCreateCampaign(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Campaign
            </button>
          </div>

          {showCreateCampaign && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-bold mb-4">New Campaign</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Campaign Name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
                <textarea
                  placeholder="Description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Lead Filters</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newCampaign.lead_filters.isHotLead === true}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            lead_filters: { ...newCampaign.lead_filters, isHotLead: e.target.checked },
                          })
                        }
                      />
                      Hot Leads Only
                    </label>
                    <div>
                      <span className="text-sm">Status: </span>
                      {["new", "contacted"].map((status) => (
                        <label key={status} className="inline-flex items-center gap-1 mr-4">
                          <input
                            type="checkbox"
                            checked={(newCampaign.lead_filters.status as string[])?.includes(status)}
                            onChange={(e) => {
                              const current = (newCampaign.lead_filters.status as string[]) || [];
                              const updated = e.target.checked
                                ? [...current, status]
                                : current.filter((s) => s !== status);
                              setNewCampaign({
                                ...newCampaign,
                                lead_filters: { ...newCampaign.lead_filters, status: updated },
                              });
                            }}
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Agent Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Agents ({((newCampaign.lead_filters.agentIds as string[]) || []).length} selected)
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                    {agents.filter(a => a.has_settings && a.is_active).map(agent => (
                      <label key={agent.user_id} className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={((newCampaign.lead_filters.agentIds as string[]) || []).includes(agent.user_id)}
                          onChange={() => toggleAgentSelection(agent.user_id)}
                          className="rounded"
                        />
                        <span className="text-sm">{agent.email}</span>
                      </label>
                    ))}
                    {agents.filter(a => a.has_settings && a.is_active).length === 0 && (
                      <p className="text-sm text-gray-500">No active agents available</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to assign to ALL active agents
                  </p>
                </div>

                {/* Lead Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Specific Leads ({((newCampaign.lead_filters.leadIds as string[]) || []).length} selected)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Search leads by name, phone, or address..."
                      value={leadSearchQuery}
                      onChange={(e) => {
                        setLeadSearchQuery(e.target.value);
                        searchLeads(e.target.value);
                      }}
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                    {isSearchingLeads && (
                      <p className="text-xs text-gray-500">Searching...</p>
                    )}
                    {searchedLeads.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
                        {searchedLeads.map(lead => (
                          <label key={lead.id} className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={((newCampaign.lead_filters.leadIds as string[]) || []).includes(lead.id)}
                              onChange={() => toggleLeadSelection(lead.id)}
                              className="rounded"
                            />
                            <span className="text-sm">
                              {lead.full_name || "Unknown"} - {lead.phone}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use filter-based lead selection
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createCampaign}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateCampaign(false);
                      setLeadSearchQuery("");
                      setSearchedLeads([]);
                    }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white p-4 rounded-lg shadow border">
                {editingCampaign === campaign.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={campaignEdit.name}
                      onChange={(e) => setCampaignEdit({ ...campaignEdit, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm"
                      placeholder="Campaign Name"
                    />
                    <textarea
                      value={campaignEdit.description}
                      onChange={(e) => setCampaignEdit({ ...campaignEdit, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm"
                      placeholder="Description"
                      rows={2}
                    />
                    <div>
                      <label className="block text-sm font-medium mb-2">Lead Filters</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={campaignEdit.lead_filters.isHotLead === true}
                            onChange={(e) =>
                              setCampaignEdit({
                                ...campaignEdit,
                                lead_filters: { ...campaignEdit.lead_filters, isHotLead: e.target.checked },
                              })
                            }
                          />
                          Hot Leads Only
                        </label>
                        <div>
                          <span className="text-sm">Status: </span>
                          {["new", "contacted"].map((status) => (
                            <label key={status} className="inline-flex items-center gap-1 mr-4">
                              <input
                                type="checkbox"
                                checked={(campaignEdit.lead_filters.status as string[])?.includes(status)}
                                onChange={(e) => {
                                  const current = (campaignEdit.lead_filters.status as string[]) || [];
                                  const updated = e.target.checked
                                    ? [...current, status]
                                    : current.filter((s) => s !== status);
                                  setCampaignEdit({
                                    ...campaignEdit,
                                    lead_filters: { ...campaignEdit.lead_filters, status: updated },
                                  });
                                }}
                              />
                              {status}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateCampaign(campaign.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCampaign(null)}
                        className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{campaign.name}</h3>
                        {campaign.description && <p className="text-sm text-gray-600">{campaign.description}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          Priority: {campaign.priority} | Filters: {JSON.stringify(campaign.lead_filters)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCampaign(campaign.id);
                            setCampaignEdit({
                              name: campaign.name,
                              description: campaign.description || "",
                              priority: campaign.priority,
                              lead_filters: campaign.lead_filters as { status: string[]; isHotLead: boolean; agentIds: string[]; leadIds: string[] },
                            });
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        {campaign.is_active ? (
                          <button
                            onClick={() => stopCampaign(campaign.id)}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                          >
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={() => startCampaign(campaign.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => deleteCampaign(campaign.id, campaign.name)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {campaign.is_active && (
                      <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Active
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Agents (Authenticated Users)</h2>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p><strong>Note:</strong> Agents are authenticated users. To add an agent, create a user account in Supabase Auth, then configure their dialer settings below.</p>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.user_id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{agent.email}</h3>
                      {!agent.has_settings && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                          No settings
                        </span>
                      )}
                    </div>
                    
                    {editingAgent === agent.user_id ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="tel"
                          placeholder="Phone Number (e.g., +15551234567)"
                          value={agentEdit.phone_number}
                          onChange={(e) => setAgentEdit({ ...agentEdit, phone_number: e.target.value })}
                          className="w-full px-3 py-2 border rounded text-sm"
                        />
                        <div>
                          <label className="block text-xs font-medium mb-1">Max Concurrent Calls</label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={agentEdit.max_concurrent_calls}
                            onChange={(e) =>
                              setAgentEdit({ ...agentEdit, max_concurrent_calls: parseInt(e.target.value) || 1 })
                            }
                            className="w-full px-3 py-2 border rounded text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveAgentSettings(agent.user_id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAgent(null)}
                            className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {agent.phone_number && (
                          <p className="text-sm text-gray-600 mt-1">{agent.phone_number}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Max Concurrent: {agent.max_concurrent_calls}
                        </p>
                        <button
                          onClick={() => {
                            setEditingAgent(agent.user_id);
                            setAgentEdit({
                              phone_number: agent.phone_number || "",
                              max_concurrent_calls: agent.max_concurrent_calls,
                            });
                          }}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          {agent.has_settings ? "Edit Settings" : "Configure Agent"}
                        </button>
                      </>
                    )}
                  </div>
                  {agent.has_settings && (
                    <button
                      onClick={() => toggleAgentActive(agent.user_id, agent.is_active)}
                      className={`px-3 py-1 rounded text-sm ${
                        agent.is_active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      {agent.is_active ? "Active" : "Inactive"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Dialer</h2>
            <div className="flex gap-2">
              <button
                onClick={processDialer}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isProcessing ? "Calling Session Active" : "Start Calling"}
              </button>
              {isProcessing && (
                <button
                  onClick={stopWorkspace}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Active Call Controls */}
          {currentCall && currentLead && (
            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">Active Call</h3>
                    <p className="text-sm text-gray-700 mt-1">
                      <strong>{currentLead.full_name || "Unknown"}</strong>
                    </p>
                    <p className="text-sm text-gray-600">{currentLead.phone}</p>
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lead Status</label>
                      <select
                        value={currentLeadStatus || "new"}
                        onChange={(e) => updateLeadStatus(e.target.value as LeadStatus)}
                        disabled={isUpdatingStatus}
                        className="px-2 py-1 text-sm border rounded bg-white disabled:bg-gray-100"
                      >
                        {leadStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-sm text-blue-600 mt-2">{callStatus}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleMute}
                      className={`px-4 py-2 rounded ${isMuted ? "bg-red-600 text-white" : "bg-gray-200"}`}
                    >
                      {isMuted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={hangupCall}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Hang Up
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lead Notes</label>
                  <textarea
                    value={currentLeadNotes}
                    onChange={(e) => setCurrentLeadNotes(e.target.value)}
                    placeholder="Notes about this call..."
                    className="w-full px-3 py-2 border rounded text-sm"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Lead Workspace - shown when awaiting next lead */}
          {awaitingNextLead && currentLead && !currentCall && (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">Call Complete</h3>
                    {isEditingLead ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={leadEdit.full_name}
                          onChange={(e) => setLeadEdit({ ...leadEdit, full_name: e.target.value })}
                          className="w-full px-3 py-2 border rounded text-sm"
                          placeholder="Full Name"
                        />
                        <input
                          type="tel"
                          value={leadEdit.phone}
                          onChange={(e) => setLeadEdit({ ...leadEdit, phone: e.target.value })}
                          className="w-full px-3 py-2 border rounded text-sm"
                          placeholder="Phone (e.g., +15551234567)"
                        />
                        <input
                          type="email"
                          value={leadEdit.email}
                          onChange={(e) => setLeadEdit({ ...leadEdit, email: e.target.value })}
                          className="w-full px-3 py-2 border rounded text-sm"
                          placeholder="Email (optional)"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={updateLead}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setIsEditingLead(false)}
                            className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Changing phone number will affect call history and appointments
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 mt-1">
                          <strong>{currentLead.full_name || "Unknown"}</strong>
                        </p>
                        <p className="text-sm text-gray-600">{currentLead.phone}</p>
                        {currentLead.email && (
                          <p className="text-sm text-gray-600">{currentLead.email}</p>
                        )}
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Lead Status</label>
                          <select
                            value={currentLeadStatus || "new"}
                            onChange={(e) => updateLeadStatus(e.target.value as LeadStatus)}
                            disabled={isUpdatingStatus}
                            className="px-2 py-1 text-sm border rounded bg-white disabled:bg-gray-100"
                          >
                            {leadStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-sm text-green-700 mt-2">{callStatus}</p>
                      </>
                    )}
                  </div>
                  {!isEditingLead && (
                    <button
                      onClick={() => {
                        setIsEditingLead(true);
                        setLeadEdit({
                          full_name: currentLead.full_name || "",
                          phone: currentLead.phone || "",
                          email: currentLead.email || "",
                        });
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Edit Lead
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Call Notes</label>
                  <textarea
                    value={currentLeadNotes}
                    onChange={(e) => setCurrentLeadNotes(e.target.value)}
                    placeholder="Notes about this call..."
                    className="w-full px-3 py-2 border rounded text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Schedule Follow-Up (Optional)</label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => processNext()}
                      disabled={isFetchingNextLead || isSavingLeadNotes}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isFetchingNextLead ? "Loading..." : "Next Lead"}
                    </button>
                    <button
                      onClick={() => scheduleAppointment(true)}
                      disabled={!scheduledDateTime || isSchedulingAppointment || isFetchingNextLead}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      {isSchedulingAppointment ? "Scheduling..." : "Schedule & Next"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => scheduleAppointment(false)}
                      disabled={!scheduledDateTime || isSchedulingAppointment}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Schedule Only
                    </button>
                    <button
                      onClick={stopWorkspace}
                      className="flex-1 px-3 py-2 bg-gray-300 rounded text-sm hover:bg-gray-400"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Call Status */}
          {callStatus && !currentCall && !awaitingNextLead && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">{callStatus}</p>
            </div>
          )}

          {/* Help Team / Redistribute */}
          {!isProcessing && !currentCall && !awaitingNextLead && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-purple-900">Need More Leads?</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Claim pending leads from teammates who haven't called them yet
                  </p>
                </div>
                <button
                  onClick={handleRedistribute}
                  disabled={isRedistributing}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {isRedistributing ? "Claiming..." : "Help Team"}
                </button>
              </div>
            </div>
          )}

          {/* Manual Assignment Controls */}
          {selectedQueueItems.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-blue-900">
                    {selectedQueueItems.size} item(s) selected
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Assign to agents or unassign
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => assignSelected(e.target.value || null)}
                    disabled={isAssigning}
                    className="px-3 py-2 border rounded text-sm bg-white disabled:bg-gray-100"
                  >
                    <option value="">-- Assign to Agent --</option>
                    {agents.filter(a => a.is_active && a.has_settings).map(agent => (
                      <option key={agent.user_id} value={agent.user_id}>
                        {agent.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => assignSelected(null)}
                    disabled={isAssigning}
                    className="px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:bg-gray-400"
                  >
                    Unassign
                  </button>
                  <button
                    onClick={deselectAllQueueItems}
                    className="px-3 py-2 bg-gray-300 rounded text-sm hover:bg-gray-400"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Call Queue</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllQueueItems}
                  className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllQueueItems}
                  className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow border overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">Select</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQueue.map((item, index) => (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`hover:bg-gray-50 ${draggedIndex === index ? 'opacity-50' : ''} ${selectedQueueItems.has(item.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedQueueItems.has(item.id)}
                        onChange={() => toggleQueueItemSelection(item.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 cursor-move">☰</span>
                        <div>
                          {item.lead?.full_name || "Unknown"}
                          <br />
                          <span className="text-xs text-gray-500">{item.lead?.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.campaign?.name || "N/A"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          item.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : item.status === "calling"
                            ? "bg-blue-100 text-blue-800"
                            : item.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.attempts}</td>
                    <td className="px-4 py-3 text-sm">{item.agent?.name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Statistics</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold">{stats.queue?.total || 0}</div>
              <div className="text-sm text-gray-600">Total Queue</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold">{stats.queue?.pending || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold">{stats.queue?.completed || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold">{stats.calls?.total_calls || 0}</div>
              <div className="text-sm text-gray-600">Total Calls</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="font-bold mb-4">Call Outcomes</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Answered:</span>
                <span className="font-bold text-green-600">{stats.calls?.answered || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>No Answer:</span>
                <span>{stats.calls?.no_answer || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Busy:</span>
                <span>{stats.calls?.busy || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed:</span>
                <span className="font-bold text-red-600">{stats.calls?.failed || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
