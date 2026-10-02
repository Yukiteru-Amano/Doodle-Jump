"use strict";

/* ═══════════ VK BRIDGE ═══════════ */
if (typeof vkBridge !== "undefined") {
  vkBridge.send("VKWebAppInit").catch(function(){});
}

/* ═══════════ ФИКСИРОВАННЫЕ РАЗМЕРЫ ИГРЫ ═══════════ */
var VIRTUAL_W = 480;
var VIRTUAL_H = 800;
var GRAVITY = 1900;
var JUMP_VEL = -900;
var PLAYER_W = 32;
var PLAYER_H = 58;
var PLATFORM_W = 82;
var PLATFORM_H = 14;
var SAVE_KEY = "neon_jump_save_v5";

/* ═══════════ СКИНЫ ═══════════ */
var SKINS = {
  cat:       { name:"Котёнок",      emoji:"🐱", price:0,    owned:true,  color:"#ffa64d", accent:"#ffcc99" },
  cat_black: { name:"Чёрный кот",   emoji:"🐈", price:200,  owned:false, color:"#666677", accent:"#aaaacc" },
  frog:      { name:"Лягушка",      emoji:"🐸", price:300,  owned:false, color:"#4dd966", accent:"#aaffbb" },
  penguin:   { name:"Пингвин",      emoji:"🐧", price:400,  owned:false, color:"#445566", accent:"#ffffff" },
  robot:     { name:"Робот",        emoji:"🤖", price:600,  owned:false, color:"#b0b0d0", accent:"#00e5ff" },
  alien:     { name:"Пришелец",     emoji:"👽", price:800,  owned:false, color:"#7dff7d", accent:"#00ff44" },
  ghost:     { name:"Призрак",      emoji:"👻", price:1000, owned:false, color:"#ddddff", accent:"#aaaaff" },
  ninja:     { name:"Ниндзя",       emoji:"🥷", price:1500, owned:false, color:"#4a4a6a", accent:"#ff3366" },
  wizard:    { name:"Маг",          emoji:"🧙", price:2000, owned:false, color:"#9966ff", accent:"#ffdd44" },
  dragon:    { name:"Дракон",       emoji:"🐲", price:3000, owned:false, color:"#22aa55", accent:"#ff5522" }
};

var ACHS = {
  first_jump: { name:"Первый прыжок",  reward:10,  check:function(s){ return s.gamesPlayed >= 1; } },
  h_100:      { name:"100 метров",     reward:30,  check:function(s){ return s.best >= 100; } },
  h_500:      { name:"500 метров",     reward:80,  check:function(s){ return s.best >= 500; } },
  h_1000:     { name:"Космонавт",      reward:200, check:function(s){ return s.best >= 1000; } },
  h_5000:     { name:"За облаками",    reward:500, check:function(s){ return s.best >= 5000; } },
  games_10:   { name:"Задрот",         reward:50,  check:function(s){ return s.gamesPlayed >= 10; } },
  games_50:   { name:"Марафонец",      reward:250, check:function(s){ return s.gamesPlayed >= 50; } },
  coins_100:  { name:"Копилка",        reward:50,  check:function(s){ return s.coins >= 100; } },
  coins_1000: { name:"Богач",          reward:300, check:function(s){ return s.coins >= 1000; } },
  all_skins:  { name:"Коллекционер",   reward:1000, check:function(s){ return false; } }
};

var G = {
  w:0, h:0, scale:1, dpr:1,
  state:"menu",
  score:0, best:0, coins:0, gamesPlayed:0,
  pLevel:1, pXp:0, pXpNeed:100,
  skin:"cat",
  soundOn:true, vibrationOn:true, particlesOn:true, parallaxOn:true,
  gyroEnabled:false, gyroPermission:false, gyroValue:0,
  player:{ x:240, y:440, vx:0, vy:0, anim:0, onGround:false },
  camY:0,
  platforms:[], particles:[], trail:[],
  lastPlatformY:0,
  shakeTime:0, shakeInt:0, flashTimer:0, flashColor:"#ffffff",
  keys:{}, touchX:null,
  lastTime:0
};

/* ═══════════ УТИЛИТЫ ═══════════ */
function rand(a,b){ return a + Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }
function hexRgb(h){
  h = h.replace("#","");
  if(h.length===3) h = h.split("").map(function(c){return c+c;}).join("");
  return { r:parseInt(h.substr(0,2),16), g:parseInt(h.substr(2,2),16), b:parseInt(h.substr(4,2),16) };
}
function rgbStr(r,g,b,a){
  if(a===undefined) a=1;
  if(a>=1) return "rgb("+(r|0)+","+(g|0)+","+(b|0)+")";
  return "rgba("+(r|0)+","+(g|0)+","+(b|0)+","+a+")";
}
function withA(hex,a){ var c=hexRgb(hex); return rgbStr(c.r,c.g,c.b,a); }

var cv = document.getElementById("cv");
var ctx = cv.getContext("2d");
function $(id){ return document.getElementById(id); }

/* ═══════════ СОХРАНЕНИЕ ═══════════ */
function saveGame(){
  var sk = {}, ac = {};
  for(var k in SKINS) sk[k] = SKINS[k].owned;
  for(var k in ACHS) ac[k] = !!ACHS[k].unlocked;
  var data = {
    best:G.best, coins:G.coins, gamesPlayed:G.gamesPlayed,
    pLevel:G.pLevel, pXp:G.pXp, pXpNeed:G.pXpNeed, skin:G.skin,
    soundOn:G.soundOn, vibrationOn:G.vibrationOn,
    particlesOn:G.particlesOn, parallaxOn:G.parallaxOn,
    skins:sk, achievements:ac
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
  G.pLevel = d.pLevel||1; G.pXp = d.pXp||0; G.pXpNeed = d.pXpNeed||100;
  G.skin = d.skin||"cat";
  G.soundOn = d.soundOn !== false;
  G.vibrationOn = d.vibrationOn !== false;
  G.particlesOn = d.particlesOn !== false;
  G.parallaxOn = d.parallaxOn !== false;
  if(d.skins) for(var k in SKINS) if(d.skins[k]!==undefined) SKINS[k].owned = !!d.skins[k];
  if(d.achievements) for(var k in ACHS) if(d.achievements[k]!==undefined) ACHS[k].unlocked = !!d.achievements[k];
  updateMenuStats();
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

/* ═══════════ ЗВУК ═══════════ */
var audioCtx = null;
function ensureAudio(){
  if(audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
}
function beep(freq, dur, type, gain){
  if(!G.soundOn) return;
  ensureAudio(); if(!audioCtx) return;
  var o = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  o.type = type || "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain || 0.05, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + dur);
}
function playJump(){ beep(520 + Math.random()*80, 0.08, "sine", 0.05); }
function playDeath(){
  if(!G.soundOn) return;
  ensureAudio(); if(!audioCtx) return;
  var o = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(300, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.6);
  g.gain.setValueAtTime(0.12, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime + 0.6);
}
function vibrate(ms){
  if(!G.vibrationOn) return;
  if(navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} }
}

/* ═══════════ РАЗМЕРЫ ═══════════
   #app всегда с aspect ratio 480:800,
   вписан в экран с сохранением пропорций */
function onResize(){
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var targetAspect = VIRTUAL_W / VIRTUAL_H; // 0.6

  var appW, appH;
  if(vw / vh > targetAspect){
    // Экран шире — вписываем по высоте
    appH = vh;
    appW = appH * targetAspect;
  } else {
    // Экран уже — вписываем по ширине
    appW = vw;
    appH = appW / targetAspect;
  }

  var app = $("app");
  app.style.width = appW + "px";
  app.style.height = appH + "px";

  // canvas — растягиваем на всю #app, но с учётом dpr для чёткости
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.dpr = dpr;
  G.w = appW;
  G.h = appH;
  G.scale = appW / VIRTUAL_W;  // масштаб от виртуального к реальному

  cv.width = Math.round(VIRTUAL_W * dpr * 2);  // фиксированный буфер
  cv.height = Math.round(VIRTUAL_H * dpr * 2);
  cv.style.width = "100%";
  cv.style.height = "100%";

  // Рисуем в фиксированных координатах 480×800, ctx сам масштабирует
  ctx.setTransform(cv.width / VIRTUAL_W, 0, 0, cv.height / VIRTUAL_H, 0, 0);
}

/* ═══════════ ЭКРАНЫ ═══════════ */
function showScreen(id){
  var all = document.querySelectorAll(".screen");
  for(var i=0;i<all.length;i++) all[i].classList.remove("show");
  if(id) $(id).classList.add("show");
}
function hideAllScreens(){
  var all = document.querySelectorAll(".screen");
  for(var i=0;i<all.length;i++) all[i].classList.remove("show");
}
function showHUD(show){ $("hud").classList.toggle("show", show); }
function updateMenuStats(){
  $("menu-best").textContent = G.best;
  $("menu-coins").textContent = G.coins;
  $("menu-lvl").textContent = G.pLevel;
}

/* ═══════════ СПИСКИ ═══════════ */
function renderSkins(){
  var list = $("skins-list");
  list.innerHTML = "";
  for(var k in SKINS){
    var sk = SKINS[k];
    var card = document.createElement("div");
    card.className = "skin-card";
    if(sk.owned){
      card.classList.add(k === G.skin ? "equipped" : "owned");
      card.innerHTML = '<div class="emoji">' + sk.emoji + '</div><div class="info"><div class="name">' + sk.name + '</div><div class="status">' + (k === G.skin ? '✓ ВЫБРАН' : 'НАЖМИ ЧТОБЫ НАДЕТЬ') + '</div></div>';
      (function(key){ card.onclick = function(){
        G.skin = key; saveGame(); renderSkins(); toast("Скин: " + SKINS[key].name);
      }; })(k);
    } else {
      card.innerHTML = '<div class="emoji">' + sk.emoji + '</div><div class="info"><div class="name">' + sk.name + '</div><div class="price">💰 ' + sk.price + '</div></div>';
      (function(key){ card.onclick = function(){ buySkin(key); }; })(k);
    }
    list.appendChild(card);
  }
}
function buySkin(k){
  var sk = SKINS[k];
  if(sk.owned) return;
  if(G.coins < sk.price){ toast("Не хватает монет!"); return; }
  G.coins -= sk.price; sk.owned = true; G.skin = k;
  toast("Открыт: " + sk.name);
  var allOwned = true;
  for(var kk in SKINS) if(!SKINS[kk].owned){ allOwned = false; break; }
  if(allOwned) unlockAch("all_skins");
  saveGame(); updateMenuStats(); renderSkins();
}
function renderShop(){
  var list = $("shop-list");
  list.innerHTML = "";
  var items = [
    { id:"coins_500",  icon:"💰", name:"500 монет",     price:"3 $" },
    { id:"coins_2000", icon:"💎", name:"2000 монет",    price:"10 $" },
    { id:"revive",     icon:"❤️", name:"Возрождение",   price:"2 $" },
    { id:"ad_bonus",   icon:"📺", name:"Бонус за рекламу", price:"" }
  ];
  items.forEach(function(item){
    var card = document.createElement("div");
    card.className = "skin-card";
    card.innerHTML = '<div class="emoji">' + item.icon + '</div><div class="info"><div class="name">' + item.name + '</div>' + (item.price ? '<div class="price">' + item.price + '</div>' : '<div class="status">СМОТРЕТЬ РЕКЛАМУ</div>') + '</div>';
    card.onclick = function(){
      if(item.id === "ad_bonus"){ showAd(); return; }
      toast("Функция в разработке");
    };
    list.appendChild(card);
  });
}
function showAd(){
  if(typeof vkBridge !== "undefined"){
    vkBridge.send("VKWebAppShowNativeAds", { ad_format:"reward" })
      .then(function(){ G.coins += 100; toast("+100 монет"); saveGame(); updateMenuStats(); })
      .catch(function(){ toast("Реклама недоступна"); });
  } else {
    toast("Реклама только в ВК");
  }
}
function renderAchievements(){
  var list = $("ach-list");
  list.innerHTML = "";
  for(var k in ACHS){
    var a = ACHS[k];
    var div = document.createElement("div");
    div.className = "ach-item" + (a.unlocked ? " on" : "");
    div.innerHTML = '<div class="ic">' + (a.unlocked ? '✓' : '○') + '</div><div class="name">' + a.name + '</div><div class="reward">+' + a.reward + ' 💰</div>';
    list.appendChild(div);
  }
}
function unlockAch(id){
  if(!ACHS[id] || ACHS[id].unlocked) return;
  ACHS[id].unlocked = true;
  G.coins += ACHS[id].reward;
  toast("🏆 " + ACHS[id].name + " +" + ACHS[id].reward);
  updateMenuStats(); saveGame();
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
function toast(text){
  var t = $("toast");
  t.textContent = text;
  t.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ t.classList.remove("on"); }, 2000);
}

/* ═══════════ ИГРА ═══════════ */
function startGame(){
  hideAllScreens();
  showHUD(true);
  G.state = "playing";
  G.score = 0;
  G.platforms = []; G.particles = []; G.trail = [];
  G.shakeTime = 0; G.flashTimer = 0;
  G.touchX = null;

  // Игрок стартует по центру
  G.player.x = VIRTUAL_W / 2;
  G.player.y = VIRTUAL_H * 0.65;
  G.player.vx = 0;
  G.player.vy = 0;
  G.player.onGround = true;
  G.player.anim = 0;

  // Камера привязана так, чтобы игрок был на 55% экрана
  G.camY = G.player.y - VIRTUAL_H * 0.55;

  // Первая платформа прямо под игроком
  G.lastPlatformY = G.player.y + 40;
  G.platforms.push({
    x: G.player.x - PLATFORM_W / 2,
    y: G.player.y + 40,
    type: "normal", vx: 0, broken: false, used: false
  });

  // Спавним платформы выше
  for(var i=0;i<18;i++) spawnPlatform();
  updateMenuStats();
}

function spawnPlatform(){
  var gapMin = 90, gapMax = 130;
  var y = G.lastPlatformY - rand(gapMin, gapMax);
  G.lastPlatformY = y;

  var roll = Math.random();
  var type = "normal", vx = 0;
  if(roll < 0.55) type = "normal";
  else if(roll < 0.75) type = "moving";
  else if(roll < 0.9) type = "fragile";
  else type = "once";

  if(type === "moving") vx = (Math.random() < 0.5 ? -1 : 1) * rand(40, 70);

  // x всегда внутри VIRTUAL_W
  var x = rand(20, VIRTUAL_W - PLATFORM_W - 20);

  G.platforms.push({
    x: x, y: y, type: type, vx: vx, broken: false, used: false
  });
}

function updatePlayer(dt){
  var p = G.player;
  var ax = 0;
  var useGyro = G.gyroEnabled && G.gyroPermission;

  if(G.touchX !== null){
    var target = G.touchX;
    ax = (target - p.x) * 40;
    ax = clamp(ax, -3000, 3000);
  } else if(useGyro){
    ax = -G.gyroValue * 3000;
  } else if(G.keys["ArrowLeft"] || G.keys["a"] || G.keys["A"]){ ax = -2600; }
  else if(G.keys["ArrowRight"] || G.keys["d"] || G.keys["D"]){ ax = 2600; }

  p.vx += ax * dt;
  p.vx *= Math.pow(0.84, dt * 60);
  p.vx = clamp(p.vx, -520, 520);
  p.x += p.vx * dt;

  // Wrap по краям
  if(p.x < -PLAYER_W/2) p.x = VIRTUAL_W + PLAYER_W/2;
  if(p.x > VIRTUAL_W + PLAYER_W/2) p.x = -PLAYER_W/2;

  p.anim += dt * 2;

  // Гравитация
  p.vy += GRAVITY * dt;
  if(p.vy > 2200) p.vy = 2200;
  p.y += p.vy * dt;

  // Коллизия с платформами — только когда падаем
  if(p.vy >= 0){
    for(var i=0;i<G.platforms.length;i++){
      var pl = G.platforms[i];
      if(pl.broken) continue;
      var plTop = pl.y;
      var pBottom = p.y + PLAYER_H;
      // Игрок сверху — проверяем пересечение по X
      if(p.x + 12 > pl.x && p.x - 12 < pl.x + PLATFORM_W){
        if(pBottom >= plTop && pBottom <= plTop + 30){
          p.y = plTop - PLAYER_H;
          p.vy = JUMP_VEL;
          p.onGround = true;
          if(pl.type === "fragile") pl.broken = true;
          if(pl.type === "once") pl.broken = true;
          playJump();
          vibrate(15);
          // Пыль
          if(G.particlesOn){
            for(var k=0;k<4;k++){
              G.particles.push({
                x: p.x, y: plTop,
                vx: rand(-120, 120), vy: rand(50, 200),
                life: rand(0.3, 0.5), maxLife: 0.5,
                color: "#ff8833", size: rand(2,4)
              });
            }
          }
          break;
        }
      }
    }
  }

  // Падение
  if(p.y > G.camY + VIRTUAL_H + 40){ die(); return; }

  // Счёт
  var height = Math.max(0, (VIRTUAL_H * 0.65) - p.y);
  var newScore = Math.floor(height / 10);
  if(newScore > G.score) G.score = newScore;

  // Трейл
  if(G.particlesOn && Math.random() < 0.5){
    G.trail.push({ x: p.x + rand(-4,4), y: p.y + PLAYER_H/2, life: 0.4, maxLife: 0.4 });
  }
  for(var i=G.trail.length-1;i>=0;i--){
    G.trail[i].life -= dt;
    if(G.trail[i].life <= 0) G.trail.splice(i,1);
  }
}

function updateWorld(dt){
  // Камера едет вверх за игроком
  var camTarget = G.player.y - VIRTUAL_H * 0.55;
  if(camTarget < G.camY) G.camY = lerp(G.camY, camTarget, dt * 6);

  // Движущиеся платформы
  for(var i=0;i<G.platforms.length;i++){
    var pl = G.platforms[i];
    if(pl.type === "moving"){
      pl.x += pl.vx * dt;
      if(pl.x < 10){ pl.x = 10; pl.vx *= -1; }
      if(pl.x + PLATFORM_W > VIRTUAL_W - 10){ pl.x = VIRTUAL_W - PLATFORM_W - 10; pl.vx *= -1; }
    }
  }

  // Спавним новые вверху
  while(G.lastPlatformY > G.camY - 200) spawnPlatform();

  // Чистим внизу
  var behindY = G.camY + VIRTUAL_H + 200;
  for(var i=G.platforms.length-1;i>=0;i--) if(G.platforms[i].y > behindY) G.platforms.splice(i,1);
}

function updateParticles(dt){
  for(var i=G.particles.length-1;i>=0;i--){
    var p = G.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.94; p.vy *= 0.94; p.vy += 600 * dt;
    p.life -= dt;
    if(p.life <= 0) G.particles.splice(i,1);
  }
  if(G.shakeTime > 0){ G.shakeTime -= dt; G.shakeInt *= 0.88; }
  if(G.flashTimer > 0) G.flashTimer -= dt * 2;
}

function die(){
  if(G.state !== "playing") return;
  G.state = "dead";
  G.gamesPlayed++;
  playDeath();
  vibrate(200);
  G.shakeTime = 0.5; G.shakeInt = 20;
  G.flashColor = "#ff5577"; G.flashTimer = 0.3;
  if(G.score > G.best) G.best = G.score;
  saveGame();
  checkAchievements();
  showHUD(false);
  setTimeout(function(){
    $("go-score").textContent = G.score;
    $("go-best").textContent = G.best;
    showScreen("gameover");
  }, 700);
}

/* ═══════════ РЕНДЕР (в фиксированных координатах 480×800) ═══════════ */
function render(){
  var w = VIRTUAL_W, h = VIRTUAL_H;
  var shakeX = 0, shakeY = 0;
  if(G.shakeTime > 0){
    shakeX = rand(-G.shakeInt, G.shakeInt) / 4;
    shakeY = rand(-G.shakeInt, G.shakeInt) / 4;
  }

  // Фон
  var grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0, "#1a0520");
  grad.addColorStop(0.4, "#4d0a15");
  grad.addColorStop(0.75, "#a8300a");
  grad.addColorStop(1, "#ff6600");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);

  // Солнце
  if(G.parallaxOn){
    var sunX = w * 0.72, sunY = h * 0.68, sunR = 60;
    var sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 5);
    sg.addColorStop(0, "rgba(255,220,80,0.6)");
    sg.addColorStop(0.3, "rgba(255,150,30,0.3)");
    sg.addColorStop(1, "rgba(255,80,0,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#ffdd55";
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, 6.283); ctx.fill();
  }

  // Смещение только по Y (камеры) + shake
  var camY = G.camY;
  ctx.save();
  ctx.translate(shakeX, -camY + shakeY);

  // Платформы
  for(var i=0;i<G.platforms.length;i++){
    var pl = G.platforms[i];
    if(pl.broken) continue;
    var py = pl.y;
    if(py < camY - 60 || py > camY + VIRTUAL_H + 60) continue;
    var color = pl.type === "moving" ? "#ff00e5" : pl.type === "fragile" ? "#ffe56b" : pl.type === "once" ? "#ffffff" : "#00e5ff";
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.fillRect(pl.x, pl.y, PLATFORM_W, PLATFORM_H);
    // Яркая верхняя грань
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(pl.x + 3, pl.y + 2, PLATFORM_W - 6, 2);
  }

  // Трейл игрока
  for(var i=0;i<G.trail.length;i++){
    var tr = G.trail[i];
    var a = (tr.life / tr.maxLife) * 0.35;
    ctx.fillStyle = withA("#ffa64d", a);
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, 6, 0, 6.283);
    ctx.fill();
  }

  // Игрок
  if(G.state !== "dead"){
    drawPlayer();
  }

  ctx.restore();

  // Частицы
  for(var i=0;i<G.particles.length;i++){
    var p = G.particles[i];
    var a = p.life / p.maxLife;
    ctx.fillStyle = withA(p.color || "#ff8833", a);
    ctx.fillRect(p.x, p.y - camY, (p.size || 3), (p.size || 3));
  }

  // Вспышка
  if(G.flashTimer > 0){
    var a = clamp(G.flashTimer * 0.5, 0, 0.5);
    ctx.fillStyle = withA(G.flashColor, a);
    ctx.fillRect(0,0,w,h);
  }
}

function drawPlayer(){
  var p = G.player;
  var sk = SKINS[G.skin];

  var headR = 10;
  var bodyW = 16;
  var bodyH = 26;
  var headX = p.x;
  var headY = p.y;

  // Тело
  ctx.fillStyle = sk.color;
  ctx.fillRect(p.x - bodyW/2, p.y + headR * 0.9, bodyW, bodyH);

  // Руки
  var swing = Math.sin(p.anim * 5) * 14;
  ctx.strokeStyle = sk.color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(p.x - bodyW/2, p.y + headR * 1.5);
  ctx.lineTo(p.x - bodyW/2 - 8, p.y + headR * 1.5 + swing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x + bodyW/2, p.y + headR * 1.5);
  ctx.lineTo(p.x + bodyW/2 + 8, p.y + headR * 1.5 - swing);
  ctx.stroke();

  // Ноги
  ctx.beginPath();
  ctx.moveTo(p.x - 4, p.y + headR * 0.9 + bodyH);
  ctx.lineTo(p.x - 4 - swing * 0.5, p.y + headR * 0.9 + bodyH + 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x + 4, p.y + headR * 0.9 + bodyH);
  ctx.lineTo(p.x + 4 + swing * 0.5, p.y + headR * 0.9 + bodyH + 12);
  ctx.stroke();

  // Голова
  ctx.fillStyle = sk.color;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, 6.283);
  ctx.fill();

  // Уши
  ctx.beginPath();
  ctx.moveTo(headX - headR * 0.7, headY - headR * 0.5);
  ctx.lineTo(headX - headR * 0.5, headY - headR * 1.7);
  ctx.lineTo(headX - headR * 0.1, headY - headR * 0.8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headX + headR * 0.7, headY - headR * 0.5);
  ctx.lineTo(headX + headR * 0.5, headY - headR * 1.7);
  ctx.lineTo(headX + headR * 0.1, headY - headR * 0.8);
  ctx.fill();

  // Глаза
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(headX - headR * 0.35, headY - headR * 0.15, headR * 0.3, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(headX + headR * 0.35, headY - headR * 0.15, headR * 0.3, 0, 6.283); ctx.fill();
  ctx.fillStyle = "#000";
  var eShift = clamp(p.vx / 250, -1.5, 1.5);
  ctx.beginPath(); ctx.arc(headX - headR * 0.35 + eShift, headY - headR * 0.15, headR * 0.14, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(headX + headR * 0.35 + eShift, headY - headR * 0.15, headR * 0.14, 0, 6.283); ctx.fill();
}

/* ═══════════ ЦИКЛ ═══════════ */
function loop(now){
  var dt = Math.min((now - G.lastTime) / 1000, 0.05);
  G.lastTime = now;
  if(G.state === "playing"){
    updatePlayer(dt);
    updateWorld(dt);
    updateParticles(dt);
    $("hud-score").textContent = G.score;
    $("hud-best").textContent = "РЕКОРД " + G.best;
    $("hud-coins").textContent = "💰 " + G.coins;
    render();
  } else if(G.state === "dead"){
    updateParticles(dt);
    render();
  }
  requestAnimationFrame(loop);
}

/* ═══════════ UI ═══════════ */
function bindUI(){
  $("btn-play").onclick = function(){ ensureAudio(); startGame(); };
  $("btn-skins").onclick = function(){ renderSkins(); showScreen("skins-screen"); };
  $("btn-shop").onclick = function(){ renderShop(); showScreen("shop-screen"); };
  $("btn-ach").onclick = function(){ renderAchievements(); showScreen("ach-screen"); };
  $("btn-settings").onclick = function(){ openSettings(); };

  $("hud-pause").onclick = function(){
    if(G.state !== "playing") return;
    G.state = "paused";
    $("pause-score").textContent = G.score;
    $("pause-best").textContent = G.best;
    showScreen("pause-menu");
  };
  $("btn-resume").onclick = function(){ hideAllScreens(); G.state = "playing"; };
  $("btn-pause-restart").onclick = function(){ startGame(); };
  $("btn-pause-menu").onclick = function(){
    G.state = "menu"; showHUD(false); updateMenuStats(); showScreen("menu");
  };
  $("btn-pause-settings").onclick = function(){ openSettings("pause-menu"); };

  $("btn-settings-close").onclick = function(){
    saveGame();
    var back = $("settings").dataset.back || "menu";
    if(back === "pause-menu" && G.state === "paused"){ showScreen("pause-menu"); }
    else { updateMenuStats(); showScreen("menu"); }
  };
  setupToggle("set-sound", "soundOn");
  setupToggle("set-vibration", "vibrationOn");
  setupToggle("set-particles", "particlesOn");
  setupToggle("set-parallax", "parallaxOn");
  setupToggle("set-gyro", "gyroEnabled", function(v){
    if(v) requestGyro(); else G.gyroEnabled = false;
  });

  $("btn-skins-close").onclick = function(){ updateMenuStats(); showScreen("menu"); };
  $("btn-shop-close").onclick = function(){ updateMenuStats(); showScreen("menu"); };
  $("btn-ach-close").onclick = function(){ updateMenuStats(); showScreen("menu"); };
  $("btn-ach-reset").onclick = function(){
    if(confirm("Сбросить рекорд и всю статистику?")){
      G.best = 0; G.coins = 0; G.gamesPlayed = 0;
      G.pLevel = 1; G.pXp = 0; G.pXpNeed = 100;
      saveGame(); updateMenuStats(); renderAchievements();
      toast("Прогресс сброшен");
    }
  };

  $("btn-revive").onclick = function(){ showAd(); hideAllScreens(); startGame(); };
  $("btn-restart").onclick = function(){ hideAllScreens(); startGame(); };
  $("btn-menu").onclick = function(){
    G.state = "menu"; showHUD(false); updateMenuStats(); showScreen("menu");
  };
}
function setupToggle(id, key, cb){
  var el = $(id);
  el.classList.toggle("on", !!G[key]);
  el.onclick = function(){
    G[key] = !G[key];
    el.classList.toggle("on", !!G[key]);
    saveGame();
    if(cb) cb(G[key]);
  };
}
function openSettings(back){
  $("settings").dataset.back = back || "menu";
  showScreen("settings");
}
function requestGyro(){
  if(typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"){
    DeviceOrientationEvent.requestPermission().then(function(state){
      if(state === "granted"){ G.gyroEnabled = true; G.gyroPermission = true; toast("Гироскоп активен"); }
      else { G.gyroEnabled = false; toast("Нет разрешения"); }
      $("set-gyro").classList.toggle("on", G.gyroEnabled);
    }).catch(function(){ G.gyroEnabled = false; $("set-gyro").classList.remove("on"); });
  } else {
    G.gyroEnabled = !G.gyroEnabled;
    G.gyroPermission = G.gyroEnabled;
    toast(G.gyroEnabled ? "Гироскоп ВКЛ" : "Гироскоп ВЫКЛ");
  }
}

/* ═══════════ ВВОД ═══════════ */
function setupGameInput(){
  window.addEventListener("keydown", function(e){
    G.keys[e.key] = true;
    if(e.key === "Escape" && G.state === "playing"){ $("hud-pause").click(); }
  });
  window.addEventListener("keyup", function(e){ G.keys[e.key] = false; });

  // Преобразуем экранные координаты в игровые (0..480)
  function screenToGameX(clientX){
    var rect = cv.getBoundingClientRect();
    return (clientX - rect.left) / rect.width * VIRTUAL_W;
  }

  cv.addEventListener("mousemove", function(e){
    if(G.state !== "playing") return;
    G.touchX = screenToGameX(e.clientX);
  });
  cv.addEventListener("mousedown", function(e){
    if(G.state !== "playing") return;
    G.touchX = screenToGameX(e.clientX);
  });
  cv.addEventListener("mouseleave", function(){ G.touchX = null; });

  cv.addEventListener("touchstart", function(e){
    if(G.state !== "playing") return;
    if(e.touches.length === 0) return;
    G.touchX = screenToGameX(e.touches[0].clientX);
  }, {passive:true});
  cv.addEventListener("touchmove", function(e){
    if(G.state !== "playing") return;
    if(e.touches.length === 0) return;
    G.touchX = screenToGameX(e.touches[0].clientX);
  }, {passive:true});
  cv.addEventListener("touchend", function(){ G.touchX = null; }, {passive:true});

  window.addEventListener("deviceorientation", function(e){
    if(!G.gyroEnabled) return;
    if(e.gamma !== null && e.gamma !== undefined){
      G.gyroValue = clamp(e.gamma / 40, -1, 1);
      G.gyroPermission = true;
    }
  });
}

/* ═══════════ BOOTSTRAP ═══════════ */
function bootstrap(){
  onResize();
  loadGame();
  bindUI();
  setupGameInput();
  updateMenuStats();

  // Стартовое состояние — игрок по центру
  G.player.x = VIRTUAL_W / 2;
  G.player.y = VIRTUAL_H * 0.65;
  G.camY = G.player.y - VIRTUAL_H * 0.55;

  showScreen("menu");

  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  setInterval(function(){
    var w1 = window.innerWidth, h1 = window.innerHeight;
    if(w1 > 100 && h1 > 100 && (w1 !== G.w || h1 !== G.h)) onResize();
  }, 1000);

  G.lastTime = performance.now();
  requestAnimationFrame(loop);

  document.addEventListener("click", ensureAudio, { once:true });
  document.addEventListener("touchstart", ensureAudio, { once:true });
}
bootstrap();