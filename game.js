import {GAME_HEIGHT as H, GROUND_HEIGHT, GRAVITY, FLAP_VELOCITY, BIRD_RADIUS, PILLAR_WIDTH, PILLAR_SPACING, difficulty, hitsPillar} from './physics.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d', {alpha:false});
const stage = $('game-stage');
const startScreen = $('start-screen');
const pauseScreen = $('pause-screen');
const gameoverScreen = $('gameover-screen');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const landscape = new Image();
const birdImage = new Image();
let W = 1100, scale = 1, dpr = 1;
let state = 'loading', score = 0, best = 0, soundOn = true;
let bird = {x:200,y:260,vy:0,tilt:0};
let pillars = [], particles = [], worldDistance = 0, flightTime = 0;
let gameTime = 0, lastTimestamp = 0, accumulator = 0, crashTime = 0, endAt = 0;
let nextCenter = H / 2, audioContext, newlyBest = false, flash = 0;
try { best = Math.max(0, Number(localStorage.getItem('habesha-wings-best')) || 0); soundOn = localStorage.getItem('habesha-wings-sound') !== 'off'; } catch {}
const formatScore = n => String(n).padStart(2,'0');
$('best-value').textContent = formatScore(best);
updateSoundButton();

function announce(message) { $('game-announcement').textContent = message; }
function resize() {
  const rect = stage.getBoundingClientRect();
  const previousWidth = W;
  W = H * rect.width / rect.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  scale = rect.height * dpr / H;
  const previousX = bird.x;
  bird.x = Math.max(91, Math.min(W * .245, 320));
  if (['playing','paused','crashing'].includes(state) && Math.abs(previousWidth-W) > 15) {
    for (const p of pillars) p.x += bird.x - previousX;
    pause();
  }
}
new ResizeObserver(resize).observe(stage);
resize();

function initializeAudio() {
  if (!soundOn) return;
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(()=>{});
  } catch {}
}
function tone(frequency, duration, type='sine', volume=.055, delay=0, slide=frequency) {
  if (!soundOn || !audioContext || audioContext.state !== 'running') return;
  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency,start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,slide),start+duration);
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(volume,start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(start); oscillator.stop(start+duration+.02);
}
function updateSoundButton() {
  const button = $('sound-button');
  button.setAttribute('aria-pressed',String(soundOn));
  button.setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');
  button.title = soundOn?'Sound on · M to mute':'Sound off · M to unmute';
}
function toggleSound() {
  soundOn = !soundOn; updateSoundButton();
  try {localStorage.setItem('habesha-wings-sound',soundOn?'on':'off');} catch {}
  initializeAudio();
  if (soundOn) tone(660,.1,'sine',.04);
}

function startGame() {
  if (state === 'loading') return;
  initializeAudio();
  state = 'playing'; score = 0; flightTime = 0; crashTime = 0; flash = 0;
  bird = {x:Math.max(91,Math.min(W*.245,320)),y:H*.46,vy:0,tilt:0};
  pillars = []; particles = []; nextCenter = H*.46; newlyBest = false;
  addPillar(Math.min(W+50,bird.x+470),true);
  while (pillars[pillars.length-1].x < W) addPillar(pillars[pillars.length-1].x+PILLAR_SPACING);
  startScreen.hidden = true; pauseScreen.hidden = true; gameoverScreen.hidden = true;
  $('scene-shade').classList.add('inactive');
  $('landscape-caption').hidden = true; $('pause-button').hidden = false;
  $('in-game-hint').hidden = false;
  $('score-value').textContent = '00';
  accumulator = 0;
  document.activeElement?.blur();
  announce('Flight started. Tap or press Space to flap. P or Escape pauses.');
  flap();
}
function flap() {
  if (state !== 'playing') return;
  bird.vy = FLAP_VELOCITY;
  tone(550,.09,'sine',.025,0,830);
  if (!reduceMotion) for (let i=0;i<3;i++) particles.push({x:bird.x-22,y:bird.y+5,vx:-40-Math.random()*45,vy:10+Math.random()*25,life:.45,maxLife:.45,size:2+Math.random()*2,color:'#fff5bc'});
}
function addPillar(x, first=false) {
  const settings = difficulty(score);
  if (!first) nextCenter += (Math.random()-.5)*165;
  nextCenter = Math.max(149,Math.min(H-157,nextCenter));
  pillars.push({x,center:nextCenter,gap:settings.gap,passed:false});
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused'; pauseScreen.hidden = false; $('pause-button').hidden = true;
  $('in-game-hint').hidden = true;
  announce('Game paused. Press P or Escape to resume.');
  $('resume-button').focus({preventScroll:true});
}
function resume() {
  if (state !== 'paused') return;
  state = 'playing'; pauseScreen.hidden = true; $('pause-button').hidden = false;
  accumulator = 0; initializeAudio();
  document.activeElement?.blur();
  announce('Flight resumed.');
}
function crash() {
  if (state !== 'playing') return;
  state = 'crashing'; crashTime = 0; flash = reduceMotion?0:.2;
  $('pause-button').hidden = true; $('in-game-hint').hidden = true;
  tone(190,.22,'triangle',.06,0,65);
  if (score > best) {
    best = score; newlyBest = true;
    try {localStorage.setItem('habesha-wings-best',String(best));} catch {}
    $('best-value').textContent = formatScore(best);
  }
}
function finish() {
  state = 'gameover'; endAt = performance.now();
  $('final-score').textContent = String(score); $('final-best').textContent = String(best);
  $('result-eyebrow').textContent = newlyBest?'A NEW PERSONAL BEST!':'A LITTLE REST, THEN ANOTHER ADVENTURE';
  $('result-title').textContent = newlyBest?'Look at you fly.':'One more flight?';
  $('result-message').textContent = score===0?'Short, gentle taps. You’ll find your rhythm.':score<5?'You’re finding your wings. Keep going.':score<15?'A little higher. A little further.': 'The highlands look good on you.';
  gameoverScreen.hidden = false;
  announce(`Flight over. Score ${score}. Personal best ${best}. Press Space or choose Fly again to retry.`);
  $('retry-button').focus({preventScroll:true});
}
function action() {
  initializeAudio();
  if (state === 'ready') startGame();
  else if (state === 'playing') flap();
  else if (state === 'paused') resume();
  else if (state === 'gameover' && performance.now()-endAt > 350) startGame();
}
stage.addEventListener('pointerdown',event=>{
  if (event.target.closest('button')) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault(); action();
});
$('start-button').addEventListener('click',startGame);
$('retry-button').addEventListener('click',startGame);
$('pause-button').addEventListener('click',pause);
$('resume-button').addEventListener('click',resume);
$('sound-button').addEventListener('click',toggleSound);
document.addEventListener('keydown',event=>{
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (['Space','ArrowUp','KeyW'].includes(event.code)) {
    if (event.code==='Space' && event.target.closest('button') && !['start-button','retry-button','resume-button'].includes(event.target.id)) return;
    event.preventDefault(); if (!event.repeat) action();
  } else if (event.code==='KeyP'||event.code==='Escape') {
    event.preventDefault(); if (!event.repeat) {if (state==='paused') resume();else pause();}
  } else if (event.code==='KeyM' && !event.repeat) toggleSound();
});
document.addEventListener('visibilitychange',()=>{if (document.hidden) pause();});
window.addEventListener('blur',()=>pause());

function update(dt) {
  gameTime += dt;
  if (state==='ready' || state==='loading') { if (!reduceMotion) worldDistance += dt*10; return; }
  if (state==='paused' || state==='gameover') return;
  flash = Math.max(0,flash-dt);
  for (const p of particles) {p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  particles = particles.filter(p=>p.life>0);
  if (state==='crashing') {
    crashTime += dt;
    bird.vy = Math.min(bird.vy + GRAVITY*dt,650);
    bird.y = Math.min(H-GROUND_HEIGHT-BIRD_RADIUS,bird.y+bird.vy*dt);
    bird.tilt = Math.min(1.45,bird.tilt+dt*4);
    if (crashTime > .58) finish();
    return;
  }
  flightTime += dt;
  if (flightTime > 3) $('in-game-hint').hidden = true;
  const {speed} = difficulty(score);
  worldDistance += speed*dt;
  bird.vy += GRAVITY*dt; bird.y += bird.vy*dt;
  const targetTilt = Math.max(-.43,Math.min(1.28,bird.vy/430));
  bird.tilt += (targetTilt-bird.tilt)*Math.min(1,dt*11);
  // The sky is open: brushing the top gently caps altitude.
  if (bird.y < BIRD_RADIUS+3) {bird.y=BIRD_RADIUS+3;bird.vy=Math.max(0,bird.vy);}
  if (bird.y+BIRD_RADIUS >= H-GROUND_HEIGHT) {crash();return;}
  for (const pillar of pillars) {
    pillar.x -= speed*dt;
    if (hitsPillar(bird,pillar)) {crash();return;}
    if (!pillar.passed && pillar.x+PILLAR_WIDTH+5 < bird.x-BIRD_RADIUS) {
      pillar.passed = true; score++;
      $('score-value').textContent = formatScore(score);
      tone(660,.1,'sine',.045);tone(880,.13,'sine',.035,.08);
      if (!reduceMotion) for (let i=0;i<8;i++) particles.push({x:bird.x,y:bird.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,life:.5,maxLife:.5,size:2+Math.random()*3,color:i%2?'#f6d260':'#fffae3'});
    }
  }
  pillars = pillars.filter(p=>p.x+PILLAR_WIDTH>-20);
  const last = pillars[pillars.length-1];
  if (last && last.x < W+30) addPillar(last.x+PILLAR_SPACING);
}

function drawBackground() {
  ctx.fillStyle='#c8ddc0'; ctx.fillRect(0,0,W,H);
  if (landscape.complete && landscape.naturalWidth) {
    const factor = Math.max(W/landscape.width,H/landscape.height);
    const dw = landscape.width*factor, dh = landscape.height*factor;
    // A gentle camera drift keeps the full illustration intact on every screen.
    const overflow = Math.max(0,dw-W);
    const offset = overflow ? overflow*(.5+.18*Math.sin(worldDistance/1600)) : 0;
    ctx.drawImage(landscape,-offset,0,dw,dh);
  }
}
function wovenBand(x,y,width) {
  ctx.fillStyle='#f1e5ae';ctx.fillRect(x,y,width,26);
  ctx.fillStyle='#c77445';ctx.fillRect(x,y+2,width,3);ctx.fillRect(x,y+21,width,3);
  ctx.fillStyle='#dfbd4e';ctx.fillRect(x,y+7,width,12);
  ctx.save();ctx.beginPath();ctx.rect(x,y,width,26);ctx.clip();
  for (let i=-4;i<width+8;i+=17) {
    const cx=x+i+7,cy=y+13;
    ctx.fillStyle='#305b37';ctx.beginPath();ctx.moveTo(cx,cy-6);ctx.lineTo(cx+6,cy);ctx.lineTo(cx,cy+6);ctx.lineTo(cx-6,cy);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f7eaba';ctx.fillRect(cx-1.5,cy-1.5,3,3);
  }
  ctx.restore();
}
function drawColumn(x,y,height,top) {
  if (height<=0) return;
  const w=PILLAR_WIDTH;
  const gradient=ctx.createLinearGradient(x,0,x+w,0);
  gradient.addColorStop(0,'#294e32');gradient.addColorStop(.22,'#628350');gradient.addColorStop(.67,'#527445');gradient.addColorStop(1,'#284c32');
  ctx.fillStyle='#163a2717';ctx.fillRect(x+7,y+5,w,height);
  ctx.fillStyle=gradient;ctx.fillRect(x,y,w,height);
  ctx.fillStyle='#d6dda026';ctx.fillRect(x+8,y,3,height);
  ctx.fillStyle='#14352620';ctx.fillRect(x+w-9,y,3,height);
  const edgeY=top?y+height-37:y+7;
  wovenBand(x,edgeY,w);
  ctx.fillStyle='#193e2b';ctx.fillRect(x-5,top?y+height-8:y,w+10,8);
  ctx.fillStyle='#c7bf70';ctx.fillRect(x-5,top?y+height-8:y,w+10,3);
}
function drawPillars() {
  for (const p of pillars) {
    const top=p.center-p.gap/2, bottom=p.center+p.gap/2;
    drawColumn(p.x,0,top,true);
    drawColumn(p.x,bottom,H-GROUND_HEIGHT-bottom,false);
  }
}
function drawBird() {
  if (state==='ready'||state==='loading') return;
  ctx.save();ctx.translate(bird.x,bird.y);ctx.rotate(bird.tilt);
  if (birdImage.complete && birdImage.naturalWidth) {
    const width=65, height=65*birdImage.height/birdImage.width;
    const flutter=state==='playing'&&!reduceMotion?1+Math.sin(gameTime*29)*.024:1;
    ctx.scale(1,flutter);ctx.drawImage(birdImage,-width*.5,-height*.5,width,height);
  } else {ctx.fillStyle='#efc95c';ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function draw() {
  ctx.setTransform(scale,0,0,scale,0,0);
  drawBackground();
  if (state!=='ready' && state!=='loading') {
    drawPillars();
    for (const p of particles) {ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1; drawBird();
    ctx.fillStyle='#315b35';ctx.fillRect(0,H-GROUND_HEIGHT,W,GROUND_HEIGHT);
    ctx.fillStyle='#bcbe63';ctx.fillRect(0,H-GROUND_HEIGHT,W,4);
  }
  if (flash>0) {ctx.globalAlpha=flash*.8;ctx.fillStyle='#fff9db';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
}
function frame(timestamp) {
  const elapsed=lastTimestamp?Math.min((timestamp-lastTimestamp)/1000,.05):0;
  lastTimestamp=timestamp;accumulator+=elapsed;
  while (accumulator>=1/120) {update(1/120);accumulator-=1/120;}
  draw();requestAnimationFrame(frame);
}
function loadImage(image,url) {return new Promise(resolve=>{image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url;});}
Promise.all([loadImage(landscape,'./assets/highlands.png'),loadImage(birdImage,'./assets/bird.png')]).then(results=>{
  state='ready';$('start-button').disabled=false;$('start-button-label').textContent='Let’s fly';
  if (results.some(result=>!result)) announce('Some artwork could not load. You can still play.');
});
requestAnimationFrame(frame);
