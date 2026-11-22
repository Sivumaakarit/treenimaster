"use client";

import { Mic, MicOff, Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function VoiceInputButton({
  onTranscript,
  label = "Puhu suomeksi",
  compact = false,
  className = "",
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stopStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopStream();
    };
  }, []);

  const toggleListening = async () => {
    setErrorMsg(null);

    // Jos nauhoitus on käynnissä -> lopeta ja lähetä litterointiin
    if (isListening && mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        stopStream();
        setIsListening(false);
      }
      return;
    }

    if (isTranscribing) return;

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setErrorMsg(
        "Selain ei tue äänitystä – käytä näppäimistön mikrofoninappia."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);
        stopStream();
        mediaRecorderRef.current = null;

        const recordedType = recorder.mimeType || mimeType || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type: recordedType });
        chunksRef.current = [];

        if (blob.size < 200) {
          return;
        }

        setIsTranscribing(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 22000);
        try {
          const form = new FormData();
          const ext = recordedType.includes("webm") ? "webm" : "m4a";
          form.append("audio", blob, `dictation.${ext}`);

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
            signal: controller.signal,
          });
          if (!res.ok) {
            const errJson = await res.json().catch(() => null);
            setErrorMsg(
              errJson?.error || "Sanelun muunto tekstiksi epäonnistui."
            );
            return;
          }
          const data = await res.json();
          const text = String(data?.text || "").trim();
          if (text) {
            onTranscriptRef.current(text);
          } else {
            setErrorMsg("Puhetta ei kuulunut – kokeile uudelleen.");
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setErrorMsg("Puheen muunto kesti liian kauan – kokeile uudelleen.");
          } else {
            setErrorMsg("Verkkovirhe puheen litteroinnissa.");
          }
        } finally {
          clearTimeout(timeoutId);
          setIsTranscribing(false);
        }
      };

      recorder.onerror = () => {
        setIsListening(false);
        stopStream();
        mediaRecorderRef.current = null;
        setErrorMsg("Mikrofonin nauhoitus keskeytyi.");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsListening(true);
    } catch (err) {
      stopStream();
      setIsListening(false);
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setErrorMsg(
          "Mikrofonilupa estetty – salli mikrofoni Safarista tai käytä näppäimistön mikrofoninappia."
        );
      } else {
        setErrorMsg("Mikrofonin käynnistys epäonnistui.");
      }
    }
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        disabled={isTranscribing}
        onClick={() => void toggleListening()}
        aria-label={isListening ? "Lopeta sanelu" : `${label} (fi-FI)`}
        title={
          isListening
            ? "Napauta lopettaaksesi sanelun ja muuntaaksesi tekstiksi"
            : "Napauta ja puhu suomeksi – napauta uudelleen kun olet valmis"
        }
        className={`apple-press inline-flex items-center gap-2 rounded-full font-medium transition-all disabled:opacity-70 ${
          compact ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-xs sm:text-sm"
        } ${
          isListening
            ? "bg-[#FF3B30] text-white shadow-[0_0_20px_rgba(255,59,48,0.55)] ring-2 ring-[#FF3B30]/50 animate-pulse"
            : isTranscribing
            ? "bg-[#0A84FF]/25 text-[#64D2FF] border border-[#0A84FF]/45"
            : "bg-white/8 hover:bg-white/14 text-[#F5F5F7] border border-white/12"
        }`}
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4 shrink-0" />
            <span>Nauhoitetaan… (napauta valmis)</span>
          </>
        ) : isTranscribing ? (
          <>
            <Sparkles className="w-4 h-4 shrink-0 animate-spin" />
            <span>Muunnetaan tekstiksi…</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-[#0A84FF] shrink-0" />
            <span>{label}</span>
          </>
        )}
      </button>

      {errorMsg && (
        <span role="alert" className="text-xs text-[#FF453A] mt-0.5">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
