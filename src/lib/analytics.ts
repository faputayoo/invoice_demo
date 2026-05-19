declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  eventName: string,
  parameters: Record<string, string | number | boolean | undefined> = {},
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const sanitizedParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined),
  );

  window.gtag("event", eventName, sanitizedParameters);
}