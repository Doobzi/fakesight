import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#050505",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "42px",
        }}
      >
        <div
          style={{
            width: "142px",
            height: "142px",
            borderRadius: "36px",
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.34), rgba(34,211,238,0.2))",
            border: "2px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#A78BFA",
            fontSize: "96px",
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          Φ
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}