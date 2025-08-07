// Footer.jsx
import React from 'react';
import { FaInstagram, FaTwitter, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <div style={styles.section}>
        <h4>📧 Contact</h4>
        <ul style={styles.linkList}>
          <li><a href="mailto:contact@goalcrumbs.com">contact@goalcrumbs.com</a></li>
          <li><a href="mailto:support@goalcrumbs.com">support@goalcrumbs.com</a></li>
          <li><a href="mailto:admin@goalcrumbs.com">admin@goalcrumbs.com</a></li>
        </ul>
      </div>

      <div style={styles.section}>
        <h4>🔗 Social</h4>
        <div style={styles.socialIcons}>
          <a href="https://instagram.com/goalcrumbs" target="_blank" rel="noopener noreferrer"><FaInstagram size={20} /></a>
          <a href="https://twitter.com/goalcrumbs" target="_blank" rel="noopener noreferrer"><FaTwitter size={20} /></a>
          <a href="https://www.linkedin.com/company/goalcrumbs" target="_blank" rel="noopener noreferrer"><FaLinkedin size={20} /></a>
        </div>
      </div>

      <p style={styles.credits}>© {new Date().getFullYear()} GoalCrumbs. All rights reserved.</p>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: '#fef0dd',
    padding: '2rem',
    textAlign: 'center',
    marginTop: '4rem',
    borderTop: '1px solid #ccc',
  },
  section: {
    marginBottom: '1.5rem',
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: '0.5rem 0',
    lineHeight: '1.8',
  },
  socialIcons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  credits: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '1rem',
  },
};

export default Footer;