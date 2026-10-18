# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`book-reviews-app` is an academic lab project: a Book Reviews System (Sistema de Reseñas de Libros).

- **Stack:** React, Vite, JavaScript (no TypeScript), `@supabase/supabase-js`. Oxlint is the linter.
- **Data model (SPEC 01, Implementada, 14/14 acceptance criteria validated):** tables `readers`, `books` and `reviews` exist in Supabase with RLS enabled. `anon` and `authenticated` can `SELECT` all three tables and `INSERT` only into `reviews`; they have no `UPDATE` or `DELETE`. The migrations (`create_book_reviews_tables`, `grant_and_rls_book_reviews`) live in Supabase, not in the repo. The 4/5/5 seed counts are the historical validation of SPEC 01, not a limit: frontend tests add reviews, so do not treat higher counts as an error or delete rows to restore them.
- **Methodology:** Spec-Driven Development (SDD). Specs live in `specs/NN-slug.md`; draft them with the `/nuevo-spec` skill. A spec must be `Aprobada` before it is implemented. `specs/01-modelo-datos.md` is `Implementada`.

## Commands

- `npm run dev`: start the Vite dev server with HMR
- `npm run build`: production build to `dist/`
- `npm run preview`: serve the production build locally
- `npm run lint`: lint with Oxlint (config in `.oxlintrc.json`)

There is no test runner configured yet.

## Architecture

A book-reviews web app built on the stock React 19 + Vite 8 template (plain JavaScript/JSX, no TypeScript). Right now it is still the untouched scaffold:

- `index.html` loads `src/main.jsx`, which mounts `<App />` inside `StrictMode`. `src/App.jsx` still holds the template's demo content.
- `@supabase/supabase-js` is installed as the intended backend (auth/database), but nothing uses it yet. When you add it, read the credentials from Vite env vars (`import.meta.env.VITE_*`, for example `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`) kept in a `.env.local` file, and create one shared client module instead of calling `createClient` in each component.
- Static assets in `public/` are served from the root path (e.g. `/icons.svg#id`). Assets in `src/assets/` are imported through the bundler.

## Lint rules

Oxlint runs with the `react` and `oxc` plugins. `react/rules-of-hooks` is an error. `react/only-export-components` warns (constant exports are allowed), so keep component files exporting only components so Fast Refresh keeps working.
