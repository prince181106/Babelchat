import React, { useRef } from 'react';
import { motion, useScroll } from 'framer-motion';
import './Landing.css';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import LiveSyncAnimation from './components/LiveSyncAnimation';
import FeatureBentoGrid from './components/FeatureBentoGrid';
import WorldMapTicker from './components/WorldMapTicker';

const Landing = ({ onStartChat }) => {
  const containerRef = useRef(null);
  const { scrollY } = useScroll();

  return (
    <motion.div
      className="landing-container"
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className="ambient-art" aria-hidden="true">
        <span className="ambient-blob ambient-blob-one"></span>
        <span className="ambient-blob ambient-blob-two"></span>
        <span className="ambient-blob ambient-blob-three"></span>
        <span className="ambient-grain"></span>
      </div>

      {/* Sticky Navigation Bar */}
      <Navbar onLoginClick={onStartChat} />

      {/* Hero Section */}
      <HeroSection onStartChat={onStartChat} scrollY={scrollY} />

      {/* Magic Moment: Live-Sync Animation */}
      <LiveSyncAnimation scrollY={scrollY} />

      {/* Feature Bento Grid */}
      <FeatureBentoGrid />

      {/* World Map Ticker */}
      <WorldMapTicker />

      {/* CTA Footer Section */}
      <motion.section
        id="privacy"
        className="cta-footer-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: false }}
      >
        <div className="cta-footer-content">
          <h2>Ready to break down language barriers?</h2>
          <p>Join thousands of users connecting across the globe, one conversation at a time.</p>
          <button className="cta-btn-primary" onClick={onStartChat}>
            Start Your First Global Chat
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
};

export default Landing;
