"use client";

import { useState } from "react";
import { Copy, Download, RotateCcw, Save, Upload } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { COMING_SOON } from "@/lib/fractured-idle/data";
import { exportSave, importSave, newState, offlineEff, writeSave } from "@/lib/fractured-idle/engine";
import { ActionBtn, Badge, Toggle, type Ctx } from "./ui";

export function SoonTab(_: Ctx) {
    return (
        <>
            {COMING_SOON.map((c) => (
                <div key={c.name} className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 p-3 opacity-80">
                    <Badge color={c.color}><McSymbol name={c.symbol} /></Badge>
                    <div className="flex-1">
                        <div className="font-minecraft text-sm" style={{ color: c.color }}>{c.name}</div>
                        <div className="font-rubik text-[11px] text-muted-foreground">{c.desc}</div>
                    </div>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 font-rubik text-[10px] text-muted-foreground">Planned</span>
                </div>
            ))}
        </>
    );
}

export function SettingsTab({ s, render, say, replaceState }: Ctx & { replaceState: (n: ReturnType<typeof newState>) => void }) {
    const [text, setText] = useState("");
    return (
        <>
            <Toggle label="Scientific notation" on={s.sci} onChange={(v) => { s.sci = v; render(); }} />
            <Toggle label="Floating click numbers" on={s.fx} onChange={(v) => { s.fx = v; render(); }} />
            <Toggle label="Orbiting minions (turn off to save battery)" on={s.orbit} onChange={(v) => { s.orbit = v; render(); }} />
            <Toggle label="Popup messages" on={s.toasts} onChange={(v) => { s.toasts = v; render(); }} />
            <p className="font-rubik text-[11px] text-muted-foreground">
                Offline progress: {Math.round(offlineEff(s) * 100)}% efficiency, up to 8 hours. Saves to this browser every 10 seconds.
            </p>
            <div className="flex flex-wrap gap-2">
                <ActionBtn icon={<Save className="size-4" />} onClick={() => { writeSave(s); say("Saved."); }}>Save now</ActionBtn>
                <ActionBtn icon={<Download className="size-4" />} onClick={() => { setText(exportSave(s)); say("Save code ready below. Copy it somewhere safe."); }}>Export</ActionBtn>
                <ActionBtn
                    icon={<Copy className="size-4" />}
                    onClick={() => {
                        const code = exportSave(s);
                        setText(code);
                        navigator.clipboard?.writeText(code).then(() => say("Save code copied."), () => say("Copy failed. Select the code below instead."));
                    }}
                >
                    Copy code
                </ActionBtn>
                <ActionBtn
                    icon={<Upload className="size-4" />}
                    onClick={() => {
                        const n = importSave(text);
                        if (!n) return say("That save code isn't valid.");
                        replaceState(n);
                        say("Save imported.");
                    }}
                >
                    Import
                </ActionBtn>
                <ActionBtn
                    icon={<RotateCcw className="size-4" />}
                    danger
                    onClick={() => {
                        if (!window.confirm("Delete your Fractured Idle save? This cannot be undone.")) return;
                        replaceState(newState());
                    }}
                >
                    Hard reset
                </ActionBtn>
            </div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Save code appears here after Export. Paste one and press Import."
                className="h-24 w-full resize-none rounded-lg border border-white/15 bg-black/30 p-2 font-mono text-[11px]"
            />
            <p className="font-rubik text-[11px] text-muted-foreground">
                Keys: Space click · F fullscreen · B buy amount · 1-9 open the first nine tabs
            </p>
        </>
    );
}
