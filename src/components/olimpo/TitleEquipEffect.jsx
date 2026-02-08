import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TitleEquipEffect() {
  const [effect, setEffect] = useState(null);

  useEffect(() => {
    const handleTitleEquip = (e) => {
      const { color, titleName } = e.detail;
      setEffect({ color, titleName });
      
      // Play sound effect
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBDeJ0fHSgjMGHm7A7+OZSA==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
      
      setTimeout(() => setEffect(null), 1500);
    };

    window.addEventListener('title-equipped', handleTitleEquip);
    return () => window.removeEventListener('title-equipped', handleTitleEquip);
  }, []);

  return (
    <AnimatePresence>
      {effect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0.8, 0], scale: [0, 1.5, 2, 3] }}
            transition={{ duration: 1.2 }}
            className="absolute rounded-full"
            style={{
              width: '200px',
              height: '200px',
              background: `radial-gradient(circle, ${effect.color}80 0%, ${effect.color}00 70%)`,
              boxShadow: `0 0 100px ${effect.color}`,
            }}
          />
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center z-10"
          >
            <p 
              className="text-3xl font-bold mb-2"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                color: effect.color,
                textShadow: `0 0 20px ${effect.color}`
              }}
            >
              ✨
            </p>
            <p 
              className="text-xl font-semibold"
              style={{ 
                fontFamily: 'Orbitron, sans-serif',
                color: effect.color,
                textShadow: `0 0 10px ${effect.color}`
              }}
            >
              {effect.titleName}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}