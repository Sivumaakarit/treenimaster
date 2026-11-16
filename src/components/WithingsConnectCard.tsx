"use client";

import { WorkoutLog } from "@/lib/types";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Unlink,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface WithingsStatus {
  configured: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
  userid: string | null;
  redirectUri: string;
}

interface WithingsConnectCardProps {
  compact?: boolean;
  onSyncedLogs: (logs: WorkoutLog[], message: string) => void;
}

export function WithingsConnectCard({
  compact = false,
  onSyncedLogs,
}: WithingsConnectCardProps) {
  const [status, setStatus] = useState<WithingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/withings/status");
      if (res.ok) {
        const data = (await res.json()) as WithingsStatus;
        setStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setErrorMsg(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/withings/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Synkronointi epäonnistui.");
        return;
      }
      const syncedLogs = (data.logs || []) as WorkoutLog[];
      const msg =
        syncedLogs.length > 0
          ? `Haettu ${syncedLogs.length} treeniä Withingsistä Supabaseen ✓`
          : "Withings synkronoitu – ei uusia treenejä viimeisen 30 vrk ajalta.";
      setFeedback(msg);
      onSyncedLogs(syncedLogs, msg);
      await loadStatus();
    } catch {
      setErrorMsg("Yhteysvirhe Withings-synkronoinnissa.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setSyncing(true);
    try {
      await fetch("/api/withings/disconnect", { method: "POST" });
      setFeedback("Withings-yhteys katkaistu.");
      await loadStatus();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5 text-xs text-zinc-400 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#64D2FF]" />
        <span>Tarkistetaan Withings-yhteyttä...</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border ${
        status?.connected
          ? "border-[#34C759]/40 bg-[#34C759]/[0.08]"
          : "border-[#0A84FF]/35 bg-[#0A84FF]/[0.08]"
      } ${compact ? "p-3.5" : "p-4"} space-y-2.5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/45 border border-white/10">
            <Activity className="h-4 w-4 text-[#30D158]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Withings</span>
              {status?.connected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#34C759]/20 border border-[#34C759]/45 px-2 py-0.5 text-[11px] font-bold text-[#30D158]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Yhdistetty</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300">
              {status?.connected
                ? status.lastSyncedAt
                  ? `Viimeksi haettu: ${new Date(status.lastSyncedAt).toLocaleString("fi-FI")}`
                  : "Valmis hakemaan lenkit, kilometrit ja sykkeet."
                : "Tuo juoksulenkkien kilometrit, kesto ja sykkeet automaattisesti."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status?.connected ? (
            <>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="apple-press inline-flex items-center gap-1.5 rounded-xl bg-[#34C759] px-3.5 py-2 text-xs font-bold text-black shadow-sm disabled:opacity-60"
              >
                {syncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{syncing ? "Haetaan..." : "Hae treenit Withingsistä"}</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={syncing}
                title="Katkaise Withings-yhteys"
                className="apple-press inline-flex items-center gap-1 rounded-xl bg-white/8 hover:bg-white/14 border border-white/12 px-2.5 py-2 text-xs font-medium text-zinc-300"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </>
          ) : status?.configured ? (
            <a
              href="/api/withings/auth"
              className="apple-press inline-flex items-center gap-1.5 rounded-xl bg-[#0A84FF] hover:bg-[#007AFF] px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Yhdistä Withings</span>
            </a>
          ) : (
            <a
              href="https://developer.withings.com"
              target="_blank"
              rel="noreferrer"
              className="apple-press inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 py-2 text-xs font-semibold text-[#64D2FF]"
            >
              <span>Avaa Withings Developer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {!status?.configured && (
        <div className="rounded-xl bg-black/45 border border-white/10 p-3 text-xs text-zinc-300 space-y-1">
          <div className="font-semibold text-[#FFD60A]">
            Withings API-avaimet puuttuvat vielä Vercel-asetuksista:
          </div>
          <p>
            Lisää ilmaisesta Withings Developer -portaalista saamasi{" "}
            <code className="text-white">WITHINGS_CLIENT_ID</code> ja{" "}
            <code className="text-white">WITHINGS_CLIENT_SECRET</code>{" "}
            ympäristömuuttujiksi. Paluuosoite (Callback URL):{" "}
            <code className="text-[#30D158] break-all">
              {status?.redirectUri}
            </code>
          </p>
        </div>
      )}

      {feedback && (
        <div className="text-xs font-semibold text-[#30D158]">{feedback}</div>
      )}
      {errorMsg && (
        <div className="text-xs font-semibold text-[#FF6961]">{errorMsg}</div>
      )}
    </div>
  );
}
