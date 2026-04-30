import { ReactNode, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import MemberSidebar from './MemberSidebar';
import AdminSidebar from './AdminSidebar';
import BottomNav from './BottomNav';
import ComplianceGate from './ComplianceGate';
import PagePreloader from '@/components/PagePreloader';
import { useAuth } from '@/lib/auth';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';

const publicRoutes = ['/', '/auth', '/membership'];
const bareRoutes = ['/onboarding', '/reset-password'];

// Auto-close mobile sidebar on route change.
function MobileSidebarAutoClose() {
  const { setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);
  return null;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [showPreloader, setShowPreloader] = useState(true);
  const prevPathRef = useRef(location.pathname);

  const isPublic = publicRoutes.includes(location.pathname);
  // Compliance accessed from onboarding flow should render bare (no nav/sidebar/footer)
  const isComplianceOnboarding =
    location.pathname === '/compliance' &&
    new URLSearchParams(location.search).get('from') === 'onboarding';
  const isBare = bareRoutes.includes(location.pathname) || isComplianceOnboarding;
  const showSidebar = user && !isPublic && !isBare;
  const isMemberRoute = showSidebar && !isAdmin;

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setShowPreloader(true);
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const handlePreloaderComplete = () => setShowPreloader(false);

  if (showSidebar) {
    return (
      <SidebarProvider>
        <MobileSidebarAutoClose />
        <ComplianceGate />
        <div className="min-h-screen flex w-full">
          {showPreloader && <PagePreloader onComplete={handlePreloaderComplete} />}
          {isAdmin ? <AdminSidebar /> : <MemberSidebar />}
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar showSidebarTrigger />
            <main className={`flex-1 px-4 sm:px-6 lg:px-8 ${isMemberRoute ? 'pb-20 md:pb-0' : ''}`}>
              {children}
            </main>
            <Footer />
            {isMemberRoute && <BottomNav />}
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
