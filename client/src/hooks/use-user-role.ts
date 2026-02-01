import { useQuery } from "@tanstack/react-query";

export type UserRole = "technician" | "manager" | "admin";

interface RoleResponse {
  role: UserRole;
}

export function useUserRole() {
  const { data, isLoading } = useQuery<RoleResponse>({
    queryKey: ["/api/user/role"],
  });

  return {
    role: data?.role || "technician",
    isLoading,
    isManager: data?.role === "manager" || data?.role === "admin",
    isAdmin: data?.role === "admin",
  };
}
