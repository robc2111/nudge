// src/pages/BlogIndex.jsx
import { Link } from 'react-router-dom';
import posts from '../posts/_index';

export default function BlogIndex() {
  if (!Array.isArray(posts) || posts.length === 0) return <p>No posts yet.</p>;
  return (
    <main className="page page--blog">
      <div className="container">
        <h1>Blog</h1>
        <ul>
          {posts.map((p) => (
            <li key={p.slug}>
              <Link to={`/blog/${p.slug}`}>{p.title}</Link>
              <span>
                {' '}
                — {p.prettyDate} · {p.readingTime} min
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
