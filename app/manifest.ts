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
                src: "/favicon.ico",
                sizes: "48x48",
                type: "image/x-icon",
            },
        ],
    };
}
