# תוכנית – Milestone 4: היסטוריית משחקים ומחיקה מאושרת

> מקורות: `MILESTONES.md` (Milestone 4); `PRD.md` §3ב ("סיום משחק" סעיף 4, "צפייה בהיסטוריה ומחיקתה"), §4.4, §4.5, §4ב (יציאה בשנייה שלפני ההודעה, כישלון בשלב 1, Refresh, היסטוריה ריקה, מגבלת ההיסטוריה, ביטול מחיקה, אחסון חסום); `DESIGN.md` §1.2, §1.3, §2.1–§2.5; `ARCHITECTURE.md` §2.2 (History Repository, About UI), §2.3 כללים 4, 8, 9, §2.5 (Game Result, HistoryData), §2.6 ("אודות"), §2.10, ADR-4, ADR-5, ADR-10, ADR-12; התמונות `wireframes.png` ו-`mockups.png` (לוחות "אודות" ו"אודות – אישור מחיקה"), `style-guide.png` (History List Item, Confirmation Dialog, Secondary Button).
> באבן דרך זו **אין** PWA (Milestone 5). אין תלויות חדשות: `localStorage` ו-`Intl.DateTimeFormat` מובנים בדפדפן.

## 0. מה משתנה בקצרה

- מודול טהור חדש `historyStorage.ts` קורא, מאמת, כותב ומוחק את המפתח `simon.history.v1` ב-`localStorage`. כל גישה עטופה ב-`try/catch`; הוא לעולם לא זורק שגיאה (ADR-4).
- Hook חדש `useHistory` מוחזק ב-`App` (כמו `useGame`), ומחזיק את הרשימה ואת מצבי הכשל.
- Effect ב-`App` רושם את התוצאה **מיד** בכניסה ל-`won`/`lost` (הלחיצה המכריעה, ADR-10), פעם אחת לכל `gameId`, עם `ref` שזוכר את ה-`gameId` האחרון שנרשם – גם ב-React Strict Mode.
- מסך "אודות" מציג כרטיסי תוצאות (מהחדש לישן), חיווי ריק, כפתור "מחק היסטוריה" (רק כשיש רשומות) ו-Dialog אישור עם "ביטול" ו"מחק".
- כשל שמירה מוצג בהודעת הסיום; כשל טעינה או מחיקה מוצג במסך "אודות". המשחק ממשיך לעבוד בכל מקרה.
- ה-Reducer **אינו משתנה** (ARCHITECTURE §2.3 כלל 4: אין בו גישה לאחסון). גם `useGame` אינו משתנה.

## 1. קבצים

```text
src/
  history/
    historyStorage.ts        # NEW – pure repository: load / add / clear, validation, max 10
    historyStorage.test.ts   # NEW – unit tests without React
    useHistory.ts            # NEW – React hook held in App: results + error flags
    formatFinishedAt.ts      # NEW – ISO string -> { date: "30.10.2026", time: "14:32" } (he-IL, local time)
  components/
    HistoryCard.tsx / .css   # NEW – one result card
    ConfirmDialog.tsx / .css # NEW – scrim + light dialog "למחוק את ההיסטוריה?"
    EndDialog.tsx / .css     # + optional save-failure line
  screens/
    AboutScreen.tsx / .css   # list, empty state, "מחק היסטוריה", dialog, error messages
    HomeScreen.tsx           # passes the save-failure flag to EndDialog
  App.tsx                    # useHistory + record-once effect; passes history to About
  App.history.test.tsx       # NEW – integration tests for history
  test/
    setup.ts                 # localStorage.clear() + vi.restoreAllMocks() after every test
    gameTestUtils.ts         # NEW – helpers moved out of App.game.test.tsx (pad, press, readSequence, playRounds…)
  App.game.test.tsx          # imports the shared helpers; tests themselves unchanged
```

`gameReducer.ts`, `useGame.ts`, `SimonBoard`, `BottomNav`, `audio.ts` ו-`timing.ts` – ללא שינוי.

## 2. ה-Repository – `src/history/historyStorage.ts`

### 2.1 טיפוסים (לפי ARCHITECTURE §2.5)

```ts
export type GameResult = {
  id: string;              // local id: `${Date.now()}-${random base36}` (no crypto.randomUUID, ADR-4)
  finishedAt: string;      // ISO 8601
  completedRounds: number; // integer 0–10
  outcome: 'win' | 'loss';
};

type HistoryData = { schemaVersion: 1; results: GameResult[] };

export const HISTORY_KEY = 'simon.history.v1';
export const MAX_HISTORY = 10;

export type LoadResult = { ok: true; results: GameResult[] } | { ok: false };
```

### 2.2 פונקציות

| פונקציה | התנהגות |
|---|---|
| `loadHistory(): LoadResult` | `getItem` → אם `null`: `{ ok: true, results: [] }`. אחרת `JSON.parse` + Validation. אובייקט שאינו `{ schemaVersion: 1, results: [...] }` או JSON פגום → `{ ok: false }`. רשומה בודדת לא תקינה **מסוננת** (לא נכשלים בגללה). תמיד מוחזרות לכל היותר 10. `getItem` שזורק (אחסון חסום) → `{ ok: false }` |
| `addResult(input: { completedRounds; outcome; finishedAt? }): LoadResult` | קורא את הרשימה הקיימת מהאחסון (אם לא ניתן לקרוא – מתחיל מרשימה ריקה, ADR-4: "השמירה הבאה כותבת רשימה תקינה חדשה"), יוצר `GameResult` עם `id` חדש ו-`finishedAt = new Date().toISOString()`, מוסיף **בראש**, חותך ל-10 (הישנה ביותר נופלת), וכותב `setItem`. הצלחה → `{ ok: true, results }` (הרשימה החדשה); `setItem` שזורק (חסום / מלא) → `{ ok: false }` |
| `clearHistory(): boolean` | `removeItem(HISTORY_KEY)`; `true` בהצלחה, `false` אם זרק. אין לדווח הצלחה כשהמחיקה נכשלה (ARCHITECTURE §2.5) |

- **Validation של רשומה:** `id` מחרוזת לא ריקה; `finishedAt` מחרוזת ש-`Date.parse` שלה אינו `NaN`; `completedRounds` מספר שלם 0–10; `outcome` הוא `'win'` או `'loss'`.
- גישה ל-`window.localStorage` עצמה (לא רק לשיטות) בתוך ה-`try`, כי בחלק מהדפדפנים עצם הגישה זורקת כשהאחסון חסום.
- הקריאה מחדש בכל `addResult` (ולא רק שימוש ברשימה שבזיכרון) שומרת על נכונות גם אם האפליקציה פתוחה בשתי לשוניות.
- המודול לא מכיל React ולא מצב המשחק – רק תוצאות (ARCHITECTURE §2.5, §2.8).

## 3. ה-Hook – `src/history/useHistory.ts`

```ts
export function useHistory() {
  const [initial] = useState(loadHistory);              // read once per page load
  const [results, setResults] = useState(initial.ok ? initial.results : []);
  const [loadFailed, setLoadFailed] = useState(!initial.ok);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const record = useCallback((input) => {
    const saved = addResult(input);
    if (!saved.ok) return false;          // list on screen stays as stored (ADR-13)
    setResults(saved.results);
    setLoadFailed(false);                 // a fresh valid list now exists
    return true;
  }, []);

  const clear = useCallback(() => {
    const ok = clearHistory();
    setDeleteFailed(!ok);
    if (ok) setResults([]);               // on failure the list stays on screen (ADR-4)
    return ok;
  }, []);

  return { results, loadFailed, deleteFailed, record, clear, resetDeleteError };
}
```

- `useState(loadHistory)` – הקריאה מתבצעת פעם אחת בטעינת האפליקציה; Strict Mode עשוי להריץ את ה-initializer פעמיים, וזה בטוח כי היא קריאה בלבד.
- `resetDeleteError()` נקרא כשפותחים שוב את ה-Dialog, כדי שהודעת כשל ישנה לא תישאר אחרי ניסיון חדש.
- `results` הוא מה שמוצג במסך "אודות"; אין קריאה חוזרת מהאחסון בכל כניסה למסך.

## 4. רישום פעם אחת – `src/App.tsx`

```ts
const history = useHistory();
const { status, gameId, completedRounds } = game.state;
const recordedGameRef = useRef(0);                 // gameId of the last recorded game
const [saveFailedFor, setSaveFailedFor] = useState<number | null>(null);

useEffect(() => {
  if (status !== 'won' && status !== 'lost') return;
  if (recordedGameRef.current === gameId) return;  // once per game, Strict Mode included
  recordedGameRef.current = gameId;
  const ok = history.record({ completedRounds, outcome: status === 'won' ? 'win' : 'loss' });
  setSaveFailedFor(ok ? null : gameId);
}, [status, gameId, completedRounds, history.record]);
```

- **מתי:** בכניסה ל-`won`/`lost`, שקורית מיד בלחיצה המכריעה (ADR-10) – לא אחרי השנייה של הצגת ההודעה, ולא ב"אישור" (ADR-5). לכן יציאה ל"אודות" בתוך השנייה הזו כבר מציגה את התוצאה ברשימה.
- **מה לא נרשם:** `paused`, ניווט, הסתרה, `pagehide` ו-Refresh אינם מכניסים ל-`won`/`lost`, ולכן אינם יוצרים רשומה (ARCHITECTURE §2.3 כללים 8–9). Refresh מתחיל `gameId` מ-0 מחדש, וזה תקין: ה-Guard נועד לרישום כפול בתוך אותה טעינה.
- **Strict Mode:** ב-React 19 ה-Effect מורץ פעמיים בפיתוח, אבל ה-`ref` נשמר בין שתי ההרצות, ולכן הרישום השני מדולג. נבדק בבדיקה ייעודית (6.2 בדיקה 4).
- `completedRounds` נלקח מה-state ברגע הסיום: 0 בשגיאה בשלב 1, 10 בניצחון (PRD §4.4).
- `HomeScreen` מקבל `saveFailed={saveFailedFor === game.state.gameId}` ומעביר ל-`EndDialog`.
- `AboutScreen` מקבל את `history` (results, loadFailed, deleteFailed, clear, resetDeleteError).

## 5. ממשק

### 5.1 מסך "אודות" – `AboutScreen.tsx`

לפי DESIGN §1.2, ה-Wireframes ולוח "אודות" ב-Mockups. סדר מלמעלה למטה:

1. כותרת **"אודות"** וכרטיס **"על המשחק"** – ללא שינוי.
2. כותרת **"10 המשחקים האחרונים"** – ללא שינוי.
3. הודעת כשל טעינה (אם `loadFailed`): **"לא ניתן לטעון את היסטוריית המשחקים במכשיר זה."** – בגוון השגיאה הקיים, `role="alert"`. במצב זה לא מוצג החיווי הריק.
4. אם אין רשומות (ולא נכשלה הטעינה): החיווי הקיים **"עדיין אין משחקים שמורים."**
5. אם יש רשומות: `<ol>` עם `aria-label="10 המשחקים האחרונים"` ו-`HistoryCard` לכל רשומה, בסדר שבו הן שמורות (החדשה ראשונה).
6. הודעת כשל מחיקה (אם `deleteFailed`): **"מחיקת ההיסטוריה נכשלה. נסה שוב."**, `role="alert"`; הרשימה נשארת.
7. כפתור **"מחק היסטוריה"** – רק כש-`results.length > 0` (PRD §4.4). סגנון כפתור משני לפי DESIGN §2.3 ו-Mockup: רקע `Surface`, קו מתאר `Border`, טקסט לבן, צורת Pill ברוחב הכרטיסים.

- מצב פתיחת ה-Dialog (`confirmOpen`) נשמר ב-State מקומי של `AboutScreen`; מעבר ל"בית" סוגר אותו (המסך יורד מהעץ) – זה שווה ערך ל"ביטול".
- הרשימה גוללת בתוך `app-content` הקיים (DESIGN §1.2); אין שינוי בגובה האפליקציה.

### 5.2 כרטיס תוצאה – `HistoryCard.tsx`

לפי Mockup (`אודות`) ו-Style Guide (History List Item): כרטיס כהה (`Surface`, גבול `Border`, `radius-inner`), שני טורים:

| צד (ב-RTL) | תוכן | טיפוגרפיה |
|---|---|---|
| ימין, שורה עליונה | **"שלבים שהושלמו: N"** | Body, Semibold, לבן |
| ימין, שורה תחתונה | **"תוצאה: ניצחון"** / **"תוצאה: הפסד"** | Caption; ירוק `#00D26A` לניצחון, אדום `#FF3B30` להפסד (הדגשה מאופקת; המילה עצמה היא החיווי – DESIGN §1.2 "לא בצבע בלבד") |
| שמאל | תאריך ושעה, למשל `30.10.2026 14:32` | Caption, `--text-muted`, בתוך `<bdi>` / `dir="ltr"` כדי שהסדר לא יתהפך |

- **ניסוח "שלבים שהושלמו":** ה-Wireframes וה-Mockups מציגים את התווית "שלב: N", אבל DESIGN §1.2 קובע שבכרטיס מוצג **מספר השלבים שהושלמו**, ו-DESIGN §1.1 מדגיש שהוא נבדל מהשלב שבו אירעה הטעות. כדי שלא ייווצר בלבול (הפסד בשלב 5 היה מוצג "שלב: 4"), התווית היא **"שלבים שהושלמו: N"** – בדיוק כמו בהודעת הסיום הקיימת. המבנה (שתי שורות מימין, תאריך משמאל) נשאר כמו בהמחשות.
- **אין אייקון גביע** (מופיע רק בדוגמת ה-Style Guide; DESIGN §2.6 – הדוגמה אינה דרישה).
- `formatFinishedAt(iso)` משתמש ב-`Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })` ו-`{ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }`, בשעון המקומי של המכשיר (ARCHITECTURE §2.5). התוצאה כמו ב-Wireframe: `12.05.2024 14:32`.

### 5.3 Dialog אישור מחיקה – `ConfirmDialog.tsx`

לפי DESIGN §1.3, לוח "אודות – אישור מחיקה" ב-Mockups, ו-Confirmation Dialog ב-Style Guide:

- **Scrim** כהה (`position: fixed`, מכסה את כל האפליקציה כולל פס הניווט, כמו ב-Mockup), ובמרכזו כרטיס **בהיר** (רקע לבן, פינות `radius-card`, צל רך) – DESIGN §2.3 "ה-Dialog בהיר".
- כותרת **"למחוק את ההיסטוריה?"** (H3, Charcoal), הסבר **"כל תוצאות המשחקים יימחקו."** (Body, אפור כהה) – הנוסח מה-Mockup.
- שני כפתורים באותו רוחב, בשורה: **"מחק"** אדום (`#FF3B30`, טקסט לבן) ו-**"ביטול"** משני (רקע `#E5E5E5`, טקסט Charcoal). סדר: "מחק" מימין ו"ביטול" משמאל – כמו ב-Mockup וב-Style Guide (ה-Wireframe מציג סדר הפוך; ה-Style Guide גובר על סגנון רכיבים וה-Mockups מציגים את המראה הסופי). ב-RTL זה אומר ש"מחק" ראשון ב-DOM.
- נגישות: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` לכותרת ו-`aria-describedby` להסבר; בפתיחה הפוקוס עובר ל**"ביטול"** (הבחירה הבטוחה). לחיצה על ה-Scrim לא עושה דבר – רק שני הכפתורים (PRD: "מחיקה מתבצעת רק לאחר לחיצה על 'מחק'").
- **"ביטול"** → סוגר בלבד, האחסון לא נגע. **"מחק"** → `history.clear()`, סוגר את ה-Dialog; בהצלחה מוצג החיווי הריק והכפתור "מחק היסטוריה" נעלם; בכשל מוצגת הודעת הכשל והרשימה נשארת.

### 5.4 הודעת הסיום – `EndDialog.tsx`

- Prop חדש `saveFailed?: boolean`. כשהוא `true`, מתחת ל"שלבים שהושלמו" מופיעה שורה: **"לא ניתן היה לשמור את התוצאה בהיסטוריה."** (Caption, אדום מאופק). המשחק, הצליל, הקונפטי ו"אישור" ממשיכים כרגיל.
- אין שינוי אחר בהודעה.

### 5.5 סיכום הודעות השגיאה (נוסח חדש – ה-spec דורש "הודעה ברורה בעברית" בלי נוסח מוגדר)

| מקרה | איפה | נוסח |
|---|---|---|
| לא ניתן לקרוא את האחסון / נתונים פגומים | "אודות", במקום החיווי הריק | "לא ניתן לטעון את היסטוריית המשחקים במכשיר זה." |
| שמירת תוצאה נכשלה | הודעת הסיום | "לא ניתן היה לשמור את התוצאה בהיסטוריה." |
| מחיקה נכשלה | "אודות", מעל הכפתור | "מחיקת ההיסטוריה נכשלה. נסה שוב." |

## 6. בדיקות

### 6.1 Repository – `src/history/historyStorage.test.ts` (ללא React)

1. אחסון ריק → `{ ok: true, results: [] }`.
2. `addResult` מוסיף בראש: שתי הוספות → החדשה ראשונה; המבנה השמור הוא `{ schemaVersion: 1, results }`, ו-`finishedAt` הוא ISO.
3. **מגבלת עשר:** 11 הוספות → 10 רשומות; הראשונה שנוספה (הישנה ביותר) נעלמה; הסדר מהחדש לישן.
4. JSON פגום / `schemaVersion` אחר / `results` שאינו מערך → `{ ok: false }`.
5. רשומות לא תקינות (outcome שגוי, `completedRounds` 11 או 2.5, תאריך לא חוקי) מסוננות, והתקינות נשארות.
6. `addResult` אחרי נתונים פגומים כותב רשימה תקינה חדשה עם רשומה אחת.
7. `clearHistory` מוחק את המפתח ומחזיר `true`; `loadHistory` אחריו מחזיר רשימה ריקה.
8. כשלים: `vi.spyOn(Storage.prototype, 'getItem' | 'setItem' | 'removeItem')` שזורק → `loadHistory` `{ ok: false }`, `addResult` `{ ok: false }`, `clearHistory` `false`; אף אחת מהן לא זורקת.
9. `formatFinishedAt` – תאריך שנבנה משעון מקומי (`new Date(2026, 9, 30, 14, 32)`) מוצג כ-`30.10.2026` ו-`14:32` (לא תלוי באזור הזמן של המחשב).

### 6.2 אינטגרציה – `src/App.history.test.tsx`

אותם Mocks כמו ב-`App.game.test.tsx` (אודיו, קונפטי, `random`) ו-Fake Timers; העזרים (`press`, `readSequence`, `playRounds`, `goTo`, `setPageVisibility`, `clickStart`…) עוברים ל-`src/test/gameTestUtils.ts` ומשותפים לשני הקבצים (ה-`vi.mock` נשאר בכל קובץ בדיקה). `vi.setSystemTime` קובע את זמן הסיום.

1. **הפסד בשלב 1:** רשומה אחת באחסון (`completedRounds: 0`, `outcome: 'loss'`, `finishedAt` לפי הזמן שנקבע); ב"אודות" כרטיס עם "שלבים שהושלמו: 0", "תוצאה: הפסד", התאריך והשעה; החיווי הריק נעלם וכפתור "מחק היסטוריה" מופיע.
2. **הפסד בשלב מתקדם** (שלב 4 → 3 שהושלמו) ו**ניצחון** (10, "תוצאה: ניצחון") – כל אחד מוסיף בדיוק רשומה אחת.
3. **בדיוק פעם אחת:** אחרי הפסד – המתנה, "אישור", מעבר ל"אודות" וחזרה, הסתרה והצגה של הדף → עדיין רשומה אחת.
4. **Strict Mode:** `render(<StrictMode><App /></StrictMode>)`, הפסד → רשומה אחת בלבד.
5. **אין רשומה ללא סיום:** השהיה (מעבר ל"אודות" בזמן הצגה ובזמן שחזור), `visibilitychange`, `pagehide` ו-Refresh (`unmount` + `render`) באמצע משחק → האחסון ריק, ו"אודות" מציג חיווי ריק.
6. **יציאה בשנייה שלפני הודעת הסיום (ADR-10):** לחיצה שגויה → מעבר מיד ל"אודות" → הכרטיס כבר מופיע; חזרה ל"בית" מציגה את ההודעה; עדיין רשומה אחת.
7. **מגבלת עשר + Refresh:** טוענים מראש 10 רשומות לאחסון (דרך `addResult`), משחקים ומפסידים → ב"אודות" 10 כרטיסים, החדש ראשון, הישן ביותר נעלם. `unmount` ו-`render` מחדש → אותם 10 כרטיסים באותו סדר.
8. **"ביטול":** "מחק היסטוריה" → Dialog עם "למחוק את ההיסטוריה?", הפוקוס על "ביטול" → "ביטול" → ה-Dialog נסגר, הכרטיסים והאחסון ללא שינוי.
9. **"מחק":** → ה-Dialog נסגר, החיווי "עדיין אין משחקים שמורים." חוזר, הכפתור "מחק היסטוריה" נעלם והמפתח לא קיים באחסון; Refresh – עדיין ריק.
10. **כשל שמירה:** `setItem` זורק → המשחק מסתיים כרגיל, הודעת הסיום כוללת "לא ניתן היה לשמור את התוצאה בהיסטוריה.", "אישור" ו"התחל משחק" עובדים; משחק נוסף שנשמר בהצלחה לא מציג את השורה.
11. **כשל מחיקה:** `removeItem` זורק → אחרי "מחק" מוצגת "מחיקת ההיסטוריה נכשלה. נסה שוב." והכרטיסים נשארים.
12. **כשל טעינה:** `getItem` זורק (או JSON פגום באחסון) → "אודות" מציג "לא ניתן לטעון את היסטוריית המשחקים במכשיר זה."; "התחל משחק" עובד ומשחק שלם מתנהל כרגיל. ב-JSON פגום: אחרי הפסד ההודעה נעלמת ומוצג כרטיס אחד.

### 6.3 בדיקות קיימות

- `src/test/setup.ts`: `afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); })`, כדי שתוצאות ממשחקי הבדיקות לא ידלפו בין בדיקות.
- `App.test.tsx` (כולל "navigates to About and back" עם החיווי הריק ובלי "מחק היסטוריה") ו-`App.game.test.tsx` ממשיכים לעבור; ב-`App.game.test.tsx` רק ה-imports של העזרים משתנים.

## 7. בדיקה ידנית (שלי, לפני סימון 🟡)

- `npm run typecheck`, `npm test`, `npm run build` עוברים.
- `npm run dev` ובדיקה בדפדפן באמולציית מובייל (`http://localhost:5173/simon/`):
  - הפסד וניצחון (ניצחון יקר בזמן – הפסד בכמה שלבים שונים מספיק לבדיקה ידנית; ניצחון מכוסה בבדיקות) → כרטיסים ב"אודות", החדש למעלה, בעיצוב ה-Mockup.
  - Refresh → הכרטיסים נשארים.
  - "מחק היסטוריה" → "ביטול" לא משנה דבר; "מחק" מרוקן ומציג חיווי ריק.
  - כשל אחסון: ב-DevTools חוסמים אחסון אתר (או מחליפים זמנית את `localStorage.setItem` מהקונסול) ובודקים שהמשחק ממשיך ושהודעות השגיאה מופיעות.
  - צילום מסך של "אודות" עם רשימה ושל ה-Dialog, להשוואה ל-Mockup. בסיום סוגרים את השרת.
- **מה לא ניתן לבדוק כאן:** מצב גלישה פרטית/חסימת אחסון אמיתית ב-Safari בנייד; ייבדק במכשיר אם זמין, וגם ב-Milestone 5.

## 8. תיעוד

- `ARCHITECTURE.md`: הוספת **ADR-13: התצוגה משקפת את מה שנשמר בפועל, ונוסחי הכרטיס וה-Dialog** – הקשר: ה-spec לא מגדיר מה מוצג כשהשמירה נכשלת, ואת התווית בכרטיס (ההמחשות: "שלב: N"; DESIGN: מספר השלבים שהושלמו). החלטה: רשימת "אודות" מציגה רק רשומות שנכתבו בהצלחה לאחסון (כשל שמירה מדווח בהודעת הסיום); נתונים פגומים מוצגים כשגיאת טעינה ונדרסים בשמירה הבאה; התווית בכרטיס היא "שלבים שהושלמו: N"; סדר כפתורי ה-Dialog לפי ה-Mockup וה-Style Guide; מחיקה ב-`removeItem`. השלכות: אין "תוצאה רפאים" שנעלמת ב-Refresh, והמשתמש תמיד יודע מה באמת שמור.
- אם במימוש יתברר שמשהו ב-ADR-4 (שמות קבצים, מיקום ה-Effect) שונה – יעודכן ניסוח ה-ADR.
- `MILESTONES.md`: סימון 🟡 ליד כותרת Milestone 4 בסיום הבנייה.
- `CLAUDE.md` → "פקודות הרצה": ללא שינוי.

## 9. Definition of Done – איך כל תנאי נבדק

| תנאי | איך נבדק |
|---|---|
| ניצחון או הפסד מוסיפים בדיוק רשומה אחת עם זמן סיום, שלבים שהושלמו ו"ניצחון"/"הפסד" בתצוגה | בדיקות 6.2: 1, 2, 3, 4, 6 + ידנית |
| מעבר מסכים, השהיה, Refresh של משחק פעיל או יציאה באמצעו אינם מוסיפים רשומה | בדיקה 6.2: 5 + ידנית |
| אחרי 11 משחקים לכל היותר 10 רשומות מהחדש לישן, ונשמרות לאחר Refresh | בדיקות 6.1: 3; 6.2: 7 + ידנית (Refresh) |
| "ביטול" לא משנה נתונים; "מחק" מרוקן ומחזיר חיווי ריק | בדיקות 6.2: 8, 9 + ידנית |
| כשל אחסון אינו מונע משחק, ומוצגת הודעה בעברית כששמירה או מחיקה נכשלות | בדיקות 6.1: 8; 6.2: 10, 11, 12 + ידנית (חסימת אחסון) |
| בדיקות אוטומטיות מאמתות היסטוריה, מגבלת עשר, מחיקה, כשל אחסון ומניעת שמירה כפולה | כל 6.1 ו-6.2 (כולל Strict Mode – 6.2: 4) |
