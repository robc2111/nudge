// client/src/components/Footer.jsx
import { FaLinkedin, FaFacebook } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const contacts = [
  { email: 'contact@goalcrumbs.com' },
  { email: 'support@goalcrumbs.com' },
  { email: 'admin@goalcrumbs.com' },
];

const socials = [
  {
    icon: FaLinkedin,
    url: 'https://www.linkedin.com/company/108292953',
    label: 'LinkedIn',
  },
  {
    icon: FaFacebook,
    url: 'https://www.facebook.com/goalcrumbs',
    label: 'Facebook',
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-section">
        <h4>📧 Contact</h4>
        <div className="footer-contacts">
          {contacts.map(({ email }) => (
            <a key={email} href={`mailto:${email}`} className="footer-link">
              {email}
            </a>
          ))}
        </div>
      </div>

      <div className="footer-section">
        <h4>🔗 Social</h4>
        <div className="footer-socials">
          <div className="footer-socials">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
              >
                <s.icon size={20} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-links">
        <Link to="/privacy" className="footer-link">
          Privacy
        </Link>
        <Link to="/terms" className="footer-link">
          Terms
        </Link>
        <a href="mailto:contact@goalcrumbs.com" className="footer-link">
          Contact
        </a>
      </div>

      <p className="footer-copy">
        © {new Date().getFullYear()} GoalCrumbs. All rights reserved.
      </p>
    </footer>
  );
}
