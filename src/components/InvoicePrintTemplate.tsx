import React from "react";
import { Invoice, Business, Customer } from "../types";

interface Props {
  invoice: Invoice;
  business: Business;
  customer: Customer;
  templateStyle: "modern" | "classic" | "thermal";
  isPremium: boolean;
}

export default function InvoicePrintTemplate({
  invoice,
  business,
  customer,
  templateStyle,
  isPremium,
}: Props) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Generate real UPI Pay payload
  const upiUrl = business.upiId
    ? `upi://pay?pa=${encodeURIComponent(business.upiId)}&pn=${encodeURIComponent(
        business.name
      )}&am=${invoice.totalAmount}&tn=INV-${invoice.invoiceNumber}&cu=INR`
    : "";

  const qrImageUrl = upiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`
    : "";

  // Helper checks for GST routing
  const isSameState = business.stateCode && customer.stateCode && business.stateCode === customer.stateCode;

  // Render Compact Thermal style
  if (templateStyle === "thermal") {
    return (
      <div id="thermal-print-area" className="w-[80mm] p-4 bg-white text-black font-mono text-xs border border-gray-300 mx-auto select-all shadow-sm">
        <div className="text-center border-b border-dashed border-gray-400 pb-2">
          <h2 className="text-sm font-black uppercase">{business.name}</h2>
          {business.gstin && <p className="text-[10px]">GSTIN: {business.gstin}</p>}
          <p className="text-[10px]">{business.address}</p>
          <p className="text-[10px]">Ph: {business.phone}</p>
        </div>

        <div className="py-2 border-b border-dashed border-gray-400 text-[10px]">
          <p><strong>BILL TO:</strong> {customer.name}</p>
          {customer.phone && <p>Ph: {customer.phone}</p>}
          <p><strong>NO:</strong> {invoice.invoiceNumber}</p>
          <p><strong>DATE:</strong> {invoice.date}</p>
          <p><strong>TYPE:</strong> {invoice.type.toUpperCase()}</p>
        </div>

        <table className="w-full text-left my-2 text-[10px]">
          <thead>
            <tr className="border-b border-dashed border-gray-400">
              <th className="py-1">ITEM</th>
              <th className="py-1 text-right">QTY</th>
              <th className="py-1 text-right">VAL</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, idx) => (
              <tr key={idx} className="border-b border-dotted border-gray-200">
                <td className="py-1">
                  {it.description}
                  {it.hsnSac && <span className="block text-[8px] woolly-cat">HSN: {it.hsnSac} ({it.gstRate}%)</span>}
                </td>
                <td className="py-1 text-right">{it.quantity}</td>
                <td className="py-1 text-right">{formatCurrency(it.rate * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right space-y-1 text-[10px] border-b border-dashed border-gray-400 pb-2">
          <p>Discount: {formatCurrency(invoice.discount)}</p>
          {invoice.cgst > 0 && <p>CGST: {formatCurrency(invoice.cgst)}</p>}
          {invoice.sgst > 0 && <p>SGST: {formatCurrency(invoice.sgst)}</p>}
          {invoice.igst > 0 && <p>IGST: {formatCurrency(invoice.igst)}</p>}
          <p className="text-xs font-bold font-sans">TOTAL: {formatCurrency(invoice.totalAmount)}</p>
        </div>

        {business.upiId && (
          <div className="text-center pt-3 flex flex-col items-center">
            <p className="text-[9px] mb-1">SCAN TO PAY (UPI)</p>
            <img src={qrImageUrl} alt="UPI Pay QR" className="w-24 h-24 border p-1 rounded bg-white" referrerPolicy="no-referrer" />
            <p className="text-[8px] mt-1 text-gray-500">{business.upiId}</p>
          </div>
        )}

        {business.bankAccountNumber && (
          <div className="mt-3 text-[9px] border-t border-dashed border-gray-400 pt-2">
            <p><strong>BANK DETAILS:</strong></p>
            <p>A/C: {business.bankAccountNumber}</p>
            <p>IFSC: {business.bankIfsc}</p>
            <p>Bank: {business.bankName}</p>
          </div>
        )}

        <div className="text-center mt-4 text-[9px] text-gray-400 border-t border-dashed border-gray-400 pt-2">
          <p>Thank You! Visit Again.</p>
          {!isPremium && <p className="text-[8px] italic font-sans">Watermark: Powered by VyaparFlow Free</p>}
        </div>
      </div>
    );
  }

  // Modern & Classic Styles
  const isModern = templateStyle === "modern";
  const primaryBg = isModern ? "bg-slate-900" : "bg-emerald-800";
  const textPrimary = isModern ? "text-slate-900" : "text-emerald-800";
  const borderPrimary = isModern ? "border-slate-300" : "border-emerald-300";

  return (
    <div id="print-area" className="w-full max-w-4xl p-8 bg-white text-gray-800 rounded-xl border border-gray-100 shadow-md relative leading-relaxed">
      
      {/* Premium Watermark Tag */}
      {!isPremium && (
        <div className="absolute top-0 right-0 left-0 bg-amber-500 text-white text-[11px] font-medium tracking-wider text-center py-1 rounded-t-xl select-none">
          ⚡ GENERATED VIA VYAPARFLOW FREE PLAN — UPGRADE TO REMOVE WATERMARK
        </div>
      )}

      {/* Invoice Header */}
      <div className="flex flex-col md:flex-row justify-between items-start pt-4 border-b pb-6 mb-6">
        <div>
          {business.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-14 object-contain mb-3"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`px-4 py-2 rounded-lg text-white font-black tracking-wider text-xl mb-3 inline-block uppercase ${primaryBg}`}>
              {business.name.slice(0, 2)}
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-sm mt-1 text-gray-500 max-w-sm whitespace-pre-line">{business.address}</p>
          {business.gstin && (
            <p className="text-xs text-brand font-mono font-semibold mt-2 px-2 py-1 bg-gray-100 rounded inline-block">
              GSTIN: {business.gstin}
            </p>
          )}
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {business.email && <p>Email: {business.email}</p>}
            {business.phone && <p>Mobile: {business.phone}</p>}
          </div>
        </div>

        <div className="text-right mt-6 md:mt-0 space-y-2">
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest inline-block ${invoice.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
            {invoice.status}
          </div>
          <h2 className={`text-5xl font-extrabold uppercase tracking-tight ${textPrimary}`}>
            {invoice.type === "GST Invoice" ? "TAX INVOICE" : invoice.type}
          </h2>
          <div className="text-sm text-gray-600 font-mono space-y-1">
            <p className="font-bold text-gray-900">Document No: {invoice.invoiceNumber}</p>
            <p>Date: {invoice.date}</p>
            <p className="text-red-600 font-bold">Due Date: {invoice.dueDate}</p>
          </div>
        </div>
      </div>

      {/* NIC Government e-Invoice (IRN) e-Way bill banner */}
      {invoice.eInvoiceStatus === "Generated" && (
        <div className="mb-6 p-4 bg-indigo-50/40 border-2 border-dashed border-indigo-250 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-3 space-y-1 font-mono text-[11px] text-slate-700">
            <div className="flex items-center gap-1.5 text-indigo-850 font-extrabold uppercase tracking-widest text-[10px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              NIC Government e-Invoice System (GST Compliant IRN Verified)
            </div>
            <p className="break-all text-[9.5px] font-semibold mt-1"><strong>IRN:</strong> {invoice.irnNumber}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] mt-2 pt-1 border-t border-indigo-150 text-slate-600">
              <p><strong>Ack Number:</strong> {invoice.ackNumber}</p>
              <p><strong>Ack Date:</strong> {invoice.ackDate}</p>
              <p><strong>e-Way Bill Number:</strong> <span className="font-bold text-slate-900">{invoice.eWayBillNo}</span></p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-indigo-150 shadow-xs">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                `IRN:${invoice.irnNumber}|Ack:${invoice.ackNumber}|GovSupply:${invoice.totalAmount}`
              )}`}
              alt="Signed e-Invoice QR"
              className="w-16 h-16 p-0.5 rounded"
              referrerPolicy="no-referrer"
            />
            <span className="text-[8px] text-gray-400 font-bold mt-1 font-sans">Gov Signed</span>
          </div>
        </div>
      )}

      {/* Bill To Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Billed To (Receiver)</h3>
          <p className="text-lg font-bold text-gray-900">{customer.name}</p>
          <p className="text-sm text-gray-600 font-mono mt-1 whitespace-pre-line">{customer.address}</p>
          {customer.gstin && (
            <p className="text-xs text-indigo-700 font-mono mt-2 py-0.5 px-1.5 bg-indigo-50 rounded inline-block font-semibold">
              GSTIN: {customer.gstin}
            </p>
          )}
          <div className="text-xs text-gray-500 mt-2 space-y-0.5">
            {customer.phone && <p>Mobile: {customer.phone}</p>}
            {customer.email && <p>Email: {customer.email}</p>}
          </div>
        </div>

        <div className="p-4 border rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Transport / Shipping Notes</h4>
            <p className="text-xs text-gray-500 italic">
              Dispatch Place code: IN-{business.stateCode || "State Office"}<br />
              Supply Place: IN-{customer.stateCode || "Customer Office"}<br />
              Tax payable reverse charges: No
            </p>
          </div>
          <div className="pt-4 border-t border-dotted mt-4 text-xs font-mono text-gray-500">
            GST Supply Routing: <span className="font-semibold">{isSameState ? "Intra-State (CGST + SGST)" : "Inter-State (IGST)"}</span>
          </div>
        </div>
      </div>

      {/* Table Items */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={`text-white uppercase text-xs font-bold tracking-wider ${primaryBg}`}>
              <th className="py-3 px-4 rounded-l-md">#</th>
              <th className="py-3 px-4">Particulars / Description</th>
              <th className="py-3 px-4 text-center">HSN/SAC</th>
              <th className="py-3 px-4 text-right">Rate (₹)</th>
              <th className="py-3 px-4 text-right">Qty</th>
              <th className="py-3 px-4 text-right">GST %</th>
              <th className="py-3 px-4 text-right rounded-r-md">Net Value</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4 font-mono font-medium text-gray-400">{idx + 1}</td>
                <td className="py-4 px-4 font-medium text-gray-900">
                  {it.description}
                </td>
                <td className="py-4 px-4 text-center font-mono text-xs">{it.hsnSac || "—"}</td>
                <td className="py-4 px-4 text-right font-mono">{formatCurrency(it.rate)}</td>
                <td className="py-4 px-4 text-right font-mono">{it.quantity}</td>
                <td className="py-4 px-4 text-right font-mono text-indigo-700">{it.gstRate}%</td>
                <td className="py-4 px-4 text-right font-mono font-bold">{formatCurrency(it.rate * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Accounting totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 items-start">
        <div className="space-y-4">
          {/* UPI Code container */}
          {business.upiId && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100/30 rounded-xl flex items-center gap-4">
              <img
                src={qrImageUrl}
                alt="UPI pay QR"
                className="w-24 h-24 border p-1 rounded-md bg-white shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Scan & Pay securely via UPI</h5>
                <p className="text-xs text-gray-600 font-medium">Auto-generated for exact bill amount</p>
                <p className="text-xs text-indigo-600 font-mono font-semibold">{business.upiId}</p>
                <div className="flex gap-2 text-[10px] font-bold text-gray-400 uppercase pt-1">
                  <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Bank details */}
          <div className="text-xs text-gray-500 space-y-2">
            {business.bankAccountNumber && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-bold text-gray-700 block mb-1">🏦 DIRECT BANK TRANSFER:</span>
                <p>Account Name: {business.name}</p>
                <p>A/C Number: {business.bankAccountNumber}</p>
                <p>IFSC Code: {business.bankIfsc}</p>
                <p>Bank Name: {business.bankName}</p>
              </div>
            )}
            {invoice.notes && (
              <p className="whitespace-pre-line leading-relaxed">
                <strong>Notes:</strong> {invoice.notes}
              </p>
            )}
            {invoice.terms && (
              <p className="whitespace-pre-line leading-relaxed">
                <strong>Terms & Conditions:</strong> {invoice.terms}
              </p>
            )}
          </div>
        </div>

        {/* Computations list */}
        <div className="bg-slate-50 p-6 rounded-xl space-y-3 font-mono text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Sub-Total:</span>
            <span>{formatCurrency(invoice.totalAmount - invoice.cgst - invoice.sgst - invoice.igst + invoice.discount)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Discount Allowed (₹):</span>
              <span>-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          {invoice.cgst > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Central GST (CGST):</span>
              <span>{formatCurrency(invoice.cgst)}</span>
            </div>
          )}
          {invoice.sgst > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>State GST (SGST):</span>
              <span>{formatCurrency(invoice.sgst)}</span>
            </div>
          )}
          {invoice.igst > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Integrated GST (IGST):</span>
              <span>{formatCurrency(invoice.igst)}</span>
            </div>
          )}
          {invoice.shipping > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Shipping / Delivery:</span>
              <span>{formatCurrency(invoice.shipping)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-black font-sans text-gray-950">
            <span>Grand Total (INR):</span>
            <span className={textPrimary}>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="pt-2 text-right text-[10px] text-gray-400 capitalize whitespace-normal leading-tight font-sans">
            Total in words: Indian Rupees Only
          </div>
        </div>
      </div>

      {/* Signature and legal stamp */}
      <div className="flex justify-between items-end pt-8 border-t border-dashed mt-8">
        <div className="text-[11px] text-gray-400 font-mono">
          © VyaparFlow — Secure Digital Bill • Verified Legally
        </div>
        <div className="text-center">
          {business.signatureUrl ? (
            <img
              src={business.signatureUrl}
              alt="Signature"
              className="h-10 object-contain mx-auto mb-1"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-10"></div>
          )}
          <div className="border-t w-48 pt-1 text-xs text-gray-600 font-semibold font-mono">
            Authorized Signatory For
            <span className="block font-bold text-gray-900 uppercase text-[10px]">{business.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
