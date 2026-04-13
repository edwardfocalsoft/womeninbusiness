import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import liventsLogoAlt from '@/assets/livents-logo-alt.png';

interface PagePreloaderProps {
  onComplete: () => void;
}

export default function PagePreloader({ onComplete }: PagePreloaderProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-background flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col items-center gap-4"
          >
            <img src={liventsLogoAlt} alt="Livents" className="w-48 md:w-64 object-contain" />
            <motion.div
              className="h-1 bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: 192 }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
