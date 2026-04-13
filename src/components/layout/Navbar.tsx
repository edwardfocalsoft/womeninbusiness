import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, Shield, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import liventsLogoAlt from '@/assets/livents-logo-alt.png';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPublic = ['/', '/auth', '/membership'].includes(location.pathname);

  return (
    <nav className={`${isPublic ? 'fixed top-0 left-0 right-0 z-50' : 'sticky top-0 z-50'} bg-background/95 backdrop-blur-md border-b border-border`}>
      <div className="flex items-center justify-between h-14 px-4">
        <Link to={user ? '/dashboard' : '/'} className="shrink-0">
          <img src={liventsLogoAlt} alt="Livents" className="h-8 object-contain" />
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {isAdmin && !isAdminRoute && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/admin/members')}>
                  <Shield className="w-3 h-3 mr-1" /> Admin
                </Button>
              )}
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <User className="w-3 h-3" /> <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>Dashboard</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { signOut(); navigate('/'); }}><LogOut className="w-4 h-4 mr-2" />Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Sign In</Button>
              <Button size="sm" className="font-semibold" onClick={() => navigate('/auth?tab=signup')}>Register</Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
