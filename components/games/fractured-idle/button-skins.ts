// Skin visuals added on top of BTN_CSS (button-face.tsx): the grand skins and a
// richer finish for the older ones. Everything is pure CSS and runs on the face
// (clipped to the shape) so any shape can wear any skin. The picker pauses these
// animations until a cell is hovered (.fi-still), and prefers-reduced-motion
// switches them all off at the bottom.

export const SKIN_CSS = `
/* ---- Older skins, finished ---- */
.fi-skin-island::before{content:"";position:absolute;inset:-30%;background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.2) 50%,transparent 58%);animation:fi-sweep 6s ease-in-out infinite;z-index:1}
.fi-skin-glass::before{content:"";position:absolute;inset:6% 8% 55% 8%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.65),transparent);filter:blur(1px);animation:fi-twinkle 3s ease-in-out infinite alternate;z-index:1}
.fi-skin-glass::after{background:linear-gradient(120deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%) 0 0/250% 100%;animation:fi-shine 3.6s ease-in-out infinite}
.fi-skin-frost::before{content:"";position:absolute;inset:0;background:radial-gradient(1.6px 1.6px at 22% 30%,#fff,transparent),radial-gradient(1.6px 1.6px at 70% 22%,#fff,transparent),radial-gradient(1.2px 1.2px at 48% 66%,#fff,transparent),radial-gradient(1.6px 1.6px at 82% 70%,#fff,transparent),radial-gradient(1.2px 1.2px at 16% 78%,#fff,transparent);animation:fi-twinkle 1.6s ease-in-out infinite alternate;z-index:1}
.fi-skin-toxic::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 100%,rgba(230,255,170,.9) 0 4%,transparent 5%),radial-gradient(circle at 55% 100%,rgba(230,255,170,.85) 0 6%,transparent 7%),radial-gradient(circle at 80% 100%,rgba(230,255,170,.8) 0 3.5%,transparent 4.5%);background-size:100% 160%;animation:fi-bubbles 3.2s linear infinite;z-index:1}
.fi-skin-ocean::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 40% 12% at 30% 30%,rgba(255,255,255,.5),transparent),radial-gradient(ellipse 36% 10% at 72% 56%,rgba(255,255,255,.4),transparent);animation:fi-drift 4s ease-in-out infinite alternate;z-index:1}
.fi-skin-obsidian::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(170,110,255,.8) 42%,transparent 44%),linear-gradient(60deg,transparent 58%,rgba(170,110,255,.7) 60%,transparent 62%),linear-gradient(170deg,transparent 28%,rgba(140,80,255,.6) 30%,transparent 32%);animation:fi-twinkle 2.2s ease-in-out infinite alternate;z-index:1}
.fi-skin-circuit::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,#b8ffd8 0 2px,transparent 3px) 0 0/32px 32px;animation:fi-pulses 1.4s linear infinite;z-index:1}
.fi-skin-neon::before{content:"";position:absolute;inset:8%;border-radius:inherit;border:2px solid var(--a);box-shadow:0 0 10px var(--a),inset 0 0 10px var(--a);animation:fi-twinkle 1.2s ease-in-out infinite alternate;z-index:1}
.fi-skin-sunset::before{content:"";position:absolute;left:50%;top:38%;width:46%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff6b0,#ffb347 55%,transparent 70%);transform:translate(-50%,-50%);animation:fi-sun 6s ease-in-out infinite alternate;z-index:1}
.fi-skin-void::before{content:"";position:absolute;inset:-20%;background:radial-gradient(ellipse 40% 30% at 30% 40%,rgba(150,70,255,.5),transparent),radial-gradient(ellipse 36% 26% at 70% 62%,rgba(70,100,255,.4),transparent);animation:fi-drift 8s ease-in-out infinite alternate;z-index:1}
.fi-skin-magma::before{content:"";position:absolute;inset:0;background:linear-gradient(140deg,transparent 30%,#ffb02a 31%,#ff4d00 33%,transparent 35%),linear-gradient(40deg,transparent 56%,#ffb02a 57%,#ff4d00 59%,transparent 61%);animation:fi-twinkle 1.1s ease-in-out infinite alternate;z-index:1}
.fi-skin-ember::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 25% 100%,#ffe27a 0 3%,transparent 4%),radial-gradient(circle at 60% 100%,#ffb02a 0 4%,transparent 5%),radial-gradient(circle at 82% 100%,#ffe27a 0 3%,transparent 4%);background-size:100% 150%;animation:fi-bubbles 2.4s linear infinite;z-index:1}
.fi-skin-plasma::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.7),transparent 30%);animation:fi-nova 2.4s ease-in-out infinite;z-index:1}
.fi-skin-prism::before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 0deg,rgba(255,255,255,.55),transparent 18%,rgba(255,255,255,.4) 36%,transparent 54%,rgba(255,255,255,.5) 72%,transparent 90%);animation:fi-spin 9s linear infinite;z-index:1}

/* ---- Grand skins ---- */
.fi-skin-creeper{background:linear-gradient(#0b1a0b,#0b1a0b) 24% 26%/17% 17% no-repeat,linear-gradient(#0b1a0b,#0b1a0b) 59% 26%/17% 17% no-repeat,linear-gradient(#0b1a0b,#0b1a0b) 41% 46%/18% 24% no-repeat,linear-gradient(#0b1a0b,#0b1a0b) 30% 60%/14% 24% no-repeat,linear-gradient(#0b1a0b,#0b1a0b) 56% 60%/14% 24% no-repeat,repeating-linear-gradient(90deg,rgba(0,0,0,.2) 0 12.5%,transparent 12.5% 25%),repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0 12.5%,transparent 12.5% 25%),linear-gradient(#58d65c,#2f8f33)}
.fi-skin-creeper::before{content:"";position:absolute;inset:0;background:#fff;opacity:0;animation:fi-hiss 4.5s ease-in-out infinite;z-index:1}
.fi-skin-slime{background:radial-gradient(circle at 30% 70%,rgba(255,255,255,.55) 0 6%,transparent 7%),radial-gradient(circle at 66% 40%,rgba(255,255,255,.45) 0 8%,transparent 9%),radial-gradient(circle at 55% 82%,rgba(255,255,255,.4) 0 4%,transparent 5%),linear-gradient(160deg,#9bff6a,#3fcf3a 55%,#1c8f2a);box-shadow:inset 0 -10px 18px rgba(0,60,0,.45),inset 0 8px 14px rgba(255,255,255,.4)}
.fi-skin-slime::before{content:"";position:absolute;inset:14% 18% 52% 18%;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,.7),transparent 70%);animation:fi-wobble 1.8s ease-in-out infinite alternate;z-index:1}
.fi-skin-honey{background:repeating-linear-gradient(60deg,rgba(120,60,0,.35) 0 2px,transparent 2px 22px),repeating-linear-gradient(-60deg,rgba(120,60,0,.35) 0 2px,transparent 2px 22px),repeating-linear-gradient(0deg,rgba(120,60,0,.3) 0 2px,transparent 2px 38px),linear-gradient(160deg,#ffd24a,#ffa41f 55%,#c76a00)}
.fi-skin-honey::before{content:"";position:absolute;left:12%;right:12%;top:-10%;height:46%;background:linear-gradient(180deg,rgba(255,240,170,.85),rgba(255,200,60,0));border-radius:0 0 60% 60%;animation:fi-drip 3.4s ease-in-out infinite alternate;z-index:1}
.fi-skin-redstone{background:linear-gradient(rgba(255,60,60,.35) 1px,transparent 1px) 0 0/18% 18%,linear-gradient(90deg,rgba(255,60,60,.35) 1px,transparent 1px) 0 0/18% 18%,radial-gradient(circle,#7a0a0a,#1a0303 80%)}
.fi-skin-redstone::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,80,80,.9),transparent) -100% 0/60% 100% no-repeat,linear-gradient(0deg,transparent,rgba(255,80,80,.7),transparent) 0 120%/100% 40% no-repeat;animation:fi-signal 1.6s linear infinite;z-index:1}
.fi-skin-deepslate{background:repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 3px,transparent 3px 11px),repeating-linear-gradient(45deg,rgba(0,0,0,.25) 0 5px,transparent 5px 15px),linear-gradient(160deg,#4a5062,#1b1d26 70%)}
.fi-skin-deepslate::before{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(120,160,255,.35) 50%,transparent 60%);background-size:250% 100%;animation:fi-shine 5s ease-in-out infinite;z-index:1}
.fi-skin-prismarine{background:repeating-linear-gradient(90deg,rgba(0,0,0,.14) 0 12.5%,transparent 12.5% 25%),repeating-linear-gradient(0deg,rgba(0,0,0,.1) 0 12.5%,transparent 12.5% 25%),radial-gradient(circle at 70% 30%,#c8fff0 0 8%,transparent 9%),linear-gradient(160deg,#58e0c0,#1f9a8f 60%,#0f5d6a)}
.fi-skin-prismarine::before{content:"";position:absolute;inset:0;background:repeating-radial-gradient(circle at 50% 120%,rgba(255,255,255,.3) 0 4%,transparent 4% 14%);background-size:200% 100%;animation:fi-waves 3.4s linear infinite;z-index:1}
.fi-skin-rune{background:radial-gradient(circle,#27414a,#0b1418 80%);box-shadow:inset 0 0 20px rgba(93,255,214,.25)}
.fi-skin-rune::before{content:"ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ";position:absolute;inset:0;display:grid;place-items:center;padding:8%;font-size:calc(9cqw);line-height:1.5;letter-spacing:.2em;text-align:center;color:#5dffd6;text-shadow:0 0 10px #5dffd6;word-spacing:.2em;opacity:.7;animation:fi-twinkle 2.2s ease-in-out infinite alternate;z-index:1}
.fi-skin-amethyst{background:conic-gradient(from 20deg at 50% 50%,#6a2fb5,#d9a8ff,#8a46d6,#f1d8ff,#5a1f9a,#c58bff,#6a2fb5)}
.fi-skin-amethyst::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.7) 50%,transparent 60%);background-size:250% 100%;animation:fi-shine 2.6s ease-in-out infinite;z-index:1}
.fi-skin-amethyst::after{background:radial-gradient(circle at 36% 28%,rgba(255,255,255,.7),transparent 40%)}
.fi-skin-bedrock{background:repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 9%,transparent 9% 18%),repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 9%,transparent 9% 18%),radial-gradient(circle at 25% 30%,#3a3a44 0 14%,transparent 15%),radial-gradient(circle at 70% 64%,#2a2a32 0 18%,transparent 19%),linear-gradient(#52525e,#1c1c22)}
.fi-skin-diamondore{background:radial-gradient(circle at 26% 30%,#7ffbff 0 7%,transparent 8%),radial-gradient(circle at 64% 24%,#4de6f2 0 6%,transparent 7%),radial-gradient(circle at 48% 62%,#9ffcff 0 9%,transparent 10%),radial-gradient(circle at 80% 74%,#4de6f2 0 6%,transparent 7%),radial-gradient(circle at 20% 78%,#7ffbff 0 5%,transparent 6%),repeating-linear-gradient(90deg,rgba(0,0,0,.12) 0 10%,transparent 10% 20%),linear-gradient(#8a8a94,#5c5c66)}
.fi-skin-diamondore::before{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(180,255,255,.7) 50%,transparent 60%);background-size:250% 100%;animation:fi-shine 3s ease-in-out infinite;z-index:1}
.fi-skin-abyss{background:radial-gradient(circle at 50% 60%,#0b4a58,#031219 80%)}
.fi-skin-abyss::before{content:"";position:absolute;inset:-35%;background:conic-gradient(from 0deg,transparent,rgba(31,224,192,.45) 12%,transparent 30%,rgba(31,120,224,.4) 52%,transparent 74%);animation:fi-spin 12s linear infinite reverse;z-index:1}
.fi-skin-abyss::after{background:radial-gradient(1.5px 1.5px at 22% 70%,#7dffe9,transparent),radial-gradient(1.5px 1.5px at 66% 30%,#7dffe9,transparent),radial-gradient(2px 2px at 80% 74%,#9dffe9,transparent),radial-gradient(1px 1px at 40% 40%,#7dffe9,transparent);animation:fi-twinkle 1.8s ease-in-out infinite alternate}
.fi-skin-ender{background:radial-gradient(1.5px 1.5px at 20% 30%,#e08cff,transparent),radial-gradient(1.5px 1.5px at 72% 22%,#e08cff,transparent),radial-gradient(1px 1px at 48% 74%,#e08cff,transparent),radial-gradient(1.5px 1.5px at 84% 70%,#e08cff,transparent),linear-gradient(#ff3dff,#ff3dff) 26% 44%/17% 8% no-repeat,linear-gradient(#ff3dff,#ff3dff) 57% 44%/17% 8% no-repeat,radial-gradient(circle,#2a0b3a,#07020c 80%)}
.fi-skin-ender::before{content:"";position:absolute;inset:-10%;background:radial-gradient(ellipse 30% 22% at 30% 70%,rgba(200,80,255,.35),transparent),radial-gradient(ellipse 26% 20% at 70% 30%,rgba(200,80,255,.3),transparent);animation:fi-drift 5s ease-in-out infinite alternate;z-index:1}
.fi-skin-storm{background:radial-gradient(ellipse 50% 30% at 28% 34%,#8d9ab8,transparent),radial-gradient(ellipse 46% 28% at 70% 50%,#7a88a8,transparent),radial-gradient(ellipse 52% 30% at 40% 74%,#6a7898,transparent),linear-gradient(#2c3550,#12182a)}
.fi-skin-storm::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,#fff,#bcd2ff 30%,transparent 70%);opacity:0;animation:fi-flash 3.6s linear infinite;z-index:1}
.fi-skin-storm::after{background:linear-gradient(105deg,transparent 46%,rgba(220,235,255,.9) 48%,transparent 50%) 0 0/100% 100%;opacity:0;animation:fi-flash 3.6s linear infinite;animation-delay:.05s}
.fi-skin-inferno{background:linear-gradient(0deg,#ff2a00,#ff8a00 38%,#2a0600 78%)}
.fi-skin-inferno::before{content:"";position:absolute;left:0;right:0;bottom:-6%;height:92%;background:linear-gradient(0deg,#fff3a0,#ffb300 34%,#ff4d00 62%,transparent);-webkit-mask:repeating-linear-gradient(90deg,#000 0 11%,transparent 11% 20%);mask:repeating-linear-gradient(90deg,#000 0 11%,transparent 11% 20%);transform-origin:50% 100%;animation:fi-flame .8s ease-in-out infinite alternate;z-index:1}
.fi-skin-inferno::after{background:linear-gradient(0deg,rgba(255,200,60,.55),transparent 60%);animation:fi-twinkle .7s ease-in-out infinite alternate}
.fi-skin-supernova{background:radial-gradient(circle,#fff 0 12%,#fff1a8 22%,#ffb02a 40%,#ff4d00 62%,#3a0a00 90%)}
.fi-skin-supernova::before{content:"";position:absolute;inset:0;background:repeating-radial-gradient(circle,rgba(255,255,255,.65) 0 3%,transparent 3% 14%);transform-origin:50% 50%;animation:fi-nova 2s ease-out infinite;z-index:1}
.fi-skin-supernova::after{background:conic-gradient(from 0deg,transparent,rgba(255,255,255,.5) 5%,transparent 10%,transparent 25%,rgba(255,255,255,.5) 30%,transparent 35%,transparent 50%,rgba(255,255,255,.5) 55%,transparent 60%,transparent 75%,rgba(255,255,255,.5) 80%,transparent 85%);animation:fi-spin 6s linear infinite}
.fi-skin-fractured{background:linear-gradient(112deg,transparent 38%,#9ff 39%,#fff 40%,transparent 42%),linear-gradient(58deg,transparent 52%,#9ff 53%,#fff 54%,transparent 56%),linear-gradient(170deg,transparent 22%,#7df0ff 23%,#fff 24%,transparent 26%),linear-gradient(28deg,transparent 66%,#9ff 67%,#fff 68%,transparent 70%),radial-gradient(circle at 50% 50%,#10222e,#02060a 80%)}
.fi-skin-fractured::before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 0deg,transparent,rgba(125,240,255,.35) 8%,transparent 18%,transparent 40%,rgba(255,111,224,.3) 48%,transparent 58%);animation:fi-spin 14s linear infinite;z-index:1}
.fi-skin-fractured::after{background:radial-gradient(circle at 50% 50%,rgba(125,240,255,.45),transparent 55%);animation:fi-twinkle 1.6s ease-in-out infinite alternate}
.fi-skin-celestial{background:radial-gradient(circle,#fffbe0 0 14%,#ffe27a 30%,#ffb02a 55%,#7a4300 95%)}
.fi-skin-celestial::before{content:"";position:absolute;inset:-60%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.7) 0 3deg,transparent 3deg 15deg);animation:fi-spin 24s linear infinite;z-index:1}
.fi-skin-celestial::after{background:radial-gradient(1.5px 1.5px at 26% 24%,#fff,transparent),radial-gradient(2px 2px at 74% 30%,#fff,transparent),radial-gradient(1.5px 1.5px at 60% 76%,#fff,transparent),radial-gradient(1.5px 1.5px at 18% 70%,#fff,transparent),radial-gradient(circle at 50% 38%,rgba(255,255,255,.6),transparent 55%);animation:fi-twinkle 1.4s ease-in-out infinite alternate}

/* Rims for the grand skins */
.fi-rim-celestial{background:conic-gradient(from 0deg,#fff6c0,#ffb02a,#fffbe0,#ffd23a,#fff6c0);animation:fi-hue 10s linear infinite}
.fi-rim-supernova{background:conic-gradient(from 0deg,#fff,#ffb02a,#ff4d00,#ffb02a,#fff);animation:fi-hue 8s linear infinite}
.fi-rim-fractured{background:conic-gradient(from 0deg,#7df0ff,#ff6fe0,#7df0ff,#fff,#7df0ff);animation:fi-hue 9s linear infinite}
.fi-rim-inferno{background:linear-gradient(0deg,#ff2a00,#ffb300)}
.fi-rim-amethyst{background:conic-gradient(from 0deg,#e0b8ff,#8a46d6,#e0b8ff)}
.fi-rim-storm{background:linear-gradient(180deg,#d8e4ff,#4a5a85)}

@keyframes fi-sweep{0%,100%{transform:translateX(-30%)}50%{transform:translateX(30%)}}
@keyframes fi-shine{0%{background-position:150% 0}100%{background-position:-50% 0}}
@keyframes fi-drift{from{transform:translate(-6%,-3%)}to{transform:translate(6%,4%)}}
@keyframes fi-bubbles{from{background-position:0 0}to{background-position:0 -100%}}
@keyframes fi-pulses{to{background-position:32px 32px}}
@keyframes fi-sun{from{transform:translate(-50%,-50%) scale(.9)}to{transform:translate(-50%,-58%) scale(1.1)}}
@keyframes fi-nova{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.5);opacity:0}}
@keyframes fi-hiss{0%,86%,100%{opacity:0}92%{opacity:.85}95%{opacity:.1}97%{opacity:.7}}
@keyframes fi-wobble{from{transform:scale(1,1)}to{transform:scale(1.08,.9)}}
@keyframes fi-drip{from{transform:translateY(-4%)}to{transform:translateY(10%)}}
@keyframes fi-signal{0%{background-position:-100% 0,0 120%}100%{background-position:200% 0,0 -40%}}
@keyframes fi-flash{0%,90%,100%{opacity:0}92%{opacity:.95}94%{opacity:.15}96%{opacity:.8}}
@keyframes fi-flame{from{transform:scaleY(.82) translateX(-1%)}to{transform:scaleY(1.12) translateX(1%)}}
@media (prefers-reduced-motion:reduce){.fi-skin-island::before,.fi-skin-glass::before,.fi-skin-glass::after,.fi-skin-frost::before,.fi-skin-toxic::before,.fi-skin-ocean::before,.fi-skin-obsidian::before,.fi-skin-circuit::before,.fi-skin-neon::before,.fi-skin-sunset::before,.fi-skin-void::before,.fi-skin-magma::before,.fi-skin-ember::before,.fi-skin-plasma::before,.fi-skin-prism::before,[class*="fi-skin-"]::before,[class*="fi-skin-"]::after,.fi-rim-celestial,.fi-rim-supernova,.fi-rim-fractured{animation:none!important}}
`;
