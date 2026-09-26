"use strict";

if (typeof vkBridge !== "undefined") {
  vkBridge.send("VKWebAppInit").catch(function(){});
}

/* ============================================================
   КОНСТАНТЫ
============================================================ */
var VIRTUAL_W = 400;
var VIRTUAL_H = 700;
var PLATFORM_W = 68;
var PLATFORM_H = 12;
var PLAYER_W = 30;
var PLAYER_H = 34;
var GRAVITY = 1250;
var JUMP_FORCE = -720;
var SPRING_FORCE = -1150;
var PROPELLER_DUR = 1.5;
var MOVE_SPEED = 340;
var MAX_VEL = 700;
var START_SHIELD_TIME = 3.0;
var SAVE_KEY = "neon_jump_save_v3";

/* ============================================================
   ТЕМА
============================================================ */
var THEME = {
  bg:["#0a0025","#1a0033","#2a0044"],
  stars:["#a8f7ff","#ff9cf5","#ffe56b","#8fffcf"],
  platformColors:{
    normal:"#00e5ff", moving:"#ff00e5", fragile:"#ffe56b",
    once:"#ffffff", spring:"#00ff88", propeller:"#ff8800", rocket:"#ff0044"
  },
  enemy:"#ff3366",
  ufo:"#00ff88"
};

/* ============================================================
   СКИНЫ
============================================================ */
var SKINS = {
  cat:      { name:"Котёнок",     emoji:"🐱", price:0,    owned:true,  color:"#ffa64d", accent:"#ffcc99", eye:"#1a1a2e" },
  cat_black:{ name:"Чёрный кот",  emoji:"🐈", price:200,  owned:false, color:"#555566", accent:"#8888aa", eye:"#ffe56b" },
  frog:     { name:"Лягушка",     emoji:"🐸", price:300,  owned:false, color:"#4dd966", accent:"#aaffbb", eye:"#1a1a2e" },
  penguin:  { name:"Пингвин",     emoji:"🐧", price:400,  owned:false, color:"#334455", accent:"#ffffff", eye:"#1a1a2e" },
  robot:    { name:"Робот",       emoji:"🤖", price:600,  owned:false, color:"#a0a0c0", accent:"#00e5ff", eye:"#00e5ff" },
  alien:    { name:"Пришелец",    emoji:"👽", price:800,  owned:false, color:"#7dff7d", accent:"#00ff44", eye:"#000000" },
  ghost:    { name:"Призрак",     emoji:"👻", price:1000, owned:false, color:"#ddddff", accent:"#aaaaff", eye:"#4444aa" },
  ninja:    { name:"Ниндзя",      emoji:"🥷", price:1500, owned:false, color:"#3a3a5a", accent:"#ff3366", eye:"#ffffff" },
  wizard:   { name:"Маг",         emoji:"🧙", price:2000, owned:false, color:"#8855ff", accent:"#ffdd44", eye:"#1a1a2e" },
  dragon:   { name:"Дракон",      emoji:"🐲", price:3000, owned:false, color:"#22aa55", accent:"#ff5522", eye:"#ffe56b" }
};

/* ============================================================
   АЧИВКИ
============================================================ */
var ACHS = {
  first_jump:{ name:"Первый прыжок",   reward:10,  check:function(s){ return s.bestHeight >= 10; } },
  height_100:{ name:"100 метров",      reward:30,  check:function(s){ return s.bestHeight >= 100; } },
  height_500:{ name:"500 метров",      reward:80,  check:function(s){ return s.bestHeight >= 500; } },
  height_1000:{ name:"Космонавт",      reward:200, check:function(s){ return s.bestHeight >= 1000; } },
  height_5000:{ name:"За облаками",    reward:500, check:function(s){ return s.bestHeight >= 5000; } },
  games_10:{ name:"Задрот",            reward:50,  check:function(s){ return s.gamesPlayed >= 10; } },
  games_50:{ name:"Марафонец",         reward:250, check:function(s){ return s.gamesPlayed >= 50; } },
  kills_10:{ name:"Охотник",           reward:40,  check:function(s){ return s.totalKills >= 10; } },
  kills_100:{ name:"Космический воин", reward:200, check:function(s){ return s.totalKills >= 100; } },
  coins_100:{ name:"Богач",            reward:50,  check:function(s){ return s.coins >= 100; } },
  coins_1000:{ name:"Миллионер",       reward:300, check:function(s){ return s.coins >= 1000; } },
  spring_20:{ name:"Пружинки",         reward:60,  check:function(s){ return s.springsUsed >= 20; } },
  rocket_used:{ name:"Ракета!",        reward:100, check:function(s){ return s.rocketsUsed >= 1; } },
  combo_5:{ name:"Комбо x5",           reward:80,  check:function(s){ return s.maxCombo >= 5; } },
  all_skins:{ name:"Коллекционер",     reward:1000,check:function(s){ return false; } }
};

/* ============================================================
   СОСТОЯНИЕ
============================================================ */
var G = {
  w:0, h:0, scale:1, offX:0, offY:0, dpr:1,
  state:"menu",
  score:0, best:0, coins:0, gamesPlayed:0,
  totalKills:0, springsUsed:0, rocketsUsed:0, bestHeight:0,
  maxCombo:0, combo:0, comboTimer:0,
  skin:"cat",
  gyroEnabled:false, gyroPermission:false, gyroValue:0,
  camY:0,
  player:{ x:200, y:0, vx:0, vy:0, dir:1, anim:0, onPropeller:0, trail:[],
           squash:1, blinkTimer:2, blinkState:0, earFlick:0 },
  platforms:[], enemies:[], ufos:[], particles:[], floatTexts:[],
  bgStars1:[], bgStars2:[], bgStars3:[], nebulas:[],
  lastPlatformY:0, maxYReached:0,
  magnetTimer:0, shieldTimer:0, slowTimer:0, multiTimer:0,
  shield:false, multi:1, startShield:0,
  shakeTime:0, shakeInt:0, flashTimer:0, flashColor:"#ffffff",
  chromaTimer:0,
  keys:{}, touchX:null, usingTouch:false,
  lastTime:0, running:false,
  timeScale:1
};

/* ============================================================
   УТИЛИТЫ
============================================================ */
function rand(a,b){ return a + Math.random()*(b-a); }
function randi(a,b){ return Math.floor(rand(a,b+1)); }
function pick(a){ return a[randi(0,a.length-1)]; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
function easeOut(t){ return 1 - Math.pow(1-t, 3); }
function hexRgb(h){
  if(h.indexOf("rgb")===0){
    var m = h.match(/rgba?\(([^)]+)\)/)[1].split(",");
    return { r:parseFloat(m[0]), g:parseFloat(m[1]), b:parseFloat(m[2]), a:m[3]!==undefined?parseFloat(m[3]):1 };
  }
  h = h.replace("#","");
  if(h.length===3) h = h.split("").map(function(c){return c+c;}).join("");
  return { r:parseInt(h.substr(0,2),16), g:parseInt(h.substr(2,2),16), b:parseInt(h.substr(4,2),16), a:1 };
}
function rgbStr(r,g,b,a){
  if(a===undefined) a=1;
  if(a>=1) return "rgb("+(r|0)+","+(g|0)+","+(b|0)+")";
  return "rgba("+(r|0)+","+(g|0)+","+(b|0)+","+a+")";
}
function withAlpha(hex,a){ var c=hexRgb(hex); return rgbStr(c.r,c.g,c.b,a); }

/* ============================================================
   CANVAS
============================================================ */
var cvBg = document.getElementById("cv-bg");
var cvFx = document.getElementById("cv-fx");
var cv   = document.getElementById("cv");
var ctxBg = cvBg.getContext("2d");
var ctxFx = cvFx.getContext("2d");
var ctx   = cv.getContext("2d");

function $(id){ return document.getElementById(id); }

/* ============================================================
   СОХРАНЕНИЕ
============================================================ */
function saveGame(){
  var skinsOwned = {};
  for(var k in SKINS) skinsOwned[k] = SKINS[k].owned;
  var achUnlocked = {};
  for(var k in ACHS) achUnlocked[k] = !!ACHS[k].unlocked;
  var data = {
    best:G.best, coins:G.coins, gamesPlayed:G.gamesPlayed,
    totalKills:G.totalKills, springsUsed:G.springsUsed, rocketsUsed:G.rocketsUsed,
    bestHeight:G.bestHeight, maxCombo:G.maxCombo, skin:G.skin,
    skins:skinsOwned, achievements:achUnlocked
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e){}
  if (typeof vkBridge !== "undefined") {
    vkBridge.send("VKWebAppStorageSet", { key:SAVE_KEY, value:JSON.stringify(data) }).catch(function(){});
  }
}
function applySave(d){
  if(!d) return;
  G.best = d.best||0; G.coins = d.coins||0;
  G.gamesPlayed = d.gamesPlayed||0;
  G.totalKills = d.totalKills||0;
  G.springsUsed = d.springsUsed||0;
  G.rocketsUsed = d.rocketsUsed||0;
  G.bestHeight = d.bestHeight||0;
  G.maxCombo = d.maxCombo||0;
  G.skin = d.skin||"cat";
  if(d.skins) for(var k in SKINS) if(d.skins[k]!==undefined) SKINS[k].owned = !!d.skins[k];
  if(d.achievements) for(var k in ACHS) if(d.achievements[k]!==undefined) ACHS[k].unlocked = !!d.achievements[k];
  updateUI();
}
function loadGame(){
  var raw; try { raw = localStorage.getItem(SAVE_KEY); } catch(e){}
  if(raw){ try { applySave(JSON.parse(raw)); } catch(e){} }
  if (typeof vkBridge !== "undefined") {
    vkBridge.send("VKWebAppStorageGet", { keys:[SAVE_KEY] })
      .then(function(resp){
        var items = (resp && resp.keys) || [];
        if (items.length && items[0].value) {
          try { applySave(JSON.parse(items[0].value)); } catch(e){}
        }
      }).catch(function(){});
  }
}

/* ============================================================
   ЗВУК
============================================================ */
var audioCtx = null;
function ensureAudio(){
  if(audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
}
function beep(freq, dur, type, gain){
  ensureAudio(); if(!audioCtx) return;
  var osc = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  osc.type = type || "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain || 0.06, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}
function playJump(){ beep(520 + Math.random()*80, 0.08, "sine", 0.05); }
function playSpring(){ beep(880, 0.18, "sine", 0.08); }
function playKill(){ beep(220, 0.14, "triangle", 0.1); }
function playDeath(){
  ensureAudio(); if(!audioCtx) return;
  var o = audioCtx.createOscillator(); var g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(400, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.6);
  g.gain.setValueAtTime(0.12, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.6);
}
function playRecord(){
  ensureAudio(); if(!audioCtx) return;
  [600, 900, 1300].forEach(function(f, i){
    setTimeout(function(){
      var o = audioCtx.createOscillator(); var g = audioCtx.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.12, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + 0.25);
    }, i * 90);
  });
}

/* ============================================================
   РАЗМЕРЫ
============================================================ */
function onResize(){
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.dpr = dpr;
  var w1 = window.innerWidth || document.documentElement.clientWidth || 400;
  var h1 = window.innerHeight || document.documentElement.clientHeight || 700;
  if(w1 < 100 && window.parent){ try { w1 = window.parent.innerWidth || w1; } catch(e){} }
  if(h1 < 100 && window.parent){ try { h1 = window.parent.innerHeight || h1; } catch(e){} }
  G.w = w1 || 400; G.h = h1 || 700;
  if(G.w < 100) G.w = 400;
  if(G.h < 100) G.h = 700;

  [cvBg, cvFx, cv].forEach(function(c){
    c.width = G.w * dpr;
    c.height = G.h * dpr;
    c.style.width = G.w + "px";
    c.style.height = G.h + "px";
  });
  ctxBg.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctxFx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  var scale = Math.min(G.w / VIRTUAL_W, G.h / VIRTUAL_H);
  G.scale = scale;
  G.offX = (G.w - VIRTUAL_W * scale) * 0.5;
  G.offY = (G.h - VIRTUAL_H * scale) * 0.5;
  generateBackground();
}

function generateBackground(){
  G.bgStars1 = []; G.bgStars2 = []; G.bgStars3 = [];
  for(var i=0;i<70;i++) G.bgStars1.push({ x:rand(0,G.w), y:rand(0,G.h*4), size:rand(0.5,1.2), phase:rand(0,6.28), speed:rand(0.3,0.8), color:pick(THEME.stars) });
  for(var i=0;i<55;i++) G.bgStars2.push({ x:rand(0,G.w), y:rand(0,G.h*3), size:rand(1,2), phase:rand(0,6.28), speed:rand(0.5,1.2), color:pick(THEME.stars) });
  for(var i=0;i<40;i++) G.bgStars3.push({ x:rand(0,G.w), y:rand(0,G.h*2.5), size:rand(1.5,2.8), phase:rand(0,6.28), speed:rand(0.8,1.8), color:pick(THEME.stars) });
  G.nebulas = [];
  for(var i=0;i<6;i++){
    G.nebulas.push({
      x:rand(0,G.w), y:rand(0,G.h*2),
      radius:rand(180,340),
      color:pick(["#00e5ff","#ff00e5","#8855ff","#00ff88"]),
      phase:rand(0,6.28)
    });
  }
}

function worldToScreen(x, y){
  return { x: G.offX + x * G.scale, y: G.offY + (y - G.camY) * G.scale };
}
function screenToWorldX(sx){ return (sx - G.offX) / G.scale; }

/* ============================================================
   ФОН (отдельный canvas с анимацией)
============================================================ */
function renderBackground(t){
  var w = G.w, h = G.h;
  // Градиент
  var grad = ctxBg.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, THEME.bg[0]);
  grad.addColorStop(0.5, THEME.bg[1]);
  grad.addColorStop(1, THEME.bg[2]);
  ctxBg.fillStyle = grad;
  ctxBg.fillRect(0, 0, w, h);

  // Nebulas (волны)
  for(var i=0;i<G.nebulas.length;i++){
    var n = G.nebulas[i];
    var ny = (n.y - G.camY * 0.12) % (h * 2);
    if(ny < -350) ny += h * 2;
    var pulse = 1 + Math.sin(t * 0.4 + n.phase) * 0.15;
    var col = hexRgb(n.color);
    for(var k=0;k<3;k++){
      var rr = n.radius * pulse * (1 - k*0.25);
      var aa = 0.05 + k * 0.02;
      ctxBg.fillStyle = rgbStr(col.r, col.g, col.b, aa);
      ctxBg.beginPath();
      ctxBg.arc(n.x, ny, rr, 0, 6.283);
      ctxBg.fill();
    }
  }

  // Параллакс-звёзды
  drawStarLayer(ctxBg, G.bgStars1, 0.15, t, h);
  drawStarLayer(ctxBg, G.bgStars2, 0.3, t, h);
  drawStarLayer(ctxBg, G.bgStars3, 0.55, t, h);

  // Верхний градиент (vignette)
  var vg = ctxBg.createRadialGradient(w*0.5, h*0.4, Math.min(w,h)*0.3, w*0.5, h*0.5, Math.max(w,h)*0.8);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctxBg.fillStyle = vg;
  ctxBg.fillRect(0, 0, w, h);
}

function drawStarLayer(c, arr, parallax, t, h){
  for(var i=0;i<arr.length;i++){
    var s = arr[i];
    var sy = (s.y - G.camY * parallax) % (h * 4);
    if(sy < -50) sy += h * 4;
    if(sy > h + 50) sy -= h * 4;
    var alpha = 0.4 + Math.sin(t * s.speed + s.phase) * 0.4;
    var col = hexRgb(s.color);
    c.fillStyle = rgbStr(col.r, col.g, col.b, alpha * parallax * 1.8);
    // Ядро
    c.fillRect(s.x, sy, s.size, s.size);
    // Свечение (большие звёзды)
    if(s.size > 1.5){
      c.fillStyle = rgbStr(col.r, col.g, col.b, alpha * parallax * 0.4);
      c.beginPath();
      c.arc(s.x, sy, s.size * 3, 0, 6.283);
      c.fill();
    }
  }
}

/* ============================================================
   СТАРТ
============================================================ */
function startGame(){
  G.state = "playing";
  G.score = 0;
  G.camY = 0;
  G.platforms = []; G.enemies = []; G.ufos = [];
  G.particles = []; G.floatTexts = [];
  G.maxYReached = 0;
  G.shakeTime = 0; G.shakeInt = 0; G.flashTimer = 0;
  G.chromaTimer = 0;
  G.magnetTimer = 0; G.shieldTimer = 0; G.slowTimer = 0; G.multiTimer = 0;
  G.shield = false; G.multi = 1;
  G.startShield = START_SHIELD_TIME;
  G.combo = 0; G.comboTimer = 0;

  G.player.x = VIRTUAL_W * 0.5;
  G.player.y = VIRTUAL_H * 0.7;
  G.player.vx = 0; G.player.vy = 0;
  G.player.dir = 1;
  G.player.onPropeller = 0;
  G.player.trail = [];
  G.player.squash = 1;
  G.player.blinkTimer = 2;
  G.player.blinkState = 0;
  G.player.earFlick = 0;

  G.platforms.push(makePlatform(VIRTUAL_W*0.5 - PLATFORM_W*0.5, G.player.y + PLAYER_H*0.5, "normal"));
  G.lastPlatformY = G.platforms[0].y;

  for(var i=0;i<18;i++) generateNextPlatform();
  hideOver();
  updateUI();
}

function makePlatform(x, y, type){
  return {
    x:x, y:y, type:type, vx:0,
    broken:false, used:false,
    hasSpring:false, hasPropeller:false, hasRocket:false,
    springUsed:false, propUsed:false, rocketUsed:false,
    pulse: Math.random() * 6.28
  };
}

function generateNextPlatform(){
  var difficulty = clamp(-G.lastPlatformY / 3500, 0, 1);
  var minGap = lerp(65, 78, difficulty);
  var maxGap = lerp(95, 115, difficulty);
  var y = G.lastPlatformY - rand(minGap, maxGap);
  G.lastPlatformY = y;

  var roll = Math.random();
  var type = "normal";
  var vx = 0;
  if(roll < 0.55 - difficulty*0.15) type = "normal";
  else if(roll < 0.75 - difficulty*0.1) type = "moving";
  else if(roll < 0.88) type = "fragile";
  else if(roll < 0.96) type = "once";
  else type = "normal";

  if(type === "moving") vx = (Math.random() < 0.5 ? -1 : 1) * rand(30, 65);

  var x = rand(15, VIRTUAL_W - PLATFORM_W - 15);
  var pl = makePlatform(x, y, type);
  pl.vx = vx;
  pl.hasSpring = (Math.random() < 0.14);
  pl.hasPropeller = (Math.random() < 0.05);
  pl.hasRocket = (Math.random() < 0.02);
  G.platforms.push(pl);

  if(G.platforms.length > 12 && Math.random() < 0.10){
    if(Math.random() < 0.35){
      G.ufos.push({
        x: rand(40, VIRTUAL_W-40), y: y - 70,
        vx: (Math.random() < 0.5 ? -1 : 1) * rand(50, 90),
        baseY: y - 70, phase: Math.random() * 6.28
      });
    } else {
      G.enemies.push({
        x: x + PLATFORM_W*0.5 - 14, y: y - 34,
        w:28, h:32, anim: Math.random() * 10
      });
    }
  }
}

/* ============================================================
   UPDATE
============================================================ */
function update(dt){
  var t = performance.now() * 0.001;
  G.player.anim += dt;

  if(G.state === "playing"){
    var realDt = dt;
    updatePlayer(dt, t);
    updatePlatforms(dt, t);
    updateEnemies(dt);
    updateUfos(dt, t);
    updatePowerups(dt);
    updateCamera(realDt);
    checkCollisions();
    generateAhead();
    cleanupBehind();
  }

  updateParticles(dt);
  updateFloatTexts(dt);

  if(G.shakeTime > 0){ G.shakeTime -= dt; G.shakeInt *= 0.88; }
  if(G.flashTimer > 0) G.flashTimer -= dt * 2;
  if(G.chromaTimer > 0) G.chromaTimer -= dt * 2;
}

function updatePlayer(dt, t){
  var p = G.player;
  var ax = 0;
  var usingGyro = G.gyroEnabled && G.gyroPermission;

  if(G.usingTouch && G.touchX !== null){
    var targetVX = (G.touchX - p.x) * 8;
    targetVX = clamp(targetVX, -MOVE_SPEED, MOVE_SPEED);
    ax = (targetVX - p.vx) * 12;
  } else if(usingGyro){
    ax = -G.gyroValue * MOVE_SPEED * 8;
    ax = clamp(ax, -MOVE_SPEED*4, MOVE_SPEED*4);
  } else if(G.keys["ArrowLeft"] || G.keys["a"] || G.keys["A"]){
    ax = -MOVE_SPEED * 7;
  } else if(G.keys["ArrowRight"] || G.keys["d"] || G.keys["D"]){
    ax = MOVE_SPEED * 7;
  }

  p.vx += ax * dt;
  p.vx *= Math.pow(0.86, dt * 60);
  p.vx = clamp(p.vx, -MAX_VEL, MAX_VEL);
  p.x += p.vx * dt;

  if(p.x < -PLAYER_W) p.x = VIRTUAL_W + PLAYER_W;
  if(p.x > VIRTUAL_W + PLAYER_W) p.x = -PLAYER_W;

  if(p.vx > 25) p.dir = 1;
  else if(p.vx < -25) p.dir = -1;

  // Моргание
  p.blinkTimer -= dt;
  if(p.blinkState === 0 && p.blinkTimer <= 0){
    p.blinkState = 1;
    p.blinkTimer = 0.1;
  } else if(p.blinkState === 1 && p.blinkTimer <= 0){
    p.blinkState = 0;
    p.blinkTimer = rand(2.5, 5);
  }

  // Дёрганье ушей при прыжке
  if(p.vy < -400) p.earFlick = 0.3;
  if(p.earFlick > 0) p.earFlick -= dt;

  // Пропеллер
  if(p.onPropeller > 0){
    p.onPropeller -= dt;
    p.vy = -700;
    if(Math.random() < 0.7){
      spawnParticles(p.x + rand(-8,8), p.y + 14, THEME.platformColors.propeller, 1);
    }
  } else {
    p.vy += GRAVITY * dt;
    if(p.vy > 1600) p.vy = 1600;
  }
  p.y += p.vy * dt;

  // Squash-stretch
  var targetSquash = 1;
  if(p.vy < -200) targetSquash = 1.15;
  else if(p.vy > 400) targetSquash = 0.85;
  p.squash = lerp(p.squash, targetSquash, dt * 10);

  // Трейл
  if(Math.random() < 0.7){
    p.trail.push({
      x:p.x + rand(-5,5), y:p.y + rand(-5,5),
      life:0.5, maxLife:0.5,
      color: SKINS[G.skin].color,
      size: rand(3,6)
    });
  }
  for(var i=p.trail.length-1;i>=0;i--){
    p.trail[i].life -= dt;
    if(p.trail[i].life <= 0) p.trail.splice(i,1);
  }
  if(p.trail.length > 40) p.trail.splice(0, p.trail.length - 40);

  var bottomWorldY = G.camY + VIRTUAL_H + 60;
  if(p.y > bottomWorldY){ die("Упал в бездну"); return; }

  var height = Math.max(0, -p.y + VIRTUAL_H * 0.7);
  var newScore = Math.floor(height / 10);
  if(newScore > G.score){
    G.score = newScore;
    if(G.score > G.best){ G.best = G.score; updateUI(); }
  }
  G.maxYReached = Math.min(G.maxYReached, p.y);

  if(G.startShield > 0) G.startShield -= dt;
  if(G.comboTimer > 0){
    G.comboTimer -= dt;
    if(G.comboTimer <= 0) G.combo = 0;
  }
}

function updatePlatforms(dt){
  for(var i=0;i<G.platforms.length;i++){
    var pl = G.platforms[i];
    pl.pulse += dt * 2;
    if(pl.type === "moving"){
      pl.x += pl.vx * dt;
      if(pl.x < 8){ pl.x = 8; pl.vx *= -1; }
      if(pl.x + PLATFORM_W > VIRTUAL_W - 8){ pl.x = VIRTUAL_W - 8 - PLATFORM_W; pl.vx *= -1; }
    }
  }
}
function updateEnemies(dt){ for(var i=0;i<G.enemies.length;i++) G.enemies[i].anim += dt * 4; }
function updateUfos(dt, t){
  for(var i=0;i<G.ufos.length;i++){
    var u = G.ufos[i];
    u.x += u.vx * dt;
    if(u.x < 30){ u.x = 30; u.vx *= -1; }
    if(u.x > VIRTUAL_W - 30){ u.x = VIRTUAL_W - 30; u.vx *= -1; }
    u.y = u.baseY + Math.sin(t * 3 + u.phase) * 10;
  }
}
function updatePowerups(dt){
  if(G.magnetTimer > 0) G.magnetTimer -= dt;
  if(G.shieldTimer > 0) G.shieldTimer -= dt;
  if(G.slowTimer > 0) G.slowTimer -= dt;
  if(G.multiTimer > 0) G.multiTimer -= dt;
  if(G.shieldTimer <= 0) G.shield = false;
  if(G.multiTimer <= 0) G.multi = 1;
}
function updateCamera(dt){
  var targetY = G.player.y - VIRTUAL_H * 0.55;
  if(targetY < G.camY) G.camY = lerp(G.camY, targetY, dt * 6);
}

function checkCollisions(){
  var p = G.player;

  if(p.vy > 0){
    for(var i=0;i<G.platforms.length;i++){
      var pl = G.platforms[i];
      if(pl.broken) continue;
      var plTop = pl.y;
      var plLeft = pl.x, plRight = pl.x + PLATFORM_W;
      var pBottom = p.y + PLAYER_H * 0.5;
      var pLeft = p.x - PLAYER_W * 0.4;
      var pRight = p.x + PLAYER_W * 0.4;
      if(pBottom >= plTop && pBottom <= plTop + 22){
        if(pRight > plLeft && pLeft < plRight){
          var hitL = Math.max(pLeft, plLeft);
          var hitR = Math.min(pRight, plRight);
          if(hitR - hitL > 6){ handleLanding(pl); break; }
        }
      }
    }
  }

  for(var i=G.enemies.length-1;i>=0;i--){
    var e = G.enemies[i];
    var dx = Math.abs(p.x - (e.x + e.w*0.5));
    var dy = Math.abs(p.y - (e.y + e.h*0.5));
    if(dx < (PLAYER_W*0.5 + e.w*0.5)*0.75 && dy < (PLAYER_H*0.5 + e.h*0.5)*0.75){
      if(p.vy > 0 && p.y + PLAYER_H*0.5 < e.y + e.h*0.5){
        G.enemies.splice(i,1);
        G.totalKills++;
        p.vy = JUMP_FORCE * 1.05;
        burstEnemy(e.x+e.w*0.5, e.y+e.h*0.5, THEME.enemy);
        spawnFloatText(e.x+e.w*0.5, e.y, "+50", "#ffe56b");
        G.score += 50; addCoins(5);
        playKill(); shake(0.15, 5); addCombo();
        saveGame(); checkAchievements();
      } else if(G.shield || G.startShield > 0){
        if(G.shield){ G.shield = false; G.shieldTimer = 0; }
        else G.startShield = 0;
        G.enemies.splice(i,1);
        burstEnemy(e.x+e.w*0.5, e.y+e.h*0.5, "#00ff88");
        spawnFloatText(e.x+e.w*0.5, e.y, "ЩИТ!", "#8fffcf");
        playKill();
      } else { die("Съеден монстром"); return; }
    }
  }

  for(var i=G.ufos.length-1;i>=0;i--){
    var u = G.ufos[i];
    var dx = Math.abs(p.x - u.x);
    var dy = Math.abs(p.y - u.y);
    if(dx < PLAYER_W*0.5 + 22 && dy < PLAYER_H*0.5 + 16){
      if(p.vy > 0 && p.y + PLAYER_H*0.5 < u.y + 4){
        G.ufos.splice(i,1);
        G.totalKills++;
        p.vy = JUMP_FORCE * 1.05;
        burstEnemy(u.x, u.y, THEME.ufo);
        spawnFloatText(u.x, u.y, "+100", "#8fffcf");
        G.score += 100; addCoins(10);
        playKill(); shake(0.2, 7); addCombo();
        saveGame(); checkAchievements();
      } else if(G.shield || G.startShield > 0){
        if(G.shield){ G.shield = false; G.shieldTimer = 0; }
        else G.startShield = 0;
        G.ufos.splice(i,1);
        burstEnemy(u.x, u.y, "#00ff88");
      } else { die("Сбит НЛО"); return; }
    }
  }
}

function handleLanding(pl){
  var p = G.player;
  // Ring burst при приземлении
  spawnRing(p.x, p.y + PLAYER_H*0.4, SKINS[G.skin].color);

  if(pl.type === "fragile"){
    p.vy = JUMP_FORCE;
    pl.broken = true;
    burstPlatform(pl.x + PLATFORM_W*0.5, pl.y, THEME.platformColors.fragile);
    playJump();
    return;
  }
  if(pl.type === "once"){
    if(pl.used) return;
    pl.used = true; pl.broken = true;
    p.vy = JUMP_FORCE;
    playJump();
    return;
  }
  if(pl.hasSpring && !pl.springUsed){
    pl.springUsed = true;
    p.vy = SPRING_FORCE;
    G.springsUsed++;
    burstPlatform(pl.x + PLATFORM_W*0.5, pl.y, THEME.platformColors.spring);
    spawnFloatText(pl.x + PLATFORM_W*0.5, pl.y, "СПРИНГ!", "#8fffcf");
    playSpring(); shake(0.1, 4);
    saveGame(); checkAchievements();
    return;
  }
  if(pl.hasPropeller && !pl.propUsed){
    pl.propUsed = true;
    p.onPropeller = PROPELLER_DUR;
    burstPlatform(pl.x + PLATFORM_W*0.5, pl.y, THEME.platformColors.propeller);
    spawnFloatText(pl.x + PLATFORM_W*0.5, pl.y, "ЛЁТ!", "#ffaa55");
    playSpring();
    return;
  }
  if(pl.hasRocket && !pl.rocketUsed){
    pl.rocketUsed = true;
    p.vy = -1700;
    G.rocketsUsed++;
    burstPlatform(pl.x + PLATFORM_W*0.5, pl.y, THEME.platformColors.rocket);
    spawnFloatText(pl.x + PLATFORM_W*0.5, pl.y, "РАКЕТА!", "#ff5577");
    playSpring(); shake(0.3, 10);
    saveGame(); checkAchievements();
    return;
  }
  p.vy = JUMP_FORCE;
  playJump();
}

function addCoins(a){ G.coins += a; updateUI(); }
function addCombo(){
  G.combo++;
  G.comboTimer = 2.0;
  if(G.combo > G.maxCombo) G.maxCombo = G.combo;
  if(G.combo >= 3){
    var bonus = G.combo * 3;
    G.score += bonus;
    spawnFloatText(G.player.x, G.player.y - 30, "x" + G.combo + " +" + bonus, "#ffe56b");
  }
}

function generateAhead(){
  var topY = G.camY - 300;
  while(G.lastPlatformY > topY) generateNextPlatform();
}
function cleanupBehind(){
  var botY = G.camY + VIRTUAL_H + 400;
  for(var i=G.platforms.length-1;i>=0;i--) if(G.platforms[i].y > botY) G.platforms.splice(i,1);
  for(var i=G.enemies.length-1;i>=0;i--) if(G.enemies[i].y > botY) G.enemies.splice(i,1);
  for(var i=G.ufos.length-1;i>=0;i--) if(G.ufos[i].y > botY) G.ufos.splice(i,1);
}

function die(reason){
  if(G.state !== "playing") return;
  G.state = "dead";
  G.gamesPlayed++;
  playDeath();
  shake(0.4, 12);
  flashScreen("#ff5577", 0.3);
  burstEnemy(G.player.x, G.player.y, "#ff5577", 40);
  saveGame(); updateUI(); checkAchievements();
  if (typeof vkBridge !== "undefined") {
    vkBridge.send("VKWebAppSetLeaderBoardScore", { user_result: G.best }).catch(function(){});
  }
  setTimeout(function(){ showOver(reason); }, 700);
}

function showOver(reason){
  $("o-title").textContent = "GAME OVER";
  $("o-score").textContent = G.score;
  $("o-best").textContent = "РЕКОРД: " + G.best;
  var earned = Math.floor(G.score / 5);
  $("o-coins").textContent = "+" + earned + " 💰";
  G.coins += earned;
  $("o-revive").style.display = "block";
  $("over").classList.add("show");
  saveGame(); updateUI();
}
function hideOver(){ $("over").classList.remove("show"); }

function tryRevive(){
  if (typeof vkBridge !== "undefined") {
    vkBridge.send("VKWebAppShowNativeAds", { ad_format: "reward" })
      .then(function(){ doRevive(); })
      .catch(function(){ doRevive(); });
  } else { doRevive(); }
}
function doRevive(){
  $("over").classList.remove("show");
  G.state = "playing";
  G.player.vy = SPRING_FORCE;
  G.shield = true;
  G.shieldTimer = 6;
  G.startShield = 0;
  var py = G.player.y;
  for(var i=G.enemies.length-1;i>=0;i--) if(Math.abs(G.enemies[i].y - py) < 250) G.enemies.splice(i,1);
  for(var i=G.ufos.length-1;i>=0;i--) if(Math.abs(G.ufos[i].y - py) < 250) G.ufos.splice(i,1);
  for(var i=0;i<3;i++) generateNextPlatform();
  spawnFloatText(G.player.x, G.player.y - 40, "ЩИТ!", "#8fffcf");
  saveGame(); updateUI();
}

/* ============================================================
   ЭФФЕКТЫ
============================================================ */
function spawnParticles(x, y, color, count){
  for(var i=0;i<count;i++){
    var ang = rand(0, 6.283);
    var spd = rand(80, 260);
    G.particles.push({
      x:x, y:y,
      vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
      life:rand(0.5, 1.0), maxLife:1.0,
      color:color, size:rand(2, 5)
    });
  }
}
function spawnRing(x, y, color){
  G.particles.push({
    x:x, y:y, vx:0, vy:0,
    life:0.4, maxLife:0.4,
    color:color, size:2,
    ring:true, ringR:0, ringMax: 40
  });
}
function burstEnemy(x, y, color, count){
  count = count || 22;
  spawnParticles(x, y, color, count);
  spawnRing(x, y, color);
  spawnRing(x, y, "#ffffff");
}
function burstPlatform(x, y, color){
  for(var i=0;i<10;i++){
    var ang = rand(-Math.PI, 0);
    var spd = rand(80, 200);
    G.particles.push({
      x:x + rand(-15, 15), y:y,
      vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd - 60,
      life:rand(0.4, 0.8), maxLife:0.8,
      color:color, size:rand(2, 4)
    });
  }
}
function spawnFloatText(x, y, text, color){
  G.floatTexts.push({ x:x, y:y, text:text, color:color, life:1.2, maxLife:1.2 });
}
function updateParticles(dt){
  for(var i=G.particles.length-1;i>=0;i--){
    var p = G.particles[i];
    if(p.ring){
      p.life -= dt;
      p.ringR = lerp(0, p.ringMax, 1 - p.life / p.maxLife);
      if(p.life <= 0) G.particles.splice(i,1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94; p.vy *= 0.94;
    p.vy += 350 * dt;
    p.life -= dt;
    if(p.life <= 0) G.particles.splice(i,1);
  }
}
function updateFloatTexts(dt){
  for(var i=G.floatTexts.length-1;i>=0;i--){
    var ft = G.floatTexts[i];
    ft.y -= 45 * dt;
    ft.life -= dt;
    if(ft.life <= 0) G.floatTexts.splice(i,1);
  }
}
function shake(time, intensity){ G.shakeTime = time; G.shakeInt = intensity; }
function flashScreen(color, dur){ G.flashColor = color; G.flashTimer = dur * 0.6; }

/* ============================================================
   RENDER — WORLD
============================================================ */
function render(t){
  var w = G.w, h = G.h;
  ctx.clearRect(0, 0, w, h);

  var shakeX = 0, shakeY = 0;
  if(G.shakeTime > 0){
    shakeX = rand(-G.shakeInt, G.shakeInt);
    shakeY = rand(-G.shakeInt, G.shakeInt);
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Платформы
  for(var i=0;i<G.platforms.length;i++){
    var pl = G.platforms[i];
    if(pl.broken) continue;
    var p = worldToScreen(pl.x, pl.y);
    if(p.y < -80 || p.y > h + 80) continue;
    drawPlatform(p.x, p.y, pl, t);
  }

  // Враги
  for(var i=0;i<G.enemies.length;i++){
    var e = G.enemies[i];
    var p = worldToScreen(e.x, e.y);
    if(p.y < -80 || p.y > h + 80) continue;
    drawEnemy(p.x, p.y, e, t);
  }

  // НЛО
  for(var i=0;i<G.ufos.length;i++){
    var u = G.ufos[i];
    var p = worldToScreen(u.x, u.y);
    if(p.y < -80 || p.y > h + 80) continue;
    drawUfo(p.x, p.y, t);
  }

  // Трейл
  for(var i=0;i<G.player.trail.length;i++){
    var tr = G.player.trail[i];
    var tp = worldToScreen(tr.x, tr.y);
    var alpha = tr.life / tr.maxLife;
    var col = hexRgb(tr.color);
    ctx.fillStyle = rgbStr(col.r, col.g, col.b, alpha * 0.6);
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, tr.size * G.scale * (1 - alpha * 0.4), 0, 6.283);
    ctx.fill();
  }

  // Игрок
  if(G.state !== "dead"){
    var pp = worldToScreen(G.player.x, G.player.y);
    drawPlayer(pp.x, pp.y, t);
  }

  // Частицы
  for(var i=0;i<G.particles.length;i++){
    var pa = G.particles[i];
    var p = worldToScreen(pa.x, pa.y);
    var alpha = pa.life / pa.maxLife;
    var col = hexRgb(pa.color);

    if(pa.ring){
      ctx.strokeStyle = rgbStr(col.r, col.g, col.b, alpha * 0.8);
      ctx.lineWidth = 3 * G.scale * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pa.ringR * G.scale, 0, 6.283);
      ctx.stroke();
      continue;
    }

    // Свечение
    ctx.fillStyle = rgbStr(col.r, col.g, col.b, alpha * 0.35);
    var szGlow = pa.size * G.scale * (1 + (1-alpha) * 3);
    ctx.beginPath(); ctx.arc(p.x, p.y, szGlow, 0, 6.283); ctx.fill();
    // Ядро
    ctx.fillStyle = rgbStr(col.r, col.g, col.b, alpha);
    ctx.beginPath(); ctx.arc(p.x, p.y, pa.size * G.scale * 0.6, 0, 6.283); ctx.fill();
  }

  // Float texts
  for(var i=0;i<G.floatTexts.length;i++){
    var ft = G.floatTexts[i];
    var p = worldToScreen(ft.x, ft.y);
    var alpha = ft.life / ft.maxLife;
    var col = hexRgb(ft.color);
    ctx.font = "bold " + Math.floor(16 * G.scale) + "px 'Courier New',monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Тень
    ctx.fillStyle = rgbStr(0, 0, 0, alpha * 0.7);
    ctx.fillText(ft.text, p.x + 2, p.y + 2);
    // Свечение
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = rgbStr(col.r, col.g, col.b, alpha);
    ctx.fillText(ft.text, p.x, p.y);
    ctx.shadowBlur = 0;
  }

  ctx.restore();

  // Вспышка
  if(G.flashTimer > 0){
    var alpha = clamp(G.flashTimer * 0.5, 0, 0.5);
    var col = hexRgb(G.flashColor);
    ctx.fillStyle = rgbStr(col.r, col.g, col.b, alpha);
    ctx.fillRect(0, 0, w, h);
  }

  // Гиро-индикатор
  if(G.gyroEnabled && G.gyroPermission && G.state === "playing"){
    var barW = 200;
    var barX = (w - barW) * 0.5;
    var barY = h - 30;
    // Фон
    ctx.fillStyle = "rgba(0,229,255,0.1)";
    ctx.fillRect(barX, barY, barW, 4);
    // Активная зона
    var ix = barX + barW * 0.5 + G.gyroValue * barW * 0.5;
    ix = clamp(ix, barX, barX + barW);
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(ix, barY + 2, 5, 0, 6.283); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/* ============================================================
   FX CANVAS — bloom, chroma
============================================================ */
function renderFx(t){
  ctxFx.clearRect(0, 0, G.w, G.h);

  // Хроматическая аберрация при событиях
  if(G.chromaTimer > 0){
    var amt = G.chromaTimer;
    ctxFx.fillStyle = "rgba(255,0,80," + (amt * 0.06) + ")";
    ctxFx.fillRect(-amt * 4, 0, G.w, G.h);
    ctxFx.fillStyle = "rgba(0,229,255," + (amt * 0.06) + ")";
    ctxFx.fillRect(amt * 4, 0, G.w, G.h);
  }
}

/* ============================================================
   РИСОВАНИЕ
============================================================ */
function drawPlatform(x, y, pl, t){
  var s = G.scale;
  var pw = PLATFORM_W * s;
  var ph = PLATFORM_H * s;
  var colors = THEME.platformColors;
  var baseColor;
  switch(pl.type){
    case "moving":  baseColor = colors.moving; break;
    case "fragile": baseColor = colors.fragile; break;
    case "once":    baseColor = colors.once; break;
    default:        baseColor = colors.normal;
  }
  var pulse = 1 + Math.sin(pl.pulse) * 0.1;

  // Внешнее свечение (многослойное)
  ctx.shadowColor = baseColor;
  ctx.shadowBlur = 24 * pulse;
  ctx.fillStyle = baseColor;
  roundRect(ctx, x, y, pw, ph, 5 * s);
  ctx.fill();
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Яркая верхняя грань
  var gradTop = ctx.createLinearGradient(0, y, 0, y + ph*0.5);
  var c = hexRgb(baseColor);
  gradTop.addColorStop(0, rgbStr(255, 255, 255, 0.75));
  gradTop.addColorStop(1, rgbStr(c.r, c.g, c.b, 0));
  ctx.fillStyle = gradTop;
  roundRect(ctx, x + 3*s, y + 1.5*s, pw - 6*s, ph*0.4, 3*s);
  ctx.fill();

  // Внутренняя точка энергии
  var shimmer = (Math.sin(t * 3 + pl.pulse) + 1) * 0.5;
  ctx.fillStyle = rgbStr(c.r, c.g, c.b, 0.4 + shimmer * 0.3);
  ctx.beginPath();
  ctx.arc(x + pw * 0.5, y + ph * 0.5, 3 * s * (0.7 + shimmer * 0.3), 0, 6.283);
  ctx.fill();

  // Пружина
  if(pl.hasSpring && !pl.springUsed){
    ctx.shadowColor = colors.spring;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colors.spring;
    var sx = x + pw*0.5 - 4*s;
    ctx.fillRect(sx, y - 12*s, 8*s, 12*s);
    ctx.fillStyle = "#ccffdd";
    roundRect(ctx, sx - 5*s, y - 16*s, 18*s, 5*s, 2*s);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Пропеллер
  if(pl.hasPropeller && !pl.propUsed){
    var cx = x + pw*0.5;
    var cy = y - 16*s;
    var pt = performance.now() * 0.008;
    ctx.strokeStyle = colors.propeller;
    ctx.shadowColor = colors.propeller;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3*s;
    ctx.lineCap = "round";
    for(var i=0;i<3;i++){
      var ang = pt + i * Math.PI * 2/3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * 15*s, cy + Math.sin(ang) * 15*s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 3*s, 0, 6.283);
    ctx.fillStyle = "#ffdd99";
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Ракета
  if(pl.hasRocket && !pl.rocketUsed){
    var cx = x + pw*0.5;
    var cy = y - 14*s;
    ctx.fillStyle = colors.rocket;
    ctx.shadowColor = colors.rocket;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18*s);
    ctx.lineTo(cx - 6*s, cy + 4*s);
    ctx.lineTo(cx + 6*s, cy + 4*s);
    ctx.closePath();
    ctx.fill();
    // Огонь
    ctx.fillStyle = "#ffdd44";
    ctx.beginPath();
    ctx.moveTo(cx - 3*s, cy + 4*s);
    ctx.lineTo(cx + 3*s, cy + 4*s);
    ctx.lineTo(cx, cy + 12*s + Math.sin(t*20)*2*s);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function roundRect(c, x, y, w, h, r){
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* ============================================================
   ВРАГИ
============================================================ */
function drawEnemy(x, y, e, t){
  var s = G.scale;
  var anim = e.anim;
  var col = THEME.enemy;
  var bob = Math.sin(anim) * 2 * s;

  // Тень
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + 14*s, y + 34*s, 14*s, 4*s, 0, 0, 6.283);
  ctx.fill();

  // Свечение
  ctx.shadowColor = col;
  ctx.shadowBlur = 22;

  // Тело
  ctx.fillStyle = col;
  roundRect(ctx, x + 2*s, y + 8*s + bob, 24*s, 24*s, 7*s);
  ctx.fill();

  // Рожки
  for(var i=0;i<4;i++){
    ctx.beginPath();
    ctx.moveTo(x + (4 + i*6)*s, y + 10*s + bob);
    ctx.lineTo(x + (6 + i*6)*s, y + 2*s + bob);
    ctx.lineTo(x + (8 + i*6)*s, y + 10*s + bob);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Глаза
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(x + 9*s, y + 16*s + bob, 4.5*s, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 19*s, y + 16*s + bob, 4.5*s, 0, 6.283); ctx.fill();

  ctx.fillStyle = "#1a0010";
  var eo = Math.sin(anim * 0.5) * 1.5 * s;
  ctx.beginPath(); ctx.arc(x + 9*s + eo, y + 16*s + bob, 2.5*s, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 19*s + eo, y + 16*s + bob, 2.5*s, 0, 6.283); ctx.fill();

  // Рот
  ctx.fillStyle = "#fff";
  roundRect(ctx, x + 8*s, y + 23*s + bob, 12*s, 4*s, 1*s);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 9*s, y + 23*s + bob, 2.5*s, 4*s);
  ctx.fillRect(x + 12.5*s, y + 23*s + bob, 2.5*s, 4*s);
  ctx.fillRect(x + 16*s, y + 23*s + bob, 2.5*s, 4*s);
}

function drawUfo(x, y, t){
  var s = G.scale;
  var col = THEME.ufo;

  // Свечение
  ctx.shadowColor = col;
  ctx.shadowBlur = 30;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y + 2*s, 24*s, 7*s, 0, 0, 6.283);
  ctx.fill();

  // Купол (вращается)
  var rot = Math.sin(t * 0.8) * 0.1;
  ctx.fillStyle = withAlpha(col, 0.75);
  ctx.beginPath();
  ctx.ellipse(x, y - 5*s, 13*s, 9*s, rot, Math.PI, 0);
  ctx.fill();

  // Внутренний блик
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(x - 4*s, y - 7*s, 4*s, 2.5*s, 0, 0, 6.283);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Огоньки
  var flicker = 0.5 + Math.sin(t * 10) * 0.5;
  for(var i=-2;i<=2;i++){
    ctx.fillStyle = i % 2 === 0 ? "#fff" : col;
    ctx.globalAlpha = i === 0 ? 1 : (0.4 + flicker * 0.6);
    ctx.beginPath();
    ctx.arc(x + i * 8*s, y + 2*s, 2.5*s, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Луч
  ctx.globalAlpha = 0.15 + flicker * 0.1;
  var beamGrad = ctx.createLinearGradient(0, y + 8*s, 0, y + 24*s);
  beamGrad.addColorStop(0, col);
  beamGrad.addColorStop(1, "rgba(0,255,136,0)");
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(x - 5*s, y + 8*s);
  ctx.lineTo(x + 5*s, y + 8*s);
  ctx.lineTo(x + 14*s, y + 24*s);
  ctx.lineTo(x - 14*s, y + 24*s);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ============================================================
   ИГРОК — АНИМИРОВАННЫЙ ПИКСЕЛЬ-КОТ
============================================================ */
function drawPlayer(x, y, t){
  var s = G.scale;
  var sk = SKINS[G.skin];
  var color = sk.color;
  var accent = sk.accent;
  var eyeColor = sk.eye || "#1a1a2e";
  var dir = G.player.dir;
  var squash = G.player.squash;
  var blink = G.player.blinkState === 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * (2 - squash), squash);

  // Тень под котом (если высоко — меньше)
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 22*s, 15*s, 4*s, 0, 0, 6.283);
  ctx.fill();

  // Аура свечения вокруг кота
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;

  // Хвост (анимированный)
  ctx.strokeStyle = color;
  ctx.lineWidth = 4*s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11*s, -2*s);
  var tw = Math.sin(t * 8) * 6;
  var tw2 = Math.sin(t * 8 + 1) * 5;
  ctx.bezierCurveTo(-18*s, -8*s + tw, -24*s, -16*s + tw2, -20*s, -22*s + tw);
  ctx.stroke();

  // Ноги
  ctx.fillStyle = color;
  var legAnim = Math.sin(t * 14) * 2 * s;
  roundRect(ctx, -9*s, 10*s, 6*s, 8*s + legAnim, 2*s); ctx.fill();
  roundRect(ctx, 3*s, 10*s, 6*s, 8*s - legAnim, 2*s); ctx.fill();

  // Тело
  ctx.fillStyle = color;
  roundRect(ctx, -11*s, -8*s, 22*s, 20*s, 5*s); ctx.fill();

  // Полоски
  ctx.fillStyle = withAlpha(accent, 0.5);
  roundRect(ctx, -8*s, -4*s, 16*s, 2*s, 1*s); ctx.fill();
  roundRect(ctx, -8*s, 2*s, 16*s, 2*s, 1*s); ctx.fill();

  // Голова
  ctx.fillStyle = color;
  roundRect(ctx, -13*s, -24*s, 26*s, 18*s, 7*s); ctx.fill();

  // Уши (дёргаются при прыжке)
  var earOff = G.player.earFlick > 0 ? Math.sin(G.player.earFlick * 40) * 2 : 0;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-13*s, -22*s);
  ctx.lineTo(-11*s, -33*s + earOff);
  ctx.lineTo(-3*s, -22*s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(13*s, -22*s);
  ctx.lineTo(11*s, -33*s + earOff);
  ctx.lineTo(3*s, -22*s);
  ctx.closePath();
  ctx.fill();

  // Внутренние уши
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-11*s, -24*s);
  ctx.lineTo(-10*s, -29*s + earOff);
  ctx.lineTo(-6*s, -24*s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(11*s, -24*s);
  ctx.lineTo(10*s, -29*s + earOff);
  ctx.lineTo(6*s, -24*s);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  // Глаза (с морганием)
  if(blink){
    ctx.strokeStyle = eyeColor;
    ctx.lineWidth = 2*s;
    ctx.beginPath();
    ctx.moveTo(-8*s, -16*s); ctx.lineTo(-2*s, -16*s);
    ctx.moveTo(2*s, -16*s);  ctx.lineTo(8*s, -16*s);
    ctx.stroke();
  } else {
    // Белые яблоки
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-5*s, -16*s, 4.5*s, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(5*s, -16*s, 4.5*s, 0, 6.283); ctx.fill();

    // Зрачки (следят за движением)
    ctx.fillStyle = eyeColor;
    var eyeShift = clamp(G.player.vx / 100, -1.5, 1.5);
    ctx.beginPath(); ctx.arc(-5*s + eyeShift*s, -16*s, 2.8*s, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(5*s + eyeShift*s, -16*s, 2.8*s, 0, 6.283); ctx.fill();

    // Блики
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-5*s + eyeShift*s - 1*s, -17*s, 1.3*s, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(5*s + eyeShift*s - 1*s, -17*s, 1.3*s, 0, 6.283); ctx.fill();
  }

  // Нос
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-1.5*s, -12*s);
  ctx.lineTo(1.5*s, -12*s);
  ctx.lineTo(0, -10*s);
  ctx.closePath();
  ctx.fill();

  // Рот
  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = 1.5*s;
  ctx.beginPath();
  ctx.arc(0, -9*s, 3*s, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Усы
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1*s;
  for(var i=-1;i<=1;i++){
    if(i === 0) continue;
    ctx.beginPath();
    ctx.moveTo(-8*s, -11*s + i*2*s);
    ctx.lineTo(-14*s, -12*s + i*3*s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8*s, -11*s + i*2*s);
    ctx.lineTo(14*s, -12*s + i*3*s);
    ctx.stroke();
  }

  // Щёчки
  ctx.fillStyle = withAlpha("#ff6688", 0.45);
  ctx.beginPath(); ctx.arc(-10*s, -12*s, 3*s, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(10*s, -12*s, 3*s, 0, 6.283); ctx.fill();

  ctx.restore();

  // Щит (в экранных координатах)
  if(G.shield || G.startShield > 0){
    var shieldColor = G.startShield > 0 ? "#a8f7ff" : "#8fffcf";
    ctx.strokeStyle = shieldColor;
    ctx.shadowColor = shieldColor;
    ctx.shadowBlur = 30;
    ctx.lineWidth = 3*s;
    var pulse = 1 + Math.sin(t * 6) * 0.08;
    ctx.beginPath(); ctx.arc(x, y, 32*s*pulse, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 1.5*s;
    ctx.strokeStyle = withAlpha(shieldColor, 0.5);
    ctx.beginPath(); ctx.arc(x, y, 36*s*pulse, 0, 6.283); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Пропеллер над головой
  if(G.player.onPropeller > 0){
    var pt = performance.now() * 0.025;
    ctx.strokeStyle = "#ffaa55";
    ctx.shadowColor = "#ffaa55";
    ctx.shadowBlur = 22;
    ctx.lineWidth = 3*s;
    ctx.lineCap = "round";
    for(var i=0;i<3;i++){
      var ang = pt + i * Math.PI * 2/3;
      ctx.beginPath();
      ctx.moveTo(x, y - 34*s);
      ctx.lineTo(x + Math.cos(ang) * 20*s, y - 34*s + Math.sin(ang) * 20*s);
      ctx.stroke();
    }
    // Огонь вниз
    var flameGrad = ctx.createLinearGradient(0, y + 16*s, 0, y + 34*s);
    flameGrad.addColorStop(0, "rgba(255,200,80,0.7)");
    flameGrad.addColorStop(1, "rgba(255,80,20,0)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(x - 7*s, y + 16*s);
    ctx.lineTo(x + 7*s, y + 16*s);
    ctx.lineTo(x, y + 34*s + Math.random() * 6*s);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/* ============================================================
   UI
============================================================ */
function updateUI(){
  $("score").textContent = G.score;
  $("best").textContent = "РЕКОРД: " + G.best;
  $("coins").textContent = "💰 " + G.coins;
  var multi = [];
  if(G.combo >= 3) multi.push("x" + G.combo);
  if(G.multi > 1) multi.push("💎x" + G.multi);
  if(G.magnetTimer > 0) multi.push("🧲 " + Math.ceil(G.magnetTimer));
  if(G.shieldTimer > 0) multi.push("🛡 " + Math.ceil(G.shieldTimer));
  if(G.startShield > 0) multi.push("🛡 " + Math.ceil(G.startShield));
  $("multi").textContent = multi.join("  ");
}

function refreshShop(){
  var row = $("shop-row");
  row.innerHTML = "";
  var upgrades = [
    { id:"magnet", name:"🧲 Магнит", desc:"Притягивает\nмонеты 10с", price:100 },
    { id:"shield", name:"🛡 Щит", desc:"Защита\nот 1 удара", price:150 },
    { id:"slow", name:"⏱ Замедление", desc:"Слоумо\n8с", price:120 },
    { id:"multi", name:"💎 x2 Очки", desc:"Удвоение\nочков 15с", price:200 }
  ];
  for(var i=0;i<upgrades.length;i++){
    var u = upgrades[i];
    var b = document.createElement("button");
    b.className = "ub " + (G.coins >= u.price ? "ok" : "no");
    b.textContent = u.name + "\n" + u.desc + "\n" + u.price + "💰";
    (function(u){ b.onclick = function(){ buyUpgrade(u); }; })(u);
    row.appendChild(b);
  }
}

function buyUpgrade(u){
  if(G.coins < u.price){ toast("Не хватает монет!"); return; }
  G.coins -= u.price;
  if(u.id === "magnet") G.magnetTimer = 10;
  else if(u.id === "shield"){ G.shield = true; G.shieldTimer = 30; }
  else if(u.id === "slow") G.slowTimer = 8;
  else if(u.id === "multi"){ G.multi = 2; G.multiTimer = 15; }
  toast("Куплено: " + u.name);
  saveGame(); updateUI(); refreshShop();
}

function refreshSkins(){
  var list = $("skins-list");
  list.innerHTML = "";
  for(var k in SKINS){
    var sk = SKINS[k];
    var b = document.createElement("button");
    b.className = "sk";
    if(sk.owned){
      b.classList.add(k === G.skin ? "eq" : "owned");
      b.innerHTML = '<span class="emoji">' + sk.emoji + '</span>' + sk.name + '<br>' + (k === G.skin ? '✓ ВЫБРАН' : 'НАДЕТЬ');
      (function(key){ b.onclick = function(){ G.skin = key; saveGame(); refreshSkins(); toast("Скин: " + SKINS[key].name); }; })(k);
    } else {
      b.classList.add("buy");
      b.innerHTML = '<span class="emoji">' + sk.emoji + '</span>' + sk.name + '<br>' + sk.price + '💰';
      (function(key){ b.onclick = function(){ buySkin(key); }; })(k);
    }
    list.appendChild(b);
  }
}

function buySkin(k){
  var sk = SKINS[k];
  if(sk.owned) return;
  if(G.coins < sk.price){ toast("Не хватает монет!"); return; }
  G.coins -= sk.price;
  sk.owned = true;
  G.skin = k;
  toast("Открыт: " + sk.name);
  var allOwned = true;
  for(var kk in SKINS) if(!SKINS[kk].owned){ allOwned = false; break; }
  if(allOwned) unlockAch("all_skins");
  saveGame(); updateUI(); refreshSkins();
}

function refreshAch(){
  var list = $("ach-list");
  list.innerHTML = "";
  for(var k in ACHS){
    var a = ACHS[k];
    var div = document.createElement("div");
    div.className = "it" + (a.unlocked ? " on" : "");
    div.textContent = (a.unlocked ? "✓ " : "○ ") + a.name + " +" + a.reward + "💰";
    list.appendChild(div);
  }
}

function checkAchievements(){
  for(var k in ACHS){
    var a = ACHS[k];
    if(a.unlocked) continue;
    if(k === "all_skins"){
      var allOwned = true;
      for(var kk in SKINS) if(!SKINS[kk].owned){ allOwned = false; break; }
      if(allOwned) unlockAch(k);
      continue;
    }
    if(a.check && a.check(G)) unlockAch(k);
  }
}
function unlockAch(id){
  if(!ACHS[id] || ACHS[id].unlocked) return;
  ACHS[id].unlocked = true;
  G.coins += ACHS[id].reward;
  toast("🏆 " + ACHS[id].name + " +" + ACHS[id].reward + "💰");
  updateUI(); saveGame();
  for(var i=0;i<30;i++){
    spawnParticles(G.player.x + rand(-30,30), G.player.y + rand(-30,30), "#ffe56b", 1);
  }
}

function toast(text){
  var t = $("toast");
  t.textContent = text;
  t.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ t.classList.remove("on"); }, 2000);
}

/* ============================================================
   ПАНЕЛИ
============================================================ */
var panelWasPaused = false;
function togglePanel(name){
  var el = $(name);
  var wasOpen = el.classList.contains("show");
  var all = document.querySelectorAll(".panel");
  for(var i=0;i<all.length;i++) all[i].classList.remove("show");
  if(wasOpen){
    if(panelWasPaused && G.state === "paused"){ G.state = "playing"; panelWasPaused = false; $("btnPause").textContent = "II ПАУЗА"; }
    return;
  }
  el.classList.add("show");
  if(G.state === "playing"){ panelWasPaused = true; G.state = "paused"; }
  if(name === "shop") refreshShop();
  if(name === "skins") refreshSkins();
  if(name === "ach") refreshAch();
}
function closePanel(name){
  $(name).classList.remove("show");
  if(panelWasPaused && G.state === "paused"){
    G.state = "playing";
    panelWasPaused = false;
    $("btnPause").textContent = "II ПАУЗА";
  }
}

/* ============================================================
   ВВОД
============================================================ */
function setupInput(){
  window.addEventListener("keydown", function(e){
    G.keys[e.key] = true;
    G.usingTouch = false;
    if(e.key === " "){
      e.preventDefault();
      if(G.state === "dead"){ hideOver(); startGame(); }
    }
    if(e.key === "Escape") togglePause();
    if(e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "a" || e.key === "d") e.preventDefault();
  });
  window.addEventListener("keyup", function(e){ G.keys[e.key] = false; });

  cv.addEventListener("mousemove", function(e){
    if(G.state !== "playing") return;
    G.usingTouch = true;
    G.touchX = screenToWorldX(e.clientX);
  });
  cv.addEventListener("mousedown", function(e){
    if(G.state !== "playing") return;
    G.usingTouch = true;
    G.touchX = screenToWorldX(e.clientX);
  });

  cv.addEventListener("touchstart", function(e){
    e.preventDefault();
    if(e.touches.length === 0) return;
    G.usingTouch = true;
    G.touchX = screenToWorldX(e.touches[0].clientX);
  }, {passive:false});
  cv.addEventListener("touchmove", function(e){
    e.preventDefault();
    if(e.touches.length === 0) return;
    G.touchX = screenToWorldX(e.touches[0].clientX);
  }, {passive:false});
  cv.addEventListener("touchend", function(e){
    e.preventDefault();
    G.touchX = null;
  }, {passive:false});

  window.addEventListener("deviceorientation", function(e){
    if(!G.gyroEnabled) return;
    if(e.gamma !== null && e.gamma !== undefined){
      G.gyroValue = clamp(e.gamma / 40, -1, 1);
      G.gyroPermission = true;
    }
  });
}

function requestGyro(){
  if(typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"){
    DeviceOrientationEvent.requestPermission().then(function(state){
      if(state === "granted"){
        G.gyroEnabled = true; G.gyroPermission = true;
        toast("📱 Гироскоп активен");
      } else { toast("❌ Нет разрешения"); G.gyroEnabled = false; }
    }).catch(function(){ G.gyroEnabled = false; toast("❌ Гироскоп недоступен"); });
  } else {
    if("ondeviceorientation" in window){
      G.gyroEnabled = !G.gyroEnabled;
      G.gyroPermission = G.gyroEnabled;
      toast(G.gyroEnabled ? "📱 Гироскоп ВКЛ" : "📱 Гироскоп ВЫКЛ");
    } else { toast("❌ Гироскоп не поддерживается"); }
  }
}

function togglePause(){
  if(G.state === "playing"){
    G.state = "paused";
    $("btnPause").textContent = "▶ ИДТИ";
  } else if(G.state === "paused"){
    G.state = "playing";
    $("btnPause").textContent = "II ПАУЗА";
  }
}

/* ============================================================
   ЦИКЛ
============================================================ */
function loop(now){
  var dt = Math.min((now - G.lastTime) / 1000, 0.05);
  G.lastTime = now;

  if(G.state === "playing"){
    update(dt);
  } else {
    updateParticles(dt);
    updateFloatTexts(dt);
    if(G.shakeTime > 0){ G.shakeTime -= dt; G.shakeInt *= 0.88; }
    if(G.flashTimer > 0) G.flashTimer -= dt * 2;
  }

  var t = now * 0.001;
  renderBackground(t);
  renderFx(t);
  render(t);

  updateUI();
  requestAnimationFrame(loop);
}

/* ============================================================
   BOOTSTRAP
============================================================ */
function bootstrap(){
  onResize();
  loadGame();
  setupInput();
  updateUI();

  $("btnPause").onclick = togglePause;
  $("btnShop").onclick  = function(){ togglePanel("shop"); };
  $("btnSkins").onclick = function(){ togglePanel("skins"); };
  $("btnAch").onclick   = function(){ togglePanel("ach"); };
  $("btnGyro").onclick  = function(){
    if(typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"){
      $("gyro-modal").classList.add("show");
      if(G.state === "playing"){ G.state = "paused"; panelWasPaused = true; }
    } else { requestGyro(); }
  };

  var xs = document.querySelectorAll(".panel .x");
  for(var i=0;i<xs.length;i++){
    (function(b){ b.onclick = function(){ closePanel(b.dataset.close); }; })(xs[i]);
  }

  $("o-restart").onclick = function(){ hideOver(); startGame(); };
  $("o-revive").onclick  = tryRevive;
  $("o-leader").onclick  = function(){
    if (typeof vkBridge !== "undefined") {
      vkBridge.send("VKWebAppShowLeaderBoardBox", { user_result: G.best })
        .catch(function(){ toast("Лидерборд недоступен"); });
    } else { toast("Лидерборд только в VK"); }
  };
  $("gyro-allow").onclick = function(){
    $("gyro-modal").classList.remove("show");
    requestGyro();
    if(panelWasPaused && G.state === "paused"){ G.state = "playing"; panelWasPaused = false; }
  };
  $("gyro-deny").onclick = function(){
    $("gyro-modal").classList.remove("show");
    if(panelWasPaused && G.state === "paused"){ G.state = "playing"; panelWasPaused = false; }
  };

  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  setInterval(function(){
    var w1 = window.innerWidth || document.documentElement.clientWidth;
    var h1 = window.innerHeight || document.documentElement.clientHeight;
    if(w1 > 100 && h1 > 100 && (w1 !== G.w || h1 !== G.h)) onResize();
  }, 1000);

  startGame();
  G.lastTime = performance.now();
  requestAnimationFrame(loop);

  document.addEventListener("click", ensureAudio, { once:true });
  document.addEventListener("touchstart", ensureAudio, { once:true });
}

bootstrap();