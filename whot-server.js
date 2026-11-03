// server.js - Yo Waitwhat PERFECT SERVER - Serves app + game logic
// npm install ws
// Start: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

// Serve the HTML file
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Serve app.html at root
  if (req.url === '/' || req.url === '/index.html') {
    try {
      // Try to find whot-app.html in same folder
      const possiblePaths = [
        path.join(__dirname, 'whot-app.html'),
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'public', 'whot-app.html')
      ];
      let html = null;
      for (let p of possiblePaths) {
        if (fs.existsSync(p)) { html = fs.readFileSync(p, 'utf8'); break; }
      }
      if (html) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(html);
      }
    } catch(e){}
    // Fallback if no file found - show that server is live
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`<h1>Yo Waitwhat Server Live!</h1><p>Upload your whot-app.html to this same folder. WebSocket is ready at wss://${req.headers.host}</p>`);
  }

  // Serve sounds folder if you have it
  if (req.url.startsWith('/sounds/')) {
    const filePath = path.join(__dirname, req.url);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      return res.end(fs.readFileSync(filePath));
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocket.Server({ server });

let rooms = new Map();
let waitingQueue = [];
let players = new Map();

function genId(){ return Math.random().toString(36).slice(2,9); }

function broadcastToRoom(roomId, data, exceptId=null){
  const room = rooms.get(roomId);
  if(!room) return;
  room.players.forEach(p=>{
    if(p.id!==exceptId && p.ws && p.ws.readyState===1){
      p.ws.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws)=>{
  ws.id = genId();
  ws.isAlive = true;
  ws._lastChat = 0;
  console.log('Player connected:', ws.id);

  ws.on('pong', ()=> ws.isAlive = true);

  ws.on('message', (raw)=>{
    try{
      const msg = JSON.parse(raw);

      // JOIN
      if(msg.type==='join' || msg.type==='setName'){
        const name = (msg.name||'Player').slice(0,20);
        players.set(ws.id, {id:ws.id, name:name, ws:ws, roomId:ws.roomId||null, photo:msg.photo||null});
        ws.name = name;
      }

      // PROFILE PHOTO - from gallery
      if(msg.type==='profilePhoto'){
        const p = players.get(ws.id);
        if(p){
          p.photo = msg.photo?.slice(0,120000);
          if(p.roomId){
            broadcastToRoom(p.roomId, {type:'playerPhoto', from:ws.id, photo:p.photo, name:p.name});
          }
        }
      }

      // FIND GAME - anyone online + bot after 15s
      if(msg.type==='findGame'){
        let player = players.get(ws.id);
        if(!player){
          player = {id:ws.id, name:msg.name||'Player', ws:ws, roomId:null, photo:null};
          players.set(ws.id, player);
        }
        waitingQueue = waitingQueue.filter(id=>id!==ws.id);
        waitingQueue.push(ws.id);

        if(waitingQueue.length >= 2){
          const roomId = genId();
          const roomPlayers = [];
          for(let i=0; i<Math.min(2, waitingQueue.length); i++){
            const pid = waitingQueue.shift();
            const pl = players.get(pid);
            if(pl) roomPlayers.push({...pl, hand:[], ws:pl.ws});
          }
          rooms.set(roomId, {id:roomId, players:roomPlayers, table:[], turn:0});
          roomPlayers.forEach(p=>{
            if(p.ws){
              p.ws.roomId = roomId;
              const pp = players.get(p.id);
              if(pp) pp.roomId = roomId;
              p.ws.send(JSON.stringify({
                type:'gameStart', 
                roomId:roomId, 
                players:roomPlayers.map(x=>({id:x.id, name:x.name, photo:x.photo, isBot:x.isBot}))
              }));
            }
          });
          console.log('Room created:', roomId);
        } else {
          ws.send(JSON.stringify({type:'waiting', msg:'Searching opponent... 15s then bot will join'}));
          setTimeout(()=>{
            if(waitingQueue.includes(ws.id)){
              waitingQueue = waitingQueue.filter(id=>id!==ws.id);
              const roomId = genId();
              const botId = 'bot_'+genId();
              const roomPlayers = [
                {...players.get(ws.id), hand:[], ws:ws},
                {id:botId, name:'Computer', ws:null, isBot:true, hand:[], photo:null}
              ];
              rooms.set(roomId, {id:roomId, players:roomPlayers, table:[], turn:0});
              ws.roomId = roomId;
              const pp = players.get(ws.id);
              if(pp) pp.roomId = roomId;
              ws.send(JSON.stringify({type:'gameStart', roomId:roomId, players:roomPlayers.map(x=>({id:x.id, name:x.name, photo:x.photo, isBot:x.isBot}))}));
            }
          }, 15000);
        }
      }

      // CHAT - texting with bubble above photo
      if(msg.type==='chat'){
        const p = players.get(ws.id);
        if(!p || !p.roomId) return;
        const now = Date.now();
        if(now - ws._lastChat < 1000) return; // 1 per sec
        ws._lastChat = now;
        const text = String(msg.text||'').slice(0,120).trim();
        if(!text) return;
        broadcastToRoom(p.roomId, {type:'chat', from:ws.id, name:p.name, text:text, bubbleTime:6000});
      }

      // PLAY CARD - with PERMANENT SOUND LOGIC
      if(msg.type==='play'){
        const p = players.get(ws.id);
        if(!p || !p.roomId) return;
        const card = msg.card || {};
        let sound = 'cardDrop';
        // Permanent logic - Pick Two, Pick Three
        if(card.value===2 || card.number===2 || card.value==='2' || String(card).includes('2')) sound='pickTwo';
        if(card.value===3 || card.number===3 || card.value==='3' || String(card).includes('3')) sound='pickThree';
        
        console.log(`${p.name} played ${JSON.stringify(card)} -> ${sound}`);
        
        // Broadcast permanent sound to everyone in room
        broadcastToRoom(p.roomId, {
          type:'sound', 
          sound:sound, // pickTwo, pickThree, cardDrop
          card:card, 
          from:ws.id,
          permanent:true // tell app to use built-in sound
        });
        broadcastToRoom(p.roomId, {
          type:'cardPlayed', 
          card:card, 
          from:ws.id, 
          sound:sound,
          nextTurn:msg.nextTurn
        });
      }

      if(msg.type==='emoji'){
        const p = players.get(ws.id);
        if(!p || !p.roomId) return;
        broadcastToRoom(p.roomId, {type:'emoji', from:ws.id, emoji:msg.emoji, name:p.name});
      }

    }catch(e){ console.log('Bad message', e.message); }
  });

  ws.on('close', ()=>{
    console.log('Player left:', ws.id);
    const p = players.get(ws.id);
    if(p && p.roomId){
      broadcastToRoom(p.roomId, {type:'playerLeft', from:ws.id, name:p.name});
      // Clean room if empty
      const room = rooms.get(p.roomId);
      if(room){
        room.players = room.players.filter(x=>x.id!==ws.id);
        if(room.players.length===0) rooms.delete(p.roomId);
      }
    }
    players.delete(ws.id);
    waitingQueue = waitingQueue.filter(id=>id!==ws.id);
  });
});

// Keep alive
setInterval(()=>{
  wss.clients.forEach(ws=>{
    if(!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping(()=>{});
  });
}, 30000);

server.listen(PORT, ()=> console.log(`✅ Yo Waitwhat PERFECT SERVER running on ${PORT} - Serves HTML + WebSocket + Permanent Pick Two Jor!`));
{
  "name": "yo-waitwhat-perfect",
  "version": "2.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": { "ws": "^8.17.0" }
}

