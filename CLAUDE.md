# CLAUDE.md: 30-Day Finance App Challenge

## System Behavior (CRITICAL)

- **Step-by-Step Execution:** Do not attempt to build the entire app at once. Perform the specific task requested, verify it works, and STOP.
- **Wait for Input:** After completing a step, wait for my feedback or the next instruction before proceeding.
- **No Over-Engineering:** Stick strictly to the current mission. Do not add "extra" features I haven't asked for yet.

## Technical Architecture & Language Selection

- **Python Usage:** Use Python for "The Brain." This includes data science, technical indicators (Pandas/TA-Lib), AI/Gemini integration, and backtesting logic.
- **Ruby Usage:** Use Ruby (or Rails) for "The System." This includes high-level automation, file management scripts, rapid prototyping of web backends, or any task requiring elegant, human-readable logic flow.
- **Mobile-First:** Ensure large touch targets and readable text on small screens.
- **Clean Code:** No console logs, no unused imports. Centralize API logic in lib/services/.

## Security & Environment Rules

- **No Private Keys:** NEVER display or hardcode actual API keys, secrets, or passwords in the chat or code.
- **Env Variable Naming:** When creating labels for API keys (e.g., in .env files), DO NOT use the NEXT_PUBLIC_ prefix. Use clean, direct labels like FINANCE_API_KEY or GEMINI_SECRET.
- **Placeholder Usage:** Always use placeholders like YOUR_API_KEY_HERE for documentation.

## Design & Theme (Standardized)

- **Background:** Always `bg-slate-950` (Deep Dark Mode).
- **Cards:** `bg-slate-900` with `border border-slate-800` and `rounded-xl`.
- **Typography:** Sans-serif (Inter). Headings: `text-slate-100`, Subtext: `text-slate-400`.
- **The Traffic Light Palette:**
  - Success/Buy: `text-emerald-400` / `bg-emerald-500/10`
  - Warning/Wait: `text-amber-400` / `bg-amber-500/10`
  - Danger/Sell: `text-rose-400` / `bg-rose-500/10`
  - Neutral: `text-sky-400` / `bg-sky-500/10`

## Tone & Language (Beginner-First)

- **The "Friend" Test:** No jargon. Explain concepts simply (e.g., "Momentum" instead of "Relative Strength Index").
- **Legal Safety:** Use "Likely," "Potential," or "Historically." NEVER promise profits or use certainties.
- **The "Aha!" Moment:** Every app must feature one clear visual (Gauge, Meter, or Light) that gives an answer in <3 seconds.
