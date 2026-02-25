import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  currentStock: number | null;
  minimumStock: number | null;
  isActive: boolean | null;
}

function formatStock(hundredths: number | null): string {
  if (hundredths == null) return "0.00";
  return (hundredths / 100).toFixed(2);
}

export function LowStockAlert() {
  const [, setLocation] = useLocation();

  const { data: lowStockItems } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/low-stock"],
    refetchInterval: 60000,
  });

  if (!lowStockItems || lowStockItems.length === 0) {
    return null;
  }

  const previewItems = lowStockItems.slice(0, 3);
  const hasMore = lowStockItems.length > 3;

  return (
    <Card
      className="p-4 border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors"
      onClick={() => setLocation("/manager/inventory")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {lowStockItems.length} {lowStockItems.length === 1 ? "item" : "items"} low on stock
              </span>
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Low
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {previewItems.map((item) => `${item.name} (${formatStock(item.currentStock)} ${item.unit})`).join(", ")}
              {hasMore && ` +${lowStockItems.length - 3} more`}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Card>
  );
}
