# Treenimaster – Tilannekuva & Tekniset päätökset

Päivitetty: 2026-11-22

## 1. Äänisanelu (iOS Safari / PWA -yhteensopiva)
- **Ratkaisu:** Selaimen `webkitSpeechRecognition` korvattu `MediaRecorder` + `/api/transcribe` -toteutuksella ([VoiceInputButton.tsx](file:///Users/eskomaki/Antigravity/VerkkoSivut/Treenimaster/src/components/VoiceInputButton.tsx), [transcribe/route.ts](file:///Users/eskomaki/Antigravity/VerkkoSivut/Treenimaster/src/app/api/transcribe/route.ts)).
- **Toiminnallisuudet:**
  - Toimii toistuvasti samaan tekstikenttään (mikrofoni vapautetaan jokaisen nauhoituksen jälkeen).
  - **60 sekunnin automaattinen katkaisu:** pysäyttää nauhoituksen ja purkaa tekstin automaattisesti, jos nauhoitus jää päälle.
  - **22 sekunnin asiakaspuolen aikakatkaisu (`AbortController`)** estää ikuisen latausspinnerin.
  - Selkeä punainen **`■ Valmis`** -nappi nauhoituksen aikana.

## 2. Gemini-mallireititys & kustannustehokkuus
- Keskitetty apuri: [gemini.ts](file:///Users/eskomaki/Antigravity/VerkkoSivut/Treenimaster/src/lib/gemini.ts) (9 s aikakatkaisu per malli + automaattinen varaketju).
- **`tier: "lite"`** (`/api/transcribe`, `/api/selkosuomi`): `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-3.6-flash` (nopein ja edullisin, `maxOutputTokens: 350` sanelussa).
- **`tier: "standard"`** (`/api/coach`): `gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-3.8-flash`.

## 3. Globaali skilli muihin projekteihin
- Tallennettu globaaliksi Antigravity-skilliksi: `/Users/eskomaki/.gemini/config/skills/voice_dictation_gemini/SKILL.md`.

## 4. Käynnistysnäkymä, keskeneräisen treenin välimuisti ja nollaus
- **Käynnistys aina yläosasta:** `TodayWorkoutView` alustaa `lastScrolledFeedbackIdRef`-muuttujan nykyisellä `instantFeedback?.id`-arvolla, jotta kuittaamaton palaute ei vieritä sivua alas sovellusta avattaessa.
- **Keskeneräisen treenin automaattitallennus (`localStorage`):** `treenimaster_today_draft_v1` säilyttää päivän ja valitun treenin keskeneräiset vihreät ruksit, sarjamuokkaukset, pistearviot ja sanelut, vaikka selain tai PWA suljettaisiin vahingossa kesken treenin.
- **Turvallinen nollaus:** Tekstikentän vieressä on `Tyhjennä`-nappi tekstille ja tallennusnapin alla kaksivaiheinen `Nollaa valinnat ja ruksit` -nappi koko luonnoksen tyhjentämiseen.
