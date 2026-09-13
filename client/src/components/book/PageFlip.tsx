import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface PageFlipProps {
  children: ReactNode;
  /** Arbitrary key to re-mount children on page change (e.g. chapter order). */
  pageKey: string | number;
  direction?: 'forward' | 'backward';
  onFlipEnd?: () => void;
  /** Paged index (used for accessibility label). */
  index?: number;
}

/**
 * 3D page-turn wrapper. Desktop: perspective flip via framer-motion.
 * Mobile (<768px): degrades to a simple fade to avoid janky 3D.
 */
export function PageFlip({ children, pageKey, direction = 'forward', onFlipEnd, index }: PageFlipProps) {
  const [isCompact, setIsCompact] = useState(false);
  const motionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 767px)');
    setIsCompact(mq?.matches ?? false);
    const onChg = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    mq?.addEventListener?.('change', onChg);
    return () => mq?.removeEventListener?.('change', onChg);
  }, []);

  const handleFlipEnd = useCallback(() => onFlipEnd?.(), [onFlipEnd]);

  const variants = isCompact
    ? {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
      }
    : {
        initial: {
          opacity: 0.4,
          rotateY: direction === 'forward' ? -70 : 70,
          transformOrigin: direction === 'forward' ? 'left center' : 'right center',
          z: -60,
        },
        animate: { opacity: 1, rotateY: 0, transformOrigin: 'center', z: 0 },
        exit: {
          opacity: 0,
          rotateY: direction === 'forward' ? 70 : -70,
          transformOrigin: direction === 'forward' ? 'right center' : 'left center',
          z: -60,
        },
      };

  return (
    <div
      className={`perspective-3d ${isCompact ? '' : 'preserve-3d'}`}
      data-testid="page-flip"
      role="group"
      aria-label={index !== undefined ? `Page ${index + 1}` : undefined}
    >
      <AnimatePresence mode="wait" onExitComplete={handleFlipEnd}>
        <motion.div
          key={pageKey}
          ref={motionRef}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className={`${isCompact ? '' : 'preserve-3d backface-hidden'}`}
          data-testid="page-flip-panel"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}