"use client";

import { useEffect, useState, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";

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
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Voice SDK state
  const deviceRef = useRef<Device | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [currentLead, setCurrentLead] = useState<any>(null);
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    priority: 0,
    lead_filters: { status: ["new"], isHotLead: false },
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
        await loadCampaigns();
      } else if (activeTab === "agents") {
        await loadAgents();
      } else if (activeTab === "queue") {
        await loadQueue();
      } else if (activeTab === "stats") {
        await loadStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
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
      setNewCampaign({ name: "", description: "", priority: 0, lead_filters: { status: ["new"], isHotLead: false } });
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

      const lead = queueItem.leads;
      console.log('[Dialer] Lead data:', lead);
      setCurrentLead(lead);
      setCallStatus("Initiating call...");

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

      call.on("disconnect", () => {
        setCallStatus("");
        setCurrentCall(null);
        setCurrentLead(null);
        setIsMuted(false);
        // Process next call - force to continue even if user pressed Stop
        processNext(true);
      });

      call.on("cancel", () => {
        setCallStatus("Call cancelled");
        setCurrentCall(null);
        setCurrentLead(null);
      });

      call.on("error", (error) => {
        console.error("Call error:", error);
        setCallStatus(`Call error: ${error.message}`);
        setCurrentCall(null);
        setCurrentLead(null);
      });

    } catch (error) {
      console.error("Failed to make call:", error);
      setCallStatus("Failed to initiate call");
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
    
    try {
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

    // Reorder the local state immediately for responsiveness
    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(dropIndex, 0, draggedItem);
    setQueue(newQueue);
    setDraggedIndex(null);

    // Send the new order to the server
    const orderedIds = newQueue.map(item => item.id);
    await fetch("/api/admin/dialer/queue/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
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
            {tab}
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
                <div className="flex gap-2">
                  <button
                    onClick={createCampaign}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateCampaign(false)}
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
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{campaign.name}</h3>
                    {campaign.description && <p className="text-sm text-gray-600">{campaign.description}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Priority: {campaign.priority} | Filters: {JSON.stringify(campaign.lead_filters)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {campaign.is_active ? (
                      <button
                        onClick={() => stopCampaign(campaign.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => startCampaign(campaign.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
                {campaign.is_active && (
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Active
                  </span>
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
            <h2 className="text-xl font-bold">Queue</h2>
            <div className="flex gap-2">
              <button
                onClick={processDialer}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isProcessing ? "Processing..." : "Process Now"}
              </button>
              {isProcessing && (
                <button
                  onClick={() => setIsProcessing(false)}
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
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">Active Call</h3>
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>{currentLead.full_name || "Unknown"}</strong>
                  </p>
                  <p className="text-sm text-gray-600">{currentLead.phone}</p>
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
            </div>
          )}

          {/* Call Status */}
          {callStatus && !currentCall && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">{callStatus}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow border overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queue.map((item, index) => (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`cursor-move hover:bg-gray-50 ${draggedIndex === index ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">☰</span>
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
