import {
  LayoutDashboard,
  FileText,
  Rocket,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "./ui/sidebar";
import { Button } from "./ui/button";

interface AppSidebarProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
  },
  {
    title: "Submissions",
    icon: FileText,
    id: "submissions",
  },
  {
    title: "Startups",
    icon: Rocket,
    id: "startups",
  },
  {
    title: "Metrics",
    icon: BarChart3,
    id: "metrics",
  },
  {
    title: "Settings",
    icon: Settings,
    id: "settings",
  },
];

export function AppSidebar({ activeItem, onNavigate }: AppSidebarProps) {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b border-sidebar-border bg-gradient-to-br from-blue-600 to-purple-600 p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Rocket className="size-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white">VentureX</span>
            <span className="text-xs text-white/80">Platform</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => onNavigate(item.id)}
                    isActive={activeItem === item.id}
                    className="cursor-pointer"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button variant="ghost" className="w-full justify-start gap-2">
          <LogOut className="size-4" />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
