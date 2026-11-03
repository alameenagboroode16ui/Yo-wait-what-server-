// Yo Waitwhat online server (single file, no installs needed).
// Accounts, email confirmation, password reset, matchmaking (anyone online, or a shared room code),
// computer players to fill empty seats, the authoritative game, emojis, points and leaderboard.
// Start command: node whot-server.js
// Optional environment variables: RESEND_API_KEY, MAIL_FROM, APP_URL
const http=require('http'),crypto=require('crypto'),fs=require('fs'),path=require('path'),EventEmitter=require('events');
const PORT=process.env.PORT||3000;
const APP_URL=process.env.APP_URL||'';
const MAIL_KEY=process.env.RESEND_API_KEY||'';
const MAIL_FROM=process.env.MAIL_FROM||'Yo Waitwhat <onboarding@resend.dev>';
const CONFIRM_REQUIRED=!!MAIL_KEY;
const WAIT_MS=15000;        // how long to wait for people before computers fill the seats
const BOT_MS=1200;          // pause between computer moves
const DB=path.join(__dirname,'users.json');
let users=[];try{users=JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){}
const saveUsers=()=>{try{fs.writeFileSync(DB,JSON.stringify(users))}catch(e){}};
const hashPw=(pw,salt)=>crypto.scryptSync(pw,salt,64).toString('hex');
const tok=()=>crypto.randomBytes(24).toString('hex');
const sessions=new Map(),pending=new Map();
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, GET, OPTIONS'};
const reply=(res,code,obj)=>{res.writeHead(code,Object.assign({'Content-Type':'application/json'},CORS));res.end(JSON.stringify(obj))};
const valid=e=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const findUser=email=>users.find(u=>u.email===email);
async function sendMail(to,subject,html){
 if(!MAIL_KEY){console.log('[mail not configured] '+subject+' -> '+to+'\n'+html.replace(/<[^>]+>/g,' '));return true}
 try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+MAIL_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:MAIL_FROM,to:[to],subject,html})});return r.ok}catch(e){return false}
}
function oneTime(type,email){const t=tok();pending.set(t,{type,email,exp:Date.now()+30*60*1000});return t}
function takeOneTime(t,type){const p=pending.get(t);if(!p||p.type!==type||p.exp<Date.now())return null;pending.delete(t);return p}

// ---------- minimal WebSocket support ----------
class WSConn extends EventEmitter{
 constructor(sock){super();this.sock=sock;this.readyState=1;this.buf=Buffer.alloc(0);
  sock.on('data',d=>{this.buf=Buffer.concat([this.buf,d]);this.parse()});
  sock.on('close',()=>this.gone());sock.on('error',()=>this.gone())}
 gone(){if(this.readyState===3)return;this.readyState=3;this.emit('close')}
 parse(){
  while(this.buf.length>=2){
   const op=this.buf[0]&0x0f;let len=this.buf[1]&0x7f,off=2;
   if(len===126){if(this.buf.length<4)return;len=this.buf.readUInt16BE(2);off=4}
   else if(len===127){if(this.buf.length<10)return;len=Number(this.buf.readBigUInt64BE(2));off=10}
   const masked=(this.buf[1]&0x80)!==0;let mask=null;
   if(masked){if(this.buf.length<off+4)return;mask=this.buf.slice(off,off+4);off+=4}
   if(this.buf.length<off+len)return;
   const payload=Buffer.from(this.buf.slice(off,off+len));
   if(masked)for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];
   this.buf=this.buf.slice(off+len);
   if(op===1)this.emit('message',payload.toString('utf8'));
   else if(op===8)this.close();
   else if(op===9)this.raw(0x8a,payload);
  }
 }
 raw(op,payload){if(this.readyState!==1)return;
  let head;if(payload.length<126){head=Buffer.from([0x80|op,payload.length])}
  else if(payload.length<65536){head=Buffer.alloc(4);head[0]=0x80|op;head[1]=126;head.writeUInt16BE(payload.length,2)}
  else{head=Buffer.alloc(10);head[0]=0x80|op;head[1]=127;head.writeBigUInt64BE(BigInt(payload.length),2)}
  try{this.sock.write(Buffer.concat([head,payload]))}catch(e){}}
 send(s){this.raw(1,Buffer.from(String(s),'utf8'))}
 close(){if(this.readyState===1){this.readyState=3;try{this.raw(8,Buffer.alloc(0))}catch(e){}try{this.sock.end()}catch(e){}this.emit('close')}}
}

// ---------- WHOT rules (2, 3 or 4 seats; 10 cards each; 50 cards left in the market) ----------
const M=(()=>{
 const SHAPES=['circle','triangle','cross','square','star'];
 const NUMS=[1,2,3,5,7,8,11,13,14];
 const CARDS_EACH=10, MARKET=50;
 function makeDeck(size){const a=[];for(let r=0;r<2;r++){SHAPES.forEach(s=>NUMS.forEach(n=>a.push({id:s+n+'_'+r,s,n})));for(let k=0;k<6;k++)a.push({id:'w'+k+'_'+r,s:'whot',n:20})}
  return shuffle(a).slice(0,size)}
 function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 const randShape=()=>SHAPES[Math.floor(Math.random()*SHAPES.length)];
 function draw(st,p,k){for(let i=0;i<k;i++){if(!st.deck.length){if(st.discard.length>1){const t=st.discard.pop();st.deck=shuffle(st.discard);st.discard=[t]}else break}st.hands[p].push(st.deck.pop())}}
 function newGame(n){
  const total=CARDS_EACH*n+1+MARKET;
  const st={n,hands:[],deck:makeDeck(total),discard:[],turn:0,shape:null,top:null,pending:null,winner:null};
  for(let p=0;p<n;p++){st.hands.push([]);draw(st,p,CARDS_EACH)}
  st.top=st.deck.pop();st.discard.push(st.top);st.shape=st.top.s==='whot'?randShape():st.top.s;
  return st;
 }
 function canPlay(st,c){if(st.pending)return c.n===st.pending.t;return c.s==='whot'||c.s===st.shape||c.n===st.top.n}
 function applyPlay(st,p,i,shape){
  const c=st.hands[p].splice(i,1)[0];st.discard.push(c);st.top=c;
  st.shape=c.s==='whot'?(shape||randShape()):c.s;
  if(!st.hands[p].length){st.winner=p;return}
  const n=st.n;let nxt=(p+1)%n;
  if(c.n===2||c.n===5){const add=c.n===2?2:3;st.pending={t:c.n,c:(st.pending?st.pending.c:0)+add}}
  else if(c.n===1||c.n===8){nxt=(p+2)%n}
  else if(c.n===14){for(let q=0;q<n;q++)if(q!==p)draw(st,q,1);nxt=p}
  st.turn=nxt;
 }
 function drawAction(st,p){if(st.pending){draw(st,p,st.pending.c);st.pending=null}else draw(st,p,1);st.turn=(p+1)%st.n}
 const POINTS=[30,15,5,0];
 function ranking(st){
  const val=c=>c.s==='whot'?20:c.n;
  const rows=st.hands.map((h,seat)=>({seat,cards:h,total:h.reduce((a,c)=>a+val(c),0)}));
  rows.sort((a,b)=>(a.seat===st.winner?-1:b.seat===st.winner?1:a.total-b.total));
  return rows.map((r,i)=>Object.assign(r,{place:i+1,pts:POINTS[i]||0}));
 }
 // computer player for empty seats
 function botPick(st,p,idxs){
  const hand=st.hands[p];
  const normal=idxs.filter(i=>hand[i].s!=='whot');
  const pool=normal.length?normal:idxs;
  const i=pool[Math.floor(Math.random()*pool.length)];
  let shape=null;
  if(hand[i].s==='whot'){const cnt={};SHAPES.forEach(s=>cnt[s]=0);hand.forEach(c=>{if(c.s!=='whot')cnt[c.s]++});shape=SHAPES.reduce((b,s)=>cnt[s]>cnt[b]?s:b,SHAPES[0])}
  return{i,shape};
 }
 return{SHAPES,newGame,canPlay,applyPlay,drawAction,ranking,botPick};
})();

// ---------- matchmaking, rooms and games ----------
const queues={2:[],3:[],4:[]},queueTimer={2:null,3:null,4:null};
const codeRooms=new Map();   // code -> {size, members:[ws]}
const matches=new Map();
const send=(ws,obj)=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(obj))};
function dropFromWaiting(ws){
 for(const k of [2,3,4]){const i=queues[k].indexOf(ws);if(i>=0)queues[k].splice(i,1)}
 for(const [code,r] of codeRooms){const i=r.members.indexOf(ws);if(i>=0){r.members.splice(i,1);if(!r.members.length)codeRooms.delete(code)}}
}
function profileOf(ws){return{name:(ws.profile&&ws.profile.name)||ws.user.name,avatar:(ws.profile&&ws.profile.avatar)||null}}
function viewFor(mt,seat){
 const st=mt.st,n=st.n,finished=st.winner!==null;
 const others=[];for(let k=1;k<n;k++){const q=(seat+k)%n;others.push({name:mt.seats[q].name,avatar:mt.seats[q].avatar,bot:mt.seats[q].bot,count:st.hands[q].length,hand:finished?st.hands[q]:null})}
 return{type:'state',size:n,finished,me:{name:mt.seats[seat].name,avatar:mt.seats[seat].avatar},
  st:{hands:[st.hands[seat]],top:st.top,shape:st.shape,pending:st.pending,deckCount:st.deck.length,
   turn:(st.turn-seat+n)%n,winner:st.winner===null?null:((st.winner-seat+n)%n)},
  others,ranks:finished?mt.ranks.map(r=>Object.assign({},r,{name:mt.seats[r.seat].name,mine:r.seat===seat,bot:mt.seats[r.seat].bot})):null,
  myPoints:mt.pts[seat]||0};
}
function broadcast(mt){mt.seats.forEach((s,seat)=>{if(s.ws)send(s.ws,viewFor(mt,seat))})}
function endMatch(mt,reason){
 if(mt.ended)return;mt.ended=true;
 if(reason){mt.seats.forEach(s=>{if(s.ws){send(s.ws,{type:'matchEnded',reason});s.ws.match=null}})}
 else{
  mt.ranks=M.ranking(mt.st);mt.pts=[];
  mt.ranks.forEach(r=>{mt.pts[r.seat]=r.pts;const s=mt.seats[r.seat];if(!s.bot&&s.user){const rec=findUser(s.user.email);if(rec){rec.points=(rec.points||0)+r.pts;rec.games=(rec.games||0)+1;if(r.place===1)rec.wins=(rec.wins||0)+1}}});
  saveUsers();broadcast(mt);
  mt.seats.forEach(s=>{if(s.ws)s.ws.match=null});
 }
 matches.delete(mt.id);
}
function scheduleBot(mt){
 if(mt.ended||mt.st.winner!==null)return;
 const seat=mt.st.turn;if(!mt.seats[seat].bot)return;
 setTimeout(()=>{
  if(mt.ended||mt.st.winner!==null||mt.st.turn!==seat)return;
  const st=mt.st,hand=st.hands[seat];
  const idxs=hand.map((c,i)=>M.canPlay(st,c)?i:-1).filter(i=>i>=0);
  if(idxs.length){const d=M.botPick(st,seat,idxs);M.applyPlay(st,seat,d.i,d.shape)}
  else M.drawAction(st,seat);
  if(st.winner!==null){return endMatch(mt)}
  broadcast(mt);scheduleBot(mt);
 },BOT_MS);
}
function startMatch(humans,size){
 const seats=humans.map(ws=>Object.assign({ws,user:ws.user,bot:false},profileOf(ws)));
 while(seats.length<size)seats.push({ws:null,user:null,bot:true,name:'Computer '+(seats.length),avatar:null});
 const id=tok().slice(0,10);
 const mt={id,size,seats,st:M.newGame(size),pts:[],ranks:null,ended:false};
 seats.forEach((s,seat)=>{if(s.ws){s.ws.match=mt;s.ws.seat=seat}});
 matches.set(id,mt);
 seats.forEach((s,seat)=>{if(s.ws)send(s.ws,{type:'matched',size,seat})});
 broadcast(mt);scheduleBot(mt);
}
function fillQueue(size){
 clearTimeout(queueTimer[size]);queueTimer[size]=null;
 const group=queues[size].splice(0,queues[size].length);
 if(!group.length)return;
 group.forEach(w=>{w.waitingSize=null});
 startMatch(group,size);
}

// ---------- HTTP (accounts) + WebSocket (games) ----------
const httpServer=http.createServer((req,res)=>{
 if(req.method==='OPTIONS')return reply(res,204,{});
 const url=req.url.split('?')[0];
 if(req.method==='GET'&&url==='/api/leaderboard'){
  const top=users.filter(u=>u.points>0).sort((a,b)=>b.points-a.points).slice(0,20).map(u=>({name:u.name,points:u.points,wins:u.wins||0,games:u.games||0}));
  return reply(res,200,{top});
 }
 if(req.method==='GET'&&url==='/'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('Yo Waitwhat server is running.')}
 let body='';req.on('data',c=>{body+=c;if(body.length>400000)req.destroy()});
 req.on('end',async()=>{
  let d={};try{d=JSON.parse(body||'{}')}catch(e){return reply(res,400,{error:'Bad request'})}
  const email=String(d.email||'').trim().toLowerCase(),pw=String(d.password||'');
  if(url==='/api/signup'){
   const name=String(d.name||'').trim().slice(0,16);
   if(!valid(email))return reply(res,400,{error:'Enter a valid email'});
   if(pw.length<6)return reply(res,400,{error:'Password must be at least 6 characters'});
   if(!name)return reply(res,400,{error:'Enter your name'});
   if(findUser(email))return reply(res,400,{error:'This email already has an account. Please sign in.'});
   const salt=crypto.randomBytes(16).toString('hex');
   users.push({email,name,salt,hash:hashPw(pw,salt),verified:!CONFIRM_REQUIRED,points:0,wins:0,games:0});saveUsers();
   if(CONFIRM_REQUIRED){const t=oneTime('confirm',email);await sendMail(email,'Confirm your Yo Waitwhat account','<p>Hi '+name+', tap to confirm your account:</p><p><a href="'+APP_URL+'?confirm='+t+'">Confirm my account</a></p>');return reply(res,200,{needConfirm:true,message:'We sent a confirmation link to '+email+'. Open it, then sign in.'})}
   const token=tok();sessions.set(token,{email,name});return reply(res,200,{token,name});
  }
  if(url==='/api/confirm'){const p=takeOneTime(String(d.token||''),'confirm');const u=p&&findUser(p.email);if(!u)return reply(res,400,{error:'This link has expired. Sign in to request a new one.'});u.verified=true;saveUsers();return reply(res,200,{message:'Your account is confirmed. You can sign in now.'})}
  if(url==='/api/login'){
   const u=findUser(email);
   if(!u||hashPw(pw,u.salt)!==u.hash)return reply(res,400,{error:'Wrong email or password'});
   if(!u.verified)return reply(res,400,{error:'Please confirm your email first. Check your inbox.'});
   const token=tok();sessions.set(token,{email,name:u.name});return reply(res,200,{token,name:u.name});
  }
  if(url==='/api/forgot'){const u=findUser(email);if(u){const t=oneTime('reset',email);await sendMail(email,'Reset your Yo Waitwhat password','<p>Tap to choose a new password:</p><p><a href="'+APP_URL+'?reset='+t+'">Reset my password</a></p>')}return reply(res,200,{message:'If an account exists for that email, a reset link has been sent.'})}
  if(url==='/api/delete'){
   const u=findUser(email);
   if(!u||hashPw(pw,u.salt)!==u.hash)return reply(res,400,{error:'Wrong email or password'});
   users=users.filter(x=>x.email!==email);saveUsers();
   for(const [t,v] of sessions){if(v.email===email)sessions.delete(t)}
   return reply(res,200,{message:'Your account and its points have been deleted.'});
  }
  if(url==='/api/reset'){
   const p=takeOneTime(String(d.token||''),'reset');if(!p)return reply(res,400,{error:'This reset link has expired. Request a new one.'});
   if(pw.length<6)return reply(res,400,{error:'Password must be at least 6 characters'});
   const u=findUser(p.email);if(!u)return reply(res,400,{error:'Account not found.'});
   u.salt=crypto.randomBytes(16).toString('hex');u.hash=hashPw(pw,u.salt);saveUsers();
   return reply(res,200,{message:'Password changed. You can sign in with your new password.'});
  }
  reply(res,404,{error:'Not found'});
 });
});
httpServer.on('upgrade',(req,sock)=>{
 const key=req.headers['sec-websocket-key'];if(!key){sock.destroy();return}
 const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
 handleSocket(new WSConn(sock));
});
const EMOJIS=['😉','🤣','🥲','😝','😪','😭','😰','😈','😤','💯'];
function handleSocket(ws){
 ws.user=null;ws.match=null;ws.seat=null;ws.profile=null;ws.lastEmoji=0;
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw)}catch(e){return}
  if(m.type==='auth'){const u=sessions.get(m.token);if(!u)return send(ws,{type:'error',error:'Please sign in again.'});ws.user=u;return send(ws,{type:'ready',name:u.name})}
  if(!ws.user)return;
  if(m.type==='profile'){ws.profile={name:String(m.name||ws.user.name).slice(0,16),avatar:typeof m.avatar==='string'&&m.avatar.length<120000?m.avatar:null};return}
  if(m.type==='find'){
   const size=[2,3,4].includes(+m.size)?+m.size:2;
   if(ws.match)return;
   if(m.profile)ws.profile={name:String(m.profile.name||ws.user.name).slice(0,16),avatar:typeof m.profile.avatar==='string'&&m.profile.avatar.length<120000?m.profile.avatar:null};
   dropFromWaiting(ws);
   queues[size].push(ws);ws.waitingSize=size;
   if(queues[size].length>=size)return fillQueue(size);
   send(ws,{type:'searching',size});
   if(!queueTimer[size])queueTimer[size]=setTimeout(()=>fillQueue(size),WAIT_MS);
   return;
  }
  if(m.type==='code'){
   const size=[2,3,4].includes(+m.size)?+m.size:2;
   const code=String(m.code||'').trim().toUpperCase().slice(0,12);
   if(!code)return send(ws,{type:'error',error:'Enter a room code.'});
   if(ws.match)return;
   if(m.profile)ws.profile={name:String(m.profile.name||ws.user.name).slice(0,16),avatar:typeof m.profile.avatar==='string'&&m.profile.avatar.length<120000?m.profile.avatar:null};
   dropFromWaiting(ws);
   let r=codeRooms.get(code);
   if(!r){r={size,members:[]};codeRooms.set(code,r)}
   if(r.size!==size)return send(ws,{type:'error',error:'That room is set for '+r.size+' players. Choose '+r.size+'.'});
   r.members.push(ws);
   if(r.members.length>=r.size){codeRooms.delete(code);return startMatch(r.members.splice(0),size)}
   send(ws,{type:'waiting',code,have:r.members.length,size});
   return;
  }
  if(m.type==='cancel'){dropFromWaiting(ws);return send(ws,{type:'cancelled'})}
  const mt=ws.match;if(!mt||mt.ended)return;
  if(m.type==='emoji'){
   if(!EMOJIS.includes(m.emoji))return;
   const now=Date.now();if(now-ws.lastEmoji<1000)return;ws.lastEmoji=now;
   mt.seats.forEach(s=>{if(s.ws&&s.ws!==ws)send(s.ws,{type:'emoji',from:ws.user.name,emoji:m.emoji})});
   return;
  }
  const st=mt.st,seat=ws.seat;
  if(m.type==='play'){
   if(st.turn!==seat||st.winner!==null)return;
   const c=st.hands[seat][m.index];if(!c||!M.canPlay(st,c))return send(ws,{type:'error',error:'Not allowed.'});
   if(c.s==='whot'&&!M.SHAPES.includes(m.shape))return send(ws,{type:'error',error:'Choose a shape.'});
   M.applyPlay(st,seat,m.index,m.shape);
   if(st.winner!==null)return endMatch(mt);
   broadcast(mt);return scheduleBot(mt);
  }
  if(m.type==='draw'){
   if(st.turn!==seat||st.winner!==null)return;
   M.drawAction(st,seat);broadcast(mt);return scheduleBot(mt);
  }
  if(m.type==='leave'){endMatch(mt,'A player left the match.');return}
 });
 ws.on('close',()=>{
  dropFromWaiting(ws);
  const mt=ws.match;
  if(mt&&!mt.ended){mt.seats[ws.seat].ws=null;endMatch(mt,'A player left the match.')}
 });
}
httpServer.listen(PORT,()=>console.log('Yo Waitwhat server on port '+PORT));
