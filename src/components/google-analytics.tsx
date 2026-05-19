"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PublicConfigPayload = {
  gaMeasurementId?: string;
};

export function GoogleAnalytics() {
  const pathname = usePathname();
  const [measurementId, setMeasurementId] = useState("");
  const [isReady, setIsReady] = useState(false);
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    void fetch("/api/public-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as PublicConfigPayload;
      })
      .then((payload) => {
        if (isCancelled || !payload?.gaMeasurementId) {
          return;
        }

        setMeasurementId(payload.gaMeasurementId);
      })
      .catch(() => {
        // Ignore analytics bootstrap failures so page rendering is unaffected.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!measurementId || typeof window === "undefined") {
      return;
    }

    if (typeof window.gtag === "function") {
      setIsReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`,
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.async = true;
      document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false });
    setIsReady(true);
  }, [measurementId]);

  useEffect(() => {
    if (!isReady || typeof window.gtag !== "function") {
      return;
    }

    if (lastTrackedPathRef.current === pathname) {
      return;
    }

    lastTrackedPathRef.current = pathname;
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [isReady, pathname]);

  return null;
}