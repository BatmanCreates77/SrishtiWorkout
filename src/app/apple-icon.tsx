import { ImageResponse } from "next/og";

// PNG icon for iPhone Home Screen and notifications (iOS ignores SVG icons).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c8435a" }}>
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12" />
        </svg>
      </div>
    ),
    size,
  );
}
