import { getWithingsConfig } from "@/lib/withings";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { clientId, configured, redirectUri } = getWithingsConfig(url.origin);

  if (!configured) {
    return NextResponse.redirect(new URL("/?withings=missing_env", url.origin));
  }

  const state = `tm-${Date.now()}`;
  const authUrl = new URL("https://account.withings.com/oauth2_user/authorize2");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "user.info,user.metrics,user.activity");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
