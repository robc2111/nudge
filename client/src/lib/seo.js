/**
 * Imperative helper for Vite/SPA pages. Call once in a useEffect per page.
 * Example: setSEO({ title: 'Dashboard – GoalCrumbs', description: '...' })
 */
export function setSEO({
  title,
  description,
  url = window.location.href,
  image = '/og/birdog.png', // sensible default
  siteName = 'GoalCrumbs',
  type = 'website',
  noindex = false,
  canonical,
  jsonLd,
}) {
  const d = document;

  const set = (selector, attrs) => {
    let el = d.querySelector(selector);
    if (!el) {
      el = d.createElement(attrs.tag || 'meta');
      if (attrs.name) el.setAttribute('name', attrs.name);
      if (attrs.property) el.setAttribute('property', attrs.property);
      d.head.appendChild(el);
    }
    Object.entries(attrs).forEach(([k, v]) => {
      if (['tag', 'name', 'property'].includes(k)) return;
      el.setAttribute(k, v);
    });
  };

  if (title) d.title = title;

  if (canonical || url) {
    let link = d.querySelector('link[rel="canonical"]');
    if (!link) {
      link = d.createElement('link');
      link.rel = 'canonical';
      d.head.appendChild(link);
    }
    link.href = canonical || url;
  }

  if (description) {
    set('meta[name="description"]', {
      tag: 'meta',
      name: 'description',
      content: description,
    });
    set('meta[property="og:description"]', {
      tag: 'meta',
      property: 'og:description',
      content: description,
    });
    set('meta[name="twitter:description"]', {
      tag: 'meta',
      name: 'twitter:description',
      content: description,
    });
  }

  set('meta[property="og:title"]', {
    tag: 'meta',
    property: 'og:title',
    content: title || 'GoalCrumbs',
  });
  set('meta[property="og:type"]', {
    tag: 'meta',
    property: 'og:type',
    content: type,
  });
  set('meta[property="og:url"]', {
    tag: 'meta',
    property: 'og:url',
    content: url,
  });
  set('meta[property="og:site_name"]', {
    tag: 'meta',
    property: 'og:site_name',
    content: siteName,
  });
  set('meta[property="og:image"]', {
    tag: 'meta',
    property: 'og:image',
    content: image,
  });

  set('meta[name="twitter:card"]', {
    tag: 'meta',
    name: 'twitter:card',
    content: 'summary_large_image',
  });
  set('meta[name="twitter:title"]', {
    tag: 'meta',
    name: 'twitter:title',
    content: title || 'GoalCrumbs',
  });
  set('meta[name="twitter:image"]', {
    tag: 'meta',
    name: 'twitter:image',
    content: image,
  });

  set('meta[name="robots"]', {
    tag: 'meta',
    name: 'robots',
    content: noindex ? 'noindex,nofollow' : 'index,follow',
  });

  const existing = d.getElementById('seo-jsonld');
  if (existing) existing.remove();
  if (jsonLd) {
    const script = d.createElement('script');
    script.id = 'seo-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    d.head.appendChild(script);
  }
}

export const seoPresets = {
  brandImage: '/og/birdog.png',
  siteName: 'GoalCrumbs',
  baseUrl: 'https://goalcrumbs.com',
};
