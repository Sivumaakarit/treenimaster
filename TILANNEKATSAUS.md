# Treenimaster – Tilannekatsaus & arkkitehtuuri (2026-11-16)

## 1. Ympäristö ja palvelut
- **Paikallinen kehityspalvelin:** `http://localhost:3000` (ja lähiverkossa `http://192.168.10.181:3000`)
- **Supabase-projekti:** `Treenimaster` (`orhidqfceoyfevdqkdch`, `https://orhidqfceoyfevdqkdch.supabase.co`)
- **GitHub-repo:** `https://github.com/Sivumaakarit/treenimaster`
- **Vercel-tuotanto:** `https://treenimaster.vercel.app`

## 2. Viimeisimmät toteutetut ominaisuudet
1. **Täsmällinen 12 kierron voimaohjelma (8 + 4 viikkoa) päivitetty kaikkiin tiedostoihin ja Supabaseen (`treenimaster.md`, `docs/treenimaster-pohja.md`, `src/lib/programData.ts`, `src/lib/storage.ts`, `src/lib/coachIntelligence.ts`):**
   - **Laskentapohjat (1RM):** Maastaveto `205 kg`, Penkkipunnerrus `112,5 kg`, Etukyykky `132,5 kg`, Lisäpainoleuka `+55 kg`.
   - **Tavoitteet piikkauksen päätteeksi:** Maastaveto `210–215 kg`, Penkkipunnerrus `115–120 kg`, Lisäpainoleuka `+57,5–60 kg`, Etukyykky `135–140 kg`.
   - **Osa 1 (Kierrot 1–8):** Herätekierrot (1, 3, 5, 7) kaavalla `1 × 1–3 + 2 × 5`, perusvoimakierrot (2, 6) kaavalla `3 × 4` ja kevennyskierrot (4, 8) kaavalla `2 × 3` / `2 × 2`.
   - **Osa 2 (Piikkausviikot 9–12):** Viikko 9 (`1 × 2` ilman pudotussarjoja), Viikko 10 (`1 × 1` submaksimaalinen heräteykkönen), Viikko 11 (nopeusviritys & kevennys, Treeni 3 kokonaan lepoa) sekä Viikko 12 (Testipäivä 1: DL + B + L ennätykset, Testipäivä 2: Etukyykyn ennätys).
2. **Kaikkien kirjattujen treenien täysi muokkaus (`src/components/WorkoutLogEditor.tsx`) ja tallennus Supabaseen:**
   - Kaikki kirjatut suoritukset (**Tänään**-välilehdellä, **Kalenteri**-näkymässä sekä **Kehitys & analyysi** -välilehdellä) sisältävät **Muokkaa**-painikkeen.
3. **Juoksukilometrien (`km`) syöttö, korttinäkymä ja yhteiskilometrilaskuri (`src/lib/workoutParser.ts`, `src/components/AnalyticsAndProgressView.tsx`):**
   - Jokaisessa juoksukortissa näkyy kilometrimerkintä (`X,X km`) tai **+ Lisää km** -pikapainike, ja **Kehitys & analyysi** -välilehdellä on yhteiskilometrilaskuri.
4. **Lajihahmot (`src/components/SportCharacterAvatar.tsx`):**
   - Hauskat vektorihahmot eri lajeille: **Juoksija**, **Punttimies**, **Hiihtäjä**, **Tennis**, **Sulkapallo**, **Golf** ja **Kehonhuolto / lepo**.
