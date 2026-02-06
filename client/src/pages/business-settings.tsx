import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SUPPORTED_CURRENCIES } from "@shared/schema";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Globe,
  Percent,
  Save,
  Receipt,
  Clock
} from "lucide-react";

interface BusinessSettings {
  id: string;
  businessName: string;
  businessLogo: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  taxRate: number;
  taxLabel: string;
  receiptFooter: string | null;
}

export default function BusinessSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["/api/business/settings"]
  });

  const [formData, setFormData] = useState<Partial<BusinessSettings>>({});

  // Initialize form data when settings load
  const effectiveData = { ...settings, ...formData };

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<BusinessSettings>) => {
      const res = await apiRequest("PUT", "/api/business/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    updateMutation.mutate(effectiveData);
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (currency) {
      setFormData(prev => ({
        ...prev,
        currency: currency.code,
        currencySymbol: currency.symbol,
        locale: currency.locale
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/manager")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Business Settings</h1>
          <div className="flex-1" />
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Business Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Your business details appear on tickets and receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Business Name</Label>
                  <Input
                    value={effectiveData.businessName || ""}
                    onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Your Business Name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={effectiveData.businessEmail || ""}
                    onChange={e => setFormData(prev => ({ ...prev, businessEmail: e.target.value }))}
                    placeholder="contact@business.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={effectiveData.businessPhone || ""}
                    onChange={e => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <Label>Logo URL (optional)</Label>
                  <Input
                    value={effectiveData.businessLogo || ""}
                    onChange={e => setFormData(prev => ({ ...prev, businessLogo: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={effectiveData.businessAddress || ""}
                  onChange={e => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                  placeholder="123 Main Street, City, Country"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Currency & Locale */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Currency & Locale
              </CardTitle>
              <CardDescription>
                Set your local currency for all pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={effectiveData.currency || "USD"}
                    onValueChange={handleCurrencyChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.symbol} {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Currency Symbol</Label>
                  <Input
                    value={effectiveData.currencySymbol || "$"}
                    onChange={e => setFormData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                    placeholder="$"
                  />
                </div>
                <div>
                  <Label>Locale</Label>
                  <Input
                    value={effectiveData.locale || "en-US"}
                    onChange={e => setFormData(prev => ({ ...prev, locale: e.target.value }))}
                    placeholder="en-US"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    For date/number formatting (e.g., en-US, fr-FR)
                  </p>
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timezone
                </Label>
                <Input
                  value={effectiveData.timezone || "UTC"}
                  onChange={e => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  placeholder="Africa/Kinshasa"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tax Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Tax Settings
              </CardTitle>
              <CardDescription>
                Configure tax rate for receipts (set to 0 to disable)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={(effectiveData.taxRate || 0) / 100}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      taxRate: Math.round(parseFloat(e.target.value || "0") * 100)
                    }))}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter percentage (e.g., 16 for 16%)
                  </p>
                </div>
                <div>
                  <Label>Tax Label</Label>
                  <Input
                    value={effectiveData.taxLabel || "Tax"}
                    onChange={e => setFormData(prev => ({ ...prev, taxLabel: e.target.value }))}
                    placeholder="VAT, GST, Tax, etc."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Receipt Customization */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Receipt Customization
              </CardTitle>
              <CardDescription>
                Custom message at the bottom of receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Receipt Footer Message</Label>
                <Textarea
                  value={effectiveData.receiptFooter || ""}
                  onChange={e => setFormData(prev => ({ ...prev, receiptFooter: e.target.value }))}
                  placeholder="Thank you for your business! Visit us again."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Preview
              </CardTitle>
              <CardDescription>
                How your currency and formatting will appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Business:</span>{" "}
                  <span className="font-medium">{effectiveData.businessName || "Your Business"}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Sample Price:</span>{" "}
                  <span className="font-mono font-bold">
                    {(() => {
                      try {
                        return new Intl.NumberFormat(effectiveData.locale || "en-US", {
                          style: "currency",
                          currency: effectiveData.currency || "USD"
                        }).format(25.50);
                      } catch {
                        return `${effectiveData.currencySymbol || "$"}25.50`;
                      }
                    })()}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Sample Date:</span>{" "}
                  <span className="font-mono">
                    {new Date().toLocaleString(effectiveData.locale || "en-US")}
                  </span>
                </p>
                {(effectiveData.taxRate || 0) > 0 && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{effectiveData.taxLabel || "Tax"}:</span>{" "}
                    <span>{((effectiveData.taxRate || 0) / 100).toFixed(1)}%</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
