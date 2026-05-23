import { ImageResponse } from "next/og";

// Favicon — cream square with the rust dot from the PoroBook wordmark.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#C4732A",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
