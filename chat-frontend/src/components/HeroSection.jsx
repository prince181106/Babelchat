import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/HeroSection.css';

const HeroSection = ({ onStartChat, scrollY }) => {
  // Scroll-based opacity for fade-out effect
  const heroOpacity = scrollY ? undefined : {};

  const scrollToFeatures = () => {
    const featuresSection = document.querySelector('.live-sync-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.section
      className="hero-section"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease: 'easeOut' }}
    >
      {/* Decorative background elements */}
      <motion.div
        className="hero-decoration-circle-1"
        animate={{
          y: [0, 20, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="hero-decoration-circle-2"
        animate={{
          y: [0, -20, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="hero-content">
        <motion.h1
          className="hero-headline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Break language barriers instantly 
        </motion.h1>

        <motion.p
          className="hero-subtext"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
         Talk to anyone, in any language - in real time <br/> Fast, accurate real-time translation for your chats
        </motion.p>

        <motion.div
          className="hero-cta-group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <button className="cta-btn-primary" onClick={onStartChat}>
            Start Your First Global Chat
          </button>
          <button className="cta-btn-secondary" onClick={scrollToFeatures}>
            See How It Works
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="scroll-indicator"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span>Scroll to explore</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 3v10M10 13l3-3m-3 3l-3-3"
            stroke="#2f343a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </motion.section>
  );
};

export default HeroSection;
