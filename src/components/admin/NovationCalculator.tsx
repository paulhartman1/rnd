"use client";

import { useState, useEffect, useCallback } from "react";

interface NovationCalculatorProps {
  initialValues?: Partial<NovationFormData>;
  defaults?: Partial<NovationFormData>;
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

  // New fields for enhanced calculator
  formula_mode?: 'simple' | 'detailed';
  profit_type?: 'fixed' | 'percentage';
  profit_percentage?: number;
  arv_percentage?: number;
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
  formula_mode: 'simple',
  profit_type: 'fixed',
  profit_percentage: 15,
  arv_percentage: 85,
};

type LockableField = 'as_is_market_value' | 'arv_percentage' | 'repair_costs' | 'desired_profit';

export default function NovationCalculator({
  initialValues,
  defaults,
  onSave,
}: NovationCalculatorProps) {
  const defaultValues: NovationFormData = {
    ...DEFAULT_VALUES,
    ...defaults,
  };

  const initialFormData: NovationFormData = {
    ...defaultValues,
    ...initialValues,
  };

  const [formData, setFormData] = useState<NovationFormData>(initialFormData);
  const [history, setHistory] = useState<NovationFormData[]>([initialFormData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formulaMode, setFormulaMode] = useState<'simple' | 'detailed'>(initialFormData.formula_mode || 'simple');
  const [profitType, setProfitType] = useState<'fixed' | 'percentage'>(initialFormData.profit_type || 'fixed');
  const [lockedFields, setLockedFields] = useState<Set<LockableField>>(new Set());
  const [showDetailedCosts, setShowDetailedCosts] = useState(false);

  // Helper to toggle field lock
  const toggleLock = (field: LockableField) => {
    setLockedFields((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        // Ensure at least one field remains unlocked
        if (newSet.size < 3) {
          newSet.add(field);
        }
      }
      return newSet;
    });
  };

  // Calculate current profit value based on type
  const currentProfit = profitType === 'percentage' 
    ? formData.as_is_market_value * ((formData.profit_percentage || 15) / 100)
    : formData.desired_profit_access;

  // Calculate derived values
  const arvPercentage = formData.arv_percentage || 85;
  const salePrice = formulaMode === 'simple'
    ? formData.as_is_market_value * (arvPercentage / 100)
    : formData.as_is_market_value * (formData.percent_of_market_value / 100);
  
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

  const totalCosts = formulaMode === 'simple'
    ? formData.repair_costs
    : realtorFee + doubleCloseFee + fixedCosts + formData.repair_costs;

  // Simple Formula: Offer = (ARV × ARV%) - Rehab - Profit
  const simpleOffer = (formData.as_is_market_value * (arvPercentage / 100)) - formData.repair_costs - currentProfit;

  // Detailed LeadSharks Formula
  const accessMAO = salePrice - totalCosts - formData.desired_profit_access;
  const noAccessMAO = salePrice - totalCosts - formData.desired_profit_no_access - formData.interest_costs;

  const handleInputChange = (field: keyof NovationFormData, value: number) => {
    const newFormData = { 
      ...formData, 
      [field]: value,
      formula_mode: formulaMode,
      profit_type: profitType,
    };
    setFormData(newFormData);
    
    // Add to history, truncating any future states
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newFormData]);
    setHistoryIndex((prev) => prev + 1);
    
    setSaveSuccess(false);
  };

  const handleProfitTypeChange = (newType: 'fixed' | 'percentage') => {
    setProfitType(newType);
    
    // Calculate equivalent value when switching
    const newFormData = { ...formData };
    if (newType === 'percentage') {
      // Convert fixed to percentage
      const percentage = formData.as_is_market_value > 0
        ? (formData.desired_profit_access / formData.as_is_market_value) * 100
        : 15;
      newFormData.profit_percentage = Math.round(percentage * 10) / 10;
    } else {
      // Convert percentage to fixed
      newFormData.desired_profit_access = Math.round(
        formData.as_is_market_value * ((formData.profit_percentage || 15) / 100)
      );
    }
    newFormData.profit_type = newType;
    newFormData.formula_mode = formulaMode;
    
    setFormData(newFormData);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newFormData]);
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setFormData(history[newIndex]);
      setSaveSuccess(false);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setFormData(history[newIndex]);
      setSaveSuccess(false);
    }
  }, [historyIndex, history]);

  const handleResetToDefaults = () => {
    setFormData(defaultValues);
    setHistory([defaultValues]);
    setHistoryIndex(0);
    setSaveSuccess(false);
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="space-y-4">
      {/* Sticky Header with Undo/Redo - Mobile Optimized */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 bg-white px-4 pt-4 pb-3 border-b border-black/10 sm:static sm:mx-0 sm:mt-0 sm:px-0 sm:pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-[var(--color-navy)] sm:text-xl">
            Novation Calculator
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="min-h-[44px] flex-1 sm:flex-none rounded-lg border border-black/10 px-3 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Undo
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="min-h-[44px] flex-1 sm:flex-none rounded-lg border border-black/10 px-3 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Redo →
            </button>
            <div className="hidden sm:block h-6 w-px bg-black/10" />
            <button
              type="button"
              onClick={handleResetToDefaults}
              title="Reset to defaults"
              className="min-h-[44px] rounded-lg border border-black/10 px-3 py-2 text-sm font-bold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/5"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Formula Mode Toggle */}
      <div className="flex gap-2 p-1 bg-[var(--color-surface-soft)] rounded-lg">
        <button
          type="button"
          onClick={() => setFormulaMode('simple')}
          className={`flex-1 min-h-[44px] px-4 py-2 rounded-md text-sm font-bold transition ${
            formulaMode === 'simple'
              ? 'bg-white text-[var(--color-navy)] shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
          }`}
        >
          Simple Mode
        </button>
        <button
          type="button"
          onClick={() => setFormulaMode('detailed')}
          className={`flex-1 min-h-[44px] px-4 py-2 rounded-md text-sm font-bold transition ${
            formulaMode === 'detailed'
              ? 'bg-white text-[var(--color-navy)] shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
          }`}
        >
          Detailed Mode
        </button>
      </div>

      {/* Results Section - Adapts to Formula Mode */}
      {formulaMode === 'simple' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-[var(--color-primary-gold)] bg-[var(--color-primary-gold)]/10 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Calculated Offer
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[var(--color-navy)]">
              ${simpleOffer.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-xs text-[var(--color-muted)]">
              (ARV × {arvPercentage}%) - Rehab - Profit
            </div>
          </div>

          <div className="rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Profit Target
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[var(--color-navy)]">
              {profitType === 'percentage'
                ? `${formData.profit_percentage || 15}%`
                : `$${currentProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </div>
            <div className="mt-1 text-xs text-[var(--color-muted)]">
              {profitType === 'percentage' ? `$${currentProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'Fixed Amount'}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-[var(--color-primary-gold)] bg-[var(--color-primary-gold)]/10 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              ACCESS MAO
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[var(--color-navy)]">
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
            <div className="mt-2 text-2xl sm:text-3xl font-black text-[var(--color-navy)]">
              ${noAccessMAO.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 text-xs text-[var(--color-muted)]">
              Wholesale Deals
            </div>
          </div>
        </div>
      )}

      {/* Simple Mode Inputs */}
      {formulaMode === 'simple' && (
        <div className="space-y-4">
          {/* ARV and ARV % */}
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--color-muted)]">
                    ARV (After Repair Value)
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleLock('as_is_market_value')}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[var(--color-muted)] hover:text-[var(--color-navy)] transition"
                    title={lockedFields.has('as_is_market_value') ? 'Unlock field' : 'Lock field'}
                  >
                    {lockedFields.has('as_is_market_value') ? '🔒' : '🔓'}
                  </button>
                </div>
                <input
                  type="number"
                  value={formData.as_is_market_value}
                  onChange={(e) => handleInputChange("as_is_market_value", Number(e.target.value))}
                  disabled={lockedFields.has('as_is_market_value')}
                  className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)] ${
                    lockedFields.has('as_is_market_value')
                      ? 'border-[var(--color-primary-gold)]/50 bg-[var(--color-primary-gold)]/5'
                      : 'border-black/10'
                  }`}
                />
              </label>
              <label className="block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--color-muted)]">
                    ARV Percentage (%)
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleLock('arv_percentage')}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[var(--color-muted)] hover:text-[var(--color-navy)] transition"
                    title={lockedFields.has('arv_percentage') ? 'Unlock field' : 'Lock field'}
                  >
                    {lockedFields.has('arv_percentage') ? '🔒' : '🔓'}
                  </button>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={arvPercentage}
                  onChange={(e) => handleInputChange("arv_percentage", Number(e.target.value))}
                  disabled={lockedFields.has('arv_percentage')}
                  className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)] ${
                    lockedFields.has('arv_percentage')
                      ? 'border-[var(--color-primary-gold)]/50 bg-[var(--color-primary-gold)]/5'
                      : 'border-black/10'
                  }`}
                />
              </label>
            </div>
          </div>

          {/* Rehab */}
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <label className="block">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[var(--color-muted)]">
                  Rehab / Repair Costs
                </span>
                <button
                  type="button"
                  onClick={() => toggleLock('repair_costs')}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[var(--color-muted)] hover:text-[var(--color-navy)] transition"
                  title={lockedFields.has('repair_costs') ? 'Unlock field' : 'Lock field'}
                >
                  {lockedFields.has('repair_costs') ? '🔒' : '🔓'}
                </button>
              </div>
              <input
                type="number"
                value={formData.repair_costs}
                onChange={(e) => handleInputChange("repair_costs", Number(e.target.value))}
                disabled={lockedFields.has('repair_costs')}
                className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)] ${
                  lockedFields.has('repair_costs')
                    ? 'border-[var(--color-primary-gold)]/50 bg-[var(--color-primary-gold)]/5'
                    : 'border-black/10'
                }`}
              />
            </label>
          </div>

          {/* Profit Type Toggle and Value */}
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-[var(--color-muted)] block mb-2">
                  Profit Type
                </span>
                <div className="flex gap-2 p-1 bg-[var(--color-surface-soft)] rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleProfitTypeChange('fixed')}
                    className={`flex-1 min-h-[44px] px-4 py-2 rounded-md text-sm font-bold transition ${
                      profitType === 'fixed'
                        ? 'bg-white text-[var(--color-navy)] shadow-sm'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
                    }`}
                  >
                    Fixed Dollar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProfitTypeChange('percentage')}
                    className={`flex-1 min-h-[44px] px-4 py-2 rounded-md text-sm font-bold transition ${
                      profitType === 'percentage'
                        ? 'bg-white text-[var(--color-navy)] shadow-sm'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-navy)]'
                    }`}
                  >
                    Percentage
                  </button>
                </div>
              </div>

              <label className="block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--color-muted)]">
                    {profitType === 'fixed' ? 'Profit Amount ($)' : 'Profit Percentage (%)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleLock('desired_profit')}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-[var(--color-muted)] hover:text-[var(--color-navy)] transition"
                    title={lockedFields.has('desired_profit') ? 'Unlock field' : 'Lock field'}
                  >
                    {lockedFields.has('desired_profit') ? '🔒' : '🔓'}
                  </button>
                </div>
                <input
                  type="number"
                  step={profitType === 'percentage' ? '0.1' : '1'}
                  value={profitType === 'fixed' ? formData.desired_profit_access : (formData.profit_percentage || 15)}
                  onChange={(e) => handleInputChange(
                    profitType === 'fixed' ? 'desired_profit_access' : 'profit_percentage',
                    Number(e.target.value)
                  )}
                  disabled={lockedFields.has('desired_profit')}
                  className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)] ${
                    lockedFields.has('desired_profit')
                      ? 'border-[var(--color-primary-gold)]/50 bg-[var(--color-primary-gold)]/5'
                      : 'border-black/10'
                  }`}
                />
              </label>
            </div>
          </div>

          {/* Collapsible Detailed Costs */}
          <button
            type="button"
            onClick={() => setShowDetailedCosts(!showDetailedCosts)}
            className="w-full min-h-[44px] flex items-center justify-between px-4 py-3 rounded-lg border border-black/10 bg-white text-sm font-bold text-[var(--color-navy)] hover:bg-black/5 transition"
          >
            <span>{showDetailedCosts ? 'Hide' : 'Show'} Detailed Costs</span>
            <span className="text-lg">{showDetailedCosts ? '▲' : '▼'}</span>
          </button>
        </div>
      )}

      {/* Detailed Mode or Expanded Simple Mode - Full Form */}
      {(formulaMode === 'detailed' || showDetailedCosts) && (
      <div className="space-y-4">
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
      )}

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
