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

export default function PropertiesClient({ initialProperties }: PropertiesClientProps) {
  const [properties, setProperties] = useState<PropertyWithLead[]>(initialProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="rounded-[1.4rem] border border-black/6 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
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
      </div>

      <div className="overflow-hidden rounded-[1.4rem] border border-black/6 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="h-[65vh] sm:h-[700px]">
          <PropertiesMap properties={properties} onPropertyClick={handlePropertyClick} />
        </div>
      </div>

      {selectedProperty && (
        <PropertyDetailPanel
          property={selectedProperty}
          onClose={handleCloseDetail}
          onSave={handleSaveNovation}
        />
      )}
    </div>
  );
}