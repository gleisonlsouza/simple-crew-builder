import { motion } from 'motion/react';
import { useState } from 'react';

export const WorkingParticles = ({ color }: { color: string }) => {
  const [particles] = useState(() => [...Array(6)].map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 40,
    y: (Math.random() - 0.5) * 40,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    duration: 1 + Math.random()
  })));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            scale: [0, 1, 0],
            x: p.x,
            y: p.y - 40
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            delay: p.delay,
            ease: "easeOut"
          }}
          className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
            width: p.size,
            height: p.size
          }}
        />
      ))}
    </div>
  );
};
