"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
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
import { VoiceInputButton } from "./VoiceInputButton";

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
  const day = d.getDay(); // 0 = Sun, 1 = Mon...
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

  // Retroactive / manual entry form state
  const [newCategory, setNewCategory] = useState<SportCategory>("run");
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("30");
  const [newRpe, setNewRpe] = useState("6.5");
  const [newOxygen, setNewOxygen] = useState<number>(4);
  const [newEnergy, setNewEnergy] = useState<number>(4);
  const [newRecovery, setNewRecovery] = useState<RecoveryStatus>("normaali");
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

  // Generate calendar cells for month or week view
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

  // Kuormitusyhteenveto viimeisen 30 päivän tai näkyvän jakson ajalta
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

  const handleCreateRetroLog = (e: React.FormEvent) => {
    e.preventDefault();
    const meta = SPORT_CATEGORIES[newCategory];
    const defaultTitle =
      newCategory === "rest"
        ? "Lepopäivä – hermoston lataus"
        : `${meta.shortLabel}${newDuration ? ` ${newDuration} min` : ""}`;

    const entry: WorkoutLog = {
      id: `cal-log-${Date.now()}`,
      performedDate: selectedDateISO,
      category: newCategory,
      title: newTitle.trim() || defaultTitle,
      cycleNumber: null,
      workoutNumber: null,
      programId: null,
      durationMinutes:
        newCategory === "rest" ? 0 : Math.max(5, Number(newDuration) || 30),
      rpe: newCategory === "rest" ? 1 : Number(newRpe) || 6.5,
      exercises: [],
      feelings:
        newFeelings.trim() ||
        (newCategory === "rest"
          ? "Suunniteltu välipäivä ja palautuminen."
          : "Kirjattu suoraan treenikalenterista."),
      oxygenScore: newOxygen,
      energyScore: newEnergy,
      recoveryStatus: newRecovery,
      source: "calendar",
      createdAt: new Date().toISOString(),
    };

    onAddLog(entry);
    setNewTitle("");
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
    <div className="min-w-0 space-y-6">
      {/* Yläpalkki ja värikoodien selite (Apple Calendar -tyyli) */}
      <div className="apple-card min-w-0 overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Värikoodattu treenikalenteri (Supabase)</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Kokonaiskuormitus ja välipäivien rytmitys
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Klikkaa mitä tahansa päivää tarkastellaksesi toteutuneita sarjoja,
              lenkin kestoa ja tuntemuksia tai lisätäksesi suorituksen jälkikäteen.
            </p>
          </div>

          {/* Kuukausi / Viikkonäkymän valitsin */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`apple-press rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === "month"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                }`}
              >
                Kuukausinäkymä
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`apple-press rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === "week"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                }`}
              >
                Viikkonäkymä
              </button>
            </div>

            <button
              type="button"
              onClick={handleJumpToday}
              className="apple-press rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Tänään
            </button>
          </div>
        </div>

        {/* Värikoodien selite (Apple Palette Legend) */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-200/70 pt-4 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Lajien värikoodit:
          </span>
          {(Object.keys(SPORT_CATEGORIES) as SportCategory[]).map((catKey) => {
            const cat = SPORT_CATEGORIES[catKey];
            return (
              <div
                key={cat.id}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                style={cat.badgeStyle}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background:
                      cat.id === "strength"
                        ? "linear-gradient(135deg, #007AFF 0%, #FF3B30 100%)"
                        : cat.hex,
                  }}
                />
                <span>{cat.label}</span>
              </div>
            );
          })}
        </div>

        {/* Pikamittarit */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-blue-500/15 bg-blue-500/5 px-3.5 py-2.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Voimatreenit
            </div>
            <div className="mt-0.5 text-lg font-bold text-blue-600 dark:text-blue-400">
              {stats.strengthCount} kpl
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-3.5 py-2.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Juoksu / tennis / hiihto
            </div>
            <div className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {stats.enduranceCount} kpl
            </div>
          </div>
          <div className="rounded-2xl border border-slate-400/20 bg-slate-500/5 px-3.5 py-2.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Kirjatut lepopäivät
            </div>
            <div className="mt-0.5 text-lg font-bold text-slate-700 dark:text-slate-300">
              {stats.restCount} pv
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-3.5 py-2.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Kokonaiskesto
            </div>
            <div className="mt-0.5 text-lg font-bold text-amber-600 dark:text-amber-400">
              {stats.totalMinutes} min
            </div>
          </div>
        </div>
      </div>

      {/* Kalenteriruudukko + Päivän tarkastelupaneeli */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Vasen: Kalenterinäkymä (7 saraketta) */}
        <div className="apple-card p-5 sm:p-6 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {MONTHS_FI[cursorDate.getMonth()]} {cursorDate.getFullYear()}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Edellinen jakso"
                className="apple-press rounded-xl border border-slate-200/80 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Seuraava jakso"
                className="apple-press rounded-xl border border-slate-200/80 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Viikonpäivien otsikot */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {WEEKDAYS_FI.map((day) => (
              <div key={day} className="py-1.5">
                {day}
              </div>
            ))}
          </div>

          {/* Päiväruudut */}
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell) => {
              const dayLogs = logsByDate.get(cell.iso) || [];
              const isToday = cell.iso === todayISO;
              const isSelected = cell.iso === selectedDateISO;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDateISO(cell.iso)}
                  className={`apple-press group relative flex flex-col items-start justify-between rounded-2xl border p-2 text-left transition ${
                    viewMode === "week" ? "min-h-[135px]" : "min-h-[86px] sm:min-h-[100px]"
                  } ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/25 dark:border-blue-400 dark:bg-blue-950/30"
                      : cell.inCurrentMonth
                      ? "border-slate-200/75 bg-white/80 hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                      : "border-slate-100 bg-slate-50/40 opacity-50 dark:border-slate-900 dark:bg-slate-950/30"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? "bg-blue-600 text-white shadow-xs"
                          : isSelected
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    {dayLogs.length > 0 && (
                      <div className="flex items-center gap-1">
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
                  <div className="mt-1.5 flex w-full flex-col gap-1 overflow-hidden">
                    {dayLogs.slice(0, 2).map((l) => {
                      const cat = SPORT_CATEGORIES[l.category];
                      return (
                        <div
                          key={l.id}
                          className="truncate rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
                          style={cat.badgeStyle}
                          title={l.title}
                        >
                          {l.category === "strength" && l.cycleNumber
                            ? `K${l.cycleNumber}·T${l.workoutNumber}`
                            : cat.shortLabel}
                          {l.durationMinutes ? ` · ${l.durationMinutes}m` : ""}
                        </div>
                      );
                    })}
                    {dayLogs.length > 2 && (
                      <span className="text-[10px] font-medium text-slate-500">
                        +{dayLogs.length - 2} muuta
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Oikea: Valitun päivän tarkka yhteenveto ja lisäyslomake */}
        <div className="apple-card flex flex-col justify-between p-5 sm:p-6 xl:col-span-4">
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-4 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Valittu päivä
                </span>
                <h3 className="mt-0.5 text-lg font-bold capitalize text-slate-900 dark:text-white">
                  {selectedDateFormatted}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="apple-press inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{showAddForm ? "Sulje lomake" : "Lisää suoritus"}</span>
              </button>
            </div>

            {/* Lomake suorituksen lisäämiseksi jälkikäteen */}
            {showAddForm && (
              <form
                onSubmit={handleCreateRetroLog}
                className="mt-4 space-y-3.5 rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Lisää treeni tai lepopäivä päivälle {selectedDateISO}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Laji / merkintätyyppi
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(SPORT_CATEGORIES) as SportCategory[]).map(
                      (catKey) => {
                        const cat = SPORT_CATEGORIES[catKey];
                        const active = newCategory === catKey;
                        return (
                          <button
                            key={catKey}
                            type="button"
                            onClick={() => setNewCategory(catKey)}
                            className={`apple-press flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition ${
                              active
                                ? "border-blue-600 bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                                : "border-slate-200/70 bg-white/60 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.hex }}
                            />
                            <span className="truncate">{cat.shortLabel}</span>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Otsikko / kuvaus
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={
                      newCategory === "rest"
                        ? "Esim. Lepopäivä ja lihashuolto"
                        : "Esim. Aamulenkki PK1 tai Tennis"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {newCategory !== "rest" && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Kesto (min)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={360}
                        value={newDuration}
                        onChange={(e) => setNewDuration(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Kuormitus (RPE 1–10)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={1}
                        max={10}
                        value={newRpe}
                        onChange={(e) => setNewRpe(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Happi (1–5)
                    </label>
                    <select
                      value={newOxygen}
                      onChange={(e) => setNewOxygen(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Vireys (1–5)
                    </label>
                    <select
                      value={newEnergy}
                      onChange={(e) => setNewEnergy(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Palautuminen
                    </label>
                    <select
                      value={newRecovery}
                      onChange={(e) =>
                        setNewRecovery(e.target.value as RecoveryStatus)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="erinomainen">Erinomainen</option>
                      <option value="normaali">Normaali</option>
                      <option value="tukkoinen">Tukkoinen</option>
                      <option value="flunssainen">Flunssainen</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Tuntemukset & muistiinpanot
                    </label>
                    <VoiceInputButton
                      compact
                      onTranscript={(txt) =>
                        setNewFeelings((prev) =>
                          prev ? `${prev} ${txt}` : txt
                        )
                      }
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newFeelings}
                    onChange={(e) => setNewFeelings(e.target.value)}
                    placeholder="Miten happi kulki, miltä hermosto ja lihakset tuntuivat?"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="apple-press w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Tallenna kalenteriin ja Supabaseen
                </button>
              </form>
            )}

            {/* Valitun päivän treenilistaus */}
            <div className="mt-4 space-y-4">
              {selectedDayLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                  <Sparkles className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Ei kirjattuja suorituksia tälle päivälle
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tämä päivä toimii lepo- ja palautumispäivänä. Voit lisätä
                    suorituksen tai merkitä virallisen lepopäivän yllä olevasta
                    painikkeesta.
                  </p>
                </div>
              ) : (
                selectedDayLogs.map((log) => {
                  const cat = SPORT_CATEGORIES[log.category];
                  return (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200/85 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
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
                          <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                            {log.title}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteLog(log.id)}
                          aria-label="Poista suoritus"
                          className="apple-press rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Metatiedot */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        {typeof log.durationMinutes === "number" &&
                          log.durationMinutes > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              {log.durationMinutes} min
                            </span>
                          )}
                        {log.rpe && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                            <Flame className="h-3.5 w-3.5 text-amber-500" />
                            RPE {log.rpe}
                          </span>
                        )}
                        {log.oxygenScore && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                            <Wind className="h-3.5 w-3.5 text-sky-500" />
                            Happi {log.oxygenScore}/5
                          </span>
                        )}
                        {log.energyScore && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                            <HeartPulse className="h-3.5 w-3.5 text-emerald-500" />
                            Vireys {log.energyScore}/5
                          </span>
                        )}
                      </div>

                      {/* Jos voimatreeni, näytä toteutuneet liikkeet ja sarjat */}
                      {log.exercises && log.exercises.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <Dumbbell className="h-3.5 w-3.5 text-blue-600" />
                            <span>Toteutuneet sarjat:</span>
                          </div>
                          {log.exercises.map((ex) => (
                            <div
                              key={ex.id}
                              className="rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60"
                            >
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {ex.name}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {ex.sets.map((s) => (
                                  <span
                                    key={s.id}
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                      s.done !== false
                                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                        : "bg-slate-200/70 text-slate-500 line-through"
                                    }`}
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

                      {/* Subjektiiviset tuntemukset */}
                      {log.feelings && (
                        <div className="mt-3 rounded-xl bg-slate-50/90 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Tuntemukset:{" "}
                          </span>
                          {log.feelings}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200/70 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Kaikki kalenterimerkinnät synkronoidaan automaattisesti{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
              treenimaster_logs
            </code>{" "}
            -tauluun ja huomioidaan valmentajan pitkän aikavälin kuormitusanalyysissä.
          </div>
        </div>
      </div>
    </div>
  );
}
