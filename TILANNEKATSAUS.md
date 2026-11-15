# Treenimaster – Tilannekatsaus & arkkitehtuuri (2026-11-16)

## 1. Ympäristö ja palvelut
- **Paikallinen kehityspalvelin:** `http://localhost:3000` (ja lähiverkossa `http://192.168.10.181:3000`)
- **Supabase-projekti:** `Treenimaster` (`orhidqfceoyfevdqkdch`, `https://orhidqfceoyfevdqkdch.supabase.co`)
- **GitHub-repo:** `https://github.com/Sivumaakarit/treenimaster`
- **Vercel-tuotanto:** `https://treenimaster.vercel.app`

## 2. Viimeisimmät toteutetut ominaisuudet
1. **Kaikkien kirjattujen treenien täysi muokkaus (`src/components/WorkoutLogEditor.tsx`) ja tallennus Supabaseen:**
   - Kaikki kirjatut suoritukset (**Tänään**-välilehdellä, **Kalenteri**-näkymässä sekä **Kehitys & analyysi** -välilehdellä) sisältävät **Muokkaa**-painikkeen.
   - Muokkauksessa voi päivittää lajin/hahmon, otsikon, juoksukilometrit (`Matka km`, esim. Withings-sovelluksesta katsottuna), keston (`min`), päivämäärän, sarjat/painot (`kg`), hapen/voiman sekä yhteenvedon (myös sanelulla ja selkosuomi-muotoilulla).
   - Tallennus päivittää suorituksen välittömästi sekä käyttöliittymään että Supabaseen (`treenimaster_logs`).
2. **Juoksukilometrien (`km`) syöttö, korttinäkymä ja yhteiskilometrilaskuri (`src/lib/workoutParser.ts`, `src/components/AnalyticsAndProgressView.tsx`):**
   - Jokaisessa juoksukortissa näkyy selkeä kilometrimerkintä (`X,X km`), tai jos kilometrit jäivät sanelussa sanomatta, suora **+ Lisää km** -pikapainike.
   - **Kehitys & analyysi** -välilehdellä on oma **Juoksukilometrit & kestävyyslaskuri** -osio, joka laskee yhteen kaikki kirjatut juoksukilometrit, lenkkien lukumäärän, yhteiskeston sekä keskilenkin pituuden ja listaa lenkit muokkauspainikkeineen.
3. **Tarkka selkosuomi-sanelu ilman keksittyjä väitteitä (`src/app/api/selkosuomi/route.ts`, `src/lib/workoutParser.ts`):**
   - Sekä Gemini-pohjainen `/api/selkosuomi` että paikallinen jäsennin muotoilevat puhekielisen sanelun siistiksi kirjakieleksi lisäämättä koskaan väitteitä (kuten *"Happi kulki erinomaisesti"*), joita käyttäjä ei sanonut.
4. **Lajihahmot (`src/components/SportCharacterAvatar.tsx`):**
   - Hauskat vektorihahmot eri lajeille: **Juoksija**, **Punttimies**, **Hiihtäjä**, **Tennis**, **Sulkapallo**, **Golf** ja **Kehonhuolto / lepo**.
5. **8 viikon ohjelman etenemismittari & suora muokkaus (`src/components/FullProgramView.tsx`):**
   - Vihreä etenemispalkki, 12 kierron kartta ja jokaisen ohjelmatreenin suora muokkausmahdollisuus.
