// --- Flight Simulator for Mobile with Ground/Runway and Takeoff/Landing ---

// PHYSICS CONSTANTS
const DEG = Math.PI/180, G = 9.81, MASS = 1000, WING_AREA = 14, AIR_DENSITY = 1.22;
const MAX_THRUST = 2500, LIFT_COEFF = 1.13, DRAG_COEFF = 0.035, STALL_ANGLE = 18*DEG;

// CANVAS SETUP
const CANVAS = document.getElementById("flightCanvas"), CTX = CANVAS.getContext("2d");
let width = CANVAS.width = window.innerWidth, height = CANVAS.height = Math.floor(window.innerHeight*0.60);
window.addEventListener('resize', ()=>{
  width = CANVAS.width = window.innerWidth;
  height = CANVAS.height = Math.floor(window.innerHeight*0.60);
});

// UI DOM HOOKS
const AIRSPEED_DOM = document.getElementById("airspeed"),
      ALTITUDE_DOM = document.getElementById("altitude"),
      HEADING_DOM = document.getElementById("heading"),
      WARNING_DOM = document.getElementById("warning");

// --- AIRCRAFT STATE, starts on runway ---
const state = {
  x: 0,
  y: 3,   // 3 meters above "ground" (runway)
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  pitch: 0,
  roll: 0,
  yaw: 0,
  elevator: 0,
  aileron: 0,
  rudder: 0,
  throttle: 0.0, // idle
  camera: 1,
  stall: false,
  warningText: "",
  onGround: true // NEW
};

// SOUND SETUP (optional)
const engineSound = document.getElementById("engineSound"),
      windSound = document.getElementById("windSound"),
      stallSound = document.getElementById("stallSound");
if(engineSound && windSound && stallSound) {
  engineSound.volume = 0.55; windSound.volume = 0.22; stallSound.volume = 1;
}

// TOUCH CONTROLS
document.getElementById("btn-up").ontouchstart = ()=>{ state.elevator = -1; };
document.getElementById("btn-down").ontouchstart = ()=>{ state.elevator = 1; };
document.getElementById("btn-left").ontouchstart = ()=>{ state.aileron = -1; };
document.getElementById("btn-right").ontouchstart = ()=>{ state.aileron = 1; };
document.getElementById("btn-center").ontouchstart = ()=>{ state.elevator=0;state.aileron=0;state.rudder=0; state.warningText=""; };
document.getElementById("btn-throttle-up").ontouchstart = ()=>{ state.throttle = clamp(state.throttle+0.08, 0, 1); };
document.getElementById("btn-throttle-down").ontouchstart = ()=>{ state.throttle = clamp(state.throttle-0.08, 0, 1); };
document.getElementById("btn-rudder-left").ontouchstart = ()=>{ state.rudder = -1; };
document.getElementById("btn-rudder-right").ontouchstart = ()=>{ state.rudder = 1; };
document.getElementById("btn-reset").ontouchstart = ()=>{ Object.assign(state, {
  x:0, y:3, z:0, vx:0, vy:0, vz:0, pitch:0, roll:0, yaw:0, elevator:0, aileron:0, rudder:0, throttle:0, onGround:true
}); };
document.getElementById("btn-camera").ontouchstart = ()=>{ state.camera = state.camera % 4 + 1; };

['btn-up','btn-down','btn-left','btn-right','btn-rudder-left','btn-rudder-right'].forEach(id=>{
  document.getElementById(id).ontouchend = ()=>{ if(id.startsWith('btn-rudder'))state.rudder=0;else { state.elevator=0; state.aileron=0; } };
});

function clamp(x, a, b) { return Math.max(a, Math.min(x, b)); }

// --- MAIN SIMULATION LOOP ---
function animate() {
  let speed = Math.sqrt(state.vx**2 + state.vy**2 + state.vz**2);

  // ----- GROUND AND TAKEOFF LOGIC -----
  if (state.y <= 3) { // On runway
    state.y = 3;
    state.vy = 0;
    if (speed < 20) {
      state.onGround = true;
      state.vx *= 0.98; // friction slows the ship on the ground
    } else if (state.throttle > 0.5 && speed > 22) {
      state.onGround = false; // liftoff!
    }
  } else {
    state.onGround = false;
  }

  // ----- CONTROLS -----
  if (!state.onGround) {
    if(state.elevator){ state.pitch += state.elevator*0.002; }
    if(state.aileron){ state.roll += state.aileron*0.002; }
    if(state.rudder){ state.yaw += state.rudder*0.002; }
    state.pitch = Math.max(-0.45, Math.min(state.pitch, 0.45));
    state.roll = Math.max(-0.8, Math.min(state.roll, 0.8));
  }

  // --- PHYSICS ---
  if (!state.onGround) {
    let thrust = MAX_THRUST * state.throttle;
    let aoa = -state.pitch;
    let lift = 0.5 * AIR_DENSITY * speed * speed * WING_AREA * LIFT_COEFF * Math.cos(aoa);
    let drag = 0.5 * AIR_DENSITY * speed * speed * WING_AREA * DRAG_COEFF;

    let fx = thrust * Math.cos(state.pitch) - drag;
    let fy = lift - MASS*G*Math.cos(state.pitch);

    state.vx += fx / MASS * 0.022;
    state.vy += fy / MASS * 0.022;
  } else {
    // On ground: throttle moves forward, brakes slow down
    state.vx += 25 * state.throttle * 0.022;
  }

  // --- UPDATE POSITION ---
  state.x += state.vx * 0.022;
  state.y += state.vy * 0.022;
  if (state.y < 3) { state.y = 3; state.vy = 0; }

  // --- WARNINGS ---
  let showWarn = '';
  if (speed > 180) showWarn = 'OVERSPEED';
  if (Math.abs(state.pitch) > 0.3 && !state.onGround) showWarn = 'STALL';
  state.warningText = showWarn;

  // --- UI DATA ---
  AIRSPEED_DOM.textContent = `Airspeed: ${Math.round(speed)}`;
  ALTITUDE_DOM.textContent = `Altitude: ${Math.max(0,Math.round(state.y-3))}`;
  HEADING_DOM.textContent = `Heading: ${Math.round((state.yaw*180/Math.PI)%360)}`;
  WARNING_DOM.textContent = showWarn;

  // --- OPTIONAL: Sounds ---
  if(engineSound && windSound && stallSound){
    engineSound.playbackRate = 0.9 + 0.3*state.throttle;
    engineSound.volume = 0.3 + 0.28*state.throttle;
    windSound.volume = 0.12 + Math.min(speed/120,1)*.19;
    if(engineSound.paused)engineSound.play();
    if(windSound.paused)windSound.play();
    if(showWarn === 'STALL' && stallSound.paused) stallSound.play();
  }

  render();
  requestAnimationFrame(animate);
}

// --- RENDER FUNCTION ---
function render() {
  CTX.clearRect(0,0,width,height);
  // --- Space gradient sky ---
  let grad = CTX.createLinearGradient(0,0,0,height);
  grad.addColorStop(0,"#1e2847");
  grad.addColorStop(1,"#050010");
  CTX.fillStyle=grad;
  CTX.fillRect(0,0,width,height);

  // --- Draw ground and runway (NEW) ---
  CTX.fillStyle = "#173526";
  CTX.fillRect(0, height*0.8, width, height*0.2);
  // Runway
  CTX.fillStyle = "#3d4847";
  CTX.fillRect(width/2 - 50, height*0.87, 100, height*0.03);

  // --- Ship (centered, aviation-glow) ---
  let cx = width/2, cy = height*0.67, L=60;
  CTX.save();
  CTX.translate(cx,cy);
  CTX.rotate(state.roll);
  // Body
  CTX.beginPath();
  CTX.moveTo(0,-L*0.6); CTX.lineTo(L*0.19,L*0.22); CTX.lineTo(0, L*0.39); CTX.lineTo(-L*0.19,L*0.22); CTX.closePath();
  CTX.fillStyle="#04faff"; CTX.shadowColor="#55eaff"; CTX.shadowBlur=12; CTX.fill(); CTX.shadowBlur=0;
  // Cockpit
  CTX.beginPath(); CTX.ellipse(0,-L*0.18,L*0.10,L*0.15,0,0,2*Math.PI); CTX.fillStyle="#1eefffcc"; CTX.fill();
  CTX.restore();
}

animate();


