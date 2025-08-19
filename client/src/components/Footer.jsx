// Footer.jsx
import { FaInstagram, FaTwitter, FaLinkedin } from 'react-icons/fa';

const contacts = [
  { label: 'Contact', email: 'contact@goalcrumbs.com' },
  { label: 'Support', email: 'support@goalcrumbs.com' },
  { label: 'Admin', email: 'admin@goalcrumbs.com' },
];

const socials = [
  { icon: FaInstagram, url: 'https://instagram.com/goalcrumbs', label: 'Instagram' },
  { icon: FaTwitter, url: 'https://twitter.com/goalcrumbs', label: 'Twitter' },
  { icon: FaLinkedin, url: 'https://www.linkedin.com/company/goalcrumbs', label: 'LinkedIn' },
];

const Footer = () => {
  return (
    <footer className="bg-[#fef0dd] border-t border-gray-300 mt-16 p-8 text-center">
      <div className="mb-6">
        <h4 className="font-semibold text-lg mb-2">📧 Contact</h4>
        <address className="not-italic space-y-1">
          {contacts.map(({ email }) => (
            <div key={email}>
              <a
                href={`mailto:${email}`}
                className="text-blue-600 hover:underline"
              >
                {email}
              </a>
            </div>
          ))}
        </address>
      </div>

      <div className="mb-6">
        <h4 className="font-semibold text-lg mb-2">🔗 Social</h4>
        <nav className="flex justify-center gap-4">
          {socials.map((item) => {
  const { icon: Icon, url, label } = item;
  return (
    <a
      key={label}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="text-gray-700 hover:text-[#bd661d] transition"
    >
      <Icon size={20} />
    </a>
  );
})}
        </nav>
      </div>

      <p className="text-sm text-gray-600">
        © {new Date().getFullYear()} GoalCrumbs. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;