"use client";

import { computeContinuousCoachingIntelligence } from "@/lib/coachIntelligence";
import { SPORT_CATEGORIES } from "@/lib/programData";
import { NextWorkoutRecommendation } from "@/lib/storage";
import { ProgramWorkout, WorkoutLog } from "@/lib/types";
import { extractDistanceKmFromLog } from "@/lib/workoutParser";
import {
  Activity,
  AlertCircle,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  Cpu,
  Dumbbell,
  Edit3,
  Footprints,
  Trash2,
  Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { SportCharacterAvatar } from "./SportCharacterAvatar";
import { WorkoutLogEditor } from "./WorkoutLogEditor";

interface AnalyticsAndProgressViewProps {
  programs: ProgramWorkout[];
  logs: WorkoutLog[];
  recommendation: NextWorkoutRecommendation;
  onSaveLog: (log: WorkoutLog) => void;
  onDeleteLog: (logId: string) => void;
  onNavigateToProgram: () => void;
  onNavigateToCoach: () => void;
}

export function AnalyticsAndProgressView({
  programs,
  logs,
  recommendation,
  onSaveLog,
  onDeleteLog,
  onNavigateToProgram,
  onNavigateToCoach,
}: AnalyticsAndProgressViewProps) {
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const intel = useMemo(
    () =>
      computeContinuousCoachingIntelligence(programs, logs, recommendation),
    [programs, logs, recommendation]
  );

  const runAndSkiLogs = useMemo(
    () =>
      [...logs]
        .filter((l) => l.category === "run" || l.category === "ski")
        .sort((a, b) => b.performedDate.localeCompare(a.performedDate)),
    [logs]
  );

  const totalRunMinutes = useMemo(
    () =>
      runAndSkiLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0),
    [runAndSkiLogs]
  );

  // Rakennetaan 12 kierron maastavedon & penkin huippupainojen graafinen sarja
  const cycleProgressionData = useMemo(() => {
    const cycles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return cycles.map((c) => {
      const w1 = programs.find(
        (p) => p.cycleNumber === c && p.workoutNumber === 1
      );
      const dlEx = w1?.exercises.find((e) => e.code === "DL");
      const bEx = w1?.exercises.find((e) => e.code === "B");
      const topDl = parseFloat(
        (dlEx?.sets[0]?.weightKg || "170").replace(",", ".")
      );
      const topB = parseFloat(
        (bEx?.sets[0]?.weightKg || "92.5").replace(",", ".")
      );
      const done = logs.some(
        (l) =>
          l.category === "strength" &&
          l.cycleNumber === c &&
          l.workoutNumber === 1
      );
      const isCurrent = recommendation.nextWorkout.cycleNumber === c;
      return {
        cycle: c,
        topDl: Number.isNaN(topDl) ? 170 : topDl,
        topB: Number.isNaN(topB) ? 90 : topB,
        done,
        isCurrent,
        isDeload: c === 4 || c === 8 || c === 11,
      };
    });
  }, [programs, logs, recommendation.nextWorkout.cycleNumber]);

  const activeLogsChronological = useMemo(() => {
    return [...logs].sort((a, b) =>
      b.performedDate.localeCompare(a.performedDate)
    );
  }, [logs]);

  return (
    <div className="min-w-0 space-y-6">
      {/* 1. JATKUVA TAUSTA-ÄLY (AUTO-COACHING ENGINE) & TUNNUSLUVUT */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6 border border-[#34C759]/35 bg-gradient-to-br from-[#34C759]/[0.07] via-transparent to-[#0A84FF]/[0.07]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#34C759]/20 border border-[#34C759]/40 px-3 py-1 text-xs font-bold text-[#30D158]">
              <Cpu className="w-3.5 h-3.5" />
              <span>Jatkuva tausta-äly aktiivinen · Päivittyy jokaisesta kirjauksesta</span>
            </div>
            <h1 className="apple-display text-white pt-1">
              Kehitys, graafinen analytiikka & tausta-äly
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl">
              Valmentajan äly analysoi automaattisesti jokaisen voimatreenin,
              juoksulenkin kilometrit, sykealueet (PK vs. intervalli) sekä
              kirjaamasi poikkeamien syyt – ilman että sinun tarvitsee erikseen
              pyytää analyysiä.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateToCoach}
            className="apple-press self-start lg:self-center shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/45 text-xs font-semibold text-[#64D2FF]"
          >
            <Bot className="w-4 h-4" />
            <span>Keskustele valmentajan kanssa</span>
          </button>
        </div>

        {/* 4 Ydinkorttia (Bento-mittaristo) */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Palautumis- & valmiusindeksi */}
          <div className="apple-card rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span>Valmiusindeksi</span>
              <Zap className="w-4 h-4 text-[#30D158]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#30D158]">
                {intel.readinessScore} %
              </span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-zinc-300">
              {intel.readinessLabel}
            </div>
          </div>

          {/* 8 vk voimaohjelman eteneminen */}
          <div className="apple-card rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span>8 vk perusvoima</span>
              <Dumbbell className="w-4 h-4 text-[#64D2FF]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {intel.completedBaseWorkouts} / {intel.totalBaseWorkouts}
              </span>
              <span className="text-xs font-bold text-[#30D158]">
                ({intel.baseCompletionPercent} %)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              Seuraava: {recommendation.nextWorkout.title}
            </div>
          </div>

          {/* Kestävyys & juoksukilometrit */}
          <div className="apple-card rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span>Juoksu & kestävyys</span>
              <Footprints className="w-4 h-4 text-[#30D158]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {intel.totalRunDistanceKm} km
              </span>
              <span className="text-xs text-zinc-400">
                ({intel.totalEnduranceLogs} kpl)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              PK: {intel.pkRunsCount} kpl · VK/Intervalli:{" "}
              {intel.highIntensityRunsCount} kpl
            </div>
          </div>

          {/* Happi & Vireys keskiarvo */}
          <div className="apple-card rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span>Happi & vireystrendi</span>
              <Activity className="w-4 h-4 text-[#FFD60A]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {intel.avgOxygen}
              </span>
              <span className="text-xs text-zinc-400">/ 5 happi</span>
              <span className="text-sm font-bold text-[#64D2FF]">
                · {intel.avgEnergy}/5 vire
              </span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              Suunnitelman toteutuma: {intel.adherenceRatePercent} %
            </div>
          </div>
        </div>

        {/* Automaattiset tausta-älyn havainnot */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {intel.coachInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-4 border ${
                insight.type === "success"
                  ? "bg-[#34C759]/10 border-[#34C759]/35"
                  : insight.type === "warning"
                  ? "bg-[#FF9F0A]/10 border-[#FF9F0A]/35"
                  : "bg-white/[0.04] border-white/10"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                {insight.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-[#30D158] shrink-0" />
                ) : insight.type === "warning" ? (
                  <AlertCircle className="w-4 h-4 text-[#FFD60A] shrink-0" />
                ) : (
                  <Bot className="w-4 h-4 text-[#64D2FF] shrink-0" />
                )}
                <span>{insight.title}</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed">
                {insight.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Kuinka usein ja miten tausta-äly toimii? */}
        <div className="mt-4 rounded-2xl bg-black/40 border border-white/10 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#64D2FF] mb-2">
            Miten ja kuinka usein Treenimasterin tausta-äly analysoi harjoittelua?
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-300">
            <div>
              <strong className="text-white block">
                1. Heti jokaisen suorituksen jälkeen (Reaaliaikainen)
              </strong>
              Kun kuittaat voimatreenin tai sanelet lenkin, äly tarkistaa
              välittömästi sarjat, kilometrit, lenkin luonteen (PK vs.
              intervalli) ja mahdollisen poikkeaman syyn sekä antaa heti
              tsemppi- ja palautumispalautteen.
            </div>
            <div>
              <strong className="text-white block">
                2. Liukuva 14 vrk yhdistelmäkuorma (Voima + Juoksu)
              </strong>
              Seuraa jatkuvasti, etteivät vauhdikkaat juoksulenkit tai tennis
              syö alavartalon palautumista ennen raskasta maastavetoa (T1) tai
              etukyykkyä (T2).
            </div>
            <div>
              <strong className="text-white block">
                3. Kolmen kierron trendisääntö (Ei ylireagointia)
              </strong>
              Yksittäinen huono yö tai aikapula kirjataan muistiin, mutta
              ohjelmaa ei muuteta hätiköidysti. Jos 3 peräkkäisessä treenissä
              toistuu sama tukkoisuus, valmentaja ehdottaa kevennystä.
            </div>
          </div>
        </div>
      </section>

      {/* 2. GRAAFINEN KUVAAJA: PÄÄLIIKKEIDEN KEHITYS KOHTI 12 VIIKON TAVOITTEITA */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#30D158]">
              <Award className="w-3.5 h-3.5" />
              <span>Maksimivoiman tavoitemittaristo</span>
            </div>
            <h2 className="apple-title text-white mt-0.5">
              Pääliikkeiden kehitys kohti 12 viikon ennätystavoitteita
            </h2>
          </div>
          <button
            type="button"
            onClick={onNavigateToProgram}
            className="apple-press self-start sm:self-center text-xs font-semibold text-[#64D2FF] hover:underline"
          >
            Katso & muokkaa 8 vk ohjelmaa →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {intel.liftMetrics.map((lift) => {
            const prefix = lift.code === "L" ? "+" : "";
            return (
              <div
                key={lift.code}
                className="apple-card rounded-2xl p-4 border border-white/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#64D2FF]">
                      {lift.name}
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xs text-zinc-400">
                        Lähtö: {prefix}
                        {lift.start1RM} kg
                      </span>
                      <span className="text-zinc-500">→</span>
                      <span className="text-base sm:text-lg font-extrabold text-[#30D158]">
                        Tavoite: {lift.targetLabel}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#34C759]/15 border border-[#34C759]/35 text-xs font-bold text-[#30D158]">
                    {lift.progressPercent} % matkasta
                  </span>
                </div>

                {/* Vihreä etenemispalkki */}
                <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0A84FF] via-[#34C759] to-[#30D158] transition-all duration-500"
                    style={{ width: `${lift.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span>Viimeisin / nykyinen sarjataso:</span>
                  <strong className="text-white">{lift.latestSetSummary}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. GRAAFINEN KUVAAJA: KUORMITUS- JA PAINOAALLOT KIERROISSA 1–12 */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="apple-title text-white">
              Voimaohjelman kuormitusaallot & nykytila (Kierrot 1–12)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pylväät näyttävät Maastavedon (Treeni 1) huippusarjan kuorman
              kierroittain. Vihreä pylväs = suoritettu, korostettu = nyt
              menossa, turkoosi = kevennyskierto (Deload).
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 pb-2 px-2 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto">
          <div className="min-w-[560px] flex items-end justify-between gap-2 h-48 px-2">
            {cycleProgressionData.map((item) => {
              const minKg = 130;
              const maxKg = 215;
              const heightPct = Math.max(
                18,
                Math.min(
                  100,
                  Math.round(((item.topDl - minKg) / (maxKg - minKg)) * 100)
                )
              );

              return (
                <div
                  key={item.cycle}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                >
                  <span
                    className={`text-[10px] font-bold mb-1.5 ${
                      item.done
                        ? "text-[#30D158]"
                        : item.isCurrent
                        ? "text-[#64D2FF]"
                        : "text-zinc-400"
                    }`}
                  >
                    {item.topDl} kg
                  </span>

                  <div className="w-full max-w-[38px] h-32 flex items-end justify-center bg-white/[0.03] rounded-xl p-1 border border-white/5">
                    <div
                      className={`w-full rounded-lg transition-all ${
                        item.done
                          ? "bg-gradient-to-t from-[#34C759] to-[#30D158] shadow-[0_0_12px_rgba(52,199,89,0.5)]"
                          : item.isCurrent
                          ? "bg-gradient-to-t from-[#007AFF] to-[#64D2FF] ring-2 ring-[#34C759]"
                          : item.isDeload
                          ? "bg-[#32ADE6]/40"
                          : "bg-white/20"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  <span
                    className={`mt-2 text-[11px] font-bold ${
                      item.done
                        ? "text-[#30D158]"
                        : item.isCurrent
                        ? "text-white underline decoration-[#34C759]"
                        : "text-zinc-400"
                    }`}
                  >
                    {item.cycle <= 8 ? `K${item.cycle}` : `V${item.cycle}`}
                    {item.done ? " ✓" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3.5 JUOKSUKILOMETRIT & LENKKIEN SEURANTA (Yhteiskilometrit + helppo km-lisäys esim. Withingsistä) */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6 border border-[#34C759]/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#30D158]">
              <Footprints className="w-3.5 h-3.5" />
              <span>Juoksukilometrit & kestävyyslaskuri</span>
            </div>
            <h2 className="apple-title text-white mt-0.5">
              Juoksukilometrit yhteensä:{" "}
              <span className="text-[#30D158]">
                {String(intel.totalRunDistanceKm).replace(".", ",")} km
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Voit lisätä tai muokata minkä tahansa lenkin kilometrit (esim.
              Withings-sovelluksesta katsotun matkan) suoraan alta, jolloin
              yhteiskilometrit päivittyvät heti.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 shrink-0">
            <div className="rounded-2xl bg-black/45 border border-white/10 px-3.5 py-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase text-zinc-400">
                Yhteensä km
              </div>
              <div className="text-base sm:text-lg font-extrabold text-[#30D158]">
                {String(intel.totalRunDistanceKm).replace(".", ",")} km
              </div>
            </div>
            <div className="rounded-2xl bg-black/45 border border-white/10 px-3.5 py-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase text-zinc-400">
                Lenkit
              </div>
              <div className="text-base sm:text-lg font-extrabold text-white">
                {runAndSkiLogs.length} kpl
              </div>
            </div>
            <div className="rounded-2xl bg-black/45 border border-white/10 px-3.5 py-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase text-zinc-400">
                Kokonaisaika
              </div>
              <div className="text-base sm:text-lg font-extrabold text-[#64D2FF]">
                {totalRunMinutes} min
              </div>
            </div>
          </div>
        </div>

        {runAndSkiLogs.length === 0 ? (
          <div className="mt-4 text-xs text-zinc-400">
            Ei vielä kirjattuja lenkkejä. Kun kirjaat tai sanelet lenkin, sen
            kilometrit lasketaan automaattisesti tähän.
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {runAndSkiLogs.map((rLog) => {
              const km = extractDistanceKmFromLog(rLog);
              const isEditingThis = editingLogId === rLog.id;

              return (
                <div
                  key={rLog.id}
                  className="rounded-2xl bg-black/35 border border-white/10 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <SportCharacterAvatar
                        category={rLog.category}
                        title={rLog.title}
                        feelings={rLog.feelings}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">
                            {rLog.title}
                          </span>
                          {km !== null ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#34C759]/25 border border-[#34C759]/50 text-xs font-extrabold text-[#30D158]">
                              {String(km).replace(".", ",")} km
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingLogId(rLog.id)}
                              className="apple-press px-2.5 py-0.5 rounded-lg bg-[#34C759]/15 hover:bg-[#34C759]/25 border border-dashed border-[#34C759]/60 text-xs font-bold text-[#30D158]"
                            >
                              + Lisää kilometrit (Withings)
                            </button>
                          )}
                          {rLog.durationMinutes ? (
                            <span className="text-xs text-zinc-400">
                              {rLog.durationMinutes} min
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {rLog.performedDate} · {rLog.feelings}
                        </div>
                      </div>
                    </div>

                    {!isEditingThis && (
                      <button
                        type="button"
                        onClick={() => setEditingLogId(rLog.id)}
                        className="apple-press inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#64D2FF]" />
                        <span>Muokkaa / km</span>
                      </button>
                    )}
                  </div>

                  {isEditingThis && (
                    <WorkoutLogEditor
                      log={rLog}
                      onSave={(updated) => {
                        onSaveLog(updated);
                        setEditingLogId(null);
                      }}
                      onCancel={() => setEditingLogId(null)}
                      onDelete={(id) => {
                        onDeleteLog(id);
                        setEditingLogId(null);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. KAIKKIEN SUORITUSTEN HISTORIA & MUOKKAUS */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6">
        <h2 className="apple-title text-white">
          Kaikki kirjatut harjoitukset & muokkaus (
          {activeLogsChronological.length} kpl)
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5 mb-4">
          Voit muokata mitä tahansa aiempaa treeniä, lisätä puuttuneet
          kilometrit tai muokata sarjoja painamalla &ldquo;Muokkaa&rdquo;.
          Muutokset tallentuvat suoraan Supabaseen.
        </p>

        <div className="space-y-3">
          {activeLogsChronological.map((log) => {
            const cat = SPORT_CATEGORIES[log.category];
            const o2Pct = ((log.oxygenScore || 4) / 5) * 100;
            const enPct = ((log.energyScore || 4) / 5) * 100;
            const kmVal = extractDistanceKmFromLog(log);
            const isEditingThis = editingLogId === log.id;

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <SportCharacterAvatar
                      category={log.category}
                      title={log.title}
                      feelings={log.feelings}
                      size="sm"
                    />
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                      style={cat.badgeStyle}
                    >
                      {cat.shortLabel}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white">
                      {log.title}
                    </span>
                    {kmVal !== null ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#34C759]/25 border border-[#34C759]/50 text-xs font-extrabold text-[#30D158]">
                        {String(kmVal).replace(".", ",")} km
                      </span>
                    ) : log.category === "run" || log.category === "ski" ? (
                      <button
                        type="button"
                        onClick={() => setEditingLogId(log.id)}
                        className="apple-press px-2.5 py-0.5 rounded-lg bg-[#34C759]/15 hover:bg-[#34C759]/25 border border-dashed border-[#34C759]/50 text-xs font-semibold text-[#30D158]"
                      >
                        + Lisää km
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {log.durationMinutes ? (
                      <span>{log.durationMinutes} min</span>
                    ) : null}
                    <span>·</span>
                    <span className="font-semibold text-zinc-200">
                      {log.performedDate}
                    </span>
                    {!isEditingThis && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingLogId(log.id)}
                          className="apple-press ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#64D2FF]" />
                          <span>Muokkaa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLog(log.id)}
                          title="Poista suoritus"
                          className="apple-press p-1.5 rounded-xl bg-white/6 hover:bg-[#FF453A]/20 border border-white/10 text-zinc-400 hover:text-[#FF6961]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditingThis ? (
                  <WorkoutLogEditor
                    log={log}
                    onSave={(updated) => {
                      onSaveLog(updated);
                      setEditingLogId(null);
                    }}
                    onCancel={() => setEditingLogId(null)}
                    onDelete={(id) => {
                      onDeleteLog(id);
                      setEditingLogId(null);
                    }}
                  />
                ) : (
                  <>
                    {/* Graafiset mittaripalkit: Happi & Tangon nopeus/Vireys */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-300 mb-1">
                          <span>Hapen kulku</span>
                          <span className="font-bold text-[#30D158]">
                            {log.oxygenScore || 4} / 5
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#34C759]"
                            style={{ width: `${o2Pct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-300 mb-1">
                          <span>Voimat / tangon nopeus</span>
                          <span className="font-bold text-[#64D2FF]">
                            {log.energyScore || 4} / 5
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0A84FF]"
                            style={{ width: `${enPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Jos voimatreeni, näytetään tehdyt sarjat */}
                    {log.exercises && log.exercises.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {log.exercises.map((ex) => (
                          <div
                            key={ex.id}
                            className="rounded-xl bg-black/40 border border-white/8 px-3 py-2 text-xs"
                          >
                            <div className="font-semibold text-white">
                              {ex.name}
                            </div>
                            <div className="mt-0.5 text-[#30D158] font-medium">
                              {ex.sets
                                .map(
                                  (s) =>
                                    `${s.actualReps || s.reps}×${
                                      s.actualWeightKg || s.weightKg
                                    } kg`
                                )
                                .join(", ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {log.feelings && (
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {log.feelings}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. NOTEBOOKLM & FYSIOLOGINEN TIETOPOHJA */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-300">
          <BookOpen className="h-3.5 w-3.5" />
          <span>
            Valmentajan fysiologiset periaatteet (NotebookLM, 43 lähdettä)
          </span>
        </div>
        <h3 className="mt-2 text-xl font-bold text-white">
          Ohjelman tieteellinen perusta
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h4 className="text-sm font-bold text-white">
              1. PAP-kontrasti ja 1–1,5 toiston tekninen reservi
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              Treeni 1:n raskas 1–3 toiston huippusarja toimii{" "}
              <strong>Post-Activation Potentiation (PAP)</strong> -herätteenä,
              joka rekrytoi korkean kynnyksen motoriset yksiköt ennen 2×5
              back-off-volyymisarjoja (tai tasaisempia 3×4 perusvoimakiertoja).
              Sarjoja ei viedä koskaan tekniseen failureen, jotta
              keskushermosto (CNS) ei ylikuormitu.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h4 className="text-sm font-bold text-white">
              2. Liukuva mikrosykli & 2–3 välipäivän sääntö
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              Yksi treenikierto koostuu kolmesta harjoituksesta (T1, T2, T3),
              joiden välissä pidetään 2–3 täyttä lepopäivää raskaan maastavedon
              jälkeen ennen etukyykkyä. Yksi kierto kestää tyypillisesti 9–12
              päivää.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h4 className="text-sm font-bold text-white">
              3. Yhdistelmäharjoittelu (juoksu, tennis, hiihto)
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              Kevyt aerobinen harjoittelu (PK1-juoksu 20–30 min, tennis, hiihto)
              välipäivinä nopeuttaa palautumista ja parantaa sarjakestävyyttä.
              Kovatehoista juoksua vältetään 24–36 h ennen raskasta maastaveto-
              tai etukyykkypäivää.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <h4 className="text-sm font-bold text-white">
              4. Ohjelman koskemattomuus
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              Valmentaja ei koskaan muuta 8 viikon voimaohjelmaa automaattisesti
              yksittäisen huonon päivän vuoksi. Jos usean viikon trendi osoittaa
              palautumisen sakkaavan, valmentaja tekee perustellun
              muutosehdotuksen, jonka voit hyväksyä tai hylätä.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
