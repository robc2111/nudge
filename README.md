# GoalCrumbs

**Your AI-powered accountability partner.**  
GoalCrumbs breaks big goals into small, manageable "crumbs" so you can make consistent progress without feeling overwhelmed.

---

## ✨ Features

- **Authentication**
  - User registration & login (`/auth/register`, `/auth/login`)
  - JWT-based authentication with `axios` interceptors
  - Automatic 401 handling (redirects to `/login` on token expiry)
- **Dashboard**
  - Displays goals, subgoals, and microtasks
  - Images & metaphors: Cake (goal), Slice (subgoal), Crumbs (tasks)
- **Goal Management**
  - Create, edit, and delete goals
  - AI-powered goal breakdown into subgoals and microtasks
  - Support for different goal types (fitness, learning, health, etc.)
- **Reflections**
  - Add daily/weekly reflections linked to a goal
  - Filter by goal, date range, and sort order
  - 500 character limit with live character count
- **Profile**
  - View username, email, and Telegram ID
  - (Optional) Connect Telegram for reminders
  - Read-only username display (editing disabled)
- **Responsive UI**
  - Built with Tailwind CSS
  - Mobile-first design
- **Notifications**
  - Toasts for success and error events (`react-toastify`)

---

## 🛠 Tech Stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **Notifications:** React Toastify
- **HTTP Client:** Axios (with token & 401 handling)
- **Backend:** Node.js + Express + PostgreSQL (PERN stack)
- **AI Integration:** OpenAI / Local LLM for goal breakdown
- **Version Control:** Git + GitHub

---

## 📂 Key Files

### API & Auth
- `src/api/axios.js` → Axios instance with base URL from `.env` (`VITE_API_URL`), token injection, and global 401 handling.
- `src/utils/auth.js` → Helper functions for token management.

### Components
- `Header.jsx` → Top navigation with login/logout.
- `Footer.jsx` → Contact & social links.
- `GoalCard.jsx`, `SubgoalCard.jsx`, `TaskCard.jsx`, `MicrotaskCard.jsx` → Reusable dashboard cards.
- `PrivateRoute.jsx` → Protects routes from unauthenticated access.

### Pages
- `LandingPage.jsx` → App intro with CTA.
- `Login.jsx` → Sign in form with toast errors.
- `Signup.jsx` → User registration form.
- `Dashboard.jsx` → Overview of active goals.
- `GoalSetup.jsx` → AI-powered goal creation.
- `EditGoal.jsx` → Update goal details & regenerate tasks.
- `Profile.jsx` → View-only profile page showing username, email, Telegram ID.
- `Reflections.jsx` → Add, view, and filter reflections.

---

## ⚙️ Local Development

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/goalcrumbs.git
cd goalcrumbs
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment variables
Create a `.env` file in `/client`:

```env
VITE_API_URL=http://localhost:5050
```

Backend `.env` example:
```env
PORT=5050
DATABASE_URL=postgres://user:password@localhost:5432/goalcrumbs
JWT_SECRET=your-secret
OPENAI_API_KEY=your-key  # if using OpenAI
```

### 4. Start backend
```bash
cd server
npm install
npm run dev
```

### 5. Start frontend
```bash
cd client
npm run dev
```
App runs at: [http://localhost:5173](http://localhost:5173)

---

## 🚀 Deployment

- **Frontend:** Netlify / Vercel
- **Backend:** Render / Railway / Heroku
- Update `VITE_API_URL` in `.env` to point to your deployed API.

---

## 🔐 Authentication Flow

1. On login/signup, backend returns a JWT.
2. Token is stored in `localStorage`.
3. `axios` attaches token on every request.
4. If token expires → backend sends 401 → user is logged out and redirected to `/login`.

---

## 📌 Future Improvements

- Goal sharing & collaboration
- Push notifications (web + Telegram)
- Export data as CSV/Markdown
- More goal type-specific AI prompts

---

## 📄 License

MIT License © 2025 GoalCrumbs
