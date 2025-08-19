// src/pages/NotFound.jsx
export default function NotFound() {
  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold mb-2">404</h1>
      <p className="text-gray-600 mb-6">We couldn’t find that page.</p>
      <a href="/dashboard" className="btn bg-[#bd661d] text-white px-4 py-2 rounded">
        Go to Dashboard
      </a>
    </div>
  );
}