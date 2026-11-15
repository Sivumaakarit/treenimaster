"use client";

import { SportCategory } from "@/lib/types";
import React from "react";

export type CharacterSportType =
  | "runner" // Juoksija
  | "lifter" // Punttimies
  | "skier" // Hiihtäjä
  | "tennis" // Tennispelaaja
  | "badminton" // Sulkapalloilija
  | "golf" // Golfaaja
  | "recovery"; // Kehonhuolto / lepo

export function detectCharacterSportType(
  category: SportCategory,
  titleAndFeelings: string = ""
): CharacterSportType {
  const lower = titleAndFeelings.toLowerCase();
  if (lower.includes("sulkapallo") || lower.includes("sulka")) {
    return "badminton";
  }
  if (lower.includes("golf") || lower.includes("range") || lower.includes("kierros")) {
    return "golf";
  }
  if (category === "strength" || lower.includes("puntti") || lower.includes("maastaveto") || lower.includes("penkki") || lower.includes("kyykky")) {
    return "lifter";
  }
  if (category === "run" || lower.includes("juoks") || lower.includes("lenkki") || lower.includes("hölkk") || lower.includes("tabata") || lower.includes("intervall")) {
    return "runner";
  }
  if (category === "ski" || lower.includes("hiiht") || lower.includes("hiihd") || lower.includes("latu")) {
    return "skier";
  }
  if (category === "tennis" || lower.includes("tenni") || lower.includes("padel")) {
    return "tennis";
  }
  return "recovery";
}

export const CHARACTER_LABELS: Record<CharacterSportType, string> = {
  runner: "Juoksija",
  lifter: "Punttimies",
  skier: "Hiihtäjä",
  tennis: "Tennis",
  badminton: "Sulkapallo",
  golf: "Golf",
  recovery: "Huolto / lepo",
};

interface SportCharacterAvatarProps {
  category: SportCategory;
  title?: string;
  feelings?: string;
  overrideType?: CharacterSportType;
  size?: "sm" | "md" | "lg";
}

export function SportCharacterAvatar({
  category,
  title = "",
  feelings = "",
  overrideType,
  size = "md",
}: SportCharacterAvatarProps) {
  const charType =
    overrideType || detectCharacterSportType(category, `${title} ${feelings}`);

  const sizeClasses =
    size === "sm"
      ? "w-11 h-11 rounded-2xl"
      : size === "lg"
      ? "w-16 h-16 rounded-2xl"
      : "w-14 h-14 rounded-2xl";

  return (
    <div
      className={`${sizeClasses} shrink-0 relative overflow-hidden flex items-center justify-center border border-white/15 shadow-md select-none`}
      title={CHARACTER_LABELS[charType]}
    >
      {/* 1. JUOKSIJA (Vihreä / Turkoosi vauhdikas juoksijahahmo) */}
      {charType === "runner" && (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="bgRunner" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#14532d" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bgRunner)" />
          {/* Vauhtiviivat */}
          <path
            d="M6 22 H16 M4 32 H14 M8 42 H18"
            stroke="#34C759"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Pää & hikipanta */}
          <circle cx="38" cy="15" r="6" fill="#FDBA74" />
          <path d="M32 13 H44" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30 12 L25 10" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" />
          {/* Juokseva vartalo */}
          <path
            d="M36 22 L30 36"
            stroke="#34C759"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Kädet vauhdissa */}
          <path
            d="M35 24 L45 28 L49 23 M34 25 L23 28 L20 34"
            stroke="#FDBA74"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Jalat & lenkkarit */}
          <path
            d="M30 36 L41 43 L46 53 M30 36 L21 44 L14 49"
            stroke="#E2E8F0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <rect x="44" y="51" width="7" height="4" rx="2" fill="#30D158" />
          <rect x="10" y="47" width="7" height="4" rx="2" fill="#30D158" />
        </svg>
      )}

      {/* 2. PUNTTIMIES (Sininen / Punainen voimannostajahahmo levytangolla) */}
      {charType === "lifter" && (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="bgLifter" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#31102F" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bgLifter)" />
          {/* Levytanko & isot rautakiekot */}
          <line x1="6" y1="16" x2="58" y2="16" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
          <rect x="8" y="8" width="5" height="16" rx="2" fill="#FF3B30" />
          <rect x="14" y="10" width="4" height="12" rx="1.5" fill="#38BDF8" />
          <rect x="51" y="8" width="5" height="16" rx="2" fill="#FF3B30" />
          <rect x="46" y="10" width="4" height="12" rx="1.5" fill="#38BDF8" />
          {/* Punttimiehen pää & hartiat */}
          <circle cx="32" cy="24" r="5.5" fill="#FDBA74" />
          {/* Kädet nostamassa tankoa */}
          <path
            d="M23 16 L25 30 M41 16 L39 30"
            stroke="#FDBA74"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Leveä rinta & nostovyö */}
          <path
            d="M24 30 H40 L37 44 H27 Z"
            fill="#0A84FF"
          />
          <rect x="26" y="40" width="12" height="4" rx="1" fill="#FFD60A" />
          {/* Vahvat jalat */}
          <path
            d="M28 44 L25 56 M36 44 L39 56"
            stroke="#E2E8F0"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* 3. HIIHTÄJÄ (Jäänsininen / Turkoosi hiihtäjä pipolla, suksilla ja sauvoilla) */}
      {charType === "skier" && (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="bgSkier" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bgSkier)" />
          {/* Lumihiutaleet & latu */}
          <circle cx="14" cy="14" r="1.5" fill="#BAE6FD" opacity="0.8" />
          <circle cx="52" cy="12" r="1.5" fill="#BAE6FD" opacity="0.8" />
          <line x1="6" y1="54" x2="58" y2="54" stroke="#64D2FF" strokeWidth="3" strokeLinecap="round" />
          {/* Hiihtäjän pää, pipo & laskettelulasit */}
          <circle cx="36" cy="17" r="5.5" fill="#FDBA74" />
          <path d="M30 15 Q36 9 42 15" fill="#007AFF" />
          <circle cx="34" cy="10" r="2" fill="#FFF" />
          <rect x="35" y="15" width="6" height="3" rx="1" fill="#38BDF8" />
          {/* Vartalo & liuku */}
          <path d="M35 23 L29 37" stroke="#32ADE6" strokeWidth="6" strokeLinecap="round" />
          {/* Kädet & hiihtosauvat */}
          <path d="M34 26 L46 31" stroke="#FDBA74" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="46" y1="31" x2="38" y2="53" stroke="#94A3B8" strokeWidth="2" />
          <line x1="25" y1="29" x2="14" y2="52" stroke="#94A3B8" strokeWidth="2" />
          {/* Jalat */}
          <path d="M29 37 L37 52 M29 37 L19 50" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}

      {/* 4. TENNISPELAAJA (Oranssi/keltainen tennispelaaja mailalla ja pallolla) */}
      {charType === "tennis" && (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="bgTennis" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bgTennis)" />
          {/* Tennispallo */}
          <circle cx="51" cy="15" r="4" fill="#D9F99D" stroke="#84CC16" strokeWidth="1.2" />
          {/* Tennismaila */}
          <ellipse cx="47" cy="25" rx="5" ry="7" transform="rotate(-25 47 25)" fill="none" stroke="#FFD60A" strokeWidth="2.5" />
          <line x1="40" y1="33" x2="44" y2="29" stroke="#FDE047" strokeWidth="2.5" />
          {/* Pelaaja */}
          <circle cx="27" cy="18" r="5.5" fill="#FDBA74" />
          <path d="M22 15 H34" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M27 25 L26 39" stroke="#FF9F0A" strokeWidth="6" strokeLinecap="round" />
          <path d="M28 27 L40 33 M26 27 L17 34" stroke="#FDBA74" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M26 39 L34 53 M26 39 L18 53" stroke="#FFF" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}

      {/* 5. SULKAPALLOILIJA (Violetti/pinkki sulkapalloilija ja sulka) */}
      {charType === "badminton" && (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="bgBadminton" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bgBadminton)" />
          {/* Sulkapallo (Shuttlecock) */}
          <path d="M48 12 L55 8 L53 16 Z" fill="#FFF" />
          <circle cx="47" cy="13" r="2.2" fill="#FDE047" />
          {/* Maila */}
          <ellipse cx="45" cy="24" rx="4.5" ry="6" transform="rotate(20 45 24)" fill="none" stroke="#C084FC" strokeWidth="2" />
          <line x1="38" y1="32" x2="42" y2="28" stroke="#E9D5FF" strokeWidth="2" />
          {/* Pelaaja */}
          <circle cx="26" cy="19" r="5.5" fill="#FDBA74" />
          <path d="M26 26 L25 40" stroke="#A855F7" strokeWidth="6" strokeLinecap="round" />
          <path d="M27 28 L38 32 M25 28 L16 35" stroke="#FDBA74" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M25 40 L33 54 M25 40 L17 54" stroke="#E2E8F0" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}

      {/* 6. GOLFAAJA (Smaragdinvihreä golfaaja svingillä ja lipulla) */}
      {charType === "golf" && (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="bgGolf" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bgGolf)" />
          {/* Viheriön lippu & pallo */}
          <line x1="52" y1="22" x2="52" y2="52" stroke="#E2E8F0" strokeWidth="1.8" />
          <path d="M52 22 L60 26 L52 30 Z" fill="#FF3B30" />
          <circle cx="44" cy="52" r="2.2" fill="#FFF" />
          {/* Golfaaja & mailan svingi */}
          <circle cx="26" cy="18" r="5.5" fill="#FDBA74" />
          <path d="M21 15 H33" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M26 25 L26 40" stroke="#10B981" strokeWidth="6" strokeLinecap="round" />
          <path d="M26 28 L36 20" stroke="#FDBA74" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M36 20 L16 10" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="15" cy="10" rx="3" ry="1.8" fill="#94A3B8" />
          <path d="M26 40 L30 54 M26 40 L21 54" stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}

      {/* 7. KEHONHUOLTO / LEPO (Rauhallinen palautumishahmo) */}
      {charType === "recovery" && (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="bgRecovery" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#bgRecovery)" />
          <circle cx="32" cy="19" r="5.5" fill="#FDBA74" />
          <path d="M32 26 L32 41" stroke="#818CF8" strokeWidth="6" strokeLinecap="round" />
          <path
            d="M20 33 Q32 25 44 33"
            stroke="#FDBA74"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M22 48 L32 41 L42 48"
            stroke="#E2E8F0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </div>
  );
}
