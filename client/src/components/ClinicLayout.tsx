import { useAuth } from "@/_core/hooks/useAuth";

import { cn } from "@/lib/utils";
import {
  Activity, Archive, BarChart3, Calendar, ChevronLeft, ChevronRight,
  ClipboardList, FileText, Home, LogOut, Menu, Pill, Search, Settings,
  Stethoscope, Scissors, Sparkles, Users, X, Bell, Moon, Sun
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/ThemeContext";
import NotSubscribed from "@/pages/NotSubscribed";

const NAV_ITEMS = [
  { label: "لوحة التحكم", icon: Home, href: "/" },
  { label: "المرضى", icon: Users, href: "/patients" },
  { label: "الزيارات", icon: Stethoscope, href: "/visits" },
  { label: "الوصفات", icon: Pill, href: "/prescriptions" },
  { label: "المواعيد", icon: Calendar, href: "/appointments" },
  { label: "العمليات الجراحية", icon: Scissors, href: "/surgeries" },
  { label: "الملفات", icon: FileText, href: "/files" },
  { label: "بحث", icon: Search, href: "/search" },
  { label: "التقارير", icon: BarChart3, href: "/reports" },
  { label: "سجل النشاط", icon: Activity, href: "/activity" },
  { label: "المساعد الذكي", icon: Sparkles, href: "/ai-assistant" },
];

const ADMIN_NAV_ITEMS = [
  { label: "المستخدمون", icon: ClipboardList, href: "/users" },
  { label: "إدارة العملاء", icon: Users, href: "/admin/clients" },
  { label: "الإعدادات", icon: Settings, href: "/settings" },
];

interface ClinicLayoutProps {
  children: React.ReactNode;
}

export default function ClinicLayout({ children }: ClinicLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const SYSTEM_ADMIN_EMAIL = "abdoismeal012@gmail.com";
  const isSystemAdmin = user?.email?.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase();

  // Must be called unconditionally (Rules of Hooks)
  // enabled only after auth is fully resolved (loading=false) and user is present
  const { data: subscription, isLoading: subLoading } = trpc.tenants.checkMySubscription.useQuery(
    undefined,
    { enabled: !loading && isAuthenticated && !!user && !isSystemAdmin }
  );

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-64 bg-sidebar border-r border-sidebar-border p-4 space-y-3">
          <Skeleton className="h-10 w-full bg-sidebar-muted" />
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 w-full bg-sidebar-muted" />)}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
        <div className="bg-white rounded-xl shadow-lg p-10 max-w-md w-full mx-4 text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-foreground">نظام إدارة العيادة</h1>
              <p className="text-sm text-muted-foreground">نظام المعلومات الطبية</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            سجّل دخولك للوصول إلى نظام إدارة العيادة
          </p>
          <a href="/api/auth/google">
            <Button size="lg" className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              تسجيل الدخول بجوجل
            </Button>
          </a>
          <p className="text-xs text-muted-foreground">وصول آمن — بياناتك محمية</p>
        </div>
      </div>
    );
  }

  // Show loading while checking subscription (wait until query resolves)
  if (!isSystemAdmin && isAuthenticated && (subLoading || subscription === undefined)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not subscribed — show WhatsApp contact page
  // subscription===null means email not found in tenants table
  const blockedStatuses = ["expired", "suspended", "pending"];
  if (isAuthenticated && !isSystemAdmin && (subscription === null || (subscription && blockedStatuses.includes(subscription.status)))) {
    return <NotSubscribed />;
  }

  const userInitials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";
  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-sidebar-foreground leading-tight truncate">نظام العيادة</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">المنصة الطبية</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <div className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-lg mx-auto cursor-pointer transition-colors",
                      active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
                    )}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
              )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            </Link>
          );
        })}

        {true && (
          <>
            <div className={cn("pt-3 pb-1", collapsed ? "px-0" : "px-3")}>
              {!collapsed && <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">الإدارة</p>}
              {collapsed && <div className="border-t border-sidebar-border" />}
            </div>
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link href={item.href}>
                        <div className={cn(
                          "flex items-center justify-center h-9 w-9 rounded-lg mx-auto cursor-pointer transition-colors",
                          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
                        )}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium",
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
                  )}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Dark Mode Toggle */}
      <div className={cn("px-2 py-1.5", collapsed && "flex justify-center")}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground transition-colors mx-auto"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{theme === "dark" ? "وضع نهاري" : "وضع ليلي"}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
            <span>{theme === "dark" ? "وضع نهاري" : "وضع ليلي"}</span>
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 w-full rounded-lg p-2 hover:bg-sidebar-muted transition-colors text-left",
              collapsed && "w-auto"
            )}>
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-white text-xs font-semibold">{userInitials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name ?? "User"}</p>
                  <p className="text-xs text-sidebar-foreground/50 truncate capitalize">{user?.role ?? "user"}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align={collapsed ? "center" : "end"} className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings"><span className="flex items-center gap-2 cursor-pointer"><Settings className="w-4 h-4" /> الإعدادات</span></Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" /> تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 relative flex-shrink-0",
        collapsed ? "w-16" : "w-60"
      )}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -left-3 top-20 w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3 text-muted-foreground" /> : <ChevronLeft className="w-3 h-3 text-muted-foreground" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">نظام العيادة</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
