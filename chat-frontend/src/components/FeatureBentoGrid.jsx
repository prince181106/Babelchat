import React from 'react';
import { motion } from 'framer-motion';
import '../styles/FeatureBentoGrid.css';

const FeatureBentoGrid = () => {
  const features = [
    {
      id: 1,
      title: 'No Lag Time',
      description: 'Enjoy instantaneous translations that keep pace with your natural conversation flow.',
      icon: '⚡',
      color: '#E07A5F',
    },
    {
      id: 2,
      title: 'Understand the Vibe',
      description: 'Our AI goes beyond literal words to grasp slang, cultural context, and the true meaning of what you\'re saying.',
      icon: '🎯',
      color: '#1B3022',
    },
    {
      id: 3,
      title: 'Your Data is Yours',
      description: 'End-to-end encrypted, zero ads, never sold. Your conversations belong to you and you alone.',
      icon: '🔒',
      color: '#E07A5F',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <motion.section
      id="features"
      className="feature-bento-section"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      variants={containerVariants}
    >
      <motion.div className="bento-header" variants={itemVariants}>
        <h2>Why BabelChat?</h2>
        <p>Built for real humans who want to connect—not for robots who want to spy.</p>
      </motion.div>

      <motion.div className="bento-grid" variants={containerVariants}>
        {features.map((feature) => (
          <motion.div
            key={feature.id}
            className="bento-card"
            variants={itemVariants}
            whileHover={{
              y: -8,
              boxShadow: '0 20px 40px rgba(27, 48, 34, 0.15)',
              transition: { duration: 0.3 },
            }}
          >
            <div className="bento-card-icon" style={{ color: feature.color }}>
              {feature.icon}
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
};

export default FeatureBentoGrid;
