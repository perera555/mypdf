import { ImageResponse } from "next/og";

/** Renders the MyPDF app icon as a PNG. `maskable` adds safe-zone padding for Android adaptive icons. */
export function appIcon(size: number, { maskable = false, rounded = true } = {}) {
  const pad = maskable ? size * 0.2 : size * 0.18;
  const glyph = size - pad * 2;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e11d48, #7c3aed)",
          borderRadius: rounded && !maskable ? size * 0.22 : 0,
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
