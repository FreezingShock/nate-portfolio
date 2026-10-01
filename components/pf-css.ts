// Shared profile styles (panels, buttons, chips, card styles). Kept apart from the profile canvas so light pages
// such as Settings can use them without loading any game code. Wrap a page in `.pf-root` to scope the accent.
export const PF_CSS = `
.pf-root{--ac:#55ffff}
.pf-card{--wc:var(--ac);position:relative;border-radius:1.1rem;padding:1rem;border:1px solid color-mix(in oklch,var(--wc) 22%,transparent);background:color-mix(in oklch,var(--card) 45%,transparent);backdrop-filter:blur(14px);transition:border-color .2s,box-shadow .2s}
.pf-root[data-card="solid"] .pf-card{background:color-mix(in oklch,var(--card) 94%,#000);backdrop-filter:none;border-color:rgba(255,255,255,.12)}
.pf-root[data-card="glow"] .pf-card{border-color:color-mix(in oklch,var(--wc) 55%,transparent);box-shadow:0 0 28px -12px var(--wc),inset 0 0 0 1px color-mix(in oklch,var(--wc) 10%,transparent)}
.pf-root[data-card="pixel"] .pf-card{margin:4px;border:none;border-radius:3px;backdrop-filter:none;background:#100010f2;box-shadow:0 0 0 2px #100010,0 0 0 4px color-mix(in oklch,var(--wc) 36%,#2a0a55),inset 0 0 0 2px color-mix(in oklch,var(--wc) 26%,transparent),0 8px 24px rgba(0,0,0,.45)}
.pf-banner{position:relative;height:9rem}
@media (min-width:640px){.pf-banner{height:11rem}}
.pf-avatar{border-radius:9999px;background:var(--background);padding:.375rem}
.pf-ph{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.75rem}
.pf-h{display:flex;align-items:center;gap:.5rem;margin:0;font-family:var(--font-minecraft,inherit);font-size:.85rem;font-weight:700;color:var(--wc);text-shadow:0 0 12px color-mix(in oklch,var(--wc) 40%,transparent)}
.pf-hi{display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:.55rem;font-size:.95rem;background:color-mix(in oklch,var(--wc) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--wc) 38%,transparent)}
.pf-meta{font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--muted-foreground);text-align:right}
.pf-chip{--c:var(--muted-foreground);display:inline-flex;align-items:center;gap:.35rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--c) 40%,transparent);background:color-mix(in oklch,var(--c) 9%,rgba(0,0,0,.12));padding:.1rem .6rem;font-family:var(--font-rubik,inherit);font-size:.68rem;color:var(--c);outline:none}
.pf-chip[data-tip]{cursor:help}
.pf-chip:focus-visible,.pf-look:focus-visible,.pf-pill:focus-visible,.pf-badge:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.pf-dot{width:.45rem;height:.45rem;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c)}
.pf-btn{display:inline-flex;align-items:center;gap:.4rem;height:2.25rem;padding:0 .8rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);font-family:var(--font-minecraft,inherit);font-size:.72rem;font-weight:700;color:var(--foreground);cursor:pointer;transition:transform .14s cubic-bezier(.2,1.5,.4,1),background .15s,border-color .15s,box-shadow .2s,opacity .15s;touch-action:manipulation;outline:none}
.pf-btn:hover:not(:disabled){transform:translateY(-1px);background:rgba(255,255,255,.1)}
.pf-btn:active:not(:disabled){transform:scale(.95)}
.pf-btn:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.pf-btn:disabled{opacity:.5;cursor:not-allowed}
.pf-btn[data-primary]{color:var(--ac);border-color:color-mix(in oklch,var(--ac) 55%,transparent);background:color-mix(in oklch,var(--ac) 12%,transparent)}
.pf-btn[data-primary]:hover:not(:disabled){background:color-mix(in oklch,var(--ac) 24%,transparent);box-shadow:0 4px 16px -6px var(--ac)}
.pf-btn[data-ok]{color:var(--mc-green);border-color:color-mix(in oklch,var(--mc-green) 55%,transparent)}
.pf-btn[data-danger]{color:var(--mc-red);border-color:color-mix(in oklch,var(--mc-red) 55%,transparent)}
.pf-iconbtn{display:grid;place-items:center;width:2.25rem;height:2.25rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.35);color:#fff;backdrop-filter:blur(8px);transition:background .15s,transform .14s}
.pf-iconbtn:hover{background:rgba(0,0,0,.55);transform:translateY(-1px)}
.pf-pill{--c:var(--mc-aqua);display:inline-block;border-radius:999px;border:1px solid color-mix(in oklch,var(--c) 55%,transparent);background:color-mix(in oklch,var(--c) 12%,transparent);padding:.1rem .65rem;font-family:var(--font-minecraft,inherit);font-size:.68rem;font-weight:700;color:var(--c);text-shadow:0 0 8px color-mix(in oklch,var(--c) 50%,transparent);cursor:help;outline:none;transition:transform .14s cubic-bezier(.2,1.5,.4,1)}
.pf-pill:hover{transform:translateY(-2px)}
.pf-pill[data-open="false"]{color:var(--muted-foreground);border-color:rgba(255,255,255,.1);background:transparent;text-shadow:none;opacity:.55}
.pf-badge{display:grid;place-items:center;width:2rem;height:2rem;border-radius:.55rem;border:1px solid color-mix(in oklch,var(--mc-yellow) 45%,transparent);background:color-mix(in oklch,var(--mc-yellow) 10%,transparent);color:var(--mc-yellow);font-size:1rem;cursor:help;outline:none;transition:transform .14s cubic-bezier(.2,1.5,.4,1)}
.pf-badge:hover{transform:translateY(-2px)}
.pf-badge[data-open="false"]{color:var(--muted-foreground);border-color:rgba(255,255,255,.1);background:transparent;opacity:.45}
.pf-look{display:flex;align-items:center;gap:.6rem;min-width:0;padding:.4rem .5rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--ac) 20%,transparent);background:color-mix(in oklch,var(--ac) 5%,rgba(0,0,0,.2));cursor:help;outline:none;transition:transform .15s cubic-bezier(.2,1.5,.4,1),border-color .15s,box-shadow .2s}
.pf-look:hover{transform:translateY(-2px);border-color:color-mix(in oklch,var(--ac) 55%,transparent);box-shadow:0 8px 20px -12px var(--ac)}
.pf-tl{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-rubik,inherit);font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-foreground)}
.pf-tv{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.85rem;color:var(--foreground)}
@media (prefers-reduced-motion:reduce){.pf-btn,.pf-pill,.pf-badge,.pf-look,.pf-iconbtn{transition:none}}
`;
