export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isAnalyticsEnabled() {
  return GA_MEASUREMENT_ID.length > 0;
}

export function trackEvent(
  eventName: string,
  parameters: Record<string, string | number | boolean | undefined> = {},
) {
  if (
    !GA_MEASUREMENT_ID ||
    typeof window === "undefined" ||
    typeof window.gtag !== "function"
  ) {
    return;
  }

  const sanitizedParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined),
  );

  window.gtag("event", eventName, sanitizedParameters);
}