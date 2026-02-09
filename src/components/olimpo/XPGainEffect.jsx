import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

const XPGainEffect = ({ xp, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 900);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], y: -80, scale: [0.8, 1.1, 1] }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      className="fixed left-1/2 bottom-32 -translate-x-1/2 z-[100] pointer-events-none"
      style={{ filter: 'drop-shadow(0 0 12px rgba(0,255,102,0.6))' }}
    >
      <div className="flex items-center gap-2 bg-[#0B0F0C] px-4 py-2 rounded-full border-2 border-[#00FF66]">
        <Zap className="w-5 h-5 text-[#00FF66]" fill="#00FF66" />
        <span 
          className="text-2xl font-bold text-[#00FF66]"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          +{xp} XP
        </span>
      </div>
    </motion.div>
  );
};

export const XPGainManager = () => {
  const [queue, setQueue] = useState([]);
  const [currentXP, setCurrentXP] = useState(null);

  useEffect(() => {
    const handleXPGain = (event) => {
      setQueue(prev => [...prev, event.detail.xp]);
    };

    window.addEventListener('xp-gain', handleXPGain);
    return () => window.removeEventListener('xp-gain', handleXPGain);
  }, []);

  useEffect(() => {
    if (!currentXP && queue.length > 0) {
      setCurrentXP(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [currentXP, queue]);

  const handleComplete = () => {
    setCurrentXP(null);
  };

  return (
    <AnimatePresence>
      {currentXP && (
        <XPGainEffect xp={currentXP} onComplete={handleComplete} />
      )}
    </AnimatePresence>
  );
};

export const triggerXPGain = (xp, sfxEnabled = true) => {
  // Make globally accessible
  window.triggerXPGain = triggerXPGain;
  
  // Dispatch visual effect
  window.dispatchEvent(new CustomEvent('xp-gain', { detail: { xp } }));

  // Play sound effect if enabled
  if (sfxEnabled) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      // Fallback: haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  } else {
    // Only haptic when sound disabled
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }
};

export default XPGainEffect;