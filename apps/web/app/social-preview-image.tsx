import { ImageResponse } from "next/og";

export const socialImageSize = {
  width: 1200,
  height: 630,
};

export function createSocialPreviewImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        padding: "64px 72px",
        background: "#092d24",
        color: "#ffffff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          right: -150,
          top: -210,
          borderRadius: 999,
          background: "#d8f85c",
          opacity: 0.13,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 330,
          height: 330,
          right: 110,
          bottom: -230,
          borderRadius: 999,
          border: "2px solid rgba(94, 230, 175, 0.32)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              background: "#d8f85c",
              color: "#092d24",
              fontSize: 42,
              fontWeight: 900,
            }}
          >
            N
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ display: "flex", fontSize: 31, fontWeight: 800 }}>
              Nuel Bank
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                letterSpacing: 3,
                color: "#9fc2b8",
              }}
            >
              SECURE DIGITAL BANKING
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            borderRadius: 999,
            background: "rgba(216, 248, 92, 0.12)",
            border: "1px solid rgba(216, 248, 92, 0.35)",
            color: "#d8f85c",
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              display: "flex",
              borderRadius: 999,
              background: "#5ee6af",
            }}
          />
          Protected by intelligent monitoring
        </div>
      </div>

      <div
        style={{
          width: 940,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            lineHeight: 1.04,
            letterSpacing: -3,
            fontWeight: 850,
          }}
        >
          Banking that keeps you confidently in control.
        </div>
        <div
          style={{
            display: "flex",
            width: 810,
            fontSize: 27,
            lineHeight: 1.45,
            color: "#bdd0ca",
          }}
        >
          Secure transfers, clear activity, and smarter fraud protection in one
          modern experience.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 42,
            height: 4,
            display: "flex",
            borderRadius: 99,
            background: "#d8f85c",
          }}
        />
        <div style={{ display: "flex", color: "#9fc2b8", fontSize: 19 }}>
          Everyday banking. Thoughtfully protected.
        </div>
      </div>
    </div>,
    socialImageSize,
  );
}
