import { ImageResponse } from "next/og";

// Apple touch icon — same wordmark dot, scaled for iOS home-screen.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBF8F3",
        }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: "50%",
            background: "#C4732A",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
