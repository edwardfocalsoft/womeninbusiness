import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, CalendarClock, CreditCard, Megaphone,
  BookOpen, Users, Settings, HelpCircle, MessageSquare,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem,
  SidebarMenuSubButton, useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
];

const eventsItems = {
  title: 'Events', icon: Calendar, url: '/events',
  children: [
    { title: 'Browse Events', url: '/events' },
    { title: 'Event History', url: '/event-history' },
  ],
};

const contentItems = [
  { title: 'Announcements', url: '/announcements', icon: Megaphone },
  { title: 'Resources', url: '/resources', icon: BookOpen },
  { title: 'Directory', url: '/network', icon: Users },
];

const bottomItems = [
  { title: 'Settings', url: '/settings', icon: Settings },
  { title: 'Help & Support', url: '/help', icon: HelpCircle },
  { title: 'Feedback', url: '/feedback', icon: MessageSquare },
];

function CollapsibleNavGroup({ item }: { item: typeof eventsItems }) {
  const location = useLocation();
  const isActive = item.children.some(c => location.pathname === c.url);
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Collapsible defaultOpen={true}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className={`w-full justify-between ${isActive ? 'bg-primary/10 text-primary font-semibold' : ''}`}>
            <span className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </span>
            {!collapsed && <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-90" />}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map(child => (
              <SidebarMenuSubItem key={child.url}>
                <SidebarMenuSubButton asChild>
                  <NavLink to={child.url} end className="text-muted-foreground hover:text-foreground" activeClassName="text-primary font-semibold">
                    {child.title}
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export default function MemberSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-semibold">
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <CollapsibleNavGroup item={eventsItems} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-semibold">
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-semibold">
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
