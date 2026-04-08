# TARIQUI — Master Task Document
> Covoiturage platform for Tunisia | HTML + CSS + JS frontend → Node.js backend
> Last updated: 2026-04-03
> Status: Planning phase complete. Ready to prompt.

---

## Project Overview

**Tariqui** is a Tunisian carpooling platform. The landing page is a single-page experience split into 7 distinct sections, each with its own personality. The design reference is Bookme.com (see `desktop_version.png`) — we're borrowing its editorial confidence and horizontal-scroll patterns, but the identity should feel distinctly Tunisian: warm, direct, human.

The repo currently has `index.html`, `styles.css`, `script.js`, city images (Tunis, Sousse, Sfax, Bizerte, Gabès), the logo, and a hero photo. The old code is a valid starting skeleton but will be largely replaced section by section.

**We are NOT iterating on the old code. We are rebuilding with intention, prompt by prompt.**

---

## File Structure (Target)

```
tariqui/
├── index.html               ← Single page, all 7 sections
├── styles.css               ← Global tokens + per-section styles
├── script.js                ← Scroll behavior, carousels, interactions
├── driver.html              ← "Become a driver" page (linked from Section 5)
├── assets/
│   ├── logo tariqi 1.png
│   ├── icone.png
│   ├── hero-bg.jpg          ← Full-bleed background image (hero)
│   ├── tunis.jpeg
│   ├── sousse.webp
│   ├── sfax.jpg
│   ├── bizerte.jpg
│   ├── gabes.jpg
│   └── [rating avatars if needed]
├── backend/                 ← Node.js (tackled after frontend is solid)
│   ├── server.js
│   ├── routes/
│   │   ├── trips.js
│   │   ├── auth.js
│   │   └── bookings.js
│   ├── models/
│   │   ├── Trip.js
│   │   ├── User.js
│   │   └── Booking.js
│   ├── db.js                ← SQLite or JSON file-based for simplicity
│   └── package.json
```

---

## Design System (Establish Once, Reference Always)

These tokens must be defined in `:root` in `styles.css` and never hardcoded again.

```css
/* Color palette — brand colors (Pantone sourced, exact hex) */
--color-sky: #ADD8E5;          /* Pantone 118-11 C — light blue, backgrounds/accents */
--color-green: #699D71;        /* Pantone 147-4 C — forest green, primary actions */
--color-green-dark: #4e7a56;   /* darkened green for hover states */
--color-yellow: #FFD522;       /* Pantone 7-7 C — golden yellow, highlights/CTA */
--color-yellow-dark: #e6be00;  /* darkened yellow for hover */

/* Neutral base — keep it light, let the brand colors breathe */
--color-bg: #f7f9f8;           /* near-white with a barely-there green tint */
--color-surface: #ffffff;
--color-surface-2: #eef4f0;    /* sky-tinted surface for alternating sections */
--color-text: #1a2e1d;         /* deep forest, not pure black */
--color-text-muted: #5a7060;   /* muted green-grey */
--color-border: rgba(105,157,113,0.2);

/* Typography */
--font-display: 'Syne', sans-serif;         /* headings — geometric, strong */
--font-body: 'Instrument Sans', sans-serif; /* body — readable, warm */

/* Spacing scale */
--space-xs: 0.5rem;
--space-sm: 1rem;
--space-md: 2rem;
--space-lg: 4rem;
--space-xl: 8rem;

/* Radius */
--radius-sm: 6px;
--radius-md: 14px;
--radius-lg: 28px;
--radius-pill: 999px;
```

**Color usage rules:**
- `--color-green` → primary CTAs, nav active states, section headings
- `--color-yellow` → secondary CTAs, highlights, price tags, "Rechercher" button
- `--color-sky` → backgrounds for alternating sections, card accents, subtle fills
- Never use all three at full saturation in the same component — one dominates, others support

**Aesthetic direction:** Light, human, approachable. Think sunny road trip, open windows, good company. Not corporate, not dark — this is a daytime brand. White space is generous, colors pop against clean backgrounds, rounded shapes echo the Pantone blob shapes from the brand palette itself.

---

## Sections Map

| # | Section ID | Section Name | Status | Prompt # |
|---|---|---|---|---|
| 0 | `#header` | Header / Nav | ⬜ Not started | P-01 |
| 1 | `#hero` | Hero + Search Bar | ⬜ Not started | P-02 |
| 2 | `#destinations` | Major Destinations (Horizontal Scroll) | ⬜ Not started | P-03 |
| 3 | `#ratings` | User Ratings Carousel | ⬜ Not started | P-04 |
| 4 | `#how-it-works` | Comment ça marche | ⬜ Not started | P-05 |
| 5 | `#conducteur` | Conducteur CTA Section | ⬜ Not started | P-06 |
| 6 | `#about` | About Us | ⬜ Not started | P-07 |
| 7 | `#footer` | Footer | ⬜ Not started | P-08 |
| — | `driver.html` | Driver Signup Page | ⬜ Not started | P-09 |
| — | Scroll Animations | JS scroll behavior, parallax, transitions | ⬜ Not started | P-10 |
| — | Backend: Setup | Node.js + Express + DB init | ⬜ Not started | P-11 |
| — | Backend: Trips API | GET/POST trips, search by route+date | ⬜ Not started | P-12 |
| — | Backend: Auth | Register / Login / Sessions | ⬜ Not started | P-13 |
| — | Backend: Bookings | Book a seat, cancel, confirm | ⬜ Not started | P-14 |
| — | Backend: Connect | Wire search bar to real API | ⬜ Not started | P-15 |

---

## Prompt Specifications

---

### P-01 — Header / Navigation

**What it is:** A fixed top bar, always present. On load it floats over the hero image with a transparent background and a soft dark shadow — not a solid bar, just presence. It contains the logo on the left, nav links in the center, and action buttons on the right.

**Exact requirements:**
- Logo: `logo tariqi 1.png`, sized appropriately, no border or shadow
- Nav links: `Covoiturage`, `Comment ça marche`, `À propos` — clean, no underline, hover gets `--color-primary` with a subtle underline slide-in
- Actions: two buttons — `Se connecter` (ghost/outline style) and `Proposer un trajet` (filled, `--color-primary`, pill shape)
- On scroll past the hero: the header background transitions to `--color-surface` (white) with a soft `box-shadow` and `backdrop-filter: blur(12px)` — smooth, not instant
- Mobile: hamburger icon on the right that opens a full-width dropdown menu below the header; links and buttons stack vertically; the hamburger animates to an X on open
- No JavaScript framework. Pure HTML/CSS/JS. The scroll class toggle is JS.

**What to avoid:** No box shadows that look cheap. No white background. No underlines on links by default.

---

### P-02 — Hero Section + Search Bar

**What it is:** The first impression. Full-viewport-height section with a large background image (use `amis-dans-voiture-faisant-voyage-ensemble_23-2149073959.avif` from the repo), a dark gradient overlay so text is readable, and a search bar floating at the bottom of the section. Headline text is large, white, unapologetic.

**Exact requirements:**
- Background: `background-image` on the section, `background-size: cover`, `background-position: center`
- Overlay: a `::before` pseudo-element with `background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)`
- Headline: two-line display. Line 1: `"Voyagez ensemble"`, Line 2: `"à travers la Tunisie."` — use `--font-display`, large (clamp between 2.5rem and 5rem). White.
- Subtext beneath headline: `"Des conducteurs vérifiés, des trajets partagés, une route commune."` — muted, smaller
- Search bar: a horizontally laid row of inputs fixed near the bottom of the hero, with a white background (`rgba(255,255,255,0.92)`, `backdrop-filter: blur(16px)`), rounded corners (`--radius-lg`), and a subtle shadow. Fields: Départ (text), Destination (text), Date (date picker), Passagers (select 1-4). CTA button: `Rechercher` in `--color-yellow` with `--color-text` label (dark text on yellow reads better than white)
- On mobile: search bar fields stack 2x2 then button full-width

**What to avoid:** No hero image carousel. No animated text on this section — that's a separate scroll animation prompt. No placeholder text that sounds generic.

---

### P-03 — Major Destinations (Horizontal Scroll)

**What it is:** A section that reveals the most traveled routes in Tunisia. Cards scroll horizontally, each card showing a city photo, the city name, and a "from X DT" price hint. Photos come from the repo: `tunis.jpeg`, `sousse.webp`, `sfax.jpg`, `bizerte.jpg`, `gabes.jpg`. Add 2 more: Hammamet and Djerba (use a placeholder or Unsplash direct URL).

**Exact requirements:**
- Section heading: `"Destinations populaires"` — left-aligned, `--font-display`
- Subheading line: `"Les routes les plus empruntées par nos voyageurs."` — muted
- Cards: minimum width `240px`, height `320px`, `border-radius: --radius-md`. Image fills the card with `object-fit: cover`. A gradient overlay at the bottom reveals the city name and price.
- City name: white, bold, bottom of card
- Price tag: `"À partir de X DT"` in `--color-green`, smaller, bold
- Horizontal scroll container: hide the scrollbar but keep it scrollable (`overflow-x: auto`, `::-webkit-scrollbar { display: none }`). Add scroll snap (`scroll-snap-type: x mandatory`, cards have `scroll-snap-align: start`).
- Arrow buttons (prev/next) outside the scroll area on desktop. On mobile, swipe only — no arrows.
- Clicking a card pre-fills the search bar's Destination field with that city name and scrolls back up to the hero.

**Cities and prices to hardcode for now:**
- Tunis — À partir de 5 DT
- Sousse — À partir de 8 DT
- Sfax — À partir de 12 DT
- Bizerte — À partir de 7 DT
- Gabès — À partir de 15 DT
- Hammamet — À partir de 6 DT
- Djerba — À partir de 22 DT

---

### P-04 — User Ratings Carousel

**What it is:** Social proof. A horizontally auto-scrolling (no user interaction required, but pausable on hover) strip of testimonial cards. Each card has a user avatar (initials-based colored circle if no photo), a star rating, a short quote, and the route they traveled.

**Exact requirements:**
- Section heading: `"Ce qu'ils disent de Tariqui"` — centered
- Cards auto-scroll left continuously (CSS `animation: scroll linear infinite`), pauses on `hover`
- Each card: `--color-surface` background with a `--color-border` border, `--radius-md`, padding `1.5rem`. Avatar circle uses `--color-sky`. Stars in `--color-yellow`. Route line in `--color-text-muted`.
- Duplicate the card array to create seamless infinite loop

**The 4 ratings to include (add 3 more if needed to fill the strip):**
> *(You will provide these. Placeholder format below — replace before prompting.)*
1. Name: `[à compléter]` | Route: `[à compléter]` | Stars: 5 | Quote: `[à compléter]`
2. Name: `[à compléter]` | Route: `[à compléter]` | Stars: 5 | Quote: `[à compléter]`
3. Name: `[à compléter]` | Route: `[à compléter]` | Stars: 4 | Quote: `[à compléter]`
4. Name: `[à compléter]` | Route: `[à compléter]` | Stars: 5 | Quote: `[à compléter]`

**Generated fillers (use if you don't provide all 7):**
5. Yasmine B. | Sousse → Tunis | ★★★★★ | `"Rapide, propre et sympa. Je re-réserve dès demain."`
6. Mehdi K. | Tunis → Sfax | ★★★★★ | `"Trajet parfait. Le conducteur m'a même donné des conseils sur Sfax."`
7. Lina T. | Bizerte → Tunis | ★★★★☆ | `"Très bon service. L'appli est claire et le trajet s'est bien passé."`

---

### P-05 — Comment ça marche

**What it is:** Three-step explainer. Not a boring icon grid — make it feel like a sequence. Steps are: `Recherchez`, `Réservez`, `Voyagez`. Each step has a large step number (visually dominant), an icon, a title, and 1-2 sentences.

**Exact requirements:**
- Section heading: `"Comment ça marche ?"` — left-aligned
- Layout: three columns on desktop, one column stacked on mobile with a connector line between steps
- Step numbers: huge, `--color-primary`, low opacity (`0.15`), behind the content — acts as a decorative background number
- Icons: SVG line icons (search, calendar/checkmark, car/road) — provide your own or generate minimal ones
- Connector between steps: a dashed horizontal line on desktop (`border-top: 2px dashed --color-border`), vertical on mobile
- Step titles use `--font-display`, descriptions use `--font-body`

**Copy:**
- Step 1 — Recherchez: `"Entrez votre ville de départ, votre destination et la date souhaitée. Trouvez un trajet qui vous convient en quelques secondes."`
- Step 2 — Réservez: `"Choisissez votre conducteur, réservez votre place et recevez la confirmation directement."`
- Step 3 — Voyagez: `"Retrouvez votre conducteur au point de rendez-vous et profitez du trajet. Simple, humain, économique."`

---

### P-06 — Conducteur CTA Section

**What it is:** A dedicated band for drivers. Not a full page — just a punchy section that speaks directly to anyone who drives regularly between cities. Brief copy + a single CTA button that links to `driver.html`.

**Exact requirements:**
- Background: `--color-sky` at ~30% opacity, or a solid `--color-surface-2` — something that visually separates this band from what's above and below without being heavy
- Left side: a bold one-liner headline, 2-3 sentences of body copy
- Right side: one CTA button `"Devenir conducteur →"` in `--color-green` (white text), pill shape, large
- Layout: two-column on desktop, stacked on mobile (text above, button below, centered)

**Copy (use exactly):**
- Headline: `"Vous conduisez déjà. Autant ne pas conduire seul."`
- Body: `"Publiez vos trajets sur Tariqui, remplissez vos places libres et couvrez vos frais d'essence. Des milliers de passagers vous attendent sur les routes de Tunisie."`
- Button: `"Devenir conducteur →"` → links to `driver.html`

---

### P-07 — À propos

**What it is:** The "soul" section. A simple, honest paragraph about who Tariqui is. One column, generous padding, no cards, no icons. Just words.

**Exact requirements:**
- Section heading: `"À propos de Tariqui"` — use `--font-display`
- Body: *(you will provide the paragraph — placeholder below)*
  > `[Votre paragraphe About Us ici — à compléter avant la génération du prompt]`
- Optional: a thin `--color-green` horizontal rule above the heading, or a large faint Arabic letter as background texture in `--color-sky`
- Keep it text-only. No team cards, no stats blocks for now.

---

### P-08 — Footer

**What it is:** A clean, functional footer. Dark, three-column layout. Brand on the left, links in the middle, social icons on the right. Copyright line at the very bottom.

**Exact requirements:**
- Left: logo + tagline `"Covoiturage tunisien. Simple, humain, malin."`
- Center: two columns of links — Pages (`Accueil`, `Trajets`, `Comment ça marche`, `À propos`) and Support (`Aide`, `Contact`, `Signaler un problème`)
- Right: social icons (Facebook, Instagram, LinkedIn) — SVG icons, hover color `--color-green`
- Bottom bar: `"© 2025 Tariqui. Tous droits réservés."` — centered, muted, smaller
- Separator line: `1px solid --color-border` between main footer and bottom bar

---

### P-09 — driver.html (Conducteur Page)

**What it is:** A standalone page, linked from the CTA in Section 5. Not a full app — a landing/signup teaser. Explains the benefits of driving with Tariqui + a simple form (name, phone, city, car model) that submits to the backend.

**Exact requirements:**
- Same header as `index.html` (copy/paste or componentize via JS include)
- Hero: headline `"Gagnez en conduisant vos trajets habituels."`, short subtext, background photo (car interior or road — you'll supply or use a placeholder)
- Benefits: 3 short cards (icon + title + text) — `"Couvrez vos frais"`, `"Choisissez vos passagers"`, `"Voyagez en bonne compagnie"`
- Form: name, phone number, departure city (select from Tunisian cities), car model, message (optional) — POST to `/api/drivers/register`
- Submit button: `"Je veux conduire"` in `--color-green` (white text)

---

### P-10 — Scroll Animations

**What it is:** JS-driven scroll behavior. Handled *after* all sections are complete and static.

**Behaviors to implement:**
1. **Header blur on scroll:** When `window.scrollY > 80`, add class `.scrolled` to header. CSS handles the background + blur transition.
2. **Hero parallax:** Background image moves at 50% scroll speed (`background-position-y` tied to `scrollY`)
3. **Hero fade-out:** Hero section opacity fades from 1 to 0 as user scrolls past it (using `IntersectionObserver` or direct scroll calc)
4. **Section reveal:** Each section (`#destinations`, `#ratings`, etc.) fades + slides up when entering viewport. Use `IntersectionObserver` with a CSS class `.visible` that triggers `opacity: 1; transform: translateY(0)`.
5. **Rating carousel auto-scroll:** Pure CSS `animation` with `animation-play-state: paused` on hover — no JS needed.

**What to avoid:** No GSAP, no heavy animation libraries. Keep it native CSS + vanilla JS. Performance first.

---

### P-11 — Backend: Project Setup

**Stack:** Node.js + Express + better-sqlite3 (zero config, file-based, no server needed)

**Setup steps:**
- `npm init` in `/backend`
- Install: `express`, `better-sqlite3`, `cors`, `dotenv`, `bcrypt`, `jsonwebtoken`
- `server.js`: creates Express app, mounts routes, listens on `PORT=3000`
- `db.js`: initializes SQLite DB, creates tables on first run
- `.env`: `PORT`, `JWT_SECRET`
- Tables to create:
  ```sql
  users (id, name, phone, email, password_hash, role, created_at)
  trips (id, driver_id, departure, destination, date, time, seats, price, created_at)
  bookings (id, trip_id, passenger_id, seats_booked, status, created_at)
  ```

---

### P-12 — Backend: Trips API

**Routes:** `GET /api/trips?from=&to=&date=` and `POST /api/trips` (auth required)

**GET:** Accepts query params `from`, `to`, `date`. Returns matching trips with driver name and remaining seats. If no params, returns all upcoming trips.

**POST:** Creates a new trip. Body: `{ departure, destination, date, time, seats, price }`. Requires valid JWT in Authorization header.

**Response shape:**
```json
{
  "id": 1,
  "departure": "Tunis",
  "destination": "Sfax",
  "date": "2025-07-14",
  "time": "08:00",
  "seats_available": 3,
  "price": 12,
  "driver": { "name": "Ahmed B.", "rating": 4.8 }
}
```

---

### P-13 — Backend: Authentication

**Routes:** `POST /api/auth/register`, `POST /api/auth/login`

**Register:** Accepts `{ name, email, phone, password }`. Hashes password with bcrypt, inserts into `users`. Returns JWT.

**Login:** Accepts `{ email, password }`. Validates hash, returns JWT with `{ id, name, role }` payload.

**Middleware:** `authenticateToken.js` — reads `Authorization: Bearer <token>`, verifies, attaches `req.user` to request.

---

### P-14 — Backend: Bookings

**Routes:** `POST /api/bookings`, `GET /api/bookings/mine`, `DELETE /api/bookings/:id`

**POST:** Reserves seats on a trip. Checks seat availability first. Decrements `trips.seats` in a transaction.

**GET /mine:** Returns all bookings for the authenticated user, joined with trip details.

**DELETE:** Cancels a booking. Restores seats. Only the booking owner can cancel.

---

### P-15 — Frontend ↔ Backend: Wire Search

**What it is:** Replace the hardcoded destinations and dummy search with live API calls.

**Steps:**
1. On search form submit, call `GET /api/trips?from=&to=&date=` with form values
2. Display results below the hero in a results panel (slides down, pushes content)
3. Each result card: departure, destination, date, time, price, driver name, seats left, `"Réserver"` button
4. `"Réserver"` triggers `POST /api/bookings` — if user not logged in, prompt login modal first
5. Handle empty results gracefully: `"Aucun trajet trouvé pour ce parcours."` with a suggestion to try nearby dates

---

## Notes & Conventions

- **Language:** All user-facing copy is French. Code comments can be in English.
- **Accessibility:** All images need `alt`. All interactive elements need focus states. Semantic HTML (`<section>`, `<article>`, `<nav>`, `<main>`, `<footer>`).
- **No jQuery.** No Bootstrap. No CSS frameworks. Everything is hand-written.
- **CSS variables are sacred.** Never hardcode a color or font in a selector — always reference a token.
- **Mobile-first media queries:** Write base styles for mobile, override at `min-width: 768px` (tablet) and `min-width: 1100px` (desktop).
- **Image assets:** All images referenced by relative path. If an image isn't in the repo yet, use a placeholder URL from `https://picsum.photos` temporarily.
- **Sections are independent:** Each prompt produces HTML for one section + its CSS block + any JS it needs. Drop it into the file and it works.

---

## Pending Inputs from You

Before certain prompts can be finalized, you need to supply:

| Item | Needed for | Status |
|---|---|---|
| 4 user ratings (name, route, quote) | P-04 | ⬜ Pending |
| About Us paragraph | P-07 | ⬜ Pending |
| Hero background image preference | P-02 | ⬜ (using existing avif for now) |
| Driver page hero image | P-09 | ⬜ Pending |
| Logo confirmation (is `logo tariqi 1.png` final?) | P-01 | ⬜ Confirm |

---

## Progress Tracker

```
[P-01] Header            ⬜ Not started
[P-02] Hero              ⬜ Not started
[P-03] Destinations      ⬜ Not started
[P-04] Ratings           ⬜ Not started
[P-05] How It Works      ⬜ Not started
[P-06] Driver CTA        ⬜ Not started
[P-07] About             ⬜ Not started
[P-08] Footer            ⬜ Not started
[P-09] driver.html       ⬜ Not started
[P-10] Animations        ⬜ Not started
[P-11] Backend Setup     ⬜ Not started
[P-12] Trips API         ⬜ Not started
[P-13] Auth              ⬜ Not started
[P-14] Bookings          ⬜ Not started
[P-15] Wire Frontend     ⬜ Not started
```
