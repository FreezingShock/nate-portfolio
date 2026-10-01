"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Eye, EyeOff, ImageUp, LoaderCircle, Lock, RotateCcw, Trash2, Upload } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { McSymbol, MC_SYMBOLS, type McSymbolName } from "@/components/mc-symbol";
import { HeroLevel, Panel, ProfileHero, ProfileShell, tint, type ViewProfile } from "@/components/profile-canvas";
import { Tip, TipCard } from "@/components/games/fractured-idle/tooltip";
import { equipCosmetics, removeAvatar, updateProfile, uploadAvatar, type Profile } from "@/lib/account/client";
import { COS_KINDS, equippedOf, isUnlocked, ofKind, progressFor, type CosKind, type Cosmetic } from "@/lib/account/cosmetics";
import { CARD_STYLES, DEFAULT_LAYOUT, SIZE_LABEL, WIDGETS, accentOf, avatarColors, bannerBg, cleanHandle, customOf, hueOfId, type AvatarKind, type AvatarTone, type Custom, type WidgetSize } from "@/lib/account/custom";
import type { State } from "@/lib/fractured-idle/data";

// The Customize tab. Everything here edits a draft that the live preview (the real profile hero) shows at
// once; "Save changes" writes it. Equipping an unlocked cosmetic and uploading a picture are the two
// exceptions: they act immediately, because they are single deliberate clicks. See lib/account/custom.ts for
// what is stored and how it is validated.

interface Draft {
    name: string;
    handle: string;
    bio: string;
    pronouns: string;
    status: string;
    isPublic: boolean;
    custom: Custom;
}
const draftOf = (u: Profile): Draft => ({ name: u.name, handle: u.handle ?? "", bio: u.bio, pronouns: u.custom.pronouns, status: u.custom.status, isPublic: u.isPublic, custom: u.custom });

const SWATCHES = ["#55ffff", "#55ff55", "#ffff55", "#ffaa00", "#ff5555", "#ff55ff", "#c084fc", "#5555ff", "#ffffff", "#00aaaa"];
const TONES: { id: AvatarTone; label: string }[] = [
    { id: "vivid", label: "Vivid" },
    { id: "deep", label: "Deep" },
    { id: "pastel", label: "Pastel" },
    { id: "mono", label: "Mono" },
];
const GLYPHS = Object.keys(MC_SYMBOLS) as McSymbolName[];

function Field({ label, hint, children, right }: { label: string; hint?: string; children: ReactNode; right?: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 flex items-center justify-between gap-2">
                <span className="font-minecraft text-[11px] font-bold text-foreground">{label}</span>
                {right && <span className="font-rubik text-[10px] text-muted-foreground">{right}</span>}
            </span>
            {children}
            {hint && <span className="mt-1 block font-rubik text-[10.5px] text-muted-foreground">{hint}</span>}
        </label>
    );
}

function Switch({ on, onChange, label, tip }: { on: boolean; onChange: (v: boolean) => void; label: string; tip: ReactNode }) {
    return (
        <Tip tip={tip}>
            <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="cz-switch" data-on={on}>
                <i />
            </button>
        </Tip>
    );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; tip?: ReactNode }[] }) {
    return (
        <div className="cz-seg" role="radiogroup">
            {options.map((o) => {
                const b = (
                    <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} data-on={value === o.id}>
                        {o.label}
                    </button>
                );
                return o.tip ? <Tip key={o.id} tip={o.tip}>{b}</Tip> : b;
            })}
        </div>
    );
}

// ---------- picture upload ----------
const SIDE = 256;
function drawCrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, out: number, zoom: number, ox: number, oy: number) {
    const base = Math.min(img.naturalWidth, img.naturalHeight);
    const side = base / zoom;
    const sx = (img.naturalWidth - side) / 2 + (ox * (img.naturalWidth - side)) / 2;
    const sy = (img.naturalHeight - side) / 2 + (oy * (img.naturalHeight - side)) / 2;
    ctx.clearRect(0, 0, out, out);
    ctx.drawImage(img, Math.max(0, sx), Math.max(0, sy), side, side, 0, 0, out, out);
}

function PictureUpload({ onDone }: { onDone: (msg: { ok: boolean; text: string }) => void }) {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [ox, setOx] = useState(0);
    const [oy, setOy] = useState(0);
    const [busy, setBusy] = useState(false);
    const [over, setOver] = useState(false);
    const view = useRef<HTMLCanvasElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const url = useRef<string | null>(null);

    useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);
    useEffect(() => {
        const c = view.current;
        const ctx = c?.getContext("2d");
        if (c && ctx && img) drawCrop(ctx, img, c.width, zoom, ox, oy);
    }, [img, zoom, ox, oy]);

    const pick = (f: File | undefined | null) => {
        if (!f) return;
        if (!/^image\/(png|jpe?g|webp|gif|avif|bmp)$/.test(f.type)) return onDone({ ok: false, text: "Pick a PNG, JPEG, WebP or GIF image." });
        if (f.size > 12 * 1024 * 1024) return onDone({ ok: false, text: "That file is over 12 MB." });
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(f);
        const i = new Image();
        i.onload = () => {
            if (i.naturalWidth < 32 || i.naturalHeight < 32) return onDone({ ok: false, text: "That image is too small (at least 32 px)." });
            setZoom(1);
            setOx(0);
            setOy(0);
            setImg(i);
        };
        i.onerror = () => onDone({ ok: false, text: "Could not read that image." });
        i.src = url.current;
    };

    const use = async () => {
        if (!img) return;
        setBusy(true);
        const c = document.createElement("canvas");
        c.width = c.height = SIDE;
        const ctx = c.getContext("2d");
        if (!ctx) {
            setBusy(false);
            return onDone({ ok: false, text: "Your browser cannot process images." });
        }
        drawCrop(ctx, img, SIDE, zoom, ox, oy);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.86));
        if (!blob || blob.type !== "image/webp") {
            setBusy(false);
            return onDone({ ok: false, text: "Your browser cannot save WebP images." });
        }
        const r = await uploadAvatar(blob);
        setBusy(false);
        if (r.ok) setImg(null);
        onDone({ ok: r.ok, text: r.ok ? "Picture updated." : (r.error ?? "Upload failed.") });
    };

    if (!img)
        return (
            <div
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
                className="cz-drop"
                data-over={over}
            >
                <ImageUp className="size-6 text-muted-foreground" />
                <p className="font-rubik text-xs text-muted-foreground">Drop an image here, or</p>
                <button type="button" onClick={() => input.current?.click()} className="pf-btn" data-primary=""><Upload className="size-4" /> <span>Choose a file</span></button>
                <p className="font-rubik text-[10px] text-muted-foreground">It is cropped square and shrunk to {SIDE}px in your browser. Nothing else is kept.</p>
                <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
        );
    return (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <canvas ref={view} width={160} height={160} className="size-40 shrink-0 rounded-full border border-white/20" />
            <div className="w-full min-w-0 flex-1 space-y-2">
                {([["Zoom", zoom, 1, 4, 0.01, setZoom], ["Left / right", ox, -1, 1, 0.01, setOx], ["Up / down", oy, -1, 1, 0.01, setOy]] as const).map(([l, v, lo, hi, st, set]) => (
                    <label key={l} className="flex items-center gap-3 font-rubik text-[11px] text-muted-foreground">
                        <span className="w-20 shrink-0">{l}</span>
                        <input type="range" min={lo} max={hi} step={st} value={v} onChange={(e) => set(Number(e.target.value))} className="cz-range flex-1" />
                    </label>
                ))}
                <div className="flex gap-2 pt-1">
                    <button type="button" disabled={busy} onClick={() => void use()} className="pf-btn" data-primary="">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} <span>Use this picture</span></button>
                    <button type="button" disabled={busy} onClick={() => setImg(null)} className="pf-btn">Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ---------- the locker ----------
function Preview({ c, u }: { c: Cosmetic; u: ViewProfile }) {
    if (c.kind === "symbol") return <span className="text-2xl" style={{ color: "var(--mc-aqua)" }}>{c.symbol ? <McSymbol name={c.symbol} /> : <span className="text-base text-muted-foreground">none</span>}</span>;
    if (c.kind === "banner") return <span className="block h-9 w-full rounded-lg border border-white/15" style={{ background: c.bg }} />;
    if (c.kind === "frame") return <AccountAvatar id={u.id} name={u.name} size={34} frame={c} avatar={customOf(u.custom).avatar} />;
    return <span className="size-8 rounded-full border-2 border-white/30" style={{ background: c.color, boxShadow: `0 0 14px ${c.color}` }} />;
}

function Locker({ u, onMsg }: { u: Profile; onMsg: (m: { ok: boolean; text: string } | null) => void }) {
    const eq = equippedOf(u.cosmetics);
    const [busy, setBusy] = useState<string | null>(null);

    const equip = async (c: Cosmetic) => {
        if (eq[c.kind].id === c.id) return;
        setBusy(c.id);
        onMsg(null);
        const r = await equipCosmetics({ [c.kind]: c.id });
        setBusy(null);
        if (!r.ok) onMsg({ ok: false, text: r.error ?? "Could not equip that." });
    };

    return (
        <div className="space-y-4">
            {COS_KINDS.map((k) => {
                const list = ofKind(k.id as CosKind);
                const owned = list.filter((c) => isUnlocked(c, u.games)).length;
                return (
                    <Panel key={k.id} id="custom" title={k.label} meta={`${owned}/${list.length} owned`}>
                        <p className="-mt-1 mb-3 font-rubik text-[11px] text-muted-foreground">{k.blurb}</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                            {list.map((c) => {
                                const open = isUnlocked(c, u.games);
                                const on = eq[c.kind].id === c.id;
                                const have = progressFor(c, u.games);
                                const pct = c.need ? Math.min(1, have / c.need.n) : 1;
                                const color = on ? "var(--mc-aqua)" : open ? "var(--mc-green)" : "var(--muted-foreground)";
                                return (
                                    <Tip
                                        key={c.id}
                                        box
                                        tip={
                                            <TipCard
                                                title={c.name}
                                                color={on ? "var(--mc-aqua)" : open ? "var(--mc-green)" : "var(--mc-gold)"}
                                                tag={on ? "Equipped" : open ? "Unlocked" : "Locked"}
                                                lines={[c.need ? `Unlocked in ${c.game === "fractured-idle" ? "Fractured Idle" : c.game}.` : "Free for everyone."]}
                                                rows={c.need ? [["Requires", c.need.label], ["Your progress", open ? "Done" : `${Math.floor(Math.min(have, c.need.n)).toLocaleString()} / ${c.need.n.toLocaleString()}`, open ? "var(--mc-green)" : "var(--mc-yellow)"]] : undefined}
                                                cta={open && !on ? "Click to equip!" : undefined}
                                                ctaDim={on}
                                            />
                                        }
                                    >
                                        <button type="button" disabled={!open || busy !== null} onClick={() => void equip(c)} aria-pressed={on} className="cos-card group w-full" data-on={on} data-open={open} style={{ ["--c" as string]: color } as CSSProperties}>
                                            <span className="grid h-11 w-full place-items-center">{busy === c.id ? <LoaderCircle className="size-5 animate-spin" /> : <Preview c={c} u={u} />}</span>
                                            <span className="mt-1.5 block truncate font-minecraft text-[11px] font-bold" style={{ color: open ? "var(--foreground)" : "var(--muted-foreground)" }}>{c.name}</span>
                                            {open ? (
                                                <span className="block font-rubik text-[10px]" style={{ color }}>{on ? "Equipped" : "Owned"}</span>
                                            ) : (
                                                <>
                                                    <span className="mt-0.5 flex items-center gap-1 font-rubik text-[10px] text-muted-foreground"><Lock className="size-3" /> {c.need!.label}</span>
                                                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full" style={{ width: `${pct * 100}%`, background: "var(--mc-gold)" }} /></span>
                                                </>
                                            )}
                                        </button>
                                    </Tip>
                                );
                            })}
                        </div>
                    </Panel>
                );
            })}
        </div>
    );
}

// ---------- the customizer ----------
export function Customizer({ u, fiState }: { u: Profile; fiState: State | null }) {
    const [d, setD] = useState<Draft>(() => draftOf(u));
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const base = useMemo(() => draftOf(u), [u]);
    const dirty = JSON.stringify(d) !== JSON.stringify(base);
    const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
    const setC = (p: Partial<Custom>) => setD((x) => ({ ...x, custom: { ...x.custom, ...p } }));

    // After a picture upload or removal the stored avatar changes under the draft; follow it.
    const storedAvatar = JSON.stringify(u.custom.avatar);
    useEffect(() => {
        setD((x) => ({ ...x, custom: { ...x.custom, avatar: u.custom.avatar } }));
    }, [storedAvatar]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!dirty) return;
        const f = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", f);
        return () => window.removeEventListener("beforeunload", f);
    }, [dirty]);

    const preview: ViewProfile = { ...u, name: d.name.trim() || u.name, handle: d.handle || null, bio: d.bio, custom: { ...d.custom, pronouns: d.pronouns, status: d.status } };
    const accent = accentOf(preview);
    const av = d.custom.avatar;
    const uploaded = u.custom.avatar.kind === "upload";

    const save = async () => {
        setSaving(true);
        setMsg(null);
        const r = await updateProfile({
            name: d.name,
            handle: d.handle === "" ? null : d.handle,
            bio: d.bio,
            isPublic: d.isPublic,
            custom: { ...d.custom, pronouns: d.pronouns, status: d.status },
        });
        setSaving(false);
        setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error ?? "Could not save." });
    };

    const move = (i: number, by: number) => {
        const l = [...d.custom.layout];
        const j = i + by;
        if (j < 0 || j >= l.length) return;
        [l[i], l[j]] = [l[j], l[i]];
        setC({ layout: l });
    };
    const patchSlot = (i: number, p: Partial<{ size: WidgetSize; hidden: boolean }>) => setC({ layout: d.custom.layout.map((w, k) => (k === i ? { ...w, ...p, ...(p.hidden === false ? { hidden: undefined } : {}) } : w)) });

    const link = typeof window !== "undefined" && (d.handle || u.id) ? `${window.location.origin}/u/${u.handle ?? u.id}` : "";
    const [c1, c2] = avatarColors(av.hue ?? hueOfId(u.id), av.tone);
    const hueNow = av.hue ?? hueOfId(u.id);
    const picMsg = (m: { ok: boolean; text: string }) => setMsg(m);

    return (
        <ProfileShell u={preview} className="space-y-4">
            <style>{CZ_CSS}</style>
            <div>
                <p className="mb-1.5 font-minecraft text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live preview</p>
                <ProfileHero u={preview} isOwner level={<HeroLevel u={preview} s={fiState} />} isPublic={d.isPublic} />
            </div>

            {msg && <p role={msg.ok ? "status" : "alert"} className="rounded-xl border px-3 py-2 font-rubik text-xs" style={{ color: msg.ok ? "var(--mc-green)" : "var(--mc-red)", borderColor: tint(msg.ok ? "var(--mc-green)" : "var(--mc-red)", 40), background: tint(msg.ok ? "var(--mc-green)" : "var(--mc-red)", 10) }}>{msg.text}</p>}

            <div className="grid gap-4 lg:grid-cols-2">
                {/* ---- identity ---- */}
                <Panel id="custom" title="Identity">
                    <div className="space-y-3">
                        <Field label="Display name" right={`${d.name.length}/24`}>
                            <input value={d.name} maxLength={24} onChange={(e) => set({ name: e.target.value })} className="cz-input" />
                        </Field>
                        <Field label="Handle" hint="The name in your profile link. Letters, numbers and underscores." right={d.handle ? `/u/${d.handle}` : "none"}>
                            <div className="flex items-center gap-1.5">
                                <span className="font-minecraft text-sm text-muted-foreground">@</span>
                                <input value={d.handle} maxLength={20} onChange={(e) => set({ handle: cleanHandle(e.target.value) })} placeholder="yourname" className="cz-input" autoCapitalize="none" spellCheck={false} />
                            </div>
                        </Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Pronouns" right={`${d.pronouns.length}/20`}>
                                <input value={d.pronouns} maxLength={20} onChange={(e) => set({ pronouns: e.target.value })} placeholder="they/them" className="cz-input" />
                            </Field>
                            <Field label="Status" right={`${d.status.length}/40`}>
                                <input value={d.status} maxLength={40} onChange={(e) => set({ status: e.target.value })} placeholder="Grinding islands" className="cz-input" />
                            </Field>
                        </div>
                        <Field label="Bio" right={`${d.bio.length}/200`}>
                            <textarea value={d.bio} maxLength={200} rows={3} onChange={(e) => set({ bio: e.target.value })} placeholder="Tell people about yourself" className="cz-input resize-none" />
                        </Field>
                    </div>
                </Panel>

                {/* ---- sharing ---- */}
                <Panel id="custom" title="Sharing">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="font-minecraft text-[11px] font-bold text-foreground">Public profile</div>
                            <p className="mt-0.5 max-w-sm font-rubik text-[11px] leading-relaxed text-muted-foreground">Anyone with your link can see this page: your name, picture, bio, look, and Fractured Idle stats. Never your email. You can switch it off any time.</p>
                        </div>
                        <Switch on={d.isPublic} onChange={(v) => set({ isPublic: v })} label="Public profile" tip={<TipCard title="Public profile" color={d.isPublic ? "var(--mc-green)" : "var(--mc-gold)"} tag={d.isPublic ? "On" : "Off"} lines={[d.isPublic ? "Your profile can be opened by anyone with the link, and it shows in the player list." : "Only you can open your profile."]} />} />
                    </div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="font-rubik text-[10px] uppercase tracking-wider text-muted-foreground">Your link</div>
                        <div className="mt-1 flex items-center gap-2">
                            <code className="min-w-0 flex-1 truncate font-rubik text-xs text-foreground/90">{link || "Save a handle to get a short link"}</code>
                            <Tip tip={<TipCard title="Copy link" color="var(--mc-aqua)" lines={[u.isPublic ? "Copies your public profile link." : "Turn on Public profile and save first, or nobody else can open it."]} cta={u.isPublic ? "Click to copy!" : undefined} ctaDim={!u.isPublic} />}>
                                <button type="button" disabled={!link} onClick={() => { void navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className="pf-btn" data-ok={copied || undefined}>
                                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                                </button>
                            </Tip>
                        </div>
                        {d.isPublic !== u.isPublic && <p className="mt-2 font-rubik text-[10.5px] text-[var(--mc-yellow)]">Save to apply this change.</p>}
                    </div>
                </Panel>

                {/* ---- avatar ---- */}
                <Panel id="custom" title="Profile picture" className="lg:col-span-2">
                    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
                        <div className="flex flex-col items-center gap-2">
                            <AccountAvatar id={u.id} name={preview.name} size={112} frame={equippedOf(u.cosmetics).frame} avatar={av} />
                            <span className="font-rubik text-[10px] text-muted-foreground">Shown with your equipped frame</span>
                        </div>
                        <div className="min-w-0 space-y-4">
                            <Seg<AvatarKind>
                                value={av.kind}
                                onChange={(k) => setC({ avatar: k === "upload" ? u.custom.avatar : { ...av, kind: k, glyph: k === "glyph" ? (av.glyph ?? "wisdom") : undefined, v: undefined } })}
                                options={[
                                    { id: "generated", label: "Initial", tip: <TipCard title="Initial" color="var(--mc-aqua)" lines={["Your first letter on a color gradient."]} /> },
                                    { id: "glyph", label: "Symbol", tip: <TipCard title="Symbol" color="var(--mc-light-purple)" lines={["One of the game's symbols on a color gradient."]} /> },
                                    ...(uploaded ? [{ id: "upload" as const, label: "Photo", tip: <TipCard title="Your uploaded picture" color="var(--mc-green)" lines={["The picture you uploaded."]} /> }] : []),
                                ]}
                            />

                            {av.kind === "glyph" && (
                                <div>
                                    <div className="mb-1 font-minecraft text-[11px] font-bold">Symbol</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {GLYPHS.map((g) => (
                                            <Tip key={g} tip={<TipCard title={g.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} color="var(--mc-light-purple)" />}>
                                                <button type="button" aria-pressed={av.glyph === g} onClick={() => setC({ avatar: { ...av, glyph: g } })} className="cz-glyph" data-on={av.glyph === g}><McSymbol name={g} /></button>
                                            </Tip>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {av.kind !== "upload" && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Color" right={`${hueNow}°`}>
                                        <input type="range" min={0} max={359} value={hueNow} onChange={(e) => setC({ avatar: { ...av, hue: Number(e.target.value) } })} className="cz-range cz-hue" aria-label="Avatar hue" />
                                    </Field>
                                    <div>
                                        <div className="mb-1 font-minecraft text-[11px] font-bold">Tone</div>
                                        <Seg<AvatarTone> value={av.tone ?? "vivid"} onChange={(t) => setC({ avatar: { ...av, tone: t } })} options={TONES.map((t) => ({ id: t.id, label: t.label }))} />
                                    </div>
                                    <div className="flex items-center gap-2 sm:col-span-2">
                                        <span className="h-3 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
                                        <button type="button" onClick={() => setC({ avatar: { kind: av.kind, glyph: av.glyph } })} className="pf-btn"><RotateCcw className="size-3.5" /> <span>Reset color</span></button>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-dashed border-white/12 pt-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="font-minecraft text-[11px] font-bold">Upload a picture</span>
                                    {uploaded && (
                                        <button type="button" onClick={() => void removeAvatar().then((r) => setMsg(r.ok ? { ok: true, text: "Picture removed." } : { ok: false, text: r.error ?? "Could not remove it." }))} className="pf-btn" data-danger=""><Trash2 className="size-3.5" /> <span>Remove photo</span></button>
                                    )}
                                </div>
                                <PictureUpload onDone={picMsg} />
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* ---- banner + accent + card style ---- */}
                <Panel id="custom" title="Banner and colors">
                    <div className="space-y-4">
                        <div>
                            <div className="mb-1 font-minecraft text-[11px] font-bold">Banner</div>
                            <Seg<"cosmetic" | "custom">
                                value={d.custom.banner.mode}
                                onChange={(m) => setC({ banner: { ...d.custom.banner, mode: m } })}
                                options={[
                                    { id: "cosmetic", label: "Equipped banner", tip: <TipCard title="Equipped banner" color="var(--mc-aqua)" lines={["Use the banner you equipped in the locker below."]} /> },
                                    { id: "custom", label: "Custom gradient", tip: <TipCard title="Custom gradient" color="var(--mc-light-purple)" lines={["Mix any two colors you like."]} /> },
                                ]}
                            />
                            <span className="mt-2 block h-12 rounded-xl border border-white/15" style={{ background: bannerBg(preview) }} />
                            {d.custom.banner.mode === "custom" && (
                                <div className="mt-2 grid grid-cols-[auto_auto_1fr] items-center gap-3">
                                    <input type="color" aria-label="Banner color one" value={d.custom.banner.a} onChange={(e) => setC({ banner: { ...d.custom.banner, a: e.target.value } })} className="cz-color" />
                                    <input type="color" aria-label="Banner color two" value={d.custom.banner.b} onChange={(e) => setC({ banner: { ...d.custom.banner, b: e.target.value } })} className="cz-color" />
                                    <input type="range" min={0} max={360} value={d.custom.banner.angle} aria-label="Gradient angle" onChange={(e) => setC({ banner: { ...d.custom.banner, angle: Number(e.target.value) } })} className="cz-range" />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <span className="font-minecraft text-[11px] font-bold">Accent color</span>
                                {d.custom.accent && <button type="button" onClick={() => setC({ accent: null })} className="font-rubik text-[10.5px] text-muted-foreground hover:text-foreground">Use equipped accent</button>}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {SWATCHES.map((c) => (
                                    <button key={c} type="button" aria-label={`Accent ${c}`} aria-pressed={d.custom.accent === c} onClick={() => setC({ accent: c })} className="cz-sw" data-on={d.custom.accent === c} style={{ background: c }} />
                                ))}
                                <input type="color" aria-label="Custom accent color" value={d.custom.accent ?? accent} onChange={(e) => setC({ accent: e.target.value })} className="cz-color" />
                            </div>
                            <p className="mt-1.5 font-rubik text-[10.5px] text-muted-foreground">{d.custom.accent ? "A custom color is overriding your accent cosmetic." : "Following the accent cosmetic you equipped below."}</p>
                        </div>
                    </div>
                </Panel>

                <Panel id="custom" title="Card style">
                    <div className="grid grid-cols-2 gap-2">
                        {CARD_STYLES.map((s) => (
                            <Tip key={s.id} box tip={<TipCard title={s.label} color={accent} lines={[s.blurb]} cta={d.custom.card === s.id ? undefined : "Click to choose!"} />}>
                                <button type="button" aria-pressed={d.custom.card === s.id} onClick={() => setC({ card: s.id })} className="cz-style" data-on={d.custom.card === s.id}>
                                    <span className="cz-style-pv" data-card={s.id} />
                                    <span className="font-minecraft text-[11px] font-bold">{s.label}</span>
                                </button>
                            </Tip>
                        ))}
                    </div>
                </Panel>

                {/* ---- layout ---- */}
                <Panel id="custom" title="Page layout" meta={<button type="button" onClick={() => setC({ layout: DEFAULT_LAYOUT.map((w) => ({ ...w })) })} className="hover:text-foreground">Reset</button>} className="lg:col-span-2">
                    <p className="-mt-1 mb-3 font-rubik text-[11px] text-muted-foreground">Reorder, resize or hide the sections of your profile. Visitors see the same arrangement (minus the ones marked only you).</p>
                    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                        <ul className="space-y-1.5">
                            {d.custom.layout.map((w, i) => {
                                const meta = WIDGETS[w.id];
                                return (
                                    <li key={w.id} className="cz-row" data-hidden={!!w.hidden} style={{ ["--c" as string]: meta.color } as CSSProperties}>
                                        <span className="cz-row-i"><McSymbol name={meta.symbol} /></span>
                                        <Tip tip={<TipCard title={meta.label} color={meta.color} lines={[meta.blurb]} />}>
                                            <span tabIndex={0} className="min-w-0 flex-1 cursor-help truncate font-minecraft text-xs font-bold outline-none">{meta.label}{meta.ownerOnly && <em className="ml-1.5 font-rubik text-[10px] font-normal not-italic text-muted-foreground">only you</em>}</span>
                                        </Tip>
                                        <div className="cz-seg cz-seg-sm" role="radiogroup" aria-label={`${meta.label} size`}>
                                            {meta.sizes.map((s) => (
                                                <Tip key={s} tip={<TipCard title={SIZE_LABEL[s]} color={meta.color} />}>
                                                    <button type="button" role="radio" aria-checked={w.size === s} onClick={() => patchSlot(i, { size: s })} data-on={w.size === s}>{s.toUpperCase()}</button>
                                                </Tip>
                                            ))}
                                        </div>
                                        <Tip tip={<TipCard title={w.hidden ? "Hidden" : "Shown"} color={meta.color} lines={[w.hidden ? "This section is not on your profile." : "This section is on your profile."]} cta="Click to toggle!" />}>
                                            <button type="button" aria-label={w.hidden ? `Show ${meta.label}` : `Hide ${meta.label}`} aria-pressed={!w.hidden} onClick={() => patchSlot(i, { hidden: !w.hidden })} className="cz-ib">{w.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
                                        </Tip>
                                        <button type="button" aria-label={`Move ${meta.label} up`} disabled={i === 0} onClick={() => move(i, -1)} className="cz-ib"><ArrowUp className="size-3.5" /></button>
                                        <button type="button" aria-label={`Move ${meta.label} down`} disabled={i === d.custom.layout.length - 1} onClick={() => move(i, 1)} className="cz-ib"><ArrowDown className="size-3.5" /></button>
                                    </li>
                                );
                            })}
                        </ul>
                        <div>
                            <div className="mb-1.5 font-minecraft text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preview (wide screens)</div>
                            <div className="cz-map">
                                {d.custom.layout.filter((w) => !w.hidden).map((w) => (
                                    <span key={w.id} className="cz-map-b" style={{ ["--c" as string]: WIDGETS[w.id].color, gridColumn: `span ${{ s: 4, m: 6, l: 8, f: 12 }[w.size]}` } as CSSProperties}>
                                        <McSymbol name={WIDGETS[w.id].symbol} /> {WIDGETS[w.id].label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>

            <Locker u={u} onMsg={setMsg} />

            {/* save bar */}
            <div className="cz-save" data-dirty={dirty}>
                <span className="font-rubik text-xs text-muted-foreground">{dirty ? "You have unsaved changes." : "All changes saved."}</span>
                <span className="flex-1" />
                <button type="button" disabled={!dirty || saving} onClick={() => { setD(base); setMsg(null); }} className="pf-btn">Discard</button>
                <button type="button" disabled={!dirty || saving} onClick={() => void save()} className="pf-btn" data-primary="">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} <span>Save changes</span></button>
            </div>
        </ProfileShell>
    );
}

const CZ_CSS = `
.cz-input{width:100%;height:2.4rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.28);padding:0 .75rem;font-family:var(--font-rubik,inherit);font-size:.85rem;color:var(--foreground);outline:none;transition:border-color .15s,box-shadow .15s}
textarea.cz-input{height:auto;padding:.55rem .75rem;line-height:1.45}
.cz-input:focus{border-color:var(--ac);box-shadow:0 0 0 3px color-mix(in oklch,var(--ac) 22%,transparent)}
.cz-switch{position:relative;flex:none;width:2.7rem;height:1.5rem;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);transition:background .2s,border-color .2s;cursor:pointer;outline:none}
.cz-switch i{position:absolute;left:.15rem;top:.15rem;width:1.1rem;height:1.1rem;border-radius:50%;background:#cfc8dd;transition:transform .2s cubic-bezier(.2,1.5,.4,1),background .2s}
.cz-switch[data-on="true"]{background:color-mix(in oklch,var(--mc-green) 30%,transparent);border-color:var(--mc-green)}
.cz-switch[data-on="true"] i{transform:translateX(1.2rem);background:var(--mc-green);box-shadow:0 0 10px var(--mc-green)}
.cz-switch:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.cz-seg{display:inline-flex;flex-wrap:wrap;gap:.2rem;padding:.2rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22)}
.cz-seg button{height:1.9rem;padding:0 .75rem;border-radius:.6rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:var(--muted-foreground);transition:background .15s,color .15s,box-shadow .15s,transform .12s;outline:none}
.cz-seg button:hover{color:var(--foreground);background:rgba(255,255,255,.07)}
.cz-seg button:active{transform:scale(.95)}
.cz-seg button[data-on="true"]{color:var(--ac);background:color-mix(in oklch,var(--ac) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--ac) 50%,transparent)}
.cz-seg button:focus-visible{outline:2px solid var(--ac);outline-offset:1px}
.cz-seg-sm{flex-wrap:nowrap;padding:.12rem}
.cz-seg-sm button{height:1.55rem;padding:0 .5rem;font-size:.62rem}
.cz-drop{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1.2rem;border-radius:1rem;border:1.5px dashed rgba(255,255,255,.22);background:rgba(0,0,0,.18);text-align:center;transition:border-color .15s,background .15s}
.cz-drop[data-over="true"]{border-color:var(--ac);background:color-mix(in oklch,var(--ac) 10%,transparent)}
.cz-range{-webkit-appearance:none;appearance:none;width:100%;height:.45rem;border-radius:999px;background:rgba(255,255,255,.14);outline:none;cursor:pointer}
.cz-range::-webkit-slider-thumb{-webkit-appearance:none;width:1.05rem;height:1.05rem;border-radius:50%;background:var(--ac);border:2px solid #0b0820;box-shadow:0 0 10px var(--ac)}
.cz-range::-moz-range-thumb{width:1.05rem;height:1.05rem;border-radius:50%;background:var(--ac);border:2px solid #0b0820;box-shadow:0 0 10px var(--ac)}
.cz-range:focus-visible{outline:2px solid var(--ac);outline-offset:3px}
.cz-hue{background:linear-gradient(90deg,hsl(0 85% 62%),hsl(60 85% 62%),hsl(120 85% 62%),hsl(180 85% 62%),hsl(240 85% 62%),hsl(300 85% 62%),hsl(360 85% 62%))}
.cz-color{width:2.2rem;height:2.2rem;padding:0;border-radius:.6rem;border:1px solid rgba(255,255,255,.25);background:none;cursor:pointer}
.cz-sw{width:1.8rem;height:1.8rem;border-radius:.55rem;border:2px solid rgba(255,255,255,.2);cursor:pointer;transition:transform .14s cubic-bezier(.2,1.5,.4,1),border-color .15s;outline:none}
.cz-sw:hover{transform:translateY(-2px)}
.cz-sw[data-on="true"]{border-color:#fff;box-shadow:0 0 0 2px #0b0820,0 0 12px currentColor}
.cz-sw:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.cz-glyph{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:.6rem;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.2);font-size:1.05rem;color:var(--foreground);transition:transform .14s cubic-bezier(.2,1.5,.4,1),border-color .15s,background .15s;outline:none}
.cz-glyph:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.4)}
.cz-glyph[data-on="true"]{color:var(--ac);border-color:var(--ac);background:color-mix(in oklch,var(--ac) 16%,transparent);box-shadow:0 0 14px -4px var(--ac)}
.cz-glyph:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.cz-style{display:flex;flex-direction:column;align-items:flex-start;gap:.45rem;width:100%;padding:.6rem;border-radius:.85rem;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.2);transition:transform .15s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s;outline:none}
.cz-style:hover{transform:translateY(-2px)}
.cz-style[data-on="true"]{border-color:var(--ac);box-shadow:0 0 0 1px var(--ac),0 0 20px -8px var(--ac)}
.cz-style:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.cz-style-pv{display:block;width:100%;height:2rem;border-radius:.5rem;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07)}
.cz-style-pv[data-card="solid"]{background:#14101f;border-color:rgba(255,255,255,.12)}
.cz-style-pv[data-card="glow"]{border-color:var(--ac);box-shadow:0 0 14px -4px var(--ac);background:rgba(255,255,255,.05)}
.cz-style-pv[data-card="pixel"]{border:none;border-radius:2px;background:#100010;box-shadow:0 0 0 2px #100010,0 0 0 4px color-mix(in oklch,var(--ac) 40%,#2a0a55),inset 0 0 0 2px color-mix(in oklch,var(--ac) 30%,transparent);margin:4px;width:calc(100% - 8px)}
.cz-row{display:flex;align-items:center;gap:.4rem;padding:.4rem .5rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:color-mix(in oklch,var(--c) 6%,rgba(0,0,0,.18));transition:opacity .15s}
.cz-row[data-hidden="true"]{opacity:.5}
.cz-row-i{display:grid;place-items:center;flex:none;width:1.7rem;height:1.7rem;border-radius:.5rem;font-size:.95rem;color:var(--c);background:color-mix(in oklch,var(--c) 16%,transparent)}
.cz-ib{display:grid;place-items:center;flex:none;width:1.75rem;height:1.75rem;border-radius:.55rem;border:1px solid rgba(255,255,255,.14);color:var(--foreground);transition:background .15s,transform .12s,opacity .15s;outline:none}
.cz-ib:hover:not(:disabled){background:rgba(255,255,255,.12)}
.cz-ib:active:not(:disabled){transform:scale(.9)}
.cz-ib:disabled{opacity:.3;cursor:not-allowed}
.cz-ib:focus-visible{outline:2px solid var(--ac);outline-offset:1px}
.cz-map{display:grid;grid-template-columns:repeat(12,1fr);gap:.35rem;padding:.5rem;border-radius:.9rem;border:1px dashed rgba(255,255,255,.18);background:rgba(0,0,0,.2)}
.cz-map-b{display:flex;align-items:center;gap:.3rem;min-height:2.4rem;padding:.3rem .5rem;border-radius:.55rem;font-family:var(--font-minecraft,inherit);font-size:.6rem;font-weight:700;color:var(--c);background:color-mix(in oklch,var(--c) 14%,transparent);border:1px solid color-mix(in oklch,var(--c) 40%,transparent);overflow:hidden;white-space:nowrap}
.cz-save{position:sticky;bottom:5.5rem;z-index:20;display:flex;align-items:center;gap:.5rem;padding:.6rem .8rem;border-radius:1rem;border:1px solid rgba(255,255,255,.14);background:color-mix(in oklch,var(--card) 88%,#000);backdrop-filter:blur(14px);box-shadow:0 10px 30px -10px rgba(0,0,0,.7);transition:border-color .2s,box-shadow .2s}
.cz-save[data-dirty="true"]{border-color:color-mix(in oklch,var(--ac) 60%,transparent);box-shadow:0 10px 30px -10px rgba(0,0,0,.7),0 0 24px -10px var(--ac)}
.cos-card{--c:var(--mc-aqua);display:block;padding:.6rem .55rem;border-radius:.9rem;text-align:left;border:1px solid color-mix(in oklch,var(--c) 28%,transparent);background:color-mix(in oklch,var(--c) 6%,rgba(0,0,0,.18));transition:transform .15s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s,background .15s;outline:none}
.cos-card[data-open="true"]:hover,.cos-card[data-open="true"]:focus-visible{transform:translateY(-2px);border-color:color-mix(in oklch,var(--c) 70%,transparent);box-shadow:0 10px 24px -14px var(--c)}
.cos-card[data-on="true"]{background:color-mix(in oklch,var(--mc-aqua) 14%,rgba(0,0,0,.2));box-shadow:0 0 0 1px var(--mc-aqua),0 0 22px -8px var(--mc-aqua)}
.cos-card[data-open="false"]{opacity:.7;cursor:not-allowed}
.cos-card:disabled{cursor:not-allowed}
.cos-card[data-open="true"]:disabled{cursor:default}
@media (prefers-reduced-motion:reduce){.cos-card,.cz-switch i,.cz-sw,.cz-glyph,.cz-style{transition:none}}
`;
