# What suits me

A one-page clothing suggestion tool built with React, Vite and Convex. No login, payments or shopping deals.

Users choose skin tone, hair colour, approximate height in centimetres, body shape and preferred style. One button requests five colours, three garment cuts and three clothing types, each with a short reason.

## Add your OpenAI key yourself

Never put a key in chat, source code, GitHub, or a `VITE_` variable.

1. Open https://dashboard.convex.dev and select the `build-sprint-app` project.
2. Select the **Development** deployment (`resolute-pig-986`).
3. Open **Settings → Environment Variables**.
4. Add a variable named exactly `OPENAI_API_KEY`.
5. Enter your OpenAI key in the value field and save it.
6. Switch to the **Production** deployment (`tough-bison-945`).
7. Repeat steps 3–5 there. Development and production have separate variables.
8. Return to the page and press **Show me what suits me**. No code change or redeploy is needed after saving a key.

See https://docs.convex.dev/production/environment-variables for the dashboard guide.

## Run locally

```powershell
cd C:\Users\HP\build-sprint-app
npm install
npx convex dev
```

In a second terminal in the same folder, run `npm run dev`. Vite reads the existing `CONVEX_URL` from `.env.local` (or `VITE_CONVEX_URL` if set).

## Check and publish

```powershell
npm test
npm run build
npm run deploy
```

`npm run deploy` builds for production, pushes the Convex backend, and uploads the frontend using `@convex-dev/static-hosting`. Pushing to GitHub alone does not deploy.

Development: https://resolute-pig-986.convex.site

Production: https://tough-bison-945.convex.site

## Backend rules

- Only `convex/stylist.ts` calls OpenAI. It reads `process.env.OPENAI_API_KEY`.
- Uses Responses API with `model: "gpt-6-luna"` and `max_output_tokens: 500`, no automatic retries, a 30-second timeout and `store: false`.
- Validates user input and checks exactly 5/3/3 returned suggestions, nonempty reasons and valid colour hex values. Incomplete responses show a plain error instead of partial results.
- A Convex mutation reserves one slot atomically before each provider attempt. No more than 50 calls in any rolling hour, shared by all visitors on that deployment. Development and production are separate environments with separate counters. Failed provider attempts count; missing keys and invalid input do not.
- Stores only a bounded list of call timestamps, never profiles or results. Inputs are sent to OpenAI to generate the answer; results remain in page memory.
- Tests cover simultaneous reservations, hourly expiry, request settings, valid results, provider failure, malformed results, missing key, and invalid height. Provider calls in tests are simulated; those tests do not prove live OpenAI access.
