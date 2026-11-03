
const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;

const HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Yo Waitwhat</title>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script>
<style>
:root{--brown:#5a3a22;--dark:#2b1a0f;--gold:#d9b26f;--cream:#fbf5ea}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;margin:0}
body{background:radial-gradient(120% 90% at 50% 0%,#6b4424,#3a2414 60%,#24150b);color:#fbf5ea;font-family:Georgia,serif;overflow:hidden;background-size:cover;background-position:center;background-attachment:fixed}
.screen{position:fixed;inset:0;display:flex;flex-direction:column;padding:12px 16px 14px;gap:10px;overflow-y:auto}
h1{margin:6px 0 0;text-align:center;font-size:clamp(34px,9vw,52px);font-weight:700;letter-spacing:.06em;color:var(--gold)}
.tag{text-align:center;margin:0;font-size:16px;color:#e8d6b8;font-style:italic}
.credit{text-align:center;font-size:12px;color:#c9b08a;margin-top:auto}
.glass{background:linear-gradient(#f6eee0,#ebdcc3);border:1px solid #c9a878;border-radius:14px;padding:14px;color:#3a2414;box-shadow:0 6px 16px rgba(0,0,0,.35)}
.lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6b4424;font-weight:700;margin:0 0 8px}
input[type=text]{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #b38f5c;background:#fffdf7;color:#3a2414;font-size:16px}
.btn{border:1px solid #c9a878;border-radius:10px;padding:12px 16px;font-size:15px;color:#fbf5ea;background:linear-gradient(#8b5a2b,#5a3a22);cursor:pointer;text-align:center}
.btn.solid{background:linear-gradient(#e0bd7e,#b8893f);color:#2b1a0f;font-weight:700}.btn.mg{background:linear-gradient(#a2412b,#7a2c1b)}.btn.blue{background:linear-gradient(#5a6b5a,#3f4d3f)}.btn.sm{padding:8px 12px;font-size:13px;border-radius:8px}
#profilePic{width:88px;height:88px;border-radius:50%;border:3px solid var(--gold);object-fit:cover;display:none;margin:0 auto 8px}
#chatWrap{position:relative;width:100%;max-width:560px;margin:0 auto}
#chatBubbles{position:absolute;bottom:100px;left:0;right:0;display:flex;flex-direction:column;gap:6px;pointer-events:none;align-items:center}
.bubble{background:var(--cream);color:#2b1a0f;border:1px solid #c9a878;padding:8px 12px;border-radius:16px;font-size:13px;max-width:80%;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.emoji{font-size:22px;cursor:pointer;user-select:none;padding:4px 6px;background:#fffdf7;border:1px solid #c9a878;border-radius:8px;display:inline-block;margin:2px}
.emoji:active{transform:scale(0.9)}
#emojiBar{display:flex;gap:6px;overflow-x:auto;padding:6px;background:rgba(246,238,224,.95);border-radius:10px 10px 0 0;border:1px solid #c9a878;border-bottom:none;scrollbar-width:none}
#emojiBar::-webkit-scrollbar{display:none}
.adBox{width:100%;max-width:560px;margin:8px auto;background:rgba(0,0,0,.25);border-radius:10px;min-height:60px;display:flex;align-items:center;justify-content:center}
#adInterstitial{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;align-items:center;justify-content:center;flex-direction:column;padding:0}
#adTopBar{width:100%;background:#1a1a1a;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;position:absolute;top:0;left:0}
#adContentBox{background:#f6eee0;border-radius:14px;padding:14px;max-width:420px;width:92%;text-align:center;color:#3a2414;margin-top:60px}
</style></head><body>
<div class="screen" id="menuScreen">
<h1>YO WAITWHAT</h1><p class="tag">The Naija Whot Game</p>

<div class="glass" style="text-align:center">
<img id="profilePic" src=""><div id="profileName" style="font-weight:700;font-size:18px;margin-bottom:6px">Guest Player</div>
<input type="file" id="profilePhotoInput" accept="image/*" hidden>
<button class="btn sm blue" onclick="document.getElementById('profilePhotoInput').click()">Add Profile Photo From Gallery</button>
<input type="text" id="nameInput" placeholder="Enter your name" style="margin-top:10px">
</div>

<div class="glass"><div class="lbl">Wallpaper From Your Gallery</div><div style="display:flex;gap:6px;flex-wrap:wrap">
<input type="file" id="bgInput" accept="image/*" hidden>
<button class="btn sm" onclick="document.getElementById('bgInput').click()">Choose Wallpaper</button>
<button class="btn sm mg" onclick="removeWallpaper()">Remove</button></div></div>

<div class="glass"><div class="lbl">Warri Voice - 5 Shouts + Permanent Sound</div>
<div style="display:flex;gap:6px;flex-wrap:wrap">
<input type="file" id="customSoundInput" accept="audio/*" hidden>
<button class="btn sm" onclick="document.getElementById('customSoundInput').click()">Add Audio From File</button>
<button class="btn sm blue" onclick="testAllSounds()">Test All Warri Voices</button>
<button class="btn sm" id="muteBtn" onclick="toggleMute()">🔊 Voice On</button>
</div><div id="soundList" style="font-size:11px;margin-top:8px;color:#6b4424">Permanent built-in: Pick Two joh! / Pick Three / Do di calms jor! / Make you na pick di card jor! / Na me be captain Warri!</div></div>

<div style="display:flex;flex-direction:column;gap:8px;max-width:560px;width:100%;margin:0 auto">
<button class="btn solid" id="playBtn">PLAY ONLINE</button>
<button class="btn" id="settingsBtn">⚙ SETTINGS</button>
</div>

<div class="adBox"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>
<div class="credit">Yo Waitwhat © 2026 - Mature Edition - Ads every 2 multiplayer games + Emojis</div>
</div>

<div class="screen" id="gameScreen" style="display:none">
<div style="display:flex;justify-content:space-between;align-items:center;max-width:560px;width:100%;margin:0 auto"><div id="gameInfo" style="color:#e8d6b8;font-size:13px">Searching...</div><button class="btn sm" onclick="location.reload()">Exit</button></div>
<div id="playersArea" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;max-width:560px;margin:0 auto"></div>

<div id="chatWrap">
<div id="chatBubbles"></div>
<div id="emojiBar">
<span class="emoji" onclick="sendEmoji('😂')">😂</span>
<span class="emoji" onclick="sendEmoji('😍')">😍</span>
<span class="emoji" onclick="sendEmoji('🔥')">🔥</span>
<span class="emoji" onclick="sendEmoji('😭')">😭</span>
<span class="emoji" onclick="sendEmoji('😎')">😎</span>
<span class="emoji" onclick="sendEmoji('🤣')">🤣</span>
<span class="emoji" onclick="sendEmoji('😒')">😒</span>
<span class="emoji" onclick="sendEmoji('🙏')">🙏</span>
<span class="emoji" onclick="sendEmoji('💀')">💀</span>
<span class="emoji" onclick="sendEmoji('👏')">👏</span>
<span class="emoji" onclick="sendEmoji('😤')">😤</span>
<span class="emoji" onclick="sendEmoji('🥺')">🥺</span>
<span class="emoji" onclick="sendEmoji('🃏')">🃏</span>
<span class="emoji" onclick="sendEmoji('Pick Two joh! 😂')">💥</span>
</div>
<div style="display:flex;gap:6px;background:linear-gradient(#f6eee0,#ebdcc3);border:1px solid #c9a878;border-radius:0 0 10px 10px;padding:6px;">
<input id="chatInput" type="text" placeholder="Type message..." maxlength="120" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid #b38f5c;background:#fffdf7;color:#3a2414;font-size:14px;">
<button id="chatSend" class="btn solid sm">SEND</button></div>
</div>

<div id="tableArea" class="glass" style="max-width:560px;width:100%;margin:0 auto;min-height:120px;display:flex;align-items:center;justify-content:center">Table</div>
<div id="handArea" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:560px;margin:0 auto"></div>
</div>

<div id="adInterstitial">
<div id="adTopBar"><span>Advertisement - Game continues in <span id="adTimer">5</span>s</span><button id="closeAdBtn" style="display:none;background:#fff;color:#000;border:none;border-radius:6px;padding:6px 12px;font-weight:700" onclick="closeInterstitial()">✕ CANCEL / CLOSE</button></div>
<div id="adContentBox"><div style="font-weight:700;margin-bottom:8px">Thanks for playing! Quick ad supports the game</div>
<div id="adSlot"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXX" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins></div>
<div style="font-size:11px;color:#6b4424;margin-top:8px">Ad shows every 2 multiplayer games</div></div>
</div>

<script>
let ws, myName=localStorage.getItem('playerName')||'Player';
let customSounds=JSON.parse(localStorage.getItem('customSounds')||'{}');
let audioCtx, unlocked=false, muted=false;
let gameCount=parseInt(localStorage.getItem('multiGameCount')||'0');
let lastChatTime=0;
function getAudioCtx(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); return audioCtx; }
function unlockAudio(){ if(unlocked) return; unlocked=true; try{ getAudioCtx().resume(); if('speechSynthesis' in window){ speechSynthesis.getVoices(); } }catch(e){} document.removeEventListener('click',unlockAudio); document.removeEventListener('touchstart',unlockAudio); }
document.addEventListener('click',unlockAudio); document.addEventListener('touchstart',unlockAudio);

let pd=localStorage.getItem('profilePic'); if(pd){ const img=document.getElementById('profilePic'); img.src=pd; img.style.display='block'; }
document.getElementById('profilePhotoInput').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=ev=>{ localStorage.setItem('profilePic',ev.target.result); document.getElementById('profilePic').src=ev.target.result; document.getElementById('profilePic').style.display='block'; };
  r.readAsDataURL(f);
});

let wd=localStorage.getItem('gameWallpaper'); if(wd) document.body.style.background='url('+wd+') center/cover no-repeat fixed, radial-gradient(120% 90% at 50% 0%,#6b4424,#3a2414 60%,#24150b)';
document.getElementById('bgInput').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=ev=>{ localStorage.setItem('gameWallpaper',ev.target.result); document.body.style.background='url('+ev.target.result+') center/cover no-repeat fixed, radial-gradient(120% 90% at 50% 0%,#6b4424,#3a2414 60%,#24150b)'; };
  r.readAsDataURL(f);
});
function removeWallpaper(){ localStorage.removeItem('gameWallpaper'); document.body.style.background='radial-gradient(120% 90% at 50% 0%,#6b4424,#3a2414 60%,#24150b)'; }

document.getElementById('customSoundInput').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=ev=>{ customSounds[f.name]=ev.target.result; localStorage.setItem('customSounds',JSON.stringify(customSounds)); document.getElementById('soundList').innerHTML+='<div>✓ '+f.name+' added</div>'; };
  r.readAsDataURL(f);
});

const LINES={'pick-two':"Pick Two joh! You dey whine!",'pick-three':"Collect Three jor! Oya collect am!",'holdon':"Do di calms jor! Calm down!",'general':"Make you na pick di card jor! Na you go pick am!",'captain':"Na me be captain Warri! Na me dey run am!",'pickTwo':"Pick Two joh! You dey whine!",'pickThree':"Collect Three jor! Oya collect am!"};
function toggleMute(){ muted=!muted; document.getElementById('muteBtn').textContent=muted?'🔇 Voice Off':'🔊 Voice On'; }
function playPermanent(type){
  try{
    const ctx=getAudioCtx(); const times=type.includes('three')?[0,0.2,0.4]:type.includes('two')?[0,0.25]:[0];
    times.forEach(d=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.type='square'; o.frequency.value=type.includes('three')?880:type.includes('two')?720:600; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.6,ctx.currentTime+d); g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+d+0.22); o.start(ctx.currentTime+d); o.stop(ctx.currentTime+d+0.24); });
    if('speechSynthesis' in window && LINES[type]){ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(LINES[type]); u.rate=1.05; u.pitch=0.85; u.volume=1; speechSynthesis.speak(u); }
  }catch(e){}
}
function playWhotSound(type){ if(!unlocked) unlockAudio(); if(muted) return; const custom=customSounds[type]||customSounds[type+'.mp3']; if(custom){ new Audio(custom).play().catch(()=>playPermanent(type)); return; } const a=new Audio('/sounds/whot/'+type+'.mp3'); a.play().catch(()=>playPermanent(type)); }
function playSound(t){ const m={pickTwo:'pick-two',pickThree:'pick-three',cardDrop:'general'}; playWhotSound(m[t]||t); }
function testAllSounds(){ playWhotSound('pick-two'); setTimeout(()=>playWhotSound('pick-three'),1300); setTimeout(()=>playWhotSound('holdon'),2600); setTimeout(()=>playWhotSound('general'),3900); setTimeout(()=>playWhotSound('captain'),5200); }

function showBubble(text,fromName){
  const now=Date.now(); if(now-lastChatTime<1000 && fromName!=='You') return; if(fromName!=='You') lastChatTime=now;
  const wrap=document.getElementById('chatBubbles'); const b=document.createElement('div'); b.className='bubble'; b.textContent=(fromName?fromName+': ':'')+text; wrap.appendChild(b);
  setTimeout(()=>{ b.style.opacity='0'; setTimeout(()=>b.remove(),300); },6000);
}
function sendChat(){ const inp=document.getElementById('chatInput'); if(!inp.value.trim()) return; if(ws&&ws.readyState===1) ws.send(JSON.stringify({type:'chat',text:inp.value})); showBubble(inp.value,'You'); inp.value=''; }
function sendEmoji(e){
  if(ws && ws.readyState===1) ws.send(JSON.stringify({type:'chat', text:e}));
  showBubble(e,'You');
  if(e.includes('Pick Two')) playWhotSound('pick-two');
}
document.getElementById('chatSend').addEventListener('click',sendChat);
document.getElementById('chatInput').addEventListener('keydown',e=>{ if(e.key==='Enter') sendChat(); });

function showInterstitialAd(){
  try{(adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
  const overlay=document.getElementById('adInterstitial'); const timerEl=document.getElementById('adTimer'); const closeBtn=document.getElementById('closeAdBtn');
  overlay.style.display='flex'; let t=5; timerEl.textContent=t; closeBtn.style.display='none';
  const iv=setInterval(()=>{ t--; timerEl.textContent=t; if(t<=0){ clearInterval(iv); closeBtn.style.display='block'; timerEl.textContent='0'; } },1000);
}
function closeInterstitial(){ document.getElementById('adInterstitial').style.display='none'; }
function onMultiplayerGameEnd(){
  gameCount++; localStorage.setItem('multiGameCount',gameCount);
  if(gameCount%2===0){ showInterstitialAd(); }
}

document.getElementById('profileName').textContent=myName; document.getElementById('nameInput').value=myName;
document.getElementById('nameInput').addEventListener('change',e=>{ myName=e.target.value.trim()||'Player'; localStorage.setItem('playerName',myName); document.getElementById('profileName').textContent=myName; });

const SERVER_URL=(location.protocol==='https:'?'wss://':'ws://')+location.host;
document.getElementById('playBtn').addEventListener('click',()=>{
  document.getElementById('menuScreen').style.display='none'; document.getElementById('gameScreen').style.display='flex';
  ws=new WebSocket(SERVER_URL);
  ws.onopen=()=>{ ws.send(JSON.stringify({type:'join',name:myName})); ws.send(JSON.stringify({type:'findGame',name:myName})); document.getElementById('gameInfo').textContent='Searching opponent...'; };
  ws.onmessage=(ev)=>{
    const data=JSON.parse(ev.data);
    if(data.type==='chat') showBubble(data.text,data.name);
    if(data.type==='sound') playSound(data.sound);
    if(data.type==='gameEnd'){ onMultiplayerGameEnd(); document.getElementById('gameInfo').textContent='Game Over - '+data.winner+' won!'; }
    if(data.type==='gameStart'){ document.getElementById('gameInfo').textContent='Room: '+data.roomId; }
  };
});
window.onCardPlayed=(card)=>{ if(card.number===2||card.action==='pick2') playWhotSound('pick-two'); else if(card.number===3||card.action==='pick3') playWhotSound('pick-three'); else if(card.action==='holdon') playWhotSound('holdon'); else if(card.action==='generalmarket') playWhotSound('general'); else if(card.action==='whot') playWhotSound('captain'); };
</script>
</body></html>`;

const server = http.createServer((req,res)=>{
  if(req.url==='/' || req.url==='/index.html'){
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end(HTML);
  } else {
    res.writeHead(404); res.end('Not found');
  }
});
const wss = new WebSocket.Server({server});
let waiting=null;
let rooms=new Map();
wss.on('connection',(ws)=>{
  ws.id=Math.random().toString(36).slice(2);
  ws.on('message',(msg)=>{
    try{
      const data=JSON.parse(msg);
      if(data.type==='join'){ ws.name=data.name||'Player'; }
      if(data.type==='findGame'){
        if(waiting && waiting!==ws && waiting.readyState===1){
          const roomId=Math.random().toString(36).slice(2,8);
          const room={id:roomId, players:[waiting, ws]};
          rooms.set(roomId, room);
          waiting.roomId=roomId; ws.roomId=roomId;
          [waiting, ws].forEach(p=> p.send(JSON.stringify({type:'gameStart', roomId, players:[{name:waiting.name},{name:ws.name}]})));
          waiting=null;
        } else { waiting=ws; ws.send(JSON.stringify({type:'waiting', msg:'Waiting for opponent...'})); }
      }
      if(data.type==='chat'){
        const room=rooms.get(ws.roomId);
        if(room){
          room.players.forEach(p=>{ if(p.readyState===1) p.send(JSON.stringify({type:'chat', name:ws.name, text:String(data.text||'').slice(0,120), from:ws.id})); });
        }
      }
      if(data.type==='play' && data.card){
        const room=rooms.get(ws.roomId);
        let sound='cardDrop';
        if(data.card.value==='2' || data.card.number===2) sound='pickTwo';
        if(room){ room.players.forEach(p=>{ if(p.readyState===1) p.send(JSON.stringify({type:'sound', sound})); }); }
      }
      if(data.type==='gameOver'){
        const room=rooms.get(ws.roomId);
        if(room){ room.players.forEach(p=>{ if(p.readyState===1) p.send(JSON.stringify({type:'gameEnd', winner:ws.name})); }); }
      }
    }catch(e){}
  });
  ws.on('close',()=>{
    if(waiting===ws) waiting=null;
    if(ws.roomId){ rooms.delete(ws.roomId); }
  });
});
server.listen(PORT, ()=> console.log('Server running on '+PORT));
