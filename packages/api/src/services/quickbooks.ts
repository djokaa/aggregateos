/**
 * QuickBooks Online (QBO) integration service.
 *
 * Syncs AggregateOS data with QuickBooks Online:
 * - Push invoices to QBO when marked "sent"
 * - Sync customer records
 * - Pull payment status back
 *
 * Authentication uses OAuth 2.0 with refresh tokens.
 * When QBO is not configured, operations log and return gracefully.
 *
 * @module quickbooks
 */

const QBO_CLIENT_ID = process.env.QBO_CLIENT_ID || "";
const QBO_CLIENT_SECRET = process.env.QBO_CLIENT_SECRET || "";
const QBO_REDIRECT_URI = process.env.QBO_REDIRECT_URI || "";
const QBO_REALM_ID = process.env.QBO_REALM_ID || "";

/** Whether QBO integration is properly configured. */
export const isQboConfigured = Boolean(QBO_CLIENT_ID && QBO_CLIENT_SECRET);

// QBO uses either sandbox or production base URL
const QBO_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://quickbooks.api.intuit.com"
  : "https://sandbox-quickbooks.api.intuit.com";

// Token management — in production, store in database or secret manager
let accessToken = process.env.QBO_ACCESS_TOKEN || "";
let refreshToken = process.env.QBO_REFRESH_TOKEN || "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QboInvoice {
  /** QBO internal invoice ID (returned after creation) */
  qboId?: string;
  /** Customer ref in QBO */
  customerRef: { value: string; name: string };
  /** Line items */
  lines: Array<{
    description: string;
    amount: number;
    quantity: number;
    unitPrice: number;
  }>;
  /** Due date (YYYY-MM-DD) */
  dueDate: string;
  /** Our internal invoice number */
  docNumber: string;
  /** Memo/notes */
  memo?: string;
}

export interface QboCustomer {
  qboId?: string;
  displayName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  billingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface QboSyncResult {
  success: boolean;
  qboId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Generate the OAuth 2.0 authorization URL.
 * Redirect the user here to connect their QBO account.
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: QBO_CLIENT_ID,
    redirect_uri: QBO_REDIRECT_URI,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeAuthCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const auth = Buffer.from(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`).toString("base64");

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: QBO_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`QBO token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Update in-memory tokens (in production, persist these to DB)
  accessToken = data.access_token;
  refreshToken = data.refresh_token;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh the access token using the stored refresh token.
 */
async function refreshAccessToken(): Promise<void> {
  if (!refreshToken) {
    throw new Error("No refresh token available — re-authorize with QBO");
  }

  const auth = Buffer.from(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`).toString("base64");

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`QBO token refresh failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
  };
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/**
 * Make an authenticated request to the QBO API.
 * Automatically retries once on 401 by refreshing the token.
 */
async function qboRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${QBO_BASE_URL}/v3/company/${QBO_REALM_ID}${path}`;

  let res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Retry on 401 (token expired)
  if (res.status === 401) {
    await refreshAccessToken();
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`QBO API ${res.status}: ${error}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Invoice sync
// ---------------------------------------------------------------------------

/**
 * Push an invoice to QuickBooks Online.
 *
 * Creates a new invoice in QBO and returns the QBO invoice ID.
 */
export async function syncInvoiceToQbo(invoice: QboInvoice): Promise<QboSyncResult> {
  if (!isQboConfigured) {
    console.log(`[QBO] (dev mode) Would sync invoice: ${invoice.docNumber}`);
    return { success: true, qboId: `dev-qbo-${Date.now()}` };
  }

  try {
    const qboLines = invoice.lines.map((line, i) => ({
      LineNum: i + 1,
      Description: line.description,
      Amount: line.amount,
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        Qty: line.quantity,
        UnitPrice: line.unitPrice,
      },
    }));

    const qboInvoice = {
      CustomerRef: invoice.customerRef,
      Line: qboLines,
      DueDate: invoice.dueDate,
      DocNumber: invoice.docNumber,
      PrivateNote: invoice.memo,
    };

    const result = await qboRequest("POST", "/invoice", qboInvoice) as { Invoice?: { Id?: string } };
    return {
      success: true,
      qboId: result?.Invoice?.Id || undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[QBO] Invoice sync failed:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Create or update a customer in QuickBooks Online.
 */
export async function syncCustomerToQbo(customer: QboCustomer): Promise<QboSyncResult> {
  if (!isQboConfigured) {
    console.log(`[QBO] (dev mode) Would sync customer: ${customer.displayName}`);
    return { success: true, qboId: `dev-qbo-cust-${Date.now()}` };
  }

  try {
    const qboCustomer: Record<string, unknown> = {
      DisplayName: customer.displayName,
      CompanyName: customer.companyName || customer.displayName,
    };

    if (customer.email) {
      qboCustomer.PrimaryEmailAddr = { Address: customer.email };
    }
    if (customer.phone) {
      qboCustomer.PrimaryPhone = { FreeFormNumber: customer.phone };
    }
    if (customer.billingAddress) {
      qboCustomer.BillAddr = {
        Line1: customer.billingAddress.line1,
        City: customer.billingAddress.city,
        CountrySubDivisionCode: customer.billingAddress.state,
        PostalCode: customer.billingAddress.postalCode,
      };
    }

    const result = await qboRequest("POST", "/customer", qboCustomer) as { Customer?: { Id?: string } };
    return {
      success: true,
      qboId: result?.Customer?.Id || undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[QBO] Customer sync failed:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Query QBO for invoice payment status.
 */
export async function getQboInvoiceStatus(
  qboInvoiceId: string,
): Promise<{ balance: number; totalAmt: number; isPaid: boolean } | null> {
  if (!isQboConfigured) return null;

  try {
    const result = await qboRequest("GET", `/invoice/${qboInvoiceId}?minorversion=65`) as { Invoice?: { Balance?: string; TotalAmt?: string } };
    const inv = result?.Invoice;
    if (!inv) return null;

    return {
      balance: parseFloat(inv.Balance ?? "0") || 0,
      totalAmt: parseFloat(inv.TotalAmt ?? "0") || 0,
      isPaid: parseFloat(inv.Balance ?? "0") === 0,
    };
  } catch {
    return null;
  }
}
