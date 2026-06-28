import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for 2.5 seconds, then trigger exit animation
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Wait for exit animation to finish before unmounting
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* Animated Background Gradients */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.15, scale: 1.5 }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[100px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1.5 }}
            transition={{ duration: 3, ease: "easeOut", delay: 0.2 }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-[100px]"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Icon Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 1.5,
              }}
              className="bg-transparent mb-6 drop-shadow-2xl flex items-center justify-center"
            >
              <img src="/logo.png" alt="MealPing Logo" className="w-32 h-32 object-contain" />
            </motion.div>

            {/* Text Animation */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="text-4xl font-black tracking-tight text-foreground"
            >
              Meal<span className="text-primary">Ping</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="text-muted-foreground mt-2 text-sm font-medium tracking-widest uppercase"
            >
              Premium Mess Manager
            </motion.p>
          </div>

          {/* Loading Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-12 flex flex-col items-center gap-3"
          >
            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                  ease: "easeInOut",
                }}
                className="w-full h-full bg-primary rounded-full"
              />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Cooking up your data...
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
