import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Download, Printer } from "lucide-react";
import toast from "react-hot-toast";

// A4 Invoice Component for printing — Professional Blue Theme
const INVOICE_BLUE = "#4b4b4bff";

// Convert a number to English words (supports up to crores)
function numberToWords(n) {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const num = Math.round(parseFloat(n) || 0);
  if (num === 0) return 'Zero';
  const toWords = (num) => {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + toWords(num % 100) : '');
    if (num < 100000) return toWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + toWords(num % 1000) : '');
    if (num < 10000000) return toWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + toWords(num % 100000) : '');
    return toWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + toWords(num % 10000000) : '');
  };
  return toWords(num);
}

const InvoicePrint = React.forwardRef(({ bill, companyDetails }, ref) => {
  if (!bill) return null;

  const advancePaid = bill.payments
    ? bill.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    : 0;
  const finalTotal = parseFloat(bill.subtotal) - advancePaid;

  const fmt = (val) =>
    parseFloat(val).toLocaleString("en-LK", { minimumFractionDigits: 2 });

  return (
    <div
      ref={ref}
      className="invoice-a4-sheet bg-white w-[210mm] mx-auto text-[13px] leading-normal text-gray-800"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact", fontFamily: "'Roboto', sans-serif" }}
    >
      <div className="px-10 pt-6 pb-4">
        {/* ====== HEADER ====== */}
        <div className="flex justify-between items-start mb-1">
          <div>
            <img
              src="/printlogo.png"
              alt="Printify Hub Logo"
              style={{ height: "85px", width: "auto", marginBottom: "0px", objectFit: "contain" }}
            />
            <h1 className="text-[26px] font-bold text-gray-900 mb-2 leading-tight">
              {companyDetails.name}
            </h1>
            <div className="text-[14px] text-gray-600 mt-1 space-y-px">
              <p className="font-bold">{companyDetails.ownerName}</p>
              <p className="font-bold">{companyDetails.address}</p>
              <p className="font-bold">Phone: {companyDetails.phone}</p>
            </div>
          </div>
          <div>
            <h2
              className="text-[38px] font-bold tracking-wide leading-none"
              style={{ color: INVOICE_BLUE }}
            >
              INVOICE
            </h2>
          </div>
        </div>

        {/* ====== INVOICE # / DATE  +  BILL TO / CUSTOMER ID / TERMS ====== */}
        <div className="flex justify-between items-start mt-4 gap-6">
          {/* Left: Bill To */}
          <div className="flex-1">
            <table className="border-collapse w-full">
              <thead>
                <tr>
                  <th
                    className="text-left text-white text-[11px] font-semibold px-3 py-1.25 tracking-wide"
                    style={{ background: INVOICE_BLUE }}
                    colSpan={2}
                  >
                    BILL TO
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 pt-1.25 pb-0 text-[13px] font-semibold" colSpan={2}>
                    {bill.customer_name}
                  </td>
                </tr>
                {bill.address && (
                  <tr>
                    <td className="px-3 py-0.5 text-[11.5px] text-gray-600" colSpan={2}>
                      {bill.address}
                    </td>
                  </tr>
                )}
                {bill.phone && (
                  <tr>
                    <td className="px-3 py-0.5 text-[11.5px] text-gray-600">
                      <span className="font-medium">Contact No:</span> {bill.phone}
                    </td>
                  </tr>
                )}
                {bill.email && (
                  <tr>
                    <td className="px-3 py-0.5 pb-1.5 text-[11.5px] text-gray-600">
                      <span className="font-medium">Email:</span> {bill.email}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right: Invoice # / Date  +  Customer ID / Terms */}
          <div className="space-y-2">
            {/* Invoice # / Date */}
            <table className="border-collapse" style={{ minWidth: 280 }}>
              <thead>
                <tr>
                  <th
                    className="text-center text-white text-[11px] font-semibold px-4 py-1.25 tracking-wide"
                    style={{ background: INVOICE_BLUE, width: 140 }}
                  >
                    INVOICE #
                  </th>
                  <th
                    className="text-center text-white text-[11px] font-semibold px-4 py-1.25 tracking-wide"
                    style={{ background: INVOICE_BLUE, width: 140 }}
                  >
                    DATE
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center px-4 py-1.25 text-[13px]">
                    {bill.bill_number}
                  </td>
                  <td className="text-center px-4 py-1.25 text-[13px]">
                    {new Date(bill.bill_date).toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Customer ID / Time */}
            <table className="border-collapse" style={{ minWidth: 280 }}>
              <thead>
                <tr>
                  <th
                    className="text-center text-white text-[11px] font-semibold px-4 py-1.25 tracking-wide"
                    style={{ background: INVOICE_BLUE, width: 140 }}
                  >
                    CUSTOMER ID
                  </th>
                  <th
                    className="text-center text-white text-[11px] font-semibold px-4 py-1.25 tracking-wide"
                    style={{ background: INVOICE_BLUE, width: 140 }}
                  >
                    TIME
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center px-4 py-1.25 text-[13px]">
                    C{String(bill.customer_id).padStart(4, "0")}
                  </td>
                  <td className="text-center px-4 py-1.25 text-[13px]">
                    {(() => {
                      // Use bill_time if stored, otherwise extract from created_at
                      let timeStr = bill.bill_time;
                      if (!timeStr && bill.created_at) {
                        const d = new Date(bill.created_at);
                        timeStr = `${d.getHours()}:${d.getMinutes()}`;
                      }
                      if (!timeStr) return '—';
                      const [h, m] = timeStr.split(':').map(Number);
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      const hour12 = h % 12 || 12;
                      return `${String(hour12).padStart(2, '0')}.${String(m).padStart(2, '0')} ${ampm}`;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ====== ITEMS TABLE ====== */}
        <table className="w-full mt-8 border-collapse">
          <thead>
            <tr>
              <th
                className="text-left text-white text-[11px] font-semibold px-3 py-1.5 tracking-wide"
                style={{ background: INVOICE_BLUE, width: "50%" }}
              >
                DESCRIPTION
              </th>
              <th
                className="text-center text-white text-[11px] font-semibold px-3 py-1.5 tracking-wide"
                style={{ background: INVOICE_BLUE, width: "10%" }}
              >
                QTY
              </th>
              <th
                className="text-right text-white text-[11px] font-semibold px-3 py-1.5 tracking-wide"
                style={{ background: INVOICE_BLUE, width: "18%" }}
              >
                UNIT PRICE
              </th>
              <th
                className="text-right text-white text-[11px] font-semibold px-3 py-1.5 tracking-wide"
                style={{ background: INVOICE_BLUE, width: "22%" }}
              >
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {bill.items &&
              bill.items.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200"
                >
                  <td className="px-3 py-1.5 text-[12.5px]">
                    {(() => {
                      let descText = item.description || '';
                      let datePart = '';
                      let paperPart = '';

                      // Extract date separated by | 
                      const dateMatch = descText.match(/\|\s*(\d{2}-[A-Za-z]{3})\s*$/);
                      if (dateMatch) {
                        datePart = dateMatch[1];
                        descText = descText.substring(0, dateMatch.index).trim();
                      } else {
                        // Fallback check if \n was used previously
                        const dateMatchN = descText.match(/\n\s*(\d{2}-[A-Za-z]{3})\s*$/);
                        if (dateMatchN) {
                            datePart = dateMatchN[1];
                            descText = descText.substring(0, dateMatchN.index).trim();
                        }
                      }

                      // Check for paper size at the end of the remaining description
                      const paperMatch = descText.match(/(\(\s*[A-Za-z0-9:]+(?:\s+[A-Za-z0-9:]+)*\s*\))$/);
                      if (paperMatch) {
                        paperPart = paperMatch[1];
                        descText = descText.substring(0, paperMatch.index).trim();
                      }

                      if (paperPart || datePart) {
                        return (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{descText}</span>
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginLeft: '8px' }}>
                              {paperPart && <span style={{ whiteSpace: 'nowrap' }}>{paperPart}</span>}
                              {datePart && <span style={{ whiteSpace: 'nowrap', width: '45px', textAlign: 'right' }}>{datePart}</span>}
                            </div>
                          </div>
                        );
                      }
                      
                      return descText;
                    })()}
                  </td>
                  <td className="px-3 py-1.5 text-center text-[12.5px]">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-1.5 text-right text-[12.5px]">
                    {fmt(item.rate)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-[12.5px]">
                    {fmt(item.amount)}
                  </td>
                </tr>
              ))}

          </tbody>
        </table>

        {/* ====== FOOTER: Thank You + Totals ====== */}
        <div className="flex justify-between items-end mt-6">
          {/* Left: Thank You Message */}
          <div className="flex-1 text-center">
            <p
              className="text-[14px] italic font-semibold"
              style={{ color: INVOICE_BLUE }}
            >
              Thank you for your business!
            </p>
          </div>

          {/* Right: Totals Table */}
          <table className="border-collapse" style={{ minWidth: 300 }}>
            <tbody>
              <tr className="border-b border-gray-200">
                <td
                  className="px-4 py-1.5 text-right font-semibold text-[12.5px] text-gray-700"
                  colSpan={2}
                >
                  SUBTOTAL
                </td>
                <td className="px-4 py-1.5 text-right text-[12.5px] font-medium" style={{ minWidth: 110 }}>
                  {fmt(bill.subtotal)}
                </td>
              </tr>
              {advancePaid > 0 && (
                <tr className="border-b border-gray-200">
                  <td
                    className="px-4 py-1.5 text-right font-semibold text-[12.5px] text-gray-700"
                    colSpan={2}
                  >
                    ADVANCE PAID
                  </td>
                  <td className="px-4 py-1.5 text-right text-[12.5px] font-medium" style={{ minWidth: 110 }}>
                    {fmt(advancePaid)}
                  </td>
                </tr>
              )}
              <tr>
                <td
                  className="px-4 py-1.75 text-right font-bold text-white text-[13px]"
                  style={{ background: INVOICE_BLUE }}
                >
                  TOTAL
                </td>
                <td
                  className="px-4 py-1.75 text-right font-bold text-white text-[13px]"
                  style={{ background: INVOICE_BLUE }}
                >
                  LKR
                </td>
                <td
                  className="px-4 py-1.75 text-right font-bold text-white text-[14px]"
                  style={{ background: INVOICE_BLUE, minWidth: 110 }}
                >
                  {fmt(advancePaid > 0 ? finalTotal : bill.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ====== INVOICE AMOUNT IN WORDS ====== */}
        <div className="flex mt-2" style={{ border: `1px solid #e5e7eb` }}>
          <div
            className="flex items-center px-3 py-1.5 text-white text-[12px] font-bold"
            style={{ background: INVOICE_BLUE, minWidth: 220, whiteSpace: 'nowrap' }}
          >
            INVOICE AMOUNT IN WORDS:
          </div>
          <div className="flex-1 px-4 py-1.5 text-[12.5px] text-gray-700 italic">
            {numberToWords(bill.total)} Rupees only
          </div>
        </div>

        {/* ====== TERMS & CONDITIONS + BANK DETAILS ====== */}
        <div className="flex gap-0 mt-4">
          {/* Bank Details */}
          <div className="flex-1">
            <div
              className="text-white text-[12px] font-bold px-3 py-1.25"
              style={{ background: INVOICE_BLUE }}
            >
              BANK DETAILS:
            </div>
            <div className="mt-2 text-[12px] text-gray-700 space-y-0.75 pl-1">
              <p>Name: {companyDetails.bankName} Kalutara</p>
              <p>Account No.: {companyDetails.accountNumber}</p>
              <p>Account Holder's Name: {companyDetails.ownerName}</p>
            </div>
          </div>
        </div>


        {/* ====== BOTTOM CONTACT INFO ====== */}
        <div className="text-center mt-10 text-[11px] text-gray-500">
          <p>If you have any questions about this invoice, please contact</p>
          <p className="font-semibold text-gray-700">
            {companyDetails.ownerName}, {companyDetails.phone},{" "}
            {companyDetails.email}
          </p>
        </div>
      </div>

    </div>
  );
});

import RecordPaymentModal from "../Payments/RecordPaymentModal";

const BillPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const componentRefA4 = useRef();

  // Mock company details - in real app, fetch from config/API
  const companyDetails = {
    name: "Printify Hub",
    ownerName: "H.K.K.R. Hasaranga",
    address: "No 26, Sethsiri Uyana, Nagoda, Dodangoda",
    phone: "(078) 702-1394",
    email: "kavidu.ravishan11@gmail.com",
    gstin: "",
    bankName: "Bank of Ceylon",
    accountNumber: "7679048",
    ifsc: "",
  };

  const fetchBill = useCallback(async () => {
    try {
      const response = await api.get(`/bills/${id}`);
      setBill(response.data);
    } catch {
      toast.error("Failed to load bill details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const handlePrintA4 = () => {
    const printStyle = document.createElement("style");
    printStyle.id = "dynamic-a4-print-style";
    printStyle.media = "print";
    printStyle.textContent = "@page { size: A4 portrait; margin: 0; }";
    document.head.appendChild(printStyle);

    toast("Print settings: select A4 paper and disable headers/footers.");
    document.body.classList.add("print-a4");

    const cleanup = () => {
      document.body.classList.remove("print-a4");
      const dynamicStyle = document.getElementById("dynamic-a4-print-style");
      if (dynamicStyle) dynamicStyle.remove();
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const handleDownloadPdfA4 = async () => {
    if (!componentRefA4.current || !bill) {
      toast.error("Invoice is not ready for PDF download yet");
      return;
    }

    setDownloadingPdf(true);

    const toastId = toast.loading("Generating PDF...");
    let exportContainer = null;

    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf =
        html2pdfModule?.default ||
        html2pdfModule?.html2pdf ||
        window?.html2pdf;

      if (typeof html2pdf !== "function") {
        throw new Error("PDF library failed to initialize");
      }

      const safeBillNumber = String(bill.bill_number || "invoice")
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, "-");

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const sourceElement = componentRefA4.current;
      exportContainer = document.createElement("div");
      exportContainer.style.position = "fixed";
      exportContainer.style.left = "-100000px";
      exportContainer.style.top = "0";
      exportContainer.style.width = "210mm";
      exportContainer.style.background = "#ffffff";
      exportContainer.style.zIndex = "-1";

      const clonedInvoice = sourceElement.cloneNode(true);

      // html2pdf/html2canvas cannot parse Tailwind v4 OKLCH colors reliably,
      // so inline computed styles to resolved RGB values before export.
      const applyComputedStyles = (sourceNode, targetNode) => {
        if (!(sourceNode instanceof Element) || !(targetNode instanceof Element)) {
          return;
        }

        const computed = window.getComputedStyle(sourceNode);
        for (let i = 0; i < computed.length; i += 1) {
          const property = computed[i];
          if (property.startsWith("--")) {
            continue;
          }

          let value = computed.getPropertyValue(property);
          const hasUnsupportedColor =
            value.includes("oklch(") || value.includes("color(");

          if (hasUnsupportedColor) {
            if (property.includes("background")) {
              value = "#ffffff";
            } else if (
              property.includes("border") ||
              property.includes("outline")
            ) {
              // Gray borders (e.g. border-gray-200) must stay light gray, not black
              value = "#e5e7eb";
            } else if (
              property.includes("color") ||
              property.includes("stroke") ||
              property.includes("fill")
            ) {
              value = "#000000";
            } else {
              continue;
            }
          }

          targetNode.style.setProperty(
            property,
            value,
            computed.getPropertyPriority(property)
          );
        }

        const sourceChildren = sourceNode.children;
        const targetChildren = targetNode.children;
        for (let i = 0; i < sourceChildren.length; i += 1) {
          applyComputedStyles(sourceChildren[i], targetChildren[i]);
        }
      };

      applyComputedStyles(sourceElement, clonedInvoice);
      exportContainer.appendChild(clonedInvoice);
      document.body.appendChild(exportContainer);

      const pdfMarginMm = 5;

      await html2pdf()
        .set({
          // Keep a safe printable gutter so physical printers do not clip edges.
          margin: [pdfMarginMm, pdfMarginMm, pdfMarginMm, pdfMarginMm],
          filename: `${safeBillNumber}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: sourceElement.scrollWidth,
            windowHeight: sourceElement.scrollHeight,
            onclone: (clonedDoc) => {
              // html2canvas parses CSS stylesheets directly, so we must scrub
              // Tailwind v4's oklch() colors before the render pass.
              clonedDoc.querySelectorAll("style").forEach((styleEl) => {
                if (styleEl.textContent.includes("oklch")) {
                  styleEl.textContent = styleEl.textContent
                    // Background oklch → white
                    .replace(/background(?:-color)?:[^;]*oklch\([^)]+\)[^;]*/g, "background-color: #ffffff")
                    // Border / outline oklch → light gray (preserves border-gray-200 appearance)
                    .replace(/border(?:-[\w-]+)?:[^;]*oklch\([^)]+\)[^;]*/g, "border-color: #e5e7eb")
                    .replace(/outline(?:-color)?:[^;]*oklch\([^)]+\)[^;]*/g, "outline-color: #e5e7eb")
                    // Any remaining oklch (text colors etc.) → black
                    .replace(/oklch\([^)]+\)/g, "#000000");
                }
              });
              // Forcibly set body background to white
              clonedDoc.body.style.backgroundColor = "#ffffff";
            },
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: ["tr", ".avoid-break"],
          },
        })
        .from(clonedInvoice)
        .save();

      toast.success("PDF downloaded", { id: toastId });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to download PDF", { id: toastId });
    } finally {
      if (exportContainer && exportContainer.parentNode) {
        exportContainer.parentNode.removeChild(exportContainer);
      }
      setDownloadingPdf(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!bill) return <div className="p-12 text-center">Bill not found</div>;

  const totalPaid = bill.payments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0
  );
  const outstandingAmount = Math.max(parseFloat(bill.total) - totalPaid, 0);

  return (
    <div className="max-w-6xl mx-auto">
      {showPaymentModal && (
        <RecordPaymentModal
          billId={bill.id}
          billTotal={outstandingAmount}
          onPaymentRecorded={() => {
            fetchBill(); // Refresh bill data to update status and payments list
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/bills")}
            className="btn btn-secondary"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Invoice Preview</h2>
        </div>

      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Preview Area */}
        <div className="flex-1 bg-gray-200 p-8 rounded-lg overflow-auto shadow-inner flex justify-center min-h-125 print-content">
          <div className="block">
            <div className="invoice-a4-scaler shadow-lg transform scale-[0.8] origin-top md:scale-100 print:transform-none print:shadow-none">
              <InvoicePrint
                ref={componentRefA4}
                bill={bill}
                companyDetails={companyDetails}
              />
            </div>
          </div>
        </div>

        {/* Sidebar Actions (Desktop) */}
        <div className="w-full lg:w-80 space-y-6 print:hidden">
          <div className="card">
            <h3 className="font-semibold mb-4">Actions</h3>

            <div className="space-y-3">
              <button
                onClick={handlePrintA4}
                className="btn btn-secondary w-full"
              >
                <Printer size={18} /> Print A4 Invoice
              </button>

              <button
                onClick={handleDownloadPdfA4}
                className="btn btn-primary w-full"
                disabled={downloadingPdf}
              >
                <Download size={18} />
                {downloadingPdf ? "Generating PDF..." : "Download A4 PDF"}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Invoice Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span
                  className={`badge ${
                    bill.payment_status === "paid"
                      ? "badge-success"
                      : bill.payment_status === "partial"
                        ? "badge-warning"
                        : "badge-danger"
                  }`}
                >
                  {bill.payment_status?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span>{new Date(bill.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-bold">
                  LKR {parseFloat(bill.total).toLocaleString("en-LK")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid to date</span>
                <span className="font-medium text-green-600">
                  LKR{" "}
                  {bill.payments
                    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                    .toLocaleString("en-LK")}
                </span>
              </div>
            </div>

            {bill.payment_status !== "paid" && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn btn-success w-full mt-4"
              >
                Record Payment
              </button>
            )}
          </div>

          {/* Payment History */}
          {bill.payments && bill.payments.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4">Payment History</h3>
              <div className="space-y-3">
                {bill.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="text-sm border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between font-medium">
                      <span>
                        LKR {parseFloat(payment.amount).toLocaleString("en-LK")}
                      </span>
                      <span className="text-gray-500">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span className="capitalize">
                        {payment.payment_method.replace("_", " ")}
                      </span>
                      <span>{payment.reference_number}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillPreview;
