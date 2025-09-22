// Constants (physics)
const DEG = Math.PI/180, G = 9.81, MASS = 1000, WING_AREA = 14, AIR_DENSITY = 1.22;
const MAX_THRUST = 2500, LIFT_COEFF = 1.13, DRAG_COEFF = 0.035, STALL_ANGLE = 18*DEG;
const CANVAS = document.getElementById("flightCanvas"), CTX = CANVAS.getContext("2d");
const AIRSPEED_DOM = document.getElementById("airspeed"), ALTITUDE_DOM = document.getElementById("altitude"),
      HEADING_DOM = document.getElementById("heading"), WARNING_DOM = document.getElementById("warning");

let width = CANVAS.width = window.innerWidth, height = CANVAS.height = Math.floor(window.innerHeight*0.60);

window.addEventListener('resize', ()=>{
  width = CANVAS.width = window.innerWidth;
  height = CANVAS.height = Math.floor(window.innerHeight*0.60);
});

/* Spaceship State */
const state = {
  x: 0, y: 80, z: 0,
  vx: 0, vy: 0, vz: 0,
  pitch: 0, roll: 0, yaw: 0,
  elevator: 0, aileron: 0, rudder: 0, throttle: 0.72,
  camera: 1,
  stall: false,
  warningText: "",
};

function clamp(x,a,b){ return Math.max(a,Math.min(x,b)); }

/* --- Sound: Audio elements --- */
const engineSound = document.getElementById("engineSound"),
      windSound = document.getElementById("windSound"),
      stallSound = document.getElementById("stallSound");
engineSound.volume = 0.55; windSound.volume = 0.22; stallSound.volume = 1;

/* --- Touch Controls --- */
document.getElementById("btn-up").ontouchstart = ()=>{ state.elevator = -1; };
document.getElementById("btn-down").ontouchstart = ()=>{ state.elevator = 1; };
document.getElementById("btn-left").ontouchstart = ()=>{ state.aileron = -1; };
document.getElementById("btn-right").ontouchstart = ()=>{ state.aileron = 1; };
document.getElementById("btn-center").ontouchstart = ()=>{ state.elevator=0;state.aileron=0;state.rudder=0; state.warningText=""; };
document.getElementById("btn-throttle-up").ontouchstart = ()=>{ state.throttle = clamp(state.throttle+0.08, 0, 1); };
document.getElementById("btn-throttle-down").ontouchstart = ()=>{ state.throttle = clamp(state.throttle-0.08, 0, 1); };
document.getElementById("btn-rudder-left").ontouchstart = ()=>{ state.rudder = -1; };
document.getElementById("btn-rudder-right").ontouchstart = ()=>{ state.rudder = 1; };
document.getElementById("btn-reset").ontouchstart = ()=>{ Object.assign(state, {x:0,y:70,z:0,vx:0,vy:0,vz:0,pitch:0,roll:0,yaw:0,throttle:0.75}); };
document.getElementById("btn-camera").ontouchstart = ()=>{ state.camera = state.camera % 4 + 1; };

['btn-up','btn-down','btn-left','btn-right','btn-rudder-left','btn-rudder-right'].forEach(id=>{
  document.getElementById(id).ontouchend = ()=>{ if(id.startsWith('btn-rudder'))state.rudder=0;else if(id.startsWith('btn-')){state.elevator=0;state.aileron=0;} };
});

/* --- Main Loop --- */
function animate() {
  // Physics: simple 2D
  let speed = Math.sqrt(state.vx**2 + state.vy**2 + state.vz**2);
  let aoa = clamp(-state.pitch, -STALL_ANGLE, STALL_ANGLE); // angle of attack
  let lift = 0.5 * AIR_DENSITY * speed * speed * WING_AREA * LIFT_COEFF * Math.cos(aoa);
  let drag = 0.5 * AIR_DENSITY * speed * speed * WING_AREA * DRAG_COEFF + 30*Math.abs(state.rudder);
  let thrust = MAX_THRUST*state.throttle;

  // Apply controls (simplified)
  if(state.elevator){ state.pitch += state.elevator*0.003; }
  if(state.aileron){ state.roll += state.aileron*0.003; }
  if(state.rudder){ state.yaw += state.rudder*0.003; }
  state.pitch = clamp(state.pitch, -0.45, 0.45);
  state.roll = clamp(state.roll, -0.8, 0.8);

  // Apply forces
  let fx = thrust * Math.cos(state.pitch) - drag;
  let fy = lift - MASS*G*Math.cos(state.pitch);
  state.vx += fx/MASS;
  state.vy += fy/MASS;
  state.x += state.vx*0.022;
  state.y += state.vy*0.022;
  if(state.y<0){state.y=0; state.vy=0;}

  // Camera
  render();

  // Audio feedback
  engineSound.playbackRate = 0.88 + 0.44*state.throttle;
  engineSound.volume = 0.38 + 0.17*state.throttle;
  windSound.volume = 0.18 + Math.min(speed/150,1)*.15;
  if(engineSound.paused)engineSound.play();
  if(windSound.paused)windSound.play();

  // Warnings
  state.stall = Math.abs(aoa) > STALL_ANGLE-5*DEG && speed>28;
  state.warningText = state.stall ? "STALL" : (speed>180?"OVERSPEED":"");
  if(state.stall && stallSound.paused){ stallSound.play(); }
  WARNING_DOM.textContent = state.warningText;

  // Data readouts
  AIRSPEED_DOM.textContent = `Airspeed: ${Math.round(speed)}`;
  ALTITUDE_DOM.textContent = `Altitude: ${Math.round(state.y)}`;
  HEADING_DOM.textContent = `Heading: ${Math.round((state.yaw*180/Math.PI)%360)}`;
  requestAnimationFrame(animate);
}
animate();

/* --- Render: Futuristic spaceship, neon aviation theme --- */
function render(){
  CTX.clearRect(0,0,width,height);
  // space gradient
  let grad = CTX.createLinearGradient(0,0,0,height);
  grad.addColorStop(0,"#1e2847"); grad.addColorStop(1,"#050010");
  CTX.fillStyle=grad; CTX.fillRect(0,0,width,height);

  // stars
  for(let i=0;i<32;i++){
    CTX.fillStyle=`rgba(230,255,252,${Math.random()*0.2+0.08})`;
    CTX.beginPath();
    CTX.arc(Math.random()*width,Math.random()*height,Math.random()*1.5+0.8,0,7);
    CTX.fill();
  }

  // planet below
  CTX.save();
  CTX.globalAlpha=0.17;
  CTX.beginPath();
  CTX.arc(width/2, height+88, width*0.77, Math.PI,2*Math.PI);
  CTX.closePath();
  CTX.fillStyle="#38dfff";
  CTX.fill();
  CTX.restore();

  // runway (as neon matrix grid)
  CTX.save();
  CTX.strokeStyle="#2eebff";
  for(let y=height-40;y>height-100;y-=10){
    CTX.beginPath(); CTX.moveTo(width/2-30,y); CTX.lineTo(width/2+30,y); CTX.stroke();
  }
  CTX.restore();

  // spaceship (centered, rotation based on pitch/roll)
  let cx = width/2, cy = height*0.67, L=60;
  CTX.save();
  CTX.translate(cx,cy);
  CTX.rotate(state.roll);
  // Body fuselage
  CTX.beginPath();
  CTX.moveTo(0,-L*0.6);
  CTX.lineTo(L*0.19, L*0.22);
  CTX.lineTo(0, L*0.39);
  CTX.lineTo(-L*0.19, L*0.22);
  CTX.closePath();
  CTX.fillStyle="#04faff"; CTX.shadowColor="#55eaff"; CTX.shadowBlur=12; CTX.fill();
  CTX.shadowBlur=0;

  // cockpit
  CTX.beginPath();
  CTX.ellipse(0,-L*0.18,L*0.10,L*0.15,0,0,2*Math.PI);
  CTX.fillStyle="#1eefffcc"; CTX.fill();
  // side engines
  CTX.beginPath();
  CTX.arc(-L*0.14,L*0.17, L*0.08, 0, 2*Math.PI);
  CTX.arc(L*0.14,L*0.17, L*0.08, 0, 2*Math.PI);
  CTX.fillStyle="#33faffbb"; CTX.fill();
  // glowing engine trails
  CTX.beginPath();
  CTX.ellipse(-L*0.14,L*0.27,5,16,0,0,2*Math.PI);
  CTX.ellipse(L*0.14,L*0.27,5,16,0,0,2*Math.PI);
  CTX.fillStyle="rgba(40,255,250,0.27)"; CTX.fill();
  CTX.restore();
}

