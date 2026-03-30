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
  ) * 3.5;
  float s2 = 0.60;
  vec3 r = vec3(
    fbm(p * s2 + q),
    fbm(p * s2 + q + vec3(8.3, 2.8, 5.1)),
    fbm(p * s2 + q + vec3(4.1, 7.6, 1.9))
  ) * 1.2;
  return p + q + r;
}

float pillar1SDF(vec3 pos) {
  vec3 lp = pos - vec3(0.0, 0.0, 0.0);
  lp.x -= lp.y * 0.03;
  lp.x += sin(lp.y * 0.18) * 1.2;
  lp.z += cos(lp.y * 0.14) * 0.6;
  vec3 wp = domainWarp(lp);

  // Main trunk — wide base tapering upward
  float trunk = sdCapsule(wp,
    vec3(0.0, -1.0, 0.0),
    vec3(-0.5, 21.0, 0.0),
    7.0 - lp.y * 0.12
  );

  // Mushroom cap — overhangs LEFT
  float cap = sdSphere(wp, vec3(-1.5, 21.0, 0.0), 6.5);

  // Left side secondary bulge
  float bulge = sdSphere(wp, vec3(-5.0, 10.5, 0.3), 3.2);

  float leftFinger = sdCapsule(wp,
    vec3(-2.0, 17.0, 0.3),
    vec3(-4.0, 32.0, 0.2),
    2.2
  );

  float centerFinger = sdCapsule(wp,
    vec3(0.5, 18.0, 0.0),
    vec3(0.0, 28.0, 0.0),
    2.0
  );

  float rightFinger = sdCapsule(wp,
    vec3(2.5, 16.5, -0.3),
    vec3(3.5, 24.0, -0.2),
    1.6
  );

  // EGG nodules at fingertips
  float eggMask = smoothstep(22.0, 27.0, lp.y);
  vec3 eggP = wp + fbm(wp * 4.2 + 8.1) * 0.6 * eggMask;
  float egg1 = sdSphere(eggP, vec3(-4.0, 32.5, 0.2), 0.9);
  float egg2 = sdSphere(eggP, vec3(0.0, 28.5, 0.0), 0.75);
  float egg3 = sdSphere(eggP, vec3(3.5, 24.5, -0.2), 0.65);

  float d = trunk;
  d = smin(d, cap, 4.0);
  d = smin(d, bulge, 3.5);
  d = smin(d, leftFinger, 1.8);
  d = smin(d, centerFinger, 1.8);
  d = smin(d, rightFinger, 1.8);
  d = smin(d, egg1, 0.4);
  d = smin(d, egg2, 0.4);
  d = smin(d, egg3, 0.4);
  return d;
}

float pillar1Density(vec3 pos) {
  float sdf = pillar1SDF(pos);
  float yFade = smoothstep(-4.0, 2.0, pos.y)
              * smoothstep(38.0, 28.0, pos.y);
  float zFade = exp(-pos.z * pos.z * 0.016);
  if(sdf > 4.5) return 0.0;
  float innerDensity = exp(-max(sdf, 0.0) * 0.5)
                     * clamp(-sdf * 0.3 + 0.8, 0.0, 1.0);
  float outerWisp = exp(-max(sdf, 0.0) * 0.35)
                  * fbm(pos * 0.13 + 1.8) * 0.5;
  return clamp(max(innerDensity, outerWisp) * zFade * yFade, 0.0, 1.0);
}

vec3 calcNormal(vec3 pos) {
  vec2 e = vec2(0.3, 0.0);
  return normalize(vec3(
    pillar1SDF(pos+e.xyy) - pillar1SDF(pos-e.xyy),
    pillar1SDF(pos+e.yxy) - pillar1SDF(pos-e.yxy),
    pillar1SDF(pos+e.yyx) - pillar1SDF(pos-e.yyx)
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

    float dx = abs(pos.x + 6.0);
    if(dx > 18.0 || pos.y < -5.0 || pos.y > 38.0 || abs(pos.z) > 14.0) {
      t += 2.0; continue;
    }

    float sdfVal  = pillar1SDF(pos);
    float density = pillar1Density(pos);

    if(density > 0.01) {
      float h        = clamp(pos.y / 30.0, 0.0, 1.0);
      float coreness = clamp(-sdfVal / 3.0, 0.0, 1.0);
      float tip      = pow(clamp((pos.y - 22.0) / 10.0, 0.0, 1.0), 1.5);

      vec3 sampleCol;
      if(uMode < 0.5) {
        vec3 darkCore  = vec3(0.18, 0.05, 0.02);
        vec3 warmBrown = vec3(0.50, 0.18, 0.06);
        vec3 creamTip  = vec3(0.97, 0.93, 0.76);
        sampleCol = mix(darkCore, warmBrown, coreness * 0.85);
        sampleCol = mix(sampleCol, creamTip, tip * 0.92);
        sampleCol += creamTip * pow(tip, 3.0) * 2.5;
        float star = exp(-length(pos - vec3(-7.8, 33.5, 0.2)) * 1.4);
        sampleCol += vec3(1.0, 0.95, 0.8) * star * 5.0;
      } else {
        vec3 darkCore   = vec3(0.35, 0.07, 0.02);
        vec3 warmOrange = vec3(0.76, 0.28, 0.06);
        vec3 hotTip     = vec3(0.95, 0.76, 0.50);
        sampleCol = mix(darkCore, warmOrange, coreness * 0.92);
        sampleCol = mix(sampleCol, hotTip, tip * 0.88);
        sampleCol += hotTip * pow(tip, 2.5) * 2.8;
        float jetDist = abs((pos.x + 6.5) * 0.7 - (pos.y - 25.0) * 0.35);
        sampleCol += vec3(0.9, 0.5, 0.2)
                   * exp(-jetDist * jetDist * 0.9)
                   * smoothstep(22.0, 28.0, pos.y) * 0.8;
      }

      // Fresnel rim
      vec3 norm = calcNormal(pos);
      float fresnel = pow(1.0 - abs(dot(normalize(rd), norm)), 2.0);
      sampleCol += (uMode < 0.5
        ? vec3(0.25, 0.65, 0.65)
        : vec3(0.85, 0.45, 0.18)) * fresnel * (uMode < 0.5 ? 1.2 : 1.1);

      // EGG high-freq detail at tips
      sampleCol *= 1.0 + fbm(pos * 4.5 + 7.2) * 0.4
                       * smoothstep(24.0, 29.0, pos.y);

      // Top lighting
      sampleCol *= 0.3 + 0.9 * h;

      float alpha = density * 0.11;
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
