import React, { useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/Navbar.css';

const Navbar = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.querySelector(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <nav
      className="navbar"
    >
      <motion.div
        className="navbar-container"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="navbar-logo">
          <span className="logo-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="img">
              <title>BabelChat logo</title>
              <path
                fill="currentColor"
                d="M32 6c13.255 0 24 8.954 24 20s-10.745 20-24 20h-5.645L14 56v-10.88C8.919 41.44 6 34.104 6 26 6 14.954 16.745 6 30 6h2z"
              />
              <path
                fill="#d7f4fb"
                d="M18 30a2 2 0 0 1 2-2h24a2 2 0 0 1 0 4h-24a2 2 0 0 1-2-2z"
              />
              <path
                fill="#d7f4fb"
                d="M23 38a2 2 0 0 1 2-2h14a2 2 0 0 1 0 4h-14a2 2 0 0 1-2-2z"
              />
              <path
                fill="#b5e8f5"
                d="M23 36h3v4h-3zm7 0h4v4h-4zm8 0h3v4h-3z"
              />
            </svg>
          </span>
          <span className="logo-text">BabelChat</span>
        </div>

        {/* Desktop Navigation Links */}
        <div className="navbar-links">
          <button
            className="nav-link"
            onClick={() => scrollToSection('#features')}
          >
            Features
          </button>
          <button
            className="nav-link"
            onClick={() => scrollToSection('#privacy')}
          >
            Privacy
          </button>
        </div>

        {/* Login Button & Mobile Menu Toggle */}
        <div className="navbar-actions">
          <button
            className="login-btn"
            onClick={onLoginClick}
          >
            Login
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className={`mobile-menu-toggle ${isMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </motion.div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div
          className="mobile-menu"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            className="mobile-nav-link"
            onClick={() => scrollToSection('#features')}
          >
            Features
          </button>
          <button
            className="mobile-nav-link"
            onClick={() => scrollToSection('#privacy')}
          >
            Privacy
          </button>
          <button
            className="mobile-login-btn"
            onClick={() => {
              onLoginClick();
              setIsMenuOpen(false);
            }}
          >
            Login
          </button>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
