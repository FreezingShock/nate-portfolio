import { GATE } from "./config";

// The whole response for a locked visitor. The real page is never rendered or sent, so there is
// nothing in the DOM to unhide, and no client code decides whether to show it.
export const gateHtml = () => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="dark"><title>${GATE.title}</title>
<style>
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{display:grid;place-items:center;background:radial-gradient(circle at 50% 30%,#1b1740,#07060f 70%);color:#e9e7ff;font:16px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}
main{width:min(22rem,calc(100vw - 2rem));padding:1.6rem;border-radius:1.1rem;border:1px solid #ffffff22;background:#ffffff0d;backdrop-filter:blur(14px);box-shadow:0 20px 60px -20px #000;text-align:center}
h1{margin:.2rem 0 .3rem;font-size:1.25rem;letter-spacing:.04em}p{margin:0 0 1rem;font-size:.85rem;color:#b9b5e0}
input,button{width:100%;height:2.7rem;border-radius:.7rem;font:inherit;border:1px solid #ffffff2a}
input{padding:0 .9rem;background:#00000055;color:inherit;outline:none;text-align:center;letter-spacing:.15em}
input:focus{border-color:#8f86ff;box-shadow:0 0 0 3px #8f86ff33}
button{margin-top:.6rem;cursor:pointer;font-weight:700;color:#0b0820;background:linear-gradient(180deg,#b9b2ff,#8f86ff);border:0}
button:disabled{opacity:.6;cursor:default}#e{min-height:1.2rem;margin:.6rem 0 0;font-size:.8rem;color:#ff8a8a}
.k{font-size:2rem}main.s{animation:s .35s}@keyframes s{25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
</style></head><body><main id="m"><div class="k">🔒</div><h1>${GATE.title}</h1><p>${GATE.hint}</p>
<form id="f" autocomplete="off"><input id="p" type="password" placeholder="Password" autofocus required aria-label="Password" autocomplete="current-password"><button id="b">Unlock</button></form><p id="e" role="alert"></p></main>
<script>
var f=document.getElementById("f"),p=document.getElementById("p"),b=document.getElementById("b"),e=document.getElementById("e"),m=document.getElementById("m");
f.addEventListener("submit",function(ev){ev.preventDefault();b.disabled=true;e.textContent="";
fetch("${GATE.unlockPath}",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({password:p.value})})
.then(function(r){return r.json().then(function(j){return[r.ok,j]})}).then(function(x){
if(x[0]){location.reload();return}
e.textContent=x[1].error||"Wrong password";p.value="";p.focus();m.classList.remove("s");void m.offsetWidth;m.classList.add("s");b.disabled=false})
.catch(function(){e.textContent="Network error";b.disabled=false})});
</script></body></html>`;
