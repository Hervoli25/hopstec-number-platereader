import { useState, useEffect } from "react";
import { X, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

// Detect iOS device
function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

// Check if app is already installed (running in standalone mode)
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

// Check if running in Safari (not Chrome/Firefox on iOS)
function isSafari(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return (
    /safari/.test(userAgent) &&
    !/chrome/.test(userAgent) &&
    !/crios/.test(userAgent) &&
    !/fxios/.test(userAgent)
  );
}

export function IOSInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the banner
    const wasDismissed = localStorage.getItem("ios-pwa-banner-dismissed");
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Only show on iOS Safari when not already installed
    if (isIOS() && !isStandalone() && isSafari()) {
      // Delay showing the banner slightly
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("ios-pwa-banner-dismissed", Date.now().toString());
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent pb-safe">
      <div className="bg-card border border-border rounded-xl shadow-xl p-4 mx-auto max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <img src="/favicon.png" alt="HOPSVOIR" className="w-8 h-8 rounded-lg" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm">Install HOPSVOIR</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add to your home screen for the best experience
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2 -mt-1"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
                <span>Tap the</span>
                <Share className="h-4 w-4 text-primary" />
                <span>Share button below</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">2</span>
                <span>Scroll and tap</span>
                <PlusSquare className="h-4 w-4 text-primary" />
                <span>"Add to Home Screen"</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
