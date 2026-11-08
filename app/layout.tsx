import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { FolderHeart, House, LayoutGrid, ScanLine, Signature } from "lucide-react";
import { GitHubIcon, LogoMark } from "@/components/Logo";
import { InstallApp } from "@/components/InstallApp";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MyPDF — Free online PDF tools",
    template: "%s · MyPDF",
  },
  description:
    "Free PDF editor and toolkit: read, edit, sign, scan, print, merge, split, compress, convert, protect and more. Files never leave your device.",
  applicationName: "MyPDF",
  appleWebApp: { capable: true, title: "MyPDF", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

const REPO = "https://github.com/perera555/mypdf";

const MOBILE_TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/#tools", label: "Tools", icon: LayoutGrid },
  { href: "/tools/scan", label: "Scan", icon: ScanLine },
  { href: "/tools/sign", label: "Fill & Sign", icon: Signature },
  { href: "/files", label: "My Files", icon: FolderHeart },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <LogoMark />
              <span className="text-lg">
                My<span className="brand-text">PDF</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/#tools" className="hidden rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-fg md:block">
                All tools
              </Link>
              <Link href="/tools/sign" className="hidden rounded-lg px-3 py-1.5 font-medium text-accent transition hover:bg-surface-2 md:block">
                Fill &amp; Sign
              </Link>
              <Link href="/tools/scan" className="hidden rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-fg md:block">
                Scan
              </Link>
              <Link href="/files" className="hidden rounded-lg px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-fg md:block">
                My Files
              </Link>
              <InstallApp />
              <a href={REPO} target="_blank" rel="noreferrer" aria-label="Source code on GitHub" className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-fg">
                <GitHubIcon />
              </a>
            </nav>
          </div>
        </header>

        <div className="flex flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex flex-1 flex-col">{children}</main>
            <footer className="hidden border-t border-line md:block">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-6 text-sm text-muted">
                <p>MyPDF · Free and open source. Your files are processed on your device and never uploaded.</p>
                <a href={REPO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg">
                  <GitHubIcon className="h-4 w-4" /> GitHub
                </a>
              </div>
            </footer>
          </div>
        </div>

        {/* Phone tab bar */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        >
          {MOBILE_TABS.map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted active:text-accent">
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
