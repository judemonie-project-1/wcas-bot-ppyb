'use strict';
var Telegraf=require('telegraf').Telegraf;
var express=require('express');
var fs=require('fs');
var path=require('path');
var BOT_TOKEN=process.env.BOT_TOKEN;
var WEBHOOK_URL=(process.env.WEBHOOK_URL||'').trim();
var PORT=process.env.PORT||3000;
var TICKER='$WCAS';
var CA='TBA';
var TWITTER='https://x.com/Wcas2026';
var TG='';
var WEBSITE='';
var IS_CTO=false;
var GUARD_TYPE='soft';
var bot=new Telegraf(BOT_TOKEN);
var app=express();app.use(express.json());
var _SF='/tmp/state.json';
var caUnlocked=false,groupChatId=null;
function loadState(){try{var s=JSON.parse(fs.readFileSync(_SF,'utf8'));caUnlocked=!!s.u;groupChatId=s.g||null;}catch(_){}}
function saveState(){try{fs.writeFileSync(_SF,JSON.stringify({u:caUnlocked,g:groupChatId}));}catch(_){}}
loadState();
var _IMG1=path.join(__dirname,'wcas.jpg');
var _IMG2=path.join(__dirname,'siren.jpg');
var IMG=fs.existsSync(_IMG1)?_IMG1:(fs.existsSync(_IMG2)?_IMG2:_IMG1);
var IMG_BUF=null;try{if(fs.existsSync(IMG)){IMG_BUF=fs.readFileSync(IMG);console.log('Image loaded:',path.basename(IMG));}else{console.log('No image file found:',IMG);}}catch(e){console.log('Image error:',e.message);}
var caMsg=new Map(),xMsg=new Map(),shillMsg=new Map(),strikes=new Map(),spamTracker=new Map();
async function delPrev(map,cid){var mid=map.get(cid);if(mid){try{await bot.telegram.deleteMessage(cid,mid);}catch(_){}map.delete(cid);}}
var silImgId=null;
async function sendWithTracker(map,cid,cap,extra){await delPrev(map,cid);extra=extra||{};if(IMG_BUF){try{var m=await bot.telegram.sendPhoto(cid,{source:IMG_BUF},Object.assign({caption:cap,parse_mode:'HTML'},extra));map.set(cid,m.message_id);return m;}catch(e){console.log('Photo send failed:',e.message);}}var m2=await bot.telegram.sendMessage(cid,cap,Object.assign({parse_mode:'HTML'},extra));map.set(cid,m2.message_id);return m2;}
async function sendImg(cid,cap,extra){return sendWithTracker(shillMsg,cid,cap,extra);}
function autoDel(cid,mid,ms){setTimeout(function(){try{bot.telegram.deleteMessage(cid,mid);}catch(_){}},ms);}
async function isAdmin(ctx,uid){var t=ctx.chat&&ctx.chat.type;if(t!=='group'&&t!=='supergroup')return false;try{var m=await ctx.telegram.getChatMember(ctx.chat.id,uid);return m.status==='administrator'||m.status==='creator';}catch(_){return false;}}
function getStrike(uid){var n=Date.now(),s=strikes.get(uid);if(!s||n-s.since>86400000){s={count:0,since:n};strikes.set(uid,s);}return s;}
async function applyStrike(ctx,uid,reason){var s=getStrike(uid);try{await ctx.deleteMessage();}catch(_){}var mem=ctx.message&&ctx.message.from;var tag=mem&&mem.username?'@'+mem.username:mem&&mem.first_name||'user';var why=reason?' ('+reason+')':'';if(GUARD_TYPE==='soft')return;if(GUARD_TYPE==='strict'){try{await ctx.telegram.restrictChatMember(ctx.chat.id,uid,{permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+86400});}catch(_){}var ms=await ctx.reply('\u26A0\uFE0F '+tag+' muted 24h'+why+'.');autoDel(ctx.chat.id,ms.message_id,45000);return;}s.count++;if(s.count>=3){s.count=0;try{await ctx.telegram.restrictChatMember(ctx.chat.id,uid,{permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+86400});}catch(_){}var m3=await ctx.reply('\u26A0\uFE0F '+tag+' muted 24h \u2014 3 strikes'+why+'.');autoDel(ctx.chat.id,m3.message_id,60000);}else{var mw=await ctx.reply('\u26A0\uFE0F '+tag+' warning '+s.count+'/3'+why);autoDel(ctx.chat.id,mw.message_id,45000);}}
async function checkSpam(ctx,uid){var n=Date.now(),t=spamTracker.get(uid)||{c:0,s:n};if(n-t.s>60000)t={c:0,s:n};t.c++;spamTracker.set(uid,t);if(t.c>5){try{await ctx.telegram.restrictChatMember(ctx.chat.id,uid,{permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+300});}catch(_){}var m=await ctx.reply('Muted 5 min for spam.');autoDel(ctx.chat.id,m.message_id,15000);return true;}return false;}
var FUD=['rug','rugpull','scam','ponzi','honeypot','fuck','bitch','bastard','asshole','cunt','exit scam','dev ran','abandoned'];
function hasFud(t){var l=t.toLowerCase();return FUD.some(function(w){return l.includes(w);});}
var NOT_LIVE=['$WCAS hasn\u2019t launched yet. CA coming soon.','Not yet. Stay ready.','CA drops soon. Hold tight.'];
var CTO_REPLIES=['$WCAS is a CTO. Original dev gone. Community owns and runs this completely.','CTO project. Dev walked away. Community stepped up. The holders are the team.','No dev here. $WCAS is 100% community-owned. Original dev left. Community drives this.'];
bot.command('ca',async function(ctx){if(!caUnlocked)return ctx.reply(NOT_LIVE[Math.floor(Math.random()*NOT_LIVE.length)]);await sendWithTracker(caMsg,ctx.chat.id,'$WCAS Contract Address',{});return ctx.reply('<code>'+CA+'</code>',{parse_mode:'HTML'});});
bot.command('x',async function(ctx){return sendWithTracker(xMsg,ctx.chat.id,'Follow $WCAS on X',{reply_markup:{inline_keyboard:[[{text:'Follow on X',url:TWITTER}]]}});});
bot.command('twitter',async function(ctx){return sendWithTracker(xMsg,ctx.chat.id,'Follow $WCAS on X',{reply_markup:{inline_keyboard:[[{text:'Follow on X',url:TWITTER}]]}});});
bot.command('socials',function(ctx){return ctx.reply('<a href=\'https://dexscreener.com/bsc/TBA\'>Chart</a> | <a href=\'https://pancakeswap.finance/swap?outputCurrency=TBA\'>PancakeSwap</a>'+(TWITTER?' | <a href=\''+TWITTER+'\'>Twitter</a>':'')+(WEBSITE?' | <a href=\''+WEBSITE+'\'>Website</a>':''),{parse_mode:'HTML',disable_web_page_preview:true});});
bot.command('links',function(ctx){return ctx.reply('<a href=\'https://dexscreener.com/bsc/TBA\'>Chart</a> | <a href=\'https://pancakeswap.finance/swap?outputCurrency=TBA\'>PancakeSwap</a>'+(TWITTER?' | <a href=\''+TWITTER+'\'>Twitter</a>':'')+(WEBSITE?' | <a href=\''+WEBSITE+'\'>Website</a>':''),{parse_mode:'HTML',disable_web_page_preview:true});});
bot.command('info',function(ctx){return ctx.reply('<b>$WCAS</b> \u2014 BNB Smart Chain (BSC)\n\nSupply: N/A\nTax: 0% buy / 0% sell\nContract: PENDING\nLP: PENDING'+(TWITTER?'\nTwitter: '+TWITTER:''),{parse_mode:'HTML',disable_web_page_preview:true});});
var SHILL_MSGS=[
  'Looking for a community-driven token on BNB Smart Chain (BSC) with real conviction?\n\n$WCAS is the answer!\n\nFully renounced. LP locked. Community owns this completely.\n\n'+(caUnlocked?'CA:\n'+CA:'CA coming soon. Watch this space.'),
  'Don\'t sleep on $WCAS.\n\nNo dev. No rug. Just holders who believe.\n\nCommunity-owned. Renounced. Locked.\n\n'+(caUnlocked?'CA:\n'+CA:'CA dropping soon. Stay close.'),
  'Are you early to $WCAS?\n\nStrong narrative. Strong community. No games.\n\nThis is the move.\n\n'+(caUnlocked?'CA:\n'+CA:'CA incoming.'),
];
bot.command('shill',function(ctx){
  var base=SHILL_MSGS[Math.floor(Math.random()*SHILL_MSGS.length)];
  var caLine=caUnlocked?'\n\nCA:\n'+CA:'\n\nCA dropping soon.';
  var tgLine=TG?'\n\nJoin: '+TG:'';
  return sendWithTracker(shillMsg,ctx.chat.id,base+caLine+tgLine,{});
});
bot.on('new_chat_members',async function(ctx){
  if(ctx.message.new_chat_members.some(function(m){return m.is_bot;}))return;
  try{await ctx.deleteMessage();}catch(_){}
  for(var i=0;i<ctx.message.new_chat_members.length;i++){
    var mem=ctx.message.new_chat_members[i];
    var h=mem.username?'@'+mem.username:mem.first_name;
    var wg='Welcome to $WCAS, '+h+'! Great to have you here.';
    var ws=await ctx.reply(wg);autoDel(ctx.chat.id,ws.message_id,120000);
  }
});
var chatHistory=[];
function addHistory(text){chatHistory.push(text);if(chatHistory.length>8)chatHistory.shift();}
async function isGroupMember(chatId,uid){try{var m=await bot.telegram.getChatMember(chatId,uid);return ['member','administrator','creator','restricted'].includes(m.status);}catch(_){return false;}}
function hasExternalMention(text,entities,chatMembers){
  if(!entities)return false;
  return entities.some(function(e){return e.type==='mention';});
}
function isPromoSpam(text){
  var t=text.toLowerCase();
  var promoWords=['dm me','dm:','t.me/','join our','join now','pump call','100x','1000x','send me','contact me','legitimate','serious project','long-term promo','promotion','signal','call group','whale','airdrop only','giveaway','free token'];
  return promoWords.some(function(w){return t.includes(w);});
}
bot.on('message',async function(ctx){
  var msg=ctx.message;if(!msg||!ctx.from)return;
  var uid=ctx.from.id,isPrivate=ctx.chat.type==='private';
  var text=(msg.text||msg.caption||'').trim();
  if(!isPrivate&&groupChatId!==ctx.chat.id){groupChatId=ctx.chat.id;saveState();if(parseInt(SIL_DELAY||'0')>0){try{resetSil();}catch(_){}}try{schedShout();}catch(_){}}
  if(!isPrivate)resetSil();
  var admin=await isAdmin(ctx,uid);
  if(!isPrivate){
    var isForward=msg.forward_from||msg.forward_sender_name||msg.forward_from_chat||msg.forward_from_message_id;
    if(isForward&&!admin){try{await ctx.deleteMessage();}catch(_){}var wf=await ctx.reply('\u26A0\uFE0F No forwarded messages.');autoDel(ctx.chat.id,wf.message_id,8000);return;}
    if(text&&hasExternalMention(text,msg.entities)&&!admin){
      var allMentions=msg.entities.filter(function(e){return e.type==='mention';}).map(function(e){return text.substr(e.offset,e.length);});
      var isExternal=allMentions.some(function(m){return m.toLowerCase()!=='@'+ctx.botInfo.username.toLowerCase();});
      if(isExternal){try{await ctx.deleteMessage();}catch(_){}var wm2=await ctx.reply('\u26A0\uFE0F No external mentions or promotions.');autoDel(ctx.chat.id,wm2.message_id,8000);return;}
    }
    if(text&&isPromoSpam(text)&&!admin){try{await ctx.deleteMessage();}catch(_){}var wps=await ctx.reply('\u26A0\uFE0F Promotional content removed.');autoDel(ctx.chat.id,wps.message_id,8000);return;}
    if(text&&hasFud(text)&&!admin)return applyStrike(ctx,uid,'no FUD');
    if(text&&!admin){var sp=await checkSpam(ctx,uid);if(sp)return;}
  }
  if(admin&&!isPrivate){
    if(!text)return;
    var lower=text.toLowerCase();
    var caW=['ca','contract address','contract','token address'];
    if(caW.some(function(w){return lower===w||lower.includes(w);})){
      if(!caUnlocked)return ctx.reply(NOT_LIVE[Math.floor(Math.random()*NOT_LIVE.length)]);
      await sendWithTracker(caMsg,ctx.chat.id,'$WCAS Contract Address',{});return ctx.reply('<code>'+CA+'</code>',{parse_mode:'HTML'});
    }
    if(lower==='x'||lower==='twitter')return sendWithTracker(xMsg,ctx.chat.id,'Follow $WCAS on X',{reply_markup:{inline_keyboard:[[{text:'Follow on X',url:TWITTER}]]}});
    if(lower==='socials'||lower==='links')return ctx.reply('<a href=\'https://dexscreener.com/bsc/TBA\'> Chart</a> | <a href=\'https://pancakeswap.finance/swap?outputCurrency=TBA\'> PancakeSwap</a>'+(TWITTER?' | <a href=\''+TWITTER+'\'>Twitter</a>':''),{parse_mode:'HTML',disable_web_page_preview:true});
    return;
  }
  if(!text)return;
  var lower2=text.toLowerCase();
  addHistory(text);
  if(lower2.includes('dev')||lower2.includes('cto')||lower2.includes('community takeover')||lower2.includes('who run')||lower2.includes('who own')){
    if(IS_CTO)return ctx.reply(CTO_REPLIES[Math.floor(Math.random()*CTO_REPLIES.length)]);
    try{var dr=await smartAsk(chatHistory.join('\n'));if(dr&&dr!=='IGNORE')return ctx.reply(dr);}catch(_){}return;
  }
  var caWords=['ca','contract address','token address','where is the ca','give ca','show ca','drop ca','contract'];
  if(caWords.some(function(w){return lower2===w||lower2.includes(w);})){
    if(!caUnlocked)return ctx.reply(NOT_LIVE[Math.floor(Math.random()*NOT_LIVE.length)]);
    await sendWithTracker(caMsg,ctx.chat.id,'$WCAS Contract Address',{});return ctx.reply('<code>'+CA+'</code>',{parse_mode:'HTML'});
  }
  if(lower2==='x'||lower2==='twitter'||lower2.includes('follow on'))return sendWithTracker(xMsg,ctx.chat.id,'Follow $WCAS on X',{reply_markup:{inline_keyboard:[[{text:'Follow on X',url:TWITTER}]]}});
  if(lower2==='socials'||lower2==='links')return ctx.reply('<a href=\'https://dexscreener.com/bsc/TBA\'> Chart</a> | <a href=\'https://pancakeswap.finance/swap?outputCurrency=TBA\'> PancakeSwap</a>'+(TWITTER?' | <a href=\''+TWITTER+'\'>Twitter</a>':''),{parse_mode:'HTML',disable_web_page_preview:true});
  if(isPrivate){try{var gr=await smartAsk(chatHistory.join('\n'));if(gr&&gr!=='IGNORE')return ctx.reply(gr);}catch(_){}return;}
  if(RESPONSE_MODE==='focused'){if(text.indexOf('?')===-1)return;try{var gr2=await smartAsk(chatHistory.join('\n'));if(gr2&&gr2!=='IGNORE')return ctx.reply(gr2);}catch(_){}return;}
  var tkLow=TICKER.toLowerCase().replace('$','');
  if(text.indexOf('?')!==-1||lower2.includes(tkLow)){try{var gr3=await smartAsk(chatHistory.join('\n'));if(gr3&&gr3!=='IGNORE')return ctx.reply(gr3);}catch(_){}}
});
function isPromoSpam(text){var t=text.toLowerCase();var pw=['dm me','dm:','t.me/','join our','join now','pump call','100x','1000x','send me','contact me','legitimate','long-term promo','promotion','signal','call group','whale','airdrop only','giveaway','free token'];return pw.some(function(w){return t.includes(w);});}
bot.on('message',async function(ctx){
  var msg=ctx.message;if(!msg||!ctx.from)return;
  var uid=ctx.from.id,isPrivate=ctx.chat.type==='private';
  var text=(msg.text||msg.caption||'').trim();
  if(!isPrivate&&groupChatId!==ctx.chat.id){groupChatId=ctx.chat.id;saveState();if(parseInt(SIL_DELAY||'0')>0){try{resetSil();}catch(_){}}try{schedShout();}catch(_){}}
  var admin=await isAdmin(ctx,uid);
  if(!isPrivate&&!admin){
    var isFwd=msg.forward_from||msg.forward_sender_name||msg.forward_from_chat||msg.forward_from_message_id;
    if(isFwd){try{await ctx.deleteMessage();}catch(_){}var wf=await ctx.reply('\u26A0\uFE0F No forwarded messages.');autoDel(ctx.chat.id,wf.message_id,8000);return;}
    if(text&&msg.entities){
      var mentions=msg.entities.filter(function(e){return e.type==='mention';});
      if(mentions.length>0){try{await ctx.deleteMessage();}catch(_){}var wm=await ctx.reply('\u26A0\uFE0F No external mentions or promotions.');autoDel(ctx.chat.id,wm.message_id,8000);return;}
    }
    if(text&&isPromoSpam(text)){try{await ctx.deleteMessage();}catch(_){}var wps=await ctx.reply('\u26A0\uFE0F Promotional content removed.');autoDel(ctx.chat.id,wps.message_id,8000);return;}
    if(text&&hasFud(text))return applyStrike(ctx,uid,'no FUD');
    var sp=await checkSpam(ctx,uid);if(sp)return;
  }
  if(admin&&!isPrivate){
    if(!text)return;var lower=text.toLowerCase();
    var caW=['ca','contract address','contract','token address'];
    if(caW.some(function(w){return lower===w||lower.includes(w);})){if(!caUnlocked)return ctx.reply(NOT_LIVE[Math.floor(Math.random()*NOT_LIVE.length)]);await sendWithTracker(caMsg,ctx.chat.id,'$WCAS Contract Address',{});return ctx.reply('<code>'+CA+'</code>',{parse_mode:'HTML'});}
    if(lower==='x'||lower==='twitter')return sendWithTracker(xMsg,ctx.chat.id,'Follow $WCAS on X',{reply_markup:{inline_keyboard:[[{text:'Follow on X',url:TWITTER}]]}});
    return;
  }
  if(!text)return;var lower2=text.toLowerCase();
  if(lower2.includes('dev')||lower2.includes('cto')||lower2.includes('who run')||lower2.includes('who own')){if(IS_CTO)return ctx.reply(CTO_REPLIES[Math.floor(Math.random()*CTO_REPLIES.length)]);return ctx.reply('Dev is active and building.');}
  var caWg=['ca','contract address','token address','where is the ca','give ca','show ca','drop ca','contract'];
  if(caWg.some(function(w){return lower2===w||lower2.includes(w);})){if(!caUnlocked)return ctx.reply(NOT_LIVE[Math.floor(Math.random()*NOT_LIVE.length)]);await sendWithTracker(caMsg,ctx.chat.id,'$WCAS Contract Address',{});return ctx.reply('<code>'+CA+'</code>',{parse_mode:'HTML'});}
  if(lower2==='x'||lower2==='twitter')return sendWithTracker(xMsg,ctx.chat.id,'Follow $WCAS on X',{reply_markup:{inline_keyboard:[[{text:'Follow on X',url:TWITTER}]]}});
  if(lower2.includes('tax'))return ctx.reply('Tax: 0% buy / 0% sell');
  if(lower2.includes('supply'))return ctx.reply('Supply: N/A');
});
app.post('/webhook',function(req,res){bot.handleUpdate(req.body,res);});
app.get('/',function(req,res){res.end('OK');});
app.get('/health',function(req,res){res.end('OK');});
async function regWH(){if(!WEBHOOK_URL)return;var url=WEBHOOK_URL+'/webhook';for(var i=0;i<5;i++){try{if(await bot.telegram.setWebhook(url)){console.log('Webhook:',url);return;}}catch(e){console.log('WH '+(i+1)+':',e.message);}await new Promise(function(r){setTimeout(r,3000);});}}
process.on('uncaughtException',function(e){console.error(e.message);});
process.on('unhandledRejection',function(e){console.error(e&&e.message);});
app.listen(PORT,async function(){console.log('$WCAS bot port '+PORT);try{await new Promise(function(r){setTimeout(r,2000);});}catch(_){}try{await regWH();}catch(e){console.log(e.message);}if(parseInt(SIL_DELAY||'0')>0)try{resetSil();}catch(_){}try{schedShout();}catch(_){}setInterval(function(){if(WEBHOOK_URL)try{fetch(WEBHOOK_URL+'/health').catch(function(){});}catch(_){}},4*60*1000);console.log('$WCAS bot live');});