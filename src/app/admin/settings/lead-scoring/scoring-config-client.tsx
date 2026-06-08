'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScoringConfig } from '@/lib/lead-scoring';

interface Props {
  activeConfig: ScoringConfig | null;
  inactiveConfigs: ScoringConfig[];
}

export default function ScoringConfigClient({ activeConfig, inactiveConfigs }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [editedConfig, setEditedConfig] = useState<ScoringConfig | null>(activeConfig);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!activeConfig) {
    return (
      <div className="rounded-[1.4rem] border border-yellow-200 bg-yellow-50 px-6 py-5 text-sm text-yellow-700">
        No active scoring configuration found. Please create one.
      </div>
    );
  }

  const criteria = activeConfig.criteria;

  const handleSave = async () => {
    if (!editedConfig) return;

    try {
      const response = await fetch(`/api/admin/lead-scoring/config/${editedConfig.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_score: editedConfig.base_score,
          criteria: editedConfig.criteria,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update configuration');
      }

      setMessage({ type: 'success', text: 'Configuration updated successfully' });
      setIsEditing(false);
      router.refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/lead-scoring/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to recalculate scores');
      }

      const result = await response.json();
      setMessage({
        type: 'success',
        text: `Successfully recalculated ${result.updatedCount} property scores`,
      });
      router.refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsRecalculating(false);
    }
  };

  const updateCriteriaPoints = (path: string, value: number) => {
    if (!editedConfig) return;

    const newCriteria = { ...editedConfig.criteria };
    const keys = path.split('.');
    
    if (keys.length === 1) {
      // @ts-ignore
      if (newCriteria[keys[0]]) {
        // @ts-ignore
        newCriteria[keys[0]].points = value;
      }
    }

    setEditedConfig({ ...editedConfig, criteria: newCriteria });
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-[1.4rem] border px-6 py-4 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Active Configuration Card */}
      <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-navy)]">
              {activeConfig.config_name}
            </h2>
            {activeConfig.description && (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {activeConfig.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditedConfig(activeConfig);
                  }}
                  className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-gold-dark)] transition-colors"
                >
                  Edit Configuration
                </button>
                <button
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                  className="rounded-lg border border-[var(--color-primary-gold)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-gold)] hover:bg-[var(--color-primary-gold)] hover:text-white transition-colors disabled:opacity-50"
                >
                  {isRecalculating ? 'Recalculating...' : 'Recalculate Scores'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-gold-dark)] transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedConfig(activeConfig);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Base Score */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-[var(--color-navy)]">
                Base Score
              </label>
              <p className="text-xs text-[var(--color-muted)]">
                Starting score before applying criteria
              </p>
            </div>
            {isEditing ? (
              <input
                type="number"
                min="0"
                max="100"
                value={editedConfig?.base_score || 50}
                onChange={(e) =>
                  setEditedConfig(
                    editedConfig ? { ...editedConfig, base_score: parseInt(e.target.value) } : null
                  )
                }
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-bold"
              />
            ) : (
              <div className="text-2xl font-bold text-[var(--color-primary-gold)]">
                {activeConfig.base_score}
              </div>
            )}
          </div>
        </div>

        {/* Scoring Criteria */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--color-navy)]">Scoring Criteria</h3>

          {/* Absentee Owner */}
          {criteria.absentee_owner && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <div className="font-semibold text-[var(--color-navy)]">Absentee Owner</div>
                <div className="text-sm text-[var(--color-muted)]">
                  {criteria.absentee_owner.description}
                </div>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    value={editedConfig?.criteria.absentee_owner?.points || 0}
                    onChange={(e) => updateCriteriaPoints('absentee_owner', parseInt(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center font-bold"
                  />
                  <span className="text-sm text-[var(--color-muted)]">points</span>
                </div>
              ) : (
                <div className="text-xl font-bold text-[var(--color-primary-gold)]">
                  +{criteria.absentee_owner.points}
                </div>
              )}
            </div>
          )}

          {/* Corporate Owner */}
          {criteria.corporate_owner && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <div className="font-semibold text-[var(--color-navy)]">Corporate Owner</div>
                <div className="text-sm text-[var(--color-muted)]">
                  {criteria.corporate_owner.description}
                </div>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    value={editedConfig?.criteria.corporate_owner?.points || 0}
                    onChange={(e) => updateCriteriaPoints('corporate_owner', parseInt(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center font-bold"
                  />
                  <span className="text-sm text-[var(--color-muted)]">points</span>
                </div>
              ) : (
                <div className="text-xl font-bold text-[var(--color-primary-gold)]">
                  +{criteria.corporate_owner.points}
                </div>
              )}
            </div>
          )}

          {/* Out of State Owner */}
          {criteria.out_of_state_owner && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <div className="font-semibold text-[var(--color-navy)]">Out of State Owner</div>
                <div className="text-sm text-[var(--color-muted)]">
                  {criteria.out_of_state_owner.description}
                </div>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    value={editedConfig?.criteria.out_of_state_owner?.points || 0}
                    onChange={(e) => updateCriteriaPoints('out_of_state_owner', parseInt(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center font-bold"
                  />
                  <span className="text-sm text-[var(--color-muted)]">points</span>
                </div>
              ) : (
                <div className="text-xl font-bold text-[var(--color-primary-gold)]">
                  +{criteria.out_of_state_owner.points}
                </div>
              )}
            </div>
          )}

          {/* Equity Ranges */}
          {criteria.equity_ranges && criteria.equity_ranges.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 font-semibold text-[var(--color-navy)]">Equity Ranges</div>
              <div className="space-y-2">
                {criteria.equity_ranges.map((range, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      {range.min}% - {range.max}%
                      {range.description && (
                        <span className="ml-2 text-[var(--color-muted)]">({range.description})</span>
                      )}
                    </div>
                    <div className="font-bold text-[var(--color-primary-gold)]">
                      {range.points > 0 ? '+' : ''}{range.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Property Age */}
          {criteria.property_age && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <div className="font-semibold text-[var(--color-navy)]">Property Age</div>
                <div className="text-sm text-[var(--color-muted)]">
                  {criteria.property_age.description} ({criteria.property_age.min_years}+ years old)
                </div>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    value={editedConfig?.criteria.property_age?.points || 0}
                    onChange={(e) => updateCriteriaPoints('property_age', parseInt(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center font-bold"
                  />
                  <span className="text-sm text-[var(--color-muted)]">points</span>
                </div>
              ) : (
                <div className="text-xl font-bold text-[var(--color-primary-gold)]">
                  +{criteria.property_age.points}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inactive Configurations */}
      {inactiveConfigs.length > 0 && (
        <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <h3 className="mb-4 text-lg font-bold text-[var(--color-navy)]">
            Historical Configurations
          </h3>
          <div className="space-y-2">
            {inactiveConfigs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm"
              >
                <div>
                  <div className="font-semibold">{config.config_name}</div>
                  {config.description && (
                    <div className="text-xs text-[var(--color-muted)]">{config.description}</div>
                  )}
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  Created {new Date(config.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
