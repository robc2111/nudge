import { useEffect } from 'react';

function upsert(name, value, { attr = 'name' } = {}) {
  if (!value) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
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

export default function SEO({ title, description, image, url }) {
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const img = image?.startsWith('http')
      ? image
      : image
        ? `${origin}${image}`
        : undefined;

    if (title) document.title = title;
    if (url) upsertLink('canonical', url);
    if (description) upsert('description', description);

    if (title) upsert('og:title', title, { attr: 'property' });
    if (description)
      upsert('og:description', description, { attr: 'property' });
    if (url) upsert('og:url', url, { attr: 'property' });
    if (img) upsert('og:image', img, { attr: 'property' });

    upsert('twitter:card', 'summary_large_image');
    if (title) upsert('twitter:title', title);
    if (description) upsert('twitter:description', description);
    if (img) upsert('twitter:image', img);
  }, [title, description, image, url]);

  return null;
}
