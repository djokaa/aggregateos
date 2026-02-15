/**
 * Invoice PDF Export — Placeholder API Route
 *
 * Generates a basic HTML-to-PDF invoice. Can be enhanced with
 * @react-pdf/renderer or a proper template later.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Placeholder: Return a simple HTML page styled for print
  // In production, use puppeteer, @react-pdf/renderer, or a PDF service
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    .placeholder { text-align: center; padding: 60px 20px; color: #999; border: 2px dashed #ddd; border-radius: 8px; margin: 40px 0; }
    .placeholder h2 { color: #333; margin-bottom: 8px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Invoice PDF</h1>
  <p class="subtitle">Invoice ID: ${id}</p>
  <div class="placeholder">
    <h2>PDF Generation Placeholder</h2>
    <p>This endpoint will generate a formatted PDF invoice.</p>
    <p>Connect a PDF rendering library (e.g. @react-pdf/renderer or puppeteer) to produce the final document.</p>
  </div>
</body>
</html>
  `.trim();

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
