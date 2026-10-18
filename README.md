# 🏃 TrackStat

Modern athletics platform for result tracking, statistics, official rankings, relay squad selection, and sports school management.

**Tech Stack:**
- **Backend:** NestJS 12, Mongoose 9, MongoDB (`apps/api`)
- **Frontend:** Next.js 16 (App Router), React 19, React-Bootstrap 5 (`apps/web`)
- **Testing & CI/CD:** Built-in `node:test`, GitHub Actions (CI, Dependency Audit, Semantic Release)

---

## 🚀 Core Features

### 1. 👥 Athletes & Profiles ([`/athletes`](http://localhost:3010/athletes))
- Directory of athletes with sorting by surname, birth date, and school/club.
- Instant search by full name, coach, sports school, or city.
- Filter athletes by sports school (`?schoolId=...`).
- Individual athlete profiles ([`/athletes/:id`](http://localhost:3010/athletes)):
  - Personal Bests (PB): overall, outdoor stadium, and indoor arena.
  - Season Bests (SB) with yearly breakdown.
  - Complete history of official starts including competition, date, sport rank, and World Athletics points.
  - Direct links to affiliated sports schools (CYSS / ДЮСШ).

### 2. 🏫 Sports Schools ([`/schools`](http://localhost:3010/schools))
- Directory of Children and Youth Sports Schools (CYSS / ДЮСШ), Specialized Olympic Reserve Schools (SDYUSHOR), and athletics clubs.
- Search by school name or location (Chernihiv, Nizhyn, Pryluky, Bakhmach, etc.).
- Sports school profile ([`/schools/:id`](http://localhost:3010/schools)):
  - School details (full name, abbreviation, city, region, notes).
  - Interactive roster with age category (U16, U18, Adult) and gender filters.
  - Quick navigation to the global athletes list or current season rankings.

### 3. 📅 Competitions ([`/competitions`](http://localhost:3010/competitions))
- Season selector combobox dynamically aggregated from competition dates (covering both indoor and outdoor events).
- Competition level categorization: **City**, **Regional**, **National**, **International**.
- Competitions grouped by month (e.g., September, May) sorted chronologically.
- Competition details ([`/competitions/:id`](http://localhost:3010/competitions)):
  - Breakdown by age categories (U16, U18, U20, U21, U23, Adults) and absolute standings.
  - Separation of heats and finals for track disciplines.
  - Results per discipline with timing type (manual/electronic), rank, and WA points.

### 4. 📊 Results & Records Leaderboard ([`/results`](http://localhost:3010/results))
- **Season Bests (SB):** Top 10 best marks of the season grouped by discipline, gender, and age category.
- **Career Records (PB):** Top 10 all-time personal bests across each discipline.
- Seamless toggling between Season Bests and Career Records.

### 5. 🏆 Official Rankings ([`/rankings`](http://localhost:3010/rankings))
Automated season ranking calculation (indoor arena + outdoor stadium) complying with official federation criteria:
- **Top 10 Athletes** across 6 categories:
  - U16 (Boys and Girls)
  - U18 (Boys and Girls)
  - Adults (Men and Women)
- **Top 10 Sports Schools** based on cumulative points from their athletes.
- **Best 5 Starts Rule:** up to 5 highest-scoring performances per athlete count toward their season ranking score.
- **Place Points (1st–12th place):** scaled according to competition tier (Olympics, World Championships, European Championships, National Championships, Regional Championships, etc.).
- **Bonus Points:** awarded for sport rank achievements (MSUMK +100, MSU +50, KMSU +25, 1st category +10) and record breaches (National Record +100, Regional Record +25).
- **Scoring Protocol:** clicking an athlete or school reveals an itemized breakdown modal for every scored start.
- **Reference Guide (💡):** interactive modal detailing full scoring tables and criteria.

### 6. ⚡ Relay Squad Formation ([`/relays`](http://localhost:3010/relays))
Intelligent squad selection module for regional relay teams:
- **Relay Formats:** 4×100m, 4×400m, 4×800m, Swedish Relay (100+200+300+400m), Mixed 4×400m (2 men + 2 women).
- **Categories:** U16, U18, U21, U23, Adults (Men and Women).
- **Estimated Total Time:** computed from individual member split marks.
- **Swedish Relay Selection Modes:**
  - *Standard Mode:* selected by tactical criteria (Leg 4: top 400m runner, Leg 3: second 400m runner, Leg 2: top 200m runner, Leg 1: fastest remaining 100m sprinter).
  - *Smart Mode:* combinatorial search across all candidate permutations to minimize total estimated relay time.
- **Relay Details ([`/relays/:id`](http://localhost:3010/relays)):**
  - Leg descriptions and tactical roles.
  - Ranked reserves list (up to 3 candidate contenders per leg with personal bests).

### 7. 🏅 National Standards & World Athletics Scoring
- **Ukrainian Sport Ranks (ESKU):** automated standard verification (MSMC, MS, CMS, 1st, 2nd, 3rd, youth ranks) with manual timing conversion adjustments (+0.24s).
- **World Athletics (IAAF) Scoring:** points calculation using official scoring polynomial formulas across all track and field disciplines.

---

## 🛠️ Admin Panel ([`/admin`](http://localhost:3010/admin))

All core system entities feature full CRUD support:

| Section | Capabilities |
|---|---|
| **Athletes** (`/admin/athletes`) | Last name, first name, middle name, birth date, gender, coaches (tags), **sports school linkage (select)**, club, region, notes. |
| **Sports Schools** (`/admin/schools`) | Full school/club name, abbreviation, city, region, notes. |
| **Competitions** (`/admin/competitions`) | Title, **competition level (City, Regional, National, International)**, start and end dates, location, season, age categories, disciplines list. |
| **Results** (`/admin/results`) | Competition, athlete, discipline, status (OK, DNS, DNF, DQ, NM), mark value, **timing type (auto, manual, electronic)**, wind, place, sport rank, WA points, team points, heat/round. Filterable by competition. |
| **Disciplines** (`/admin/disciplines`) | Title (UA/EN), type (time, distance, points), discipline group, allowed age categories. |
| **Seasons** (`/admin/seasons`) | Year, indoor indicator (arena vs. stadium), label. |

> **Authentication:**  
> Protected via JWT tokens (`/api/auth/login`).  
> Default development credentials: **Username:** `admin`, **Password:** `admin` (configurable in `.env`).

---

## 💻 Quick Start

### Prerequisites:
- Node.js >= 24
- MongoDB (locally on port 27017 or connection string via URI)

### Installation & Launch:
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp apps/api/.env.example apps/api/.env

# 3. Start MongoDB (if not running as a system service)
mongod --dbpath /path/to/data/db

# 4. Seed initial database records (disciplines and initial data)
npm run seed

# 5. Start development servers:
npm run dev:api    # NestJS API: http://localhost:4010/api
npm run dev:web    # Next.js Web: http://localhost:3010
```

---

## 🧪 Testing & Quality Assurance

Fast, native testing suite using Node.js built-in test runner:

```bash
# Typecheck TypeScript across all workspaces
npm run typecheck

# Run all unit tests (node:test)
npm test

# Production build of API and Web
npm run build
```

---

## 🔄 CI / CD (GitHub Actions)

Three automated workflows configured in [`.github/workflows`](.github/workflows):

1. **`ci.yml` (CI — Build & Test):**  
   Triggered on push to `main`, `master`, `feat/**`, and pull requests.  
   Executes `npm ci` ➔ `npm run typecheck` ➔ `npm test` ➔ `npm run build`.

2. **`audit.yml` (Dependency Audit):**  
   Daily security vulnerability scans via npm Advisory DB.

3. **`release.yml` (Release — Auto Tag & GitHub Release):**  
   Automated semantic versioning and release publishing on branch merge:
   - Synchronizes and bumps versions in `package.json` (`root`, `apps/api`, `apps/web`) and `package-lock.json`.
   - `feat:` or `feat(...)` ➔ **minor version bump** (e.g., `v1.0.0` ➔ `v1.1.0`).
   - `fix:` or `fix(...)` ➔ **patch version bump** (e.g., `v1.0.0` ➔ `v1.0.1`).
   - `BREAKING CHANGE` or `!:` ➔ **major version bump** (e.g., `v1.0.0` ➔ `v2.0.0`).
   - Automatically generates release notes on GitHub.

---

## 📄 License & Copyright

Andrii Yermolenko © 2026. Contact: [yermolenko.ua@gmail.com](mailto:yermolenko.ua@gmail.com).
