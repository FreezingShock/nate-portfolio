"use client";

import { useState, type ComponentProps } from "react";
import { Copy, Download, RotateCcw, Save, Upload } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { COMING_SOON } from "@/lib/fractured-idle/data";
import { exportSave, importSave, newState, offlineEff, writeSave } from "@/lib/fractured-idle/engine";
import { SoundPanel } from "@/components/sound-controls";
import { useAccount } from "@/lib/account/client";
import { CloudPanel, forceNextPush, keepBackup, overwriteCloud } from "./cloud-sync";
import { ActionBtn, Badge, SectionTitle, Toggle, tint, type Ctx } from "./ui";

const IDEAS = [
    { name: "Slayer bosses", symbol: "critDamage" as const, color: "var(--mc-red)", desc: "Timed boss fights that pay skill xp and rare loot." },
    { name: "Minion skins", symbol: "forge" as const, color: "var(--mc-green)", desc: "Cosmetic looks for the minions orbiting your button." },
];

export function SoonTab(_: Ctx) {
    const row = (c: { name: string; symbol: ComponentProps<typeof McSymbol>["name"]; color: string; desc: string }, tag: string) => (
        <div key={c.name} className="flex items-center gap-3 rounded-xl border border-dashed p-3" style={{ borderColor: tint(c.color, 40) }}>
            <Badge color={c.color}><McSymbol name={c.symbol} /></Badge>
            <div className="min-w-0 flex-1">
                <div className="font-minecraft font-bold text-sm" style={{ color: c.color }}>{c.name}</div>
                <div className="font-rubik text-[11px] text-muted-foreground">{c.desc}</div>
            </div>
            <span className="shrink-0 rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint(c.color, 45), color: c.color }}>{tag}</span>
        </div>
    );
    return (
        <>
            <SectionTitle color="var(--mc-gold)">Planned</SectionTitle>
            {COMING_SOON.map((c) => row(c, "Planned"))}
            <SectionTitle color="var(--mc-light-purple)">Ideas</SectionTitle>
            {IDEAS.map((c) => row(c, "Idea"))}
            <p className="font-rubik text-[11px] text-muted-foreground">Recently added: Enchanting, the Fractured Level, islands, popups and the combo meter.</p>
        </>
    );
}

export function SettingsTab({ s, render, say, replaceState }: Ctx & { replaceState: (n: ReturnType<typeof newState>) => void }) {
    const [text, setText] = useState("");
    const acct = useAccount();
    return (
        <>
            <SectionTitle color="var(--mc-aqua)">Display</SectionTitle>
            <Toggle label="Scientific notation" on={s.sci} onChange={(v) => { s.sci = v; render(); }} />
            <Toggle label="Floating click numbers" on={s.fx} onChange={(v) => { s.fx = v; render(); }} />
            <Toggle label="Orbiting minions (turn off to save battery)" on={s.orbit} onChange={(v) => { s.orbit = v; render(); }} />
            <SectionTitle color="var(--mc-green)">Sound</SectionTitle>
            <SoundPanel />
            <SectionTitle color="var(--mc-green)">Gameplay</SectionTitle>
            <Toggle label="Popup events (bobbers, golden shards, quick time events)" on={s.popups} onChange={(v) => { s.popups = v; render(); }} />
            <Toggle label="Popup messages" on={s.toasts} onChange={(v) => { s.toasts = v; render(); }} />
            <SectionTitle color="var(--mc-light-purple)">Enchanting</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5">
                {(["full", "quick", "off"] as const).map((a) => (
                    <button key={a} type="button" aria-pressed={s.enc.opts.anim === a} onClick={() => { s.enc.opts.anim = a; render(); }} className="rounded-lg border px-2 py-1.5 font-rubik text-xs transition-colors hover:bg-white/10" style={s.enc.opts.anim === a ? { borderColor: "var(--mc-light-purple)", color: "var(--mc-light-purple)", backgroundColor: tint("var(--mc-light-purple)", 14) } : { borderColor: "rgba(255,255,255,0.12)" }}>
                        {a === "full" ? "Full reveal" : a === "quick" ? "Quick reveal" : "Instant"}
                    </button>
                ))}
            </div>
            <SectionTitle color="var(--mc-aqua)">Cloud save</SectionTitle>
            <CloudPanel s={s} say={say} replaceState={replaceState} />
            <SectionTitle color="var(--mc-yellow)">Save data</SectionTitle>
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
                        forceNextPush(); // a deliberate import must not be undone by the cloud copy being "further along"
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
                        const signedIn = !!acct.email;
                        const msg = signedIn
                            ? "Delete your Fractured Idle save everywhere? Your cloud save is reset too, and your other devices will switch to the fresh game. Each device keeps a local backup you can restore from Settings."
                            : "Delete your Fractured Idle save? A local backup is kept in Settings.";
                        if (!window.confirm(msg)) return;
                        const fresh = newState();
                        keepBackup(s); // a mis-click is recoverable from Settings > Cloud save > Backup
                        replaceState(fresh);
                        if (signedIn) void overwriteCloud(fresh);
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
            <SectionTitle color="var(--mc-aqua)">Keyboard</SectionTitle>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {[
                    ["Space", "click, hold to build the combo"],
                    ["1-9, 0", "jump to a tab"],
                    ["[  ]", "previous / next tab"],
                    ["E, arrows, WASD", "answer quick time events"],
                    ["R", "roll an enchant (Enchant tab)"],
                    ["I", "travel map"],
                    ["B", "cycle buy amount"],
                    ["F", "fullscreen"],
                ].map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 font-rubik text-[11px]">
                        <kbd className="shrink-0 rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">{k}</kbd>
                        <span className="text-muted-foreground">{v}</span>
                    </div>
                ))}
            </div>
        </>
    );
}
