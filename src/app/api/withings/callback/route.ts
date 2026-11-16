import {
  getWithingsConfig,
  saveWithingsIntegration,
} from "@/lib/withings";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam || !code) {
    return NextResponse.redirect(
      new URL(
        `/?withings=error&reason=${encodeURIComponent(errorParam || "no_code")}`,
        url.origin
      )
    );
  }

  const { clientId, clientSecret, redirectUri, configured } = getWithingsConfig(
    url.origin
  );

  if (!configured) {
    return NextResponse.redirect(new URL("/?withings=missing_env", url.origin));
  }

  try {
    const body = new URLSearchParams({
      action: "requesttoken",
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const resp = await fetch("https://wbsapi.withings.net/v2/oauth2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const json = await resp.json();
    if (!resp.ok || json.status !== 0 || !json.body?.access_token) {
      return NextResponse.redirect(
        new URL(
          `/?withings=error&reason=${encodeURIComponent(
            `token_exchange_${json?.status ?? resp.status}`
          )}`,
          url.origin
        )
      );
    }

    await saveWithingsIntegration({
      access_token: json.body.access_token,
      refresh_token: json.body.refresh_token,
      expires_in: json.body.expires_in || 10800,
      userid: json.body.userid,
      scope: json.body.scope,
    });

    return NextResponse.redirect(new URL("/?withings=connected", url.origin));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/?withings=error&reason=${encodeURIComponent(msg)}`, url.origin)
    );
  }
}
