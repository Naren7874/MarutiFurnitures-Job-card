import { useLocation, Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { ALL_NAV_ITEMS } from "@/lib/navItems"

export function AppSidebar({ variant = "sidebar", ...props }: React.ComponentProps<typeof Sidebar>) {
    const { state } = useSidebar()
    const location = useLocation()
    const { company, user: authUser, hasPermission } = useAuthStore()
    const isCollapsed = state === "collapsed"

    // ── Permission-filtered nav items ──────────────────────────────────────
    const visibleNav = ALL_NAV_ITEMS.filter(item =>
        item.permission === null || hasPermission(item.permission)
    )

    const companyInitials = company?.name
        ? company.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'MF'

    return (
        <Sidebar collapsible="icon" variant={variant} className="border-r-0 bg-sidebar/80 dark:bg-sidebar/95 backdrop-blur-xl border-sidebar-border transition-all duration-500 ease-in-out" {...props}>
            <SidebarHeader className={cn("flex flex-col items-center transition-all duration-300", isCollapsed ? "p-0 py-4" : "p-3")}>
                <div className={cn("flex items-center gap-4 w-full transition-all duration-300", isCollapsed ? "justify-center px-0" : "justify-start px-2")}>
                    <div className="flex aspect-square size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 transition-all cursor-pointer overflow-hidden">
                        {company?.logo ? (
                            <img src={company.logo} alt={company.name} className="size-full object-contain p-2" />
                        ) : (
                            <span className="text-sm font-black">{companyInitials}</span>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col gap-0.5 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
                            <span className="font-bold text-sm tracking-tight leading-none text-foreground truncate max-w-[150px]">
                                {company?.name || "Maruti Furniture"}
                            </span>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Job Card System</span>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className={cn("overflow-x-hidden scrollbar-hide space-y-1 transition-all duration-300", isCollapsed ? "px-0" : "px-2")}>
                <SidebarGroup>
                    <SidebarMenu className="gap-1">
                        {visibleNav.map((item) => {
                            // Active if the url matches (exact for '/', startsWith for others)
                            const isActive = item.url === '/'
                                ? location.pathname === '/'
                                : location.pathname.startsWith(item.url)

                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        className={cn(
                                            "transition-all duration-300 text-foreground/50 hover:text-foreground",
                                            isCollapsed
                                                ? "h-14 w-14 rounded-full justify-center p-0 mx-auto"
                                                : "h-11 w-full rounded-2xl px-4",
                                            isActive ? (
                                                isCollapsed
                                                    ? "bg-foreground text-background shadow-2xl shadow-foreground/20 scale-110"
                                                    : "bg-muted text-foreground border border-border"
                                            ) : "hover:bg-muted"
                                        )}
                                    >
                                        <Link to={item.url} className="flex items-center gap-3 w-full">
                                            <item.icon className={cn(
                                                "shrink-0 transition-all",
                                                isCollapsed ? "size-6" : "size-5",
                                                isCollapsed && isActive && "scale-90 text-background"
                                            )} />
                                                <span className="font-bold text-[15px] tracking-tight">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className={cn("border-t border-border/50 transition-all duration-300", isCollapsed ? "p-0 py-6" : "p-4")}>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className={cn(
                                "h-16 transition-all duration-300 hover:bg-muted group/profile border border-transparent",
                                isCollapsed ? "justify-center rounded-2xl p-0 mx-auto w-14" : "rounded-[1.5rem] bg-muted/60 border-border p-3 w-full"
                            )}
                        >
                            <Avatar className={cn("rounded-xl border-2 border-background shadow-2xl transition-all duration-500 group-hover:scale-110", isCollapsed ? "size-11" : "size-10")}>
                                <AvatarImage src={authUser?.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser?.name}`} />
                                <AvatarFallback className="bg-muted text-xs font-black">
                                    {authUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            {!isCollapsed && (
                                <div className="flex flex-col gap-0.5 overflow-hidden ml-3 items-start text-left animate-in fade-in slide-in-from-left-2 transition-all">
                                    <span className="font-black text-[13px] uppercase tracking-tight truncate leading-none text-foreground">{authUser?.name || 'User'}</span>
                                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1.5">{authUser?.role || 'staff'}</span>
                                </div>
                            )}
                            {!isCollapsed && <ChevronRight className="ml-auto size-4 text-muted-foreground/30 group-hover:translate-x-1 group-hover:text-foreground transition-all" />}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
