import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Pencil,
  ArrowDownUp,
  Truck,
  BarChart3,
  DollarSign,
  TrendingDown,
  Boxes,
  X,
  Check,
  XCircle,
  Send,
  PackageCheck,
  Trash2,
  RefreshCw,
  Droplets,
  Sparkles,
  Brush,
  Wind,
  ShieldCheck,
  Wrench,
  PackageOpen,
  CircleDot,
  Disc,
  Layers,
  type LucideIcon,
} from "lucide-react";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  SERVICE_CODES,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: (typeof INVENTORY_CATEGORIES)[number];
  unit: string;
  costPerUnit: number | null;
  sellingPricePerUnit: number | null;
  currentStock: number | null;
  minimumStock: number | null;
  supplierId: string | null;
  consumptionMap: Record<string, number> | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface PurchaseOrderLineItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: "draft" | "submitted" | "received" | "cancelled";
  items: PurchaseOrderLineItem[];
  totalCost: number | null;
  notes: string | null;
  orderedAt: Date | null;
  receivedAt: Date | null;
  createdBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface InventoryAnalytics {
  totalItems: number;
  lowStockCount: number;
  totalStockValue: number;
  monthlyConsumptionCost: number;
  topConsumedItems: Array<{
    itemId: string;
    itemName: string;
    totalConsumed: number;
    unit: string;
  }>;
}

// ---------------------------------------------------------------------------
// Category metadata for car-wash inventory
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  chemicals: { icon: Droplets, color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", label: "Chemicals" },
  cloths_towels: { icon: Layers, color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30", label: "Cloths & Towels" },
  wax_polish: { icon: Sparkles, color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", label: "Wax & Polish" },
  brushes_sponges: { icon: Brush, color: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30", label: "Brushes & Sponges" },
  air_fresheners: { icon: Wind, color: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30", label: "Air Fresheners" },
  interior_care: { icon: CircleDot, color: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30", label: "Interior Care" },
  tire_wheel_care: { icon: Disc, color: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30", label: "Tire & Wheel Care" },
  sealants_coatings: { icon: ShieldCheck, color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30", label: "Sealants & Coatings" },
  safety_gear: { icon: ShieldCheck, color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", label: "Safety Gear" },
  equipment: { icon: Wrench, color: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30", label: "Equipment" },
  packaging: { icon: PackageOpen, color: "bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/30", label: "Packaging" },
  other: { icon: Package, color: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30", label: "Other" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert hundredths stock to decimal display */
function stockToDisplay(hundredths: number | null | undefined): string {
  if (hundredths == null) return "0";
  return (hundredths / 100).toFixed(2);
}

/** Pretty-print category label */
function categoryLabel(cat: string): string {
  return CATEGORY_META[cat]?.label || cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Stock level color class */
function stockColorClass(current: number | null, minimum: number | null): string {
  const cur = current ?? 0;
  const min = minimum ?? 0;
  if (cur <= min) return "text-red-600 bg-red-500/10 border-red-500/30";
  if (cur < min * 2) return "text-amber-600 bg-amber-500/10 border-amber-500/30";
  return "text-green-600 bg-green-500/10 border-green-500/30";
}

/** PO status badge variant */
function poStatusBadge(status: PurchaseOrder["status"]) {
  switch (status) {
    case "draft":
      return "bg-gray-500/15 text-gray-700 border-gray-500/30";
    case "submitted":
      return "bg-blue-500/15 text-blue-700 border-blue-500/30";
    case "received":
      return "bg-green-500/15 text-green-700 border-green-500/30";
    case "cancelled":
      return "bg-red-500/15 text-red-700 border-red-500/30";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ManagerInventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canAccess =
    user?.role === "manager" ||
    user?.role === "admin" ||
    user?.role === "super_admin";

  // ---- Business settings for currency ----
  const { data: bizSettings } = useQuery<{
    currency: string;
    currencySymbol: string;
    locale: string;
  }>({
    queryKey: ["/api/business/settings"],
    enabled: canAccess,
    staleTime: 1000 * 60 * 30, // 30 min
  });

  const currencySymbol = bizSettings?.currencySymbol || "$";

  const centsToDisplay = useCallback(
    (cents: number | null | undefined): string => {
      if (cents == null) return "--";
      try {
        return new Intl.NumberFormat(bizSettings?.locale || "en-US", {
          style: "currency",
          currency: bizSettings?.currency || "USD",
          minimumFractionDigits: 2,
        }).format(cents / 100);
      } catch {
        return `${currencySymbol}${(cents / 100).toFixed(2)}`;
      }
    },
    [bizSettings?.locale, bizSettings?.currency, currencySymbol]
  );

  // ---- Tab state ----
  const [activeTab, setActiveTab] = useState("items");

  // =========================================================================
  //  ITEMS TAB STATE
  // =========================================================================
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>("all");
  const [itemLowStockFilter, setItemLowStockFilter] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  // Item form state
  const [itemForm, setItemForm] = useState({
    name: "",
    sku: "",
    category: "chemicals" as (typeof INVENTORY_CATEGORIES)[number],
    unit: "liters" as string,
    costPerUnit: "",
    sellingPricePerUnit: "",
    minimumStock: "",
    supplierId: "none",
    consumptionMap: {} as Record<string, string>,
  });

  // =========================================================================
  //  SUPPLIERS TAB STATE
  // =========================================================================
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  // =========================================================================
  //  PURCHASE ORDERS TAB STATE
  // =========================================================================
  const [poStatusFilter, setPoStatusFilter] = useState<string>("all");
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierId: "",
    notes: "",
    items: [] as Array<{
      inventoryItemId: string;
      itemName: string;
      quantity: string;
      unitCost: string;
    }>,
  });

  // =========================================================================
  //  QUERIES
  // =========================================================================

  const itemsQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (itemCategoryFilter !== "all") params.set("category", itemCategoryFilter);
    if (itemLowStockFilter) params.set("lowStock", "true");
    return params.toString();
  }, [itemCategoryFilter, itemLowStockFilter]);

  const {
    data: items,
    isLoading: loadingItems,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items", itemsQueryParams],
    queryFn: async () => {
      const url = itemsQueryParams
        ? `/api/inventory/items?${itemsQueryParams}`
        : "/api/inventory/items";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load inventory items");
      return res.json();
    },
    enabled: canAccess,
  });

  const {
    data: suppliers,
    isLoading: loadingSuppliers,
  } = useQuery<Supplier[]>({
    queryKey: ["/api/inventory/suppliers"],
    enabled: canAccess,
  });

  const {
    data: purchaseOrders,
    isLoading: loadingPOs,
  } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/inventory/purchase-orders"],
    enabled: canAccess,
  });

  const {
    data: analytics,
    isLoading: loadingAnalytics,
  } = useQuery<InventoryAnalytics>({
    queryKey: ["/api/inventory/analytics"],
    enabled: canAccess,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const {
    data: lowStockItems,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/low-stock"],
    enabled: canAccess,
    refetchInterval: 1000 * 60 * 2, // auto-refresh every 2 min
  });

  // =========================================================================
  //  FILTERED DATA
  // =========================================================================

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const term = itemSearch.toLowerCase().trim();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.sku && item.sku.toLowerCase().includes(term))
    );
  }, [items, itemSearch]);

  const filteredPOs = useMemo(() => {
    if (!purchaseOrders) return [];
    if (poStatusFilter === "all") return purchaseOrders;
    return purchaseOrders.filter((po) => po.status === poStatusFilter);
  }, [purchaseOrders, poStatusFilter]);

  const suppliersMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    (suppliers || []).forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    (items || []).forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  // =========================================================================
  //  MUTATIONS
  // =========================================================================

  // -- Items --

  const createItemMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/inventory/items", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Item created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/analytics"] });
      setItemDialogOpen(false);
      resetItemForm();
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to create item", variant: "destructive" }),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/inventory/items/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Item updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/analytics"] });
      setItemDialogOpen(false);
      setEditingItem(null);
      resetItemForm();
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to update item", variant: "destructive" }),
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ id, quantity, notes }: { id: string; quantity: number; notes: string }) => {
      const res = await apiRequest("POST", `/api/inventory/items/${id}/adjust`, { quantity, notes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Stock adjusted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      setAdjustDialogOpen(false);
      setAdjustingItem(null);
      setAdjustQuantity("");
      setAdjustNotes("");
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to adjust stock", variant: "destructive" }),
  });

  // -- Suppliers --

  const createSupplierMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/inventory/suppliers", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Supplier created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/suppliers"] });
      setSupplierDialogOpen(false);
      resetSupplierForm();
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to create supplier", variant: "destructive" }),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/inventory/suppliers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Supplier updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/suppliers"] });
      setSupplierDialogOpen(false);
      setEditingSupplier(null);
      resetSupplierForm();
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to update supplier", variant: "destructive" }),
  });

  const deactivateSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/inventory/suppliers/${id}`, { isActive: false });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Supplier deactivated" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/suppliers"] });
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to deactivate supplier", variant: "destructive" }),
  });

  // -- Purchase Orders --

  const createPOMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/inventory/purchase-orders", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase order created" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/purchase-orders"] });
      setPoDialogOpen(false);
      resetPOForm();
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to create purchase order", variant: "destructive" }),
  });

  const receivePOMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/inventory/purchase-orders/${id}/receive`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase order marked as received" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/analytics"] });
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to receive order", variant: "destructive" }),
  });

  const updatePOStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/inventory/purchase-orders/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Purchase order updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/purchase-orders"] });
    },
    onError: (err: Error) =>
      toast({ title: err.message || "Failed to update order", variant: "destructive" }),
  });

  // =========================================================================
  //  FORM HELPERS
  // =========================================================================

  function resetItemForm() {
    setItemForm({
      name: "",
      sku: "",
      category: "chemicals",
      unit: "liters",
      costPerUnit: "",
      sellingPricePerUnit: "",
      minimumStock: "",
      supplierId: "none",
      consumptionMap: {},
    });
  }

  function resetSupplierForm() {
    setSupplierForm({
      name: "",
      contactName: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
  }

  function resetPOForm() {
    setPoForm({
      supplierId: "",
      notes: "",
      items: [],
    });
  }

  function openCreateItem() {
    setEditingItem(null);
    resetItemForm();
    setItemDialogOpen(true);
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    const consMap: Record<string, string> = {};
    if (item.consumptionMap) {
      Object.entries(item.consumptionMap).forEach(([k, v]) => {
        consMap[k] = String(v);
      });
    }
    setItemForm({
      name: item.name,
      sku: item.sku || "",
      category: item.category,
      unit: item.unit,
      costPerUnit: item.costPerUnit != null ? (item.costPerUnit / 100).toFixed(2) : "",
      sellingPricePerUnit:
        item.sellingPricePerUnit != null ? (item.sellingPricePerUnit / 100).toFixed(2) : "",
      minimumStock: item.minimumStock != null ? String(item.minimumStock) : "",
      supplierId: item.supplierId || "none",
      consumptionMap: consMap,
    });
    setItemDialogOpen(true);
  }

  function handleItemSubmit() {
    const consumptionMap: Record<string, number> = {};
    Object.entries(itemForm.consumptionMap).forEach(([k, v]) => {
      const num = parseFloat(v);
      if (!isNaN(num) && num > 0) consumptionMap[k] = num;
    });

    const payload: Record<string, unknown> = {
      name: itemForm.name,
      sku: itemForm.sku || null,
      category: itemForm.category,
      unit: itemForm.unit,
      costPerUnit: itemForm.costPerUnit ? Math.round(parseFloat(itemForm.costPerUnit) * 100) : null,
      sellingPricePerUnit: itemForm.sellingPricePerUnit
        ? Math.round(parseFloat(itemForm.sellingPricePerUnit) * 100)
        : null,
      minimumStock: itemForm.minimumStock ? parseInt(itemForm.minimumStock, 10) : null,
      supplierId: itemForm.supplierId && itemForm.supplierId !== "none" ? itemForm.supplierId : null,
      consumptionMap: Object.keys(consumptionMap).length > 0 ? consumptionMap : null,
    };

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createItemMutation.mutate(payload);
    }
  }

  function handleAdjustSubmit() {
    if (!adjustingItem) return;
    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty === 0) {
      toast({ title: "Please enter a valid non-zero quantity", variant: "destructive" });
      return;
    }
    adjustStockMutation.mutate({ id: adjustingItem.id, quantity: qty, notes: adjustNotes });
  }

  function openCreateSupplier() {
    setEditingSupplier(null);
    resetSupplierForm();
    setSupplierDialogOpen(true);
  }

  function openEditSupplier(supplier: Supplier) {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setSupplierDialogOpen(true);
  }

  function handleSupplierSubmit() {
    const payload: Record<string, unknown> = {
      name: supplierForm.name,
      contactName: supplierForm.contactName || null,
      phone: supplierForm.phone || null,
      email: supplierForm.email || null,
      address: supplierForm.address || null,
      notes: supplierForm.notes || null,
    };

    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data: payload });
    } else {
      createSupplierMutation.mutate(payload);
    }
  }

  function openCreatePO() {
    resetPOForm();
    setPoDialogOpen(true);
  }

  function addPOLineItem() {
    setPoForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { inventoryItemId: "", itemName: "", quantity: "", unitCost: "" },
      ],
    }));
  }

  function removePOLineItem(index: number) {
    setPoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function updatePOLineItem(
    index: number,
    field: string,
    value: string
  ) {
    setPoForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-fill item name when selecting an inventory item
      if (field === "inventoryItemId") {
        const foundItem = itemsMap.get(value);
        if (foundItem) {
          updated[index].itemName = foundItem.name;
        }
      }
      return { ...prev, items: updated };
    });
  }

  function poLineTotal(line: { quantity: string; unitCost: string }): number {
    const qty = parseFloat(line.quantity) || 0;
    const cost = parseFloat(line.unitCost) || 0;
    return Math.round(qty * cost * 100); // in cents
  }

  function poGrandTotal(): number {
    return poForm.items.reduce((sum, line) => sum + poLineTotal(line), 0);
  }

  function handlePOSubmit() {
    if (!poForm.supplierId) {
      toast({ title: "Please select a supplier", variant: "destructive" });
      return;
    }
    if (poForm.items.length === 0) {
      toast({ title: "Please add at least one line item", variant: "destructive" });
      return;
    }

    const lineItems = poForm.items.map((line) => ({
      inventoryItemId: line.inventoryItemId,
      itemName: line.itemName,
      quantity: parseFloat(line.quantity) || 0,
      unitCost: Math.round((parseFloat(line.unitCost) || 0) * 100),
      totalCost: poLineTotal(line),
    }));

    const payload = {
      supplierId: poForm.supplierId,
      notes: poForm.notes || null,
      items: lineItems,
      totalCost: lineItems.reduce((s, l) => s + l.totalCost, 0),
    };

    createPOMutation.mutate(payload);
  }

  // =========================================================================
  //  ACCESS GUARD
  // =========================================================================

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <p className="text-muted-foreground">
                Manager or Admin access required.
              </p>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  // =========================================================================
  //  RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-6xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Inventory Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track stock levels, suppliers, and purchase orders
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="items" className="text-xs sm:text-sm">
              <Boxes className="w-4 h-4 mr-1 hidden sm:inline" />
              Items
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs sm:text-sm">
              <Truck className="w-4 h-4 mr-1 hidden sm:inline" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="text-xs sm:text-sm">
              <PackageCheck className="w-4 h-4 mr-1 hidden sm:inline" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* ============================================================= */}
          {/*  ITEMS TAB                                                     */}
          {/* ============================================================= */}
          <TabsContent value="items">
            {/* Auto Low-Stock Alert Banner */}
            {lowStockItems && lowStockItems.length > 0 && (
              <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                    {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} below minimum stock
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lowStockItems.slice(0, 5).map((item) => {
                    const meta = CATEGORY_META[item.category];
                    const CatIcon = meta?.icon || Package;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setAdjustingItem(item);
                          setAdjustQuantity("");
                          setAdjustNotes("");
                          setAdjustDialogOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-red-500/20 bg-background text-xs hover:bg-red-500/10 transition-colors"
                      >
                        <CatIcon className="w-3 h-3 text-red-500" />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-red-600 dark:text-red-400">
                          {stockToDisplay(item.currentStock)}/{stockToDisplay(item.minimumStock)} {item.unit}
                        </span>
                      </button>
                    );
                  })}
                  {lowStockItems.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{lowStockItems.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick Stats Strip */}
            {analytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
                  <Boxes className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{analytics.totalItems}</p>
                    <p className="text-[10px] text-muted-foreground">Total Items</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border bg-card ${(analytics.lowStockCount ?? 0) > 0 ? "border-red-500/30" : ""}`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${(analytics.lowStockCount ?? 0) > 0 ? "text-red-500" : "text-green-500"}`} />
                  <div className="min-w-0">
                    <p className={`text-lg font-bold leading-none ${(analytics.lowStockCount ?? 0) > 0 ? "text-red-600" : ""}`}>{analytics.lowStockCount}</p>
                    <p className="text-[10px] text-muted-foreground">Low Stock</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
                  <DollarSign className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-none truncate">{centsToDisplay(analytics.totalStockValue)}</p>
                    <p className="text-[10px] text-muted-foreground">Stock Value</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
                  <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-none truncate">{centsToDisplay(analytics.monthlyConsumptionCost)}</p>
                    <p className="text-[10px] text-muted-foreground">Monthly Use</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Search</Label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or SKU..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={itemCategoryFilter}
                      onValueChange={setItemCategoryFilter}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {INVENTORY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {categoryLabel(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant={itemLowStockFilter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setItemLowStockFilter(!itemLowStockFilter)}
                    className="shrink-0"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Low Stock
                  </Button>
                  <Button size="sm" onClick={openCreateItem} className="shrink-0">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            {loadingItems ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No inventory items found.</p>
                  <Button size="sm" className="mt-4" onClick={openCreateItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Your First Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => {
                  const supplier = item.supplierId
                    ? suppliersMap.get(item.supplierId)
                    : null;
                  const stockClass = stockColorClass(
                    item.currentStock,
                    item.minimumStock
                  );
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
                  const CatIcon = meta.icon;
                  const cur = item.currentStock ?? 0;
                  const min = item.minimumStock ?? 0;
                  const stockPct = min > 0 ? Math.min(100, Math.round((cur / (min * 3)) * 100)) : 100;
                  const stockBarColor = cur <= min ? "bg-red-500" : cur < min * 2 ? "bg-amber-500" : "bg-green-500";
                  const hasMargin = item.costPerUnit != null && item.sellingPricePerUnit != null && item.costPerUnit > 0;
                  const margin = hasMargin
                    ? Math.round(((item.sellingPricePerUnit! - item.costPerUnit!) / item.costPerUnit!) * 100)
                    : null;

                  return (
                    <Card
                      key={item.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openEditItem(item)}
                    >
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm truncate">
                              {item.name}
                            </h3>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 gap-1 ${meta.color}`}
                          >
                            <CatIcon className="w-3 h-3" />
                            {meta.label}
                          </Badge>
                        </div>

                        {/* Stock bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className={`px-2 py-0.5 rounded-md border text-xs font-medium ${stockClass}`}>
                              {stockToDisplay(item.currentStock)} {item.unit}
                            </div>
                            {item.minimumStock != null && (
                              <span className="text-[10px] text-muted-foreground">
                                min: {stockToDisplay(item.minimumStock)}
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${stockBarColor}`}
                              style={{ width: `${stockPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex gap-3 items-center">
                            <span>
                              {centsToDisplay(item.costPerUnit)}
                            </span>
                            {margin !== null && (
                              <span className={`font-medium ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {margin >= 0 ? "+" : ""}{margin}% margin
                              </span>
                            )}
                            {supplier && (
                              <span className="truncate max-w-[80px]">
                                {supplier.name}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdjustingItem(item);
                              setAdjustQuantity("");
                              setAdjustNotes("");
                              setAdjustDialogOpen(true);
                            }}
                          >
                            <ArrowDownUp className="w-3 h-3 mr-1" />
                            Adjust
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ============================================================= */}
          {/*  SUPPLIERS TAB                                                 */}
          {/* ============================================================= */}
          <TabsContent value="suppliers">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Suppliers</h2>
              <Button size="sm" onClick={openCreateSupplier}>
                <Plus className="w-4 h-4 mr-1" />
                Add Supplier
              </Button>
            </div>

            {loadingSuppliers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : !suppliers?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No suppliers added yet.</p>
                  <Button size="sm" className="mt-4" onClick={openCreateSupplier}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Your First Supplier
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {suppliers.map((supplier) => (
                  <Card
                    key={supplier.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openEditSupplier(supplier)}
                  >
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">
                              {supplier.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                supplier.isActive !== false
                                  ? "bg-green-500/10 text-green-600 border-green-500/30"
                                  : "bg-red-500/10 text-red-600 border-red-500/30"
                              }`}
                            >
                              {supplier.isActive !== false ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {supplier.contactName && (
                              <span>Contact: {supplier.contactName}</span>
                            )}
                            {supplier.phone && <span>Tel: {supplier.phone}</span>}
                            {supplier.email && <span>{supplier.email}</span>}
                          </div>
                        </div>
                        {supplier.isActive !== false && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deactivateSupplierMutation.mutate(supplier.id);
                            }}
                            disabled={deactivateSupplierMutation.isPending}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ============================================================= */}
          {/*  PURCHASE ORDERS TAB                                           */}
          {/* ============================================================= */}
          <TabsContent value="purchase-orders">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold">Purchase Orders</h2>
              <div className="flex gap-2">
                <Select value={poStatusFilter} onValueChange={setPoStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={openCreatePO}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create PO
                </Button>
              </div>
            </div>

            {loadingPOs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : !filteredPOs.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <PackageCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No purchase orders found.</p>
                  <Button size="sm" className="mt-4" onClick={openCreatePO}>
                    <Plus className="w-4 h-4 mr-1" />
                    Create Your First PO
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredPOs.map((po) => {
                  const supplier = suppliersMap.get(po.supplierId);
                  return (
                    <Card key={po.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-sm font-mono">
                                PO-{po.id.slice(0, 8)}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`text-xs ${poStatusBadge(po.status)}`}
                              >
                                {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Supplier: {supplier?.name || po.supplierId.slice(0, 8)}
                              </span>
                              <span>
                                Items: {po.items?.length || 0}
                              </span>
                              <span className="font-medium text-foreground">
                                Total: {centsToDisplay(po.totalCost)}
                              </span>
                              {po.orderedAt && (
                                <span>
                                  Ordered:{" "}
                                  {new Date(po.orderedAt).toLocaleDateString()}
                                </span>
                              )}
                              {po.createdAt && (
                                <span>
                                  Created:{" "}
                                  {new Date(po.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {po.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {po.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 shrink-0">
                            {po.status === "draft" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() =>
                                  updatePOStatusMutation.mutate({
                                    id: po.id,
                                    status: "submitted",
                                  })
                                }
                                disabled={updatePOStatusMutation.isPending}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Submit
                              </Button>
                            )}
                            {po.status === "submitted" && (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => receivePOMutation.mutate(po.id)}
                                disabled={receivePOMutation.isPending}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Receive
                              </Button>
                            )}
                            {(po.status === "draft" || po.status === "submitted") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  updatePOStatusMutation.mutate({
                                    id: po.id,
                                    status: "cancelled",
                                  })
                                }
                                disabled={updatePOStatusMutation.isPending}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Line items expandable detail */}
                        {po.items && po.items.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/40">
                            <div className="grid gap-1">
                              {po.items.map((line, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-xs py-1"
                                >
                                  <span className="text-muted-foreground">
                                    {line.itemName || line.inventoryItemId.slice(0, 8)}
                                    {" x "}
                                    {line.quantity}
                                  </span>
                                  <span className="font-medium">
                                    {centsToDisplay(line.totalCost)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ============================================================= */}
          {/*  ANALYTICS TAB                                                 */}
          {/* ============================================================= */}
          <TabsContent value="analytics">
            {loadingAnalytics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-64 rounded-lg" />
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Boxes className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {analytics?.totalItems ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Items
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card
                    className={`p-4 ${
                      (analytics?.lowStockCount ?? 0) > 0
                        ? "border-red-500/30"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          (analytics?.lowStockCount ?? 0) > 0
                            ? "bg-red-500/10"
                            : "bg-green-500/10"
                        }`}
                      >
                        <AlertTriangle
                          className={`w-5 h-5 ${
                            (analytics?.lowStockCount ?? 0) > 0
                              ? "text-red-500"
                              : "text-green-500"
                          }`}
                        />
                      </div>
                      <div>
                        <p
                          className={`text-2xl font-bold ${
                            (analytics?.lowStockCount ?? 0) > 0
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {analytics?.lowStockCount ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Low Stock
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {centsToDisplay(analytics?.totalStockValue ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock Value
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {centsToDisplay(
                            analytics?.monthlyConsumptionCost ?? 0
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Monthly Consumption
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Low Stock Items */}
                {lowStockItems && lowStockItems.length > 0 && (
                  <Card className="mb-6 border-red-500/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        Low Stock Items
                        <Badge className="bg-red-500 text-white text-xs">
                          {lowStockItems.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {lowStockItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-background"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {categoryLabel(item.category)} --{" "}
                                  {stockToDisplay(item.currentStock)} /{" "}
                                  {stockToDisplay(item.minimumStock)} {item.unit}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs shrink-0"
                              onClick={() => {
                                setAdjustingItem(item);
                                setAdjustQuantity("");
                                setAdjustNotes("");
                                setAdjustDialogOpen(true);
                              }}
                            >
                              <ArrowDownUp className="w-3 h-3 mr-1" />
                              Adjust
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Consumed Items */}
                {analytics?.topConsumedItems &&
                  analytics.topConsumedItems.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Top Consumed Items
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {analytics.topConsumedItems.map((item, idx) => (
                            <div
                              key={item.itemId}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">
                                    {item.itemName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.unit}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-primary">
                                {stockToDisplay(item.totalConsumed)} {item.unit}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Empty analytics state */}
                {!analytics && !loadingAnalytics && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground">
                        No analytics data available yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />

      {/* ================================================================= */}
      {/*  ITEM CREATE / EDIT DIALOG                                        */}
      {/* ================================================================= */}
      <Dialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setItemDialogOpen(false);
            setEditingItem(null);
            resetItemForm();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the inventory item details below."
                : "Fill in the details for the new inventory item."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Name *</Label>
                <Input
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. All-Purpose Cleaner"
                />
              </div>
              <div className="space-y-1">
                <Label>SKU</Label>
                <Input
                  value={itemForm.sku}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  placeholder="e.g. APC-001"
                />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(val) =>
                    setItemForm((f) => ({
                      ...f,
                      category: val as (typeof INVENTORY_CATEGORIES)[number],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unit *</Label>
                <Select
                  value={itemForm.unit}
                  onValueChange={(val) =>
                    setItemForm((f) => ({ ...f, unit: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cost per Unit ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.costPerUnit}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, costPerUnit: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Selling Price ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.sellingPricePerUnit}
                  onChange={(e) =>
                    setItemForm((f) => ({
                      ...f,
                      sellingPricePerUnit: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Minimum Stock Level</Label>
                <Input
                  type="number"
                  min="0"
                  value={itemForm.minimumStock}
                  onChange={(e) =>
                    setItemForm((f) => ({
                      ...f,
                      minimumStock: e.target.value,
                    }))
                  }
                  placeholder="e.g. 500 (in hundredths)"
                />
              </div>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <Select
                  value={itemForm.supplierId}
                  onValueChange={(val) =>
                    setItemForm((f) => ({ ...f, supplierId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(suppliers || [])
                      .filter((s) => s.isActive !== false)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Consumption Map Editor */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Consumption per Wash (quantity used per service)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICE_CODES.map((code) => (
                  <div key={code} className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground min-w-[120px] truncate">
                      {code.replace(/_/g, " ")}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-sm"
                      value={itemForm.consumptionMap[code] || ""}
                      onChange={(e) =>
                        setItemForm((f) => ({
                          ...f,
                          consumptionMap: {
                            ...f.consumptionMap,
                            [code]: e.target.value,
                          },
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setItemDialogOpen(false);
                setEditingItem(null);
                resetItemForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleItemSubmit}
              disabled={
                !itemForm.name ||
                createItemMutation.isPending ||
                updateItemMutation.isPending
              }
            >
              {createItemMutation.isPending || updateItemMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : editingItem ? (
                <Pencil className="w-4 h-4 mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {editingItem ? "Update Item" : "Create Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/*  ADJUST STOCK DIALOG                                              */}
      {/* ================================================================= */}
      <Dialog
        open={adjustDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustDialogOpen(false);
            setAdjustingItem(null);
            setAdjustQuantity("");
            setAdjustNotes("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {adjustingItem
                ? `Adjust stock for "${adjustingItem.name}". Current stock: ${stockToDisplay(adjustingItem.currentStock)} ${adjustingItem.unit}.`
                : "Adjust stock level."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Quantity (+ to add, - to remove)</Label>
              <Input
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="e.g. 500 or -200"
              />
              <p className="text-xs text-muted-foreground">
                Values are in hundredths. E.g. 500 = 5.00 units.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="e.g. Restocked from delivery"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdjustDialogOpen(false);
                setAdjustingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustSubmit}
              disabled={!adjustQuantity || adjustStockMutation.isPending}
            >
              {adjustStockMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ArrowDownUp className="w-4 h-4 mr-1" />
              )}
              Adjust Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/*  SUPPLIER CREATE / EDIT DIALOG                                    */}
      {/* ================================================================= */}
      <Dialog
        open={supplierDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSupplierDialogOpen(false);
            setEditingSupplier(null);
            resetSupplierForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Update the supplier details below."
                : "Fill in the details for the new supplier."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Supplier name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Contact Name</Label>
                <Input
                  value={supplierForm.contactName}
                  onChange={(e) =>
                    setSupplierForm((f) => ({
                      ...f,
                      contactName: e.target.value,
                    }))
                  }
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={supplierForm.email}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="supplier@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="123 Business Rd"
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                value={supplierForm.notes}
                onChange={(e) =>
                  setSupplierForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSupplierDialogOpen(false);
                setEditingSupplier(null);
                resetSupplierForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSupplierSubmit}
              disabled={
                !supplierForm.name ||
                createSupplierMutation.isPending ||
                updateSupplierMutation.isPending
              }
            >
              {createSupplierMutation.isPending ||
              updateSupplierMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : editingSupplier ? (
                <Pencil className="w-4 h-4 mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {editingSupplier ? "Update Supplier" : "Create Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/*  CREATE PURCHASE ORDER DIALOG                                     */}
      {/* ================================================================= */}
      <Dialog
        open={poDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPoDialogOpen(false);
            resetPOForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Select a supplier and add line items for this purchase order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Supplier *</Label>
                <Select
                  value={poForm.supplierId}
                  onValueChange={(val) =>
                    setPoForm((f) => ({ ...f, supplierId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers || [])
                      .filter((s) => s.isActive !== false)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input
                  value={poForm.notes}
                  onChange={(e) =>
                    setPoForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Order notes..."
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Line Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPOLineItem}
                  className="h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>

              {poForm.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No line items added yet. Click "Add Item" to begin.
                </p>
              )}

              {poForm.items.map((line, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/30 border border-border/40"
                >
                  <div className="col-span-12 sm:col-span-4 space-y-1">
                    <Label className="text-xs">Item</Label>
                    <Select
                      value={line.inventoryItemId}
                      onValueChange={(val) =>
                        updatePOLineItem(idx, "inventoryItemId", val)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {(items || []).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-8 text-xs"
                      value={line.quantity}
                      onChange={(e) =>
                        updatePOLineItem(idx, "quantity", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Unit Cost ({currencySymbol})</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 text-xs"
                      value={line.unitCost}
                      onChange={(e) =>
                        updatePOLineItem(idx, "unitCost", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-3 flex items-end">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">Line Total</Label>
                      <p className="h-8 flex items-center text-xs font-medium">
                        {centsToDisplay(poLineTotal(line))}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removePOLineItem(idx)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {poForm.items.length > 0 && (
                <div className="flex justify-end pt-2 border-t border-border/40">
                  <p className="text-sm font-semibold">
                    Grand Total: {centsToDisplay(poGrandTotal())}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPoDialogOpen(false);
                resetPOForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePOSubmit}
              disabled={
                !poForm.supplierId ||
                poForm.items.length === 0 ||
                createPOMutation.isPending
              }
            >
              {createPOMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
