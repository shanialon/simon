# ARCHITECTURE – משחק סיימון (Simon)

> מבוסס על `PRD.md` של הפרויקט. תאריך בדיקת מקורות: 18 באוקטובר 2026. מסמך זה מגדיר את הארכיטקטורה הטכנית בלבד, ואינו משנה את דרישות המוצר.

## 1. Technology Stack שנבחר

| תחום | טכנולוגיה | תפקיד |
|---|---|---|
| Frontend | **React** עם **TypeScript** | מימוש שני המסכים, רכיבי UI וניהול מצב המשחק באופן בטוח ומפורש |
| Build ופיתוח מקומי | **Vite** עם React plugin | שרת פיתוח, Build סטטי ל-`dist`, התאמה לפריסת GitHub Pages |
| עיצוב | **CSS רגיל** ו-CSS Variables | ממשק Mobile-First, כיווניות RTL, לוח מעגלי, אנימציות ומשוב מגע; ללא ספריית UI כבדה |
| ניהול מצב | React Hooks עם **`useReducer`** | State machine מפורשת למעברי מצב ולשמירת משחק פעיל בזיכרון בלבד |
| גופן | **`@fontsource/heebo`** | הגופן Heebo נארז בתוך ה-Build ונשמר ב-Precache; ללא טעינה מ-Google Fonts, כדי לעבוד Offline |
| אודיו | **Web Audio API** | הפקת ארבעה צלילים נבדלים וצלילי ניצחון/הפסד באופן מקומי |
| אפקט ניצחון | **canvas-confetti** | קונפטי בניצחון בלבד, ללא שרת או נכסים חיצוניים |
| היסטוריית משחקים | **Web Storage API (`localStorage`)** | שמירת עשר תוצאות אחרונות בלבד |
| PWA ו-Offline | **vite-plugin-pwa** עם **Workbox `generateSW`** | Manifest, Service Worker, Precache של משאבי האפליקציה והתקנה במכשירים תומכים |
| Source Control | **Git + GitHub** | Repository מרכזי, היסטוריית גרסאות וביקורת שינויים |
| CI/CD ו-Hosting | **GitHub Actions + GitHub Pages** | בדיקות, Build ו-Deployment אוטומטיים של אתר סטטי דרך HTTPS |
| בדיקות | **Vitest** + **React Testing Library** | בדיקות לוגיקת הרצף, המעברים, האחסון ואינטראקציות מרכזיות |

**לא נדרשים:** Backend, שרת API, Database, Authentication, Authorization בצד שרת, Supabase, Vercel, Storage בענן, שירות AI או אנליטיקה חיצונית.

### החלטות ונימוקים מרכזיים

- **React + TypeScript + Vite**: נבדקו ברמת התאמה React מול Vue ומול Vanilla TypeScript; Vite מול Parcel ו-Rsbuild. משחק קטן יכול להיכתב גם ללא Framework, אך React מספק מודל רכיבים ברור ו-State עקבי למערכת AI ולתחזוקה עתידית. Vite מספק Build סטטי מהיר ותיעוד רשמי ל-GitHub Pages, ללא מורכבות Full-stack. אין הצדקה ל-Next.js או SSR. React מתעד במפורש שימוש ב-Vite להקמת אפליקציה מהיסוד. [1][2]
- **CSS רגיל**: נבחן לעומת Tailwind CSS וספריות רכיבים; למסך משחק מעוצב עם לוח מעגלי ומסך אודות, CSS רגיל מפחית Dependencies ומאפשר שליטה מדויקת במגע ובאנימציות.
- **`useReducer`**: נבחר לעומת `useState` מפוזר ו-Zustand/Redux. מצב המשחק קטן אך בעל מעברים רגישים למרוץ אירועים; Reducer מרכזי מאפשר פעולות חוקיות בלבד ואינו מוסיף תלות.
- **Web Audio API**: נבחר לעומת קובצי MP3 ומול Tone.js. הצלילים פשוטים, ולכן Oscillators מקומיים מספיקים, אינם מצריכים הורדות אודיו ומאפשרים Offline. יש לכבד מדיניות Autoplay ולפתוח/לחדש `AudioContext` מתוך פעולת המשתמש. [3]
- **vite-plugin-pwa + Workbox**: נבחר לעומת כתיבת Service Worker ידנית ופתרון PWA ללא Precache. `generateSW` מתאים ל-SPA סטטי ללא בקשות API. [4]
- **GitHub Pages**: נבחר על פני Vercel ו-Cloudflare Pages עבור אתר סטטי; הוא עומד בהעדפה ב-PRD להימנע משרת ומאפשר Deployment מ-GitHub Actions, לרוב ללא עלות לפרויקט זעיר בכפוף לתוכנית ולמגבלות השירות. [2][5][6]

### סיכונים ומגבלות

- **אודיו במובייל:** דפדפנים עשויים לחסום צליל עד Gesture; לחצני "התחל משחק" ו-"המשך משחק" הם נקודות ההפעלה המורשות. גם לאחר מכן יכולות להיות הפרעות עקב מצב שקט של הטלפון, מגבלות מערכת ההפעלה או השהיית דפדפן. אין להציג מצב שבו לוגיקת המשחק מתקדמת כשהשמעת הצלילים לא הוכנה כראוי. [3]
- **PWA:** התקנה משתנה לפי דפדפן ומערכת הפעלה; מצב Offline יתאפשר רק לאחר התקנה/טעינה מוצלחת של ה-Precache. ייתכן שהמערכת תסיר Cache או נתוני אתר מחוסר מקום, לפי מדיניותה. [4]
- **Local Storage:** ניתן למחוק אותו בניקוי נתוני דפדפן, בהחלפת דפדפן/מכשיר או במצב גלישה פרטי; הוא אינו מסונכרן. הכתיבה עשויה להיכשל או להיות חסומה, ויש לטפל בכך בלי לחסום משחק.
- **GitHub Pages:** מספק קבצים סטטיים בלבד; מגבלות השירות כוללות אתר מפורסם עד 1GB ומגבלת תעבורה רכה של 100GB בחודש, שאינן צפויות להשפיע על משחק קטן. יש לוודא התאמה לתנאי השימוש אם אופיו המסחרי של הפרויקט משתנה. [6]
- **עדכוני PWA:** רענון אוטומטי בעת החלפת Service Worker עלול למחוק משחק פעיל, ולכן אין לאפשר לעדכון לגרום לרענון לא מתוכנן.

## 2. ארכיטקטורת המערכת

### 2.1 מבט-על

האפליקציה היא **Single-Page Application (SPA)** סטטית, המורצת כולה בדפדפן:

```text
GitHub Repository
    └── GitHub Actions: install → typecheck/test → build → deploy
                                  │
                                  ▼
                         GitHub Pages (HTTPS)
                                  │ טעינת קבצים סטטיים
                                  ▼
                  Browser / Installed Mobile PWA
                  ├── App Shell + Navigation (בית / אודות)
                  ├── Game Engine (Reducer + sequence controller)
                  │   ├── Sequence Playback + Visual Highlights
                  │   └── Sound Engine (Web Audio API)
                  ├── Results History ↔ localStorage
                  └── Service Worker ↔ Precache (Offline)
```

- אין קריאות API למערכת חיצונית, ואין ניהול זהויות משתמשים.
- משחק פעיל נשמר ב-Memory בלבד כל עוד מסמך הדפדפן חי; אין Persistence של המשחק ב-`localStorage`.
- המסכים הם שתי תצוגות בתוך אותו React Tree, ולא Navigation הגורם לטעינת דף חדש. בחירה זו שומרת משחק פעיל ללא Router חיצוני ומקלה על GitHub Pages.
- ניווט לאודות אינו מבצע Unmount של בעל ה-State המרכזי; מסך האודות יכול להחליף את תצוגת המשחק, בעוד מצב המנוע נשמר.

### 2.2 Modules ואחריות

| Module | אחריות |
|---|---|
| **App Shell / Navigation** | בחירה בין בית ואודות, RTL ועקביות ממשק; קריאה להשהיית משחק לפני מעבר לאודות |
| **Game Engine** | יצירת רצף אקראי, עד 10 שלבים, אימות קלט, ספירת השלבים שהושלמו וקביעת ניצחון/הפסד |
| **Game State / Reducer** | מקור אמת יחיד למצבים `idle`, `presenting`, `awaitingInput`, `paused`, `won`, `lost`; הגבלת Actions לפי מצב |
| **Sequence Controller** | הצגת צבעים בזה אחר זה בקצב קבוע, עם אפשרות לביטול מיידי של Playback בעת השהיה/ניווט/סיום |
| **Audio Engine** | ניהול `AudioContext`, יצירת צליל ייחודי לכל צבע, צלילי סיום, עצירת צלילים פעילים |
| **Game UI** | לוח ארבעת הרבעים המעגלי, חיווי שלב, לחצני "התחל משחק"/"המשך משחק", ו-"אישור" בהודעת התוצאה |
| **History Repository** | קריאה/כתיבה ל-`localStorage`, שמירת 10 רשומות לכל היותר, מחיקה מאושרת וטיפול בכשל |
| **About UI** | הוראות המשחק, היסטוריית משחקים ומחיקה באמצעות חלון אישור |
| **PWA Layer** | Manifest, Registration של Service Worker, Precache ועידכון גרסה שאינו קוטע משחק |
| **Visibility Handler** | תגובה ל-`visibilitychange`/`pagehide` והעברה למצב השהיה ללא חידוש אוטומטי |

### 2.3 מודל מצב המשחק

```text
idle ── "התחל משחק" ──> presenting ── סוף רצף ──> awaitingInput
                           ▲                         │
                           │       כל הרצף נכון       │
                           └──── שלב הבא (עד 10) ─────┘
                                                     │
                                    טעות ──> lost
                                    השלמת שלב 10 ──> won

presenting / awaitingInput ── הסתרה/אודות ──> paused
paused ── "המשך משחק" ──> presenting (אותו שלב, רצף מלא)
won / lost ── "אישור" ──> idle (ואז "התחל משחק" פותח שלב 1 חדש)
```

**כללי עבודה מחייבים:**

1. בתחילת משחק לא נשמרת רשומה בהיסטוריה; נוצר רצף חדש של צבע יחיד, וכל שלב מוצלח מוסיף צבע אקראי אחד. להשתמש ב-`Math.random()` לבחירת אינדקס 0–3; זהו רנדום למשחק בלבד, ללא צורך ב-RNG קריפטוגרפי. מותר צבע חוזר ברצף.
2. לשמור `sequence`, `round` (1–10), `inputIndex` ו-`completedRounds`. במצב פעיל, `completedRounds = round - 1`; ברגע שהשחקן מסיים שלב בהצלחה, לעדכן את המונה לפני מעבר לשלב הבא. שגיאה בשלב 1 מייצרת `completedRounds = 0`; ניצחון לאחר שלב 10 מייצר `10`.
3. בזמן `presenting` ובמצב `paused`, קלט צבע אינו מתקבל. ב-`awaitingInput` לחיצה נכונה מקדמת את `inputIndex` בלבד; לחיצה שגויה מסיימת מיד. אין Timeout של קלט.
4. ה-Reducer אינו מפעיל אודיו או `localStorage` בעצמו. Side Effects מנוהלים ב-Controllers/React Effects, לפי שינויי מצב, על מנת להישאר ניתנים לבדיקות ולא ליצור כתיבות כפולות.
5. `Sequence Controller` מקבל Cancellation Token / `AbortController` ומונע Async callbacks ישנים מלשנות מצב לאחר השהיה, סיום או ניווט. חובה לבטל Timers וצלילים פעילים מיידית. יש לשמור רישום של פעולות שכבר בוטלו ולהתעלם מסיומי Playback מיושנים.
6. בהשהיה, **הרצף שנוצר אינו משתנה**, וכל קלט חלקי לשלב הנוכחי נזרק. בלחיצה על "המשך משחק", הרצף הקיים מושמע ומואר מחדש מתחילתו, ולאחר מכן השחקן משחזר אותו מחדש.
7. אם המשתמש הסתיר את האתר או עבר למסך אודות, עם חזרתו אין Resume אוטומטי. אם המשחק לא פעיל (טרם התחיל / הסתיים), לא מוצג כפתור "המשך משחק".
8. משחק מסוים נרשם **פעם אחת בלבד** כאשר נכנס ל-`won` או `lost`, בלי לרשום משחק שהושהה, בוטל, נסגר או עבר Refresh. יש להשתמש במזהה משחק פנימי/Guard לכתיבה פעם אחת, כולל תחת React Strict Mode בפיתוח.
9. Refresh מאתחל מצב `idle` ומבטל משחק פעיל; היסטוריית משחקים נשמרת ללא שינוי.

### 2.4 קצב הצגה, מגע ואודיו

- הגדרת משך הארה ומשך הפסקה כקבועי Configuration משותפים לכל השלבים, ללא האצה; הערכים המדויקים מוגדרים בטבלת "קצב הצגת הרצף" ב-`DESIGN.md` (סעיף 1.1).
- בעת Playback, להפעיל Highlight של רבע אחד וצלילו, לכבותו, להמתין הפסקה ולחזור; לוודא שהשמע נעצר גם אם פקע או בוטל Timer.
- יישום הלוח באמצעות ארבעה רכיבי `button` סמנטיים המחולקים גאומטרית לרבעי מעגל; ניתן להשתמש ב-CSS Grid/clip-path או SVG עם אזורי Hit ייעודיים, אך נדרשים Target מגע מספק, Feedback ברור ואיסור בחירת טקסט / Double-tap בעייתי.
- כל רבע חייב להיות מזוהה באמצעות Accessible Name בעברית, גם כאשר הצבע מוצג חזותית בלבד; תגובת הלחיצה תציג Highlight ותשמיע את צליל הרבע. צבע לא יהיה חיווי יחיד למצב המשחק.
- `AudioContext` ייווצר או יחודש במסגרת Gesture של "התחל משחק" ו-"המשך משחק". צלילי המשחק יופקו מתוך Oscillators/GainNode עם Envelope קצר למניעת קליקים; ארבעה גבהי צליל שונים, ושני מוטיבים ייחודיים לסיום. אם `resume()` נכשל, לא להתחיל רצף שקט ולהמשיך כאילו הושמע; להציג הודעה קצרה בעברית ולאפשר ניסיון חוזר מתוך Gesture.
- בעת `visibilitychange` ל-`hidden` וגם לפני ניווט פנימי לאודות, להפסיק השמעה והארה ולהשהות. ניתן להאזין גם ל-`pagehide` כ-Safety Net; סגירת דף או Refresh אינם צריכים לשמור מצב. אירועי רקע אינם מהווים תוצאת הפסד. [3][7]
- קונפטי מופעל פעם אחת בכניסה למצב `won`, נעצר ומנוקה ביציאה מהמצב; אינו מופעל בהפסד. תמיכה ב-`prefers-reduced-motion` להפחתת אנימציה מטעמי נגישות, בלי לשנות את חוקי המשחק.

### 2.5 Data Model ואחסון

**Game Session – Memory בלבד**

| שדה | טיפוס / משמעות |
|---|---|
| `status` | אחד ממצבי המשחק שפורטו |
| `sequence` | מערך ערכים מתוך `blue`, `red`, `yellow`, `green`, באורך 1–10 |
| `round` | שלב נוכחי, 1–10 |
| `inputIndex` | אינדקס הלחיצה הבאה בשלב הנוכחי |
| `completedRounds` | מספר השלבים שהושלמו בהצלחה, 0–10 |
| `gameId` | מזהה פנימי חד-פעמי למניעת שמירת תוצאה כפולה |

**Game Result – Local Storage**

```ts
type GameResult = {
  id: string;             // מזהה מקומי
  finishedAt: string;     // ISO 8601, כולל זמן מלא
  completedRounds: number;// מספר שלבים שהושלמו: 0–10
  outcome: 'win' | 'loss';
};

type HistoryData = {
  schemaVersion: 1;
  results: GameResult[];  // לכל היותר 10, מהחדש לישן
};
```

- מפתח אחסון יחיד, בעל Namespace וגרסה, למשל `simon.history.v1`. פורמט ה-JSON צריך לעבור Validation בעת קריאה; תאריך ושעה יוצגו לפי Locale עברי וזמן מקומי של המכשיר, ולא יישמרו כמחרוזת תצוגה.
- עם סיום משחק, להוסיף את הרשומה בראש המערך ולשמור רק את עשר הראשונות. מחיקה מאושרת מאפסת את הרשומות באותו מפתח; ביטול לא משנה דבר.
- אם `localStorage` אינו זמין או JSON פגום, לא לקרוס: להציג הודעה בעברית על אי-זמינות ההיסטוריה או כישלון השמירה/מחיקה לפי המקרה, ולהמשיך לאפשר משחק. אין לטשטש כישלון מחיקה כאילו הצליח.
- `localStorage` אינו מכיל את מצב המשחק, פרטים מזהים, נתוני התחברות או נתונים אישיים שנאספים במפורש.

### 2.6 זרימות נתונים מרכזיות

**תחילת משחק:** `UI "התחל משחק"` → פתיחה/חידוש `AudioContext` → `Game Engine` מייצר רצף ראשון → `presenting` → `Sequence Controller` מפעיל הארה + אודיו → `awaitingInput`.

**לחיצת צבע:** `Touch/Click` → `Game Engine` משווה ל-`sequence[inputIndex]` → אם נכון: משוב לחיצה וקידום אינדקס; אם הסתיים רצף: יצירת תוספת רנדומלית ומעבר לשלב הבא, או ניצחון בשלב 10; אם שגוי: הפסד מיידי → השמעת צליל סיום → שמירת `GameResult` יחידה.

**השהיה וחזרה:** `Navigation / visibilitychange` → ביטול טיימרים וצלילים, `paused` והשלכת קלט חלקי → חזרה לבית → `"המשך משחק"` → Gesture אודיו → הצגה מחדש של הרצף הקיים בשלמותו.

**אודות:** `History Repository` קורא מ-`localStorage` → מציג תיאור, הוראות ותוצאות בסדר יורד; `"מחק היסטוריה"` → אישור → ניסיון מחיקה → עדכון תצוגה או הודעת כשל.

### 2.7 PWA, Offline ועדכונים

- להגדיר ב-Manifest לפחות `name` ו-`short_name` באנגלית (`Simon`, לפי בקשת המשתמש; כותרת המסך בתוך האפליקציה נשארת **"סיימון"**), `id` מפורש, `lang: "he"`, `dir: "rtl"`, אייקונים מתאימים להתקנה (`192x192`, `512x512`, כולל Maskable אם נדרש; Claude מייצר אותם לפי הגדרת ה-App Icon ב-`DESIGN.md`, מקובץ SVG מקור אחד שנשמר בפרויקט), `display: "standalone"`, `start_url` ו-`scope` התואמים לנתיב הפריסה בפועל.
- להגדיר `vite-plugin-pwa` עם `strategies: "generateSW"` ו-Precache של HTML, JavaScript, CSS, אייקונים וכל משאב סטטי הדרוש לאפליקציה. אין תלות בפונטים, קובצי Audio או Scripts מ-CDN חיצוני; קובצי הגופן Heebo (`@fontsource/heebo`, רק המשקלים שבשימוש: Regular, Semibold, Bold) נכללים ב-Precache. להשתמש ב-Fallback ל-SPA בתוך ה-Scope של האפליקציה בלבד.
- להגדיר **`registerType: "prompt"`**, ולא `autoUpdate`: כאשר יש עדכון, ניתן להציג בקשת עדכון בעברית רק כשהמשחק אינו פעיל; במהלך משחק פעיל לדחות הצעה/הפעלה שתגרום ל-Reload. אין להפעיל `skipWaiting` בצורה שקוטעת Session פעיל. לאחר אישור עדכון, Refresh רשאי להתחיל משחק חדש בהתאם ל-PRD. [8]
- יש לבדוק טעינה מלאה Online לפחות פעם אחת; לאחר שה-Service Worker ו-Precache התקינו בהצלחה, לנתק רשת ולוודא ששני המסכים, הצלילים, המשחק וההיסטוריה פועלים. Offline אינו מובטח לפני השלמת Cache או אחרי ניקוי נתוני אתר.
- אין להשתמש ב-Background Sync, Push Notifications או Cache דינמי של API: אין להם שימוש במוצר זה.

### 2.8 אבטחה ופרטיות

- אין Authentication או Authorization, מכיוון שאין חשבונות או משאבי שרת פרטיים.
- לשמור היסטוריית משחקים מקומית בלבד; אין שליחת תוצאות לצד שלישי. הנתונים אינם מוצפנים במפורש ב-Local Storage ולכן אין לשמור שם סודות.
- לפרוס באמצעות HTTPS של GitHub Pages, הדרוש להפעלת Service Worker מחוץ ל-`localhost`.
- להגביל Dependencies למעטות הנחוצות, להחזיק Lockfile ב-Repository ולהריץ בדיקות Dependency Security ב-CI לפי הצורך. לא להכניס Tokens או Credentials לקוד Client.
- לא לרנדר HTML בלתי מהימן או להשתמש ב-`dangerouslySetInnerHTML` להצגת נתוני `localStorage`.

### 2.9 GitHub, Hosting, Build ו-Deployment

**מקור הקוד:** Git Repository ב-GitHub, ענף `main` משמש מקור לגרסת Production. התוצר הוא אתר סטטי בלבד. אין צורך ב-Supabase, ב-Migrations או בפרטי גישה למסד נתונים.

**פיתוח מקומי:** Node.js בגרסת LTS התואמת ל-Vite ול-`vite-plugin-pwa` שנבחרו, npm עם Lockfile; `npm ci`, `npm run dev`, `npm run build` ו-`npm run test`. כתובת Development מקומית נדרשת רק להצגת ממשק ובדיקות; אין שירות ענן לפיתוח.

**Pipeline אוטומטי:**

1. Push ל-`main` מפעיל GitHub Actions.
2. `checkout` → `setup-node` בגרסת LTS תואמת → `npm ci` → TypeScript typecheck → בדיקות אוטומטיות → `npm run build`.
3. ה-Build מייצר `dist/`, כולל Manifest ו-Service Worker.
4. Actions מעלה את `dist/` כ-Pages Artifact ומפרסם ל-GitHub Pages (`actions/upload-pages-artifact`, `actions/deploy-pages`). יש להגדיר ב-Repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. יש להעניק ל-Workflow הרשאות מינימליות הדרושות לפריסה: `contents: read`, `pages: write`, `id-token: write`. Build שנכשל לא נפרס.

**נתיב פריסה:**

- ה-Repository של הפרויקט נקרא `Simon` ויושב בחשבון ה-GitHub של המשתמש, `https://github.com/<user>/Simon` (את `<user>` קח מכתובת ה-remote של ה-repo המקומי), ולכן כתובת ה-Production היא `https://<user>.github.io/Simon/` ויש לקבוע `base: "/Simon/"` ב-Vite. הנתיב **רגיש לאותיות גדולות וקטנות** – `Simon` ב-S גדולה, בדיוק כשם ה-Repository.
- GitHub Pages בחשבון GitHub Free זמין ל-Repository **ציבורי** בלבד. לפני פריסה ראשונה יש לוודא שה-Repository ציבורי (Settings → General → Danger Zone → Change visibility), או שהחשבון בתוכנית בתשלום.
- באופן כללי, לפרויקט המתארח ב-`https://<user>.github.io/<repo>/` קובעים `base: "/<repo>/"` ב-Vite. התאמה מקבילה של `start_url`, `scope`, קישורי Assets ו-Service Worker Scope; לא להשתמש בנתיבים מוחלטים ל-`/` שמדלגים על שם ה-Repository.
- לאתר Root או Custom Domain הנתיב עשוי להיות `/`. יש להגדיר אותו לפי כתובת ה-Production האמיתית. [2]
- מכיוון שמדובר בשני מסכים פנימיים ב-SPA, אין צורך ב-History Router או בשרת Rewrite להפעלת `/about`; כך נמנעת בעיית Deep Link ב-GitHub Pages.

**עלויות:** ב-GitHub Free, GitHub Pages ו-GitHub Actions לפרויקט סטטי קטן צפויים להספיק ללא עלות שימוש שוטפת במסגרת התנאים והמכסות. חשבון פרטי/Repository פרטי, חריגה מתנאי שימוש או שימוש מסחרי עלולים לשנות זכאות או עלויות; יש לבדוק את מצב החשבון והמדיניות לפני ההשקה. [5][6][9]

### 2.10 בדיקות ארכיטקטוניות חיוניות

- רצף באורך 1–10, הוספת צבע אחד בלבד לכל שלב, כולל חזרות אקראיות על אותו צבע.
- לחיצה שגויה בשלב 1 שומרת 0; שחזור נכון של שלב 10 שומר 10 וניצחון; שמירה מתרחשת פעם אחת בלבד.
- לחיצה בזמן `presenting` / `paused` אינה משנה את המשחק; לחיצות בזמן `awaitingInput` נבדקות לפי הסדר וללא Timeout.
- השהיה באמצע Playback ובאמצע קלט מבטלת פעולות מתוזמנות ישנות; חידוש ידני חוזר על אותו רצף מתחילתו ולא משנה שלב.
- מעבר לאודות או רקע וחזרה משמרים Session חי; Refresh או סגירה מאפסים Session פעיל ולא רושמים תוצאה.
- היסטוריה מוגבלת לעשר רשומות ומוצגת מהחדש לישן; מחיקה מותנית באישור וכשל Storage אינו מונע משחק.
- PWA מותקן/נטען ב-HTTPS, עובד Offline לאחר Precache; בדיקת מסכי הבית והאודות, אודיו ואייקונים גם במצב Offline.
- עדכון Service Worker אינו כופה Reload בזמן משחק פעיל; נתיבי Assets ו-Scope פועלים מתחת לתת-נתיב GitHub Pages.
- בדיקות מגע והתנהגות אודיו במכשירי מובייל אמיתיים, לרבות חזרה מנעילת מסך ומעבר לאפליקציה אחרת.

## מקורות רשמיים ותיעוד תומך

1. [React – Build a React app from Scratch](https://react.dev/learn/build-a-react-app-from-scratch) – Vite ופתרונות Build נפוצים.
2. [Vite – Deploying a Static Site](https://vite.dev/guide/static-deploy.html) – פריסה ל-GitHub Pages ו-`base`.
3. [MDN – Web Audio API Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) – הפעלת אודיו תחת Autoplay Policy.
4. [vite-plugin-pwa – GitHub repository](https://github.com/vite-pwa/vite-plugin-pwa) – תמיכה ב-Offline, Manifest ו-Service Worker.
5. [GitHub – Pricing](https://github.com/pricing) – תמחור ומכסות של GitHub.
6. [GitHub Docs – GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) – מגבלות Hosting.
7. [MDN – Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) – אירועי הסתרה וחזרה של אפליקציה.
8. [Vite PWA – Prompt for Update](https://vite-pwa-org.netlify.app/guide/prompt-for-update) – שליטה בעדכוני Service Worker ללא רענון אוטומטי.
9. [GitHub Docs – GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) – מכסות וחיוב Actions.

## החלטות מרכזיות (ADRs)

### ADR-1: לוח ה-Simon כ-CSS Grid עם ארבעה כפתורי `button`
**הקשר:** סעיף 2.4 מתיר CSS Grid/clip-path או SVG ללוח. נדרשים כפתורים סמנטיים ונגישים, אזור מגע מלא לכל רבע, וסידור צבעים מרחבי שאינו מתהפך ב-RTL.
**החלטה:** הלוח הוא מיכל עגול עם CSS Grid בגודל 2×2; כל רבע הוא `<button>` עם `aria-label` בעברית ופינה חיצונית מעוגלת (רבע עיגול), ופסי ההפרדה הם ה-`gap` של הגריד. המיכל מוגדר `direction: ltr` ומיקום כל רבע נקבע ב-`grid-area` מפורש לפי `src/game/colors.ts`. הדיסק המרכזי הוא שכבה דקורטיבית ללא קלט.
**השלכות:** אין צורך בגיאומטריית SVG או בחישובי Hit-test; מצבי Glow ועמעום יתווספו ב-CSS בלבד. ה-Hit area של כל רבע הוא הריבוע שלו בגריד מינוס הפינה המעוגלת; האזור שמתחת לדיסק המרכזי אינו לחיץ.

### ADR-2: קלט הלוח ב-`pointerdown` ורנדום מחוץ ל-Reducer
**הקשר:** במובייל אירוע `click` מגיע רק אחרי הרמת האצבע, ולכן הצליל וההארה מתעכבים, ולחיצה ארוכה לא משמיעה צליל עד השחרור. נוסף על כך, ה-Reducer צריך להישאר טהור (React Strict Mode מריץ אותו פעמיים) וקל לבדיקה.
**החלטה:** שיפוט הלחיצה, הצליל וההארה מתחילים ב-`pointerdown`. ההארה והצליל נמשכים כל עוד האצבע לוחצת, ולפחות `300ms`; השחרור נקלט גם ב-`window`, כי הרבע עלול להפוך ל-`disabled` לפני השחרור. מקלדת (Enter/Space) נתמכת לנגישות. הצבע האקראי נוצר ב-Hook (`src/game/random.ts`) ומועבר ל-Reducer בתוך ה-Action (`firstColor`, `nextColor`). מצב המשחק מנוהל ב-`useGame` שנמצא ב-`App`, כדי שמעבר מסכים לא יפרק אותו.
**השלכות:** אין עיכוב קלט במגע. ה-Reducer דטרמיניסטי ונבדק בלי Mocks. בבדיקות אינטגרציה מחליפים את `random.ts`, ומפעילים אירועים עם `fireEvent` הסינכרוני ו-Fake Timers.

### ADR-3: השהיה כמצב `paused` ב-Reducer, וחידוש כהצגה חדשה
**הקשר:** מעבר ל"אודות", הסתרת האפליקציה או נעילת הטלפון צריכים לעצור מיד הארה, צליל ו-Timers, לשמור את השלב בזיכרון, ולא לחדש אוטומטית. Callbacks של הצגה שבוטלה אסור שישנו את המצב.
**החלטה:** ה-Action `pause` (רק מ-`presenting`/`awaitingInput`) מעביר ל-`paused`, מאפס את `inputIndex` ומעלה את `presentationId`, כך שסיום Playback מיושן מתעלם. `resume` (רק מ-`paused`) הוא כניסה רגילה ל-`presenting` עם `presentationId` חדש, אותו רצף ואותו שלב, ונשלח רק אחרי `unlockAudio()` מוצלח מתוך הלחיצה על "המשך משחק" (בכשל נשארים מושהים עם הודעה). ניווט ל"אודות", `visibilitychange` ל-`hidden` ו-`pagehide` קוראים כולם לאותה פונקציית `pause` ב-`useGame`; חזרה ל-`visible` לא עושה דבר. משחק שהסתיים (`won`/`lost`) או לא התחיל אינו מושפע.
**השלכות:** מנגנון ביטול אחד (`AbortController` + `presentationId`) משרת השהיה, סיום ומעבר שלב. Action `abandon` הזמני של Milestone 2 הוסר. מצב מושהה חי בזיכרון בלבד, ולכן Refresh מאפס אותו.

### ADR-4: היסטוריה – Repository טהור ו-Hook ב-`App`, שמירה עם Guard לפי `gameId`
**הקשר:** כל משחק שהסתיים צריך להישמר פעם אחת בלבד (גם ב-React Strict Mode, שמריץ Effects פעמיים), ה-Reducer אסור שייגע באחסון, מסך "אודות" צריך להציג מיד תוצאה חדשה, וכשל ב-`localStorage` אסור שיחסום משחק או ייראה כהצלחה.
**החלטה:** `src/history/historyStorage.ts` הוא מודול טהור (ללא React) שקורא, מאמת וכותב את `simon.history.v1`, וכל גישה ל-`localStorage` עטופה ב-`try/catch`. רשומות לא תקינות מסוננות; נתונים שלא ניתן לקרוא מדווחים כשגיאה, והשמירה הבאה כותבת רשימה תקינה חדשה. `useHistory` מוחזק ב-`App` ושומר את הרשימה ואת מצבי הכשל (טעינה, שמירה, מחיקה). Effect ב-`App` רושם תוצאה בכניסה ל-`won`/`lost`, עם `ref` שזוכר את ה-`gameId` האחרון שנרשם. מזהה הרשומה נוצר מזמן ומספר אקראי, ולא מ-`crypto.randomUUID`, שאינו זמין בכתובת HTTP לא מאובטחת.
**השלכות:** לוגיקת האחסון נבדקת בלי React. הרישום מתבצע מיד בסיום המשחק, ולא אחרי השהיית הצגת ההודעה, כך שמעבר מסכים מהיר לא מאבד תוצאה. כשל שמירה מוצג בחלונית הסיום, וכשל טעינה או מחיקה מוצג במסך "אודות"; במחיקה שנכשלה הרשימה נשארת על המסך.

### ADR-5: "אישור" בהודעת הסיום מחזיר ל-`idle`
**הקשר:** לפי בקשת המשתמש, הודעת הניצחון/ההפסד מכילה "אישור" במקום "שחק שוב", והלחיצה רק סוגרת את ההודעה ומחזירה למסך הבית עם "התחל משחק".
**החלטה:** Action חדש `dismiss` (רק מ-`won`/`lost`) מחזיר ל-`initialGameState`, תוך שמירת `gameId` ו-`presentationId`, כך שהמשחק הבא מקבל `gameId` חדש וה-Guard של שמירת ההיסטוריה ממשיך לעבוד. "אישור" אינו Gesture אודיו; `AudioContext` נפתח רק ב-"התחל משחק" ו-"המשך משחק".
**השלכות:** אין יותר התחלת משחק ישירות ממצב סיום; היציאה מ-`won` מנקה את הקונפטי דרך ה-Cleanup הקיים. התוצאה נשמרת כבר בכניסה ל-`won`/`lost`, ולכן "אישור" אינו משפיע על ההיסטוריה.

### ADR-6: עדכון גרסה ללא חלונית וללא Reload
**הקשר:** §2.7 מחייב שעדכון Service Worker לא ירענן או יקטע משחק פעיל, ומתיר (אך אינו מחייב) בקשת עדכון בעברית. ל-`DESIGN.md` אין עיצוב לחלונית כזו.
**החלטה:** `registerType: "prompt"` עם `injectRegister: false`; הרישום ב-`src/main.tsx` דרך `registerSW({ immediate: true })` בלי `onNeedRefresh`. אין `skipWaiting` ואין `clientsClaim`. גרסה חדשה מותקנת ברקע וממתינה (`waiting`) עד שכל חלונות האפליקציה נסגרים.
**השלכות:** משחק פעיל לעולם אינו נקטע בגלל עדכון. גרסה חדשה נכנסת לתוקף רק בפתיחה הבאה לאחר סגירה מלאה, ולא מוצגת הודעת "גרסה חדשה"; הוספת הודעה כזו היא שינוי עיצוב שדורש אישור.

### ADR-7: אייקונים ממקור SVG יחיד, נוצרים פעם אחת ונשמרים ב-Repository
**הקשר:** `DESIGN.md` §2.4 מגדיר App Icon ש-Claude יוצר; ה-Manifest צריך PNG בגדלים 192 ו-512, Maskable ו-Favicon.
**החלטה:** `public/icon.svg` נכתב ידנית (לוח בקוטר ~78% מהקנבס, בתוך ה-Safe Zone של Maskable, על רקע `#0A1628`). הקבצים `pwa-64/192/512`, `maskable-icon-512x512`, `apple-touch-icon-180x180` ו-`favicon.ico` נוצרים ממנו ב-`npm run generate-pwa-assets` (`@vite-pwa/assets-generator`, תצורה ב-`pwa-assets.config.ts`) ונשמרים ב-`public/`.
**השלכות:** ה-CI אינו תלוי בכלי ההמרה. שינוי באייקון = עריכת ה-SVG והרצת הסקריפט מחדש.

### ADR-8: `base: "/Simon/"` בכל הסביבות
**הקשר:** האתר נפרס תחת `https://<user>.github.io/Simon/`, ובעיות נתיב (404 לנכסים, Scope של Service Worker) מתגלות בדרך כלל רק בפריסה.
**החלטה:** `base: '/Simon/'` ב-`vite.config.ts` גם ב-dev וגם ב-preview; `start_url` ו-`scope` של ה-Manifest נגזרים מאותו קבוע. ה-Workflow `.github/workflows/deploy.yml` מריץ typecheck, בדיקות ו-Build לפני פריסה ל-Pages.
**השלכות:** הכתובת המקומית היא `http://localhost:5173/Simon/` (dev) ו-`http://localhost:4173/Simon/` (preview). אם ה-Repository ישנה שם או יעבור ל-Custom Domain, יש לעדכן את הקבוע.

### ADR-9: שם התקנה `Simon` ו-`id` מפורש ב-Manifest
**הקשר:** ב-Chrome לאנדרואיד הופיעה הודעה שהאפליקציה "כבר מותקנת" למרות שלא הותקנה, ופתיחתה נכשלה ("Could not open app"), גם אחרי ניקוי נתוני האתר. ללא `id`, הדפדפן מזהה את האפליקציה לפי `start_url`, ולכן רישום התקנה ישן ושגוי במכשיר נצמד לאותה כתובת. המשתמש ביקש גם ששם האפליקציה המותקנת יהיה באנגלית.
**החלטה:** הוספת `id: '/Simon/app'` ל-Manifest, ושינוי `name`/`short_name` ל-`Simon`. כותרת המסך ו-`<title>` נשארים "סיימון".
**השלכות:** הדפדפן רואה את האפליקציה כזהות חדשה ומתעלם מרישום ישן. אסור לשנות את ה-`id` בעתיד, אחרת התקנות קיימות ייחשבו לאפליקציה אחרת.
