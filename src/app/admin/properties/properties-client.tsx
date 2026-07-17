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
    const percentOfMarketValue = property.percent_of_market_value ?? 95;
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
    const desiredProfitAccess = property.desired_profit_access ?? 30000;

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
    const accessMAO = salePrice - totalCosts - desiredProfitAccess;
    const estimatedProfit = salePrice - totalCosts - accessMAO;

    return {
      estARV: asIsMarketValue,
      recOffer: accessMAO,
      estProfit: estimatedProfit,
    };
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
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
          
          {/* View Toggle */}
          <div className="flex gap-1 rounded-lg border border-black/10 bg-[var(--color-surface-soft)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
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
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
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

      {/* List View */}
      {viewMode === 'list' && (
        <div className="overflow-hidden rounded-[1.4rem] border border-black/6 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
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
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="overflow-hidden rounded-[1.4rem] border border-black/6 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <div className="h-[65vh] sm:h-[700px]">
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