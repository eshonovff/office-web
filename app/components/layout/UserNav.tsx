import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { authApi } from "~/api/auth";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useAuthStore } from "~/store/useAuthStore";

export function UserNav() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      useAuthStore.getState().clear();
      queryClient.clear();
      navigate("/login");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="hover:bg-accent hover:text-accent-foreground hover:border-border group flex h-9 items-center gap-2 rounded-lg border border-transparent px-1.5 transition-all outline-none sm:px-2" />
        }>
        <Avatar className="h-8 w-8 border">
          <AvatarFallback className="bg-primary/10 text-primary text-2xs font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden max-w-40 min-w-0 flex-col items-start text-left xl:flex">
          <span className="max-w-full truncate text-sm leading-none font-semibold">{user?.fullName}</span>
        </div>
        <ChevronDown className="text-muted-foreground hidden h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 overflow-hidden p-0" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="bg-primary/3 flex flex-col space-y-3 border-b p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-sm leading-none font-bold">{user?.fullName}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-none">@{user?.username}</p>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-0" />

        <DropdownMenuGroup className="p-1.5">
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer rounded-md px-3 py-2">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="text-sm font-medium">{t("logout")}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
