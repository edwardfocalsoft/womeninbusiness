import {
  Users, BarChart3, Calendar, Megaphone, Shield, Settings, UserCog, CreditCard,
  LayoutDashboard, BookOpen, ShieldCheck,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import liventsLogo from '@/assets/livents-logo.png';

const adminItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Payments', url: '/admin/payments', icon: CreditCard },
  { title: 'Members', url: '/admin/members', icon: Users },
  { title: 'Compliance', url: '/admin/compliance', icon: ShieldCheck },
  { title: 'Claims', url: '/admin/claims', icon: ShieldCheck },
  { title: 'Events', url: '/admin/events', icon: Calendar },
  { title: 'Announcements', url: '/admin/announcements', icon: Megaphone },
  { title: 'User & Roles', url: '/admin/users', icon: UserCog },
];

const systemItems = [
  { title: 'Admin Settings', url: '/admin/settings', icon: Settings },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="pt-0">
        {/* Logo area */}
        {!collapsed && (
          <div className="px-4 py-5 flex items-center justify-center">
            <img src={liventsLogo} alt="Livents" className="h-8 object-contain" />
          </div>
        )}
        {collapsed && <div className="h-4" />}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map(item => (
                <SidebarMenuItem key={item.url + item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50 text-sidebar-foreground" activeClassName="bg-sidebar-accent text-sidebar-foreground font-semibold">
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50 text-sidebar-foreground" activeClassName="bg-sidebar-accent text-sidebar-foreground font-semibold">
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
