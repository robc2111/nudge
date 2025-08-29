// Tiny helper to set SEO tags without Helmet.
// Safe in React 18/19 and SSR-agnostic (no-ops if document missing).

export function setSEO({
  title,
  description,
  ogImage,
  url,
  type = 'website',
  twitterCard = 'summary_large_image',
} = {}) {
  if (typeof document === 'undefined') return;

  const ensure = (sel, create) => {
    let el = document.querySelector(sel);
    if (!el) {
      el = create();
      document.head.appendChild(el);
    }
    return el;
  };

  if (title) document.title = title;

  if (description) {
    ensure('meta[name="description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      return m;
    }).setAttribute('content', description);
  }

  if (url) {
    ensure('meta[property="og:url"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:url');
      return m;
    }).setAttribute('content', url);
  }

  ensure('meta[property="og:type"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('property', 'og:type');
    return m;
  }).setAttribute('content', type);

  if (title) {
    ensure('meta[property="og:title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:title');
      return m;
    }).setAttribute('content', title);
  }
  if (description) {
    ensure('meta[property="og:description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:description');
      return m;
    }).setAttribute('content', description);
  }
  if (ogImage) {
    ensure('meta[property="og:image"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('property', 'og:image');
      return m;
    }).setAttribute('content', ogImage);
  }

  ensure('meta[name="twitter:card"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('name', 'twitter:card');
    return m;
  }).setAttribute('content', twitterCard);

  if (title) {
    ensure('meta[name="twitter:title"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:title');
      return m;
    }).setAttribute('content', title);
  }
  if (description) {
    ensure('meta[name="twitter:description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:description');
      return m;
    }).setAttribute('content', description);
  }
  if (ogImage) {
    ensure('meta[name="twitter:image"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'twitter:image');
      return m;
    }).setAttribute('content', ogImage);
  }
}