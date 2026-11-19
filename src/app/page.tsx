"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Calendar,
  CheckCircle2,
  Cloud,
  Dumbbell,
  Layers,
  PlusCircle,
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
  saveProgramWorkoutOptimistic,
  saveWorkoutLogOptimistic,
  syncInitialDataWithSupabase,
} from "@/lib/storage";
import {
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
import {
  generateInstantWorkoutFeedback,
  InstantCoachFeedback,
} from "@/lib/coachIntelligence";
import { TodayWorkoutView } from "@/components/TodayWorkoutView";
import { FullProgramView } from "@/components/FullProgramView";
import { CalendarView } from "@/components/CalendarView";
import { CoachChatPanel } from "@/components/CoachChatPanel";
import { QuickOtherWorkoutModal } from "@/components/QuickOtherWorkoutModal";
import { AnalyticsAndProgressView } from "@/components/AnalyticsAndProgressView";
import { WithingsFeelingsPromptModal } from "@/components/WithingsFeelingsPromptModal";

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
  const [instantFeedback, setInstantFeedback] =
    useState<InstantCoachFeedback | null>(null);
  const [pendingWithingsPromptLog, setPendingWithingsPromptLog] =
    useState<WorkoutLog | null>(null);
  const withingsSyncInFlightRef = useRef<boolean>(false);

  const getPromptedWithingsIds = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(
        "treenimaster_withings_prompted_v1"
      );
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set();
    }
  };

  const markWithingsPrompted = (id: string) => {
    if (typeof window === "undefined") return;
    try {
      const set = getPromptedWithingsIds();
      set.add(id);
      window.localStorage.setItem(
        "treenimaster_withings_prompted_v1",
        JSON.stringify(Array.from(set).slice(-100))
      );
    } catch {
      // ignore
    }
  };

  const runWithingsBackgroundSync = async (cooldownMs = 90 * 1000) => {
    if (withingsSyncInFlightRef.current) return;
    withingsSyncInFlightRef.current = true;
    try {
      const stRes = await fetch("/api/withings/status");
      if (!stRes.ok) return;
      const st = await stRes.json();
      if (!st?.connected) return;

      const lastMs = st.lastSyncedAt ? new Date(st.lastSyncedAt).getTime() : 0;
      if (Date.now() - lastMs < cooldownMs) return;

      const syncRes = await fetch("/api/withings/sync", { method: "POST" });
      if (!syncRes.ok) return;
      const data = await syncRes.json();

      if (data?.logs && Array.isArray(data.logs) && data.logs.length > 0) {
        setLogs((prev) => {
          const map = new Map(prev.map((l) => [l.id, l]));
          for (const wl of data.logs as WorkoutLog[]) {
            map.set(wl.id, wl);
          }
          const merged = Array.from(map.values()).sort((a, b) =>
            b.performedDate.localeCompare(a.performedDate)
          );
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "treenimaster_logs_v3",
              JSON.stringify(merged)
            );
          }
          return merged;
        });
      }

      if (data?.newLogs && Array.isArray(data.newLogs) && data.newLogs.length > 0) {
        const prompted = getPromptedWithingsIds();
        const unprompted = (data.newLogs as WorkoutLog[])
          .filter((l) => !prompted.has(l.id))
          .sort((a, b) => b.performedDate.localeCompare(a.performedDate));
        if (unprompted.length > 0) {
          setPendingWithingsPromptLog(unprompted[0]);
        }
      }
    } catch {
      // Hiljainen taustasynkronointi ei häiritse käyttöä
    } finally {
      withingsSyncInFlightRef.current = false;
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
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

    if (typeof window !== "undefined") {
      try {
        const rawFb = window.localStorage.getItem(
          "treenimaster_instant_feedback_v1"
        );
        if (rawFb) {
          const parsed = JSON.parse(rawFb) as {
            date: string;
            feedback: InstantCoachFeedback;
          };
          if (parsed?.date === currentISO && parsed.feedback) {
            setInstantFeedback(parsed.feedback);
          } else {
            window.localStorage.removeItem("treenimaster_instant_feedback_v1");
          }
        }
      } catch {
        // ignore
      }
    }

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

      // Automaattinen taustasynkronointi Withingsistä heti sivun latauksessa
      void runWithingsBackgroundSync(0);
    });

    // Tarkista Withings OAuth-paluu URL-parametreista ja pidä 1 min taustasynkronointi päällä
    if (typeof window !== "undefined") {
      const handleAppForeground = () => {
        if (document.visibilityState === "visible") {
          void runWithingsBackgroundSync(30 * 1000);
        }
      };
      document.addEventListener("visibilitychange", handleAppForeground);
      window.addEventListener("focus", handleAppForeground);

      const syncInterval = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          void runWithingsBackgroundSync(55 * 1000);
        }
      }, 60 * 1000);

      const params = new URLSearchParams(window.location.search);
      const wStatus = params.get("withings");
      if (wStatus === "connected") {
        window.history.replaceState({}, "", window.location.pathname);
        showToast("Withings yhdistetty! Haetaan treenit...");
        void fetch("/api/withings/sync", { method: "POST" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.logs && Array.isArray(data.logs)) {
              setLogs((prev) => {
                const map = new Map(prev.map((l) => [l.id, l]));
                for (const wl of data.logs as WorkoutLog[]) {
                  map.set(wl.id, wl);
                }
                const merged = Array.from(map.values()).sort((a, b) =>
                  b.performedDate.localeCompare(a.performedDate)
                );
                window.localStorage.setItem(
                  "treenimaster_logs_v3",
                  JSON.stringify(merged)
                );
                return merged;
              });
              showToast(
                `Withings yhdistetty! Haettu ${data.logs.length} treeniä.`
              );
            }
          });
      } else if (wStatus === "missing_env") {
        window.history.replaceState({}, "", window.location.pathname);
        showToast(
          "Lisää WITHINGS_CLIENT_ID ja WITHINGS_CLIENT_SECRET Verceliin ensin."
        );
      } else if (wStatus === "error") {
        window.history.replaceState({}, "", window.location.pathname);
        showToast("Withings-yhdistäminen keskeytyi tai epäonnistui.");
      }

      return () => {
        document.removeEventListener("visibilitychange", handleAppForeground);
        window.removeEventListener("focus", handleAppForeground);
        window.clearInterval(syncInterval);
      };
    }
  }, []);

  const handleWithingsSyncedLogs = (
    syncedLogs: WorkoutLog[],
    message: string
  ) => {
    if (syncedLogs.length > 0) {
      setLogs((prev) => {
        const map = new Map(prev.map((l) => [l.id, l]));
        for (const wl of syncedLogs) {
          map.set(wl.id, wl);
        }
        const merged = Array.from(map.values()).sort((a, b) =>
          b.performedDate.localeCompare(a.performedDate)
        );
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "treenimaster_logs_v3",
            JSON.stringify(merged)
          );
        }
        return merged;
      });
    }
    showToast(message);
  };

  const recommendation = useMemo(
    () => computeNextRecommendedWorkout(programs, logs, todayISO),
    [programs, logs, todayISO]
  );

  const activeWorkoutId =
    selectedWorkoutId || recommendation.nextWorkout.id || programs[0]?.id;

  const handleUpdateProgramWorkout = (updatedWorkout: ProgramWorkout) => {
    const updatedPrograms = saveProgramWorkoutOptimistic(
      updatedWorkout,
      programs
    );
    setPrograms(updatedPrograms);
    showToast(`8 viikon ohjelmaa päivitetty: ${updatedWorkout.title}`);
  };

  const handleSaveWorkoutLog = (
    newLog: WorkoutLog,
    askCoachAfter: boolean = false,
    deviationReason?: string
  ) => {
    const updatedLogs = saveWorkoutLogOptimistic(newLog, logs);
    setLogs(updatedLogs);

    const nextRec = computeNextRecommendedWorkout(
      programs,
      updatedLogs,
      todayISO
    );
    setSelectedWorkoutId(nextRec.nextWorkout.id);

    // Luodaan välitön tsemppi- ja fysiologiapalaute heti näytölle
    const fb = generateInstantWorkoutFeedback(
      newLog,
      updatedLogs,
      nextRec,
      deviationReason
    );
    setInstantFeedback(fb);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "treenimaster_instant_feedback_v1",
          JSON.stringify({ date: todayISO, feedback: fb })
        );
      } catch {
        // ignore
      }
    }

    showToast(`Tallennettu: ${newLog.title} (${newLog.performedDate})`);

    // Kun salitreeni tai lenkki kuitataan tehdyksi, tarkistetaan taustalla Withingsistä syke- ja kestotiedot
    if (newLog.category === "strength" || newLog.category === "run") {
      setTimeout(() => {
        void fetch("/api/withings/sync", { method: "POST" })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.logs && Array.isArray(data.logs) && data.logs.length > 0) {
              setLogs((prev) => {
                const map = new Map(prev.map((l) => [l.id, l]));
                for (const wl of data.logs as WorkoutLog[]) {
                  map.set(wl.id, wl);
                }
                const merged = Array.from(map.values()).sort((a, b) =>
                  b.performedDate.localeCompare(a.performedDate)
                );
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(
                    "treenimaster_logs_v3",
                    JSON.stringify(merged)
                  );
                }
                return merged;
              });
            }
          })
          .catch(() => {});
      }, 1500);
    }

    // Kirjataan automaattinen tausta-analyysi myös valmentajakeskusteluun, jotta historia pysyy ajan tasalla
    if (!askCoachAfter) {
      const autoCoachMsg: CoachMessage = {
        id: `msg-auto-fb-${Date.now()}`,
        role: "assistant",
        content: `**${fb.headline}**\n\n${fb.encouragement}\n\n- **Fysiologinen analyysi:** ${fb.physiologicalNote}\n- **Seuraava askel:** ${fb.nextStepHint}`,
        loggedWorkoutSummary: {
          performedDate: newLog.performedDate,
          category: newLog.category,
          title: newLog.title,
          durationMinutes: newLog.durationMinutes,
          feelings: newLog.feelings,
        },
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => saveCoachMessageOptimistic(autoCoachMsg, prev));
    }

    if (askCoachAfter) {
      const doneSetsSummary = newLog.exercises
        .map((ex) => {
          const setsStr = ex.sets
            .filter((s) => s.done !== false)
            .map(
              (s) =>
                `${s.actualReps || s.reps}×${s.actualWeightKg || s.weightKg}kg`
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

      const nextRec = computeNextRecommendedWorkout(
        programs,
        nextLogs,
        todayISO
      );
      setInstantFeedback(
        generateInstantWorkoutFeedback(newLog, nextLogs, nextRec)
      );

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
          {/* Vasen: Pelkistetty Treenimaster-logo & tekstilogo */}
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A84FF] via-[#0066CC] to-[#34C759] shadow-[0_4px_16px_rgba(10,132,255,0.35)] ring-1 ring-white/20 sm:h-10 sm:w-10">
              <svg
                viewBox="0 0 28 28"
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 7.5H23"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M14 7.5V21.5"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M7.5 18.5L11.5 14.5L14.5 16.5L20.5 10.5"
                  stroke="#9BF6B5"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-[24.5px] leading-none font-black tracking-tight sm:text-[28px]">
                <span className="text-white">Treeni</span>
                <span className="bg-gradient-to-r from-[#64D2FF] to-[#30D158] bg-clip-text text-transparent">
                  master
                </span>
              </h1>
              <span className="hidden rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300 md:inline-block">
                8 vk voimaohjelma + 4 vk piikkaus
              </span>
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
              <Dumbbell className="h-3.5 w-3.5" />
              <span>Tänään</span>
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
              <span>8 viikon ohjelma</span>
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
              <span>Kehitys & analyysi</span>
            </button>
          </nav>

          {/* Oikea: Pikatoiminto (+ Lenkki / muu) */}
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setOtherModalOpen(true)}
              className="apple-press inline-flex items-center gap-1.5 rounded-xl border border-[#34C759]/40 bg-[#34C759]/18 px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#30D158] hover:bg-[#34C759]/25 whitespace-nowrap"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Lenkki / muu</span>
            </button>
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
                logs={logs}
                recommendation={recommendation}
                programs={programs}
                activeWorkoutId={activeWorkoutId}
                instantFeedback={instantFeedback}
                onDismissFeedback={() => {
                  setInstantFeedback(null);
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(
                      "treenimaster_instant_feedback_v1"
                    );
                  }
                }}
                onSelectWorkoutId={(id) => setSelectedWorkoutId(id)}
                onSaveStrengthLog={handleSaveWorkoutLog}
                onDeleteLog={handleDeleteLog}
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
                  showToast("Treeni valittu Tänään-näkymään");
                }}
                onUpdateProgramWorkout={handleUpdateProgramWorkout}
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
              <AnalyticsAndProgressView
                programs={programs}
                logs={logs}
                recommendation={recommendation}
                onNavigateToProgram={() => setActiveTab("program")}
                onNavigateToCoach={() => setActiveTab("coach")}
                onSaveLog={(log) => handleSaveWorkoutLog(log, false)}
                onDeleteLog={handleDeleteLog}
                onSyncedWithingsLogs={handleWithingsSyncedLogs}
              />
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
            <Dumbbell className="h-4 w-4" />
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
        onSyncedWithingsLogs={handleWithingsSyncedLogs}
        onSendToCoach={handleNaturalCoachParseFromModal}
      />

      {/* Withingsistä tuodun uuden lenkin vapaaehtoinen tuntemuskysely */}
      <WithingsFeelingsPromptModal
        log={pendingWithingsPromptLog}
        onSave={(updatedLog) => {
          markWithingsPrompted(updatedLog.id);
          setPendingWithingsPromptLog(null);
          handleSaveWorkoutLog(updatedLog, false);
        }}
        onSkip={(logId) => {
          markWithingsPrompted(logId);
          setPendingWithingsPromptLog(null);
        }}
      />
    </div>
  );
}
