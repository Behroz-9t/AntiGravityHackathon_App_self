# أهلِ فن (Ahl-e-Fan) 🛠️✨

[![React Native](https://img.shields.io/badge/React_Native-0.81-blue.svg?logo=react&logoColor=white)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-darkgreen.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-black.svg?logo=expo&logoColor=white)](https://expo.dev/)

**أهلِ فن (Ahl-e-Fan)** (Urdu for "Artisans" or "Skilled people") is a premium, AI-powered service orchestrator and on-demand marketplace built for Pakistan. The platform connects users with verified local service providers (plumbers, electricians, mechanics, etc.) using a sophisticated **Multi-Agent AI Backend** and a high-end **Apple-inspired Obsidian & Gold UI/UX**.

Created in a fast-paced hackathon sprint, this project demonstrates end-to-end integration of geolocation services, timezone-aware scheduled workflows, local push notification triggers, and chat assistants with persistent memory.

---

## 📸 Project Showcase & Key Features

### 1. 🎨 Apple-Inspired Obsidian & Gold Design
*   **Aesthetic:** Static Obsidian Midnight Black (`#0B0C0E`) and Charcoal Slate (`#15181F`) theme combined with Premium Gold (`#F5C518`) highlights.
*   **Transitions:** Fluid, hardware-accelerated animations, sliding tab toggles, and iOS presentation card-deck scaling when menus open.
*   **Frosted Glass:** Backdrop blurs powered by `expo-blur` tailored for a premium iOS/Android look and feel.

### 2. 🧠 Multi-Agent AI Service Orchestrator
*   **Intent Extraction:** The backend leverages specialized AI agents to automatically analyze user requests, extract intents (needed service, location, timezone details), and match them with appropriate service categories.
*   **Query-Based Ranking:** Providers are matched based on keyword relevance, average ratings, location, and distance.

### 3. ⚙️ Timezone-Conforming Scheduled Bookings
*   Calculates target schedule dates using location timezone offsets (Pakistan Standard Time, GMT+5) using absolute UTC epoch math.
*   Ensures that schedule timers and countdowns remain **100% correct, independent of the device's timezone settings**.

### 4. 📍 Geocoding & Double-Booking Prevention
*   **City-Level Filtering:** Matches and filters providers strictly within the user's city boundaries.
*   **Dynamic Geocoding:** Converts text addresses into geographic coordinates on-the-fly.
*   **Availability Lock:** Automatically marks matched providers as busy in MongoDB upon booking confirmation and releases them back to the active pool when the booking is cancelled or rated completed.

---

## 🛠️ Tech Stack

*   **Frontend:** React Native (Expo SDK 54), React Navigation, Leaflet Maps (embedded via WebView), Expo-Notifications.
*   **Backend:** Python 3.10+, FastAPI (Asynchronous REST API), PyMongo, Uvicorn, Google Gemini AI (Agent framework).
*   **Database:** MongoDB Atlas (Provider metadata, user accounts, and real-time availability tracking).

---

## 📁 Repository Structure

```text
├── backend/
│   ├── app/
│   │   ├── agents/          # AI Orchestrator & Multi-Agent logic
│   │   ├── models/          # Schemas & data structures
│   │   ├── database.py      # MongoDB config & data queries
│   │   └── main.py          # FastAPI routes, start/complete triggers
│   ├── requirements.txt     # Python dependencies
│   └── load_providers.py    # Database seeder script
│
├── mobile/
│   ├── src/
│   │   ├── screens/         # Home, Tracking, Chat, History, Auth screens
│   │   ├── components/      # UI components (SidePanel, RatingModal)
│   │   ├── api.js           # API communication wrapper
│   │   └── BookingContext.js# React Context for global state & storage hydration
│   ├── app.json             # Expo project configuration
│   └── package.json         # React Native dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- A MongoDB cluster or local instance

---

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` root directory:
   ```env
   MONGO_URI=your_mongodb_connection_string
   DB_NAME=testingantigravityapp
   GEMINI_API_KEY=your_google_gemini_api_key
   ```
5. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The FastAPI documentation will be available at `http://localhost:8000/docs`.*

---

### 3. Mobile Setup

1. Navigate to the mobile directory:
   ```bash
   cd ../mobile
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Set your backend URL environment variable in a `.env` or configuration file:
   - Dynamic dev builds default to local development endpoints.
   - For preview/production builds, target the hosted production URL.
4. Launch the Expo Development Server:
   ```bash
   npx expo start
   ```
5. Run on an Android emulator (press `a`), iOS simulator (press `i`), or scan the QR code using the Expo Go app.

---

## 👥 The Hackathon Team
This project was designed and built as a team effort during the hackathon:

*   **Behroz Musharraf** (Team Lead) — UI/UX Design System, Timezone Calculations, & Integration
*   **Arish Ahmed Khan** — Core Mobile App Logic & Navigation
*   **Muhammad Abdullah Iqbal** — Backend FastAPI Services & Database Architecture
*   **Nasit Furqan** — Multi-Agent AI Framework & Prompt Engineering

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
