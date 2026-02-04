import { ExternalLink } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by HOPSVOIR
          </p>
          <a
            href="https://hopstecinnovation.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Made by Hopstech Innovation
            <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-[10px] text-muted-foreground/60">
            Smart Carwash & Parking Management
          </p>
        </div>
      </div>
    </footer>
  );
}

export function CompactFooter() {
  return (
    <footer className="py-3 text-center">
      <a
        href="https://hopstecinnovation.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
      >
        Made by Hopstech Innovation
        <ExternalLink className="w-2.5 h-2.5" />
      </a>
    </footer>
  );
}
