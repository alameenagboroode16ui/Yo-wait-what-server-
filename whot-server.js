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
