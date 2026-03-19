import { ReactNode, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import MemberSidebar from './MemberSidebar';
import AdminSidebar from './AdminSidebar';
import PagePreloader from '@/components/PagePreloader';
import { useAuth } from '@/lib/auth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const publicRoutes = ['/', '/auth', '/membership'];
const bareRoutes = ['/onboarding', '/reset-password'];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [showPreloader, setShowPreloader] = useState(true);
  const prevPathRef = useRef(location.pathname);

  const isPublic = publicRoutes.includes(location.pathname);
  const isBare = bareRoutes.includes(location.pathname);
  const showSidebar = user && !isPublic && !isBare;

  // Only show preloader on actual route changes, not tab switches
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setShowPreloader(true);
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const handlePreloaderComplete = () => {
    setShowPreloader(false);
  };

  if (showSidebar) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          {showPreloader && <PagePreloader onComplete={handlePreloaderComplete} />}
          {isAdmin ? <AdminSidebar /> : <MemberSidebar />}
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <div className="flex items-center h-10 border-b border-border px-2 bg-background">
              <SidebarTrigger />
            </div>
            <main className="flex-1 px-4 sm:px-6 lg:px-8">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (isBare) {
    return (
      <div className="min-h-screen flex flex-col">
        {showPreloader && <PagePreloader onComplete={handlePreloaderComplete} />}
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showPreloader && <PagePreloader onComplete={handlePreloaderComplete} />}
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
