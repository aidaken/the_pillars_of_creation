import * as THREE from 'three'

const vertSrc = `
varying vec3 vWorldPos;
void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragSrc = `
precision highp float;
varying vec3 vWorldPos;
uniform vec3 uCamPos;
uniform float uTime;
uniform float uMode;

float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = smoothstep(0.0, 1.0, fract(p));
  return mix(
    mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
        mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
        mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),
    f.z);
}

float fbm(vec3 p) {
  float v=0.0; float a=0.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=0.5;}
  return v;
}

float smin(float a, float b, float k) {
  float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);
  return mix(b,a,h)-k*h*(1.0-h);
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa=p-a, ba=b-a;
  float t=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
  return length(pa-ba*t)-r;
}

float sdSphere(vec3 p, vec3 c, float r) {
  return length(p-c)-r;
}

vec3 domainWarp(vec3 p) {
  float s1 = 0.20;
  vec3 q = vec3(
    fbm(p * s1),
    fbm(p * s1 + vec3(5.2, 1.3, 2.8)) * 0.3,
    fbm(p * s1 + vec3(1.7, 9.2, 3.4))
  ) * 3.0;
  float s2 = 0.55;
  vec3 r = vec3(
    fbm(p * s2 + q),
    fbm(p * s2 + q + vec3(8.3, 2.8, 5.1)) * 0.3,
    fbm(p * s2 + q + vec3(4.1, 7.6, 1.9))
  ) * 0.9;
  return p + q + r;
}

float pillar3SDF(vec3 pos) {
  vec3 lp = pos;
  lp *= 1.6;  // scale up local = smaller rendered size

  // Slight left lean
  lp.x -= lp.y * 0.03;

  // Organic warp — same as other pillars
  vec3 wp = domainWarp(lp);

  // Main trunk — wide and short
  float trunk = sdCapsule(wp,
    vec3(0.0, -2.0, 0.0),
    vec3(-0.5, 10.0, 0.0),
    6.5 - lp.y * 0.18   // very wide base, tapers
  );

  // Ragged broken stump top — irregular blobs not clean finger
  float stump1 = sdSphere(wp, vec3(-0.5, 11.5, 0.0), 2.8);
  float stump2 = sdSphere(wp, vec3(1.5,  10.5, 0.2), 2.2);
  float stump3 = sdSphere(wp, vec3(-2.5, 10.0,-0.2), 1.8);

  // Horizontal arm extending RIGHT — most distinctive feature
  float arm = sdCapsule(wp,
    vec3(1.0, 7.0,-0.2),
    vec3(7.5, 6.0,-0.5),
    1.4
  );

  // Arm tip blob
  float armTip = sdSphere(wp, vec3(7.8, 6.0,-0.5), 1.8);

  // Wide irregular base
  float base = sdSphere(wp, vec3(0.5, -1.5, 0.5), 6.0);

  // Small upward protrusion left side
  float leftNub = sdCapsule(wp,
    vec3(-3.5, 7.5, 0.3),
    vec3(-4.5, 11.0, 0.2),
    1.0
  );

  // EGG nodules at stump top
  float eggMask = smoothstep(8.0, 12.0, lp.y);
  vec3 eggP = wp + fbm(wp*6.0+7.7)*0.4*eggMask;
  float egg1 = sdSphere(eggP, vec3(-0.5,12.5,0.0), 0.7);
  float egg2 = sdSphere(eggP, vec3(1.8, 11.5,0.2), 0.6);

  // Detached small satellite blobs below arm
  float sat1 = sdSphere(wp, vec3(4.5, 2.5,-1.5), 0.9);
  float sat2 = sdSphere(wp, vec3(-5.5, 3.5, 1.8), 0.75);

  // Smooth union
  float k = 3.5;
  float d = trunk;
  d = smin(d, stump1, k*0.8);
  d = smin(d, stump2, k*0.7);
  d = smin(d, stump3, k*0.7);
  d = smin(d, arm,    k*0.6);
  d = smin(d, armTip, k*0.5);
  d = smin(d, base,   k*1.2);
  d = smin(d, leftNub,k*0.7);
  d = smin(d, egg1,   0.30);
  d = smin(d, egg2,   0.30);

  // Satellites separate and sharp
  d = min(d, sat1);
  d = min(d, sat2);

  return d;
}

float pillar3Density(vec3 pos) {
  float sdf = pillar3SDF(pos);
  float yFade = smoothstep(-4.0, 2.0, pos.y)
              * smoothstep(18.0, 13.0, pos.y);  // much shorter
  float zFade = exp(-pos.z * pos.z * 0.016);
  if(sdf > 4.5) return 0.0;

  // Hard edge — 100% opaque core
  float core = exp(-max(sdf, 0.0) * 0.18)
             * clamp(-sdf * 0.35 + 0.95, 0.0, 1.0);

  // Narrow outer wisp
  float outerGas = exp(-max(sdf, 0.0) * 0.40)
                 * fbm(pos * 0.14 + 2.3) * 0.35;

  // Fraying tips
  float frayNoise = fbm(pos * 3.8 + 5.1);
  float frayMask  = smoothstep(10.0, 16.0, pos.y);
  float fray      = frayNoise * frayMask * 0.65;

  float density = max(core, outerGas) - fray;
  return clamp(density * zFade * yFade, 0.0, 1.0);
}

vec3 calcNormal(vec3 pos) {
  vec2 e = vec2(0.3, 0.0);
  return normalize(vec3(
    pillar3SDF(pos+e.xyy) - pillar3SDF(pos-e.xyy),
    pillar3SDF(pos+e.yxy) - pillar3SDF(pos-e.yxy),
    pillar3SDF(pos+e.yyx) - pillar3SDF(pos-e.yyx)
  ));
}

void main() {
  vec3 ro = uCamPos;
  vec3 rd = normalize(vWorldPos - uCamPos);

  vec4 col = vec4(0.0);
  float t = 0.1;

  for(int i=0; i<80; i++) {
    if(col.a > 0.95 || t > 110.0) break;
    vec3 pos = ro + rd * t;

    if(pos.y < -5.0 || pos.y > 20.0 || abs(pos.x) > 20.0 || abs(pos.z) > 14.0) {
      t += 2.0; continue;
    }

    float sdfVal  = pillar3SDF(pos);
    float density = pillar3Density(pos);

    if(density > 0.01) {
      float h        = clamp(pos.y / 14.0, 0.0, 1.0);
      float coreness = clamp(-sdfVal / 3.0, 0.0, 1.0);
      float tip      = pow(clamp((pos.y-7.0)/6.0,0.0,1.0),1.5);

      vec3 sampleCol;
      if(uMode < 0.5) {
        // HUBBLE — darkest pillar, deep umber/shadow tones
        vec3 shadow = vec3(0.03, 0.010, 0.002);
        vec3 sienna = vec3(0.22, 0.07, 0.02);
        vec3 cream  = vec3(0.95, 0.92, 0.78);
        sampleCol = mix(shadow, sienna, coreness * 0.88);
        sampleCol = mix(sampleCol, cream, tip * 0.85);
        sampleCol += cream * pow(tip, 4.0) * 2.8;
        // Internal star-forming knots
        float knotGlow = smoothstep(6.0, 12.0, pos.y)
                       * fbm(pos * 1.8 + 3.3) * coreness * 0.5;
        sampleCol += vec3(0.7, 0.20, 0.04) * knotGlow;
        // Protostar at stump apex
        float star = exp(-length(pos-vec3(-0.5,12.5,0.0))*2.5);
        sampleCol += vec3(1.0,0.97,0.85) * star * 6.0;
      } else {
        // WEBB INFRARED
        vec3 shadow = vec3(0.22, 0.05, 0.01);
        vec3 orange = vec3(0.65, 0.22, 0.04);
        vec3 hotTip = vec3(0.95, 0.78, 0.50);
        sampleCol = mix(shadow, orange, coreness * 0.95);
        sampleCol = mix(sampleCol, hotTip, tip * 0.90);
        sampleCol += hotTip * pow(tip, 3.0) * 3.2;
        // Webb internal knot structure
        float knotGlow = smoothstep(5.0, 12.0, pos.y)
                       * fbm(pos * 2.0 + 4.1) * coreness * 0.85;
        sampleCol += vec3(0.85, 0.30, 0.07) * knotGlow;
        // Stellar jet from arm tip
        float jetAngle = (pos.x - 7.8) * 0.5 - (pos.y - 6.0) * 0.3;
        sampleCol += vec3(0.90, 0.50, 0.12)
          * exp(-jetAngle * jetAngle * 1.5)
          * smoothstep(4.0, 8.0, pos.y) * 0.75;
      }

      // Fresnel rim
      vec3 norm = calcNormal(pos);
      float fresnel = pow(1.0 - abs(dot(normalize(rd), norm)), 6.0);
      sampleCol += (uMode < 0.5
        ? vec3(0.65, 0.85, 0.80)
        : vec3(0.95, 0.58, 0.25)) * fresnel * (uMode < 0.5 ? 1.0 : 0.9);

      // Top lighting
      sampleCol *= 0.3 + 0.9 * h;

      // Darkest pillar — boosted opacity
      float alpha = density * (uMode < 0.5 ? 0.22 : 0.07);
      col.rgb += sampleCol * alpha * (1.0 - col.a);
      col.a   += alpha * (1.0 - col.a);

      t += max(abs(sdfVal) * 0.3, 0.22);
    } else {
      t += max(abs(sdfVal) * 0.5, 0.55);
    }
  }

  if(col.a < 0.005) discard;
  gl_FragColor = col;
}
`

export function createPillar3(scene) {
  const geo = new THREE.SphereGeometry(40, 24, 24)
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    uniforms: {
      uCamPos: { value: new THREE.Vector3() },
      uTime:   { value: 0 },
      uMode:   { value: 0.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(0, 5, 0)
  scene.add(mesh)
  return { mesh, mat }
}

export function tickPillar3(mat, mesh, camera) {
  mat.uniforms.uCamPos.value
    .copy(camera.position)
    .sub(mesh.position)
}
