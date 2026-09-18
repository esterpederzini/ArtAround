# ArtAround 🏛️✨

An end-to-end interactive web platform tailored for cultural spaces and museum experiences. ArtAround integrates a modular **Marketplace & Content Creation Dashboard** for desktop browsers with a mobile-first **Web Navigator** providing adaptive audio guides, indoor floor-map orientation, fallback speech synthesis, and hands-free voice controls.

---

## Key Architectural Features

- **Adaptive Multi-Level Audio Delivery**: Audio guides dynamically switch across different comprehension tiers (`child`, `medium`, `advanced`) and duration targets (`3s`, `15s`, `40s`) to match visitor preferences.
- **Fail-Safe Playback Architecture**: Hybrid audio pipeline prioritizing pre-rendered audio files and instantly falling back to Speech Synthesis (via `google-tts-api` and native browser `SpeechSynthesis`) whenever pre-recorded assets are unavailable.
- **Data Integrity & Non-Destructive Tour Forking**: When a user adopts or purchases a curated visit, the system generates an independent clone linked to their profile, protecting the author's public tour from unintended modifications while granting full customization freedom to the adopter.
- **Indoor Positioning & Multi-Floor Mapping**: Artworks inherit precise 2D spatial coordinates (`floor`, `mapX`, `mapY`) mapped onto high-resolution SVG/PNG floor plans with interactive markers and automatic floor detection.
- **Conditional Visibility & RBAC**: Strict role separation between Visitors, Authors, and Administrators enforced via stateless JWT middleware. Unauthenticated guests only access public, free tours; logged-in accounts unlock personal libraries, custom route builder tools, and sales metrics.
- **Hands-Free Exploration**: Native Web Speech API integration (`SpeechRecognition`) enabling visitors to request directions, switch artwork variants, pause/resume playback, or locate museum facilities using voice commands.

---

## Localization & Language Support

The codebase, API schema, database models, controllers, and environment settings are designed in **English**. The user-facing interface, tour descriptions, and voice synthesis configurations are currently localized in **Italian** (`it-IT`) featuring the Museo Egizio of Turin as the reference institution. The architecture is ready for multi-language extensions (the underlying TTS engine supports `en-US` and all standard BCP-47 locale tags).

---

## Tech Stack

### Mobile Navigator (/navigator)

- **Core**: React 18, React DOM, React Router v6
- **State Management**: React Context API (NavigatorContext)
- **UI & Layout**: React-Bootstrap, Bootstrap Icons, FontAwesome SVG Icons, CSS Custom Properties
- **Browser APIs**: Web Speech API (webkitSpeechRecognition, SpeechSynthesisUtterance)

### Marketplace & Creator Portal (/)

- **Core**: HTML5, Vanilla JavaScript (ES6+ Modules, Fetch API, DOM manipulation)
- **Styling**: Bootstrap 5.3.2, Bootstrap Icons 1.11.2, Custom Design Tokens
- **Zero Client Bundling**: Delivered directly as high-performance static assets

### Backend Server (/api)

- **Runtime**: Node.js (v18+ / v22) & Express.js
- **Database & ODM**: MongoDB with Mongoose
- **Security & Auth**: JSON Web Tokens (jsonwebtoken), password salting & hashing (bcryptjs)
- **Media & Audio**: google-tts-api, music-metadata
- **Utilities**: cors, dotenv

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

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js: v18.0.0 or higher
- MongoDB: A running local instance (mongodb://127.0.0.1:27017) or a MongoDB Atlas URI
- npm or yarn

### 1. Clone & Install Dependencies

Clone the repository and install dependencies for both the root backend and the React navigator:

```bash
git clone [https://github.com/](https://github.com/)<your-username>/ArtAround.git
cd ArtAround

# Install server dependencies
npm install

# Install mobile navigator dependencies
cd navigator
npm install
cd ..
```

### 2. Environment Configuration

Create a .env file in the root folder:

```env
PORT=3000
MONGO_URL=mongodb://127.0.0.1:27017/artaround
JWT_SECRET=your_jwt_private_secret_key
```

### 3. Database Seeding

Initialize MongoDB with test items, structured variants, museum tours, and users:

```bash
node seed.js
```

### 4. Build & Run

#### Production / Single Server Mode

Build the React application and start the unified Express server:

```bash
cd navigator
npm run build
cd ..

npm start
```

- Marketplace: http://localhost:3000/
- Mobile Navigator: http://localhost:3000/navigator

#### Development Mode (Concurrent)

To develop with Hot Module Replacement (HMR) on the mobile client:

- Backend: npm run dev (or node index.js) on port 3000
- Navigator client: In a separate terminal:

```bash
cd navigator
npm run dev
```

---

## 🔐 Default Test Accounts

Running seed.js sets up test accounts for testing permission workflows:

| Role        | Username | Password    | Privileges                                                          |
| :---------- | :------- | :---------- | :------------------------------------------------------------------ |
| **Admin**   | admin    | password123 | Unrestricted catalog management, sales audits, global configuration |
| **Author**  | author1  | password123 | Creates artworks, publishes tours, monetizes audio variants         |
| **Visitor** | visitor1 | password123 | Adopts tours, creates personal clones, listens to audio content     |

---

## 📄 License

This project is released under the MIT License.
