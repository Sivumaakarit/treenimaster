"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { SPORT_CATEGORIES } from "@/lib/programData";
import {
  CoachMessage,
  ProgramModificationProposal,
  ProgramWorkout,
  RecoveryStatus,
  SportCategory,
  WorkoutLog,
} from "@/lib/types";
import { VoiceInputButton } from "./VoiceInputButton";

interface CoachChatPanelProps {
  messages: CoachMessage[];
  logs: WorkoutLog[];
  programs: ProgramWorkout[];
  nextRecommendedWorkout: ProgramWorkout;
  todayISO: string;
  onAddMessage: (msg: CoachMessage) => void;
  onUpdateMessage: (msg: CoachMessage) => void;
  onAutoLogWorkout: (log: WorkoutLog) => void;
  onApproveProgramProposal: (
    proposal: ProgramModificationProposal,
    messageId: string
  ) => void;
  onRejectProgramProposal: (messageId: string) => void;
  fullPageMode?: boolean;
}

const QUICK_PROMPTS = [
  "Juoksin tänään aamulenkin 22 minuuttia kevyellä sykkeellä, happi kulki hyvin",
  "Kävin pelaamassa tennistä tunnin, happi kulki tosi hyvin ja jaksoin loppuun asti",
  "Analysoi viime viikkojen kuormitus- ja palautumistrendini: onko hermosto valmis Kiertoon 1?",
  "Alaselkä ja hermosto tuntuvat tukkoisilta kahden viikon kovien treenien jälkeen – ehdotatko kevennystä?",
];

export function CoachChatPanel({
  messages,
  logs,
  programs,
  nextRecommendedWorkout,
  todayISO,
  onAddMessage,
  onUpdateMessage,
  onAutoLogWorkout,
  onApproveProgramProposal,
  onRejectProgramProposal,
  fullPageMode = false,
}: CoachChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUsedVoice, setLastUsedVoice] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: CoachMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    onAddMessage(userMsg);
    if (!textOverride) {
      setInput("");
    }
    setIsLoading(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          todayISO,
          recentLogs: logs.slice(0, 18),
          nextRecommendedWorkout,
          currentPrograms: programs.slice(0, 12),
          history: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      let loggedWorkoutId: string | null = null;
      let loggedSummary: CoachMessage["loggedWorkoutSummary"] = null;

      if (data?.detectedWorkout?.shouldLog) {
        const dw = data.detectedWorkout;
        const category = (dw.category as SportCategory) || "other";
        const performedDate = dw.performedDate || todayISO;
        const durationMinutes =
          typeof dw.durationMinutes === "number" ? dw.durationMinutes : 30;
        const feelings = dw.feelings || text;

        const newLog: WorkoutLog = {
          id: `auto-log-${Date.now()}`,
          performedDate,
          category,
          title:
            dw.title ||
            `${SPORT_CATEGORIES[category]?.shortLabel || "Suoritus"} ${durationMinutes} min`,
          cycleNumber: null,
          workoutNumber: null,
          programId: null,
          durationMinutes: category === "rest" ? 0 : durationMinutes,
          rpe: typeof dw.rpe === "number" ? dw.rpe : 6.5,
          exercises: [],
          feelings,
          oxygenScore: typeof dw.oxygenScore === "number" ? dw.oxygenScore : 4,
          energyScore: typeof dw.energyScore === "number" ? dw.energyScore : 4,
          recoveryStatus:
            (dw.recoveryStatus as RecoveryStatus) || "normaali",
          source: lastUsedVoice ? "voice" : "coach_chat",
          createdAt: new Date().toISOString(),
        };

        onAutoLogWorkout(newLog);
        loggedWorkoutId = newLog.id;
        loggedSummary = {
          performedDate: newLog.performedDate,
          category: newLog.category,
          title: newLog.title,
          durationMinutes: newLog.durationMinutes,
          feelings: newLog.feelings,
        };
      }

      let proposalObj: ProgramModificationProposal | null = null;
      if (data?.programProposal?.hasProposal) {
        const pp = data.programProposal;
        const targetCycle = Number(pp.cycleNumber) || nextRecommendedWorkout.cycleNumber;
        const targetWn = (Number(pp.workoutNumber) ||
          nextRecommendedWorkout.workoutNumber) as 1 | 2 | 3;
        const targetWorkout =
          programs.find(
            (p) => p.cycleNumber === targetCycle && p.workoutNumber === targetWn
          ) || nextRecommendedWorkout;

        // Laske ehdotettu kevennys (esim. -5 % tai 2 työsarjaa)
        const updatedExercises = targetWorkout.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.slice(0, Math.max(2, ex.sets.length - 1)).map((s) => ({
            ...s,
            label: `${s.label} (Kevennetty)`,
          })),
        }));

        proposalObj = {
          id: `prop-${Date.now()}`,
          targetWorkoutId: targetWorkout.id,
          cycleNumber: targetWorkout.cycleNumber,
          workoutNumber: targetWorkout.workoutNumber,
          reason:
            pp.reason ||
            "Pitkän aikavälin kuormitustrendi ja palautumisvaste puoltavat määräkevennystä.",
          summary:
            pp.summary ||
            `Kevennetään harjoituksen ${targetWorkout.title} työsarjojen volyymia 1 sarjalla per pääliike keskushermoston palautumisen turvaamiseksi.`,
          updatedExercises,
        };
      }

      const assistantMsg: CoachMessage = {
        id: `msg-ai-${Date.now()}`,
        role: "assistant",
        content:
          data?.reply ||
          "Suoritus ja tuntemukset vastaanotettu. Tarkastelen kuormitustrendiäsi osana 8 kierron kokonaisuutta.",
        loggedWorkoutId,
        loggedWorkoutSummary: loggedSummary,
        programProposal: proposalObj,
        proposalStatus: proposalObj ? "pending" : null,
        createdAt: new Date().toISOString(),
      };

      onAddMessage(assistantMsg);
    } catch {
      const errMsg: CoachMessage = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content:
          "Yhteys valmentajapalvelimeen katkesi hetkellisesti. Tarkista verkkoyhteys ja yritä uudelleen.",
        createdAt: new Date().toISOString(),
      };
      onAddMessage(errMsg);
    } finally {
      setIsLoading(false);
      setLastUsedVoice(false);
    }
  };

  return (
    <div
      className={`apple-card min-w-0 flex flex-col overflow-hidden ${
        fullPageMode
          ? "h-[calc(100dvh-9.5rem)] min-h-[480px] lg:min-h-[680px]"
          : "h-[calc(100dvh-7.5rem)] min-h-[560px]"
      }`}
    >
      {/* Valmentajan otsikkopalkki */}
      <div className="border-b border-slate-200/80 bg-white/70 px-5 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Treenimaster-valmentaja
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Gemini + 43 NotebookLM-lähdettä
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Analyyttinen fysiologiavalmentaja · Automaattinen kalenterikirjaus puheesta ja tekstistä
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Viestiketju */}
      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isUser ? "items-end" : "items-start"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-medium text-slate-400">
                {isUser ? (
                  <>
                    <span>Sinä</span>
                    <User className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    <span className="text-slate-600 dark:text-slate-300">
                      Treenimaster
                    </span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200/80 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>

                {/* Automaattisen kalenterikirjauksen vahvistuskortti */}
                {msg.loggedWorkoutSummary && (
                  <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-950 dark:text-emerald-100">
                    <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                      <CalendarCheck className="h-4 w-4 shrink-0" />
                      <span>
                        Kirjattu automaattisesti Treenikalenteriin & Supabaseen
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className="rounded-md border px-2 py-0.5 font-semibold"
                        style={
                          SPORT_CATEGORIES[msg.loggedWorkoutSummary.category]
                            ?.badgeStyle
                        }
                      >
                        {
                          SPORT_CATEGORIES[msg.loggedWorkoutSummary.category]
                            ?.label
                        }
                      </span>
                      <span className="font-semibold">
                        {msg.loggedWorkoutSummary.title}
                      </span>
                      <span>· Pvm: {msg.loggedWorkoutSummary.performedDate}</span>
                    </div>
                    {msg.loggedWorkoutSummary.feelings && (
                      <div className="mt-1 text-[11px] opacity-85">
                        Tuntemukset tallennettu: &ldquo;{msg.loggedWorkoutSummary.feelings}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {/* Ohjelman muutosehdotus (vaatii aina käyttäjän hyväksynnän!) */}
                {msg.programProposal && (
                  <div className="mt-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-slate-900 dark:text-amber-100">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>
                        Perusteltu muutosehdotus 8 viikon ohjelmaan (vaatii hyväksynnän)
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed">
                      <strong>Perustelu:</strong> {msg.programProposal.reason}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed">
                      <strong>Toimenpide:</strong> {msg.programProposal.summary}
                    </p>

                    {msg.proposalStatus === "approved" ? (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Muutos hyväksytty ja päivitetty ohjelmaan</span>
                      </div>
                    ) : msg.proposalStatus === "rejected" ? (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-500/15 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Pidettiin alkuperäinen 8 viikon ohjelma ennallaan</span>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onApproveProgramProposal(
                              msg.programProposal!,
                              msg.id
                            );
                            onUpdateMessage({
                              ...msg,
                              proposalStatus: "approved",
                            });
                          }}
                          className="apple-press inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Hyväksy muutos ohjelmaan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onRejectProgramProposal(msg.id);
                            onUpdateMessage({
                              ...msg,
                              proposalStatus: "rejected",
                            });
                          }}
                          className="apple-press inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Pidä alkuperäinen ohjelma</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>
              Treenimaster analysoi suoritusta, fysiologiaa ja kalenterimerkintöjä...
            </span>
          </div>
        )}
      </div>

      {/* Pikakomennot / esimerkkilauseet */}
      <div className="border-t border-slate-200/70 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800/80 dark:bg-slate-900/50">
        <div className="mb-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Kokeile automaattista kirjausta tai trendianalyysiä:
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(qp)}
              disabled={isLoading}
              className="apple-press shrink-0 rounded-full border border-slate-200/90 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {qp.length > 54 ? `${qp.slice(0, 54)}…` : qp}
            </button>
          ))}
        </div>
      </div>

      {/* Syöttökenttä + suomenkielinen mikrofonipainike (fi-FI) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendMessage();
        }}
        className="border-t border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder="Kerro vapaasti tai puhu mikrofonilla (esim. 'Juoksin tänään aamulenkin 22 min kevyellä sykkeellä')..."
              className="w-full resize-none rounded-2xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <VoiceInputButton
              compact
              onTranscript={(spoken) => {
                setLastUsedVoice(true);
                setInput((prev) => (prev ? `${prev} ${spoken}` : spoken));
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Lähetä viesti valmentajalle"
              className="apple-press inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-45"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Lähetä</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
