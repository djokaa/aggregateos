import { NextRequest, NextResponse } from "next/server";

/**
 * Estimate PDF Route
 *
 * Renders an estimate as a printable HTML page with professional styling.
 * The browser's print dialog can save it as PDF.
 *
 * In production, this would be replaced with server-side PDF generation
 * (e.g., @react-pdf/renderer or Puppeteer), but this approach works well
 * as a pragmatic v1.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estimate</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b; padding: 48px; max-width: 820px; margin: 0 auto; font-size: 14px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #18181b; }
    .brand { }
    .brand h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .brand h1 span { color: #f59e0b; }
    .brand p { font-size: 12px; color: #71717a; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h2 { font-size: 28px; font-weight: 300; color: #71717a; text-transform: uppercase; letter-spacing: 4px; }
    .doc-title .number { font-size: 18px; font-weight: 700; color: #18181b; margin-top: 4px; font-family: 'SF Mono', Monaco, Menlo, monospace; }
    .doc-title .status { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
    .status-draft { background: #f4f4f5; color: #71717a; }
    .status-sent { background: #dbeafe; color: #2563eb; }
    .status-viewed { background: #f3e8ff; color: #7c3aed; }
    .status-approved { background: #dcfce7; color: #16a34a; }
    .status-rejected { background: #fee2e2; color: #dc2626; }
    .status-expired { background: #ffedd5; color: #ea580c; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px; margin-bottom: 36px; }
    .meta-item label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #a1a1aa; margin-bottom: 4px; }
    .meta-item p { font-size: 14px; font-weight: 500; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #71717a; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th { text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #71717a; border-bottom: 2px solid #e4e4e7; }
    th.num { text-align: right; }
    td { padding: 10px; font-size: 13px; border-bottom: 1px solid #f4f4f5; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 12px; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 36px; }
    .totals-box { width: 260px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #52525b; }
    .totals-row span:last-child { font-variant-numeric: tabular-nums; font-family: 'SF Mono', Monaco, Menlo, monospace; }
    .totals-row.grand { font-size: 16px; font-weight: 800; color: #18181b; border-top: 2px solid #18181b; padding-top: 10px; margin-top: 6px; }
    .notes { background: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 16px 20px; margin-bottom: 36px; }
    .notes h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #a1a1aa; margin-bottom: 6px; }
    .notes p { font-size: 13px; color: #52525b; white-space: pre-wrap; line-height: 1.6; }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa; }
    .footer p { margin-top: 4px; }
    .print-bar { margin-bottom: 28px; padding: 12px 20px; background: #fef9c3; border: 1px solid #fde68a; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .print-bar span { font-size: 13px; color: #854d0e; }
    .print-bar button { padding: 8px 20px; background: #18181b; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; }
    .print-bar button:hover { background: #27272a; }
    @media print {
      body { padding: 24px; }
      .print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span>Use Ctrl+P (or Cmd+P) to save as PDF</span>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>

  <div class="header">
    <div class="brand">
      <h1>Ryland<span> Logistics</span></h1>
      <p>Aggregate Logistics · Charlotte, NC</p>
    </div>
    <div class="doc-title">
      <h2>Estimate</h2>
      <p class="number" id="est-number">Loading...</p>
      <span class="status status-draft" id="est-status">—</span>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <label>Customer</label>
      <p id="est-customer">Loading...</p>
    </div>
    <div class="meta-item">
      <label>Job Site</label>
      <p id="est-jobsite">—</p>
    </div>
    <div class="meta-item">
      <label>Date</label>
      <p id="est-date">—</p>
    </div>
    <div class="meta-item">
      <label>Valid Until</label>
      <p id="est-valid">—</p>
    </div>
  </div>

  <p class="section-title">Line Items</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Type</th>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Material</th>
        <th class="num">Haul</th>
        <th class="num">Fuel</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody id="line-items">
      <tr><td colspan="8" style="text-align: center; color: #a1a1aa; padding: 24px;">Loading...</td></tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span id="subtotal">—</span></div>
      <div class="totals-row"><span>Fuel Surcharge</span><span id="fuel">—</span></div>
      <div class="totals-row grand"><span>Total</span><span id="grand">—</span></div>
    </div>
  </div>

  <div class="notes" id="notes-box" style="display:none;">
    <h3>Notes</h3>
    <p id="notes-text"></p>
  </div>

  <div class="footer">
    <p>Generated by AggregateOS — Ryland Logistics</p>
    <p>This estimate is valid for the period indicated above. Prices subject to change after expiration.</p>
  </div>

  <script>
    const eid = "${id}";
    const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(v) || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

    async function load() {
      try {
        const res = await fetch('/api/trpc/estimate.getById?input=' + encodeURIComponent(JSON.stringify({ json: { id: eid } })));
        const raw = await res.json();
        const est = raw?.result?.data?.json;
        if (!est) return;

        document.getElementById('est-number').textContent = est.estimateNumber || eid;
        const statusEl = document.getElementById('est-status');
        statusEl.textContent = (est.status || 'draft').toUpperCase();
        statusEl.className = 'status status-' + (est.status || 'draft');
        document.getElementById('est-customer').textContent = est.customerName || 'Customer';
        document.getElementById('est-jobsite').textContent = est.jobSiteName || '—';
        document.getElementById('est-date').textContent = fmtDate(est.createdAt);
        document.getElementById('est-valid').textContent = fmtDate(est.validUntil);

        const items = est.lineItems || [];
        const tbody = document.getElementById('line-items');
        const typeLabels = { material: 'Material', hauling: 'Hauling', hourly: 'Hourly', fee: 'Fee', discount: 'Discount' };

        if (items.length > 0) {
          tbody.innerHTML = items.map((item, i) =>
            '<tr>' +
            '<td>' + (i + 1) + '</td>' +
            '<td>' + (typeLabels[item.lineType] || item.lineType || 'Material') + '</td>' +
            '<td>' + (item.materialName || item.description || 'Material delivery') + '</td>' +
            '<td class="num">' + (item.quantity || 0) + '</td>' +
            '<td class="num">' + fmt(item.materialRate) + '</td>' +
            '<td class="num">' + fmt(item.haulRate) + '</td>' +
            '<td class="num">' + fmt(item.fuelSurcharge) + '</td>' +
            '<td class="num">' + fmt(item.lineTotal) + '</td>' +
            '</tr>'
          ).join('');
        }

        document.getElementById('subtotal').textContent = fmt(est.subtotal);
        document.getElementById('fuel').textContent = fmt(est.fuelSurchargeTotal);
        document.getElementById('grand').textContent = fmt(est.total);

        const notes = est.notesCustomer || est.notes;
        if (notes) {
          document.getElementById('notes-box').style.display = 'block';
          document.getElementById('notes-text').textContent = notes;
        }
      } catch (e) {
        console.error('Failed to load estimate:', e);
      }
    }

    load();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
