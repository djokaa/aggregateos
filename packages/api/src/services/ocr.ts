/**
 * OCR ticket processing service.
 *
 * Extracts structured data from delivery ticket photos using either
 * Google Document AI (production) or a regex-based fallback (development).
 *
 * Architecture:
 * 1. Photo is uploaded and stored (URL provided)
 * 2. Image is sent to Document AI for text extraction
 * 3. Extracted text is parsed for key fields (weight, material, date, ticket #)
 * 4. Confidence scores are calculated per field and overall
 * 5. Results are stored in the tickets table
 *
 * When Document AI is not configured (no API key), the service returns
 * a mock extraction so development and testing can proceed.
 *
 * @module ocr
 */

// Environment
const GOOGLE_DOCUMENT_AI_PROJECT_ID = process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID || "";
const GOOGLE_DOCUMENT_AI_LOCATION = process.env.GOOGLE_DOCUMENT_AI_LOCATION || "us";
const GOOGLE_DOCUMENT_AI_PROCESSOR_ID = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || "";

/** Whether Document AI is properly configured */
export const isOcrConfigured = Boolean(
  GOOGLE_DOCUMENT_AI_PROJECT_ID && GOOGLE_DOCUMENT_AI_PROCESSOR_ID
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw OCR output from the document processor. */
export interface OcrRawResult {
  fullText: string;
  pages: number;
  confidence: number;
  processorVersion: string;
  processedAt: string;
}

/** Structured data extracted from a delivery ticket. */
export interface TicketExtraction {
  /** Gross weight in tons (e.g. 22.4) */
  weight: number | null;
  /** Material description (e.g. "#57 Limestone") */
  material: string | null;
  /** Date on the ticket (ISO string, e.g. "2026-02-14") */
  date: string | null;
  /** Ticket number printed on the ticket */
  ticketNumber: string | null;
  /** Per-field confidence scores (0.0 – 1.0) */
  fieldConfidence: {
    weight: number;
    material: number;
    date: number;
    ticketNumber: number;
  };
  /** Overall confidence (average of field scores) */
  overallConfidence: number;
  /** The raw OCR result for audit/debugging */
  raw: OcrRawResult;
}

// ---------------------------------------------------------------------------
// Common aggregate materials for fuzzy matching
// ---------------------------------------------------------------------------

const KNOWN_MATERIALS = [
  "#57 Limestone",
  "#67 Limestone",
  "#78 Limestone",
  "#4 Limestone",
  "Concrete Sand",
  "Mason Sand",
  "Washed Sand",
  "Class A Gravel",
  "Class B Gravel",
  "Pea Gravel",
  "Crusher Run",
  "ABC Stone",
  "Rip Rap",
  "Fill Dirt",
  "Topsoil",
  "Hot Mix Asphalt",
  "Cold Patch",
  "Recycled Concrete",
  "Slag",
];

// ---------------------------------------------------------------------------
// Text parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract weight from OCR text.
 * Looks for patterns like "22.40 TON", "Net: 22.4", "NET WT 22400 LBS", etc.
 */
function extractWeight(text: string): { value: number | null; confidence: number } {
  // Pattern 1: Direct ton values (e.g. "22.40 TON", "22.4 TONS")
  const tonMatch = text.match(/(\d{1,3}(?:\.\d{1,3})?)\s*(?:TON|TONS|TN)/i);
  if (tonMatch) {
    return { value: parseFloat(tonMatch[1]), confidence: 0.95 };
  }

  // Pattern 2: Net weight line (e.g. "NET: 22.40", "Net Wt: 22.4")
  const netMatch = text.match(/NET\s*(?:WT|WEIGHT|WGT)?\s*:?\s*(\d{1,3}(?:\.\d{1,3})?)/i);
  if (netMatch) {
    return { value: parseFloat(netMatch[1]), confidence: 0.90 };
  }

  // Pattern 3: Pounds to tons (e.g. "44800 LBS" → 22.4 tons)
  const lbsMatch = text.match(/(\d{4,6})\s*(?:LBS?|POUNDS?)/i);
  if (lbsMatch) {
    const tons = Math.round((parseInt(lbsMatch[1]) / 2000) * 100) / 100;
    return { value: tons, confidence: 0.85 };
  }

  // Pattern 4: Gross/Tare/Net table — take the net row
  const tableMatch = text.match(/NET\s+(\d{4,6})/i);
  if (tableMatch) {
    const tons = Math.round((parseInt(tableMatch[1]) / 2000) * 100) / 100;
    return { value: tons, confidence: 0.80 };
  }

  return { value: null, confidence: 0.0 };
}

/**
 * Extract material type from OCR text by fuzzy matching against known materials.
 */
function extractMaterial(text: string): { value: string | null; confidence: number } {
  const upper = text.toUpperCase();

  for (const material of KNOWN_MATERIALS) {
    if (upper.includes(material.toUpperCase())) {
      return { value: material, confidence: 0.95 };
    }
  }

  // Partial match — look for common aggregate keywords
  const partialPatterns = [
    { pattern: /#\d{1,2}\s*(?:STONE|LIMESTONE|LIME)/i, confidence: 0.80 },
    { pattern: /(?:CONCRETE|MASON|WASHED)\s*SAND/i, confidence: 0.80 },
    { pattern: /(?:CLASS\s*[A-C]|PEA)\s*GRAVEL/i, confidence: 0.80 },
    { pattern: /CRUSHER\s*RUN/i, confidence: 0.85 },
    { pattern: /(?:HOT\s*MIX|HMA)\s*ASPHALT/i, confidence: 0.80 },
    { pattern: /(?:RIP\s*RAP|RIPRAP)/i, confidence: 0.85 },
    { pattern: /(?:FILL|TOP)\s*(?:DIRT|SOIL)/i, confidence: 0.75 },
  ];

  for (const { pattern, confidence } of partialPatterns) {
    const match = text.match(pattern);
    if (match) {
      return { value: match[0].trim(), confidence };
    }
  }

  return { value: null, confidence: 0.0 };
}

/**
 * Extract a date from OCR text.
 * Handles MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, and written forms.
 */
function extractDate(text: string): { value: string | null; confidence: number } {
  // MM/DD/YYYY or MM-DD-YYYY
  const usDate = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (usDate) {
    const [, month, day, year] = usDate;
    const isoDate = `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
    return { value: isoDate, confidence: 0.92 };
  }

  // YYYY-MM-DD (ISO)
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return { value: isoMatch[0], confidence: 0.95 };
  }

  // Written date: "Feb 14, 2026" or "February 14, 2026"
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const writtenMatch = text.match(
    /([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/
  );
  if (writtenMatch) {
    const monthIdx = monthNames.findIndex((m) =>
      writtenMatch[1].toLowerCase().startsWith(m)
    );
    if (monthIdx !== -1) {
      const isoDate = `${writtenMatch[3]}-${String(monthIdx + 1).padStart(2, "0")}-${writtenMatch[2]!.padStart(2, "0")}`;
      return { value: isoDate, confidence: 0.88 };
    }
  }

  return { value: null, confidence: 0.0 };
}

/**
 * Extract ticket number from OCR text.
 * Looks for patterns like "TICKET #54892", "TKT-54892", "Ticket No: 54892", etc.
 */
function extractTicketNumber(text: string): { value: string | null; confidence: number } {
  // Direct "TICKET" reference
  const ticketMatch = text.match(
    /(?:TICKET|TKT|TKTS?|SCALE\s*TICKET)\s*(?:#|NO\.?|NUM(?:BER)?)?\s*:?\s*([A-Z0-9\-]{3,20})/i
  );
  if (ticketMatch) {
    return { value: ticketMatch[1].trim(), confidence: 0.93 };
  }

  // Fallback: standalone number that looks like a ticket (5-8 digits)
  const standaloneMatch = text.match(/\b(\d{5,8})\b/);
  if (standaloneMatch) {
    return { value: standaloneMatch[1], confidence: 0.60 };
  }

  return { value: null, confidence: 0.0 };
}

// ---------------------------------------------------------------------------
// Document AI integration
// ---------------------------------------------------------------------------

/**
 * Send an image to Google Document AI for text extraction.
 *
 * @param imageUrl  Public URL of the ticket photo
 * @returns         Full text content from the document
 */
async function callDocumentAI(imageUrl: string): Promise<OcrRawResult> {
  // Fetch the image as base64
  const imageRes = await fetch(imageUrl);
  const imageBuffer = await imageRes.arrayBuffer();
  const base64Content = Buffer.from(imageBuffer).toString("base64");
  const mimeType = imageRes.headers.get("content-type") || "image/jpeg";

  const endpoint = `https://${GOOGLE_DOCUMENT_AI_LOCATION}-documentai.googleapis.com/v1/projects/${GOOGLE_DOCUMENT_AI_PROJECT_ID}/locations/${GOOGLE_DOCUMENT_AI_LOCATION}/processors/${GOOGLE_DOCUMENT_AI_PROCESSOR_ID}:process`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // In production, use a service account token via google-auth-library
      // For now, this assumes Application Default Credentials or a bearer token
      Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN || ""}`,
    },
    body: JSON.stringify({
      rawDocument: {
        content: base64Content,
        mimeType,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Document AI returned ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as {
    document?: { text?: string; pages?: Array<{ confidence?: number }> };
    humanReviewStatus?: { state?: string };
  };
  const document = data.document;

  return {
    fullText: document?.text || "",
    pages: document?.pages?.length || 0,
    confidence: document?.pages?.[0]?.confidence || 0,
    processorVersion: data.humanReviewStatus?.state || "automated",
    processedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Mock extraction for development
// ---------------------------------------------------------------------------

/**
 * Generate a realistic mock extraction for development/testing.
 * Uses slightly randomised values to simulate real-world variation.
 */
function mockExtraction(): TicketExtraction {
  const weights = [18.2, 20.5, 22.4, 24.1, 19.8, 21.6, 23.3];
  const materials = ["#57 Limestone", "Concrete Sand", "Class A Gravel", "Crusher Run", "#67 Limestone"];
  const ticketNums = ["TKT-54892", "TKT-55103", "TKT-55247", "TKT-55891", "TKT-56012"];

  const weight = weights[Math.floor(Math.random() * weights.length)]!;
  const material = materials[Math.floor(Math.random() * materials.length)]!;
  const ticketNumber = ticketNums[Math.floor(Math.random() * ticketNums.length)]!;
  const today = new Date().toISOString().split("T")[0]!;

  return {
    weight,
    material,
    date: today,
    ticketNumber,
    fieldConfidence: {
      weight: 0.94,
      material: 0.91,
      date: 0.97,
      ticketNumber: 0.93,
    },
    overallConfidence: 0.94,
    raw: {
      fullText: `SCALE TICKET\nTicket #${ticketNumber}\nDate: ${today}\nMaterial: ${material}\nNet: ${weight} TONS\nGross: ${(weight + 15.2).toFixed(1)} TONS\nTare: 15.2 TONS`,
      pages: 1,
      confidence: 0.94,
      processorVersion: "mock-dev",
      processedAt: new Date().toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Process a ticket photo and extract structured delivery data.
 *
 * Uses Google Document AI when configured, otherwise falls back
 * to a mock extraction for development.
 *
 * @param imageUrl  Public URL of the ticket photo
 * @returns         Extracted ticket data with confidence scores
 */
export async function processTicketImage(
  imageUrl: string,
): Promise<TicketExtraction> {
  // --- Development fallback ---
  if (!isOcrConfigured) {
    console.warn(
      "[OCR] Document AI not configured — returning mock extraction. " +
        "Set GOOGLE_DOCUMENT_AI_PROJECT_ID and GOOGLE_DOCUMENT_AI_PROCESSOR_ID to enable.",
    );
    return mockExtraction();
  }

  // --- Production path ---
  try {
    const raw = await callDocumentAI(imageUrl);
    const text = raw.fullText;

    const weight = extractWeight(text);
    const material = extractMaterial(text);
    const date = extractDate(text);
    const ticketNumber = extractTicketNumber(text);

    const fieldConfidence = {
      weight: weight.confidence,
      material: material.confidence,
      date: date.confidence,
      ticketNumber: ticketNumber.confidence,
    };

    const scores = Object.values(fieldConfidence);
    const overallConfidence =
      scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return {
      weight: weight.value,
      material: material.value,
      date: date.value,
      ticketNumber: ticketNumber.value,
      fieldConfidence,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      raw,
    };
  } catch (error) {
    console.error("[OCR] Document AI processing failed:", error);
    // Return a degraded result rather than crashing
    return {
      weight: null,
      material: null,
      date: null,
      ticketNumber: null,
      fieldConfidence: { weight: 0, material: 0, date: 0, ticketNumber: 0 },
      overallConfidence: 0,
      raw: {
        fullText: "",
        pages: 0,
        confidence: 0,
        processorVersion: "error",
        processedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Parse raw text that was already extracted (e.g. from a different OCR provider).
 * Useful when integrating with AWS Textract or other services.
 */
export function parseTicketText(text: string): Omit<TicketExtraction, "raw"> {
  const weight = extractWeight(text);
  const material = extractMaterial(text);
  const date = extractDate(text);
  const ticketNumber = extractTicketNumber(text);

  const fieldConfidence = {
    weight: weight.confidence,
    material: material.confidence,
    date: date.confidence,
    ticketNumber: ticketNumber.confidence,
  };

  const scores = Object.values(fieldConfidence);
  const overallConfidence =
    scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return {
    weight: weight.value,
    material: material.value,
    date: date.value,
    ticketNumber: ticketNumber.value,
    fieldConfidence,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
  };
}
