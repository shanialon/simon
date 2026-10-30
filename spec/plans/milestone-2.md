# תוכנית – Milestone 2: משחק מלא מקצה לקצה

> מקורות: `MILESTONES.md` (Milestone 2), `PRD.md` §3ב, §4.2, §4ב; `DESIGN.md` §1.1 (כולל טבלת "קצב הצגת הרצף"), §2.3–2.4; `ARCHITECTURE.md` §2.3–2.4, §2.6, ADR-1, ADR-2, ADR-3 (חלק ה-`presentationId`/ביטול), ADR-5, ADR-10; התמונות `wireframes.png`, `mockups.png`.
> באבן דרך זו **אין** השהיה/"המשך משחק" (Milestone 3), **אין** היסטוריה ב-`localStorage` (Milestone 4) ו**אין** PWA (Milestone 5).

## 0. תלויות

- התקנת `canvas-confetti` (runtime) ו-`@types/canvas-confetti` (dev). אין תלויות נוספות.

## 1. מבנה הקבצים

```text
src/
  game/
    colors.ts              # (exists) + tone frequency per color
    random.ts              # randomColor(): ColorId via Math.random() (ADR-2)
    timing.ts              # all timing constants from DESIGN §1.1
    gameReducer.ts         # pure state machine + types
    gameReducer.test.ts    # unit tests of the rules
    useGame.ts             # hook in App: reducer + playback/timers/audio side effects
  audio/
    audio.ts               # Web Audio engine: unlock, color tones, win/lose motifs, stopAll
  effects/
    confetti.ts            # thin wrapper over canvas-confetti (fire / reset)
  components/
    SimonBoard.tsx/.css    # (update) lit / dimmed / disabled states + pointer input
    EndDialog.tsx/.css     # win/lose overlay with "אישור"
  screens/
    HomeScreen.tsx/.css    # (update) driven by game state
  App.tsx                  # (update) owns useGame; navigating to About abandons an active game
  App.test.tsx             # (update) integration tests with fake timers + mocks
```

## 2. קבועי זמן – `src/game/timing.ts`

ערכים מחייבים מ-DESIGN §1.1, זהים בכל השלבים (אין האצה):

| קבוע | ערך |
|---|---|
| `FLASH_MS` – הארה וצליל של צבע ברצף | `600` |
| `GAP_MS` – הפסקה בין צבעים | `250` |
| `LEAD_IN_MS` – לפני הצבע הראשון אחרי "התחל משחק" | `1000` |
| `ROUND_DONE_HOLD_MS` – חיווי השלב שהושלם נשאר | `1000` |
| `NEXT_ROUND_LEAD_MS` – מהצגת מספר השלב הבא עד הצבע הראשון | `1000` |
| `END_DELAY_MS` – מהלחיצה המכריעה עד הודעת הסיום וצלילה | `1000` |
| `PRESS_MIN_MS` – הארה וצליל מינימליים בלחיצת שחקן | `300` |
| `MAX_ROUNDS` | `10` |

## 3. ה-Reducer – `src/game/gameReducer.ts`

טהור, ללא אודיו/Timers/רנדום (ARCHITECTURE §2.3 כלל 4, ADR-2).

```ts
type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';
// 'paused' is added in Milestone 3

type GameState = {
  status: GameStatus;
  sequence: ColorId[];      // length 1..10
  round: number;            // 1..10
  inputIndex: number;
  completedRounds: number;  // 0..10
  gameId: number;           // increments on every start
  presentationId: number;   // increments on every new presentation; stale playback is ignored
  roundIntro: boolean;      // true when this presentation follows a completed round (display-only, see §5)
};
```

**Actions** (כל Action שלא חוקי במצב הנוכחי מחזיר את אותו state ללא שינוי):

| Action | מותר מ- | תוצאה |
|---|---|---|
| `start { firstColor }` | `idle` | `presenting`, `sequence=[firstColor]`, `round=1`, `inputIndex=0`, `completedRounds=0`, `gameId+1`, `presentationId+1`, `roundIntro=false` |
| `presentationDone { presentationId }` | `presenting` עם אותו `presentationId` | `awaitingInput`, `inputIndex=0` (מזהה ישן → מתעלמים) |
| `press { color, nextColor }` | `awaitingInput` | שגוי → `lost` (`completedRounds` נשאר `round-1`). נכון ולא אחרון → `inputIndex+1`. נכון ואחרון: אם `round===10` → `won`, `completedRounds=10`; אחרת `completedRounds=round`, `round+1`, `sequence=[...sequence, nextColor]`, `presenting`, `presentationId+1`, `roundIntro=true` |
| `dismiss` | `won` / `lost` | `initialGameState` תוך שמירת `gameId` ו-`presentationId` (ADR-5) |
| `abandon` | `presenting` / `awaitingInput` | `idle` (כמו `dismiss`), `presentationId+1`. **זמני** – מוחלף ב-`pause` ב-Milestone 3 (ADR-3) |

- `nextColor` מגיע תמיד עם `press` (מיוצר ב-Hook), כדי שה-Reducer יישאר דטרמיניסטי; משתמשים בו רק במעבר שלב.
- שלב 11 אינו אפשרי: השלמת שלב 10 עוברת ל-`won`, ושם `press` לא חוקי.

## 4. מנוע האודיו – `src/audio/audio.ts`

- `AudioContext` יחיד, נוצר בעצלות. `unlockAudio(): Promise<boolean>` – יוצר/מחדש (`resume()`) את ה-Context; נקרא **רק** מתוך הלחיצה על "התחל משחק" (ARCHITECTURE §2.4). מחזיר `false` אם אין Web Audio או ש-`resume()` נכשל / ה-State אינו `running`.
- `startTone(color): () => void` – Oscillator (`triangle`) + `GainNode` עם Envelope קצר (Attack/Release של ~10–20ms, למניעת קליקים); מחזיר פונקציית עצירה. תדרים נבדלים לכל צבע (שמורים ב-`colors.ts`): ירוק `415Hz`, אדום `310Hz`, צהוב `252Hz`, כחול `209Hz`.
- `playWin()` – מוטיב עולה קצר (ארבעה צלילים, ~800ms). `playLose()` – צליל נמוך יורד (~700ms, `sawtooth` מרוכך). שני המוטיבים שונים בבירור מצלילי הצבעים.
- `stopAll()` – עוצר מיד כל Oscillator פעיל (נשמרים ב-Set).
- כל קריאה כשאין Context פעיל היא No-op בטוח (לא זורקת).

## 5. ה-Hook – `src/game/useGame.ts`

ממוקם ב-`App` (ADR-2), כדי שמעבר מסכים לא יפרק אותו. מחזיר: `state`, `litColor`, `displayRound`, `endMessageShown`, `audioError`, ופונקציות `startGame()`, `pressStart(color)`, `pressEnd()`, `dismiss()`, `abandon()`, `setHomeVisible(bool)`.

**התחלת משחק:** `startGame` נקרא ישירות מ-Handler הלחיצה (Gesture) → `await unlockAudio()`. כשל → `audioError = true`, נשארים ב-`idle` (אין הצגה שקטה מדומה; ARCHITECTURE §2.4). הצלחה → `audioError=false`, `dispatch(start{ firstColor: randomColor() })`.

**Sequence Controller (Effect על `status==='presenting'` + `presentationId`):**
- יוצר `AbortController`; כל ה-Timers נרשמים ונמחקים ב-Cleanup יחד עם `stopAll()` וכיבוי ההארה.
- לוח זמנים: אם `roundIntro` → `displayRound = round-1` במשך `ROUND_DONE_HOLD_MS`, ואז `displayRound = round`, ואז `NEXT_ROUND_LEAD_MS`; אחרת `LEAD_IN_MS`. לאחר מכן לכל צבע: `litColor=c` + `startTone(c)` למשך `FLASH_MS`, כיבוי, `GAP_MS` (לא אחרי האחרון). בסוף: `dispatch(presentationDone{ presentationId })`.
- כל Callback בודק `signal.aborted` לפני שהוא משנה משהו; ה-Reducer בנוסף מתעלם מ-`presentationId` ישן (ADR-3).
- `displayRound` הוא נתון תצוגה בלבד (שלא משנה את כללי המשחק); בכל מצב אחר הוא שווה ל-`round`.

**לחיצת שחקן (ADR-2):**
- `pressStart(color)` – פועל רק ב-`awaitingInput`. מדליק `litColor=color` + `startTone(color)` מיד, ואז `dispatch(press{ color, nextColor: randomColor() })`.
- ההארה והצליל נמשכים עד `pressEnd()` (שחרור), ולפחות `PRESS_MIN_MS`; השחרור נקלט ב-`window` (`pointerup`/`pointercancel`), כי הרבע עשוי להפוך ל-`disabled` לפני השחרור.
- לחיצה שגויה: צליל הלחצן מושמע מיד, כרגיל (PRD §4.2).

**סיום (ADR-10):**
- הכניסה ל-`won`/`lost` מיידית בלחיצה המכריעה. Effect על הכניסה מפעיל Timer של `END_DELAY_MS`, ובסיומו: `endMessageShown=true`, `playWin()`+`fireConfetti()` או `playLose()`.
- אם המשתמש עבר ל"אודות" בתוך השנייה הזו – ה-Timer מבוטל, והמשחק **אינו** מבוטל (כבר הסתיים). כשמסך הבית מוצג שוב (`setHomeVisible(true)`), ההודעה מוצגת מיד עם הצליל, ובניצחון גם הקונפטי.
- יציאה מ-`won` (`dismiss`) מנקה את הקונפטי (`resetConfetti()`) ב-Cleanup. `endMessageShown` מתאפס ב-`dismiss`.

**`abandon()` (פתרון זמני):** נקרא מ-`App` לפני מעבר ל"אודות" כשהסטטוס `presenting`/`awaitingInput`: `stopAll()`, כיבוי הארה, ביטול Timers ו-`dispatch(abandon)`. אינו חל על `idle`/`won`/`lost`.

**Unmount / Refresh:** Cleanup מבטל הכל. מצב המשחק חי ב-Memory בלבד – Refresh מתחיל מ-`idle` (אין קוד מיוחד).

## 6. קונפטי – `src/effects/confetti.ts`

- `fireConfetti()` – פרץ אחד או שניים של `canvas-confetti` בצבעי הלוח (`#00D26A`, `#FF3B30`, `#FFD600`, `#00A3FF`) עם `disableForReducedMotion: true` (ARCHITECTURE §2.4). `resetConfetti()` – `confetti.reset()`.
- נקרא **רק** במעבר ל-`won`. בבדיקות המודול מוחלף ב-Mock.

## 7. רכיבי UI

**`SimonBoard`** – Props: `litColor`, `dimmed` (בזמן הצגה), `inputEnabled`, `onPressStart(color)`.
- `onPointerDown` (ולא `click`) על כל רבע; `onKeyDown` Enter/Space ל-`pressStart` ו-`onKeyUp` ל-`pressEnd`, לנגישות.
- `disabled` כש-`!inputEnabled`, כך שלחיצות בזמן הצגה / סיום / לפני משחק לא עושות דבר.
- מצבים חזותיים ב-CSS בלבד (ADR-1): `.is-lit` – בהירות מוגברת + Glow (`box-shadow`/`filter: brightness`) בצבע הרבע; `.is-dim` בזמן הצגה – כל רבע שאינו מואר מעומעם (לפי Mockup "הצגת רצף"). מעבר הארה קצר (`transition` ~80ms), מכבד `prefers-reduced-motion`.
- `cursor` רגיל כשהקלט חסום; ללא `user-select` ו-`touch-action: manipulation` (קיים).

**`HomeScreen`** – Props מה-Hook. לפי DESIGN §1.1 ו-Mockups:

| מצב | חיווי שלב | שורת סטטוס (מעל הלוח) | מתחת ללוח |
|---|---|---|---|
| `idle` | "שלב 1 מתוך 10" | ריקה, או הודעת כשל אודיו | כפתור **"התחל משחק"** |
| `presenting` | `displayRound` | "המשחק מציג את הרצף" | "המתן..." |
| `awaitingInput` | `round` | "התור שלך" | "הקש על הצבעים לפי הסדר" |
| `won`/`lost` | השלב האחרון שהיה פעיל | ריקה | `EndDialog` מעל הלוח (אחרי ההמתנה) |

- הודעת כשל אודיו: **"לא ניתן להפעיל את הצלילים. לחץ שוב על "התחל משחק"."** – בצבע אדום-בהיר עדין, `aria-live`.
- אזור "מתחת ללוח" שומר גובה קבוע, כדי שהלוח לא יקפוץ.

**`EndDialog`** – `role="dialog"`, `aria-modal`, `aria-labelledby`; מיקום `absolute` מעל אזור הלוח (Overlay שמשאיר את הלוח מזוהה ברקע), כרטיס `Surface` עם גבול כחול ופינות מעוגלות (Mockups).
- ניצחון: כותרת **"כל הכבוד! ניצחת!"** (ירוק/לבן לפי Mockup) + "שלבים שהושלמו: 10".
- הפסד: כותרת **"נפסלת!"** באדום + **"שלבים שהושלמו: X"** (`bdi` למספר) – לפי ה-`completedRounds`, ולא השלב שבו אירעה הטעות.
- כפתור ראשי **"אישור"** בתוך הכרטיס (ADR-5; ה-Mockup מציג "שחק שוב" – הוחלף לפי בקשת המשתמש) → `dismiss()`. מוקד עובר לכפתור בפתיחה.

**`App`** – מחזיק `useGame()`. `onNavigate('about')` קורא קודם ל-`abandon()` (אם המשחק פעיל) ואז מחליף מסך; קורא ל-`setHomeVisible(screen==='home')`.

## 8. בדיקות

**`gameReducer.test.ts`** (Unit, ללא Mocks):
- `start` → רצף באורך 1, `round=1`; Actions לא חוקיים מחזירים state זהה.
- סימולציה של שלבים 1→10 עם צבעים קבועים: אורך הרצף = מספר השלב (1, 2 ... 10) ורצף השלב הקודם הוא prefix של הבא; צבע חוזר מותר.
- `press` בזמן `presenting` לא משנה דבר; לחיצה נכונה מקדמת רק `inputIndex`.
- הפסד בשלב 1 → `lost`, `completedRounds=0`; הפסד בשלב 5 → `completedRounds=4`; ניצחון אחרי שלב 10 → `won`, `completedRounds=10`, ואין שלב 11 (`press` נוסף מתעלם).
- `presentationDone` עם מזהה ישן מתעלם; `dismiss` מחזיר ל-`idle`; `start` אחרי `dismiss` נותן `gameId` חדש ורצף חדש.

**`App.test.tsx`** (אינטגרציה: `vi.useFakeTimers()`, `fireEvent` סינכרוני; Mock ל-`audio/audio.ts`, `effects/confetti.ts` ו-`game/random.ts`):
- "התחל משחק" → `unlockAudio` נקרא; בזמן הצגה הרבעים `disabled` ולחיצה עליהם לא משנה דבר; אחרי `1000 + 600` מופיע "התור שלך".
- קצב: בדיקה שהצבע מואר בדיוק `600ms` ושהפער `250ms`, וזהה בשלב 1 ובשלב 3.
- כל צבע קורא ל-`startTone` עם הצבע הנכון; לחיצה שגויה → `startTone` מיד, ואחרי `1000ms` בלבד `playLose` + "נפסלת!" + "שלבים שהושלמו: 0"; `fireConfetti` לא נקרא.
- ניצחון מלא (10 שלבים) → אחרי `1000ms` "כל הכבוד! ניצחת!", `playWin`, `fireConfetti` נקרא פעם אחת.
- "אישור" → חזרה ל"התחל משחק" ו"שלב 1 מתוך 10"; משחק נוסף מקבל רצף חדש (`randomColor` נקרא שוב).
- `unlockAudio` מחזיר `false` → הודעת כשל, נשארים ב-`idle`, אין הצגה.
- מעבר ל"אודות" באמצע הצגה ובאמצע קלט → `stopAll` נקרא, אין Timers פעילים (`vi.getTimerCount()===0`), וחזרה לבית מציגה "התחל משחק".
- יציאה ל"אודות" בתוך שניית ההמתנה לפני הודעת הסיום → בחזרה ההודעה מוצגת מיד.
- בדיקות Milestone 1 הקיימות ממשיכות לעבור.

## 9. בדיקה ידנית (שלי, לפני סימון 🟡)

- `npm run typecheck`, `npm test`, `npm run build` עוברים.
- `npm run dev` ובדיקה בדפדפן באמולציית מובייל: משחק מלא, צלילים שונים, הארה, הפסד וניצחון עם קונפטי, "אישור", מעבר ל"אודות" באמצע משחק, Refresh באמצע משחק.
- בדיקת אודיו ומגע על טלפון אמיתי אינה בידי – אציין זאת ואבקש ממך לבדוק.

## 10. תיעוד

- סימון 🟡 ליד Milestone 2 ב-`MILESTONES.md` בסיום הבנייה.
- ADR-11 ב-`ARCHITECTURE.md`: "מעבר בין שלבים כשלב תצוגה בתוך `presenting`" (`roundIntro` + `displayRound`, כדי לממש את שתי ההמתנות של DESIGN בלי מצב משחק נוסף שאינו ב-spec).
