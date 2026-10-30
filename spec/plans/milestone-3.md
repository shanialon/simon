# תוכנית – Milestone 3: השהיה וחידוש משחק

> מקורות: `MILESTONES.md` (Milestone 3); `PRD.md` §3ב ("מעבר למסך אודות והמשך משחק"), §3ג, §4.1, §4.3, §4ב; `DESIGN.md` §1.1 (מצב "מושהה", חיווי השלב, טבלת "קצב הצגת הרצף"), §2.3; `ARCHITECTURE.md` §2.3 (כללים 3, 5–7), §2.4, §2.10, ADR-2, ADR-3, ADR-10, ADR-11; התמונות `wireframes.png`, `mockups.png` (לוח "בית – משחק מושהה").
> באבן דרך זו **אין** היסטוריה ב-`localStorage` (Milestone 4) ו**אין** PWA (Milestone 5). אין תלויות חדשות.

## 0. מה משתנה בקצרה

- הפתרון הזמני של Milestone 2 (`abandon` – ביטול משחק במעבר ל"אודות") **מוסר**, ובמקומו מצב `paused` אמיתי.
- שלושה מקורות השהיה, כולם קוראים לאותה פונקציה `pause()` ב-`useGame` (ADR-3): ניווט ל"אודות", `visibilitychange` ל-`hidden`, ו-`pagehide`.
- חזרה ל"בית" או לאפליקציה **אינה** מחדשת משחק. רק "המשך משחק" מציג מחדש את **כל** הרצף של אותו שלב, אחרי `1000ms` (`LEAD_IN_MS`), כמו אחרי "התחל משחק".
- השהיה אינה חלה על `idle` / `won` / `lost` (ADR-3, ADR-10).

## 1. קבצים שמשתנים

```text
src/
  game/
    gameReducer.ts         # + 'paused' status, 'pause' / 'resume' actions; remove 'abandon'
    gameReducer.test.ts    # replace abandon test with pause/resume tests
    useGame.ts             # pause(), resumeGame(), visibility handler, page-visible flag for the end message
  screens/
    HomeScreen.tsx         # paused view: "המשחק מושהה", dimmed board, "המשך משחק"
  App.tsx                  # navigating to About calls game.pause()
  App.game.test.tsx        # replace the two "cancels the game" tests with pause/resume tests
```

`SimonBoard.tsx`, `timing.ts`, `audio.ts` ו-CSS אינם צריכים שינוי: הלוח כבר תומך ב-`dimmed` (כל רבע לא מואר מקבל `is-dim`) וב-`inputEnabled`.

## 2. ה-Reducer – `src/game/gameReducer.ts`

```ts
type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'paused' | 'won' | 'lost';
```

אין שדות חדשים ב-`GameState`. `sequence`, `round`, `completedRounds` ו-`gameId` נשמרים כמות שהם בהשהיה (Memory בלבד).

| Action | מותר מ- | תוצאה |
|---|---|---|
| `pause` | `presenting` / `awaitingInput` | `paused`, `inputIndex=0`, `presentationId+1`, `roundIntro=false`. הרצף, השלב ו-`completedRounds` ללא שינוי |
| `resume` | `paused` | `presenting`, `inputIndex=0`, `presentationId+1`, `roundIntro=false`; אותו רצף ואותו שלב |
| `abandon` | — | **נמחק** (וגם ההערה "Temporary until Milestone 3") |

- כל Action אחר במצב `paused` מתעלם (`press`, `presentationDone` מיושן, `start`, `dismiss`) – קיים כבר מכיוון שכל case בודק את הסטטוס.
- `presentationId+1` ב-`pause` גורם לכל `presentationDone` של ההצגה שבוטלה להיות מיושן; `+1` נוסף ב-`resume` נותן להצגה החדשה מזהה משלה (ADR-3).
- `backToIdle` נשאר לשימוש `dismiss` בלבד; הפרמטר `presentationId` שלו כבר לא נחוץ ויוסר.

**השהיה בזמן המעבר בין שלבים (ADR-11):** כשהשחקן משלים שלב, ה-Reducer כבר עובר ל-`presenting` של השלב הבא (רצף ארוך יותר, `round` חדש, `roundIntro=true`). השהיה בתוך ההמתנות האלה שומרת את השלב **החדש**; "המשך משחק" מציג את הרצף המלא שלו עם `LEAD_IN_MS` בלבד (בלי שתי המתנות המעבר), ובמסך המושהה מוצג מספר השלב החדש. השלב שהושלם לא אובד ולא נדרש לשחקו שוב. תתועד כ-ADR-12 (סעיף 8).

## 3. ה-Hook – `src/game/useGame.ts`

### 3.1 `pause()` – מחליף את `abandon()`

```ts
const pause = useCallback(() => {
  const { status } = stateRef.current;
  if (status !== 'presenting' && status !== 'awaitingInput') return;
  if (pressRef.current) finishPress(pressRef.current); // stop a held pad tone/light
  stopAll();                                           // silence any tone right now
  setLitColor(null);                                   // no light left on
  apply({ type: 'pause' });
}, [apply, finishPress]);
```

- העצירה המיידית (צליל + הארה) מתבצעת **סינכרונית** בתוך הקריאה, לפני הרינדור. ה-Timers של ההצגה מבוטלים ב-Cleanup של ה-Effect של ה-Sequence Controller, שרץ כי `status` משתנה מ-`presenting` (קיים כבר). במצב `awaitingInput` אין Timers של הצגה; Timer הלחיצה המינימלית מבוטל ב-`finishPress`.
- קריאה חוזרת (למשל `visibilitychange` ואחריו `pagehide`) לא עושה דבר, כי הסטטוס כבר `paused`.

### 3.2 `resumeGame()` – מתוך הלחיצה על "המשך משחק"

```ts
const resumeGame = useCallback(async () => {
  if (stateRef.current.status !== 'paused' || resumingRef.current) return;
  resumingRef.current = true;
  const ok = await unlockAudio();   // inside the user gesture (ARCHITECTURE §2.4)
  resumingRef.current = false;
  if (!ok) { setAudioError(true); return; }   // stay paused, show message
  setAudioError(false);
  apply({ type: 'resume' });
}, [apply]);
```

- **ריבוי Resume:** `resumingRef` חוסם לחיצה שנייה בזמן ה-`await`; אחרי ה-`resume` הסטטוס כבר `presenting` והכפתור נעלם, ו-`apply` מתעלם מ-`resume` שאינו מ-`paused`. כך נוצרת הצגה אחת בלבד.
- **יציאה בזמן ה-`await`:** אם בזמן ההמתנה ל-`unlockAudio` המשתמש עבר ל"אודות" או שהאפליקציה הוסתרה, לא משחזרים. לשם כך `resumeGame` בודק אחרי ה-`await` ש-Home גלוי והדף גלוי (דרך `ref` שמתעדכן מ-`homeVisible` ומ-`pageVisible`, ראה 3.4); אחרת נשארים ב-`paused`.
- `startGame` הקיים לא משתנה. ה-`audioError` משותף לשני הכפתורים; ההודעה מותאמת לפי הסטטוס (סעיף 4).

### 3.3 Visibility Handler

Effect אחד ב-`useGame`:

- `document` → `visibilitychange`: אם `document.visibilityState === 'hidden'` → `pause()`. חזרה ל-`visible` לא מפעילה משחק (רק מעדכנת את `pageVisible`, 3.4).
- `window` → `pagehide`: `pause()` (Safety Net, ARCHITECTURE §2.4). אם הדף חוזר מ-bfcache הוא חוזר במצב `paused`, וזה הכלל הנכון.
- הסרת המאזינים ב-Cleanup.
- Refresh / סגירה: לא נשמר דבר; טעינה חדשה מתחילה ב-`idle` (ללא שינוי מ-Milestone 2).

### 3.4 הודעת הסיום כשהאפליקציה מוסתרת (ADR-10)

היום ההמתנה של `END_DELAY_MS` נקטעת רק ביציאה ממסך הבית. לפי ADR-10 גם הסתרת האפליקציה צריכה לקטוע אותה, וההודעה (עם צליל הסיום, ובניצחון קונפטי) מוצגת כשחוזרים ו**גם** מסך הבית וגם האפליקציה גלויים:

- State חדש `pageVisible` (ערך התחלתי מ-`document.visibilityState`), מתעדכן באותו מאזין `visibilitychange`.
- בכל מקום שבו ה-Effects של הסיום משתמשים ב-`homeVisible`, משתמשים ב-`shown = homeVisible && pageVisible`.
- כך: לחיצה שגויה → הסתרה בתוך השנייה → ה-Timer מבוטל, אין צליל ברקע → חזרה → ההודעה וצליל ההפסד מיד. ה-Guard הקיים (`endFeedbackForRef`) מונע השמעה חוזרת אם ההודעה כבר הוצגה לפני ההסתרה.
- זה דגל תצוגה בלבד, לא חלק מכללי המשחק.

### 3.5 ערכי החזרה

- `abandon` יוצא, נכנסים `pause` ו-`resumeGame`.
- `displayRound` ללא שינוי בנוסחה: ב-`paused` הוא `state.round` (מכיוון ש-`roundIntro=false`), וזה מספר השלב הנוכחי (DESIGN §1.1: "כולל מצב מושהה").

## 4. מסך הבית – `src/screens/HomeScreen.tsx`

לפי DESIGN §1.1 ולוח "בית – משחק מושהה" ב-Mockups:

| אלמנט | במצב `paused` |
|---|---|
| חיווי שלב | "שלב X מתוך 10" – השלב הנוכחי |
| טקסט סטטוס | **"המשחק מושהה"** |
| לוח | `dimmed` (כל ארבעת הרבעים מעומעמים, אין רבע מואר), `inputEnabled=false` |
| אזור הפעולה | כפתור ראשי **"המשך משחק"** (`btn-primary`) שקורא ל-`game.resumeGame` |
| כשל אודיו | במקום "המשחק מושהה": **"לא ניתן להפעיל את הצלילים. לחץ שוב על "המשך משחק"."** (בסגנון השגיאה הקיים) |

- "המשך משחק" מוצג **רק** ב-`paused`; "התחל משחק" רק ב-`idle`; בשאר המצבים – ההנחיה הקיימת.
- `dimmed` יחושב כ-`status === 'presenting' || status === 'paused'`.
- אין שינויי CSS: הכפתור והעמעום קיימים.

## 5. App – `src/App.tsx`

```ts
function navigate(next: Screen) {
  if (next === 'about') game.pause();
  setScreen(next);
}
```

- מסירים את ההערה "Temporary (Milestone 2)". חזרה ל"בית" לא קוראת לשום פונקציית משחק.

## 6. בדיקות

### 6.1 Reducer – `src/game/gameReducer.test.ts`

מחליפים את בדיקת `abandon` בבדיקות:
- `pause` מ-`presenting` ומ-`awaitingInput` (אחרי חלק מהקלט): `paused`, `inputIndex=0`, הרצף, `round` ו-`completedRounds` ללא שינוי, `presentationId` עלה.
- `presentationDone` עם המזהה של ההצגה שבוטלה מתעלם, גם ב-`paused` וגם אחרי `resume`.
- `press` ו-`start` ב-`paused` מתעלמים.
- `resume` מ-`paused`: `presenting`, אותו רצף ושלב, `presentationId` חדש, `roundIntro=false`; `resume` שני מתעלם.
- `pause` ב-`idle` / `won` / `lost` ו-`resume` שלא מ-`paused` – מחזירים את אותו אובייקט state.
- `pause` בזמן מעבר שלב (`roundIntro=true`) שומר את השלב החדש ומאפס את `roundIntro`.

### 6.2 אינטגרציה – `src/App.game.test.tsx`

עזר חדש: `hidePage()` / `showPage()` שמגדירים `document.visibilityState` (`Object.defineProperty` עם `configurable: true`) ושולחים `visibilitychange`; ו-`clickResume()` בדומה ל-`clickStart()`. ב-`afterEach` מחזירים את הנראות ל-`visible`.

מחליפים את שתי הבדיקות "leaving to About … cancels the game" בבדיקות:
1. **מעבר ל"אודות" בזמן הצגת רצף:** `stopAll` נקרא, אין רבע מואר ו-`vi.getTimerCount()` הוא 0. חזרה ל"בית": "המשחק מושהה", "המשך משחק" קיים, "התחל משחק" לא קיים, אותו מספר שלב, הלוח מעומעם; התקדמות זמן ארוכה לא מדליקה שום רבע (אין Resume אוטומטי).
2. **מעבר ל"אודות" באמצע שחזור (שלב 2, אחרי לחיצה נכונה אחת, כולל לחיצה מוחזקת):** הצליל והאור של הלחיצה נעצרים. "המשך משחק" → אחרי `1000ms` מוצג **כל** הרצף של שלב 2 (שני צבעים, אותו רצף ובאותו קצב – `readSequence(2, 1000)`), השלב נשאר 2, ואחר כך יש לשחזר מההתחלה: לחיצה על הצבע השני ברצף כ"ראשון" מפסידה – מוכיח שהקלט החלקי אופס.
3. **השהיה במעבר בין שלבים:** יציאה בתוך ההמתנה שאחרי השלמת שלב 1; חזרה מציגה "שלב 2 מתוך 10" מושהה; "המשך משחק" מציג רצף בן 2 צבעים שתחילתו רצף שלב 1.
4. **`visibilitychange`:** `hidePage()` בזמן הצגה → מושהה, אין Timers ואין אור; `showPage()` לא מחדש; "המשך משחק" מציג את הרצף המלא. אחר כך `hidePage()` ו-`showPage()` במהלך `awaitingInput` – אותו כלל.
5. **`pagehide`:** `fireEvent(window, new Event('pagehide'))` בזמן משחק → מושהה.
6. **Callback שבוטל לא משנה דבר:** אחרי השהיה וחידוש, התקדמות זמן לפי לוח הזמנים של ההצגה הישנה לא מעבירה ל"התור שלך" מוקדם מדי ולא מדליקה רבע לא צפוי (רק לוח הזמנים החדש).
7. **ריבוי Resume:** שתי לחיצות מהירות על "המשך משחק" (בתוך אותו `act`) → `unlockAudio` נקרא פעם אחת והצגה אחת בלבד (רבע אחד מואר בכל רגע, הקצב תקין).
8. **כשל אודיו ב-Resume:** `unlockAudio` מחזיר `false` → נשארים מושהים עם הודעת השגיאה; לחיצה נוספת מצליחה ומציגה את הרצף.
9. **השהיה אינה הפסד:** אחרי השהיה וחזרה אין Dialog, `playLose` לא נקרא.
10. **הסתרה בזמן ההמתנה להודעת הסיום (ADR-10):** לחיצה שגויה → `hidePage()` אחרי `400ms` → אין `playLose` גם אחרי `2000ms` → `showPage()` → "נפסלת!" ו-`playLose` פעם אחת. ובנוסף: הודעה שכבר הוצגה, ואחריה הסתרה וחזרה – אין צליל נוסף.
11. **השהיה לא חלה על `idle`/`won`/`lost`:** ב-`idle` מעבר ל"אודות" וחזרה מציגים "התחל משחק" (אין "המשך משחק"); הבדיקה הקיימת "leaving during the delay before the end message…" ממשיכה לעבור.
12. **Refresh מאפס:** `unmount` ו-`render` מחדש של `App` אחרי השהיה → "התחל משחק", "שלב 1 מתוך 10".

כל הבדיקות הקיימות של Milestone 2 (פרט לשתי המוחלפות) צריכות להמשיך לעבור ללא שינוי.

## 7. בדיקה ידנית (שלי, לפני סימון 🟡)

- `npm run typecheck`, `npm test`, `npm run build` עוברים.
- `npm run dev` ובדיקה בדפדפן באמולציית מובייל: מעבר ל"אודות" בזמן הצגה ובזמן שחזור; חזרה ל"בית" מציגה מסך מושהה כמו ב-Mockup; "המשך משחק" מציג את הרצף המלא; מעבר ללשונית אחרת (`visibilitychange`) וחזרה. בסיום סוגרים את השרת.
- **מה לא ניתן לבדוק כאן:** נעילת טלפון אמיתית ומעבר לאפליקציה אחרת במכשיר נבדקים במכשיר נייד אמיתי (ידווח כ"לא נבדק במכשיר" אם לא בוצע; הבדיקה המלאה במכשיר מתוכננת גם ב-Milestone 5).

## 8. תיעוד

- `ARCHITECTURE.md`: הוספת **ADR-12: השהיה בזמן המעבר בין שלבים שומרת את השלב החדש** (הקשר: לפי ADR-11 השלב הבא כבר פעיל בזמן ההמתנות; החלטה: `pause` מאפס `roundIntro`, ו-"המשך משחק" מציג את הרצף המלא של השלב החדש אחרי `LEAD_IN_MS`; השלכות: השלב שהושלם לא אובד, ואין צורך במצב נוסף). אם בבנייה יתברר ש-ADR-3 (שמזכיר `AbortController`) אינו תואם למימוש – ביטול דרך Cleanup של ה-Effect יחד עם `presentationId`, כמו ב-ADR-11 – יעודכן ניסוח ההשלכות בו.
- `MILESTONES.md`: סימון 🟡 ליד כותרת Milestone 3 בסיום הבנייה.
- `CLAUDE.md` → "פקודות הרצה": ללא שינוי.

## 9. Definition of Done – איך כל תנאי נבדק

| תנאי | איך נבדק |
|---|---|
| מעבר ל"אודות" בזמן הצגה ובזמן שחזור משהה ועוצר מיד הארה וצליל | בדיקות 1, 2 + ידנית |
| חזרה ל"בית" לא מפעילה את הרצף מעצמה; "המשך משחק" רק במשחק מושהה | בדיקות 1, 4, 11 + ידנית |
| "המשך משחק" מציג מחדש את כל הרצף, גם אם חלקו הוקש; השלב לא משתנה ואין צבע חדש | בדיקות 2, 3 + Reducer |
| הסתרה וחזרה פועלות לפי אותו כלל, בלי שינוי מ-Callback שבוטל | בדיקות 4, 5, 6, 10 + ידנית (לשונית); במכשיר אמיתי – אם זמין |
| השהיה אינה הפסד, ו-Refresh עדיין מאפס | בדיקות 9, 12 + ידנית |
