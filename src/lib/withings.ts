import { supabase } from "./supabaseClient";
import { SportCategory, WorkoutLog } from "./types";

export interface WithingsTokenRow {
  provider: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  userid: string | null;
  scope: string | null;
  last_synced_at: string | null;
  updated_at: string;
}

export interface WithingsSeriesItem {
  id: number;
  category: number;
  timezone?: string;
  startdate: number;
  enddate: number;
  data?: {
    calories?: number;
    distance?: number;
    elevation?: number;
    hr_average?: number;
    hr_min?: number;
    hr_max?: number;
    hr_zone_0?: number;
    hr_zone_1?: number;
    hr_zone_2?: number;
    hr_zone_3?: number;
    intensity?: number;
    steps?: number;
  };
}

export function getWithingsConfig(requestOrigin?: string) {
  const clientId = (process.env.WITHINGS_CLIENT_ID || "").trim();
  const clientSecret = (process.env.WITHINGS_CLIENT_SECRET || "").trim();
  const envRedirect = (process.env.WITHINGS_REDIRECT_URI || "").trim();
  const baseOrigin =
    requestOrigin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://treenimaster.vercel.app";
  const redirectUri = envRedirect || `${baseOrigin}/api/withings/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

export async function getWithingsIntegration(): Promise<WithingsTokenRow | null> {
  const { data, error } = await supabase
    .from("treenimaster_integrations")
    .select("*")
    .eq("provider", "withings")
    .maybeSingle();

  if (error || !data) return null;
  return data as WithingsTokenRow;
}

export async function saveWithingsIntegration(params: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  userid?: string | number | null;
  scope?: string | null;
  last_synced_at?: string | null;
}) {
  const expiresAt = new Date(
    Date.now() + Math.max(60, Number(params.expires_in) || 10800) * 1000
  ).toISOString();

  const row = {
    provider: "withings",
    access_token: params.access_token,
    refresh_token: params.refresh_token,
    expires_at: expiresAt,
    userid: params.userid != null ? String(params.userid) : null,
    scope: params.scope ?? "user.info,user.metrics,user.activity",
    last_synced_at: params.last_synced_at ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("treenimaster_integrations")
    .upsert(row);

  if (error) {
    throw new Error(`Supabase Withings-tallennus epäonnistui: ${error.message}`);
  }
  return row;
}

export async function refreshWithingsAccessTokenIfNeeded(
  row: WithingsTokenRow,
  clientId: string,
  clientSecret: string
): Promise<WithingsTokenRow> {
  const expiresMs = new Date(row.expires_at).getTime();
  // Jos token on voimassa vielä yli 5 min, käytetään suoraan
  if (expiresMs - Date.now() > 5 * 60 * 1000) {
    return row;
  }

  const body = new URLSearchParams({
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: row.refresh_token,
  });

  const resp = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await resp.json();
  if (!resp.ok || json.status !== 0 || !json.body?.access_token) {
    throw new Error(
      `Withings-tokenin päivitys epäonnistui (status ${json?.status ?? resp.status})`
    );
  }

  const saved = await saveWithingsIntegration({
    access_token: json.body.access_token,
    refresh_token: json.body.refresh_token || row.refresh_token,
    expires_in: json.body.expires_in || 10800,
    userid: json.body.userid ?? row.userid,
    scope: json.body.scope ?? row.scope,
    last_synced_at: row.last_synced_at,
  });

  return saved as WithingsTokenRow;
}

/**
 * Hyväksytään Withingsistä VAIN varsinaiset juoksut, hiihdot ja salitreenit
 * (ei kävelyitä, pyöräilyitä tai satunnaisia automaattitunnistuksia).
 */
export function isAllowedWithingsWorkout(item: WithingsSeriesItem): boolean {
  const durationMinutes = Math.round((item.enddate - item.startdate) / 60);
  const distanceMeters = item.data?.distance ?? 0;

  // 2 = Juoksu (vähintään 8 min ja vähintään 500 m jos matka mitattu)
  if (item.category === 2) {
    if (durationMinutes < 8) return false;
    if (distanceMeters > 0 && distanceMeters < 500) return false;
    return true;
  }

  // 13, 14 = Hiihto (vähintään 10 min)
  if (item.category === 13 || item.category === 14) {
    return durationMinutes >= 10;
  }

  // 16, 31, 32 = Kuntosali / Voimaharjoittelu (vähintään 15 min)
  if (item.category === 16 || item.category === 31 || item.category === 32) {
    return durationMinutes >= 15;
  }

  return false;
}

function mapWithingsCategory(catId: number): {
  category: SportCategory;
  label: string;
} {
  switch (catId) {
    case 2:
      return { category: "run", label: "Juoksu" };
    case 13:
    case 14:
      return { category: "ski", label: "Hiihto" };
    case 16:
    case 31:
    case 32:
      return { category: "strength", label: "Kuntosali" };
    default:
      return { category: "other", label: "Harjoitus" };
  }
}

export function mapWithingsWorkoutToLog(item: WithingsSeriesItem): WorkoutLog {
  const { category, label } = mapWithingsCategory(item.category);
  const durationMinutes = Math.max(
    1,
    Math.round((item.enddate - item.startdate) / 60)
  );
  const rawDistanceMeters = item.data?.distance ?? 0;
  const distanceKm =
    rawDistanceMeters >= 100
      ? Math.round((rawDistanceMeters / 1000) * 10) / 10
      : null;

  const tz = item.timezone || "Europe/Helsinki";
  const performedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(item.startdate * 1000));

  const hrAvg = item.data?.hr_average
    ? Math.round(item.data.hr_average)
    : null;
  const hrMax = item.data?.hr_max ? Math.round(item.data.hr_max) : null;
  const calories = item.data?.calories
    ? Math.round(item.data.calories)
    : null;
  const intensity = item.data?.intensity ?? null;

  let intensityTag = "";
  let rpe = 6.0;
  if (category === "run") {
    if ((hrAvg && hrAvg >= 152) || (intensity && intensity >= 65)) {
      intensityTag = " (VK / Intervalli)";
      rpe = 7.8;
    } else if (hrAvg && hrAvg >= 135) {
      intensityTag = " (PK2 / Reipas)";
      rpe = 6.8;
    } else {
      intensityTag = " (Kevyt PK1)";
      rpe = 5.5;
    }
  }

  const titleParts = [`${label}${intensityTag}`];
  if (distanceKm !== null) {
    titleParts.push(`${String(distanceKm).replace(".", ",")} km`);
  }
  titleParts.push(`${durationMinutes} min`);

  const detailParts: string[] = [];
  if (distanceKm !== null) {
    detailParts.push(`Matka: ${String(distanceKm).replace(".", ",")} km`);
  }
  detailParts.push(`Kesto: ${durationMinutes} min`);
  if (hrAvg) {
    detailParts.push(
      hrMax ? `Keskisyke: ${hrAvg} bpm (max ${hrMax} bpm)` : `Keskisyke: ${hrAvg} bpm`
    );
  }
  if (calories) {
    detailParts.push(`Kalorit: ${calories} kcal`);
  }

  return {
    id: `withings-${item.id}`,
    performedDate,
    category,
    title: titleParts.join(" · "),
    cycleNumber: null,
    workoutNumber: null,
    programId: null,
    durationMinutes,
    rpe,
    exercises: [],
    feelings: `Tuotu Withingsistä: ${detailParts.join(" · ")}.`,
    oxygenScore: 4,
    energyScore: 4,
    recoveryStatus: "normaali",
    source: "withings",
    createdAt: new Date(item.startdate * 1000).toISOString(),
  };
}
