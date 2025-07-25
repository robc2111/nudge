# Nudge – Accountability Partner App 🤖📈

**Nudge** is a Telegram-integrated accountability partner app designed to help solopreneurs and creatives achieve their goals through AI-driven nudges, layered task breakdowns, and regular check-ins.

Built with the **PERN stack**:
- **PostgreSQL**
- **Express.js**
- **React (Vite)**
- **Node.js**

---

## 🚀 Features

- ✅ Telegram user onboarding
- ✅ Create goals, subgoals, tasks, and microtasks
- ✅ Daily check-ins and weekly reflections
- ✅ Progress tracking and customizable tone feedback
- ✅ REST API built in Node/Express
- ✅ PostgreSQL database hosted on Supabase

---

## 🧱 Tech Stack

| Layer         | Tech           |
|---------------|----------------|
| Frontend      | React + Vite   |
| Backend       | Node.js + Express |
| Database      | PostgreSQL (Supabase) |
| Automation    | Telegram Bot API (Coming soon) |

---

## 📦 Project Structure
nudge-app/
│
├── client/              # React frontend (Vite)
├── server/              # Express backend
│   ├── controllers/     # API logic
│   ├── routes/          # RESTful endpoints
│   ├── db.js            # PostgreSQL pool config
│   └── .env             # Environment variables
├── .gitignore
├── README.md
└── package.json

---

## 🔧 Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/robc2111/nudge.git
cd nudge

### 2. Install dependencies
cd server && npm install
cd ../client && npm install

### 3. Configure .env
Set up .env files in both /server and /client folders.

Example for /server/.env:
PORT=5050
DATABASE_URL=your_supabase_connection_url
Example for /client/.env:
VITE_API_URL=http://localhost:5050

### 4. Start development
# Terminal 1
cd server && node index.js

# Terminal 2
cd client && npm run dev

✅ Status

🟢 Backend: Complete
🔵 Frontend: In Progress
🟡 Telegram bot integration: Coming soon

📌 Roadmap
	•	REST API setup
	•	PostgreSQL schema design
	•	Test endpoints in Postman
	•	Frontend UI for managing goals/tasks
	•	Telegram bot for nudges and reflections
	•	User auth and tone customization


📄 License

MIT © Rob Carney

