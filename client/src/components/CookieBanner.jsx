import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const CONSENT_KEY = 'gc:cookie-consent:v1';

/**
 * Heuristics to decide whether to show the banner:
 * - If the user has already accepted -> don't show.
 * - If there are any cookies present -> show.
 * - Or if you want to force it (e.g., you know third-party cookies will be set later),
 *   set VITE_FORCE_COOKIE_BANNER=1 in your .env.
 */
function shouldShowBanner() {
  try {
    const accepted = localStorage.getItem(CONSENT_KEY) === 'accepted';
    if (accepted) return false;

    const forced =
      import.meta.env?.VITE_FORCE_COOKIE_BANNER === '1' ||
      import.meta.env?.VITE_SHOW_COOKIE_BANNER === '1';

    const hasCookies =
      typeof document !== 'undefined' &&
      typeof document.cookie === 'string' &&
      document.cookie.trim() !== '';

    return forced || hasCookies;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('CookieBanner storage error:', e);
    }
  }
}

export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(shouldShowBanner());
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('CookieBanner storage error:', e);
      }
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
    >
      <div className="cookie-banner__content">
        <p className="cookie-banner__text">
          We use cookies and similar technologies for things like analytics,
          remembering your preferences, and improving GoalCrumbs. By using the
          site, you agree to this in our{' '}
          <Link className="brand-link-dark" to="/privacy">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="cookie-banner__actions">
          <button type="button" className="btn" onClick={accept}>
            OK
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Learn more"
            onClick={() => navigate('/privacy')}
          >
            Learn more
          </button>
        </div>
      </div>
    </div>
  );
}
