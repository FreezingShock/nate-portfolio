// Styles for the pet tooltip body (pet-tip.tsx). A separate string-only module so the shared tooltip can include it without importing any game data.
export const PET_TIP_CSS = `
.fi-pt{min-width:15.5rem;gap:.25rem}
.fi-pt .tl{display:inline-flex;align-items:center;gap:.35rem}
.fi-pt-sub{display:flex;flex-wrap:wrap;gap:.2rem .7rem;font-size:10.5px;color:#a59fb8}
.fi-pt-stars{display:flex;flex-direction:column;gap:0;font-size:12px;letter-spacing:.05em;line-height:1.2}
.fi-pt-stars em{font-style:normal;letter-spacing:0;font-size:10px;color:#8f89a3}
.fi-pt-sec{margin-top:.15rem;padding-top:.3rem;border-top:1px solid rgba(255,255,255,.12);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8f89a3}
.fi-pt-line{font-size:11px;color:#d8d3e6}
.fi-pt-main{display:flex;justify-content:space-between;align-items:baseline;gap:.8rem;font-size:11px;color:#d8d3e6}
.fi-pt-main b{font-family:var(--font-minecraft,inherit);font-size:13px;font-weight:400;color:var(--mc-green)}
.fi-pt-sub2{display:flex;justify-content:space-between;gap:.8rem;font-size:10px;color:#8f89a3}
.fi-pt-sub2 i{font-style:normal;color:#cfc8dd}
.fi-pt-perk{display:flex;align-items:flex-start;gap:.4rem;font-size:11px;color:#6f6a82}
.fi-pt-perk[data-got="true"]{color:#d8d3e6}
.fi-pt-mark{flex:none;width:.9rem;text-align:center;color:var(--mc-green)}
.fi-pt-perk[data-got="false"] .fi-pt-mark{color:#6f6a82;font-size:9px;line-height:1.5}
.fi-pt-pn{flex:1;display:flex;flex-direction:column;gap:0;line-height:1.25}
.fi-pt-pn b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:12px}
.fi-pt-perk[data-got="true"] .fi-pt-pn span{color:var(--mc-green)}
.fi-pt-perk em{font-style:normal;font-size:9.5px;color:#8f89a3;white-space:nowrap}
.fi-pt-xp{margin-top:.15rem;display:flex;flex-direction:column;gap:.15rem;border-top:1px solid rgba(255,255,255,.12);padding-top:.3rem}
.fi-pt-xp-t{display:flex;justify-content:space-between;font-size:10.5px;color:#a59fb8}
.fi-pt-xp-t b{font-weight:600;color:var(--mc-yellow)}
.fi-pt-bar{height:.3rem;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
.fi-pt-bar i{display:block;height:100%;border-radius:999px;box-shadow:0 0 8px currentColor}
.fi-pt-xp-n{font-size:9.5px;color:#8f89a3;text-align:right}
`;
