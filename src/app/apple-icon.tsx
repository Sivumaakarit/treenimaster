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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0A84FF 0%, #0066CC 52%, #34C759 100%)",
          borderRadius: 40,
        }}
      >
        <svg viewBox="0 0 28 28" width="124" height="124" fill="none">
          <path
            d="M5 7.5H23"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M14 7.5V21.5"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M7.5 18.5L11.5 14.5L14.5 16.5L20.5 10.5"
            stroke="#9BF6B5"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
