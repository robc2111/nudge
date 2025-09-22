// src/components/ScrollManager.jsx
import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function isScrollable(el) {
  if (!el) return false;
  const style = getComputedStyle(el);
  const oy = style.overflowY;
  const canScrollY =
    (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight;
  return canScrollY;
}

function resetAllScrollContainers() {
  // 1) Window/document (covers the normal case)
  try {
    // avoid CSS smooth scrolling “landing mid way”
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
  } catch {
    //ignore
  }

  // 2) Common app containers that might scroll
  const main = document.getElementById('main');
  const root = document.getElementById('root');

  const candidates = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    main,
    root,
  ].filter(Boolean);

  // 3) Any *other* scrollable elements currently in the DOM
  //    (e.g. a layout wrapper with overflow:auto)
  const autos = Array.from(document.querySelectorAll('*')).filter(isScrollable);

  for (const el of [...new Set([...candidates, ...autos])]) {
    try {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    } catch {
      //ignore
    }
  }
}

function scrollToHash(hash) {
  const id = hash.slice(1);
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;

  // prefer native element scrolling to keep inside its container if needed
  // small delay ensures the element exists after suspense/lazy loads
  setTimeout(() => {
    try {
      el.scrollIntoView({ block: 'start', inline: 'nearest' });
    } catch {
      // fallback: window jump
      const rect = el.getBoundingClientRect();
      window.scrollTo(0, window.scrollY + rect.top);
    }
  }, 0);

  return true;
}

export default function ScrollManager() {
  const { pathname, search, hash } = useLocation();

  // Disable browser scroll restoration globally
  useEffect(() => {
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
    } catch {
      //ignore
    }
  }, []);

  // On route change: either scroll to #hash target or hard reset all containers to top.
  useLayoutEffect(() => {
    if (hash && scrollToHash(hash)) {
      return;
    }

    // Do an immediate reset…
    resetAllScrollContainers();

    // …and a second pass on the next frame in case content height changes after Suspense resolves.
    const id1 = requestAnimationFrame(resetAllScrollContainers);
    // Some browsers still adjust after images/fonts; one more micro-delay covers it.
    const id2 = setTimeout(resetAllScrollContainers, 60);

    return () => {
      cancelAnimationFrame(id1);
      clearTimeout(id2);
    };
  }, [pathname, search, hash]);

  return null;
}
