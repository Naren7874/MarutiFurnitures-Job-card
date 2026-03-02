import { lazy, Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Bell, Search, Loader2, Command, ChevronRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DUMMY_USERS } from "@/lib/dummy-data"

const Dashboard = lazy(() => import("@/pages/dashboard"))
const currentUser = DUMMY_USERS[0]

const App = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="maruti-theme">
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground transition-colors duration-300">
          <AppSidebar variant="floating" />
          <SidebarInset className="bg-transparent overflow-hidden">
            {/* ── Header ────────────────────────────────────── */}
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-6 transition-all sticky top-0 z-50 glass-header dark:bg-[rgba(10,10,10,0.9)] dark:border-b dark:border-white/6 dark:backdrop-blur-xl">
              <div className="flex items-center gap-3 flex-1">
                <SidebarTrigger className="hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground rounded-lg -ml-1" />
                <div className="h-5 w-px bg-border hidden md:block" />

                {/* Breadcrumb */}
                <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="text-foreground font-bold">Maruti Furniture</span>
                  <ChevronRight className="size-3" />
                  <span>Dashboard</span>
                </div>

                {/* Search */}
                <div className="relative hidden lg:block max-w-xs w-full ml-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input
                    type="search"
                    placeholder="Search job cards, clients..."
                    className="w-full rounded-xl bg-muted/40 border-border/60 pl-9 h-9 text-sm placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-40">
                    <Command className="size-2.5" />
                    <span className="text-[10px] font-bold">K</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Live status */}
                <div className="items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20 hidden lg:flex">
                  <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-500">Live</span>
                </div>

                {/* Notifications */}
                <div className="relative cursor-pointer hover:bg-muted/60 p-2 rounded-xl transition-all border border-transparent hover:border-border">
                  <Bell className="h-4.5 w-4.5 text-muted-foreground" />
                  <Badge className="absolute -top-0.5 -right-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full p-0 text-[9px] bg-red-500 border-2 border-background font-bold text-white">
                    4
                  </Badge>
                </div>

                <div className="h-5 w-px bg-border" />
                <AnimatedThemeToggler />
                <div className="h-5 w-px bg-border" />

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/60 bg-card p-1.5 pr-3 hover:bg-muted/60 transition-all group">
                      <Avatar className="h-7 w-7 border border-border">
                        <AvatarImage src={currentUser.avatar} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                          {currentUser.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden md:flex flex-col items-start leading-none">
                        <span className="text-xs font-bold text-foreground">{currentUser.name.split(' ')[0]}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{currentUser.role}</span>
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl border-border shadow-xl p-1.5">
                    <DropdownMenuLabel className="px-2 py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-foreground">{currentUser.name}</span>
                        <span className="text-xs text-muted-foreground">{currentUser.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-lg text-xs font-medium cursor-pointer">Profile Settings</DropdownMenuItem>
                    <DropdownMenuItem className="rounded-lg text-xs font-medium cursor-pointer">Help & Support</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500 rounded-lg focus:bg-red-500/10 focus:text-red-500 text-xs font-medium cursor-pointer">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* ── Main Content ───────────────────────────────── */}
            <main className="flex flex-1 flex-col overflow-y-auto scrollbar-hide">
              <Suspense fallback={
                <div className="flex-1 flex items-center justify-center min-h-screen">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin opacity-40" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading...</span>
                  </div>
                </div>
              }>
                <Dashboard />
              </Suspense>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  )
}

export default App