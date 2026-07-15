"use client";

import { useState } from "react";

interface NovationCalculatorProps {
  initialValues?: Partial<NovationFormData>;
  onSave?: (values: NovationFormData) => Promise<void>;
}

export interface NovationFormData {
  // Market Value
  as_is_market_value: number;
  percent_of_market_value: number;

  // Percentage-based Costs
  realtor_fee_percent: number;
  double_close_fee_percent: number;

  // Fixed Costs
  closing_attorney_fee: number;
  title_insurance: number;
  efile_fee: number;
  recording_fee: number;
  transfer_tax: number;
  flat_fee_listing: number;
  photographer_fee: number;
  other_expenses: number;

  // Repair & Interest
  repair_costs: number;
  interest_costs: number;
  months_held: number;

  // Desired Profit
  desired_profit_access: number;
  desired_profit_no_access: number;
}

const DEFAULT_VALUES: NovationFormData = {
  as_is_market_value: 0,
  percent_of_market_value: 95,
  realtor_fee_percent: 3,
  double_close_fee_percent: 0.75,
  closing_attorney_fee: 500,
  title_insurance: 500,
  efile_fee: 100,
  recording_fee: 100,
  transfer_tax: 0,
  flat_fee_listing: 400,
  photographer_fee: 150,
  other_expenses: 0,
  repair_costs: 0,
  interest_costs: 0,
  months_held: 6,
  desired_profit_access: 30000,
  desired_profit_no_access: 35000,
};

export default function NovationCalculator({
  initialValues,
  onSave,
}: NovationCalculatorProps) {
  const [formData, setFormData] = useState<NovationFormData>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate derived values
  const salePrice = formData.as_is_market_value * (formData.percent_of_market_value / 100);
  const realtorFee = salePrice * (formData.realtor_fee_percent / 100);
  const doubleCloseFee = salePrice * (formData.double_close_fee_percent / 100);
  
  const fixedCosts =
    formData.closing_attorney_fee +
    formData.title_insurance +
    formData.efile_fee +
    formData.recording_fee +
    formData.transfer_tax +
    formData.flat_fee_listing +
    formData.photographer_fee +
    formData.other_expenses;

  const totalCosts = realtorFee + doubleCloseFee + fixedCosts + formData.repair_costs;

  // LeadSharks Formula
  const accessMAO = salePrice - totalCosts - formData.desired_profit_access;
  const noAccessMAO = salePrice - totalCosts - formData.desired_profit_no_access - formData.interest_costs;

  const handleInputChange = (field: keyof NovationFormData, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await onSave(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-black/10 pb-4">
        <h2 className="text-xl font-black text-[var(--color-navy)]">
          Novation Calculator
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          LeadSharks MAO Formula
        </p>
      </div>

      {/* Results Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-[var(--color-primary-gold)] bg-[var(--color-primary-gold)]/10 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            ACCESS MAO
          </div>
          <div className="mt-2 text-3xl font-black text-[var(--color-navy)]">
            ${accessMAO.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">
            MLS / Access Deals
          </div>
        </div>

        <div className="rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            NO ACCESS MAO
          </div>
          <div className="mt-2 text-3xl font-black text-[var(--color-navy)]">
            ${noAccessMAO.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">
            Wholesale Deals
          </div>
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Market Value Section */}
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="border-b border-black/10 bg-[var(--color-surface-soft)] px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Market Value
            </h3>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                As-Is Market Value
              </span>
              <input
                type="number"
                value={formData.as_is_market_value}
                onChange={(e) => handleInputChange("as_is_market_value", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Percent of Market Value (%)
              </span>
              <input
                type="number"
                step="0.1"
                value={formData.percent_of_market_value}
                onChange={(e) => handleInputChange("percent_of_market_value", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <div className="sm:col-span-2">
              <div className="rounded-lg bg-[var(--color-surface-soft)] px-3 py-2 text-sm">
                <span className="text-[var(--color-muted)]">Sale Price:</span>{" "}
                <span className="font-semibold text-[var(--color-navy)]">
                  ${salePrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Percentage-Based Costs */}
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="border-b border-black/10 bg-[var(--color-surface-soft)] px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Percentage-Based Costs
            </h3>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Realtor Fee (%)
              </span>
              <input
                type="number"
                step="0.1"
                value={formData.realtor_fee_percent}
                onChange={(e) => handleInputChange("realtor_fee_percent", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Double Close Fee (%)
              </span>
              <input
                type="number"
                step="0.01"
                value={formData.double_close_fee_percent}
                onChange={(e) => handleInputChange("double_close_fee_percent", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <div className="sm:col-span-2 space-y-1 rounded-lg bg-[var(--color-surface-soft)] px-3 py-2 text-sm">
              <div>
                <span className="text-[var(--color-muted)]">Realtor Fee:</span>{" "}
                <span className="font-semibold text-[var(--color-navy)]">
                  ${realtorFee.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">Double Close Fee:</span>{" "}
                <span className="font-semibold text-[var(--color-navy)]">
                  ${doubleCloseFee.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Costs */}
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="border-b border-black/10 bg-[var(--color-surface-soft)] px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Fixed Costs
            </h3>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Closing Attorney Fee
              </span>
              <input
                type="number"
                value={formData.closing_attorney_fee}
                onChange={(e) => handleInputChange("closing_attorney_fee", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Title Insurance
              </span>
              <input
                type="number"
                value={formData.title_insurance}
                onChange={(e) => handleInputChange("title_insurance", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                E-File Fee
              </span>
              <input
                type="number"
                value={formData.efile_fee}
                onChange={(e) => handleInputChange("efile_fee", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Recording Fee
              </span>
              <input
                type="number"
                value={formData.recording_fee}
                onChange={(e) => handleInputChange("recording_fee", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Transfer Tax
              </span>
              <input
                type="number"
                value={formData.transfer_tax}
                onChange={(e) => handleInputChange("transfer_tax", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Flat Fee Listing
              </span>
              <input
                type="number"
                value={formData.flat_fee_listing}
                onChange={(e) => handleInputChange("flat_fee_listing", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Photographer Fee
              </span>
              <input
                type="number"
                value={formData.photographer_fee}
                onChange={(e) => handleInputChange("photographer_fee", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Other Expenses
              </span>
              <input
                type="number"
                value={formData.other_expenses}
                onChange={(e) => handleInputChange("other_expenses", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <div className="sm:col-span-2">
              <div className="rounded-lg bg-[var(--color-surface-soft)] px-3 py-2 text-sm">
                <span className="text-[var(--color-muted)]">Total Fixed Costs:</span>{" "}
                <span className="font-semibold text-[var(--color-navy)]">
                  ${fixedCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Repairs & Interest */}
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="border-b border-black/10 bg-[var(--color-surface-soft)] px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Repairs & Interest
            </h3>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Repair Costs
              </span>
              <input
                type="number"
                value={formData.repair_costs}
                onChange={(e) => handleInputChange("repair_costs", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Months Held
              </span>
              <input
                type="number"
                value={formData.months_held}
                onChange={(e) => handleInputChange("months_held", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                Interest Costs (NO ACCESS scenario)
              </span>
              <input
                type="number"
                value={formData.interest_costs}
                onChange={(e) => handleInputChange("interest_costs", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
          </div>
        </div>

        {/* Desired Profit */}
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="border-b border-black/10 bg-[var(--color-surface-soft)] px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Desired Profit
            </h3>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                ACCESS Profit Target
              </span>
              <input
                type="number"
                value={formData.desired_profit_access}
                onChange={(e) => handleInputChange("desired_profit_access", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                NO ACCESS Profit Target
              </span>
              <input
                type="number"
                value={formData.desired_profit_no_access}
                onChange={(e) => handleInputChange("desired_profit_no_access", Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
              />
            </label>
          </div>
        </div>

        {/* Cost Breakdown Summary */}
        <div className="rounded-xl border border-black/10 bg-[var(--color-surface-soft)] p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Cost Breakdown
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Sale Price:</span>
              <span className="font-semibold text-[var(--color-navy)]">
                ${salePrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Realtor Fee:</span>
              <span className="font-semibold text-[var(--color-navy)]">
                -${realtorFee.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Double Close Fee:</span>
              <span className="font-semibold text-[var(--color-navy)]">
                -${doubleCloseFee.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Fixed Costs:</span>
              <span className="font-semibold text-[var(--color-navy)]">
                -${fixedCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Repair Costs:</span>
              <span className="font-semibold text-[var(--color-navy)]">
                -${formData.repair_costs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2 font-bold">
              <span className="text-[var(--color-navy)]">Total Costs:</span>
              <span className="text-[var(--color-navy)]">
                ${totalCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button (if onSave provided) */}
      {onSave && (
        <div className="border-t border-black/10 pt-4">
          {saveError && (
            <p className="mb-3 text-sm text-red-700">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="mb-3 text-sm text-emerald-700">✓ Saved successfully!</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-lg bg-[var(--color-primary-gold)] px-4 py-2.5 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          >
            {isSaving ? "Saving..." : "Save Calculations"}
          </button>
        </div>
      )}
    </div>
  );
}
