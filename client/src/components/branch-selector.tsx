import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/hooks/use-branch";
import { Skeleton } from "@/components/ui/skeleton";

export function BranchSelector() {
  const { branches, activeBranchId, setActiveBranchId, isLoading } = useBranch();

  if (isLoading) {
    return <Skeleton className="h-9 w-44" />;
  }

  if (branches.length === 0) {
    return null;
  }

  return (
    <Select
      value={activeBranchId ?? "all"}
      onValueChange={(value) => setActiveBranchId(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-44 h-9 text-sm">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder="All Branches" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Branches</SelectItem>
        {branches
          .filter((b) => b.isActive !== false)
          .map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
