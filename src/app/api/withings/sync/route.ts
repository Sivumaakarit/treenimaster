import { supabase } from "@/lib/supabaseClient";
import {
  getWithingsConfig,
  getWithingsIntegration,
  isAllowedWithingsWorkout,
  mapWithingsWorkoutToLog,
  refreshWithingsAccessTokenIfNeeded,
  WithingsSeriesItem,
} from "@/lib/withings";
import { NextResponse } from "next/server";

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const { clientId, clientSecret, configured } = getWithingsConfig(url.origin);

    if (!configured) {
      return NextResponse.json(
        {
          error:
            "Withings API-avaimet (WITHINGS_CLIENT_ID & WITHINGS_CLIENT_SECRET) puuttuvat vielä ympäristömuuttujista.",
          code: "MISSING_ENV",
        },
        { status: 400 }
      );
    }

    const integration = await getWithingsIntegration();
    if (!integration) {
      return NextResponse.json(
        {
          error: "Withings-tiliä ei ole vielä yhdistetty.",
          code: "NOT_CONNECTED",
        },
        { status: 401 }
      );
    }

    const activeToken = await refreshWithingsAccessTokenIfNeeded(
      integration,
      clientId,
      clientSecret
    );

    const endDate = new Date();
    // Haetaan vain nykyisen ohjelman alusta (2026-11-14) lähtien, ei vanhoja lokakuun treenejä
    const programStart = new Date("2026-11-14T00:00:00Z");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate =
      programStart > thirtyDaysAgo ? programStart : thirtyDaysAgo;

    const formBody = new URLSearchParams({
      action: "getworkouts",
      startdateymd: formatYMD(startDate),
      enddateymd: formatYMD(endDate),
      data_fields:
        "calories,intensity,hr_average,hr_min,hr_max,hr_zone_0,hr_zone_1,hr_zone_2,hr_zone_3,steps,distance,elevation",
    });

    const resp = await fetch("https://wbsapi.withings.net/v2/measure", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${activeToken.access_token}`,
      },
      body: formBody.toString(),
    });

    const json = await resp.json();
    if (!resp.ok || json.status !== 0) {
      return NextResponse.json(
        {
          error: `Withings API -virhe (status ${json?.status ?? resp.status})`,
        },
        { status: 502 }
      );
    }

    const series: WithingsSeriesItem[] = json.body?.series || [];
    // Suodatetaan VAIN juoksut, hiihdot ja salitreenit (ei kävelyitä tai satunnaisia muita treenejä)
    const filteredSeries = series.filter(isAllowedWithingsWorkout);
    const candidateLogs = filteredSeries.map(mapWithingsWorkoutToLog);

    // Tarkistetaan olemassa olevat ei-Withings-kirjaukset, ettei samalle päivälle ja lajille tule tuplaa
    const { data: existingLogs } = await supabase
      .from("treenimaster_logs")
      .select("id, performed_date, category, source")
      .gte("performed_date", formatYMD(startDate))
      .neq("source", "withings");

    const existingKeys = new Set(
      (existingLogs || []).map((e) => `${e.performed_date}__${e.category}`)
    );

    const mappedLogs = candidateLogs.filter(
      (log) => !existingKeys.has(`${log.performedDate}__${log.category}`)
    );

    if (mappedLogs.length > 0) {
      const rows = mappedLogs.map((log) => ({
        id: log.id,
        performed_date: log.performedDate,
        category: log.category,
        title: log.title,
        cycle_number: null,
        workout_number: null,
        program_id: null,
        duration_minutes: log.durationMinutes,
        rpe: log.rpe,
        exercises: [],
        feelings: log.feelings,
        oxygen_score: log.oxygenScore,
        energy_score: log.energyScore,
        recovery_status: log.recoveryStatus,
        source: log.source,
        created_at: log.createdAt,
      }));

      const { error: upsertErr } = await supabase
        .from("treenimaster_logs")
        .upsert(rows);

      if (upsertErr) {
        return NextResponse.json(
          { error: `Supabase-tallennus epäonnistui: ${upsertErr.message}` },
          { status: 500 }
        );
      }
    }

    const syncedAt = new Date().toISOString();
    await supabase
      .from("treenimaster_integrations")
      .update({ last_synced_at: syncedAt, updated_at: syncedAt })
      .eq("provider", "withings");

    return NextResponse.json({
      syncedCount: mappedLogs.length,
      logs: mappedLogs,
      lastSyncedAt: syncedAt,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Withings-synkronointi epäonnistui.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
