import { motion } from 'framer-motion';
import { Percent } from 'lucide-react';

export default function ManagementFeeIcon({ active }: { active: boolean }) {
  return (
    <motion.span
      animate={active ? { rotate: [0, 20, -20, 0], scale: 1.25, color: '#2563eb' } : { rotate: 0, scale: 1, color: '#64748b' }}
      transition={{
        rotate: { repeat: active ? Infinity : 0, duration: 1.2, ease: 'easeInOut' },
        scale: { duration: 0.3 },
        color: { duration: 0.3 }
      }}
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 2, marginRight: 2 }}
      aria-label="Frais de gestion"
    >
      <Percent size={22} />
    </motion.span>
  );
}
