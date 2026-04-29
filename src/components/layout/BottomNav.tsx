import { NavLink } from 'react-router-dom';
import { ShieldCheck, Calendar, Store } from 'lucide-react';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors ${
    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
  }`;

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
      <div className="flex items-stretch h-14">
        <NavLink to="/compliance" className={navItemClass}>
          <ShieldCheck className="w-5 h-5" />
          <span>Compliance</span>
        </NavLink>
        <NavLink to="/events" className={navItemClass}>
          <Calendar className="w-5 h-5" />
          <span>Events</span>
        </NavLink>
        <a
          href="https://smeplus.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Store className="w-5 h-5" />
          <span>SMEPlus</span>
        </a>
      </div>
    </nav>
  );
}
