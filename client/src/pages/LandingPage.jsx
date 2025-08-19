// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom';

const mascots = [
  { img: '/owl.png',     alt: 'Owl mascot for goal setup',     name: 'The Owl',   desc: 'Sets up your goals with wisdom.' },
  { img: '/mouse.png',   alt: 'Mouse mascot for guidance',     name: 'The Mouse', desc: 'Calm and nurturing guidance.' },
  { img: '/sparrow.png', alt: 'Sparrow mascot for positivity', name: 'The Sparrow', desc: 'Positivity and encouragement.' },
  { img: '/ant.png',     alt: 'Ant mascot for discipline',     name: 'The Ant',   desc: 'Disciplined, detail-focused finisher.' },
  { img: '/frog.png',    alt: 'Frog mascot for action',        name: 'The Frog',  desc: 'Helps you take action.' },
];

const steps = [
  { img: '/cake.png',   alt: 'Cake representing a full goal', title: 'Goal',    desc: 'The whole cake — your mission.' },
  { img: '/slice.png',  alt: 'Slice representing a subgoal',  title: 'Subgoal', desc: 'One slice — a focused piece.' },
  { img: '/crumbs.png', alt: 'Crumbs representing tasks',     title: 'Tasks',   desc: 'The steps that lead to progress.' },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#fff9f3]">
      {/* HERO */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="flex justify-center md:justify-start">
            {/* width/height reduce CLS; use exact file dims if you know them */}
            <img
              src="/logo.png"
              alt="GoalCrumbs Logo"
              width={280}
              height={280}
              className="w-40 h-40 md:w-56 md:h-56 object-contain drop-shadow-sm"
            />
          </div>

          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight text-gray-900">
              Break Big Goals Into Tiny Crumbs
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-700">
              Your AI-powered accountability partner — stay on track, stay motivated.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                to="/signup"
                className="inline-block rounded-2xl px-6 py-3 text-white bg-[#bd661d] hover:bg-[#a55217] transition shadow-sm text-center"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="inline-block rounded-2xl px-6 py-3 text-[#bd661d] bg-white hover:bg-orange-50 border border-[#f1c79f] transition text-center"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="bg-white/70 border-y border-orange-200">
        <div className="container mx-auto px-4 py-10 md:py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Why GoalCrumbs Works</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4 text-gray-800">
            <li className="bg-white rounded-xl p-4 shadow-sm">✅ Layered goals: subgoals, tasks, and microtasks</li>
            <li className="bg-white rounded-xl p-4 shadow-sm">✅ Daily reminders + weekly check-ins</li>
            <li className="bg-white rounded-xl p-4 shadow-sm">✅ Visual progress tracking</li>
            <li className="bg-white rounded-xl p-4 shadow-sm">✅ Telegram integration for nudges</li>
          </ul>
        </div>
      </section>

      {/* MASCOTS & HOW IT WORKS */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Mascots */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Meet Your GoalCrumbs Team 🐾</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {mascots.map(({ img, alt, name, desc }) => (
                <div key={name} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
                  <img
                    src={img}
                    alt={alt}
                    loading="lazy"
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain"
                  />
                  <p className="text-gray-800">
                    <strong>{name}</strong> — {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">How It Works 🍰</h2>
            <div className="grid gap-3">
              {steps.map(({ img, alt, title, desc }) => (
                <div key={title} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
                  <img
                    src={img}
                    alt={alt}
                    loading="lazy"
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain"
                  />
                  <p className="text-gray-800">
                    <strong>{title}:</strong> {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW (optional image) */}
      <section className="bg-white/70 border-y border-orange-200">
        <div className="container mx-auto px-4 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">See Your Progress at a Glance</h2>
          {/* If you don’t have the file yet, comment out the <img> */}
          <img
            className="mx-auto mt-6 rounded-2xl shadow-md w-full max-w-4xl"
            src="/example-dashboard.png"
            alt="GoalCrumbs dashboard preview"
            loading="lazy"
            width={1200}
            height={720}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center">What Users Say</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <blockquote className="bg-white rounded-xl p-6 shadow-sm">
            ★ ★ ★ ★ ★ “I’ve finally built momentum on my side project!” — Sarah L.
          </blockquote>
          <blockquote className="bg-white rounded-xl p-6 shadow-sm">
            ★ ★ ★ ★ ☆ “The Telegram nudges are just what I needed.” — Alex D.
          </blockquote>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-2xl bg-[#ffe9d2] border border-orange-200 p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to Get Started?</h2>
          <Link
            to="/signup"
            className="mt-5 inline-block rounded-2xl px-6 py-3 text-white bg-[#bd661d] hover:bg-[#a55217] transition shadow-sm"
          >
            Join GoalCrumbs Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;