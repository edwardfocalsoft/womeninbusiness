import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Index() {
  return (
    <section className="relative h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-hero">
      <div className="container relative z-10 px-4">
        <motion.div initial="hidden" animate="visible" className="max-w-2xl mx-auto text-center">
          <motion.p variants={fadeUp} custom={0} className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">
            Membership Management Platform
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
            Women In Business
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-base sm:text-lg mb-3 max-w-xl mx-auto leading-relaxed">
            South Africa's premier membership platform for entrepreneurial women. Join, manage, and grow with us.
          </motion.p>
          <motion.p variants={fadeUp} custom={3} className="text-muted-foreground/60 text-xs sm:text-sm mb-10">
            Non Profit Organisation (2020/911027/08) · 16+ Years of Voluntary Service
          </motion.p>
          <motion.div variants={fadeUp} custom={4} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-base px-10 py-6 font-semibold w-full sm:w-64">
              <Link to="/auth?tab=signup">Become a Member</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-10 py-6 w-full sm:w-64">
              <Link to="/auth">Member Sign In <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
