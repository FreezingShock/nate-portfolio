// Styles for the Level page (tab-level.tsx and the level-*.tsx views).
// Everything is scoped under .fi-lv and uses --sc (a saga's color) or --cc (a category's color) as the accent.

export const LEVEL_PAGE_CSS = `
.fi-lv{display:flex;flex-direction:column;gap:.7rem;--gold:#ffd23a}
.fi-lv *{box-sizing:border-box}
.fi-lv button{touch-action:manipulation}
.fi-lv-h{display:flex;align-items:center;gap:.5rem;margin:.2rem 0 -.1rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;color:var(--hc,var(--mc-aqua))}
.fi-lv-h::after{content:"";flex:1;height:1px;background:color-mix(in oklch,var(--hc,var(--mc-aqua)) 30%,transparent)}
.fi-lv-h small{font-family:var(--font-rubik,inherit);font-weight:500;font-size:.62rem;letter-spacing:.02em;text-transform:none;color:var(--muted-foreground);order:2}
.fi-lv-note{margin:0;font-family:var(--font-rubik,inherit);font-size:.7rem;line-height:1.45;color:var(--muted-foreground)}
.fi-lv-btn{display:inline-flex;align-items:center;justify-content:center;gap:.3rem;padding:.38rem .7rem;border-radius:.65rem;border:1px solid color-mix(in oklch,var(--sc,var(--gold)) 60%,transparent);background:color-mix(in oklch,var(--sc,var(--gold)) 14%,transparent);color:var(--sc,var(--gold));font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.7rem;white-space:nowrap;transition:transform .1s,background .15s}
.fi-lv-btn:hover:not(:disabled){background:color-mix(in oklch,var(--sc,var(--gold)) 26%,transparent)}
.fi-lv-btn:active:not(:disabled){transform:scale(.94)}
.fi-lv-btn:disabled{opacity:.4;cursor:not-allowed}
.fi-lv-btn.ghost{background:transparent;border-color:rgba(255,255,255,.18);color:var(--muted-foreground);font-weight:500}
.fi-lv-btn.ghost:hover:not(:disabled){color:#fff;border-color:color-mix(in oklch,var(--sc,var(--gold)) 55%,transparent)}
.fi-lv-btn.go{background:linear-gradient(180deg,color-mix(in oklch,var(--gold) 36%,transparent),color-mix(in oklch,var(--gold) 16%,transparent));border-color:var(--gold);color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.5);animation:fi-lv-glow 2s ease-in-out infinite}
@keyframes fi-lv-glow{0%,100%{box-shadow:0 0 0 0 rgba(255,210,58,0)}50%{box-shadow:0 0 18px -2px rgba(255,210,58,.55)}}
.fi-lv-bar{display:block;height:.42rem;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.fi-lv-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,color-mix(in oklch,var(--bc,var(--gold)) 55%,#000),var(--bc,var(--gold)));box-shadow:0 0 8px var(--bc,var(--gold));transition:width .5s ease}
.fi-lv-bar.thin{height:.28rem}

/* hero */
.fi-lv-hero{position:relative;overflow:hidden;border-radius:1.1rem;border:1px solid color-mix(in oklch,var(--lc) 50%,transparent);padding:.9rem 1rem;background:radial-gradient(circle at 10% -10%,color-mix(in oklch,var(--lc) 26%,transparent),transparent 55%),radial-gradient(circle at 100% 120%,color-mix(in oklch,var(--gold) 14%,transparent),transparent 55%),linear-gradient(135deg,rgba(255,210,58,.06),transparent 70%)}
.fi-lv-hero::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.035) 0 1px,transparent 1px 14px);pointer-events:none}
.fi-lv-hero>*{position:relative}
.fi-lv-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.8rem}
.fi-lv-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4rem;min-width:min(100%,19rem)}
.fi-lv-stat{display:flex;flex-direction:column;gap:.1rem;padding:.35rem .55rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.25)}
.fi-lv-stat b{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.95rem;line-height:1.1;color:var(--k,#fff)}
.fi-lv-stat span{font-family:var(--font-rubik,inherit);font-size:.56rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-lv-xp{margin-top:.7rem}
.fi-lv-xp-r{display:flex;justify-content:space-between;gap:.5rem;margin-bottom:.25rem;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-lv-xp-r b{color:#fff;font-weight:600}
.fi-lv-xp .fi-lv-bar{height:.6rem}
.fi-lv-hero-f{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.6rem}

/* sub navigation */
.fi-lv-nav{display:flex;gap:.3rem;padding:.25rem;border-radius:.95rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);overflow-x:auto;scrollbar-width:none}
.fi-lv-nav::-webkit-scrollbar{display:none}
.fi-lv-nav button{position:relative;flex:1 0 auto;display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.45rem .7rem;border-radius:.7rem;border:1px solid transparent;background:transparent;color:var(--muted-foreground);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.7rem;white-space:nowrap;transition:background .15s,color .15s}
.fi-lv-nav button:hover{color:#fff;background:rgba(255,255,255,.06)}
.fi-lv-nav button[data-on="true"]{color:var(--nc);border-color:color-mix(in oklch,var(--nc) 55%,transparent);background:color-mix(in oklch,var(--nc) 14%,transparent);box-shadow:0 0 14px -6px var(--nc)}
.fi-lv-nav i{font-style:normal;display:grid;place-items:center;min-width:1rem;height:1rem;padding:0 .25rem;border-radius:999px;background:var(--gold);color:#201800;font-family:var(--font-rubik,inherit);font-size:.6rem;font-weight:800;animation:fi-lv-glow 2s ease-in-out infinite}
@media (max-width:520px){.fi-lv-nav button span.t{display:none}.fi-lv-nav button[data-on="true"] span.t{display:inline}}

/* chips */
.fi-lv-chips{display:flex;flex-wrap:wrap;gap:.25rem}
.fi-lv-chip{display:inline-flex;align-items:center;gap:.25rem;padding:.12rem .45rem;border-radius:999px;border:1px solid color-mix(in oklch,var(--k,#fff) 38%,transparent);background:color-mix(in oklch,var(--k,#fff) 10%,transparent);font-family:var(--font-rubik,inherit);font-size:.62rem;font-weight:600;color:var(--k,#fff);white-space:nowrap}
.fi-lv-chip.buff{--k:var(--mc-green)}
.fi-lv-chip.dim{opacity:.55}

/* saga cards (journey grid and saga selector) */
.fi-lv-sagas{display:grid;grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr));gap:.5rem}
.fi-lv-saga{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:.3rem;min-height:6.4rem;padding:.65rem .7rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--sc) 42%,transparent);background-color:#120d18;text-align:left;color:#fff;transition:transform .15s,border-color .15s,box-shadow .15s}
.fi-lv-saga::before{content:"";position:absolute;inset:0;background-image:var(--bg);background-size:cover;opacity:.9}
.fi-lv-saga::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,6,14,.1),rgba(8,6,14,.72))}
.fi-lv-saga>*{position:relative;z-index:1}
.fi-lv-saga:hover{transform:translateY(-2px);border-color:var(--sc);box-shadow:0 8px 24px -10px var(--sc)}
.fi-lv-saga[data-on="true"]{border-color:var(--sc);box-shadow:0 0 0 1px var(--sc),0 0 26px -8px var(--sc)}
.fi-lv-saga-mark{position:absolute!important;right:.3rem;top:.05rem;z-index:0!important;font-size:3.6rem;line-height:1;color:var(--sc);opacity:.22;pointer-events:none;transition:transform .3s,opacity .3s}
.fi-lv-saga:hover .fi-lv-saga-mark{transform:scale(1.12) rotate(-6deg);opacity:.34}
.fi-lv-saga-n{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.9rem;line-height:1.1;color:var(--sc);text-shadow:0 2px 0 rgba(0,0,0,.6),0 0 12px color-mix(in oklch,var(--sc) 50%,transparent)}
.fi-lv-saga-s{font-family:var(--font-rubik,inherit);font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:#cfc8de}
.fi-lv-saga-f{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:.4rem;font-family:var(--font-rubik,inherit);font-size:.62rem;color:#e6e0f2}
.fi-lv-pips{display:flex;gap:.2rem}
.fi-lv-pips span{width:.85rem;height:.38rem;border-radius:999px;background:rgba(255,255,255,.18)}
.fi-lv-pips span[data-s="part"]{background:color-mix(in oklch,var(--sc) 45%,transparent)}
.fi-lv-pips span[data-s="ready"]{background:var(--gold);box-shadow:0 0 8px var(--gold)}
.fi-lv-pips span[data-s="done"]{background:var(--sc);box-shadow:0 0 6px var(--sc)}
.fi-lv-pips span.fin{width:.5rem}
.fi-lv-saga-b{position:absolute!important;top:.45rem;left:.5rem;display:grid;place-items:center;min-width:1.1rem;height:1.1rem;padding:0 .3rem;border-radius:999px;background:var(--gold);color:#201800;font-family:var(--font-rubik,inherit);font-size:.62rem;font-weight:800;animation:fi-lv-glow 2s ease-in-out infinite}

/* "continue" cards on the journey page */
.fi-lv-next{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.5rem}
.fi-lv-cont{display:flex;flex-direction:column;gap:.35rem;padding:.65rem .75rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--sc) 45%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--sc) 12%,transparent),rgba(0,0,0,.2) 75%)}
.fi-lv-cont[data-ready="true"]{border-color:var(--gold);box-shadow:0 0 22px -9px var(--gold)}
.fi-lv-cont-h{display:flex;align-items:center;gap:.4rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--sc)}
.fi-lv-cont-h em{margin-left:auto;font-style:normal;font-family:var(--font-rubik,inherit);font-size:.6rem;letter-spacing:0;color:var(--muted-foreground);text-transform:none}
.fi-lv-cont-t{font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.88rem;color:#fff;line-height:1.2}
.fi-lv-cont-p{display:flex;align-items:center;gap:.5rem;font-family:var(--font-rubik,inherit);font-size:.66rem;color:var(--muted-foreground)}
.fi-lv-cont-p .fi-lv-bar{flex:1}
.fi-lv-cont-f{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.1rem}

/* saga detail */
.fi-lv-ban{position:relative;overflow:hidden;border-radius:1.1rem;border:1px solid color-mix(in oklch,var(--sc) 55%,transparent);padding:1rem;background-color:#120d18}
.fi-lv-ban::before{content:"";position:absolute;inset:0;background-image:var(--bg);background-size:cover}
.fi-lv-ban::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,6,14,.74),rgba(8,6,14,.18) 70%,rgba(8,6,14,.3))}
.fi-lv-ban>*{position:relative;z-index:1}
.fi-lv-ban-mark{position:absolute!important;right:.8rem;top:50%;transform:translateY(-50%);z-index:1;font-size:6rem;line-height:1;color:var(--sc);opacity:.26;pointer-events:none;filter:drop-shadow(0 0 22px var(--sc))}
.fi-lv-ban h3{margin:0;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:1.25rem;line-height:1.1;color:var(--sc);text-shadow:0 2px 0 rgba(0,0,0,.65),0 0 18px color-mix(in oklch,var(--sc) 55%,transparent)}
.fi-lv-ban p{margin:.3rem 0 .6rem;max-width:34rem;font-family:var(--font-rubik,inherit);font-size:.72rem;line-height:1.5;color:#ddd6ea}
.fi-lv-ban-r{display:flex;align-items:center;gap:.6rem;max-width:26rem;font-family:var(--font-rubik,inherit);font-size:.66rem;color:#e8e2f4}
.fi-lv-ban-r .fi-lv-bar{flex:1;--bc:var(--sc)}
.fi-lv-step{display:flex;align-items:center;gap:0;padding:.2rem .1rem}
.fi-lv-step button{position:relative;flex:none;display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:50%;border:2px solid rgba(255,255,255,.2);background:#17111f;color:var(--muted-foreground);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.8rem;transition:transform .15s,border-color .15s}
.fi-lv-step button:hover{transform:scale(1.1);border-color:var(--sc)}
.fi-lv-step button[data-s="part"]{border-color:color-mix(in oklch,var(--sc) 55%,transparent);color:#fff}
.fi-lv-step button[data-s="ready"]{border-color:var(--gold);color:var(--gold);box-shadow:0 0 14px -2px var(--gold);animation:fi-lv-glow 2s ease-in-out infinite}
.fi-lv-step button[data-s="done"]{border-color:var(--sc);background:color-mix(in oklch,var(--sc) 30%,#17111f);color:#fff}
.fi-lv-step button[data-open="true"]{outline:2px solid var(--sc);outline-offset:2px}
.fi-lv-step hr{flex:1;min-width:.6rem;height:2px;margin:0;border:0;background:rgba(255,255,255,.14)}
.fi-lv-step hr[data-on="true"]{background:var(--sc);box-shadow:0 0 8px var(--sc)}
.fi-lv-chs{display:flex;flex-direction:column;gap:.5rem}
.fi-lv-ch{border-radius:1rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.2);overflow:hidden;transition:border-color .2s}
.fi-lv-ch[data-s="ready"]{border-color:var(--gold);box-shadow:0 0 24px -10px var(--gold)}
.fi-lv-ch[data-s="done"]{border-color:color-mix(in oklch,var(--sc) 50%,transparent)}
.fi-lv-ch[data-s="now"]{border-color:color-mix(in oklch,var(--sc) 60%,transparent)}
.fi-lv-ch-h{display:flex;align-items:center;gap:.65rem;width:100%;padding:.6rem .75rem;background:transparent;border:0;color:#fff;text-align:left}
.fi-lv-ch-h:hover{background:rgba(255,255,255,.04)}
.fi-lv-ch-n{flex:none;display:grid;place-items:center;width:2rem;height:2rem;border-radius:.6rem;border:1px solid color-mix(in oklch,var(--sc) 50%,transparent);background:color-mix(in oklch,var(--sc) 14%,transparent);color:var(--sc);font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.95rem}
.fi-lv-ch[data-s="done"] .fi-lv-ch-n{background:var(--sc);color:#120d18}
.fi-lv-ch[data-s="ready"] .fi-lv-ch-n{border-color:var(--gold);color:var(--gold);background:color-mix(in oklch,var(--gold) 16%,transparent)}
.fi-lv-ch-t{min-width:0;flex:1}
.fi-lv-ch-t b{display:block;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.85rem;line-height:1.15}
.fi-lv-ch-t span{display:block;font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-lv-ch-s{flex:none;font-family:var(--font-rubik,inherit);font-size:.62rem;font-weight:700;color:var(--muted-foreground);text-align:right}
.fi-lv-ch[data-s="done"] .fi-lv-ch-s{color:var(--sc)}
.fi-lv-ch[data-s="ready"] .fi-lv-ch-s{color:var(--gold)}
.fi-lv-ch-b{display:flex;flex-direction:column;gap:.55rem;padding:.1rem .75rem .75rem;animation:fi-lv-in .22s ease-out}
@keyframes fi-lv-in{from{opacity:0;transform:translateY(-4px)}}
.fi-lv-ch-p{margin:0;font-family:var(--font-rubik,inherit);font-size:.68rem;font-style:italic;color:var(--muted-foreground)}
.fi-lv-tasks{display:flex;flex-direction:column;gap:.3rem}
.fi-lv-task{display:grid;grid-template-columns:1.3rem minmax(0,1fr) auto;align-items:center;gap:.5rem;padding:.4rem .5rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03)}
.fi-lv-task[data-d="true"]{border-color:color-mix(in oklch,var(--mc-green) 35%,transparent);background:color-mix(in oklch,var(--mc-green) 7%,transparent)}
.fi-lv-task-m{display:grid;place-items:center;width:1.3rem;height:1.3rem;border-radius:50%;border:1.5px solid rgba(255,255,255,.25);font-size:.7rem;line-height:1;color:transparent}
.fi-lv-task[data-d="true"] .fi-lv-task-m{background:var(--mc-green);border-color:var(--mc-green);color:#07200f}
.fi-lv-task-t{min-width:0;font-family:var(--font-rubik,inherit);font-size:.72rem;font-weight:500;line-height:1.3}
.fi-lv-task[data-d="true"] .fi-lv-task-t{color:var(--muted-foreground);text-decoration:line-through;text-decoration-color:rgba(255,255,255,.25)}
.fi-lv-task-t .fi-lv-bar{margin-top:.25rem;--bc:var(--sc)}
.fi-lv-task-r{display:flex;align-items:center;gap:.4rem;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground);white-space:nowrap}
.fi-lv-task-go{padding:.15rem .5rem;border-radius:.5rem;border:1px solid color-mix(in oklch,var(--sc) 50%,transparent);background:transparent;color:var(--sc);font-family:var(--font-rubik,inherit);font-size:.6rem;font-weight:700}
.fi-lv-task-go:hover{background:color-mix(in oklch,var(--sc) 18%,transparent)}
.fi-lv-pay{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem .6rem;border-radius:.8rem;border:1px dashed color-mix(in oklch,var(--sc) 40%,transparent);background:rgba(0,0,0,.18)}
.fi-lv-pay-l{display:flex;flex-direction:column;gap:.25rem;min-width:0}
.fi-lv-pay-l small{font-family:var(--font-minecraft,inherit);font-size:.55rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-lv-fin{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;padding:.75rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--sc) 35%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--sc) 14%,transparent),transparent 70%)}
.fi-lv-fin[data-s="locked"]{opacity:.65;border-style:dashed}
.fi-lv-fin[data-s="ready"]{border-color:var(--gold);box-shadow:0 0 24px -10px var(--gold)}
.fi-lv-fin-i{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--sc) 55%,transparent);background:color-mix(in oklch,var(--sc) 16%,transparent);font-size:1.5rem;color:var(--sc)}
.fi-lv-fin-t{flex:1;min-width:12rem}
.fi-lv-fin-t b{display:block;font-family:var(--font-minecraft,inherit);font-size:.92rem;color:var(--sc)}

/* buff ledger */
.fi-lv-led{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.5rem}
.fi-lv-led>div{display:flex;flex-direction:column;gap:.35rem;padding:.6rem .7rem;border-radius:1rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2)}
.fi-lv-led b{font-family:var(--font-minecraft,inherit);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--k)}

/* timeline */
.fi-lv-tl-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.fi-lv-seg{display:inline-flex;padding:.15rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25)}
.fi-lv-seg button{padding:.25rem .6rem;border-radius:.5rem;border:0;background:transparent;color:var(--muted-foreground);font-family:var(--font-rubik,inherit);font-size:.66rem;font-weight:600}
.fi-lv-seg button[data-on="true"]{background:color-mix(in oklch,var(--gold) 20%,transparent);color:var(--gold)}
.fi-lv-tl{position:relative;max-height:min(34rem,68dvh);overflow-y:auto;padding:.4rem .2rem .8rem .1rem;border-radius:1rem;border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.18);scroll-behavior:smooth}
.fi-lv-tl-in{position:relative;padding:.2rem .6rem .2rem .2rem}
.fi-lv-tl-in::before{content:"";position:absolute;left:3.55rem;top:0;bottom:0;width:3px;border-radius:2px;background:linear-gradient(180deg,var(--gold) var(--pr,0%),rgba(255,255,255,.12) var(--pr,0%))}
.fi-lv-band{position:sticky;top:-.4rem;z-index:3;display:flex;align-items:center;gap:.5rem;margin:.5rem 0 .3rem;padding:.25rem .6rem .25rem 3.9rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;color:var(--bk);background:linear-gradient(90deg,rgba(14,10,22,0),#0e0a16 12%);box-shadow:0 6px 8px -4px #0e0a16}
.fi-lv-band::after{content:"";flex:1;height:1px;background:color-mix(in oklch,var(--bk) 35%,transparent)}
.fi-lv-row{position:relative;display:grid;grid-template-columns:3rem 1.4rem minmax(0,1fr);align-items:start;gap:.3rem;padding:.18rem 0}
.fi-lv-row-l{padding-top:.55rem;text-align:right;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.74rem;color:var(--lk)}
.fi-lv-row[data-p="false"] .fi-lv-row-l{opacity:.55}
.fi-lv-dot{position:relative;z-index:1;margin:.62rem auto 0;width:.8rem;height:.8rem;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:#120d18}
.fi-lv-row[data-p="true"] .fi-lv-dot{border-color:var(--gold);background:var(--gold);box-shadow:0 0 8px var(--gold)}
.fi-lv-row[data-m="true"] .fi-lv-dot{width:1.05rem;height:1.05rem;margin-top:.5rem;border-radius:.3rem;transform:rotate(45deg)}
.fi-lv-row[data-now="true"] .fi-lv-dot{border-color:#fff;background:#fff;animation:fi-lv-pulse 1.6s ease-in-out infinite}
@keyframes fi-lv-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.5)}50%{box-shadow:0 0 0 7px rgba(255,255,255,0)}}
.fi-lv-card{display:flex;flex-direction:column;gap:.3rem;padding:.45rem .65rem;border-radius:.85rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);transition:border-color .2s}
.fi-lv-row[data-m="true"] .fi-lv-card{border-color:color-mix(in oklch,var(--lk) 40%,transparent);background:linear-gradient(120deg,color-mix(in oklch,var(--lk) 10%,transparent),rgba(255,255,255,.02) 80%)}
.fi-lv-row[data-p="false"] .fi-lv-card{opacity:.82}
.fi-lv-row[data-p="true"] .fi-lv-card{border-color:color-mix(in oklch,var(--gold) 28%,transparent)}
.fi-lv-row[data-next="true"] .fi-lv-card{border-color:var(--gold);box-shadow:0 0 22px -10px var(--gold);opacity:1}
.fi-lv-row[data-now="true"] .fi-lv-card{border-color:#fff;background:linear-gradient(120deg,rgba(255,255,255,.14),rgba(255,255,255,.04));opacity:1}
.fi-lv-card-t{display:flex;align-items:center;gap:.4rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.78rem;line-height:1.2;color:#fff}
.fi-lv-card-t em{margin-left:auto;font-style:normal;font-family:var(--font-rubik,inherit);font-size:.58rem;font-weight:800;letter-spacing:.1em;color:var(--gold)}
.fi-lv-card-t .ok{color:var(--mc-green);font-family:var(--font-rubik,inherit);font-size:.7rem}
.fi-lv-card-s{margin:0;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-lv-gap{margin:.05rem 0 .05rem 4.7rem;font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground);opacity:.75}
.fi-lv-end{margin:.5rem 0 0 4.7rem;padding:.6rem .75rem;border-radius:.9rem;border:1px dashed color-mix(in oklch,var(--gold) 40%,transparent);font-family:var(--font-rubik,inherit);font-size:.68rem;line-height:1.45;color:var(--muted-foreground)}
.fi-lv-end b{color:var(--gold);font-family:var(--font-minecraft,inherit)}

/* sources */
.fi-lv-share{display:flex;height:.95rem;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08)}
.fi-lv-share button{flex:var(--w) 1 0;min-width:2px;border:0;padding:0;background:var(--cc);opacity:.85;transition:opacity .15s,filter .15s}
.fi-lv-share button:hover,.fi-lv-share button[data-on="true"]{opacity:1;filter:brightness(1.25)}
.fi-lv-share-l{display:flex;flex-wrap:wrap;gap:.3rem .7rem;margin-top:.4rem}
.fi-lv-share-l button{display:inline-flex;align-items:center;gap:.3rem;border:0;background:transparent;padding:0;font-family:var(--font-rubik,inherit);font-size:.62rem;color:var(--muted-foreground)}
.fi-lv-share-l button i{width:.55rem;height:.55rem;border-radius:2px;background:var(--cc)}
.fi-lv-share-l button:hover,.fi-lv-share-l button[data-on="true"]{color:#fff}
.fi-lv-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.6rem,1fr));gap:.4rem}
.fi-lv-cat{display:flex;flex-direction:column;gap:.3rem;padding:.5rem .6rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.2);text-align:left;color:#fff;transition:border-color .15s,background .15s,transform .15s}
.fi-lv-cat:hover{transform:translateY(-1px);border-color:color-mix(in oklch,var(--cc) 55%,transparent)}
.fi-lv-cat[data-on="true"]{border-color:var(--cc);background:linear-gradient(135deg,color-mix(in oklch,var(--cc) 16%,transparent),rgba(0,0,0,.2) 80%);box-shadow:0 0 18px -8px var(--cc)}
.fi-lv-cat-h{display:flex;align-items:center;gap:.4rem;font-family:var(--font-minecraft,inherit);font-weight:700;font-size:.72rem;color:var(--cc)}
.fi-lv-cat-h span:first-child{font-size:1rem}
.fi-lv-cat-n{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);display:flex;justify-content:space-between;gap:.3rem}
.fi-lv-cat .fi-lv-bar{--bc:var(--cc)}
.fi-lv-panel{border-radius:1rem;border:1px solid color-mix(in oklch,var(--cc) 40%,transparent);background:linear-gradient(160deg,color-mix(in oklch,var(--cc) 7%,transparent),rgba(0,0,0,.18) 60%);padding:.7rem .75rem;display:flex;flex-direction:column;gap:.5rem}
.fi-lv-panel-h{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}
.fi-lv-panel-h b{font-family:var(--font-minecraft,inherit);font-size:.95rem;color:var(--cc)}
.fi-lv-panel-h small{font-family:var(--font-rubik,inherit);font-size:.64rem;color:var(--muted-foreground)}
.fi-lv-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.fi-lv-search{flex:1;min-width:8rem;padding:.35rem .6rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.3);color:#fff;font-family:var(--font-rubik,inherit);font-size:.7rem;outline:none}
.fi-lv-search:focus{border-color:var(--cc)}
.fi-lv-list{display:flex;flex-direction:column;gap:.2rem;max-height:23rem;overflow-y:auto;padding-right:.15rem}
.fi-lv-src{display:grid;grid-template-columns:minmax(0,1fr) 5.2rem 4.4rem;align-items:center;gap:.5rem;padding:.3rem .45rem;border-radius:.6rem;font-family:var(--font-rubik,inherit);font-size:.68rem}
.fi-lv-src:hover{background:rgba(255,255,255,.05)}
.fi-lv-src span.l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fi-lv-src[data-d="true"] span.l{color:var(--muted-foreground)}
.fi-lv-src .fi-lv-bar{--bc:var(--cc)}
.fi-lv-src span.r{text-align:right;color:var(--muted-foreground);white-space:nowrap}
.fi-lv-src span.r b{color:var(--mc-green);font-weight:700}
.fi-lv-quick{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.35rem}
.fi-lv-qk{display:grid;grid-template-columns:1.4rem minmax(0,1fr) auto;align-items:center;gap:.5rem;padding:.4rem .55rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--cc) 35%,transparent);background:color-mix(in oklch,var(--cc) 7%,transparent);text-align:left;color:#fff;font-family:var(--font-rubik,inherit);font-size:.68rem}
.fi-lv-qk:hover{border-color:var(--cc)}
.fi-lv-qk>span:first-child{color:var(--cc);font-size:1rem;text-align:center}
.fi-lv-qk b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.fi-lv-qk .fi-lv-bar{margin-top:.2rem;--bc:var(--cc)}
.fi-lv-qk em{font-style:normal;font-weight:800;color:var(--mc-green)}
.fi-lv-feed{display:flex;flex-direction:column;gap:.15rem;font-family:var(--font-rubik,inherit);font-size:.66rem}
.fi-lv-feed div{display:flex;justify-content:space-between;gap:.5rem}
.fi-lv-feed span:first-child{color:var(--muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fi-lv-feed span:last-child{color:var(--mc-green);font-weight:700}

/* badges */
.fi-lv-prev{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.6rem;padding:.8rem 1rem;border-radius:1rem;border:1px solid color-mix(in oklch,var(--mc-light-purple) 45%,transparent);background:linear-gradient(135deg,color-mix(in oklch,var(--mc-light-purple) 12%,transparent),transparent 70%)}
.fi-lv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(5.4rem,1fr));gap:.35rem}
.fi-lv-sym{position:relative;display:flex;flex-direction:column;align-items:center;gap:.15rem;padding:.5rem .3rem .4rem;border-radius:.85rem;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.2);color:#fff;transition:transform .12s,border-color .15s,background .15s}
.fi-lv-sym:hover:not(:disabled){transform:translateY(-2px);border-color:color-mix(in oklch,var(--k) 55%,transparent)}
.fi-lv-sym[data-on="true"]{border-color:var(--k);background:color-mix(in oklch,var(--k) 16%,transparent);box-shadow:0 0 16px -6px var(--k)}
.fi-lv-sym:disabled{opacity:.5;cursor:not-allowed}
.fi-lv-sym-i{font-family:var(--font-minecraft,inherit);font-size:1.5rem;line-height:1.1;color:var(--k);text-shadow:0 0 12px color-mix(in oklch,var(--k) 55%,transparent)}
.fi-lv-sym-n{font-family:var(--font-rubik,inherit);font-size:.62rem;font-weight:600}
.fi-lv-sym-r{font-family:var(--font-rubik,inherit);font-size:.54rem;color:var(--muted-foreground);text-align:center;line-height:1.2}
.fi-lv-pfx{display:flex;flex-wrap:wrap;gap:.35rem}
.fi-lv-pf{display:flex;flex-direction:column;align-items:flex-start;gap:.05rem;padding:.35rem .6rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.2);font-family:var(--font-rubik,inherit);font-size:.72rem;font-weight:600;transition:transform .12s,background .15s}
.fi-lv-pf:hover:not(:disabled){transform:translateY(-1px);background:rgba(255,255,255,.07)}
.fi-lv-pf[data-on="true"]{background:color-mix(in oklch,var(--k) 16%,transparent);border-color:var(--k)}
.fi-lv-pf:disabled{opacity:.5;cursor:not-allowed}
.fi-lv-pf small{font-size:.54rem;font-weight:400;color:var(--muted-foreground)}

@media (prefers-reduced-motion:reduce){.fi-lv *{animation:none!important;transition:none!important}.fi-lv-tl{scroll-behavior:auto}}
`;
