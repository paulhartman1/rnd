'use client';

import { useEffect, useRef, useState } from 'react';
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
  calculatorDefaults?: Partial<NovationFormData>;
}

export default function PropertyDetailPanel({ property, onClose, onSave, calculatorDefaults }: PropertyDetailPanelProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  if (!property) {
    return null;
  }

  // Handle swipe-to-dismiss on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const currentTouch = e.touches[0].clientY;
    const diff = currentTouch - touchStart;
    
    // Only allow downward swipe
    if (diff > 0) {
      setTouchOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchOffset > 100) {
      // Threshold for dismissing
      onClose();
    }
    setTouchStart(null);
    setTouchOffset(0);
  };

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Build initial values from property data, using null coalescing to preserve undefined
  // This allows the calculator to fall back to defaults properly
  const initialValues: Partial<NovationFormData> = {};
  
  if (property.as_is_market_value !== null) {
    initialValues.as_is_market_value = property.as_is_market_value;
  } else if (property.estimated_value !== null) {
    initialValues.as_is_market_value = property.estimated_value;
  }
  
  if (property.percent_of_market_value !== null) initialValues.percent_of_market_value = property.percent_of_market_value;
  if (property.realtor_fee_percent !== null) initialValues.realtor_fee_percent = property.realtor_fee_percent;
  if (property.double_close_fee_percent !== null) initialValues.double_close_fee_percent = property.double_close_fee_percent;
  if (property.closing_attorney_fee !== null) initialValues.closing_attorney_fee = property.closing_attorney_fee;
  if (property.title_insurance !== null) initialValues.title_insurance = property.title_insurance;
  if (property.efile_fee !== null) initialValues.efile_fee = property.efile_fee;
  if (property.recording_fee !== null) initialValues.recording_fee = property.recording_fee;
  if (property.transfer_tax !== null) initialValues.transfer_tax = property.transfer_tax;
  if (property.flat_fee_listing !== null) initialValues.flat_fee_listing = property.flat_fee_listing;
  if (property.photographer_fee !== null) initialValues.photographer_fee = property.photographer_fee;
  if (property.other_expenses !== null) initialValues.other_expenses = property.other_expenses;
  if (property.repair_costs !== null) initialValues.repair_costs = property.repair_costs;
  if (property.interest_costs !== null) initialValues.interest_costs = property.interest_costs;
  if (property.months_held !== null) initialValues.months_held = property.months_held;
  if (property.desired_profit_access !== null) initialValues.desired_profit_access = property.desired_profit_access;
  if (property.desired_profit_no_access !== null) initialValues.desired_profit_no_access = property.desired_profit_no_access;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/30 transition-opacity" 
        onClick={onClose}
        style={{ opacity: touchOffset > 0 ? Math.max(0, 1 - touchOffset / 300) : 1 }}
      />
      
      {/* Panel - Bottom Sheet on Mobile, Side Panel on Desktop */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="fixed z-50 h-[90vh] overflow-y-auto bg-white shadow-2xl transition-transform md:inset-y-0 md:right-0 md:h-screen md:w-full md:max-w-2xl"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          borderTopLeftRadius: '1.4rem',
          borderTopRightRadius: '1.4rem',
          transform: `translateY(${touchOffset}px)`,
        }}
      >
        {/* Swipe Handle - Mobile Only */}
        <div className="flex justify-center py-2 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-black/20" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-black/10 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-black text-[var(--color-navy)] sm:text-xl">Property Details</h2>
              <p className="mt-1 truncate text-xs text-[var(--color-muted)] sm:text-sm">
                {property.street_address}, {property.city}, {property.state} {property.postal_code}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] shrink-0 rounded-lg border border-black/12 px-3 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 active:bg-black/10"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 p-4 pb-8 sm:space-y-6 sm:p-6">
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
              defaults={calculatorDefaults}
              onSave={onSave ? async (values) => onSave(property.id, values) : undefined}
            />
          </section>
        </div>
      </div>
    </>
  );
}
