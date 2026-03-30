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

float pillar2SDF(vec3 pos) {
  vec3 lp = pos;
  lp *= 1.35;  // scale — makes pillar smaller than Pillar 1

  // Leans LEFT toward Pillar 1
  lp.x -= lp.y * 0.06;

  // Gentle forward curve
  lp.z += sin(lp.y * 0.12) * 0.5;

  // Shredded vertical texture — anisotropic, suppressed on y
  vec3 shred = vec3(
    fbm(vec3(lp.x*4.5, lp.y*0.25, lp.z*4.5)) * 1.8,
    0.0,
    fbm(vec3(lp.x*4.5, lp.y*0.25, lp.z*4.5) + 5.1) * 1.8
  );
  vec3 structural = vec3(
    fbm(lp * 0.18 + vec3(2.3, 0.0, 1.1)) * 1.4,
    0.0,
    fbm(lp * 0.18 + vec3(6.1, 0.0, 3.8)) * 1.4
  );
  vec3 wp = lp + shred + structural;

  // Main trunk — very slender, finger-like
  float trunk = sdCapsule(wp,
    vec3(0.0, -1.5, 0.0),
    vec3(-1.0, 20.0, 0.0),
    3.8 - lp.y * 0.12
  );

  // Sharp single pointing tip
  float tipCap = sdCapsule(wp,
    vec3(-0.8, 18.0, 0.0),
    vec3(-1.5, 26.0, 0.0),
    max(1.2 - lp.y * 0.03, 0.05)
  );

  // Right side elbow bump — distinctive feature
  float elbow = sdSphere(wp, vec3(3.5, 11.0, -0.3), 2.8);

  // Small secondary protrusion right side upper
  float rightUpper = sdCapsule(wp,
    vec3(2.0, 14.0, -0.2),
    vec3(3.0, 18.5, -0.2),
    1.0
  );

  // Base — widens to connect with shared cloud
  float base = sdSphere(wp, vec3(0.0, -0.5, 0.3), 4.5);

  // EGG nodules at very tip
  float eggMask = smoothstep(18.0, 23.0, lp.y);
  vec3 eggP = wp + fbm(wp * 6.5 + 8.8) * 0.35 * eggMask;
  float egg1 = sdSphere(eggP, vec3(-1.5, 26.5, 0.0), 0.75);
  float egg2 = sdSphere(eggP, vec3(-0.5, 25.0, 0.1), 0.60);

  // Small detached satellite
  float sat = sdSphere(wp, vec3(6.0, 8.5, -1.5), 1.0);

  float k = 2.8;
  float d = trunk;
  d = smin(d, tipCap,     k * 0.5);
  d = smin(d, elbow,      k * 0.9);
  d = smin(d, rightUpper, k * 0.6);
  d = smin(d, base,       k * 1.1);
  d = smin(d, egg1,       0.30);
  d = smin(d, egg2,       0.30);
  d = min(d, sat);
  return d;
}

float pillar2Density(vec3 pos) {
  float sdf = pillar2SDF(pos);
  float yFade = smoothstep(-4.0, 2.0, pos.y)
              * smoothstep(30.0, 23.0, pos.y);
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
  float frayMask  = smoothstep(18.0, 24.0, pos.y);
  float fray      = frayNoise * frayMask * 0.65;

  float density = max(core, outerGas) - fray;
  return clamp(density * zFade * yFade, 0.0, 1.0);
}

vec3 calcNormal(vec3 pos) {
  vec2 e = vec2(0.3, 0.0);
  return normalize(vec3(
    pillar2SDF(pos+e.xyy) - pillar2SDF(pos-e.xyy),
    pillar2SDF(pos+e.yxy) - pillar2SDF(pos-e.yxy),
    pillar2SDF(pos+e.yyx) - pillar2SDF(pos-e.yyx)
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

    if(pos.y < -5.0 || pos.y > 33.0 || abs(pos.x) > 16.0 || abs(pos.z) > 12.0) {
      t += 2.0; continue;
    }

    float sdfVal  = pillar2SDF(pos);
    float density = pillar2Density(pos);

    if(density > 0.01) {
      float h        = clamp(pos.y / 26.0, 0.0, 1.0);
      float coreness = clamp(-sdfVal / 3.0, 0.0, 1.0);
      float tip      = pow(clamp((pos.y - 16.0) / 9.0, 0.0, 1.0), 1.3);

      vec3 sampleCol;
      if(uMode < 0.5) {
        // HUBBLE — burnt umber core, hot white tip
        vec3 shadow = vec3(0.05, 0.015, 0.003);
        vec3 sienna = vec3(0.30, 0.10, 0.03);
        vec3 cream  = vec3(0.98, 0.95, 0.80);
        sampleCol = mix(shadow, sienna, coreness * 0.88);
        sampleCol = mix(sampleCol, cream, tip * 0.92);
        sampleCol += cream * pow(tip, 4.0) * 3.5;
        // Internal star-forming knots — reddish-orange upper third
        float knotGlow = smoothstep(12.0, 18.0, pos.y)
                       * fbm(pos * 1.8 + 3.3) * coreness * 0.6;
        sampleCol += vec3(0.8, 0.25, 0.05) * knotGlow;
        // Protostar at sharp apex
        float star = exp(-length(pos - vec3(-1.5, 26.5, 0.0)) * 2.2);
        sampleCol += vec3(1.0, 0.97, 0.85) * star * 7.0;
      } else {
        // WEBB INFRARED
        vec3 shadow = vec3(0.28, 0.06, 0.01);
        vec3 orange = vec3(0.75, 0.28, 0.05);
        vec3 hotTip = vec3(0.97, 0.82, 0.55);
        sampleCol = mix(shadow, orange, coreness * 0.95);
        sampleCol = mix(sampleCol, hotTip, tip * 0.90);
        sampleCol += hotTip * pow(tip, 3.0) * 3.8;
        // Webb reveals internal knot structure
        float knotGlow = smoothstep(10.0, 18.0, pos.y)
                       * fbm(pos * 2.0 + 4.1) * coreness * 0.9;
        sampleCol += vec3(0.9, 0.35, 0.08) * knotGlow;
        // Stellar jet
        float jetAngle = (pos.x - 1.5) * 0.65 - (pos.y - 18.0) * 0.4;
        sampleCol += vec3(0.95, 0.55, 0.15)
          * exp(-jetAngle * jetAngle * 1.3)
          * smoothstep(16.0, 22.0, pos.y) * 0.85;
      }

      // Fresnel rim — tighter than Pillar 1 (power 6.0)
      vec3 norm = calcNormal(pos);
      float fresnel = pow(1.0 - abs(dot(normalize(rd), norm)), 6.0);
      sampleCol += (uMode < 0.5
        ? vec3(0.75, 0.95, 0.90)
        : vec3(1.0,  0.65, 0.30)) * fresnel * (uMode < 0.5 ? 1.2 : 1.0);

      // Top lighting
      sampleCol *= 0.3 + 0.9 * h;

      float alpha = density * (uMode < 0.5 ? 0.15 : 0.07);
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

export function createPillar2(scene) {
  const geo = new THREE.SphereGeometry(50, 24, 24)
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
  mesh.position.set(0, 8, 0)
  scene.add(mesh)
  return { mesh, mat }
}

export function tickPillar2(mat, mesh, camera) {
  mat.uniforms.uCamPos.value
    .copy(camera.position)
    .sub(mesh.position)
}
