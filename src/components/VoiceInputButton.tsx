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
  const [interimText, setInterimText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    setErrorMsg(null);

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognition =
      w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg(
        "Selaimessasi ei ole Web Speech API -tukea (käytä Chromea tai Safaria)."
      );
      return;
    }

    const startRecognition = (allowRetry: boolean) => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "fi-FI";
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setInterimText("");
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let finalChunk = "";
          let interimChunk = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalChunk += transcript;
            } else {
              interimChunk += transcript;
            }
          }
          if (interimChunk) {
            setInterimText(interimChunk);
          }
          if (finalChunk.trim()) {
            setInterimText("");
            onTranscriptRef.current(finalChunk.trim());
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          recognitionRef.current = null;
          setIsListening(false);
          setInterimText("");
          if (event.error === "audio-capture" && allowRetry) {
            // iOS WebKit vapauttaa mikrofonin pienellä viiveellä edellisen sanelun jälkeen
            window.setTimeout(() => startRecognition(false), 450);
            return;
          }
          if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
          ) {
            setErrorMsg(
              "Sanelu estetty selaimessa – käytä iPhonen näppäimistön mikrofoninappia tai salli mikrofoni Safarista."
            );
          } else if (event.error === "audio-capture") {
            setErrorMsg(
              "iPhone varasi mikrofonin hetkeksi – napauta uudelleen tai käytä näppäimistön mikrofoninappia."
            );
          } else if (event.error !== "aborted" && event.error !== "no-speech") {
            setErrorMsg(`Puheentunnistusvirhe: ${event.error}`);
          }
        };

        recognition.onend = () => {
          recognitionRef.current = null;
          setIsListening(false);
          setInterimText("");
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch {
        setIsListening(false);
        setErrorMsg("Mikrofonin käynnistys epäonnistui.");
      }
    };

    startRecognition(true);
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        aria-label={isListening ? "Lopeta puhesyöttö" : `${label} (fi-FI)`}
        title={
          isListening
            ? "Kuunnellaan (fi-FI)... napsauta lopettaaksesi"
            : "Sanele suoritus tai tuntemukset suomeksi (Web Speech API fi-FI)"
        }
        className={`apple-press inline-flex items-center gap-2 rounded-full font-medium transition-all ${
          compact ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-xs sm:text-sm"
        } ${
          isListening
            ? "bg-[#FF3B30] text-white shadow-[0_0_20px_rgba(255,59,48,0.55)] ring-2 ring-[#FF3B30]/50 animate-pulse"
            : "bg-white/8 hover:bg-white/14 text-[#F5F5F7] border border-white/12"
        }`}
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4 shrink-0" />
            <span>Kuunnellaan (fi-FI)…</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-[#0A84FF] shrink-0" />
            <span>{label}</span>
          </>
        )}
      </button>

      {interimText && (
        <div className="flex items-center gap-1.5 text-xs text-[#64D2FF] bg-[#0A84FF]/15 border border-[#0A84FF]/30 px-2.5 py-1 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 shrink-0 animate-spin" />
          <span className="italic">&ldquo;{interimText}…&rdquo;</span>
        </div>
      )}

      {errorMsg && (
        <span role="alert" className="text-xs text-[#FF453A] mt-0.5">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
