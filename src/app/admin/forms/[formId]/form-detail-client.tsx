"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import type { FormRow, FormStatus } from "@/lib/forms";
import { getFormStatusName } from "@/lib/forms";
import type { PropertyRow } from "@/lib/properties";
import type { LeadRow } from "@/lib/leads";

type Props = {
  form: FormRow;
  lead: Pick<LeadRow, "id" | "full_name" | "email" | "phone"> | null;
  property: PropertyRow | null;
  allLeads: Pick<LeadRow, "id" | "full_name" | "email">[];
  allProperties: PropertyRow[];
};

export default function FormDetailClient({
  form: initialForm,
  lead,
  property: initialProperty,
  allLeads,
  allProperties,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [property, setProperty] = useState(initialProperty);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [editDraft, setEditDraft] = useState({
    leadId: form.lead_id,
    propertyId: form.property_id || "",
    sellerName: (form.form_data as { seller_name?: string })?.seller_name || lead?.full_name || "",
    propertyAddress: (form.form_data as { property_address?: string })?.property_address || (property ? `${property.street_address}, ${property.city}, ${property.state} ${property.postal_code}` : ""),
    propertyApn: (form.form_data as { property_apn?: string })?.property_apn || property?.apn || "",
    earnestMoney: (form.form_data as { earnest_money?: string })?.earnest_money || "",
    purchasePrice: (form.form_data as { purchase_price?: string })?.purchase_price || "",
    buyerName: (form.form_data as { buyer_name?: string })?.buyer_name || "RUSHANDDUSHLOGISTICS, LLC",
    status: form.status,
  });

  const leadProperties = allProperties.filter((p) => p.lead_id === editDraft.leadId);

  const handleSave = async () => {
    if (!editDraft.purchasePrice) {
      setError("Purchase price is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_data: {
            seller_name: editDraft.sellerName,
            property_address: editDraft.propertyAddress,
            property_apn: editDraft.propertyApn,
            earnest_money: editDraft.earnestMoney || null,
            purchase_price: editDraft.purchasePrice,
            buyer_name: editDraft.buyerName,
            created_date: (form.form_data as { created_date?: string })?.created_date || new Date().toISOString(),
          },
          status: editDraft.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to update form");
        setIsSaving(false);
        return;
      }

      const updatedForm = await response.json();
      setForm(updatedForm);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Error updating form");
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;

      let yPos = margin;

      // Helper to check if we need a new page
      const checkPageBreak = (neededSpace: number) => {
        if (yPos + neededSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
      };

      // Helper to add wrapped text
      const addWrappedText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.4;
        
        checkPageBreak(lines.length * lineHeight + 5);
        
        doc.text(lines, margin, yPos);
        yPos += lines.length * lineHeight + 3;
      };

      // Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Rush N Dush Logistics LLC Purchase Agreement", pageWidth / 2, yPos, { align: "center" });
      yPos += 12;

      // Extract form data
      const sellerName = (form.form_data as { seller_name?: string })?.seller_name || "_______________________";
      const propertyAddress = (form.form_data as { property_address?: string })?.property_address || "_______________________";
      const propertyApn = (form.form_data as { property_apn?: string })?.property_apn || "_______________________";
      const earnestMoney = (form.form_data as { earnest_money?: string })?.earnest_money || "_______";
      const purchasePrice = (form.form_data as { purchase_price?: string })?.purchase_price || "_______";

      // Opening paragraph
      addWrappedText(`Offers to purchase from seller: ${sellerName} the following described real estate at address: ${propertyAddress}`, 9);
      yPos += 2;
      addWrappedText(`Parcel or APN# ${propertyApn} together with all improvements thereon and all appurtenant rights.`, 9);
      yPos += 2;
      addWrappedText(`In consideration of sum of $${earnestMoney} as earnest money due upon completion of inspection period, seller agrees Purchase price $${purchasePrice} payable in cash at closing.`, 9);
      yPos += 6;

      // Conditions of purchase bullet points
      const terms = [
        "The conditions of purchase are as follows Property is sold AS-IS condition with no warranties made by the seller.",
        "Seller will make buyer aware of any known facts that affect the value of the property.",
        "Seller and tenant will make property accessible to show partners, lenders, inspectors, appraisers and contractors prior to closing.",
        "Buyer shall be able to display the property on public websites and databases.",
        "If buyer is unable to complete the purchase for any reason, earnest money deposit shall be forfeited to the seller as total liquidated damages and the buyer is released from any further obligation under this contract.",
        "If seller can not provide a clear title, buyer will be released from any further obligation under this contract; otherwise seller promises to sell under this contract.",
        "Buyer shall select closing agent, closing is to be held in county where property is located. Buyers final vesting to be determined in escrow.",
        "Taxes are to be prorated, any previous years taxes to be paid by seller, all attorney closing fees and customary closing costs shall be paid by buyer.",
        "Closing date shall be on or before 30 days from the date signed below by seller, seller grants any extension needed to clear title or to complete closing documentation.",
        "Title to the above described real estate to be conveyed by warranty deed or other customary instrument of transfer, title is to be free, clear, and unencumbered, free of any county, city and federal liens, all liens against the property shall be paid at closing by the seller.",
        "This offer, when accepted, comprises the entire agreement of purchaser and seller, and it is agreed that no other representations have been made."
      ];

      for (const term of terms) {
        checkPageBreak(20);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("\u2022", margin, yPos);
        const lines = doc.splitTextToSize(term, maxWidth - 6);
        doc.text(lines, margin + 6, yPos);
        yPos += lines.length * 3.6 + 2;
      }

      yPos += 4;

      // Additional terms
      addWrappedText("Buyer can extend closing date", 9, true);
      addWrappedText("10 business day inspection", 9, true);
      addWrappedText("This purchase agreement is assignable", 9, true);
      yPos += 4;

      // Agreement statement
      addWrappedText("By signing below you understand and agree to the terms and conditions of this contract to purchase real estate", 9);
      yPos += 8;

      // Seller Signature section
      checkPageBreak(50);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Seller Signature", margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Two seller signature blocks side by side
      const col1X = margin;
      const col2X = pageWidth / 2 + 5;
      
      // Left seller signature
      doc.text("Printed Name: _______________________", col1X, yPos);
      yPos += 8;
      doc.text("Signature: _______________________", col1X, yPos - 8);
      doc.text("Signature: _______________________", col2X, yPos - 8);
      yPos += 8;
      doc.text("Date: _______________", col1X, yPos - 8);
      doc.text("Date: _______________", col2X, yPos - 8);
      yPos += 8;

      doc.text("Printed Name: _______________________", col2X, yPos - 24);
      yPos += 4;

      // Buyer Signature section
      checkPageBreak(30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Buyer Signature", margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Printed Name: _______________________", margin, yPos);
      yPos += 8;
      doc.text("Signature: _______________________", margin, yPos);
      doc.text("Date: _______________", margin + 120, yPos);

      // Save the PDF
      const fileName = `purchase_agreement_${sellerName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditDraft({
      leadId: form.lead_id,
      propertyId: form.property_id || "",
      sellerName: (form.form_data as { seller_name?: string })?.seller_name || lead?.full_name || "",
      propertyAddress: (form.form_data as { property_address?: string })?.property_address || (property ? `${property.street_address}, ${property.city}, ${property.state} ${property.postal_code}` : ""),
      propertyApn: (form.form_data as { property_apn?: string })?.property_apn || property?.apn || "",
      earnestMoney: (form.form_data as { earnest_money?: string })?.earnest_money || "",
      purchasePrice: (form.form_data as { purchase_price?: string })?.purchase_price || "",
      buyerName: (form.form_data as { buyer_name?: string })?.buyer_name || "RUSHANDDUSHLOGISTICS, LLC",
      status: form.status,
    });
    setError(null);
  };

  const getStatusBadgeColor = (status: FormStatus): string => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "pending_signature":
        return "bg-yellow-100 text-yellow-700";
      case "signed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <>
      <header className="mb-6 rounded-[1.4rem] border border-black/6 bg-white px-6 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Purchase Agreement
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-navy)]">
              {lead?.full_name || "Unknown Lead"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              Created {new Date(form.created_at).toLocaleDateString()} •{" "}
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusBadgeColor(
                  form.status
                )}`}
              >
                {getFormStatusName(form.status)}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generatePDF}
              disabled={isGeneratingPdf}
              className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isGeneratingPdf ? "Generating..." : "📄 Download PDF"}
            </button>
            <Link
              href="/admin/forms"
              className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5"
            >
              ← Back to Forms
            </Link>
          </div>
        </div>
      </header>

      {success && (
        <div className="mb-4 rounded-[1.4rem] border border-green-200 bg-green-50 px-6 py-4 text-sm text-green-700">
          ✓ Form updated successfully
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[1.4rem] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Lead Information */}
        <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <h2 className="mb-4 text-lg font-bold text-[var(--color-navy)]">Seller (Lead) Information</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Name:</span> {lead?.full_name || "Unknown"}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {lead?.email || "N/A"}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {lead?.phone || "N/A"}
            </p>
          </div>
        </div>

        {/* Property Information */}
        {property && (
          <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <h2 className="mb-4 text-lg font-bold text-[var(--color-navy)]">Property Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Address:</span> {property.street_address}
              </p>
              <p>
                <span className="font-semibold">City, State ZIP:</span> {property.city}, {property.state}{" "}
                {property.postal_code}
              </p>
              {property.apn && (
                <p>
                  <span className="font-semibold">APN:</span> {property.apn}
                </p>
              )}
              {property.property_type && (
                <p>
                  <span className="font-semibold">Type:</span> {property.property_type}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Form Details - Editable */}
        <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--color-navy)]">Purchase Agreement Details</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95"
              >
                Edit Form
              </button>
            ) : null}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Seller Name *
                </span>
                <input
                  type="text"
                  value={editDraft.sellerName}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, sellerName: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Property Address *
                </span>
                <textarea
                  value={editDraft.propertyAddress}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, propertyAddress: e.target.value })
                  }
                  rows={2}
                  placeholder="123 Main St, City, State ZIP"
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Parcel or APN#
                </span>
                <input
                  type="text"
                  value={editDraft.propertyApn}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, propertyApn: e.target.value })
                  }
                  placeholder="APN Number"
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Purchase Price *
                </span>
                <input
                  type="text"
                  value={editDraft.purchasePrice}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, purchasePrice: e.target.value })
                  }
                  placeholder="$100,000"
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Earnest Money
                </span>
                <input
                  type="text"
                  value={editDraft.earnestMoney}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, earnestMoney: e.target.value })
                  }
                  placeholder="$5,000"
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Buyer Name
                </span>
                <input
                  type="text"
                  value={editDraft.buyerName}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, buyerName: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Status
                </span>
                <select
                  value={editDraft.status}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, status: e.target.value as FormStatus })
                  }
                  className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-primary-gold)]"
                >
                  <option value="draft">Draft</option>
                  <option value="pending_signature">Pending Signature</option>
                  <option value="signed">Signed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-[var(--color-primary-gold)] px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="rounded-lg border border-black/12 px-4 py-2 text-sm font-bold text-[var(--color-navy)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Seller Name
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--color-navy)]">
                  {(form.form_data as { seller_name?: string })?.seller_name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Property Address
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--color-navy)] whitespace-pre-line">
                  {(form.form_data as { property_address?: string })?.property_address || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Parcel or APN#
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--color-navy)]">
                  {(form.form_data as { property_apn?: string })?.property_apn || "N/A"}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Purchase Price
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--color-navy)]">
                    {(form.form_data as { purchase_price?: string })?.purchase_price || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    Earnest Money
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--color-navy)]">
                    {(form.form_data as { earnest_money?: string })?.earnest_money || "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Buyer Name
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--color-navy)]">
                  {(form.form_data as { buyer_name?: string })?.buyer_name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Date Created
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {(form.form_data as { created_date?: string })?.created_date
                    ? new Date((form.form_data as { created_date: string }).created_date).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="rounded-[1.4rem] border border-black/6 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <h2 className="mb-4 text-lg font-bold text-[var(--color-navy)]">Metadata</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Form ID:</span> {form.id}
            </p>
            <p>
              <span className="font-semibold">Created:</span>{" "}
              {new Date(form.created_at).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold">Last Updated:</span>{" "}
              {new Date(form.updated_at).toLocaleString()}
            </p>
            {form.docusign_envelope_id && (
              <p>
                <span className="font-semibold">DocuSign Envelope ID:</span> {form.docusign_envelope_id}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
