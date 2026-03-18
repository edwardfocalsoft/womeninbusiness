import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MembershipCard from "./pages/MembershipCard";
import EventHistory from "./pages/EventHistory";
import Announcements from "./pages/Announcements";
import Receipts from "./pages/Receipts";
import Events from "./pages/Events";
import Network from "./pages/Network";
import Resources from "./pages/Resources";
import Membership from "./pages/Membership";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Feedback from "./pages/Feedback";
import Admin from "./pages/Admin";
import AdminMembers from "./pages/AdminMembers";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminEvents from "./pages/AdminEvents";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminResources from "./pages/AdminResources";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/membership-card" element={<Dashboard />} />
              <Route path="/event-history" element={<EventHistory />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/receipts" element={<Receipts />} />
              <Route path="/events" element={<Events />} />
              <Route path="/network" element={<Network />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/membership" element={<Membership />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/profile" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/members" element={<AdminMembers />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/admin/announcements" element={<AdminAnnouncements />} />
              <Route path="/admin/resources" element={<AdminResources />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
