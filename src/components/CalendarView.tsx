"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Edit3,
  Flame,
  HeartPulse,
  Plus,
  Sparkles,
  Trash2,
  Wind,
} from "lucide-react";
import { SPORT_CATEGORIES } from "@/lib/programData";
import { RecoveryStatus, SportCategory, WorkoutLog } from "@/lib/types";
import { formatLocalISODate } from "@/lib/storage";
import {
  extractDistanceKmFromLog,
  formatStandardWorkoutTitle,
  parseSpokenWorkout,
} from "@/lib/workoutParser";
import { VoiceInputButton } from "./VoiceInputButton";
import { SportCharacterAvatar } from "./SportCharacterAvatar";
import { WorkoutLogEditor } from "./WorkoutLogEditor";

interface CalendarViewProps {
  logs: WorkoutLog[];
  todayISO: string;
  onAddLog: (log: WorkoutLog) => void;
  onDeleteLog: (logId: string) => void;
}

const WEEKDAYS_FI = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];
const MONTHS_FI = [
  "Tammikuu",
  "Helmikuu",
  "Maaliskuu",
  "Huhtikuu",
  "Toukokuu",
  "Kesäkuu",
  "Heinäkuu",
  "Elokuu",
  "Syyskuu",
  "Lokakuu",
  "Marraskuu",
  "Joulukuu",
];

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

function getStartOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function CalendarView({
  logs,
  todayISO,
  onAddLog,
  onDeleteLog,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [cursorDate, setCursorDate] = useState<Date>(() =>
    parseISODate(todayISO)
  );
  const [selectedDateISO, setSelectedDateISO] = useState<string>(todayISO);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Manuaalisen / sanelulisäyksen tila
  const [newCategory, setNewCategory] = useState<SportCategory>("run");
  const [newWorkoutType, setNewWorkoutType] = useState("Kevyt PK");
  const [newDistanceKm, setNewDistanceKm] = useState("");
  const [newDuration, setNewDuration] = useState("25");
  const [newRpe, setNewRpe] = useState("6.0");
  const [newOxygen, setNewOxygen] = useState<number>(5);
  const [newEnergy, setNewEnergy] = useState<number>(4);
  const [newRecovery, setNewRecovery] = useState<RecoveryStatus>("erinomainen");
  const [newFeelings, setNewFeelings] = useState("");

  const logsByDate = useMemo(() => {
    const map = new Map<string, WorkoutLog[]>();
    for (const log of logs) {
      const list = map.get(log.performedDate) || [];
      list.push(log);
      map.set(log.performedDate, list);
    }
    return map;
  }, [logs]);

  const calendarDays = useMemo(() => {
    if (viewMode === "week") {
      const monday = getStartOfWeekMonday(cursorDate);
      return Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(
          monday.getFullYear(),
          monday.getMonth(),
          monday.getDate() + i
        );
        return {
          date: dt,
          iso: formatLocalISODate(dt),
          inCurrentMonth: true,
        };
      });
    }

    const firstOfMonth = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      1
    );
    const startMonday = getStartOfWeekMonday(firstOfMonth);
    return Array.from({ length: 42 }, (_, i) => {
      const dt = new Date(
        startMonday.getFullYear(),
        startMonday.getMonth(),
        startMonday.getDate() + i
      );
      return {
        date: dt,
        iso: formatLocalISODate(dt),
        inCurrentMonth: dt.getMonth() === cursorDate.getMonth(),
      };
    });
  }, [cursorDate, viewMode]);

  const selectedDayLogs = useMemo(
    () => logsByDate.get(selectedDateISO) || [],
    [logsByDate, selectedDateISO]
  );

  const stats = useMemo(() => {
    const strengthCount = logs.filter((l) => l.category === "strength").length;
    const enduranceCount = logs.filter(
      (l) =>
        l.category === "run" || l.category === "tennis" || l.category === "ski"
    ).length;
    const restCount = logs.filter((l) => l.category === "rest").length;
    const totalMinutes = logs.reduce(
      (acc, l) => acc + (l.durationMinutes || 0),
      0
    );
    return { strengthCount, enduranceCount, restCount, totalMinutes };
  }, [logs]);

  const handlePrev = () => {
    if (viewMode === "month") {
      setCursorDate(
        new Date(cursorDate.getFullYear(), cursorDate.getMonth() - 1, 1)
      );
    } else {
      setCursorDate(
        new Date(
          cursorDate.getFullYear(),
          cursorDate.getMonth(),
          cursorDate.getDate() - 7
        )
      );
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCursorDate(
        new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1)
      );
    } else {
      setCursorDate(
        new Date(
          cursorDate.getFullYear(),
          cursorDate.getMonth(),
          cursorDate.getDate() + 7
        )
      );
    }
  };

  const handleJumpToday = () => {
    const dt = parseISODate(todayISO);
    setCursorDate(dt);
    setSelectedDateISO(todayISO);
  };

  const handleVoiceDictation = (spoken: string) => {
    const combined = newFeelings ? `${newFeelings} ${spoken}` : spoken;
    setNewFeelings(combined);
    const parsed = parseSpokenWorkout(combined, selectedDateISO);
    setNewCategory(parsed.category);
    setNewWorkoutType(parsed.workoutType);
    if (parsed.distanceKm !== null) {
      setNewDistanceKm(String(parsed.distanceKm).replace(".", ","));
    }
    setNewDuration(String(parsed.durationMinutes));
    setNewRpe(String(parsed.rpe));
    setNewOxygen(parsed.oxygenScore);
    setNewEnergy(parsed.energyScore);
    setNewRecovery(parsed.recoveryStatus);
  };

  const handleCreateRetroLog = (e: React.FormEvent) => {
    e.preventDefault();
    const kmNum = newDistanceKm.trim()
      ? parseFloat(newDistanceKm.replace(",", "."))
      : null;
    const durNum =
      newCategory === "rest" ? 0 : Math.max(5, Number(newDuration) || 25);

    const stdTitle = formatStandardWorkoutTitle({
      category: newCategory,
      workoutType: newWorkoutType,
      distanceKm: kmNum && !Number.isNaN(kmNum) ? kmNum : null,
      durationMinutes: durNum,
    });

    const summaryMeta = [
      `Tyyppi: ${newWorkoutType}`,
      ...(kmNum && !Number.isNaN(kmNum)
        ? [`Matka: ${String(kmNum).replace(".", ",")} km`]
        : []),
      ...(durNum > 0 ? [`Kesto: ${durNum} min`] : []),
      `Happi: ${newOxygen}/5`,
      `Vire: ${newRecovery}`,
    ].join(" · ");

    const entry: WorkoutLog = {
      id: `cal-log-${Date.now()}`,
      performedDate: selectedDateISO,
      category: newCategory,
      title: stdTitle,
      cycleNumber: null,
      workoutNumber: null,
      programId: null,
      durationMinutes: durNum,
      rpe: newCategory === "rest" ? 1 : Number(newRpe) || 6.0,
      exercises: [],
      feelings: newFeelings.trim()
        ? `${summaryMeta}. Yhteenveto: "${newFeelings.trim()}"`
        : summaryMeta,
      oxygenScore: newOxygen,
      energyScore: newEnergy,
      recoveryStatus: newRecovery,
      source: "calendar",
      createdAt: new Date().toISOString(),
    };

    onAddLog(entry);
    setNewDistanceKm("");
    setNewFeelings("");
    setShowAddForm(false);
  };

  const selectedDateFormatted = useMemo(() => {
    const dt = parseISODate(selectedDateISO);
    return dt.toLocaleDateString("fi-FI", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDateISO]);

  return (
    <div className="min-w-0 space-y-5">
      {/* 1. HETI YLHÄÄLLÄ: Kalenteriruudukko + Valitun päivän paneeli */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Vasen: Kalenterinäkymä heti ensimmäisenä */}
        <div className="apple-card min-w-0 overflow-hidden p-4 sm:p-6 xl:col-span-8">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {MONTHS_FI[cursorDate.getMonth()]} {cursorDate.getFullYear()}
              </h2>
              <button
                type="button"
                onClick={handleJumpToday}
                className="apple-press rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-white/[0.12]"
              >
                Tänään
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl bg-black/50 border border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  className={`apple-press rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    viewMode === "month"
                      ? "bg-[#007AFF] text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Kuukausi
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("week")}
                  className={`apple-press rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    viewMode === "week"
                      ? "bg-[#007AFF] text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Viikko
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Edellinen jakso"
                  className="apple-press rounded-xl border border-white/12 bg-white/[0.05] p-1.5 text-zinc-200 hover:bg-white/[0.12]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Seuraava jakso"
                  className="apple-press rounded-xl border border-white/12 bg-white/[0.05] p-1.5 text-zinc-200 hover:bg-white/[0.12]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Viikonpäivien otsikot */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-400">
            {WEEKDAYS_FI.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Päiväruudut */}
          <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((cell) => {
              const dayLogs = logsByDate.get(cell.iso) || [];
              const isToday = cell.iso === todayISO;
              const isSelected = cell.iso === selectedDateISO;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDateISO(cell.iso)}
                  className={`apple-press group relative flex flex-col items-start justify-between rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 text-left transition ${
                    viewMode === "week"
                      ? "min-h-[110px] sm:min-h-[130px]"
                      : "min-h-[68px] sm:min-h-[96px]"
                  } ${
                    isSelected
                      ? "border-[#0A84FF] bg-[#0A84FF]/15 ring-1 ring-[#0A84FF]/40"
                      : cell.inCurrentMonth
                      ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      : "border-white/5 bg-black/20 opacity-40"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-bold ${
                        isToday
                          ? "bg-[#007AFF] text-white"
                          : isSelected
                          ? "text-[#64D2FF]"
                          : "text-zinc-200"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {dayLogs.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {dayLogs.slice(0, 3).map((l) => {
                          const cat = SPORT_CATEGORIES[l.category];
                          return (
                            <span
                              key={l.id}
                              className="h-2 w-2 rounded-full"
                              style={{
                                background:
                                  cat.id === "strength"
                                    ? "linear-gradient(135deg, #007AFF 0%, #FF3B30 100%)"
                                    : cat.hex,
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Päivän treenipillerit */}
                  <div className="mt-1 flex w-full flex-col gap-0.5 overflow-hidden">
                    {dayLogs.slice(0, 2).map((l) => {
                      const cat = SPORT_CATEGORIES[l.category];
                      return (
                        <div
                          key={l.id}
                          className="truncate rounded-md border px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold leading-tight"
                          style={cat.badgeStyle}
                          title={l.title}
                        >
                          {l.category === "strength" && l.cycleNumber
                            ? `K${l.cycleNumber}·T${l.workoutNumber}`
                            : cat.shortLabel}
                        </div>
                      );
                    })}
                    {dayLogs.length > 2 && (
                      <span className="text-[9px] font-medium text-zinc-400">
                        +{dayLogs.length - 2}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Kompakti yksirivinen värikoodien selite suoraan kalenterin alareunassa */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 text-[11px] text-zinc-300">
            {(Object.keys(SPORT_CATEGORIES) as SportCategory[]).map(
              (catKey) => {
                const cat = SPORT_CATEGORIES[catKey];
                return (
                  <div key={cat.id} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        background:
                          cat.id === "strength"
                            ? "linear-gradient(135deg, #007AFF 0%, #FF3B30 100%)"
                            : cat.hex,
                      }}
                    />
                    <span>{cat.shortLabel}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Oikea / alla mobiilissa: Valitun päivän yhteenveto ja lisäys */}
        <div className="apple-card flex flex-col justify-between p-4 sm:p-6 xl:col-span-4">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3.5">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64D2FF]">
                  Valittu päivä
                </span>
                <h3 className="mt-0.5 text-base sm:text-lg font-bold capitalize text-white">
                  {selectedDateFormatted}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="apple-press inline-flex items-center gap-1.5 rounded-xl bg-[#007AFF] px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0A84FF]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{showAddForm ? "Sulje" : "Lisää suoritus"}</span>
              </button>
            </div>

            {/* Lomake suorituksen lisäämiseksi tai sanelemiseksi valitulle päivälle */}
            {showAddForm && (
              <form
                onSubmit={handleCreateRetroLog}
                className="mt-4 space-y-3 rounded-2xl border border-[#0A84FF]/30 bg-[#0A84FF]/10 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Sanele tai täytä suoritus ({selectedDateISO})
                  </span>
                  <VoiceInputButton
                    compact
                    onTranscript={handleVoiceDictation}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(SPORT_CATEGORIES) as SportCategory[]).map(
                    (catKey) => {
                      const cat = SPORT_CATEGORIES[catKey];
                      const active = newCategory === catKey;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => {
                            setNewCategory(catKey);
                            if (catKey === "run") setNewWorkoutType("Kevyt PK");
                            else if (catKey === "tennis")
                              setNewWorkoutType("Pelit & pallottelu");
                            else if (catKey === "ski")
                              setNewWorkoutType("Vapaa / luistelu");
                            else if (catKey === "rest")
                              setNewWorkoutType("Palautuminen");
                            else setNewWorkoutType("Harjoitus");
                          }}
                          className={`apple-press flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                            active
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-black/30 text-zinc-300"
                          }`}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.hex }}
                          />
                          <span className="truncate">{cat.shortLabel}</span>
                        </button>
                      );
                    }
                  )}
                </div>

                {newCategory === "run" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      "Kevyt PK",
                      "Intervalli",
                      "Reipas VK",
                      "Palauttava PK1",
                    ].map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => setNewWorkoutType(rt)}
                        className={`apple-press rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                          newWorkoutType === rt
                            ? "border-[#34C759] bg-[#34C759]/20 text-[#30D158]"
                            : "border-white/10 bg-black/30 text-zinc-300"
                        }`}
                      >
                        {rt}
                      </button>
                    ))}
                  </div>
                )}

                {newCategory !== "rest" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                        Matka (km)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={newDistanceKm}
                        onChange={(e) => setNewDistanceKm(e.target.value)}
                        placeholder="esim. 5"
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                        Kesto (min)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={360}
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-black/50 px-2.5 py-1.5 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <textarea
                    rows={2}
                    value={newFeelings}
                    onChange={(e) => setNewFeelings(e.target.value)}
                    placeholder="Tuntemukset (tai sanele mikrofonista yllä)..."
                    className="w-full rounded-xl border border-white/15 bg-black/50 p-2.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#0A84FF] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="apple-press w-full rounded-xl bg-[#34C759] py-2 text-xs font-semibold text-black shadow-sm hover:bg-[#30D158]"
                >
                  Tallenna vakiomerkintä kalenteriin
                </button>
              </form>
            )}

            {/* Valitun päivän treenilistaus */}
            <div className="mt-4 space-y-3">
              {selectedDayLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-zinc-400" />
                  <p className="mt-2 text-sm font-semibold text-zinc-200">
                    Ei kirjattuja suorituksia tälle päivälle
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Päivä toimii välipäivänä. Voit lisätä treenin tai lenkin yllä
                    olevasta painikkeesta.
                  </p>
                </div>
              ) : (
                selectedDayLogs.map((log) => {
                  const cat = SPORT_CATEGORIES[log.category];
                  const isEditingThis = editingLogId === log.id;
                  const kmVal = extractDistanceKmFromLog(log);

                  return (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-white/12 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-3 min-w-0">
                          <SportCharacterAvatar
                            category={log.category}
                            title={log.title}
                            feelings={log.feelings}
                            size="md"
                          />
                          <div className="min-w-0">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                              style={cat.badgeStyle}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: cat.hex }}
                              />
                              {cat.label}
                            </span>
                            <h4 className="mt-1.5 text-sm font-bold text-white">
                              {log.title}
                            </h4>
                          </div>
                        </div>

                        {!isEditingThis && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingLogId(log.id)}
                              className="apple-press inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-[#64D2FF]" />
                              <span>Muokkaa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLog(log.id)}
                              aria-label="Poista suoritus"
                              className="apple-press rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditingThis ? (
                        <WorkoutLogEditor
                          log={log}
                          onSave={(updated) => {
                            onAddLog(updated);
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
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-300">
                            {kmVal !== null ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-[#34C759]/25 border border-[#34C759]/50 px-2.5 py-0.5 font-extrabold text-[#30D158]">
                                {String(kmVal).replace(".", ",")} km
                              </span>
                            ) : log.category === "run" || log.category === "ski" ? (
                              <button
                                type="button"
                                onClick={() => setEditingLogId(log.id)}
                                className="apple-press rounded-lg bg-[#34C759]/15 border border-dashed border-[#34C759]/50 px-2 py-0.5 text-xs font-semibold text-[#30D158]"
                              >
                                + Lisää km
                              </button>
                            ) : null}
                            {typeof log.durationMinutes === "number" &&
                              log.durationMinutes > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5">
                                  <Clock className="h-3 w-3 text-zinc-400" />
                                  {log.durationMinutes} min
                                </span>
                              )}
                            {log.rpe && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5">
                                <Flame className="h-3 w-3 text-amber-400" />
                                RPE {log.rpe}
                              </span>
                            )}
                            {log.oxygenScore && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5">
                                <Wind className="h-3 w-3 text-sky-400" />
                                Happi {log.oxygenScore}/5
                              </span>
                            )}
                            {log.energyScore && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5">
                                <HeartPulse className="h-3 w-3 text-emerald-400" />
                                Vire {log.energyScore}/5
                              </span>
                            )}
                          </div>

                          {log.exercises && log.exercises.length > 0 && (
                            <div className="mt-3 space-y-2 border-t border-white/10 pt-2.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                                <Dumbbell className="h-3.5 w-3.5 text-[#64D2FF]" />
                                <span>Toteutuneet sarjat:</span>
                              </div>
                              {log.exercises.map((ex) => (
                                <div
                                  key={ex.id}
                                  className="rounded-xl bg-black/40 border border-white/8 px-3 py-2 text-xs"
                                >
                                  <div className="font-semibold text-white">
                                    {ex.name}
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {ex.sets.map((s) => (
                                      <span
                                        key={s.id}
                                        className="inline-flex items-center rounded-md bg-[#0A84FF]/15 px-2 py-0.5 text-[11px] font-medium text-[#64D2FF]"
                                      >
                                        {s.actualReps || s.reps} ×{" "}
                                        {s.actualWeightKg || s.weightKg} kg
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {log.feelings && (
                            <div className="mt-2.5 rounded-xl bg-black/40 border border-white/8 p-2.5 text-xs leading-relaxed text-zinc-200">
                              {log.feelings}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. ALAREUNASSA: Kompakti kuormitusyhteenveto (ei vie tilaa kalenterin yläpuolelta) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="apple-card px-4 py-3">
          <div className="text-[11px] font-medium text-zinc-400">
            Voimatreenit
          </div>
          <div className="mt-0.5 text-base font-bold text-[#64D2FF]">
            {stats.strengthCount} kpl
          </div>
        </div>
        <div className="apple-card px-4 py-3">
          <div className="text-[11px] font-medium text-zinc-400">
            Juoksu / tennis / hiihto
          </div>
          <div className="mt-0.5 text-base font-bold text-[#30D158]">
            {stats.enduranceCount} kpl
          </div>
        </div>
        <div className="apple-card px-4 py-3">
          <div className="text-[11px] font-medium text-zinc-400">
            Kirjatut lepopäivät
          </div>
          <div className="mt-0.5 text-base font-bold text-zinc-200">
            {stats.restCount} pv
          </div>
        </div>
        <div className="apple-card px-4 py-3">
          <div className="text-[11px] font-medium text-zinc-400">
            Kokonaiskesto
          </div>
          <div className="mt-0.5 text-base font-bold text-[#FFD60A]">
            {stats.totalMinutes} min
          </div>
        </div>
      </div>
    </div>
  );
}
