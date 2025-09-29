// src/seo/SEO.jsx
import { useEffect } from 'react';

function upsert(name, value, { attr = 'name' } = {}) {
  if (value == null) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(value));
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function absoluteUrl(maybeRelative) {
  if (!maybeRelative) return undefined;
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    origin +
    (maybeRelative.startsWith('/') ? maybeRelative : `/${maybeRelative}`)
  );
}

export default function SEO({
  title,
  description,
  image,
  url,
  keywords, // string | string[]
  noindex = false, // boolean
  jsonLd, // object | array
  type = 'website', // og:type
  siteName = 'GoalCrumbs',
}) {
  useEffect(() => {
    const absImg = absoluteUrl(image);

    // Title
    if (title) document.title = title;

    // Canonical
    if (url) upsertLink('canonical', url);

    // Basic
    if (description) upsert('description', description);
    if (keywords && (Array.isArray(keywords) ? keywords.length : true)) {
      upsert(
        'keywords',
        Array.isArray(keywords) ? keywords.join(', ') : keywords
      );
    }

    // Open Graph
    if (title) upsert('og:title', title, { attr: 'property' });
    upsert('og:type', type, { attr: 'property' });
    if (url) upsert('og:url', url, { attr: 'property' });
    upsert('og:site_name', siteName, { attr: 'property' });
    if (description)
      upsert('og:description', description, { attr: 'property' });
    if (absImg) upsert('og:image', absImg, { attr: 'property' });

    // Twitter
    upsert('twitter:card', 'summary_large_image');
    if (title) upsert('twitter:title', title);
    if (description) upsert('twitter:description', description);
    if (absImg) upsert('twitter:image', absImg);

    // Robots
    upsert('robots', noindex ? 'noindex,nofollow' : 'index,follow');

    // JSON-LD
    const existing = document.getElementById('seo-jsonld');
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = 'seo-jsonld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [
    title,
    description,
    image,
    url,
    keywords,
    noindex,
    jsonLd,
    type,
    siteName,
  ]);

  return null;
}
