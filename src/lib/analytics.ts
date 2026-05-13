type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, {
    ...params,
    page_location: window.location.href,
    page_path: window.location.pathname,
  });
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