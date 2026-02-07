import { ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex flex-col items-center gap-3 text-center">
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

          {/* Legal & Help Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground/80">
            <Link href="/help">
              <span className="hover:text-primary transition-colors cursor-pointer">
                Help Center
              </span>
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <Link href="/legal/privacy">
              <span className="hover:text-primary transition-colors cursor-pointer">
                Privacy Policy
              </span>
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <Link href="/legal/terms">
              <span className="hover:text-primary transition-colors cursor-pointer">
                Terms of Service
              </span>
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <Link href="/legal/cookies">
              <span className="hover:text-primary transition-colors cursor-pointer">
                Cookie Policy
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function CompactFooter() {
  return (
    <footer className="py-3 text-center">
      <div className="flex flex-col items-center gap-2">
        <a
          href="https://hopstecinnovation.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          Made by Hopstech Innovation
          <ExternalLink className="w-2.5 h-2.5" />
        </a>

        {/* Legal & Help Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/70">
          <Link href="/help">
            <span className="hover:text-primary transition-colors cursor-pointer">
              Help
            </span>
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <Link href="/legal/privacy">
            <span className="hover:text-primary transition-colors cursor-pointer">
              Privacy
            </span>
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <Link href="/legal/terms">
            <span className="hover:text-primary transition-colors cursor-pointer">
              Terms
            </span>
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <Link href="/legal/cookies">
            <span className="hover:text-primary transition-colors cursor-pointer">
              Cookies
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
