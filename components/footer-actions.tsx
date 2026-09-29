"use client";

import { useState } from "react";
import { ArrowUp, Check, Copy } from "lucide-react";

const EMAIL = "nateanderson36b2@gmail.com";

/** Copy-email + back-to-top: the footer's two interactive buttons. */
export function FooterActions() {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(EMAIL);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            window.location.href = `mailto:${EMAIL}`;
        }
    }

    const base =
        "footer-chip inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-minecraft text-xs font-bold";

    return (
        <div className="flex flex-wrap items-center gap-3">
            <button
                type="button"
                onClick={copy}
                className={base}
                style={{ ["--c" as string]: copied ? "#55ff55" : "#ffaa00" }}
            >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied!" : "Copy email"}
            </button>
            <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className={base}
                style={{ ["--c" as string]: "#55ffff" }}
            >
                <ArrowUp className="size-3.5" /> Back to top
            </button>
        </div>
    );
}
