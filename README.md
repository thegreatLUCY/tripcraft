# TripCraft

A map-first travel planning app for web and mobile. Plan trips, pin destinations on an interactive map, and build a day-by-day itinerary — all in one place.

> Built as a portfolio project. Production web app live at [tripcraft.vercel.app](https://tripcraft.vercel.app).

---

## Screenshots

> Add screenshots to a `screenshots/` folder at the root and update the paths below.

| Home | Destinations | Itinerary |
|------|-------------|-----------|
| ![Home](screenshots/web%20home.png) | ![Destinations](screenshots/Web%20destination.png) | ![Itinerary](screenshots/Web%20itenerary.png) |

| Mobile Home | Mobile Destinations | Mobile Itinerary |
|-------------|-------------|-------------|
| ![Mobile home](screenshots/mobile%20home.jpeg) | ![Mobile destinations](screenshots/Mobile%20Destination.jpeg) | ![Mobile itinerary](screenshots/Mobile%20Itenerary.jpeg) |

---

## Tech Stack

### Web (`apps/web`)
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Maps | react-leaflet + CartoDB Voyager tiles |
| Geocoding | Nominatim (OpenStreetMap) |
| Auth & DB | Supabase (PostgreSQL + RLS) |
| Deployment | Vercel |

### Mobile (`apps/mobile`)
| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 (React Native) |
| Language | TypeScript |
| Styling | NativeWind v4 (Tailwind for RN) |
| Navigation | Expo Router v6 |
| Maps | react-native-maps + CartoDB tiles |
| Auth & DB | Supabase (shared backend) |

---

## Features

### Implemented

#### Authentication
- Email/password sign-up and login
- Session persistence (cookies on web, AsyncStorage on mobile)
- Protected routes — unauthenticated users are redirected to login
- Dark/light theme toggle (web)

#### Trips
- Create trips with title, start date, and end date
- Edit trip title and dates inline after creation
- Delete trips (with confirmation)
- Trips list on homepage, ordered by most recent

#### Destinations
- Typeahead city search powered by Nominatim (debounced, no API key required)
- Add destinations to a trip — they appear as numbered pins on the map
- Map auto-fits to show all pins when destinations are added
- Delete individual destinations

#### Map
- Full-screen interactive map (web: react-leaflet, mobile: react-native-maps)
- CartoDB Voyager raster tiles — no API key required
- Custom numbered teal pins matching destination order
- Architecture is thin and swappable — designed for a Google Maps upgrade

#### Itinerary
- Day-by-day planner, days auto-generated from trip dates (or dynamically expanded)
- Add activities to any day with an optional time
- Activities sorted by time within each day
- Delete individual activities
- Day labels show the real calendar date when trip dates are set (e.g. "Mon, Jun 2")

---

## Project Structure

```
tripcraft/
├── apps/
│   ├── web/               # Next.js 16 web app
│   │   ├── app/           # App Router pages
│   │   ├── components/    # UI components
│   │   │   ├── layout/    # Header
│   │   │   ├── map/       # Leaflet map components
│   │   │   └── trips/     # Trip list + detail
│   │   ├── lib/           # Supabase clients (browser + server)
│   │   └── proxy.ts       # Auth-gating proxy (Next.js 16)
│   └── mobile/            # Expo React Native app
│       ├── app/           # Expo Router screens
│       └── lib/           # Supabase client (AsyncStorage)
└── packages/
    └── shared/            # (reserved for shared types/utils)
```

---

## Database Schema

```sql
-- Users managed by Supabase Auth

create table trips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  title      text not null,
  start_date date,
  end_date   date,
  created_at timestamptz default now()
);

create table trip_destinations (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references trips(id) on delete cascade not null,
  city_name    text not null,
  country_name text not null,
  lat          float not null,
  lng          float not null,
  created_at   timestamptz default now()
);

create table itinerary_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid references trips(id) on delete cascade not null,
  user_id    uuid references auth.users not null,
  day        integer not null,
  title      text not null,
  time       text,
  created_at timestamptz default now()
);
```

Row Level Security is enabled on all tables. Each user can only read and write their own data.

---

## Local Setup

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project with the schema above applied

### Web app

```bash
cd apps/web
cp .env.local.example .env.local   # fill in your Supabase URL and anon key
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mobile app

```bash
cd apps/mobile
cp .env.example .env               # fill in your Supabase URL and anon key
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your phone.

### Environment variables

**Web** (`apps/web/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Mobile** (`apps/mobile/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> The anon key is safe to use in client-side code. Supabase's Row Level Security policies ensure users can only access their own data.

---

## Roadmap

### Near term
- [ ] Google Maps integration (web + mobile) — better map quality and POI data
- [ ] Trip sharing — share a read-only link to a trip with anyone
- [ ] Drag to reorder destinations and itinerary items
- [ ] Offline support on mobile

### Medium term
- [ ] AI activity suggestions — get recommendations for each destination
- [ ] Photo attachments — add photos to destinations and itinerary items
- [ ] Real-time collaboration — multiple users editing a trip simultaneously
- [ ] Push notifications for trip reminders

### Future
- [ ] App Store / Google Play distribution
- [ ] Packing list per trip
- [ ] Budget tracker
- [ ] Integration with flights and hotels

---

## License

MIT
