import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Chart Clash — Simple Lessons for Serious Stock Market Skills";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        {/* Candlestick icons */}
        <div style={{ display: "flex", gap: 24, marginBottom: 40 }}>
          {[
            { color: "#fb7185", h: 80, y: 30 },
            { color: "#34d399", h: 100, y: 10 },
            { color: "#fb7185", h: 60, y: 50 },
            { color: "#34d399", h: 120, y: 0 },
            { color: "#34d399", h: 90, y: 20 },
          ].map((bar, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 160,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                  marginTop: bar.y,
                }}
              >
                <div
                  style={{
                    width: 2,
                    height: 160,
                    background: bar.color,
                    position: "absolute",
                    opacity: 0.5,
                  }}
                />
                <div
                  style={{
                    width: 24,
                    height: bar.h,
                    background: bar.color,
                    borderRadius: 4,
                    position: "absolute",
                    top: (160 - bar.h) / 2,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#f1f5f9",
            letterSpacing: -2,
          }}
        >
          Chart Clash
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            marginTop: 16,
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Simple Lessons for Serious Stock Market Skills
        </div>

        {/* Traffic light pills */}
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          {[
            { label: "Buy", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
            { label: "Wait", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
            { label: "Sell", color: "#fb7185", bg: "rgba(251,113,133,0.15)" },
          ].map((pill) => (
            <div
              key={pill.label}
              style={{
                padding: "8px 24px",
                borderRadius: 999,
                background: pill.bg,
                color: pill.color,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {pill.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
