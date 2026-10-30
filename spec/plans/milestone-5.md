# תוכנית – Milestone 5: PWA, Offline ופרסום ב-GitHub Pages

> מקורות: `MILESTONES.md` (Milestone 5); `PRD.md` §4.5, §4ב ("דפדפן שאינו תומך בהתקנת PWA"), §5; `ARCHITECTURE.md` §1 (Stack, סיכונים), §2.7, §2.8, §2.9, §2.10, ADR-6, ADR-7, ADR-8, ADR-9; `DESIGN.md` §2.1 (Background), §2.4 (App Icon). אין תמונת אייקון נפרדת (DESIGN §2.4) – האייקון נבנה לפי התיאור ולפי סידור הצבעים ב-`src/game/colors.ts`.
> באבן דרך זו **אין** שינוי בהתנהגות המשחק, במסכים או בהיסטוריה. זו אבן הדרך האחרונה (MILESTONES: "סיום הפרויקט").

## 0. מה משתנה בקצרה

- **אייקון:** קובץ מקור `public/icon.svg` (לוח Simon עגול על רקע `#0A1628`), וממנו נוצרים פעם אחת קובצי PNG ו-`favicon.ico` שנשמרים ב-`public/` (ADR-7).
- **PWA:** `vite-plugin-pwa` ב-`vite.config.ts` עם Manifest (`Simon`, `id: '/simon/app'`, `lang: 'he'`, `dir: 'rtl'`), Service Worker מסוג `generateSW` ו-Precache של כל הנכסים (JS, CSS, HTML, אייקונים, גופן Heebo).
- **עדכונים:** `registerType: 'prompt'` בלי חלונית ובלי `skipWaiting` – גרסה חדשה ממתינה עד שהאפליקציה נסגרת לגמרי, ולכן לעולם לא קוטעת משחק (ADR-6).
- **פרסום:** Workflow חדש `.github/workflows/deploy.yml` – בכל Push ל-`main`: התקנה, typecheck, בדיקות, Build ופריסה ל-GitHub Pages.
- **הגדרות בגיטהאב:** המשתמש מגדיר בעצמו את Pages לעבודה עם GitHub Actions (§6). ה-Push שמפעיל את הפריסה הראשונה מתבצע **רק באישור מפורש** של המשתמש (CLAUDE.md).
- `gameReducer`, `useGame`, `useHistory`, המסכים והרכיבים – ללא שינוי.

## 1. קבצים

```text
public/                          # NEW folder – copied as-is into dist/ under /simon/
  icon.svg                       # NEW – hand-written source icon (ADR-7)
  pwa-64x64.png                  # generated
  pwa-192x192.png                # generated
  pwa-512x512.png                # generated
  maskable-icon-512x512.png      # generated
  apple-touch-icon-180x180.png   # generated
  favicon.ico                    # generated
pwa-assets.config.ts             # NEW – config for @vite-pwa/assets-generator
.github/workflows/deploy.yml     # NEW – CI + deploy to GitHub Pages
vite.config.ts                   # + VitePWA(...) with manifest and workbox options
index.html                       # + favicon / svg icon / apple-touch-icon links
src/main.tsx                     # + registerSW({ immediate: true })
tsconfig.json                    # + "vite-plugin-pwa/client" in types
package.json / package-lock.json # + devDependencies, + "generate-pwa-assets" script
```

`.gitignore` – ללא שינוי (`dist/` כבר מוחרג; אין `dev-dist/` כי ה-Service Worker לא פועל ב-dev, ראה §3.4).

## 2. אייקון האפליקציה (ADR-7, DESIGN §2.4)

### 2.1 `public/icon.svg`

- קנבס `viewBox="0 0 512 512"`, רקע מלא `#0A1628` (Background) – ריבוע מלא בלי פינות מעוגלות (מערכת ההפעלה מעגלת/חותכת בעצמה).
- **לוח** עגול במרכז בקוטר ~78% מהקנבס (~400px, רדיוס ~200), כך שהוא בתוך ה-Safe Zone של Maskable (עיגול בקוטר 80%) – אותו קובץ מתאים גם ל-Maskable בלי ריפוד נוסף.
- ארבעה רבעים בצבעי ה-Style Guide בסידור המרחבי של הלוח (`colors.ts`, לא מתהפך ב-RTL): **ירוק `#00D26A` למעלה-שמאל, אדום `#FF3B30` למעלה-ימין, צהוב `#FFD600` למטה-שמאל, כחול `#00A3FF` למטה-ימין**.
- פסי הפרדה כהים ועבים בין הרבעים (Charcoal `#0F0F0F`, כמו ה-`gap` בלוח), מסגרת חיצונית דקה בגוון Border `#1E3556`.
- **מרכז כהה:** דיסק Charcoal בקוטר ~32% מהלוח, עם מסגרת Border – כמו `.simon-board__center`.
- **ללא טקסט**, ללא צללים/Glow (פרטים קטנים לא נראים ב-64px).

### 2.2 יצירת הקבצים – `@vite-pwa/assets-generator`

- סקריפט חדש ב-`package.json`: `"generate-pwa-assets": "pwa-assets-generator"`, עם `pwa-assets.config.ts`:
  - `preset`: מבוסס `minimal2023Preset`, עם **ריפוד 0** ל-Maskable ול-Apple ורקע `#0A1628` (האייקון כבר כולל רקע ו-Safe Zone; ריפוד ברירת המחדל היה מקטין את הלוח פעמיים).
  - `images: ['public/icon.svg']`.
- מריצים **פעם אחת** בבנייה; הקבצים נשמרים ב-`public/` ונכנסים ל-Repository. ה-CI לא מריץ את הסקריפט (ADR-7).
- בדיקה חזותית: פתיחת `pwa-512x512.png`, `maskable-icon-512x512.png` ו-`favicon.ico` ובדיקה שהצבעים במקומם והלוח לא נחתך.

## 3. PWA – `vite-plugin-pwa`

### 3.1 תלויות (devDependencies)

| חבילה | למה |
|---|---|
| `vite-plugin-pwa` (^2) | Manifest, Service Worker, Precache (ARCHITECTURE §1). תומך ב-Vite 8 לפי ה-peerDependencies |
| `workbox-window` | נדרש ל-`virtual:pwa-register` (peer dependency של הפלאגין); נארז ב-Build |
| `@vite-pwa/assets-generator` (^2) | יצירת האייקונים בלבד (ADR-7) |

אין תלויות Runtime חדשות מעבר למה שנארז מ-`workbox-window`.

### 3.2 `vite.config.ts`

```ts
const BASE = '/simon/'; // ADR-8 – single source for base, start_url and scope

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',     // never auto-reload (ADR-6)
      injectRegister: false,      // registered manually in main.tsx
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        id: `${BASE}app`,         // '/simon/app' – must never change (ADR-9)
        name: 'Simon',
        short_name: 'Simon',
        description: 'משחק זיכרון סיימון – חזרו על רצף הצבעים',
        lang: 'he',
        dir: 'rtl',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#0A1628',
        theme_color: '#0A1628',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',   // SPA fallback, inside the /simon/ scope only
        cleanupOutdatedCaches: true,
        // no skipWaiting / clientsClaim (ADR-6)
      },
    }),
  ],
  test: { /* unchanged */ },
});
```

- **נתיבים:** כל הנתיבים יחסיים ל-`base` (בלי `/` בהתחלה באייקונים), כך שהכול נטען מתחת ל-`/simon/` ולא משורש הדומיין (ARCHITECTURE §2.9). ה-Service Worker נוצר ב-`dist/sw.js` וה-Scope שלו הוא `/simon/`.
- **הגופן:** `@fontsource/heebo` מייצר קובצי `woff2` (וגם `woff` ישנים) לכל תת-קבוצת תווים. ה-Precache כולל את כל קובצי ה-`woff2` של שלושת המשקלים שבשימוש (Regular/Semibold/Bold, כבר מיובאים ב-`main.tsx`) – כך העברית והספרות זמינות Offline. קובצי `woff` לא נכנסים (כל הדפדפנים הנתמכים משתמשים ב-`woff2`).
- **אודיו:** אין קבצים – הצלילים נוצרים בקוד (Web Audio), ולכן עובדים Offline ללא Cache.
- **מה לא נכלל:** אין Runtime Caching, Background Sync או Push (ARCHITECTURE §2.7). אין משאבים חיצוניים לשמור.
- `name`/`short_name` הם `Simon` באנגלית (ADR-9); כותרת המסך ו-`<title>` נשארים **"סיימון"**. התיאור (`description`) הוא נוסח חדש קצר בעברית – לא מוצג במסכים; ניתן לשנות.
- לא מוגדר `orientation` – ה-spec לא דורש נעילת כיוון.

### 3.3 `index.html`

```html
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

Vite מוסיף אוטומטית את `/simon/` לקישורים לקבצים מ-`public/` ב-`index.html`. הפלאגין מזריק בעצמו את `<link rel="manifest">`. ה-`theme-color` הקיים (`#0A1628`) נשאר.

### 3.4 רישום ה-Service Worker – `src/main.tsx` (ADR-6)

```ts
import { registerSW } from 'virtual:pwa-register';

// Install updates in the background; a new version waits until every app window is closed (ADR-6)
registerSW({ immediate: true });
```

- בלי `onNeedRefresh` ובלי קריאה ל-`updateSW()` – לכן אין שום Reload יזום. גרסה חדשה מותקנת ונשארת במצב `waiting`, ונכנסת לתוקף רק בפתיחה הבאה אחרי סגירה מלאה של כל חלונות האפליקציה. משחק פעיל לא נקטע לעולם.
- `tsconfig.json`: הוספת `"vite-plugin-pwa/client"` ל-`types`, כדי ש-typecheck יכיר את `virtual:pwa-register`.
- ב-`npm run dev` ה-Service Worker **לא** פועל (ברירת המחדל של הפלאגין), כדי שלא ישמור גרסאות ישנות בזמן פיתוח. בודקים אותו ב-`npm run build` + `npm run preview` (`http://localhost:4173/simon/`, ADR-8).
- הבדיקות האוטומטיות (Vitest) לא טוענות את `main.tsx`, ולכן אינן מושפעות.

## 4. פרסום – `.github/workflows/deploy.yml` (ARCHITECTURE §2.9, ADR-8)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:          # manual re-run button, if ever needed

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24       # LTS, matches "engines" in package.json
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- הרשאות מינימליות בלבד (ARCHITECTURE §2.9 סעיף 5). אין Secrets או Tokens.
- אם typecheck, בדיקה או Build נכשלים – ה-`deploy` לא רץ, והאתר הקודם נשאר (Build שנכשל לא נפרס).
- גרסאות ה-Actions (`@v5`/`@v4`) ייבדקו מול התיעוד הרשמי בזמן הבנייה ויעודכנו לגרסה העדכנית היציבה.
- אין `404.html` ואין Router: יש רק כתובת אחת (`/simon/`), והמעבר בין "בית" ל"אודות" הוא פנימי (ARCHITECTURE §2.9).

## 5. בדיקות

### 5.1 אוטומטיות

- כל הבדיקות הקיימות (משחק, השהיה, היסטוריה, Strict Mode) הן בדיקות ה-Regression של DoD האחרון: עשרת השלבים, כישלון ראשון, קונפטי בניצחון בלבד, השהיה וחידוש, עשר תוצאות ומחיקה מאושרת. הן חייבות להמשיך לעבור – גם מקומית וגם ב-CI.
- אין בדיקות Vitest חדשות: ה-Service Worker וה-Manifest נוצרים ב-Build ונבדקים על ה-Build עצמו (5.2), לא ב-jsdom.

### 5.2 בדיקה מקומית על ה-Build (שלי, לפני סימון 🟡)

1. `npm run typecheck`, `npm test`, `npm run build` עוברים.
2. בתיקייה `dist/` קיימים `manifest.webmanifest`, `sw.js`, האייקונים ו-`favicon.ico`. ב-Manifest: `id: "/simon/app"`, `start_url`/`scope` = `/simon/`, `lang: "he"`, `dir: "rtl"`, `name: "Simon"`, אייקוני 192/512 ו-Maskable. רשימת ה-Precache ב-`sw.js` כוללת את ה-JS, ה-CSS, ה-HTML, האייקונים וקובצי ה-`woff2` של Heebo.
3. `npm run preview` → `http://localhost:4173/simon/` בדפדפן המובנה באמולציית מובייל:
   - אין שגיאות 404 ברשת ובקונסול; ה-Manifest נטען; ה-Service Worker רשום עם Scope `/simon/` ובמצב `activated`.
   - **Offline:** אחרי טעינה מלאה עוצרים את שרת ה-preview וטוענים מחדש → האפליקציה עולה מה-Cache: "בית" ו"אודות", התחלת משחק, הארה, ניווט והיסטוריה שמורה. (צלילים – ראה 5.3.)
   - **עדכון גרסה:** משחק פעיל באמצע, Build חדש עם שינוי קטן ומבוטל לאחר מכן, ובקשת בדיקת עדכון → הגרסה החדשה במצב `waiting`, הדף **לא** מתרענן והמשחק ממשיך. אחרי סגירת כל החלונות ופתיחה מחדש – נטענת הגרסה החדשה.
   - צילום מסך במובייל אנכי (RTL) ל"בית" ול"אודות".
4. בסיום סוגרים את שרת ה-preview.

### 5.3 אחרי הפריסה (בכתובת האמיתית, אחרי ה-Push המאושר)

- **שלי:** ה-Workflow ב-Actions הסתיים בהצלחה (build + deploy); `https://shanialon.github.io/simon/` נטען ב-HTTPS, בלי 404 לנכסים, ה-Manifest וה-Service Worker תקינים (בדפדפן המובנה).
- **של המשתמש, בטלפון** (לא ניתן לבדוק זאת מהמחשב – לא יוצג כעבר בלי שבוצע):
  1. פתיחת הכתובת, משחק קצר עם צלילים, מגע, השהיה (מעבר ל"אודות") וחידוש, ניצחון/הפסד, היסטוריה ומחיקה.
  2. **התקנה:** אנדרואיד/Chrome – "התקנת אפליקציה"/"הוספה למסך הבית"; iPhone/Safari – כפתור השיתוף ← "הוספה למסך הבית". האייקון והשם `Simon` מופיעים.
  3. **Offline:** אחרי פתיחה אחת מלאה – מצב טיסה, פתיחת האפליקציה מהאייקון, משחק עם צלילים, מעבר ל"אודות" וצפייה בהיסטוריה.
- אם דפדפן מסוים לא מציע התקנה – זה מקובל לפי PRD §4ב; האתר נשאר אתר מובייל רגיל.

## 6. הגדרות בגיטהאב שהמשתמש מבצע בעצמו

> נבדק בתכנון: ה-Repository `shanialon/simon` כבר **ציבורי**, והענף הראשי הוא `main` – אין צורך לשנות זאת. Pages כבר מופעל ב-Repository, אבל הכתובת עדיין מחזירה "לא נמצא", כך שיש לוודא את מקור הפריסה. אם בזמן הבנייה יתברר שה-Repository הפך לפרטי – אעצור ואדריך לשנות זאת (Settings ← General ← Danger Zone ← Change visibility ← Public).

**הפעלת Pages דרך GitHub Actions – צעד אחר צעד:**

1. נכנסים ל-`https://github.com/shanialon/simon` (מחוברים לחשבון).
2. לוחצים על **Settings** (גלגל השיניים בשורת הלשוניות העליונה של ה-Repository).
3. בתפריט שבצד שמאל לוחצים על **Pages** (תחת "Code and automation").
4. בחלק **Build and deployment**, בשדה **Source**, בוחרים **GitHub Actions** (ולא "Deploy from a branch"). אין צורך ללחוץ על אף תבנית שמוצעת שם – קובץ ה-Workflow כבר יהיה בפרויקט.
5. זהו – אין צורך לשמור; הבחירה נשמרת מיד.

**הפריסה עצמה:**

6. אחרי שאסיים לבנות ותבדקו מקומית, אבקש את אישורך ל-**Push** – ה-Push הזה הוא מה שמפעיל את הפריסה. לא אדחוף בלי אישור מפורש.
7. אחרי ה-Push: בלשונית **Actions** ב-Repository תופיע ריצה בשם "Deploy to GitHub Pages". עיגול צהוב = רצה, וי ירוק = הצליחה (בדרך כלל 1–3 דקות), איקס אדום = נכשלה (אז אבדוק ואתקן).
8. אחרי וי ירוק, האתר זמין בכתובת **`https://shanialon.github.io/simon/`** (לפעמים לוקח עוד דקה או שתיים בפעם הראשונה).
9. מכאן והלאה כל Push ל-`main` מפרסם אוטומטית – אין צורך לחזור על ההגדרות.

## 7. סדר העבודה ואישורים

1. בנייה מקומית לפי §2–§4, בדיקות לפי §5.2, סימון 🟡 ב-`MILESTONES.md`, ועצירה.
2. המשתמש מבצע את §6 צעדים 1–5 (אפשר גם לפני כן).
3. **בקשת אישור ל-Push** (CLAUDE.md: Milestone שדורש Push כדי להשלים אותו). ה-Push הזה נועד לפריסה; הסימון נשאר 🟡 עד שהמשתמש בודק את האתר הפרוס ומאשר.
4. בדיקות §5.3, ותיקונים אם צריך (כל תיקון = Push נוסף, גם הוא באישור).
5. אישור המשתמש → ✅.

## 8. תיעוד

- `ARCHITECTURE.md`: ADR-6–ADR-9 כבר מתארים את ההחלטות. אם במימוש משהו ישתנה (למשל שמות קבצי האייקונים, הגדרות הריפוד, או גרסאות ה-Actions) – יעודכן ניסוח ה-ADR הרלוונטי. ADR חדש רק אם תתקבל החלטה טכנית משמעותית שאינה מכוסה (למשל אי-הכללת קובצי `woff` ב-Precache, אם יתברר שזה משמעותי).
- `MILESTONES.md`: 🟡 ליד כותרת Milestone 5 בסיום הבנייה המקומית.
- `CLAUDE.md` → "פקודות הרצה": הוספת `npm run preview` (`http://localhost:4173/simon/`) לבדיקת ה-PWA, ו-`npm run generate-pwa-assets` ליצירת האייקונים מחדש.

## 9. Definition of Done – איך כל תנאי נבדק

| תנאי | איך נבדק |
|---|---|
| Workflow ב-Actions עובר בדיקות ו-Build ומפרסם אוטומטית אחרי Push ל-`main` | §4; §5.3 – ריצה ירוקה אחרי ה-Push המאושר, בלי פריסה ידנית |
| האתר נטען ב-GitHub Pages ב-HTTPS, נכסים וניווט ללא 404 תחת `/simon/` | §5.2 (preview תחת `/simon/`) + §5.3 (הכתובת האמיתית, לשונית Network) |
| Manifest ו-Service Worker תקינים; אפשרות התקנה במכשיר תומך | §5.2 צעדים 2–3; §5.3 – התקנה בטלפון של המשתמש |
| אחרי Precache, ניתוק אינטרנט אינו מונע פתיחה, משחק, צלילים, ניווט והיסטוריה | §5.2 (עצירת השרת וטעינה מחדש) + §5.3 (מצב טיסה בטלפון, כולל צלילים) |
| עדכון גרסה אינו מרענן או מפסיק משחק פעיל | §3.4 (אין Reload בקוד) + §5.2 בדיקת עדכון באמצע משחק |
| Regression: עשרה שלבים, כישלון ראשון, קונפטי בניצחון בלבד, השהיה וחידוש, עשר תוצאות, מחיקה מאושרת; Smartphone אנכי בעברית/RTL | §5.1 (כל הבדיקות האוטומטיות, מקומית וב-CI) + צילומי מסך §5.2 + בדיקת הטלפון §5.3 |
