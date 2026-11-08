"use client";

import { Download, MonitorSmartphone, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Registers the service worker and offers an "Install app" button on phones and computers. */
export function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIos(/iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const click = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setDeferred(null);
    } else setHelp(true);
  };

  return (
    <>
      <button
        onClick={click}
        className="brand-gradient inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
      >
        <Download className="h-3.5 w-3.5" /> Install app
      </button>
      {help && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={() => setHelp(false)}>
          <div className="fade-up w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <MonitorSmartphone className="h-5 w-5 text-accent" /> Install MyPDF
              </h2>
              <button onClick={() => setHelp(false)} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            {isIos ? (
              <ol className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  1. Tap <Share className="h-4 w-4 text-accent" /> <b>Share</b> in Safari’s toolbar
                </li>
                <li className="flex items-center gap-2">
                  2. Choose <SquarePlus className="h-4 w-4 text-accent" /> <b>Add to Home Screen</b>
                </li>
                <li>3. Tap <b>Add</b> — MyPDF appears on your home screen like an app.</li>
              </ol>
            ) : (
              <ul className="space-y-3 text-sm text-muted">
                <li>
                  <b className="text-fg">Computer (Chrome / Edge):</b> click the install icon at the right of the address bar, or open the browser menu → <i>Install MyPDF</i>.
                </li>
                <li>
                  <b className="text-fg">Android:</b> open the browser menu (⋮) → <i>Install app</i> or <i>Add to Home screen</i>.
                </li>
                <li>
                  <b className="text-fg">Mac Safari:</b> File → <i>Add to Dock</i>.
                </li>
              </ul>
            )}
            <p className="mt-4 text-xs text-muted">Once installed it opens in its own window and works offline.</p>
          </div>
        </div>
      )}
    </>
  );
}
