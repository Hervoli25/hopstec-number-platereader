import { useRef } from "react";
import { format } from "date-fns";
import { formatCents, BILLING_PLANS } from "@shared/billing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  XCircle,
  Printer,
} from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  tax: number;
  total: number;
  planAtTime: string;
  washCount: number;
  parkingSessionCount: number;
  activeUserCount: number;
  branchCount: number;
  lineItems: LineItem[];
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface TenantBasic {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
}

interface InvoicePreviewProps {
  invoice: InvoiceData;
  tenant: TenantBasic | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendInvoice?: (invoiceId: string) => void;
  isSending?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft: { label: "Draft", icon: FileText, className: "bg-gray-100 text-gray-700 border-gray-300" },
  pending: { label: "Pending", icon: Clock, className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  paid: { label: "Paid", icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-300" },
  overdue: { label: "Overdue", icon: AlertCircle, className: "bg-red-100 text-red-700 border-red-300" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-gray-100 text-gray-500 border-gray-300" },
};

function generateInvoiceHTML(invoice: InvoiceData, tenantName: string): string {
  const statusConf = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const lineItems = invoice.lineItems || [];

  const statusColors: Record<string, string> = {
    draft: "#6b7280",
    pending: "#d97706",
    paid: "#16a34a",
    overdue: "#dc2626",
    cancelled: "#9ca3af",
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company-info h1 { font-size: 28px; font-weight: 700; color: #3B82F6; letter-spacing: -0.5px; }
    .company-info p { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .invoice-badge { text-align: right; }
    .invoice-badge h2 { font-size: 32px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; letter-spacing: 2px; }
    .invoice-badge .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; color: ${statusColors[invoice.status] || "#6b7280"}; background: ${statusColors[invoice.status] || "#6b7280"}15; border: 1px solid ${statusColors[invoice.status] || "#6b7280"}40; margin-top: 8px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .meta-section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; font-weight: 600; }
    .meta-section p { font-size: 14px; color: #374151; line-height: 1.6; }
    .meta-section .highlight { font-weight: 600; color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #f9fafb; padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    tbody td { padding: 14px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    tbody td:last-child, tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; }
    .totals { margin-left: auto; width: 280px; }
    .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #374151; }
    .totals .row.total { border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 4px; font-size: 18px; font-weight: 700; color: #1a1a1a; }
    .usage-summary { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 32px 0; }
    .usage-summary h3 { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 12px; }
    .usage-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .usage-item { text-align: center; }
    .usage-item .value { font-size: 24px; font-weight: 700; color: #3B82F6; }
    .usage-item .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { font-size: 12px; color: #9ca3af; line-height: 1.8; }
    .notes { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 12px 16px; margin-top: 20px; border-radius: 0 4px 4px 0; }
    .notes p { font-size: 13px; color: #92400e; }
    @media print {
      body { padding: 20px; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>HOPSVOIR</h1>
      <p>Carwash & Parking Management Platform</p>
      <p>billing@hopsvoir.com</p>
    </div>
    <div class="invoice-badge">
      <h2>Invoice</h2>
      <div class="status">${statusConf.label.toUpperCase()}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-section">
      <h3>Bill To</h3>
      <p class="highlight">${tenantName}</p>
      <p>Plan: ${invoice.planAtTime.charAt(0).toUpperCase() + invoice.planAtTime.slice(1)}</p>
    </div>
    <div class="meta-section" style="text-align: right;">
      <h3>Invoice Details</h3>
      <p><span class="highlight">Invoice #:</span> ${invoice.invoiceNumber}</p>
      <p><span class="highlight">Issued:</span> ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
      <p><span class="highlight">Due:</span> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
      <p><span class="highlight">Period:</span> ${invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}</p>
      ${invoice.paidAt ? `<p><span class="highlight">Paid:</span> ${new Date(invoice.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems.map((item: LineItem) => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>$${(item.unitPrice / 100).toFixed(2)}</td>
        <td>$${(item.total / 100).toFixed(2)}</td>
      </tr>
      `).join("")}
      ${lineItems.length === 0 ? `
      <tr>
        <td colspan="4" style="text-align: center; color: #9ca3af; padding: 24px;">No line items</td>
      </tr>
      ` : ""}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>$${(invoice.subtotal / 100).toFixed(2)}</span></div>
    <div class="row"><span>Tax</span><span>$${(invoice.tax / 100).toFixed(2)}</span></div>
    <div class="row total"><span>Total</span><span>$${(invoice.total / 100).toFixed(2)}</span></div>
  </div>

  <div class="usage-summary">
    <h3>Usage Summary for Period</h3>
    <div class="usage-grid">
      <div class="usage-item">
        <div class="value">${invoice.washCount}</div>
        <div class="label">Washes</div>
      </div>
      <div class="usage-item">
        <div class="value">${invoice.parkingSessionCount}</div>
        <div class="label">Parking</div>
      </div>
      <div class="usage-item">
        <div class="value">${invoice.activeUserCount}</div>
        <div class="label">Users</div>
      </div>
      <div class="usage-item">
        <div class="value">${invoice.branchCount}</div>
        <div class="label">Branches</div>
      </div>
    </div>
  </div>

  ${invoice.notes ? `
  <div class="notes">
    <p><strong>Notes:</strong> ${invoice.notes}</p>
  </div>
  ` : ""}

  <div class="footer">
    <p>Thank you for your business.</p>
    <p>HOPSVOIR &mdash; Professional Carwash & Parking Management</p>
    <p style="margin-top: 8px;">Questions? Contact billing@hopsvoir.com</p>
  </div>
</body>
</html>`;
}

export function downloadInvoicePDF(invoice: InvoiceData, tenantName: string) {
  const html = generateInvoiceHTML(invoice, tenantName);
  const printWindow = window.open("", "_blank", "width=800,height=1000");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  // Give the browser a moment to render before triggering print
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

export default function InvoicePreview({
  invoice,
  tenant,
  open,
  onOpenChange,
  onSendInvoice,
  isSending,
}: InvoicePreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const tenantName = tenant?.name || invoice.tenantId.slice(0, 8);
  const statusConf = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConf.icon;
  const lineItems = invoice.lineItems || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice {invoice.invoiceNumber}</span>
            <Badge className={`${statusConf.className} gap-1 border`}>
              <StatusIcon className="h-3 w-3" />
              {statusConf.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Invoice for {tenantName} &mdash;{" "}
            {invoice.periodStart
              ? format(new Date(invoice.periodStart), "MMMM yyyy")
              : "—"}
          </DialogDescription>
        </DialogHeader>

        <div ref={contentRef} className="space-y-6 mt-2">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary">HOPSVOIR</h2>
              <p className="text-xs text-muted-foreground">
                Carwash & Parking Management Platform
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm">
                <span className="text-muted-foreground">Invoice #:</span>{" "}
                <span className="font-mono font-semibold">
                  {invoice.invoiceNumber}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Issued:</span>{" "}
                {invoice.issuedAt
                  ? format(new Date(invoice.issuedAt), "MMM d, yyyy")
                  : "—"}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Due:</span>{" "}
                {invoice.dueDate
                  ? format(new Date(invoice.dueDate), "MMM d, yyyy")
                  : "—"}
              </p>
              {invoice.paidAt && (
                <p className="text-sm text-green-600 font-medium">
                  Paid: {format(new Date(invoice.paidAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                Bill To
              </p>
              <p className="font-semibold">{tenantName}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {invoice.planAtTime} Plan
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                Billing Period
              </p>
              <p className="text-sm">
                {invoice.periodStart
                  ? format(new Date(invoice.periodStart), "MMM d, yyyy")
                  : "—"}{" "}
                &mdash;{" "}
                {invoice.periodEnd
                  ? format(new Date(invoice.periodEnd), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">
                    Description
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">
                    Qty
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">
                    Unit Price
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i} className="border-t border-muted">
                    <td className="px-4 py-3 text-sm">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatCents(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCents(item.total)}
                    </td>
                  </tr>
                ))}
                {lineItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-muted-foreground"
                    >
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCents(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCents(invoice.tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCents(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Usage Summary */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Usage Summary
            </p>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-primary">
                  {invoice.washCount}
                </p>
                <p className="text-xs text-muted-foreground">Washes</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">
                  {invoice.parkingSessionCount}
                </p>
                <p className="text-xs text-muted-foreground">Parking</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">
                  {invoice.activeUserCount}
                </p>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">
                  {invoice.branchCount}
                </p>
                <p className="text-xs text-muted-foreground">Branches</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-500 px-4 py-3 rounded-r">
              <p className="text-sm">
                <span className="font-medium">Notes:</span> {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadInvoicePDF(invoice, tenantName)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          {onSendInvoice && invoice.status !== "cancelled" && (
            <Button
              size="sm"
              onClick={() => onSendInvoice(invoice.id)}
              disabled={isSending}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? "Sending..." : "Send to Tenant"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
