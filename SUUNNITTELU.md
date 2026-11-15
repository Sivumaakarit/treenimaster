# Treenimaster – Henkilökohtainen tekoälyvalmennussovellus (Apple HIG + Gemini + Supabase)

**Viimeksi päivitetty:** 15.11.2026  
**Projektipolku:** `/Users/eskomaki/Antigravity/VerkkoSivut/Treenimaster`  
**Teknologiastack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, `@google/genai` (`gemini-2.5-flash`), `@supabase/supabase-js`, Web Speech API (`fi-FI`), `lucide-react`.

---

## 1. Projektin tarkoitus ja ydinarkkitehtuuri

**Treenimaster** on henkilökohtainen voima-, fysiologia- ja kokonaiskuormitusvalmentaja, jonka ytimessä on **8 kierron tiukennettu perusvoimaohjelma** sekä sitä seuraava **4 viikon piikkausjakso (viikot 9–12)**:
- **Laskentapohjat (1RM):** Maastaveto `205 kg` (nostettu `200 kg` varalla), Penkkipunnerrus `110 kg`, Lisäpainoleuanveto `+55 kg`, Etukyykky `135 kg`.
- **12 viikon tavoitteet:** Maastaveto `215–220 kg`, Penkki `115–120 kg`, Leuanveto `+60 kg`, Etukyykky `140–145 kg`.
- **Liukuva mikrosykli:** Yksi kierto koostuu 3 harjoituksesta (`Treeni 1: Raskas DL + B + L`, `Treeni 2: Etukyykky + Volyymileuat`, `Treeni 3: Nopeusveto + Kontrastipenkki + Kehonhallinta`), joiden välissä pidetään 2–4 välipäivää.

---

## 2. Kansiorakenne

```text
Treenimaster/
├── docs/
│   ├── treenimaster-pohja.md      # Alkuperäinen Treenimaster-kooste ja 8+4 viikon voimaohjelma
│   └── notebook-lahteet.md        # NotebookLM-muistikirjasta (43 lähdettä) haettu tutkimus- ja fysiologiatietopohja
├── supabase/
│   └── schema.sql                 # Supabasen SQL-skeema (treenimaster_programs, treenimaster_logs, treenimaster_messages)
├── raportit/
│   └── 2026-11-15_auditointi.md   # Antigravity-laatu- ja turvallisuusauditointi
├── src/
│   ├── app/
│   │   ├── api/coach/route.ts     # Gemini API -taustareitti strukturoidulla JSON-ulostulolla ja fysiologian tietopohjalla
│   │   ├── globals.css            # Apple HIG -lasiefektit, .apple-press (<100ms), <dialog> top-layer scroll containment
│   │   ├── layout.tsx             # Suomenkielinen juurilayout
│   │   └── page.tsx               # Sovelluksen pääkäyttöliittymä ja tilanhallinta
│   ├── components/
│   │   ├── TodayWorkoutView.tsx   # Päivän treeni -aloitusnäkymä, sarjakuittaukset ja lennosta muokkaus
│   │   ├── FullProgramView.tsx    # Koko 8 viikon perusvoimaohjelman + 4 vk piikkauksen kokonaisnäkymä
│   │   ├── CalendarView.tsx       # Värikoodattu kuukausi- ja viikkokalenteri päiväkohtaisella tarkastelulla
│   │   ├── CoachChatPanel.tsx     # Valmentajakeskustelu, fi-FI puhesyöttö ja automaattinen kalenterikirjaus
│   │   ├── QuickOtherWorkoutModal.tsx # Natiivi <dialog closedby="any"> modaali muulle treenille / lenkille
│   │   └── VoiceInputButton.tsx   # Web Speech API (fi-FI) mikrofonikomponentti
│   └── lib/
│       ├── types.ts               # TypeScript-tietomallit
│       ├── programData.ts         # 12 kierron × 3 treenin täydellinen tietorakenne & Apple-värikoodit
│       ├── supabaseClient.ts      # Supabase-asiakasohjelman alustus
│       └── storage.ts             # Local-First + Supabase async background sync & liukuvan mikrosyklin laskenta
├── .env.example                   # Ympäristömuuttujien mallipohja Vercel- ja paikalliskäyttöön
└── .env.local                     # Paikalliset ympäristömuuttujat (GEMINI_API_KEY & Supabase)
```

---

## 3. Käynnistys ja julkaisu Verceliin

1. **Paikallinen kehityspalvelin:**
   ```bash
   npm run dev
   ```
   Sovellus avautuu osoitteessa `http://localhost:3000`.

2. **Tuotantokäännöksen tarkistus:**
   ```bash
   npm run build
   ```

3. **Supabase-taulujen alustus:**
   Aja tiedoston `supabase/schema.sql` sisältö Supabasen SQL Editorissa. Sovellus toimii välittömästi Local-First-tilassa ja synkronoi kaiken datan automaattisesti Supabaseen taustalla.
