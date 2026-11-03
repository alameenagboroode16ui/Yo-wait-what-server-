const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;
const LIVE_URL = 'https://yo-wait-whot-server-4.onrender.com';
const WS_URL = 'wss://yo-wait-whot-server-4.onrender.com';

const HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>YO WAITWHAT</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:radial-gradient(#5a3a22,#3a2414);color:#fff;font-family:Arial;overflow:hidden;height:100vh}#app{max-width:560px;margin:0 auto;height:100vh;display:flex;flex-direction:column}.glass{background:rgba(255,248,220,0.92);border:2px solid #c8a882;border-radius:16px;color:#3a2414}.btn{background:linear-gradient(#c8a882,#8b5a2b);color:#fff;padding:10px 14px;border:none;border-radius:10px;font-weight:bold;cursor:pointer;margin:3px}#bgMusic{position:fixed}#wallpaper{position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;display:none}#adOverlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:9999;display:none;flex-direction:column;justify-content:center;align-items:center}#chatBubble{position:fixed;bottom:130px;left:50%;transform:translateX(-50%);background:#fff;color:#000;padding:10px 16px;border-radius:20px;display:none;z-index:100;font-weight:bold}</style></head><body>
<img id="wallpaper"/><audio id="bgMusic" loop></audio>
<div id="app">
<div style="padding:8px;display:flex;justify-content:space-between;background:rgba(0,0,0,0.3)"><div><img id="profilePic" style="width:40px;height:40px;border-radius:50%;border:2px solid gold;display:none"><span id="playerNameDisplay">Guest</span></div><span style="font-size:10px">${LIVE_URL}</span></div>

<div id="menu" class="glass" style="margin:8px;padding:12px;text-align:center;overflow-y:auto;flex:1">
<h1 style="font-size:36px;color:#8b5a2b">YO<br>WAITWHAT</h1>
<input id="nameInput" placeholder="Enter name" style="width:100%;padding:10px;border-radius:8px;margin:6px 0">
<div style="display:flex;gap:4px"><input type="file" id="photoInput" accept="image/*" style="display:none"><button class="btn" onclick="photoInput.click()">📸 PHOTO</button><input type="file" id="wpInput" accept="image/*" style="display:none"><button class="btn" onclick="wpInput.click()">🖼️ WALLPAPER</button></div>

<div style="margin:10px 0;padding:8px;border:1px dashed #8b5a2b;border-radius:10px">
<b>🏠 PRIVATE CODE MODE</b><br>
<button class="btn" onclick="createPrivate()">Create Code</button>
<div style="display:flex;margin-top:6px"><input id="codeInput" placeholder="Enter code" style="flex:1;padding:8px;border-radius:8px"><button class="btn" onclick="joinPrivate()">Join</button></div>
<div id="codeDisplay" style="font-size:20px;font-weight:bold;margin-top:6px;color:#8b5a2b"></div>
</div>

<b>🌍 ONLINE MATCH</b><br>
<button class="btn" style="width:100%;margin:3px 0;background:linear-gradient(#2ecc71,#27ae60)" onclick="playOnlineMode(2)">2 PLAYERS ONLINE - Find Anyone</button>
<button class="btn" style="width:100%;margin:3px 0;background:linear-gradient(#3498db,#2980b9)" onclick="playOnlineMode(3)">3 PLAYERS ONLINE - Find 3</button>
<button class="btn" style="width:100%;margin:3px 0;background:linear-gradient(#e67e22,#d35400)" onclick="playOnlineMode(4)">4 PLAYERS ONLINE - Find 4 + Bot Fill</button>
<div id="searchInfo" style="font-size:12px;margin-top:6px"></div>

<div class="glass" style="padding:8px;margin:8px 0;text-align:left">
<b>🎵 Background Music (replaces jazz)</b><br>
<input type="file" id="musicInput" accept="audio/*" style="width:100%"><br>
<button class="btn" onclick="toggleMusic()">On/Off</button><button class="btn" onclick="clearMusic()">Clear</button><span id="musicStatus" style="font-size:11px"> No music</span>
</div>

<div class="glass" style="padding:8px;margin:8px 0;text-align:left">
<b>🎤 Warri Voices (5) + Custom MP3</b><br>
<div style="font-size:11px">
Pick2 <input type="file" accept="audio/*" onchange="saveCustomSound('pick2',this.files[0])"><br>
Pick3 <input type="file" accept="audio/*" onchange="saveCustomSound('pick3',this.files[0])"><br>
HoldOn <input type="file" accept="audio/*" onchange="saveCustomSound('holdon',this.files[0])"><br>
Market <input type="file" accept="audio/*" onchange="saveCustomSound('market',this.files[0])"><br>
Whot <input type="file" accept="audio/*" onchange="saveCustomSound('whot',this.files[0])"><br>
</div>
<button class="btn" onclick="testAllVoices()">Test</button><button class="btn" onclick="clearVoices()">Clear</button><button class="btn" onclick="toggleMute()" id="muteBtn">Mute</button>
</div>

</div>

<div id="gameArea" style="display:none;flex:1;flex-direction:column">
<div id="gameInfo" class="glass" style="padding:8px;text-align:center;font-weight:bold">Connecting...</div>
<div id="playersList" style="display:flex;gap:6px;padding:6px;overflow-x:auto"></div>
<div id="tableArea" class="glass" style="flex:1;margin:8px;display:flex;justify-content:center;align-items:center;flex-direction:column">Table</div>
<div id="handArea" style="display:flex;gap:6px;padding:8px;overflow-x:auto;background:rgba(0,0,0,0.2)"></div>
<div id="emojiBar" style="display:flex;gap:6px;padding:6px;overflow-x:auto;background:rgba(0,0,0,0.35)"></div>
<div style="display:flex;gap:6px;padding:8px"><input id="chatInput" placeholder="Type..." style="flex:1;padding:10px;border-radius:20px;border:none"><button class="btn" onclick="sendChat()">SEND</button></div>
</div>
</div>
<div id="chatBubble"></div>
<div id="adOverlay"><div style="background:#000;width:90%;max-width:380px;border-radius:12px"><div style="display:flex;justify-content:space-between;padding:12px;background:#111;color:#fff"><span id="adTimer">5s</span><button id="closeAdBtn" style="display:none" onclick="closeAd()">✕ Close</button></div><div style="height:200px;background:#222;display:flex;align-items:center;justify-content:center">AD HERE</div></div></div>
<script>
const WS_LINK="${WS_URL}"; let ws=null, myId=null, roomId=null, lastBubble=0;
const warriLines={pick2:"Pick Two joh!",pick3:"Pick Three!",holdon:"Do di calms jor!",market:"Make you na pick di card jor!",whot:"Na me be captain Warri!"};
let customSounds=JSON.parse(localStorage.getItem('customSounds')||'{}');
const bgMusic=document.getElementById('bgMusic'); let musicOn=localStorage.getItem('musicOn')!=='0';
if(localStorage.getItem('bgMusicFile')){bgMusic.src=localStorage.getItem('bgMusicFile');bgMusic.volume=0.35;}
if(localStorage.getItem('whotPhoto')){profilePic.src=localStorage.getItem('whotPhoto');profilePic.style.display='inline-block';}
if(localStorage.getItem('whotWallpaper')){wallpaper.src=localStorage.getItem('whotWallpaper');wallpaper.style.display='block';}
nameInput.value=localStorage.getItem('whotName')||'';
photoInput.addEventListener('change',e=>{const r=new FileReader();r.onload=()=>{localStorage.setItem('whotPhoto',r.result);profilePic.src=r.result;profilePic.style.display='inline-block';};r.readAsDataURL(e.target.files[0]);});
wpInput.addEventListener('change',e=>{const r=new FileReader();r.onload=()=>{localStorage.setItem('whotWallpaper',r.result);wallpaper.src=r.result;wallpaper.style.display='block';};r.readAsDataURL(e.target.files[0]);});
musicInput.addEventListener('change',e=>{const r=new FileReader();r.onload=()=>{localStorage.setItem('bgMusicFile',r.result);bgMusic.src=r.result;bgMusic.volume=0.35;bgMusic.play().catch(()=>{});musicStatus.innerText='Playing';};r.readAsDataURL(e.target.files[0]);});
function saveCustomSound(t,f){const r=new FileReader();r.onload=()=>{customSounds[t]=r.result;localStorage.setItem('customSounds',JSON.stringify(customSounds));alert(t+' saved');};r.readAsDataURL(f);}
function clearVoices(){localStorage.removeItem('customSounds');customSounds={};alert('cleared');}
function clearMusic(){localStorage.removeItem('bgMusicFile');bgMusic.pause();bgMusic.src='';musicStatus.innerText='No music';}
function toggleMusic(){if(!bgMusic.src)return alert('Upload music first');if(bgMusic.paused){bgMusic.play();musicStatus.innerText='Playing';}else{bgMusic.pause();musicStatus.innerText='Paused';}}
function toggleMute(){localStorage.setItem('mute',localStorage.getItem('mute')==='1'?'0':'1');muteBtn.innerText=localStorage.getItem('mute')==='1'?'Unmute':'Mute';}
function testAllVoices(){Object.keys(warriLines).forEach((k,i)=>setTimeout(()=>playWarri(k),i*1500));}
function playWarri(type){if(localStorage.getItem('mute')==='1')return;try{if(customSounds[type]){new Audio(customSounds[type]).play();return;}}catch(e){}try{speechSynthesis.speak(new SpeechSynthesisUtterance(warriLines[type]));}catch(e){}}
function showBubble(t){const n=Date.now();if(n-lastBubble<1000)return;lastBubble=n;chatBubble.innerText=t;chatBubble.style.display='block';setTimeout(()=>chatBubble.style.display='none',6000);}
function createPrivate(){const code=Math.random().toString(36).substring(2,6).toUpperCase();codeDisplay.innerText='Your Code: '+code;joinPrivateWithCode(code,true);}
function joinPrivate(){const code=codeInput.value.trim().toUpperCase();if(!code)return alert('Enter code');joinPrivateWithCode(code,false);}
function joinPrivateWithCode(code,isCreator){const name=nameInput.value.trim()||'Guest';localStorage.setItem('whotName',name);menu.style.display='none';gameArea.style.display='flex';if(localStorage.getItem('bgMusicFile')&&musicOn){bgMusic.play().catch(()=>{});}connectWS(name,'private',code,isCreator);}
function playOnlineMode(count){const name=nameInput.value.trim()||'Guest';localStorage.setItem('whotName',name);menu.style.display='none';gameArea.style.display='flex';if(localStorage.getItem('bgMusicFile')&&musicOn){bgMusic.play().catch(()=>{});}connectWS(name,'online',count,false);}
function connectWS(name,mode,val,isCreator){
 ws=new WebSocket(WS_LINK);
 ws.onopen=()=>{ws.send(JSON.stringify({type:'join',name}));if(mode==='private'){ws.send(JSON.stringify({type:'joinPrivate',code:val,isCreator}));searchInfo.innerText='Private Room: '+val;gameInfo.innerText='Private Room '+val+' - Waiting...';}else{ws.send(JSON.stringify({type:'findGame',count:val}));gameInfo.innerText='Searching for '+val+' players...';searchInfo.innerText='';}};
 ws.onmessage=e=>{
  const d=JSON.parse(e.data);
  if(d.type==='joined')myId=d.id;
  if(d.type==='privateCreated'){roomId=d.roomId;gameInfo.innerText='Room '+d.code+' Created - Share code! Players: '+d.players.length;}
  if(d.type==='waiting'){gameInfo.innerText='Waiting for '+d.need+' more... Bot will fill in '+d.botIn+'s if not enough';}
  if(d.type==='gameStart'){
   roomId=d.roomId;gameInfo.innerText='Game Started! Mode: '+d.mode+' Players: '+d.players.join(', ');playersList.innerHTML='';d.players.forEach(p=>{const div=document.createElement('div');div.className='glass';div.style.padding='6px';div.innerText=p+(p.includes('BOT')?' 🤖':'');playersList.appendChild(div);});tableArea.innerHTML='<h2>Game Started!</h2><p>'+d.players.length+' Players</p>';if(d.bots>0)showBubble(d.bots+' Bot(s) added to complete game');}
  if(d.type==='chat'){showBubble(d.text);if(d.text.includes('🃏'))playWarri('pick2');}
  if(d.type==='botPlay'){showBubble(d.bot+' played '+d.card);playWarri(d.voice);gameInfo.innerText=d.bot+' played - '+d.card;}
  if(d.type==='gameEnd'){gameInfo.innerText='Winner: '+d.winner;if(Math.random()<0.5)showInterstitial();}
 };
 ws.onclose=()=>{gameInfo.innerText='Reconnecting...';setTimeout(()=>connectWS(name,mode,val,isCreator),2000);};
}
function sendChat(){const txt=chatInput.value.trim();if(!txt)return;showBubble(txt);if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'chat',text:txt,roomId}));chatInput.value='';}
chatInput.addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});
const emojis=["😂","😍","🔥","😭","😎","🤣","😒","🙏","💀","👏","😤","🥺","🃏","💥"];emojis.forEach(em=>{const b=document.createElement('button');b.innerText=em;b.style.cssText='font-size:22px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;width:42px;height:42px';b.onclick=()=>{showBubble(em);if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'chat',text:em,roomId}));if(em==='🃏')playWarri('pick2');};emojiBar.appendChild(b);});
function showInterstitial(){adOverlay.style.display='flex';let c=5;adTimer.innerText='Continue in '+c+'s';closeAdBtn.style.display='none';const iv=setInterval(()=>{c--;adTimer.innerText='Continue in '+c+'s';if(c<=0){clearInterval(iv);adTimer.innerText='Advertisement';closeAdBtn.style.display='block';}},1000);}
function closeAd(){adOverlay.style.display='none';}
<\/script></body></html>`;

let idCounter=1; let rooms={}; let queues={2:[],3:[],4:[]}; let privateRooms={};

function makeId(){return 'p'+(idCounter++);}
function makeCode(){return Math.random().toString(36).substring(2,6).toUpperCase();}
function makeRoomId(){return Math.random().toString(36).substring(2,8).toUpperCase();}

function startGame(players, mode, code=null){
 const roomId=makeRoomId();
 const realPlayers=players.filter(p=>p.ws);
 const botCount=players.length - realPlayers.length;
 const playerNames=players.map(p=>p.name);
 rooms[roomId]={id:roomId, players, mode, code};

 players.forEach(p=>{
  if(p.ws && p.ws.readyState===1){
   p.ws.roomId=roomId;
   p.ws.send(JSON.stringify({type:'gameStart', roomId, mode, players:playerNames, bots:botCount}));
  }
 });

 if(botCount>0){
  let turn=0;
  const botInterval=setInterval(()=>{
   if(!rooms[roomId]){clearInterval(botInterval);return;}
   const bots=players.filter(p=>!p.ws);
   if(bots.length===0){clearInterval(botInterval);return;}
   const bot=bots[turn % bots.length];
   const cards=['Pick Two','Pick Three','Hold On','Market','Whot!','Number 5'];
   const card=cards[Math.floor(Math.random()*cards.length)];
   const voices={ 'Pick Two':'pick2','Pick Three':'pick3','Hold On':'holdon','Market':'market','Whot!':'whot'};
   realPlayers.forEach(rp=>{
    if(rp.ws.readyState===1) rp.ws.send(JSON.stringify({type:'botPlay', bot:bot.name, card, voice:voices[card]||'whot'}));
   });
   turn++;
   if(turn>20){clearInterval(botInterval); }
  }, 4000);
 }

 // cleanup after 10min
 setTimeout(()=>{delete rooms[roomId];}, 600000);
}

const server=http.createServer((req,res)=>{if(req.url==='/healthz'){res.writeHead(200);res.end('ok');return;}res.writeHead(200,{'Content-Type':'text/html'});res.end(HTML);});
const wss=new WebSocket.Server({server});
wss.on('connection',ws=>{
 ws.id=makeId();
 ws.on('message',msg=>{
  try{
   const data=JSON.parse(msg);
   if(data.type==='join'){ws.playerName=data.name||'Guest';ws.send(JSON.stringify({type:'joined',id:ws.id}));}
   
   if(data.type==='joinPrivate'){
    const code=data.code.toUpperCase();
    if(!privateRooms[code]) privateRooms[code]={code, players:[], roomId:makeRoomId()};
    const room=privateRooms[code];
    room.players.push({name:ws.playerName, ws, id:ws.id});
    ws.roomId=room.roomId; ws.privateCode=code;
    ws.send(JSON.stringify({type:'privateCreated', code, roomId:room.roomId, players:room.players.map(p=>p.name)}));
    room.players.forEach(p=>{if(p.ws!==ws && p.ws.readyState===1) p.ws.send(JSON.stringify({type:'chat', text: ws.playerName+' joined room '+code}));});
    if(room.players.length>=2){
     startGame([...room.players], 'PRIVATE', code);
     delete privateRooms[code];
    }
   }

   if(data.type==='findGame'){
    const count=parseInt(data.count)||2;
    if(count===2||count===3||count===4){
     queues[count].push({name:ws.playerName, ws, id:ws.id});
     ws.queueCount=count;
     ws.queueTime=Date.now();
     
     if(queues[count].length>=count){
      const players=queues[count].splice(0,count);
      startGame(players, count+'P ONLINE');
     }else{
      const need=count - queues[count].length;
      ws.send(JSON.stringify({type:'waiting', need, botIn:20}));
      // Bot fill timer for 4 players mode
      if(count===4){
       setTimeout(()=>{
        if(!ws.roomId && queues[4].find(p=>p.id===ws.id)){
         const waiting=queues[4].filter(p=>!p.ws.roomId);
         if(waiting.length>=2){ // at least 2 humans
          const humans=waiting.splice(0, waiting.length);
          queues[4]=queues[4].filter(p=>!humans.find(h=>h.id===p.id));
          const botNeeded=4 - humans.length;
          const bots=[];
          for(let i=0;i<botNeeded;i++) bots.push({name:'BOT '+(i+1), ws:null, id:'bot'+i});
          startGame([...humans, ...bots], '4P ONLINE + BOT');
         }
        }
       }, 20000); // 20 sec bot fill
      }
      // Bot fill for 3 players too
      if(count===3){
       setTimeout(()=>{
        if(!ws.roomId && queues[3].find(p=>p.id===ws.id)){
         const waiting=queues[3].filter(p=>!p.ws.roomId);
         if(waiting.length===2){
          const humans=waiting.splice(0,2);
          queues[3]=queues[3].filter(p=>!humans.find(h=>h.id===p.id));
          startGame([...humans, {name:'BOT 1', ws:null, id:'bot1'}], '3P ONLINE + BOT');
         }
        }
       }, 20000);
      }
     }
    }
   }

   if(data.type==='chat'){
    const room=rooms[data.roomId]||rooms[ws.roomId];
    if(room) room.players.forEach(p=>{if(p.ws && p.ws.readyState===1) p.ws.send(JSON.stringify({type:'chat', text:data.text, from:ws.id}));});
   }

  }catch(e){console.log(e);}
 });

 ws.on('close',()=>{
  Object.keys(queues).forEach(k=>{queues[k]=queues[k].filter(p=>p.id!==ws.id);});
  if(ws.privateCode && privateRooms[ws.privateCode]){privateRooms[ws.privateCode].players=privateRooms[ws.privateCode].players.filter(p=>p.id!==ws.id); if(privateRooms[ws.privateCode].players.length===0) delete privateRooms[ws.privateCode];}
  if(ws.roomId && rooms[ws.roomId]){rooms[ws.roomId].players=rooms[ws.roomId].players.filter(p=>p.id!==ws.id); if(rooms[ws.roomId].players.length===0) delete rooms[ws.roomId];}
 });
});

server.listen(PORT,()=>console.log('YO WAITWHAT LIVE at '+LIVE_URL));
