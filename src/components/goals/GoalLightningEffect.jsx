import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function GoalLightningEffect({ show, onComplete }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ pointerEvents: 'none' }}
        >
          {/* Lightning Bolt */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: [-45, -30, -45]
            }}
            transition={{ 
              duration: 0.6,
              times: [0, 0.6, 1]
            }}
            className="relative"
          >
            <Zap 
              className="w-32 h-32 text-[#3B82F6]" 
              fill="#3B82F6"
              strokeWidth={1.5}
              style={{
                filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 60px rgba(59, 130, 246, 0.4))',
              }}
            />
          </motion.div>

          {/* Blue Glow Pulses */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.6, 0],
              scale: [0, 2.5, 3]
            }}
            transition={{ 
              duration: 1,
              times: [0, 0.5, 1]
            }}
            className="absolute w-64 h-64 rounded-full bg-[#3B82F6] blur-3xl"
          />

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="absolute bottom-1/3 text-center"
          >
            <p 
              className="text-2xl font-bold text-[#3B82F6]"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 20px rgba(59, 130, 246, 0.6)'
              }}
            >
              Sua meta foi completa!
            </p>
            <p 
              className="text-xl font-bold text-[#3B82F6] mt-2"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 20px rgba(59, 130, 246, 0.6)'
              }}
            >
              Parabéns
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}