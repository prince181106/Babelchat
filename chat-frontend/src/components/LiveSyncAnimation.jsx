import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import '../styles/LiveSyncAnimation.css';

const LiveSyncAnimation = ({ scrollY }) => {
  const sectionRef = useRef(null);
  const [sectionTop, setSectionTop] = useState(0);

  useEffect(() => {
    if (sectionRef.current) {
      setSectionTop(sectionRef.current.offsetTop);
    }
  }, []);

  // Calculate scroll progress specific to this section
  const scrollProgress = useTransform(scrollY, [sectionTop - 400, sectionTop + 400], [0, 1]);

  // Animation states based on scroll progress
  const messageOpacity = useTransform(scrollProgress, [0, 0.2, 0.4], [0, 1, 1]);
  const messageY = useTransform(scrollProgress, [0, 0.2], [20, 0]);

  const progressWidth = useTransform(scrollProgress, [0.2, 0.5], ['0%', '100%']);

  const translationOpacity = useTransform(scrollProgress, [0.4, 0.6, 0.8], [0, 1, 1]);
  const translationY = useTransform(scrollProgress, [0.4, 0.6], [20, 0]);

  return (
    <motion.section className="live-sync-section" ref={sectionRef}>
      <div className="live-sync-container">
        {/* Left: Text Content */}
        <motion.div className="live-sync-content">
          <h2>Real-time translation that keeps up with you</h2>
          <p>
            Watch as your messages translate instantly. No delays, no awkward pauses—just pure communication flow.
          </p>
        </motion.div>

        {/* Right: Phone Mockup */}
        <div className="phone-mockup-wrapper">
          <div className="phone-mockup">
            <div className="phone-screen">
              {/* Status Bar */}
              <div className="phone-status-bar">
                <span>9:41</span>
              </div>

              {/* Chat Area */}
              <div className="phone-chat-area">
                {/* Original Message */}
                <motion.div
                  className="message-bubble message-sent"
                  style={{
                    opacity: messageOpacity,
                    y: messageY,
                  }}
                >
                  <span>How are you?</span>
                  <span className="message-language">English</span>
                </motion.div>

                {/* Progress Bar */}
                <motion.div
                  className="translation-progress"
                  style={{ width: progressWidth }}
                />

                {/* Translated Message */}
                <motion.div
                  className="message-bubble message-translated"
                  style={{
                    opacity: translationOpacity,
                    y: translationY,
                  }}
                >
                  <span>¿Cómo estás?</span>
                  <span className="message-language">Spanish</span>
                </motion.div>
              </div>

              {/* Input Area */}
              <div className="phone-input-area">
                <input type="text" placeholder="Type a message..." disabled />
                <button>💬</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default LiveSyncAnimation;
