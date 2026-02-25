import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string | null;
  isActive: boolean | null;
}

interface BranchContextValue {
  branches: Branch[];
  activeBranchId: string | null; // null = "all branches"
  setActiveBranchId: (id: string | null) => void;
  activeBranch: Branch | null;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const activeBranch = activeBranchId
    ? branches.find((b) => b.id === activeBranchId) || null
    : null;

  return (
    <BranchContext.Provider
      value={{ branches, activeBranchId, setActiveBranchId, activeBranch, isLoading }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
