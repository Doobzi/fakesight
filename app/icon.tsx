import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "16px",
        }}
      >
        <div
          style={{
            width: "54px",
            height: "54px",
            borderRadius: "16px",
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(34,211,238,0.14))",
            border: "1px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#A78BFA",
            fontSize: "38px",
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