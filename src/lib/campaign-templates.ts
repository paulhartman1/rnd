// Campaign templates for quick setup based on common lead targeting strategies

export type CampaignTemplate = {
  id: string;
  name: string;
  description: string;
  filters: {
    // Existing filters
    status?: string[];
    isHotLead?: boolean;
    sourceIds?: string[];
    assignedUserIds?: string[];
    unassignedOnly?: boolean;
    lastContactedDaysMin?: number | null;
    lastContactedDaysMax?: number | null;
    leadIds?: string[];
    
    // New BatchLeads filters
    priorityScoreMin?: number;
    hasComputedTags?: string[]; // Filter by presence of tags
  };
  priority: number;
};

export const campaignTemplates: CampaignTemplate[] = [
  {
    id: 'high-profit',
    name: 'High-Profit Potential',
    description: 'Leads with spread > $30k and equity > $50k — maximum ROI opportunities',
    filters: {
      status: ['new', 'contacted'],
      hasComputedTags: ['high-profit'],
      priorityScoreMin: 50,
    },
    priority: 100,
  },
  {
    id: 'distressed-motivated',
    name: 'Distressed/Motivated Sellers',
    description: 'Foreclosure, vacant properties, or high LTV — sellers need to move fast',
    filters: {
      status: ['new', 'contacted'],
      hasComputedTags: ['distressed'],
      priorityScoreMin: 30,
    },
    priority: 90,
  },
  {
    id: 'pre-foreclosure-urgent',
    name: 'Pre-Foreclosure Rush',
    description: 'Auction within 60 days with equity — extreme time pressure',
    filters: {
      status: ['new'],
      hasComputedTags: ['pre-foreclosure-urgent'],
    },
    priority: 95,
  },
  {
    id: 'absentee-high-value',
    name: 'Absentee Owners - High Value',
    description: 'Self-managed landlords with high-value properties — tired landlords',
    filters: {
      status: ['new', 'contacted'],
      hasComputedTags: ['absentee-high-value'],
      priorityScoreMin: 40,
    },
    priority: 80,
  },
  {
    id: 'failed-listing',
    name: 'Failed MLS Listings',
    description: 'Expired or withdrawn listings — already tried traditional sale',
    filters: {
      status: ['new'],
      hasComputedTags: ['failed-listing'],
    },
    priority: 75,
  },
  {
    id: 'older-owner',
    name: 'Older Owners - High Equity',
    description: 'Long-term ownership with high equity — likely downsizing or estate planning',
    filters: {
      status: ['new', 'contacted'],
      hasComputedTags: ['older-owner-high-equity'],
      priorityScoreMin: 35,
    },
    priority: 70,
  },
  {
    id: 'vacant-properties',
    name: 'Vacant Properties',
    description: 'All vacant properties — motivated to reduce carrying costs',
    filters: {
      status: ['new', 'contacted'],
      hasComputedTags: ['vacant'],
    },
    priority: 65,
  },
  {
    id: 'all-foreclosure',
    name: 'All Foreclosures',
    description: 'Any property with foreclosure status',
    filters: {
      status: ['new', 'contacted'],
      hasComputedTags: ['foreclosure'],
    },
    priority: 85,
  },
];
