import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, LogIn, UserCircle, UserPlus, Eye, EyeOff, Building2 } from "lucide-react";
import hopsovirLogo from "@/assets/images/logo.png";

interface TenantBranding {
  name: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const params = new URLSearchParams(search);
  const tenantSlug = params.get("tenant");

  const { data: tenantBranding } = useQuery<TenantBranding>({
    queryKey: [`/api/public/branding/${tenantSlug}`],
    enabled: !!tenantSlug,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/credentials/login", credentials);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/role"] });
      toast({
        title: "Login successful",
        description: tenantBranding ? `Welcome to ${tenantBranding.name}` : "Welcome to HOPSVOIR",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleReplitLogin = () => {
    window.location.href = "/api/login";
  };

  const primaryColor = tenantBranding?.primaryColor || undefined;
  const registerLink = tenantSlug ? `/register?tenant=${tenantSlug}` : "/register";
  const backLink = tenantSlug ? `/t/${tenantSlug}` : undefined;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          {tenantBranding?.logoUrl ? (
            <img
              src={tenantBranding.logoUrl}
              alt={tenantBranding.name}
              className="h-16 mx-auto mb-4"
            />
          ) : tenantBranding ? (
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4"
              style={{ backgroundColor: primaryColor || "#3B82F6" }}
            >
              {tenantBranding.name[0]?.toUpperCase()}
            </div>
          ) : (
            <img
              src={hopsovirLogo}
              alt="HOPSVOIR"
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-bold">
            {tenantBranding ? `Welcome to ${tenantBranding.name}` : "Welcome to HOPSVOIR"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Sign in to access {tenantBranding ? "your dashboard" : "the carwash management system"}
          </p>
          {tenantBranding && (
            <Badge variant="secondary" className="gap-1 mt-2">
              <Building2 className="w-3 h-3" />
              {tenantBranding.name}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              {tenantBranding
                ? `Enter your ${tenantBranding.name} credentials`
                : "Use your credentials or Replit account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
                style={primaryColor ? { backgroundColor: primaryColor, color: "#fff" } : {}}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {!tenantSlug && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReplitLogin}
                  data-testid="button-replit-login"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  Sign in with Replit
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            Don't have an account?
          </p>
          <Link href={registerLink}>
            <Button variant="outline" className="w-full max-w-[200px]" data-testid="link-register">
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </Link>
          {backLink && (
            <div className="mt-2">
              <Link href={backLink} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Back to portal
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
