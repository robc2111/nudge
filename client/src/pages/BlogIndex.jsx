import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import posts from '../posts/_index';
import SEO from '../seo/SEO';

export default function BlogPost() {
  const { slug } = useParams();
  const post = useMemo(() => posts.find((p) => p.slug === slug), [slug]);

  if (!post) {
    return (
      <main className="page page--blog">
        <SEO
          title="Post not found – GoalCrumbs"
          description="This article could not be found."
          url={`https://goalcrumbs.com/blog/${slug}`}
          image="/og/blog.png"
          keywords={[
            'goal setting',
            'accountability app',
            'AI coach',
            'habit tracking',
            'self improvement blog',
          ]}
          noindex
        />
        <div className="container">
          <p className="muted">
            <Link to="/blog">← All posts</Link>
          </p>
          <h1>Post not found</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="page page--blog">
      <SEO
        title={`${post.title} – GoalCrumbs`}
        description={post.summary}
        image={post.image || '/og/blog.png'}
        url={`https://goalcrumbs.com/blog/${post.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          image: post.image ? post.image : undefined,
          url: `https://goalcrumbs.com/blog/${post.slug}`,
        }}
      />
      {/* ... */}
    </main>
  );
}
