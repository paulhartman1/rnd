"use client";

import { useState } from "react";
import {
  LeadPhone,
  PhoneValidationStatus,
  validationStatusColors,
  validationStatusLabels,
} from "@/lib/lead-phones";

type Props = {
  leadId: string;
  phones: LeadPhone[];
  currentCallPhoneId: string | null;
  onCallPhone: (phone: LeadPhone) => void;
  onUpdateValidation: (
    phoneId: string,
    status: PhoneValidationStatus,
    notes?: string,
  ) => Promise<void>;
  onSetPrimary: (phoneId: string) => Promise<void>;
  isCallActive: boolean;
  disabled?: boolean;
};

export default function PhoneSelector({
  leadId,
  phones,
  currentCallPhoneId,
  onCallPhone,
  onUpdateValidation,
  onSetPrimary,
  isCallActive,
  disabled = false,
}: Props) {
  const [validatingPhoneId, setValidatingPhoneId] = useState<string | null>(
    null,
  );
  const [validationStatus, setValidationStatus] =
    useState<PhoneValidationStatus>("valid");
  const [validationNotes, setValidationNotes] = useState("");

  const handleValidate = async (phoneId: string) => {
    await onUpdateValidation(phoneId, validationStatus, validationNotes);
    setValidatingPhoneId(null);
    setValidationNotes("");
    setValidationStatus("valid");
  };

  const sortedPhones = [...phones].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.display_order - b.display_order;
  });

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">Phone Numbers</h4>
      {sortedPhones.length === 0 ? (
        <p className="text-sm text-gray-500">No phone numbers available</p>
      ) : (
        <div className="space-y-2">
          {sortedPhones.map((phone) => {
            const colors = validationStatusColors[phone.validation_status];
            const isCurrentCall = currentCallPhoneId === phone.id;
            const canCall =
              !isCallActive && !phone.is_dnc && !disabled;

            return (
              <div
                key={phone.id}
                className={`rounded-lg border p-3 ${
                  isCurrentCall
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`tel:${phone.phone_number.replace(/\D/g, "")}`}
                        className="font-mono text-sm font-medium text-blue-600 hover:underline"
                      >
                        {phone.phone_number}
                      </a>
                      {phone.is_primary && (
                        <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                          PRIMARY
                        </span>
                      )}
                      {phone.is_dnc && (
                        <span className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-bold text-white">
                          DNC
                        </span>
                      )}
                      {phone.phone_type && (
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                          {phone.phone_type}
                        </span>
                      )}
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {validationStatusLabels[phone.validation_status]}
                      </span>
                      {isCurrentCall && (
                        <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white animate-pulse">
                          CALLING
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{phone.call_attempts} attempts</span>
                      {phone.last_called_at && (
                        <span>
                          Last called:{" "}
                          {new Date(phone.last_called_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {phone.validation_notes && (
                      <p className="text-xs text-gray-600 italic">
                        Note: {phone.validation_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {canCall && (
                      <button
                        onClick={() => onCallPhone(phone)}
                        className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Call
                      </button>
                    )}
                    {phone.is_dnc && !isCallActive && !disabled && (
                      <button
                        onClick={() => {
                          if (confirm(
                            `⚠️ DNC WARNING\n\nThis number is marked as Do Not Call.\n\nCalling this number may violate federal regulations.\n\nAre you absolutely sure you want to proceed?`
                          )) {
                            onCallPhone(phone);
                          }
                        }}
                        className="rounded bg-yellow-600 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-700"
                      >
                        Override DNC
                      </button>
                    )}
                  </div>
                </div>

                {/* Validation controls - show after call ends */}
                {!isCallActive && !disabled && (
                  <div className="mt-2 border-t border-gray-200 pt-2">
                    {validatingPhoneId === phone.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={validationStatus}
                            onChange={(e) =>
                              setValidationStatus(
                                e.target.value as PhoneValidationStatus,
                              )
                            }
                            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                          >
                            <option value="valid">✓ Valid</option>
                            <option value="invalid">✗ Invalid</option>
                            <option value="disconnected">
                              ✗ Disconnected
                            </option>
                            <option value="wrong_number">
                              ✗ Wrong Number
                            </option>
                          </select>
                          <button
                            onClick={() => handleValidate(phone.id)}
                            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setValidatingPhoneId(null);
                              setValidationNotes("");
                              setValidationStatus("valid");
                            }}
                            className="rounded bg-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                        {validationStatus !== "valid" && (
                          <input
                            type="text"
                            placeholder="Notes (optional)"
                            value={validationNotes}
                            onChange={(e) => setValidationNotes(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setValidatingPhoneId(phone.id)}
                          className="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                        >
                          Update Status
                        </button>
                        {!phone.is_primary &&
                          phone.validation_status === "valid" && (
                            <button
                              onClick={() => onSetPrimary(phone.id)}
                              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Set as Primary
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
