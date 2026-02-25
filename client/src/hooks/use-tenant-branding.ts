import { useQuery } from "@tanstack/react-query";

interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  plan: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  customDomain: string | null;
}

export function useTenantBranding() {
  const { data: branding, isLoading } = useQuery<TenantBranding>({
    queryKey: ["/api/tenant/branding"],
    staleTime: 30 * 60 * 1000, // 30 min cache
  });

  return { branding, isLoading };
}
