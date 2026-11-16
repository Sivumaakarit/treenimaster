import {
  getWithingsConfig,
  getWithingsIntegration,
} from "@/lib/withings";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { configured, redirectUri } = getWithingsConfig(url.origin);
  const integration = await getWithingsIntegration();

  return NextResponse.json({
    configured,
    connected: Boolean(integration?.access_token),
    lastSyncedAt: integration?.last_synced_at ?? null,
    userid: integration?.userid ?? null,
    redirectUri,
  });
}
