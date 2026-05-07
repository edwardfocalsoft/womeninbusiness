import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  Users,
  Settings,
  HelpCircle,
  MessageSquare,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import liventsLogo from '@/assets/livents-logo.png';

const mainItems = [
  { 
    title: 'Dashboard', 
    url: '/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    title: 'Manage My Business', 
    url: 'https://smeplus.co.za/dashboard', 
    icon: Store, 
    isExternal: true,
    comingSoon: true,
  },
  { 
    title: 'Events', 
    url: '/events', 
    icon: Calendar 
  },
  { 
    title: 'Compliance', 
    url: '/compliance', 
    icon: ShieldCheck 
  },
  { 
    title: 'Announcements', 
    url: '/announcements', 
    icon: Megaphone 
  },
  { 
    title: 'Directory', 
    url: '/network', 
    icon: Users 
  },
];

const bottomItems = [
  { title: 'Settings', url: '/settings', icon: Settings },
  { title: 'Help & Support', url: '/help', icon: HelpCircle },
  { title: 'Feedback', url: '/feedback', icon: MessageSquare },
];

export default function MemberSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const renderMenuItem = (item: any) => {
    const content = (
      <>
        <item.icon className="h-4 w-4 mr-2" />
        {!collapsed && (
          <span className="flex items-center gap-2">
            {item.title}
            {item.comingSoon && (
              <span className="text-[9px] uppercase tracking-wide bg-sidebar-accent text-sidebar-foreground/80 px-1.5 py-px rounded">
                Soon
              </span>
            )}
          </span>
        )}
      </>
    );

    const baseStyles = "hover:bg-sidebar-accent/50 text-sidebar-foreground flex items-center w-full px-3 py-2 rounded-md transition-colors";

    if (item.comingSoon) {
      return (
        <button
          type="button"
          aria-disabled="true"
          disabled
          className={`${baseStyles} opacity-60 cursor-not-allowed hover:bg-transparent`}
        >
          {content}
        </button>
      );
    }

    if (item.isExternal) {
      return (
        <a 
          href={item.url} 
          className={baseStyles}
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }

    return (
      <NavLink 
        to={item.url} 
        end 
        className={baseStyles}
        activeClassName="bg-sidebar-accent text-sidebar-foreground font-semibold"
      >
        {content}
      </NavLink>
    );
  };

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

        {/* Main Navigation Group */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    {renderMenuItem(item)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Navigation Group */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    {renderMenuItem(item)}
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
