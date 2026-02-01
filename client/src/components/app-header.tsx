import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, LogOut, ClipboardList, BarChart3,
  Info, ChevronDown, Users
} from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { user, logout } = useAuth();
  
  const { data: roleData } = useQuery<{ role: string }>({
    queryKey: ["/api/user/role"],
  });

  const initials = user ? 
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || "U"}`.toUpperCase() 
    : "U";

  const isManager = roleData?.role === "manager" || roleData?.role === "admin";
  const isAdmin = roleData?.role === "admin";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/landing" data-testid="link-home-logo">
            <img 
              src={logoPath} 
              alt="HOPSVOIR" 
              className="h-9 w-auto cursor-pointer hover:opacity-80 transition-opacity" 
            />
          </Link>
          {title && (
            <span className="text-lg font-semibold hidden sm:block">{title}</span>
          )}
        </div>

        <nav className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <Link href="/landing">
              <Button variant="ghost" size="sm" data-testid="nav-landing">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link href="/my-jobs">
              <Button variant="ghost" size="sm" data-testid="nav-my-jobs">
                <ClipboardList className="h-4 w-4 mr-2" />
                My Jobs
              </Button>
            </Link>
            {isManager && (
              <Link href="/manager">
                <Button variant="ghost" size="sm" data-testid="nav-manager">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Manager
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" data-testid="nav-admin">
                  <Users className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
          </div>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                {user?.firstName || "User"}
                {user?.email && (
                  <p className="text-xs font-normal text-muted-foreground truncate">
                    {user.email}
                  </p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <Link href="/">
                <DropdownMenuItem className="cursor-pointer sm:hidden" data-testid="menu-home">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
              </Link>
              <Link href="/my-jobs">
                <DropdownMenuItem className="cursor-pointer sm:hidden" data-testid="menu-my-jobs">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  My Jobs
                </DropdownMenuItem>
              </Link>
              {isManager && (
                <Link href="/manager">
                  <DropdownMenuItem className="cursor-pointer sm:hidden" data-testid="menu-manager">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Manager Dashboard
                  </DropdownMenuItem>
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin/users">
                  <DropdownMenuItem className="cursor-pointer sm:hidden" data-testid="menu-admin">
                    <Users className="h-4 w-4 mr-2" />
                    User Management
                  </DropdownMenuItem>
                </Link>
              )}
              <DropdownMenuSeparator className="sm:hidden" />
              
              <Link href="/landing">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-landing">
                  <Home className="h-4 w-4 mr-2" />
                  Landing Page
                </DropdownMenuItem>
              </Link>
              <Link href="/about">
                <DropdownMenuItem className="cursor-pointer" data-testid="menu-about">
                  <Info className="h-4 w-4 mr-2" />
                  About
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive" 
                onClick={() => logout()}
                data-testid="menu-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
