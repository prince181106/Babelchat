import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/WorldMapTicker.css';

const WorldMapTicker = () => {
  const cities = [
    { native: '東京', english: 'Tokyo', flag: '🇯🇵' },
    { native: 'पेरिस', english: 'Paris', flag: '🇫🇷' },
    { native: 'París', english: 'Madrid', flag: '🇪🇸' },
    { native: 'لاغوس', english: 'Lagos', flag: '🇳🇬' },
    { native: 'Nueva York', english: 'New York', flag: '🇺🇸' },
    { native: '北京', english: 'Beijing', flag: '🇨🇳' },
    { native: 'मुंबई', english: 'Mumbai', flag: '🇮🇳' },
    { native: 'São Paulo', english: 'São Paulo', flag: '🇧🇷' },
    { native: 'دبي', english: 'Dubai', flag: '🇦🇪' },
    { native: '서울', english: 'Seoul', flag: '🇰🇷' },
  ];

  // Triple the array for seamless looping
  const extendedCities = [...cities, ...cities, ...cities];

  return (
    <motion.section
      className="world-map-ticker-section"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: false }}
    >
      <div className="ticker-header">
        <h2>Connecting conversations across the globe</h2>
      </div>

      <div className="ticker-container">
        <motion.div
          className="ticker-content"
          animate={{ x: ['0%', '-33.33%'] }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop',
          }}
        >
          {extendedCities.map((city, index) => (
            <div key={index} className="ticker-item">
              <span className="ticker-flag">{city.flag}</span>
              <motion.div
                className="ticker-name"
                whileInView={{
                  opacity: 1,
                }}
              >
                <span className="native-script">{city.native}</span>
                <span className="divider">/</span>
                <span className="english-text">{city.english}</span>
              </motion.div>
            </div>
          ))}
        </motion.div>

        {/* Fade overlays for effect */}
        <div className="ticker-fade-left" />
        <div className="ticker-fade-right" />
      </div>
    </motion.section>
  );
};

export default WorldMapTicker;
