import { ChevronRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "~/components/ui/sidebar";
import type { NavItem } from "~/config/navigation";

interface NavMainProps {
  items: NavItem[];
}

export function NavMain({ items }: NavMainProps) {
  const { state, setOpen: setSidebarOpen } = useSidebar();
  const location = useLocation();

  const getActiveGroup = (pathname: string) =>
    items.find((item) => item.items?.some((sub) => sub.url === pathname))?.title ?? null;

  const [openGroup, setOpenGroup] = useState<string | null>(() => getActiveGroup(location.pathname));

  const prevPathname = useRef(location.pathname);
  if (prevPathname.current !== location.pathname) {
    prevPathname.current = location.pathname;
    const activeGroup = getActiveGroup(location.pathname);
    if (activeGroup !== null && activeGroup !== openGroup) {
      setOpenGroup(activeGroup);
    }
  }

  const handleGroupTrigger = useCallback(
    (title: string, isOpen: boolean) => {
      if (state === "collapsed" && isOpen) setSidebarOpen(true);
      setOpenGroup(isOpen ? title : null);
    },
    [state, setSidebarOpen],
  );

  return (
    <SidebarMenu className="flex flex-col gap-1">
      {items.map((item) => {
        const hasSubItems = !!(item.items && item.items.length > 0);
        const isCurrentGroupOpen = openGroup === item.title;
        const isGroupActive = getActiveGroup(location.pathname) === item.title;

        if (hasSubItems) {
          return (
            <Collapsible
              key={item.title}
              open={isCurrentGroupOpen}
              onOpenChange={(isOpen) => handleGroupTrigger(item.title, isOpen)}
              className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger
                  render={<SidebarMenuButton tooltip={item.title} isActive={isCurrentGroupOpen || isGroupActive} />}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                </CollapsibleTrigger>

                <CollapsibleContent className="sidebar-collapsible-content">
                  <SidebarMenuSub>
                    {item.items!.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <NavLink to={subItem.url || "#"} className="block w-full">
                          {({ isActive }) => (
                            <SidebarMenuSubButton isActive={isActive}>
                              <span className="truncate">{subItem.title}</span>
                            </SidebarMenuSubButton>
                          )}
                        </NavLink>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }

        return (
          <SidebarMenuItem key={item.title}>
            <NavLink to={item.url || "#"} end={item.url === "/"} className="block w-full" onClick={() => setOpenGroup(null)}>
              {({ isActive }) => (
                <SidebarMenuButton isActive={isActive && openGroup === null} tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
