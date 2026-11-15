# Treenimaster – Tilannekatsaus & arkkitehtuuri (2026-11-15)

## 1. Ympäristö ja palvelut
- **Paikallinen kehityspalvelin:** `http://localhost:3000` (ja lähiverkossa `http://192.168.10.181:3000`)
- **Supabase-projekti:** `Treenimaster` (`orhidqfceoyfevdqkdch`, `https://orhidqfceoyfevdqkdch.supabase.co`)
- **GitHub-repo:** `https://github.com/Sivumaakarit/treenimaster`
- **Vercel-tuotanto:** `https://treenimaster.vercel.app` (päivitetään vasta käyttäjän erillisestä komennosta)

## 2. Viimeisimmät toteutetut ominaisuudet (paikallisessa versiossa)
1. **Tänään-välilehden ikoni ja rakenne (`src/app/page.tsx`, `src/components/TodayWorkoutView.tsx`):**
   - Tähti-ikoni (`Sparkles` / `★`) korvattu treeni-ikonilla (`Dumbbell`).
   - Yläosa jaettu kahteen selkeään korttiin: **1) Tänään** (päivän tilanne, välipäivän lenkkisuositus sekä tänään kirjatut treenit/lenkit) ja **2) Seuraavana vuorossa oleva voimatreeni**.
   - Välipäivinä näkyy selkeä vihreä suosituslaatikko (*"Ei punttisarjoja tänään – tänään sopii erinomaisesti 20–30 min kevyt PK-lenkki, palauttava kävely tai lepo"*).
2. **8 viikon ohjelman etenemismittari & suora muokkaus (`src/components/FullProgramView.tsx`, `src/lib/storage.ts`):**
   - Heti **8 viikon ohjelma** -välilehden yläosassa on vihreä etenemispalkki sekä 12 kierron etenemiskartta, josta näkee suoraan vihreällä suoritetut treenit ja missä kohtaa ohjelmaa ollaan nyt menossa.
   - Jokaisessa treenikortissa on **Muokkaa**-painike, jolla voi muokata liikkeitä, sarjoja, toistoja ja painoja (`kg`) etukäteen suoraan ohjelmaan ja tallentaa ne pysyvästi Supabaseen (`saveProgramWorkoutOptimistic`).
3. **Välitön tsemppi- ja fysiologiapalaute + poikkeaman syyn kirjaus (`src/lib/coachIntelligence.ts`, `src/components/TodayWorkoutView.tsx`, `src/components/QuickOtherWorkoutModal.tsx`):**
   - Sekä voimatreenin kuittauksessa että lenkin kirjauksessa on pikavalinnat poikkeaman syylle (`"Suunnitelman mukaan ✓"`, `"Painoi / hieman tukkoinen"`, `"Alaselkä / nivelet varovasti"`, `"Aikapula"`, `"Huonot unet"`).
   - Heti kun voimatreeni tai lenkki kuitataan tehdyksi, näytölle ponnahtaa **Valmentajan välitön palaute & tsemppi** -kortti, joka kertoo miten harjoitus vei kohti 12 viikon tavoitteita ja miten se vaikuttaa seuraaviin päiviin.
4. **Kehitys & analyysi -välilehden graafiset kuvaajat ja jatkuva tausta-äly (`src/components/AnalyticsAndProgressView.tsx`):**
   - Jatkuva 3-tasoinen tausta-äly (välitön suoritusanalyysi, liukuva 14 vrk voima+juoksu-kuorma sekä 3 kierron trendisääntö).
   - Graafiset etenemispalkit kohti 12 viikon 1RM-tavoitteita, kierrosten 1–12 kuormituspylväikkö sekä harjoitusten happi- ja vireyskäyrät.
