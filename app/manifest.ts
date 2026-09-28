import type { MetadataRoute } from "next";

// A manifest is what turns "random Next.js app" into "this is a real,
// installable site" in browser dev tools / Lighthouse — cheap legitimacy
// signal, and lets the site be added to a phone home screen.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Nate Anderson — Portfolio",
        short_name: "Nate Anderson",
        description:
            "Games, renders, and systems — built while studying toward environmental engineering.",
        start_url: "/",
        display: "standalone",
        background_color: "#0a0a0f",
        theme_color: "#4f46e5",
        icons: [
            {
                src: "/favicon-32x32.png?v=2",
                sizes: "32x32",
                type: "image/png",
            },
            {
                src: "/icon-192x192.png?v=2",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon-512x512.png?v=2",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/apple-touch-icon.png?v=2",
                sizes: "180x180",
                type: "image/png",
            },
        ],
    };
}
