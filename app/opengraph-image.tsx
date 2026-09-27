import { ImageResponse } from "next/og";
import { identity } from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "80px",
                    background: "#0a0908",
                    color: "#f5f0e8",
                    fontFamily: "sans-serif",
                }}
            >
                <div
                    style={{
                        fontSize: 28,
                        letterSpacing: 6,
                        textTransform: "uppercase",
                        color: "#d9a05b",
                    }}
                >
                    Portfolio
                </div>
                <div style={{ fontSize: 120, fontWeight: 700, marginTop: 20 }}>
                    {identity.name}
                </div>
                <div
                    style={{
                        fontSize: 32,
                        marginTop: 24,
                        color: "#b8b0a4",
                        maxWidth: 900,
                    }}
                >
                    {identity.tagline}
                </div>
            </div>
        ),
        { ...size }
    );
}
