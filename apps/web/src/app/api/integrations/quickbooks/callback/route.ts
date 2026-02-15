/**
 * QuickBooks Online OAuth 2.0 callback handler.
 *
 * After the user authorises AggregateOS in the Intuit OAuth flow,
 * QuickBooks redirects here with an authorization `code` and `state`.
 * We exchange the code for access + refresh tokens and redirect the
 * user back to the settings page.
 *
 * Flow:
 * 1. User clicks "Connect QuickBooks" on /settings → redirected to Intuit
 * 2. User authorises → Intuit redirects here with ?code=...&state=...&realmId=...
 * 3. We exchange the code for tokens
 * 4. Redirect to /settings with success/error status
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // --- Error from Intuit ---
  if (error) {
    console.error("[QBO Callback] Authorization error:", error);
    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&qbo=error&message=${encodeURIComponent(error)}`,
    );
  }

  // --- Missing code ---
  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&qbo=error&message=missing_code`,
    );
  }

  // --- Exchange code for tokens ---
  try {
    // Dynamic import to avoid bundling the service when QBO is not configured
    const { exchangeAuthCode } = await import(
      "@aggregateos/api/src/services/quickbooks"
    );

    const tokens = await exchangeAuthCode(code);

    // In production: store tokens in database, associated with the org.
    // For now, log them so they can be added to .env.local manually.
    console.log("[QBO Callback] Tokens received successfully");
    console.log("[QBO Callback] realmId:", realmId);
    console.log("[QBO Callback] accessToken:", tokens.accessToken.substring(0, 20) + "...");
    console.log("[QBO Callback] refreshToken:", tokens.refreshToken.substring(0, 20) + "...");
    console.log("[QBO Callback] expiresIn:", tokens.expiresIn, "seconds");

    // TODO: Persist tokens to the database
    // await db.update(schema.organizations).set({
    //   qboRealmId: realmId,
    //   qboAccessToken: tokens.accessToken,
    //   qboRefreshToken: tokens.refreshToken,
    //   qboTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
    // }).where(eq(schema.organizations.id, orgId));

    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&qbo=success`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[QBO Callback] Token exchange failed:", message);
    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&qbo=error&message=${encodeURIComponent(message)}`,
    );
  }
}
