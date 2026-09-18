# ArtAround 🏛️✨

An end-to-end interactive web platform tailored for cultural spaces and museum experiences. ArtAround integrates a modular **Marketplace & Content Creation Dashboard** for desktop browsers with a mobile-first **Web Navigator** providing adaptive audio guides, indoor floor-map orientation, fallback speech synthesis, and hands-free voice controls.

---

## Key Architectural Features

- **Adaptive Multi-Level Audio Delivery**: Audio guides dynamically switch across different comprehension tiers (`child`, `medium`, `advanced`) and duration targets (`3s`, `15s`, `40s`) to match visitor preferences[cite: 2, 7, 24].
- **Fail-Safe Playback Architecture**: Hybrid audio pipeline prioritizing pre-rendered audio files and instantly falling back to Speech Synthesis (via `google-tts-api` and native browser `SpeechSynthesis`) whenever pre-recorded assets are unavailable[cite: 11, 24].
- **Data Integrity & Non-Destructive Tour Forking**: When a user adopts or purchases a curated visit, the system generates an independent clone linked to their profile, protecting the author's public tour from unintended modifications while granting full customization freedom to the adopter[cite: 1, 24].
- **Indoor Positioning & Multi-Floor Mapping**: Artworks inherit precise 2D spatial coordinates (`floor`, `mapX`, `mapY`) mapped onto high-resolution SVG/PNG floor plans with interactive markers and automatic floor detection[cite: 2, 11, 24].
- **Conditional Visibility & RBAC**: Strict role separation between Visitors, Authors, and Administrators enforced via stateless JWT middleware[cite: 1, 9, 24]. Unauthenticated guests only access public, free tours; logged-in accounts unlock personal libraries, custom route builder tools, and sales metrics[cite: 1, 10, 18, 24].
- **Hands-Free Exploration**: Native Web Speech API integration (`SpeechRecognition`) enabling visitors to request directions, switch artwork variants, pause/resume playback, or locate museum facilities using voice commands[cite: 11, 24].

---

## Localization & Language Support

The codebase, API schema, database models, controllers, and environment settings are designed in **English**[cite: 1, 2, 4]. The user-facing interface, tour descriptions, and voice synthesis configurations are currently localized in **Italian** (`it-IT`) featuring the Museo Egizio of Turin as the reference institution[cite: 11, 24]. The architecture is ready for multi-language extensions (the underlying TTS engine supports `en-US` and all standard BCP-47 locale tags)[cite: 24].

---

## Tech Stack

### Mobile Navigator (`/navigator`)

- **Core**: React 18, React DOM, React Router v6[cite: 24]
- **State Management**: React Context API (`NavigatorContext`)[cite: 24]
- **UI & Layout**: React-Bootstrap, Bootstrap Icons, FontAwesome SVG Icons, CSS Custom Properties[cite: 24]
- **Browser APIs**: Web Speech API (`webkitSpeechRecognition`, `SpeechSynthesisUtterance`)[cite: 11, 24]

### Marketplace & Creator Portal (`/`)

- **Core**: HTML5, Vanilla JavaScript (ES6+ Modules, Fetch API, DOM manipulation)[cite: 24]
- **Styling**: Bootstrap 5.3.2, Bootstrap Icons 1.11.2, Custom Design Tokens[cite: 24]
- **Zero Client Bundling**: Delivered directly as high-performance static assets[cite: 24]

### Backend Server (`/api`)

- **Runtime**: Node.js (v18+ / v22) & Express.js[cite: 24]
- **Database & ODM**: MongoDB with Mongoose[cite: 24]
- **Security & Auth**: JSON Web Tokens (`jsonwebtoken`), password salting & hashing (`bcryptjs`)[cite: 1, 24]
- **Media & Audio**: `google-tts-api`, `music-metadata`[cite: 24]
- **Utilities**: `cors`, `dotenv`[cite: 24]

---

## Repository Structure

```text
.
├── controllers/              # Express controllers handling business logic
│   └── apiController.js      # Items, Visits, Users, Authentication & Sales Logs
├── middleware/               # Security and access restriction handlers
│   └── auth.js               # JWT verification & role validation (requireAuth, requireRole)
├── models/                   # Mongoose schemas with English nomenclature
│   ├── Item.js               # Artwork and variant schema (artworkId, floor, mapX/Y)
│   ├── User.js               # User accounts (roles: visitor, author, admin)
│   └── Visit.js              # Tour itineraries, ordered stops, and adoption logs
├── routes/                   # REST API routes
│   └── api.js                # Endpoints for items, visits, stats, and auth
├── marketplace/              # Desktop-oriented marketplace and creator suite
│   ├── index.html            # Landing page, hero showcase, and quick preview
│   ├── dashboard.html        # Catalog search, filter bar, and user personal library
│   ├── editor-item.html      # Artwork and audio variant submission form
│   ├── editor-visita.html    # Drag-and-drop itinerary composer
│   ├── css/                  # Marketplace custom styling
│   └── js/                   # Vanilla client logic (utils.js, dashboard.js, editors)
├── navigator/                # React mobile application
│   ├── public/               # Public assets and museum floor maps
│   ├── src/
│   │   ├── components/       # Views: Home, VisitOverview, ItemViewer, FloorMap, Library
│   │   ├── context/          # NavigatorContext for global playback state
│   │   ├── CSS/              # Scoped component styles
│   │   ├── App.jsx           # Client router and viewport detection
│   │   └── main.jsx          # React DOM mounting point
│   └── package.json          # Frontend build scripts and dependencies
├── seed.js                   # MongoDB population script with relational integrity
├── seed_data.json            # Reference catalog items and sample tours
├── config.json               # Museum branding, floor plan paths, and logistics
├── index.js                  # Express application entry point & static asset serving
└── package.json              # Backend dependencies and startup scripts
```
