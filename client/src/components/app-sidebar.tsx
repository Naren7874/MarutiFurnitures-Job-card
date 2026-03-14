import { ChevronRight, Plus } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from "@/components/ui/sidebar"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface NavSubItem {
    title: string
    url: string
    badge?: string
    isActive?: boolean
}

interface NavItem {
    title: string
    url: string
    icon: React.ElementType
    isActive?: boolean
    items?: NavSubItem[]
}

interface Message {
    name: string
    avatar: string
    online: boolean
}

import { DUMMY_USERS, NAV_MAIN } from "@/lib/dummy-data"

import { useAuthStore } from "@/stores/authStore"

export function AppSidebar({ variant = "sidebar", ...props }: React.ComponentProps<typeof Sidebar>) {
    const { state } = useSidebar()
    const { company, user: authUser } = useAuthStore()
    const isCollapsed = state === "collapsed"

    const data = {
        user: {
            name: authUser?.name || "John Doe",
            email: authUser?.email || "john@maruti.com",
            avatar: authUser?.profilePhoto || "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
            role: authUser?.role || "Designer"
        },
        navMain: NAV_MAIN as NavItem[],
        messages: DUMMY_USERS.map(u => ({
            name: u.name,
            avatar: u.avatar,
            online: u.status === 'ACTIVE'
        })) as Message[]
    }

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
                            <span className="text-[10px] font-medium text-muted-foreground leading-none">Job Card System</span>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className={cn("overflow-x-hidden scrollbar-hide space-y-2 transition-all duration-300", isCollapsed ? "px-0" : "px-2")}>
                <SidebarGroup>
                    <SidebarMenu className="gap-2">
                        {data.navMain.map((item) => (
                            <Collapsible
                                key={item.title}
                                asChild
                                defaultOpen={item.isActive}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            className={cn(
                                                "transition-all duration-300 text-foreground/50 hover:text-foreground",
                                                isCollapsed ? "h-14 w-14 rounded-full justify-center p-0 mx-auto" : "h-12 w-full rounded-2xl px-4",
                                                item.isActive ? (
                                                    isCollapsed
                                                        ? "bg-foreground text-background shadow-2xl shadow-foreground/20 scale-110"
                                                        : "bg-muted text-foreground border border-border"
                                                ) : "hover:bg-muted"
                                            )}
                                        >
                                            {item.icon && <item.icon className={cn("size-7 shrink-0", isCollapsed && item.isActive && "scale-90 text-background")} />}
                                            {!isCollapsed && <span className="font-bold text-sm tracking-tight ml-2">{item.title}</span>}
                                            {!isCollapsed && item.items && <ChevronRight className="ml-auto size-4 transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90 opacity-20" />}
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    {!isCollapsed && item.items && (
                                        <CollapsibleContent>
                                            <SidebarMenuSub className="relative ml-6 mt-2 border-l-0 space-y-1">
                                                <div className="sub-menu-line bg-foreground/5" />
                                                {item.items.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.title} className="relative">
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            className={cn(
                                                                "h-9 rounded-xl hover:bg-muted transition-all pr-4 text-muted-foreground hover:text-foreground",
                                                                subItem.isActive && "text-foreground bg-muted font-bold"
                                                            )}
                                                        >
                                                            <a href={subItem.url} className="flex items-center justify-between w-full">
                                                                <span className="text-xs whitespace-nowrap tracking-tight">{subItem.title}</span>
                                                            </a>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    )}
                                </SidebarMenuItem>
                            </Collapsible>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                {!isCollapsed && (
                    <SidebarGroup className="mt-6">
                        <div className="flex items-center justify-between px-4 mb-3">
                            <SidebarGroupLabel className="p-0 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Messages</SidebarGroupLabel>
                            <Plus className="size-3 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                        </div>
                        <SidebarMenu className="gap-1">
                            {data.messages.map((msg) => (
                                <SidebarMenuItem key={msg.name}>
                                    <SidebarMenuButton className="h-11 rounded-2xl hover:bg-muted transition-all text-foreground/60 hover:text-foreground px-3">
                                        <Avatar className="size-7 border-2 border-background shadow-inner">
                                            <AvatarImage src={msg.avatar} />
                                            <AvatarFallback className="bg-muted text-[10px]">{msg.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-bold text-xs truncate ml-2 opacity-80">{msg.name}</span>
                                        {msg.online && <div className="ml-auto size-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse" />}
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                )}

                {isCollapsed && (
                    <div className="mt-8 flex flex-col items-center gap-5 px-0 w-full animate-in slide-in-from-bottom-4 duration-700">
                        {data.messages.map((msg) => (
                            <div key={msg.name} className="relative group/avatar">
                                <Avatar className="size-11 border-2 border-muted shadow-2xl transition-all duration-300 hover:scale-125 hover:-translate-y-1 cursor-pointer">
                                    <AvatarImage src={msg.avatar} />
                                    <AvatarFallback className="bg-muted text-xs">{msg.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {msg.online && <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green-500 border-2 border-background shadow-lg" />}
                            </div>
                        ))}
                    </div>
                )}
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
                                <AvatarImage src={data.user.avatar} />
                                <AvatarFallback className="bg-muted text-xs">JD</AvatarFallback>
                            </Avatar>
                            {!isCollapsed && (
                                <div className="flex flex-col gap-0.5 overflow-hidden ml-3 items-start text-left animate-in fade-in slide-in-from-left-2 transition-all">
                                    <span className="font-black text-xs uppercase tracking-tight truncate leading-none text-foreground">{data.user.name}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{data.user.role}</span>
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
