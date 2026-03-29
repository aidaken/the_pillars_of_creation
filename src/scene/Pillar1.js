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

// Smooth minimum — melts shapes together
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}

// Capsule SDF
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p-a, ba = b-a;
  float t = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa - ba*t) - r;
}

// Vertical cone SDF (Inigo Quilez)
float sdCone(vec3 p, float r1, float r2, float h) {
  vec2 q = vec2(length(p.xz), p.y);
  vec2 k1 = vec2(r2,h);
  vec2 k2 = vec2(r2-r1,2.0*h);
  vec2 ca = vec2(q.x-min(q.x,(q.y<0.0)?r1:r2), abs(q.y)-h);
  vec2 cb = q - k1 + k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.0,1.0);
  float s = (cb.x<0.0 && ca.y<0.0) ? -1.0 : 1.0;
  return s*sqrt(min(dot(ca,ca),dot(cb,cb)));
}

// Sphere SDF
float sdSphere(vec3 p, vec3 c, float r) {
  return length(p-c) - r;
}

float pillar1SDF(vec3 pos) {
  vec3 lp = pos - vec3(-6.0, 0.0, 0.0);

  // === DOMAIN DISTORTION ===
  vec3 warpPos = lp * 0.18;
  float wx = fbm(warpPos);
  float wy = fbm(warpPos + vec3(1.7, 9.2, 3.4));
  float wz = fbm(warpPos + vec3(8.3, 2.8, 5.1));
  vec3 warp = vec3(wx, wy, wz) * 1.4;

  vec3 fineWarp = vec3(
    fbm(lp * 0.55 + 2.3),
    fbm(lp * 0.55 + 4.7),
    fbm(lp * 0.55 + 6.1)
  ) * 0.4;

  vec3 wp = lp + warp + fineWarp;

  // Slight rightward lean
  wp.x -= wp.y * 0.035;

  // === SHAPE PRIMITIVES ===

  // Main trunk — wide base tapering upward
  float trunk = sdCone(
    vec3(wp.x, wp.y - 14.0, wp.z),
    3.8,
    2.0,
    14.0
  );

  // Upper body
  float upper = sdCapsule(
    wp,
    vec3(0.0, 14.0, 0.0),
    vec3(-0.5, 22.0, 0.0),
    2.4
  );

  // Overhanging cap — shifted LEFT, wider
  float cap = sdSphere(wp, vec3(-1.8, 24.5, 0.0), 3.2);

  // Secondary left bulge
  float bulge = sdSphere(wp, vec3(-3.5, 11.0, 0.3), 2.0);

  // Finger 1 — main peak
  float f1 = sdCapsule(wp,
    vec3(-1.2, 24.0, 0.3),
    vec3(-1.5, 29.5, 0.2),
    1.0
  );

  // Finger 2
  float f2 = sdCapsule(wp,
    vec3(0.8, 23.5, -0.2),
    vec3(0.5, 27.5, -0.3),
    0.85
  );

  // Finger 3 — smaller left peak
  float f3 = sdCapsule(wp,
    vec3(-3.2, 22.5, 0.1),
    vec3(-3.8, 26.0, 0.2),
    0.75
  );

  // EGG nodules on fingertips
  float egg1 = sdSphere(wp, vec3(-1.5, 30.2, 0.2), 0.7);
  float egg2 = sdSphere(wp, vec3(0.4, 28.2, -0.3), 0.6);
  float egg3 = sdSphere(wp, vec3(-3.9, 26.8, 0.2), 0.5);

  // === SMOOTH UNION ===
  float k = 2.2;

  float d = trunk;
  d = smin(d, upper, k);
  d = smin(d, cap,   k * 1.4);
  d = smin(d, bulge, k);
  d = smin(d, f1,    k * 0.8);
  d = smin(d, f2,    k * 0.8);
  d = smin(d, f3,    k * 0.8);
  d = smin(d, egg1,  k * 0.4);
  d = smin(d, egg2,  k * 0.4);
  d = smin(d, egg3,  k * 0.4);

  return d;
}

float pillar1Density(vec3 pos) {
  float sdf = pillar1SDF(pos);

  float yFade = smoothstep(-3.0, 1.0, pos.y)
              * smoothstep(34.0, 28.0, pos.y);
  float zFade = exp(-pos.z * pos.z * 0.014);

  if(sdf > 3.0) return 0.0;

  float innerDensity = clamp(-sdf / 3.0, 0.0, 1.0);

  float outerWisp = exp(-sdf * 0.6) * 0.4
    * fbm(pos * 0.14 + 2.1);

  float density = max(innerDensity, outerWisp);

  return clamp(density * zFade * yFade, 0.0, 1.0);
}

void main() {
  vec3 ro = uCamPos;
  vec3 rd = normalize(vWorldPos - uCamPos);

  vec4 col = vec4(0.0);
  float t = 0.2;

  for(int i=0;i<96;i++){
    if(col.a > 0.95 || t > 100.0) break;
    vec3 pos = ro + rd * t;

    float dx = abs(pos.x + 6.0);
    if(dx > 14.0 || pos.y < -4.0 || pos.y > 34.0 || abs(pos.z) > 12.0){
      t += 1.5; continue;
    }

    float sdfVal  = pillar1SDF(pos);
    float density = pillar1Density(pos);

    if(density > 0.015){
      float h        = clamp(pos.y / 28.0, 0.0, 1.0);
      float coreness = clamp(-sdfVal / 2.0, 0.0, 1.0);
      float tip      = pow(clamp((pos.y - 22.0) / 7.0, 0.0, 1.0), 1.5);

      vec3 sampleCol;
      if(uMode < 0.5){
        vec3 darkCore  = vec3(0.20, 0.06, 0.02);
        vec3 warmBrown = vec3(0.52, 0.20, 0.06);
        vec3 creamTip  = vec3(0.97, 0.92, 0.76);
        vec3 tealEdge  = vec3(0.18, 0.50, 0.50);
        sampleCol = mix(darkCore, warmBrown, coreness * 0.85);
        sampleCol = mix(sampleCol, creamTip, tip * 0.92);
        sampleCol += tealEdge * (1.0 - coreness) * 0.28;
        sampleCol += creamTip * pow(tip, 3.0) * 2.2;
        float starGlow = exp(-length(pos - vec3(-7.5, 30.0, 0.2)) * 1.2);
        sampleCol += vec3(1.0, 0.95, 0.8) * starGlow * 4.0;
      } else {
        vec3 darkCore   = vec3(0.38, 0.08, 0.02);
        vec3 warmOrange = vec3(0.78, 0.30, 0.06);
        vec3 hotTip     = vec3(0.96, 0.78, 0.52);
        vec3 pinkEdge   = vec3(0.62, 0.28, 0.42);
        sampleCol = mix(darkCore, warmOrange, coreness * 0.92);
        sampleCol = mix(sampleCol, hotTip, tip * 0.88);
        sampleCol += pinkEdge * (1.0 - coreness) * 0.28;
        float jetDist = abs((pos.x + 6.5) * 0.7 - (pos.y - 24.0) * 0.3);
        float jet = exp(-jetDist * jetDist * 0.8)
                  * smoothstep(22.0, 27.0, pos.y) * 0.7;
        sampleCol += vec3(0.9, 0.5, 0.2) * jet;
        sampleCol += hotTip * pow(tip, 2.5) * 2.5;
      }

      float topLight = 0.3 + 0.85 * clamp(pos.y / 28.0, 0.0, 1.0);
      sampleCol *= topLight;

      float alpha = density * 0.10;
      col.rgb += sampleCol * alpha * (1.0 - col.a);
      col.a   += alpha * (1.0 - col.a);

      t += max(abs(sdfVal) * 0.35, 0.25);
    } else {
      t += max(abs(sdfVal) * 0.5, 0.6);
    }
  }

  if(col.a < 0.005) discard;
  gl_FragColor = col;
}
`

export function createPillar1(scene) {
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
  mesh.position.set(-6, 12, 0)
  scene.add(mesh)
  return { mesh, mat }
}

export function tickPillar1(mat, mesh, camera) {
  mat.uniforms.uCamPos.value
    .copy(camera.position)
    .sub(mesh.position)
}
