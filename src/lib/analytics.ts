type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const isBrowser = typeof window !== "undefined";

function isDebugMode() {
  if (!isBrowser) return false;

  const params = new URLSearchParams(window.location.search);

  return (
    process.env.NODE_ENV !== "production" ||
    params.has("debug") ||
    params.has("gtm_debug") ||
    params.get("ga_debug") === "true"
  );
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (!isBrowser) return;

  const payload = {
    ...params,
    debug_mode: isDebugMode(),
    event_source: "ptm_web",
  };

  if (typeof window.gtag !== "function") {
    console.warn("[PTM Analytics] window.gtag no disponible:", eventName, payload);
    return;
  }

  window.gtag("event", eventName, payload);

  console.info("[PTM Analytics] Evento enviado:", eventName, payload);
}

export function trackAnalysisStarted(params: AnalyticsParams = {}) {
  trackEvent("analysis_started", params);
}

export function trackAnalysisCompleted(params: AnalyticsParams = {}) {
  trackEvent("analysis_completed", params);
}

export function trackPurchaseClicked(params: AnalyticsParams = {}) {
  trackEvent("purchase_clicked", params);
}

export function trackPaymentRedirect(params: AnalyticsParams = {}) {
  trackEvent("payment_redirect_started", params);
}

export function trackPaymentApproved(params: AnalyticsParams = {}) {
  trackEvent("payment_approved", params);
}