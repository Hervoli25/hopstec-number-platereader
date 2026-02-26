/**
 * HOPSTECH-OVERSEER Security Integration
 *
 * Express middleware that detects common web attacks (SQL injection, XSS,
 * path traversal, command injection) and reports them to the HOPSTECH-OVERSEER
 * threat-monitoring dashboard. Also provides brute-force login tracking
 * and blocked-IP enforcement.
 */

import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HOPSTECH_URL = process.env.HOPSTECH_URL || "";

/** How many failed logins before we report as brute force */
const BRUTE_FORCE_THRESHOLD = 5;

/** Window in ms to track failed logins (15 min) */
const BRUTE_FORCE_WINDOW_MS = 15 * 60 * 1000;

/** How often to refresh the blocked-IP list (5 min) */
const BLOCKED_IP_REFRESH_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Threat patterns
// ---------------------------------------------------------------------------

const SQL_INJECTION_RE =
  /('|--|;|\/\*|\*\/|union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+\w+\s+set|exec\s*\(|execute\s*\(|xp_cmdshell)/i;

const XSS_RE =
  /<script|javascript:|on(error|load|click|mouseover|focus|blur)\s*=/i;

const PATH_TRAVERSAL_RE = /(\.\.[\/\\]){2,}|\/etc\/passwd|\/proc\/self/i;

const COMMAND_INJECTION_RE =
  /[;&|`$]\s*(cat|ls|rm|wget|curl|bash|sh|python|perl|nc|ncat)\b/i;

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

/** IP → list of timestamps for failed logins */
const failedLogins = new Map<string, number[]>();

/** Set of currently blocked IPs (refreshed periodically) */
let blockedIps = new Set<string>();
let lastBlockedRefresh = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEnabled(): boolean {
  return HOPSTECH_URL.length > 0 && HOPSTECH_URL.startsWith("http");
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Fire-and-forget POST to the OVERSEER /api/threats endpoint.
 * Never throws — errors are silently logged.
 */
async function reportThreat(payload: {
  threatType: string;
  severity: "low" | "medium" | "high" | "critical";
  sourceIp: string;
  destinationPort: number;
  protocol: string;
  rawData: string;
  actionTaken: string;
}): Promise<void> {
  if (!isEnabled()) return;
  try {
    await fetch(`${HOPSTECH_URL}/api/threats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Non-blocking — don't let overseer outage affect the app
    console.error("[overseer] failed to report threat:", (err as Error).message);
  }
}

/** Refresh the blocked-IP list from OVERSEER (cached). */
async function refreshBlockedIps(): Promise<void> {
  if (!isEnabled()) return;
  if (Date.now() - lastBlockedRefresh < BLOCKED_IP_REFRESH_MS) return;
  try {
    const res = await fetch(`${HOPSTECH_URL}/api/blocked-ips`);
    if (res.ok) {
      const list: Array<{ ipAddress: string }> = await res.json();
      blockedIps = new Set(list.map((b) => b.ipAddress));
    }
    lastBlockedRefresh = Date.now();
  } catch {
    // Silently ignore — keep the previous list
  }
}

// ---------------------------------------------------------------------------
// Express middleware — request scanner
// ---------------------------------------------------------------------------

/**
 * Attach to `app.use()` BEFORE your API routes.
 * Scans every incoming request URL + body for attack patterns,
 * blocks requests from IPs flagged in OVERSEER, and reports threats.
 */
export function overseerRequestScanner() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isEnabled()) return next();

    const ip = getClientIp(req);

    // ---- Blocked-IP check ----
    await refreshBlockedIps();
    if (blockedIps.has(ip)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Combine URL + body into a single string to scan
    const url = req.originalUrl || req.url;
    const bodyStr =
      req.body && typeof req.body === "object" ? JSON.stringify(req.body) : "";
    const scanTarget = `${url} ${bodyStr}`;

    // ---- SQL injection ----
    if (SQL_INJECTION_RE.test(scanTarget)) {
      reportThreat({
        threatType: "sql_injection",
        severity: "critical",
        sourceIp: ip,
        destinationPort: 443,
        protocol: "TCP",
        rawData: `SQL injection attempt: ${req.method} ${url}`,
        actionTaken: "block",
      });
      return res.status(403).json({ message: "Forbidden" });
    }

    // ---- XSS ----
    if (XSS_RE.test(scanTarget)) {
      reportThreat({
        threatType: "xss",
        severity: "high",
        sourceIp: ip,
        destinationPort: 443,
        protocol: "TCP",
        rawData: `XSS attempt: ${req.method} ${url}`,
        actionTaken: "block",
      });
      return res.status(403).json({ message: "Forbidden" });
    }

    // ---- Path traversal ----
    if (PATH_TRAVERSAL_RE.test(scanTarget)) {
      reportThreat({
        threatType: "path_traversal",
        severity: "high",
        sourceIp: ip,
        destinationPort: 443,
        protocol: "TCP",
        rawData: `Path traversal attempt: ${req.method} ${url}`,
        actionTaken: "block",
      });
      return res.status(403).json({ message: "Forbidden" });
    }

    // ---- Command injection ----
    if (COMMAND_INJECTION_RE.test(scanTarget)) {
      reportThreat({
        threatType: "command_injection",
        severity: "critical",
        sourceIp: ip,
        destinationPort: 443,
        protocol: "TCP",
        rawData: `Command injection attempt: ${req.method} ${url}`,
        actionTaken: "block",
      });
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Brute-force tracking
// ---------------------------------------------------------------------------

/**
 * Call this after every **failed** login attempt.
 * Tracks the IP and, once the threshold is exceeded, reports to OVERSEER.
 */
export async function trackFailedLogin(ip: string): Promise<void> {
  const now = Date.now();
  const attempts = failedLogins.get(ip) || [];

  // Purge old entries outside the window
  const recent = attempts.filter((ts) => now - ts < BRUTE_FORCE_WINDOW_MS);
  recent.push(now);
  failedLogins.set(ip, recent);

  if (recent.length >= BRUTE_FORCE_THRESHOLD) {
    await reportThreat({
      threatType: "brute_force",
      severity: "medium",
      sourceIp: ip,
      destinationPort: 443,
      protocol: "TCP",
      rawData: `Brute force: ${recent.length} failed logins in ${BRUTE_FORCE_WINDOW_MS / 60000} min from ${ip}`,
      actionTaken: "alert",
    });
    // Reset so we don't spam alerts every subsequent attempt
    failedLogins.delete(ip);
  }
}

/**
 * Call this after a **successful** login to clear the failed-login counter.
 */
export function clearFailedLogins(ip: string): void {
  failedLogins.delete(ip);
}

/**
 * Utility to get the client IP from a request (exported for use in routes).
 */
export { getClientIp };
