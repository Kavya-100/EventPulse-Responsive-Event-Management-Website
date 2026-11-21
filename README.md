# EventPulse — Responsive Event Management & Registration Platform

A modern, visually appealing, and fully responsive event management website built with **HTML5, CSS3, TypeScript, and React 19**, styled using **Tailwind CSS v4**.

Designed to empower users to seamlessly discover upcoming events, inspect detailed schedules and featured speakers, track live real-time countdowns, and register for premier gatherings with instant digital ticket issuance and client-side data persistence.

**Project Summary :** [EventPlus Project Summary](https://docs.google.com/document/d/1aAmESrwFKJBtOZmAkfDLKXK2PeIV5p5MRvVPhuj39nI/edit?usp=drivesdk) 

**Live Demo 1:** [https://EventPulse.vercel.app](https://eventpulse-ten-blond.vercel.app/)<br>
**Live Demo 2:** [https://EventPulse.netlify.app](https://eventpulse-responsive-event-management-website.netlify.app/)<br>
**Live Demo 3:**
[https://EventPulse.onrender.com](https://eventpulse-3buk.onrender.com)

## 🌟 Key Features

### 1. Engaging Homepage & Hero Section
- **Hero Value Proposition**: High-impact introduction highlighting the platform's mission and season schedule.
- **Featured Marquee Live Countdown**: Real-time 1-second 4-unit (`Days`, `Hrs`, `Min`, `Sec`) countdown card with direct event preview.
- **Quick Search Jump**: Instant search bar allowing users to find events by title, city, venue, or keyword.
- **Platform Metrics & Trust Signals**: Quantified social proof strip (14,800+ Attendees, 99.4% Check-In Reliability, 4.9/5.0 Satisfaction, 100% Instant Spot Confirmation).

### 2. Upcoming & Featured Events Showcase (Grid & Calendar Views)
- **Curated Highlights**: Flagship marquee events with limited seating.
- **Grid & Monthly Calendar Toggle**: Switch seamlessly between responsive event card grids and an interactive monthly calendar view (`MonthlyCalendarView`) displaying registered and upcoming events by date.
- **Rich Event Cards**:
  - High-resolution thematic photography with graceful fallback handling.
  - Live per-second countdown badges with urgency indicators when under 24 hours remain.
  - Zero-pill metadata line with clean typographic separators (`Date · City`).
  - Reconciled real-time seat capacity progress bars (`87% booked`, spots remaining, or `Sold Out` with `Join Waitlist`).
  - Clean admission pricing tags (`Free` or `$USD`).
  - Dual action buttons: **Details** and **Register** (or **Join Waitlist** at full capacity).

### 3. Search, Location & Multi-Category Filtering
- **Keyword Search**: Instant query filtering matching event titles, cities, venues, descriptions, and tags.
- **Location Filter**: Filter events by specific city or geographic region (`North America`, `Europe`, etc.).
- **Category Tabs**: One-click filtering across `Technology`, `Music & Concerts`, `Business & Leadership`, `Design & Arts`, `Sports & Wellness`, and `Culinary & Culture`.
- **Price Filters**: Toggle between `All Prices`, `Free`, and `Paid`.
- **Sorting Options**: Sort by `Upcoming Date`, `Most Popular`, `Price: Low to High`, or `Price: High to Low`.
- **Filter Reset**: One-click reset whenever active filters are applied.

### 4. Comprehensive Event Details View
- Detailed modal presenting:
  - High-precision live countdown clock (**Days**, **Hours**, **Minutes**, **Seconds** updating every second).
  - Interactive venue map preview (`VenueMapPreview`) with street/minimal toggle.
  - **Nearby Events (Geolocation API)**: Discovers upcoming events within a 50-mile radius of the user's current coordinates.
  - **Public Event Comments (`EventComments`)**: Leave and manage persistent public attendee comments stored per event in `localStorage`.
  - Featured speakers & keynote panelists with names, roles, and organizations.
  - Complete agenda & timeline breakdown with session schedules.
  - Direct organizer contact links (email & phone) plus a **Share via Email** (`mailto:`) button pre-filled with event details, title, and deep link.

### 5. JavaScript-Based Form Validation, Registration & Waitlist
- Strict client-side validation ensuring data integrity before submission:
  - **Participant Full Name**: Trimmed, minimum 2 characters, letters and standard punctuation only.
  - **Email Address**: RFC-compliant regex validation.
  - **Phone Number**: Valid international/domestic phone format (7 to 15 digits).
  - **Event Selection**: Pre-selected or chosen via dynamic dropdown.
  - **Ticket Type**: General Admission, VIP Pass, or Student/Early Bird.
  - **Ticket Quantity**: Configurable (1 to 5 passes, capped by remaining seats).
  - **Terms Acceptance**: Required checkbox agreeing to attendee safety and conduct code.
- **Priority Waitlist Support**: Automatically switches to **Join Waitlist** when an event reaches full capacity, saving waitlist entries separately in `localStorage` with duplicate prevention and queue positions.
- **Real-Time Inline Error Feedback**: Accessible `aria-invalid` inputs with red borders and descriptive error labels.

### 6. Digital Ticket Pass, QR Export & Sharing
- Upon valid submission and inside the **My Tickets** modal:
  - Scannable, unique QR codes dynamically generated using `qrcode.react` with Level H (High) error correction.
  - **Share Ticket** flow generating a shareable verification link (`?ticket=...`) and exporting a branded high-resolution `.png` QR code pass image.
  - Downloadable `.txt` ticket credential file and unique verifiable Ticket Reference Code (e.g. `EP-AI-4921-A9`).

---

## 🚀 Bonus Challenges & Extra Capabilities

| Feature | Implementation Details |
| :--- | :--- |
| **Dark / Light Mode + Theme Preview** | Tailwind CSS v4 `@custom-variant dark (&:where(.dark, .dark *));` with persistent toggle and a live **Theme Preview** popover demonstrating light/dark transitions. |
| **Event Countdown Timers** | Real-time 1-second interval tickers across the Hero Marquee, Event Cards, and Event Detail modal. |
| **Animations & Motion** | Custom CSS keyframe animations (`fade-in`, `slide-up`, `modal-pop`, `card-enter`) with `prefers-reduced-motion` accessibility support and smooth hover elevations. |
| **Local Storage Registration Manager** | Persistent `localStorage` wallet with startup seat-count reconciliation, inline registration editing, JSON backup **Export / Import**, waitlist queue management, and two-step **Clear All**. |
| **My Analytics Dashboard** | Interactive Recharts visualizations tracking attendee growth curves, ticket sales, capacity utilization, and revenue for user-created custom events. |
| **Host / Create New Event** | Organizer submission modal enabling users to publish custom events with instant catalog listing and `localStorage` persistence. |
| **Geolocation & Notifications** | Browser Geolocation API (50-mile nearby suggestions) and Browser `Notification` API reminders for event start times. |

---

## 🛠️ Technology Stack

- **Framework**: React 19 (TypeScript)
- **Bundler & Dev Server**: Vite 8
- **Data Visualization**: Recharts
- **QR Code Generation**: `qrcode.react` (SVG & Canvas renderer with high-res PNG export)
- **Styling**: Tailwind CSS v4 (with `@custom-variant dark` and custom `@keyframes` tokens)
- **Typography**: Plus Jakarta Sans (Headings) & DM Sans (Body)
- **Icons**: Lucide React
- **Unit Testing**: Node.js built-in test runner (`node:test` + `node:assert/strict`) via `tsx`

---

## 📂 Project Architecture

```
/
├── index.html                   # HTML5 entry point with typography & SEO metadata
├── package.json                 # Project dependencies & scripts
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration with Tailwind CSS v4
├── src/
│   ├── assets/images/           # High-resolution generated event photography
│   ├── components/
│   │   ├── Navbar.tsx               # Top bar navigation, theme preview, dark mode & mobile drawer
│   │   ├── ThemePreviewPopover.tsx  # Live light/dark transition preview toggle & sample card
│   │   ├── HeroSection.tsx          # Hero value prop, search jump, marquee countdown & metrics
│   │   ├── EventFilters.tsx         # Category pills, city/region location filter, search & sort
│   │   ├── MonthlyCalendarView.tsx  # Monthly grid view of upcoming & registered events
│   │   ├── EventCard.tsx            # Card with countdown timer, capacity bar & actions
│   │   ├── EventDetailModal.tsx     # Agenda, speakers, countdown, email share & details
│   │   ├── NearbyEventsSuggestion.tsx # Geolocation 50-mile nearby events finder
│   │   ├── EventComments.tsx        # Persistent per-event public comments
│   │   ├── VenueMapPreview.tsx      # Interactive cartographic venue map
│   │   ├── TicketQRCode.tsx         # Dynamic QR code generation & branded PNG export
│   │   ├── RegistrationModal.tsx    # Form validation, ticket issuance & waitlist signup
│   │   ├── MyTicketsModal.tsx       # LocalStorage wallet, JSON export/import, edit & share
│   │   ├── MyAnalyticsModal.tsx     # Recharts attendee & ticket sales analytics
│   │   ├── CreateEventModal.tsx     # Custom event publisher
│   │   ├── ProjectDocsModal.tsx     # In-app documentation & evaluation guide
│   │   └── Footer.tsx               # Semantic footer & newsletter subscription
│   ├── data/
│   │   └── mockEvents.ts        # Seed events with agendas, speakers, coordinates & timezones
│   ├── types/
│   │   └── event.ts             # TypeScript data contracts & interfaces
│   ├── utils/
│   │   ├── eventUtils.ts        # Decoupled validation, filtering, countdown, geo & storage logic
│   │   └── eventUtils.test.ts   # Automated unit tests (17 assertions)
│   ├── App.tsx                  # Root application coordinator
│   ├── index.css                # Tailwind directives, keyframe animations & typography layers
│   └── main.tsx                 # Application bootstrap
```

---

## 🧪 Running Unit Tests

Run the decoupled unit test suite verifying validation, filtering, countdowns, geolocation, email share formatting, analytics, waitlist, comments, calendar helpers, and Local Storage reconciliation/import:

```bash
npx --yes tsx --test src/utils/eventUtils.test.ts
```

All **17 test suites** execute and pass (`17/17`).

---

## 🌐 Deployment Guide

### Deploy to Vercel
1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.

### Deploy to Netlify
1. Connect your repository in [Netlify](https://netlify.com).
2. Build command: `npm run build`.
3. Publish directory: `dist`.

### Deploy to GitHub Pages
1. In `vite.config.ts`, set `base: './'`.
2. Run `npm run build`.
3. Push the `dist/` directory to your `gh-pages` branch.

---

## 📄 License
Apache-2.0
