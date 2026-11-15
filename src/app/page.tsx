"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  Cloud,
  Dumbbell,
  Layers,
  PlusCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  applyProgramProposalOptimistic,
  computeNextRecommendedWorkout,
  deleteWorkoutLogOptimistic,
  formatLocalISODate,
  getLocalLogs,
  getLocalMessages,
  getLocalPrograms,
  saveCoachMessageOptimistic,
  saveWorkoutLogOptimistic,
  syncInitialDataWithSupabase,
} from "@/lib/storage";
import {
  BASE_1RM,
  INITIAL_PROGRAM_WORKOUTS,
  SPORT_CATEGORIES,
} from "@/lib/programData";
import {
  CoachMessage,
  ProgramModificationProposal,
  ProgramWorkout,
  RecoveryStatus,
  SportCategory,
  WorkoutLog,
} from "@/lib/types";
import { TodayWorkoutView } from "@/components/TodayWorkoutView";
import { FullProgramView } from "@/components/FullProgramView";
import { CalendarView } from "@/components/CalendarView";
import { CoachChatPanel } from "@/components/CoachChatPanel";
import { QuickOtherWorkoutModal } from "@/components/QuickOtherWorkoutModal";

type ActiveTab = "today" | "calendar" | "program" | "coach" | "knowledge";

export default function TreenimasterPage() {
  const [todayISO, setTodayISO] = useState<string>("2026-11-15");
  const [activeTab, setActiveTab] = useState<ActiveTab>("today");
  const [programs, setPrograms] = useState<ProgramWorkout[]>(
    INITIAL_PROGRAM_WORKOUTS
  );
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [otherModalOpen, setOtherModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4200);
  };

  useEffect(() => {
    const currentISO = formatLocalISODate(new Date());
    setTodayISO(currentISO);

    const localProgs = getLocalPrograms();
    const localLogs = getLocalLogs(currentISO);
    const localMsgs = getLocalMessages(currentISO);

    setPrograms(localProgs);
    setLogs(localLogs);
    setMessages(localMsgs);

    const rec = computeNextRecommendedWorkout(localProgs, localLogs, currentISO);
    setSelectedWorkoutId(rec.nextWorkout.id);

    void syncInitialDataWithSupabase(currentISO).then((res) => {
      setPrograms(res.programs);
      setLogs(res.logs);
      setMessages(res.messages);
      setCloudConnected(res.cloudConnected);
      const updatedRec = computeNextRecommendedWorkout(
        res.programs,
        res.logs,
        currentISO
      );
      setSelectedWorkoutId(updatedRec.nextWorkout.id);
    });
  }, []);

  const recommendation = useMemo(
    () => computeNextRecommendedWorkout(programs, logs, todayISO),
    [programs, logs, todayISO]
  );

  const activeWorkoutId =
    selectedWorkoutId || recommendation.nextWorkout.id || programs[0]?.id;

  const strengthLogs = useMemo(
    () => logs.filter((l) => l.category === "strength"),
    [logs]
  );

  const handleSaveWorkoutLog = (
    newLog: WorkoutLog,
    askCoachAfter: boolean = false
  ) => {
    const updatedLogs = saveWorkoutLogOptimistic(newLog, logs);
    setLogs(updatedLogs);

    const nextRec = computeNextRecommendedWorkout(
      programs,
      updatedLogs,
      todayISO
    );
    setSelectedWorkoutId(nextRec.nextWorkout.id);

    showToast(`Tallennettu: ${newLog.title} (${newLog.performedDate})`);

    if (askCoachAfter) {
      const doneSetsSummary = newLog.exercises
        .map((ex) => {
          const setsStr = ex.sets
            .filter((s) => s.done !== false)
            .map(
              (s) => `${s.actualReps || s.reps}×${s.actualWeightKg || s.weightKg}kg`
            )
            .join(", ");
          return `${ex.name}: ${setsStr}`;
        })
        .join(" | ");

      const promptText = `Suoritin harjoituksen ${newLog.title} (${newLog.performedDate}). Toteutuneet sarjat: ${doneSetsSummary}. Tuntemukset: ${newLog.feelings || "Treeni meni suunnitelman mukaan"} (Happi ${newLog.oxygenScore || 4}/5, Vireys ${newLog.energyScore || 4}/5). Analysoi kuormitus ja palautumisikkuna seuraavaan treeniin.`;

      const userMsg: CoachMessage = {
        id: `msg-workout-${Date.now()}`,
        role: "user",
        content: promptText,
        createdAt: new Date().toISOString(),
      };
      const nextMsgs = saveCoachMessageOptimistic(userMsg, messages);
      setMessages(nextMsgs);

      void fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptText,
          todayISO,
          recentLogs: updatedLogs.slice(0, 15),
          nextRecommendedWorkout: nextRec.nextWorkout,
          currentPrograms: programs.slice(0, 12),
          history: nextMsgs.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          const aiMsg: CoachMessage = {
            id: `msg-ai-${Date.now()}`,
            role: "assistant",
            content:
              data?.reply ||
              "Hieno suoritus! Treeni on kirjattu kalenteriin ja Supabaseen. Pidä nyt suunnitellut 2–3 välipäivää, jotta keskushermosto palautuu.",
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => saveCoachMessageOptimistic(aiMsg, prev));
        })
        .catch(() => {
          // Hiljainen virheenkäsittely
        });
    }
  };

  const handleDeleteLog = (logId: string) => {
    const updated = deleteWorkoutLogOptimistic(logId, logs);
    setLogs(updated);
    showToast("Suoritus poistettu kalenterista");
  };

  const handleAddMessage = (msg: CoachMessage) => {
    setMessages((prev) => saveCoachMessageOptimistic(msg, prev));
  };

  const handleUpdateMessage = (msg: CoachMessage) => {
    setMessages((prev) => saveCoachMessageOptimistic(msg, prev));
  };

  const handleApproveProposal = (
    proposal: ProgramModificationProposal,
    _messageId: string
  ) => {
    const updatedProgs = applyProgramProposalOptimistic(proposal, programs);
    setPrograms(updatedProgs);
    showToast(
      `Ohjelmamuutos hyväksytty: Kierto ${proposal.cycleNumber} · Treeni ${proposal.workoutNumber}`
    );
  };

  const handleRejectProposal = (_messageId: string) => {
    showToast("Pidettiin alkuperäinen 8 viikon ohjelma muuttumattomana");
  };

  const handleNaturalCoachParseFromModal = async (naturalText: string) => {
    const userMsg: CoachMessage = {
      id: `msg-modal-${Date.now()}`,
      role: "user",
      content: naturalText,
      createdAt: new Date().toISOString(),
    };
    const updatedMsgs = saveCoachMessageOptimistic(userMsg, messages);
    setMessages(updatedMsgs);

    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: naturalText,
        todayISO,
        recentLogs: logs.slice(0, 15),
        nextRecommendedWorkout: recommendation.nextWorkout,
        currentPrograms: programs.slice(0, 12),
        history: updatedMsgs.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json();
    let loggedSummary: CoachMessage["loggedWorkoutSummary"] = null;

    if (data?.detectedWorkout?.shouldLog) {
      const dw = data.detectedWorkout;
      const category = (dw.category as SportCategory) || "run";
      const newLog: WorkoutLog = {
        id: `auto-modal-${Date.now()}`,
        performedDate: dw.performedDate || todayISO,
        category,
        title:
          dw.title ||
          `${SPORT_CATEGORIES[category]?.shortLabel || "Treeni"} ${dw.durationMinutes || 30} min`,
        cycleNumber: null,
        workoutNumber: null,
        programId: null,
        durationMinutes: dw.durationMinutes || 30,
        rpe: dw.rpe || 6.5,
        exercises: [],
        feelings: dw.feelings || naturalText,
        oxygenScore: dw.oxygenScore || 4,
        energyScore: dw.energyScore || 4,
        recoveryStatus: (dw.recoveryStatus as RecoveryStatus) || "normaali",
        source: "voice",
        createdAt: new Date().toISOString(),
      };
      const nextLogs = saveWorkoutLogOptimistic(newLog, logs);
      setLogs(nextLogs);
      showToast(`Tallennettu puheesta/tekstistä: ${newLog.title}`);
      loggedSummary = {
        performedDate: newLog.performedDate,
        category: newLog.category,
        title: newLog.title,
        durationMinutes: newLog.durationMinutes,
        feelings: newLog.feelings,
      };
    }

    const aiMsg: CoachMessage = {
      id: `msg-ai-modal-${Date.now()}`,
      role: "assistant",
      content:
        data?.reply ||
        "Suoritus kirjattu kalenteriin ja huomioitu palautumisanalyysissä.",
      loggedWorkoutSummary: loggedSummary,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => saveCoachMessageOptimistic(aiMsg, prev));
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-24 lg:pb-16">
      {/* Apple HIG Translucent Top Header */}
      <header className="apple-nav-glass sticky top-0 z-30 border-b border-white/10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-3.5 py-2.5 sm:px-6 sm:py-3">
          {/* Vasen: Logo ja brändi */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-sm sm:h-10 sm:w-10">
              <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
                  Treenimaster
                </h1>
                <span className="hidden rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300 md:inline-block">
                  8 vk voimaohjelma + 4 vk piikkaus
                </span>
              </div>
              <p className="truncate text-[11px] text-zinc-400 sm:text-xs">
                Henkilökohtainen fysiologia- ja tekoälyvalmentaja
              </p>
            </div>
          </div>

          {/* Keskellä: Desktop Apple Segmented Control -välilehdet (vain lg+) */}
          <nav
            aria-label="Päänavigaatio"
            className="hidden items-center rounded-2xl bg-white/[0.06] p-1 border border-white/10 lg:flex"
          >
            <button
              type="button"
              onClick={() => setActiveTab("today")}
              className={`apple-press flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "today"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Päivän treeni</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`apple-press flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "calendar"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Treenikalenteri</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("program")}
              className={`apple-press flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "program"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Koko 8 vk ohjelma</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("coach")}
              className={`apple-press flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition xl:hidden ${
                activeTab === "coach"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Valmentaja</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("knowledge")}
              className={`apple-press flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === "knowledge"
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-zinc-300 hover:text-white"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Kehitys & periaatteet</span>
            </button>
          </nav>

          {/* Oikea: Pikatoiminto & Supabase-tila */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOtherModalOpen(true)}
              className="apple-press inline-flex items-center gap-1.5 rounded-xl border border-[#34C759]/35 bg-[#34C759]/15 px-3 py-2 text-xs font-semibold text-[#30D158] hover:bg-[#34C759]/25"
            >
              <PlusCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Muu treeni / lenkki</span>
              <span className="sm:hidden">Lenkki</span>
            </button>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                cloudConnected
                  ? "border-[#34C759]/35 bg-[#34C759]/15 text-[#30D158]"
                  : "border-[#0A84FF]/30 bg-[#0A84FF]/15 text-[#64D2FF]"
              }`}
              title="Tallennetaan automaattisesti Treenimaster Supabase-pilveen"
            >
              <Cloud className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:inline">
                {cloudConnected ? "Pilvisynkronointi päällä" : "Yhdistetty"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Optimistinen Toast-ilmoitus */}
      {toastMessage && (
        <div className="fixed right-4 bottom-20 lg:bottom-5 z-50 flex items-center gap-2.5 rounded-2xl border border-[#34C759]/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#30D158]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Pääsisältöalue: Vasemmalla päävälilehti (8 saraketta), oikealla valmentajakeskustelu (4 saraketta desktopilla) */}
      <main className="mx-auto w-full max-w-[1440px] px-3.5 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Vasen pääalue (min-w-0 estää vaakaylivuodon mobiilissa) */}
          <div
            className={`min-w-0 ${
              activeTab === "coach" ? "xl:col-span-12" : "xl:col-span-8"
            }`}
          >
            {activeTab === "today" && (
              <TodayWorkoutView
                todayISO={todayISO}
                recommendation={recommendation}
                programs={programs}
                activeWorkoutId={activeWorkoutId}
                onSelectWorkoutId={(id) => setSelectedWorkoutId(id)}
                onSaveStrengthLog={handleSaveWorkoutLog}
                onOpenOtherWorkoutModal={() => setOtherModalOpen(true)}
                onNavigateToProgram={() => setActiveTab("program")}
              />
            )}

            {activeTab === "calendar" && (
              <CalendarView
                logs={logs}
                todayISO={todayISO}
                onAddLog={(log) => handleSaveWorkoutLog(log, false)}
                onDeleteLog={handleDeleteLog}
              />
            )}

            {activeTab === "program" && (
              <FullProgramView
                programs={programs}
                logs={logs}
                activeWorkoutId={activeWorkoutId}
                recommendedWorkoutId={recommendation.nextWorkout.id}
                onSelectForToday={(id) => {
                  setSelectedWorkoutId(id);
                  setActiveTab("today");
                  showToast("Treeni valittu Päivän treeni -näkymään");
                }}
              />
            )}

            {activeTab === "coach" && (
              <CoachChatPanel
                fullPageMode
                messages={messages}
                logs={logs}
                programs={programs}
                nextRecommendedWorkout={recommendation.nextWorkout}
                todayISO={todayISO}
                onAddMessage={handleAddMessage}
                onUpdateMessage={handleUpdateMessage}
                onAutoLogWorkout={(log) => handleSaveWorkoutLog(log, false)}
                onApproveProgramProposal={handleApproveProposal}
                onRejectProgramProposal={handleRejectProposal}
              />
            )}

            {activeTab === "knowledge" && (
              <div className="min-w-0 space-y-6">
                {/* 1RM-lähtötasot ja 12 viikon ennätystavoitteet */}
                <div className="apple-card p-5 sm:p-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">
                    <Award className="h-3.5 w-3.5" />
                    <span>Voimatasot & 12 viikon tavoitteet</span>
                  </div>
                  <h2 className="mt-2 text-xl sm:text-2xl font-bold text-white">
                    Maksimivoiman kehitys ja tavoitteet
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-zinc-300">
                    Laskentapohjana käytetyt tuoreet maksimit (1RM) sekä 8
                    kierron perusvoimajakson ja 4 viikon piikkauksen
                    ennätystavoitteet.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-xs font-semibold text-zinc-400">
                        Maastaveto (DL)
                      </div>
                      <div className="mt-1 text-lg sm:text-xl font-bold text-white">
                        {BASE_1RM.deadlift} kg
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#64D2FF]">
                        Tavoite: {BASE_1RM.targetDeadlift}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-xs font-semibold text-zinc-400">
                        Penkkipunnerrus (B)
                      </div>
                      <div className="mt-1 text-lg sm:text-xl font-bold text-white">
                        {BASE_1RM.bench} kg
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#64D2FF]">
                        Tavoite: {BASE_1RM.targetBench}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-xs font-semibold text-zinc-400">
                        Lisäpainoleuanveto (L)
                      </div>
                      <div className="mt-1 text-lg sm:text-xl font-bold text-white">
                        +{BASE_1RM.weightedPullup} kg
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#64D2FF]">
                        Tavoite: {BASE_1RM.targetWeightedPullup}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-xs font-semibold text-zinc-400">
                        Etukyykky (S)
                      </div>
                      <div className="mt-1 text-lg sm:text-xl font-bold text-white">
                        {BASE_1RM.frontSquat} kg
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#64D2FF]">
                        Tavoite: {BASE_1RM.targetFrontSquat}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toteutuneet voimatreenit */}
                <div className="apple-card p-5 sm:p-6">
                  <h3 className="text-lg font-bold text-white">
                    Toteutuneet voimatreenit tässä jaksossa ({strengthLogs.length}{" "}
                    kpl)
                  </h3>
                  <div className="mt-4 space-y-3">
                    {strengthLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-bold text-white text-sm sm:text-base">
                            {log.title}
                          </div>
                          <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                            {log.performedDate}
                          </span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {log.exercises.map((ex) => (
                            <div
                              key={ex.id}
                              className="rounded-xl bg-black/40 border border-white/8 px-3 py-2 text-xs"
                            >
                              <div className="font-semibold text-white">
                                {ex.name}
                              </div>
                              <div className="mt-1 text-zinc-300">
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
                      </div>
                    ))}
                  </div>
                </div>

                {/* NotebookLM & fysiologinen tietopohja */}
                <div className="apple-card p-5 sm:p-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-300">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Valmentajan fysiologiset periaatteet (NotebookLM, 43 lähdettä)</span>
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
                        Treeni 1:n raskas 1×3 huippusarja toimii{" "}
                        <strong>Post-Activation Potentiation (PAP)</strong>{" "}
                        -herätteenä, joka rekrytoi korkean kynnyksen motoriset
                        yksiköt ennen 3×5 back-off-volyymisarjoja. Sarjoja ei
                        viedä koskaan tekniseen failureen, jotta keskushermosto
                        (CNS) ei ylikuormitu.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <h4 className="text-sm font-bold text-white">
                        2. Liukuva mikrosykli & 2–3 välipäivän sääntö
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                        Yksi treenikierto koostuu kolmesta harjoituksesta (T1,
                        T2, T3), joiden välissä pidetään 2–3 täyttä lepopäivää
                        raskaan maastavedon jälkeen ennen etukyykkyä. Yksi
                        kierto kestää tyypillisesti 9–12 päivää.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <h4 className="text-sm font-bold text-white">
                        3. Yhdistelmäharjoittelu (juoksu, tennis, hiihto)
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                        Kevyt aerobinen harjoittelu (PK1-juoksu 20–30 min,
                        tennis, hiihto) välipäivinä nopeuttaa palautumista ja
                        parantaa sarjakestävyyttä. Kovatehoista juoksua
                        vältetään 24–36 h ennen raskasta maastaveto- tai
                        etukyykkypäivää.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <h4 className="text-sm font-bold text-white">
                        4. Ohjelman koskemattomuus
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                        Valmentaja ei koskaan muuta 8 viikon voimaohjelmaa
                        automaattisesti yksittäisen huonon päivän vuoksi. Jos
                        usean viikon trendi osoittaa palautumisen sakkaavan,
                        valmentaja tekee perustellun muutosehdotuksen, jonka
                        voit hyväksyä tai hylätä.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Oikea sivupalkki: Aina näkyvillä oleva Treenimaster-keskustelu VAIN Desktopilla (xl+) */}
          {activeTab !== "coach" && (
            <div className="hidden min-w-0 xl:col-span-4 xl:block">
              <div className="sticky top-20">
                <CoachChatPanel
                  messages={messages}
                  logs={logs}
                  programs={programs}
                  nextRecommendedWorkout={recommendation.nextWorkout}
                  todayISO={todayISO}
                  onAddMessage={handleAddMessage}
                  onUpdateMessage={handleUpdateMessage}
                  onAutoLogWorkout={(log) => handleSaveWorkoutLog(log, false)}
                  onApproveProgramProposal={handleApproveProposal}
                  onRejectProgramProposal={handleRejectProposal}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Apple iOS Bottom Tab Bar mobiilille ja tabletille (< lg) */}
      <nav
        aria-label="Mobiilinavigaatio"
        className="apple-nav-glass fixed inset-x-0 bottom-0 z-40 border-t border-white/12 px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 py-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`apple-press flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
              activeTab === "today"
                ? "text-[#409CFF]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Tänään</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`apple-press flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
              activeTab === "calendar"
                ? "text-[#30D158]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Kalenteri</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("program")}
            className={`apple-press flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
              activeTab === "program"
                ? "text-[#64D2FF]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>8 vk ohjelma</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coach")}
            className={`apple-press flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
              activeTab === "coach"
                ? "text-[#FFD60A]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Valmentaja</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("knowledge")}
            className={`apple-press flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
              activeTab === "knowledge"
                ? "text-[#BF5AF2]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Kehitys</span>
          </button>
        </div>
      </nav>

      {/* Natiivi <dialog closedby="any"> modaali muulle treenille / lenkille */}
      <QuickOtherWorkoutModal
        isOpen={otherModalOpen}
        initialDate={todayISO}
        onClose={() => setOtherModalOpen(false)}
        onSaveLog={(log) => handleSaveWorkoutLog(log, false)}
        onSendToCoach={handleNaturalCoachParseFromModal}
      />
    </div>
  );
}
