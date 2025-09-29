import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import posts from '../posts/_index';
import SEO from '../seo/SEO';

export default function BlogPost() {
  const { slug } = useParams();

  const post = useMemo(() => posts.find((p) => p.slug === slug), [slug]);

  return (
    <main className="page page--blog">
      <SEO
        title={`${post.title} – GoalCrumbs`}
        description={post.summary}
        image="/og/blog.png" // or a per-post image if you have one
        url={`https://goalcrumbs.com/blog/${post.slug}`}
        keywords={[
          'stay consistent',
          'accountability partner',
          'goal tracking tips',
        ]}
      />
      <div className="container">
        <p className="muted">
          <Link to="/blog">← All posts</Link>
        </p>
        <article className="blog-article">
          <h1>{post.title}</h1>
          <p className="meta">
            <time dateTime={post.date}>{post.prettyDate}</time>
            {typeof post.readingTime !== 'undefined' && (
              <> · {post.readingTime} min read</>
            )}
          </p>
          <div className="prose">{post.body}</div>
        </article>
      </div>
    </main>
  );
}
