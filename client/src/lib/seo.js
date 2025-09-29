/**
 * Imperative helper for Vite/SPA pages. Call once in a useEffect per page.
 * Example: setSEO({ title: 'Dashboard', description: '...' })
 */
export function setSEO({
  title,
  description,
  url = window.location.href,
  image = '/og/birdog.png',
  siteName = 'GoalCrumbs',
  type = 'website',
  noindex = false,
  canonical,
  jsonLd,
  keywords, // <-- NEW (optional)
  imageAlt = siteName, // <-- NEW
  imageWidth = '1200', // <-- NEW (string for attrs)
  imageHeight = '630', // <-- NEW
  titleSuffix = ` – ${siteName}`, // <-- NEW
  twitterSite = '@goalcrumbs', // <-- NEW (adjust if you have one)
  baseUrl = seoPresets?.baseUrl || 'https://goalcrumbs.com', // absolute fallback
} = {}) {
  const d = document;

  const abs = (maybeRelative) =>
    String(maybeRelative || '').startsWith('http')
      ? maybeRelative
      : `${baseUrl.replace(/\/$/, '')}/${String(maybeRelative || '').replace(/^\//, '')}`;

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
      if (v != null) el.setAttribute(k, v);
    });
  };

  // Title (with suffix)
  const finalTitle = title ? `${title}${titleSuffix}` : siteName;
  d.title = finalTitle;

  // Canonical (prefer explicit canonical; otherwise normalized current URL)
  const canonicalHref = canonical
    ? abs(canonical)
    : abs(
        new URL(url).pathname +
          new URL(url).search.replace(/\b(utm_[^=&]+|ref|source)=[^&]+&?/gi, '')
      );
  let link = d.querySelector('link[rel="canonical"]');
  if (!link) {
    link = d.createElement('link');
    link.rel = 'canonical';
    d.head.appendChild(link);
  }
  link.href = canonicalHref;

  // Description
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

  // Optional keywords
  if (keywords && Array.isArray(keywords) && keywords.length) {
    set('meta[name="keywords"]', {
      tag: 'meta',
      name: 'keywords',
      content: keywords.join(', '),
    });
  }

  // Open Graph
  set('meta[property="og:title"]', {
    tag: 'meta',
    property: 'og:title',
    content: finalTitle,
  });
  set('meta[property="og:type"]', {
    tag: 'meta',
    property: 'og:type',
    content: type,
  });
  set('meta[property="og:url"]', {
    tag: 'meta',
    property: 'og:url',
    content: canonicalHref,
  });
  set('meta[property="og:site_name"]', {
    tag: 'meta',
    property: 'og:site_name',
    content: siteName,
  });
  set('meta[property="og:image"]', {
    tag: 'meta',
    property: 'og:image',
    content: abs(image),
  });
  set('meta[property="og:image:width"]', {
    tag: 'meta',
    property: 'og:image:width',
    content: imageWidth,
  });
  set('meta[property="og:image:height"]', {
    tag: 'meta',
    property: 'og:image:height',
    content: imageHeight,
  });

  // Twitter
  set('meta[name="twitter:card"]', {
    tag: 'meta',
    name: 'twitter:card',
    content: 'summary_large_image',
  });
  set('meta[name="twitter:title"]', {
    tag: 'meta',
    name: 'twitter:title',
    content: finalTitle,
  });
  set('meta[name="twitter:image"]', {
    tag: 'meta',
    name: 'twitter:image',
    content: abs(image),
  });
  set('meta[name="twitter:image:alt"]', {
    tag: 'meta',
    name: 'twitter:image:alt',
    content: imageAlt,
  });
  if (twitterSite) {
    set('meta[name="twitter:site"]', {
      tag: 'meta',
      name: 'twitter:site',
      content: twitterSite,
    });
  }

  // Robots
  set('meta[name="robots"]', {
    tag: 'meta',
    name: 'robots',
    content: noindex ? 'noindex,nofollow' : 'index,follow',
  });

  // JSON-LD
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
