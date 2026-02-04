import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Share2, QrCode } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CustomerUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerUrl: string;
  plateDisplay: string;
}

export function CustomerUrlDialog({
  open,
  onOpenChange,
  customerUrl,
  plateDisplay
}: CustomerUrlDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customerUrl);
      setCopied(true);
      toast({ title: "Copied!", description: "Customer URL copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Track your car wash - ${plateDisplay}`,
          text: `Track your vehicle (${plateDisplay}) wash progress in real-time`,
          url: customerUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        console.log("Share cancelled");
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Customer Tracking Link
          </DialogTitle>
          <DialogDescription>
            Send this link to the customer so they can track their wash progress in real-time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vehicle Plate</label>
            <Input value={plateDisplay} readOnly className="font-mono" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Customer Tracking URL</label>
            <div className="flex gap-2">
              <Input
                value={customerUrl}
                readOnly
                className="font-mono text-xs"
                data-testid="input-customer-url"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                data-testid="button-copy-url"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">How to share:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Copy and send via WhatsApp/SMS</li>
              <li>Use the Share button below</li>
              <li>Generate QR code for easy scanning</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            className="flex-1"
            onClick={handleShare}
            data-testid="button-share"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
