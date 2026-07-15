'use client';

import NovationCalculator, { type NovationFormData } from '@/components/admin/NovationCalculator';

type PropertyDetailRow = {
  id: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  property_type_detail: string | null;
  bedroom_count: number | null;
  bathroom_count: number | null;
  total_building_area_sqft: number | null;
  estimated_value: number | null;
  total_assessed_value: number | null;
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
};

interface PropertyDetailPanelProps {
  property: PropertyDetailRow | null;
  onClose: () => void;
  onSave?: (propertyId: string, calculatorData: NovationFormData) => Promise<void>;
}

export default function PropertyDetailPanel({ property, onClose, onSave }: PropertyDetailPanelProps) {
  if (!property) {
    return null;
  }

  const initialValues: Partial<NovationFormData> = {
    as_is_market_value: property.as_is_market_value ?? property.estimated_value ?? 0,
    percent_of_market_value: property.percent_of_market_value ?? 95,
    realtor_fee_percent: property.realtor_fee_percent ?? 3,
    double_close_fee_percent: property.double_close_fee_percent ?? 0.75,
    closing_attorney_fee: property.closing_attorney_fee ?? 0,
    title_insurance: property.title_insurance ?? 0,
    efile_fee: property.efile_fee ?? 0,
    recording_fee: property.recording_fee ?? 0,
    transfer_tax: property.transfer_tax ?? 0,
    flat_fee_listing: property.flat_fee_listing ?? 0,
    photographer_fee: property.photographer_fee ?? 0,
    other_expenses: property.other_expenses ?? 0,
    repair_costs: property.repair_costs ?? 0,
    interest_costs: property.interest_costs ?? 0,
    months_held: property.months_held ?? 0,
    desired_profit_access: property.desired_profit_access ?? 30000,
    desired_profit_no_access: property.desired_profit_no_access ?? 35000,
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-0 z-50 h-screen overflow-y-auto bg-white shadow-2xl md:inset-y-0 md:left-auto md:w-full md:max-w-2xl">
        <div className="sticky top-0 z-10 border-b border-black/10 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-[var(--color-navy)] sm:text-xl">Property Details</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)] sm:text-sm">
                {property.street_address}, {property.city}, {property.state} {property.postal_code}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-black/12 px-3 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 min-h-[44px]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Property Information
            </h3>
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {property.property_type_detail && (
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-muted)]">Type</span>
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
                {property.estimated_value && (
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-muted)]">Estimated Value</span>
                    <p className="mt-1 font-medium">${property.estimated_value.toLocaleString()}</p>
                  </div>
                )}
                {property.total_assessed_value && (
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-muted)]">Assessed Value</span>
                    <p className="mt-1 font-medium">${property.total_assessed_value.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <NovationCalculator
              initialValues={initialValues}
              onSave={onSave ? async (values) => onSave(property.id, values) : undefined}
            />
          </section>
        </div>
      </div>
    </>
  );
}