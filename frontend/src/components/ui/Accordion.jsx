import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Accessible FAQ Accordion component with animated collapse and expand.
 */
export default function Accordion({ items = [], className }) {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="rounded-2xl border border-teal-900/10 bg-white shadow-soft transition-all duration-200 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-text-heading text-sm sm:text-base hover:text-teal-700 transition-colors focus:outline-none"
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 text-teal-600"
              >
                <ChevronDown size={18} />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-text-muted leading-relaxed border-t border-slate-100">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
