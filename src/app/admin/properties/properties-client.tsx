"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import PropertyDetailPanel from "@/components/admin/PropertyDetailPanel";
import type { NovationFormData } from "@/components/admin/NovationCalculator";

const PropertiesMap = dynamic(() => import("./components/PropertiesMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center">Loading map...</div>,
});

interface Lead {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  deleted_at: string | null;
}

type PropertyWithLead = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  county: string | null;
  apn: string | null;
  property_type_detail: string | null;
  bedroom_count: number | null;
  bathroom_count: number | null;
  total_building_area_sqft: number | null;
  lot_size_sqft: number | null;
  year_built: number | null;
  total_assessed_value: number | null;
  estimated_value: number | null;
  as_is_market_value: number | null;
  percent_of_market_value: number | null;
  realtor_fee_percent: number | null;
  double_close_fee_percent: number | null;
  closing_attorney_fee: number | null;
  title_insurance: number | null;
  efile_fee: number | null;
  recording_fee: number | null;
  transfer_tax: number | null;
  flat_fee_listing: number | null;
  photographer_fee: number | null;
  other_expenses: number | null;
  repair_costs: number | null;
  interest_costs: number | null;
  months_held: number | null;
  desired_profit_access: number | null;
  desired_profit_no_access: number | null;
  profit_type: 'fixed' | 'percentage' | null;
  profit_percentage: number | null;
  formula_mode: 'simple' | 'detailed' | null;
  arv_percentage: number | null;
  last_sale_date: string | null;
  last_sale_price: number | null;
  lead_id: string;
  lead: Lead | null;
};

interface PropertiesClientProps {
  initialProperties: PropertyWithLead[];
}

type ViewMode = 'list' | 'map';

export default function PropertiesClient({ initialProperties }: PropertiesClientProps) {
  const [properties, setProperties] = useState<PropertyWithLead[]>(initialProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId],
  );

  const handlePropertyClick = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
  };

  const handleCloseDetail = () => {
    setSelectedPropertyId(null);
  };

  const handleSaveNovation = async (propertyId: string, values: NovationFormData) => {
    const response = await fetch(`/api/admin/properties/${propertyId}/novation`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Failed to save novation values" }));
      throw new Error(payload.error ?? "Failed to save novation values");
    }

    setProperties((prev) =>
      prev.map((property) =>
        property.id === propertyId
          ? {
              ...property,
              ...values,
            }
          : property,
      ),
    );
  };

  // Calculate property metrics for list view
  const calculateMetrics = (property: PropertyWithLead) => {
    const asIsMarketValue = property.as_is_market_value ?? property.estimated_value ?? 0;
    const profitType = property.profit_type ?? 'fixed';
    const profitPercentage = property.profit_percentage ?? 15;
    const desiredProfitAccess = property.desired_profit_access ?? 30000;
    
    // Calculate profit based on type
    const estimatedProfit = profitType === 'percentage' 
      ? asIsMarketValue * (profitPercentage / 100)
      : desiredProfitAccess;

    const percentOfMarketValue = property.arv_percentage ?? property.percent_of_market_value ?? 85;
    const realtorFeePercent = property.realtor_fee_percent ?? 3;
    const doubleCloseFeePercent = property.double_close_fee_percent ?? 0.75;
    const closingAttorneyFee = property.closing_attorney_fee ?? 500;
    const titleInsurance = property.title_insurance ?? 500;
    const efileFee = property.efile_fee ?? 100;
    const recordingFee = property.recording_fee ?? 100;
    const transferTax = property.transfer_tax ?? 0;
    const flatFeeListing = property.flat_fee_listing ?? 400;
    const photographerFee = property.photographer_fee ?? 150;
    const otherExpenses = property.other_expenses ?? 0;
    const repairCosts = property.repair_costs ?? 0;

    const salePrice = asIsMarketValue * (percentOfMarketValue / 100);
    const realtorFee = salePrice * (realtorFeePercent / 100);
    const doubleCloseFee = salePrice * (doubleCloseFeePercent / 100);
    const fixedCosts =
      closingAttorneyFee +
      titleInsurance +
      efileFee +
      recordingFee +
      transferTax +
      flatFeeListing +
      photographerFee +
      otherExpenses;
    const totalCosts = realtorFee + doubleCloseFee + fixedCosts + repairCosts;
    const accessMAO = salePrice - totalCosts - estimatedProfit;

    return {
      estARV: asIsMarketValue,
      recOffer: accessMAO,
      estProfit: estimatedProfit,
    };
  };

  return (
    <div className="space-y-4">
      {/* Sticky View Toggle - Mobile First */}
      <div className="sticky top-0 z-30 rounded-[1.4rem] border border-black/6 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Total Properties
              </span>
              <p className="mt-1 text-2xl font-black text-[var(--color-navy)]">{properties.length}</p>
            </div>
            <div className="h-8 w-px bg-black/10" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Geocoded
              </span>
              <p className="mt-1 text-2xl font-black text-[var(--color-navy)]">
                {properties.filter((p) => p.latitude !== null && p.longitude !== null).length}
              </p>
            </div>
          </div>
          
          {/* View Toggle - Touch Friendly */}
          <div className="flex gap-1 rounded-lg border border-black/10 bg-[var(--color-surface-soft)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-bold transition sm:px-6 ${
                viewMode === 'list'
                  ? 'bg-white text-[var(--color-navy)] shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-bold transition sm:px-6 ${
                viewMode === 'map'
                  ? 'bg-white text-[var(--color-navy)] shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
              }`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {/* List View - Mobile Card Layout / Desktop Table */}
      {viewMode === 'list' && (
        <>
          {/* Mobile Card Layout */}
          <div className="space-y-3 md:hidden">
            {properties.map((property) => {
              const metrics = calculateMetrics(property);
              const isDeal = metrics.estProfit > 0 && metrics.recOffer > 0;
              
              return (
                <div
                  key={property.id}
                  onClick={() => handlePropertyClick(property.id)}
                  className="cursor-pointer rounded-[1.4rem] border border-black/6 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition active:scale-[0.98]"
                >
                  {/* Header with Address and Deal Badge */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-[var(--color-navy)]">
                        {property.street_address}
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {property.city}, {property.state} {property.postal_code}
                      </p>
                    </div>
                    {isDeal ? (
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-500">
                        −
                      </span>
                    )}
                  </div>

                  {/* Seller and Status */}
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <span className="font-semibold text-[var(--color-navy)]">
                      {property.lead?.full_name || 'N/A'}
                    </span>
                    <span className="text-[var(--color-muted)]">•</span>
                    <span className="inline-flex rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
                      {property.lead?.status || 'Unknown'}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3 border-t border-black/10 pt-3">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                        ARV
                      </span>
                      <p className="mt-1 text-base font-bold text-[var(--color-navy)]">
                        ${(metrics.estARV / 1000).toFixed(0)}k
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                        Offer
                      </span>
                      <p className="mt-1 text-base font-bold text-[var(--color-navy)]">
                        ${(metrics.recOffer / 1000).toFixed(0)}k
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                        Profit
                      </span>
                      <p className="mt-1 text-base font-bold text-emerald-600">
                        ${(metrics.estProfit / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden overflow-hidden rounded-[1.4rem] border border-black/6 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-black/10 bg-[var(--color-surface-soft)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Seller</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Est. ARV</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Rec. Offer</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Est. Profit</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">Deal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6">
                  {properties.map((property) => {
                    const metrics = calculateMetrics(property);
                    const isDeal = metrics.estProfit > 0 && metrics.recOffer > 0;
                    
                    return (
                      <tr
                        key={property.id}
                        onClick={() => handlePropertyClick(property.id)}
                        className="cursor-pointer transition hover:bg-[var(--color-surface-soft)]"
                      >
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold text-[var(--color-navy)]">
                            {property.street_address}
                          </div>
                          <div className="text-xs text-[var(--color-muted)]">
                            {property.city}, {property.state} {property.postal_code}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--color-navy)]">
                          {property.lead?.full_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex rounded-full bg-[var(--color-accent)]/10 px-2 py-1 text-xs font-semibold text-[var(--color-accent)]">
                            {property.lead?.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--color-navy)]">
                          ${metrics.estARV.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--color-navy)]">
                          ${metrics.recOffer.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--color-navy)]">
                          ${metrics.estProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isDeal ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
                              −
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Map View - Full Screen on Mobile */}
      {viewMode === 'map' && (
        <div className="overflow-hidden rounded-[1.4rem] border border-black/6 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="h-[calc(100vh-200px)] sm:h-[700px]">
            <PropertiesMap properties={properties} onPropertyClick={handlePropertyClick} />
          </div>
        </div>
      )}

      {selectedProperty && (
        <PropertyDetailPanel
          property={selectedProperty}
          onClose={handleCloseDetail}
          onSave={handleSaveNovation}
          calculatorDefaults={undefined} // Will be provided by backend agent's API
        />
      )}
    </div>
  );
}