# תוכנית – Milestone 1: בסיס אפליקציה ושני מסכים מעוצבים

> מקורות: `MILESTONES.md` (Milestone 1), `DESIGN.md` §1–2, `ARCHITECTURE.md` §1, §2.1–2.2, ADR-1, ADR-8; התמונות `wireframes.png`, `mockups.png`, `style-guide.png`.
> באבן דרך זו **אין** לוגיקת משחק, אודיו, היסטוריה אמיתית, קונפטי או PWA — רק שלד הפרויקט ושני מסכים מעוצבים.

## 0. תנאי מוקדם

- **Node.js אינו מותקן כרגע במחשב** (`node`/`npm` לא נמצאו, וגם לא Homebrew). לפני הבנייה המשתמש מתקין את גרסת ה-LTS העדכנית מ-nodejs.org (מתקין macOS רגיל), בהדרכה צעד-אחר-צעד. ללא זה אי אפשר להריץ `npm`.
- ה-Repository המקומי כבר קיים ומחובר ל-`https://github.com/shanialon/simon.git`. אין commit/push באבן דרך זו עד לבקשת המשתמש.

## 1. הקמת הפרויקט

יצירה ידנית של הקבצים (לא `npm create vite`, כדי לא לדרוס את `.gitignore` ואת מבנה התיקייה):

| קובץ | תוכן |
|---|---|
| `package.json` | `"type": "module"`, `"private": true`, `"engines": { "node": ">=20.19" }`; סקריפטים: `dev` → `vite`, `build` → `tsc --noEmit && vite build`, `preview` → `vite preview`, `typecheck` → `tsc --noEmit`, `test` → `vitest run` |
| `package-lock.json` | נוצר ע"י `npm install` ונשמר ב-Repository |
| `tsconfig.json` | `strict: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `target/lib: ES2022 + DOM`, `noEmit`, `types: ["vitest/globals", "@testing-library/jest-dom"]`; `include: ["src", "vite.config.ts"]` (קובץ tsconfig יחיד – פשוט מספיק) |
| `vite.config.ts` | `@vitejs/plugin-react`; `base: '/simon/'` (ADR-8, כבר מעכשיו, כדי שבעיות נתיב יתגלו מוקדם); בלוק `test`: `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/test/setup.ts'` |
| `index.html` | `<html lang="he" dir="rtl">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#0A1628">`, `<title>סיימון</title>`, `<div id="root">`, סקריפט `/src/main.tsx` |

**תלויות (גרסאות יציבות עדכניות בזמן ההתקנה):**
- runtime: `react`, `react-dom`, `@fontsource/heebo`
- dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`

לא מתקינים עדיין `canvas-confetti`, `vite-plugin-pwa` או כל ספרייה אחרת – הן שייכות לאבני דרך מאוחרות. אין ESLint/Prettier (לא נדרש ב-spec).

## 2. מבנה הקבצים

```text
src/
  main.tsx                 # createRoot + <StrictMode>; imports fonts + global CSS
  App.tsx                  # holds current screen ('home' | 'about'), renders screen + BottomNav
  App.test.tsx             # render + navigation tests
  test/setup.ts            # imports @testing-library/jest-dom/vitest
  styles/
    tokens.css             # CSS variables: colors, typography, spacing, radii, shadows
    global.css             # reset, body, layout shell, shared button/card classes
  game/
    colors.ts              # the 4 colors: id, Hebrew label, hex, grid-area (ADR-1)
  components/
    SimonBoard.tsx/.css    # circular 2x2 grid of 4 <button> quadrants + center disc
    BottomNav.tsx/.css     # "בית" / "אודות" tabs
  screens/
    HomeScreen.tsx/.css    # title, stage indicator, board, status area, "התחל משחק"
    AboutScreen.tsx/.css   # title "אודות", "על המשחק" card, history heading + empty state
```

## 3. App Shell וניווט

- `App` מחזיק `useState<'home' | 'about'>('home')`. אין Router ואין שינוי URL (ARCHITECTURE §2.1, §2.9) – מעבר מסכים אינו טוען דף.
- המיקום הזה ב-`App` נבחר כי בהמשך `useGame` ו-`useHistory` ייושבו שם (ADR-2, ADR-4), כך שמעבר מסכים לא יפרק את מצב המשחק.
- פריסה: מיכל `.app` ברוחב מלא עד `max-width: 480px`, ממורכז, בגובה `100dvh`, `display: flex; flex-direction: column`. אזור תוכן נגלל (`overflow-y: auto`) ופס ניווט קבוע בתחתית (עם `padding-bottom: env(safe-area-inset-bottom)`). `overflow-x: hidden` על הגוף – ללא גלילה אופקית.
- `BottomNav`: `<nav aria-label="ניווט ראשי">` עם שני `<button>`: **"בית"** ו-**"אודות"**, עם `aria-current="page"` על הפעיל. סדר ב-DOM: בית ואז אודות, כך שב-RTL "בית" מימין (כמו בהמחשות). כל לשונית: אייקון SVG פשוט inline (בית / i בעיגול, לפי ה-Wireframes וה-Style Guide) מעל התווית. הפס על `Surface` עם גבול `Border` ופינות מעוגלות; הלשונית הפעילה בולטת (רקע כחול `Primary Blue` וטקסט לבן, לפי רכיב ה-Navigation ב-Style Guide), הלא-פעילה בטקסט אפור-בהיר.

## 4. מסך בית

מלמעלה למטה (לפי Wireframes ו-DESIGN §1.1, מצב "לפני תחילת משחק"):

1. **כותרת** `<h1>סיימון</h1>` – 32px Bold, לבן, ממורכזת, עם קו הפרדה דק בצבע `Border` מתחתיה (כמו ב-Mockups).
2. **חיווי שלב** – "שלב 1 מתוך 10" (H3: 20px Semibold). המספרים עטופים ב-`<bdi>` לבידוד כיווניות (DESIGN §2.5). הערה: ה-Wireframe מציג "שלב 0", אך DESIGN §1.1 קובע במפורש "שלב 1 מתוך 10" – DESIGN גובר.
3. **אזור סטטוס** – שורת טקסט Body בגובה שמור מראש (ריקה במצב התחלה), כדי שהפריסה לא תקפוץ כשיתווספו הודעות ב-Milestone 2.
4. **לוח Simon** (ראה §6).
5. **כפתור ראשי** "התחל משחק" (`.btn-primary`). ב-Milestone זה הכפתור אינו עושה דבר (`type="button"` ללא handler). הערה: ה-Wireframes וה-Mockups מציגים "התחל", אך DESIGN/PRD קובעים "התחל משחק" – הטקסט של DESIGN מחייב.

אין כפתורי הגדרות, סאונד או כל פעולה אחרת.

## 5. מסך אודות

לפי Wireframes ו-DESIGN §1.2:

1. **כותרת** `<h1>אודות</h1>` – באותו סגנון כמו "סיימון" בבית. (ה-Mockup מציג "סיימון" גם כאן, אך ה-Wireframes וה-DESIGN קובעים "אודות" – מבנה ותוכן לפי ה-Wireframes.)
2. **כרטיס "על המשחק"** (`Surface`, גבול `Border`, פינות מעוגלות, ריווח 16px): כותרת `<h2>` "על המשחק" ותוכן Body לפי ה-Wireframe:
   - "זכור את רצף הצבעים שמוצג."
   - "לחץ על הצבעים באותו סדר."
   - "נסה להגיע עד שלב 10!"
3. **כותרת** `<h2>` "10 המשחקים האחרונים".
4. **חיווי ריק**: "עדיין אין משחקים שמורים." (Body, אפור-בהיר, בתוך כרטיס עמום). ב-Milestone זה תמיד מוצג, כי ההיסטוריה עדיין לא קיימת.
5. **אין** כפתור "מחק היסטוריה" – לפי DESIGN הוא מוצג רק כשיש רשומות.

## 6. לוח Simon (ADR-1)

- `src/game/colors.ts`:
  ```ts
  export type ColorId = 'green' | 'red' | 'yellow' | 'blue';
  // Spatial order on the board: top-left, top-right, bottom-left, bottom-right
  export const COLORS = [
    { id: 'green',  label: 'ירוק', area: 'tl' },
    { id: 'red',    label: 'אדום', area: 'tr' },
    { id: 'yellow', label: 'צהוב', area: 'bl' },
    { id: 'blue',   label: 'כחול', area: 'br' },
  ] as const;
  ```
  (ה-HEX עצמם נמצאים ב-`tokens.css`; ב-TS רק המזהים, התוויות והמיקום.)
- מיכל עגול (`border-radius: 50%`) ברקע `Charcoal`, עם מסגרת דקה בצבע `Border` וצל רך. `direction: ltr` על המיכל כדי שה-RTL לא יהפוך את הסידור. `display: grid; grid-template-areas: "tl tr" "bl br"`, `gap` של כ-4% מקוטר הלוח = פסי ההפרדה הכהים.
- גודל: `width: min(82vw, 340px, 46dvh)`; `aspect-ratio: 1` – כך הלוח גדול בטלפון אבל לא דוחף את הכפתור מתחת למסך בטלפונים נמוכים.
- כל רבע הוא `<button type="button" aria-label="ירוק">` וכו', עם `grid-area` מפורש ופינה חיצונית אחת מעוגלת ב-100% (רבע עיגול): ירוק `border-top-left-radius`, אדום `top-right`, צהוב `bottom-left`, כחול `bottom-right`. צבע מלא מתוך `tokens.css`, ללא טקסט גלוי (המחשות ה-Mockups ללא כיתוב).
- **דיסק מרכזי** – `<div aria-hidden="true">` ממוקם אבסולוטית במרכז, קוטר ~32%, `Charcoal` עם טבעת `Border`, `pointer-events: none`, ללא טקסט (DESIGN §2.3).
- הכנה למגע (ללא לוגיקה): `touch-action: manipulation`, `user-select: none`, `-webkit-tap-highlight-color: transparent`. ב-Milestone זה הרבעים לא מגיבים ללחיצה. מחלקות CSS למצבי `is-lit` / `is-dimmed` **לא** מתווספות עכשיו – הן שייכות ל-Milestone 2.

## 7. שפה חזותית (`tokens.css`, `global.css`)

- **צבעים** (DESIGN §2.1): `--green #00D26A`, `--red #FF3B30`, `--yellow #FFD600`, `--blue #00A3FF`, `--charcoal #0F0F0F`, `--soft-gray #E5E5E5`, `--white #FFFFFF`, `--bg #0A1628`, `--surface #12213A`, `--border #1E3556`.
- **גופן**: ב-`main.tsx` ייבוא `@fontsource/heebo/400.css`, `600.css`, `700.css` בלבד. `font-family: 'Heebo', Arial, sans-serif`.
- **טיפוגרפיה** כמשתנים: H1 32/700, H2 24/700, H3 20/600, Body 16/400, Caption 14/400, Button 16/600.
- **ריווח**: `--space-1: 8px`, `--space-2: 12px`, `--space-3: 16px`, `--space-4: 24px` – רק הערכים האלה.
- **פינות וצללים**: כפתור `border-radius: 999px` (גלולה), כרטיסים 16px; צל רך לכפתור וללוח.
- **`.btn-primary`**: רקע `--blue`, טקסט לבן 16px Semibold, רוחב ~80% מהמסך (עד 320px), גובה ≥48px (אזור מגע נוח), צל רך; `:active` – הכהיה קלה; `:focus-visible` – טבעת מיקוד בהירה.
- רקע הגוף `--bg`, טקסט ברירת מחדל `--white` / `--soft-gray`. Theme כהה בלבד (DESIGN §2.6).
- `@media (prefers-reduced-motion: reduce)` – ביטול transitions (הכנה; כמעט אין אנימציות ב-M1).

## 8. בדיקות אוטומטיות (`src/App.test.tsx`)

Vitest + React Testing Library + jsdom:
1. **Render בית**: מוצגים `heading` "סיימון", הטקסט "שלב 1 מתוך 10", כפתור "התחל משחק", וארבעה כפתורים בשמות "ירוק", "אדום", "צהוב", "כחול".
2. **מיקומי הצבעים**: כל רבע נושא את מחלקת המיקום הנכונה (ירוק→tl, אדום→tr, צהוב→bl, כחול→br) – בדיקה מול `COLORS`.
3. **ניווט לאודות**: לחיצה על "אודות" מציגה `heading` "אודות", "על המשחק", "10 המשחקים האחרונים" ו-"עדיין אין משחקים שמורים."; הלוח לא מוצג; אין כפתור "מחק היסטוריה"; `aria-current="page"` עבר ל"אודות".
4. **חזרה לבית**: לחיצה על "בית" מחזירה את הלוח ואת "התחל משחק".
5. **שני מסכים בלבד**: בפס הניווט יש בדיוק שני כפתורים.

(בדיקת "אין טעינת דף" ידנית – ראה §9; ב-jsdom אין ניווט אמיתי, אבל היעדר Router/קישורים מבטיח זאת מבנית.)

## 9. אימות לפני סימון 🟡

1. `npm run typecheck`, `npm test`, `npm run build` – כולם עוברים.
2. `npm run dev` → פתיחת `http://localhost:5173/simon/` בדפדפן המובנה, באמולציית מובייל (375×812) וגם ברוחב צר (320px):
   - השוואה חזותית מול ה-Mockups: רקע כהה, לוח עגול עם ירוק/אדום למעלה (שמאל/ימין) וצהוב/כחול למטה, כפתור כחול, פס ניווט.
   - מעבר בית ↔ אודות: ה-URL לא משתנה והדף לא נטען מחדש (בדיקה עם משתנה זמני ב-`window` דרך כלי ה-JavaScript – שורד את המעבר).
   - אין גלילה אופקית (`document.documentElement.scrollWidth <= innerWidth`).
   - כל הטקסטים בעברית, `dir="rtl"` פעיל, "בית" מימין בפס הניווט.
   - בקונסול אין שגיאות; הגופן Heebo נטען מקומית (בבקשות הרשת אין `fonts.googleapis.com`).
3. סגירת שרת ה-dev בסיום.

## 10. עדכונים במסמכים בסיום הבנייה

- `MILESTONES.md`: 🟡 ליד כותרת Milestone 1.
- `CLAUDE.md`, סעיף "פקודות הרצה": **הרצה (dev):** `npm run dev` (כתובת `http://localhost:5173/simon/`); **בדיקות (test):** `npm test`.
- `.gitignore`: כבר מכסה `node_modules/` ו-`dist/` – אין צורך בשינוי.
- אין ADR חדש צפוי; אם תתקבל החלטה טכנית משמעותית במהלך הבנייה – תתועד כ-ADR.

## 11. מחוץ לתכולה של Milestone 1

לוגיקת משחק, Reducer, אודיו, הארות ומצבי לוח (M2); השהיה/המשך (M3); היסטוריה ב-`localStorage`, כרטיסי תוצאה וחלונית מחיקה (M4); אייקונים, Manifest, Service Worker ופריסה ל-GitHub Pages (M5).

## Definition of Done (מתוך MILESTONES.md)

- [ ] `npm run build` ו-TypeScript typecheck מסתיימים בהצלחה; בדיקת Render/Navigation בסיסית עוברת.
- [ ] שני המסכים נפתחים ומעבר ביניהם אינו מרענן את הדף; אין מסך שלישי.
- [ ] מוצגים ארבעת אזורי הלוח במיקומים הנכונים, חיווי שלב וכפתור **"התחל משחק"**; מסך אודות מציג הסבר והודעת היסטוריה ריקה.
- [ ] כל הטקסטים הגלויים בעברית, כיווניות RTL, והתצוגה נוחה וקריאה ב-Viewport של Smartphone אנכי, ללא גלילה אופקית.
- [ ] לא נוספו יכולות שאינן ב-PRD, ואין Backend או Database.
