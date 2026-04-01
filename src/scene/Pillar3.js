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

// Raw SDF before waist erosion (used for normals / stepping).
float pillar3SDF(vec3 pos) {
  vec3 lp = pos;
  lp.x -= lp.y * 0.04;
  vec3 wp = domainWarp(lp);

  float base = sdSphere(wp, vec3(0.2, -2.1, 0.4), 5.5);

  float neck = sdCapsule(wp,
    vec3(0.1, 1.6, 0.0),
    vec3(0.05, 6.9, 0.0),
    1.0
  );

  float shoulder = sdCapsule(wp,
    vec3(0.0, 5.2, 0.0),
    vec3(0.0, 7.6, 0.0),
    1.25
  );

  float peakL = sdCapsule(wp,
    vec3(-0.95, 6.5, 0.06),
    vec3(-2.0, 12.6, 0.16),
    0.9
  );
  float peakR = sdCapsule(wp,
    vec3(1.05, 6.4, -0.04),
    vec3(2.05, 12.0, -0.14),
    0.84
  );
  float peaks = smin(peakL, peakR, 0.2);

  float d = base;
  d = smin(d, neck, 1.7);
  d = smin(d, shoulder, 1.05);
  d = smin(d, peaks, 0.92);
  return d;
}

float waistErode(vec3 pos) {
  float waist = smoothstep(1.4, 3.6, pos.y) * smoothstep(8.0, 4.6, pos.y);
  return 0.5 * fbm(pos * 3.4 + vec3(2.1, 0.7, 1.9)) * waist;
}

float pillar3SDFEffective(vec3 pos) {
  return pillar3SDF(pos) + waistErode(pos);
}

float pillar3Density(vec3 pos) {
  float sdf0 = pillar3SDF(pos);
  float sdf = sdf0 + waistErode(pos);
  float yFade = smoothstep(-5.0, 2.0, pos.y)
              * smoothstep(20.0, 11.5, pos.y);
  float zFade = 0.88 + 0.12 * exp(-pos.z * pos.z * 0.008);
  if(sdf > 5.2) return 0.0;

  float topSolid = smoothstep(8.5, 11.2, pos.y);
  float core = exp(-max(sdf, 0.0) * (0.15 + 0.11 * topSolid))
             * clamp(-sdf * 0.34 + 0.95, 0.0, 1.0);

  float outerGas = exp(-max(sdf, 0.0) * 0.28)
                 * fbm(pos * 0.11 + 2.3) * 0.56;

  float island = mix(0.52, 1.0, smoothstep(-5.0, 1.5, pos.y))
               * mix(0.62, 1.0, smoothstep(4.5, 9.0, pos.y));
  float frayNoise = fbm(pos * 3.8 + 5.1);
  float frayMask  = smoothstep(10.0, 15.5, pos.y);
  float fray      = frayNoise * frayMask * 0.4;

  float density = max(core, outerGas) - fray;
  density *= island;
  return clamp(density * zFade * yFade, 0.0, 1.0);
}

vec3 calcNormal(vec3 pos) {
  vec2 e = vec2(0.28, 0.0);
  return normalize(vec3(
    pillar3SDFEffective(pos+e.xyy) - pillar3SDFEffective(pos-e.xyy),
    pillar3SDFEffective(pos+e.yxy) - pillar3SDFEffective(pos-e.yxy),
    pillar3SDFEffective(pos+e.yyx) - pillar3SDFEffective(pos-e.yyx)
  ));
}

void main() {
  vec3 ro = uCamPos;
  vec3 rd = normalize(vWorldPos - uCamPos);

  vec4 col = vec4(0.0);
  float t = 0.1;

  for(int i=0; i<80; i++) {
    if(col.a > 0.95 || t > 120.0) break;
    vec3 pos = ro + rd * t;

    if(length(pos) > 28.0) { t += 3.0; continue; }

    float sdfVal  = pillar3SDFEffective(pos);
    float density = pillar3Density(pos);

    if(density > 0.006) {
      float sdfForCore = pillar3SDFEffective(pos);
      float coreness = clamp(-sdfForCore / 3.0, 0.0, 1.0);
      float tip = pow(clamp((pos.y - 7.5) / 5.5, 0.0, 1.0), 1.35);

      vec3 sampleCol;
      vec3 norm = calcNormal(pos);

      if(uMode < 0.5) {
        vec3 coreBlack  = vec3(0.028, 0.009, 0.002);
        vec3 darkBrown  = vec3(0.18, 0.065, 0.016);
        vec3 warmSienna = vec3(0.46, 0.19, 0.052);
        vec3 creamWarm  = vec3(0.96, 0.93, 0.82);
        vec3 coolHi     = vec3(0.90, 0.93, 1.0);
        vec3 iceTip     = vec3(0.82, 0.90, 1.0);

        sampleCol = mix(coreBlack, darkBrown, coreness * 0.5);
        sampleCol = mix(sampleCol, warmSienna, coreness * 0.85);

        float litFace = clamp(0.5 - pos.x * 0.06, 0.0, 1.0);
        sampleCol = mix(sampleCol, mix(creamWarm, coolHi, 0.55),
          litFace * coreness * 0.45);

        sampleCol = mix(sampleCol, coolHi, tip * 0.88);
        sampleCol += mix(creamWarm, iceTip, tip) * pow(tip, 3.2) * 4.5;
        sampleCol += iceTip * pow(tip, 5.5) * 2.8;

        float baseWarm = smoothstep(10.0, -2.0, pos.y) * coreness;
        sampleCol += vec3(0.42, 0.17, 0.05) * baseWarm * 0.55;

        float star = exp(-length(pos - vec3(-3.0, 14.5, 0.0)) * 1.4);
        sampleCol += vec3(1.0, 0.97, 0.85) * star * 7.0;
        float halo = exp(-length(pos - vec3(-3.0, 14.5, 0.0)) * 0.4);
        sampleCol += vec3(0.8, 0.7, 0.4) * halo * 2.5;

        sampleCol *= 0.15 + 1.05 * clamp(pos.y / 28.0, 0.0, 1.0);
      } else {
        vec3 coreBlackW = vec3(0.22, 0.05, 0.01);
        vec3 orange     = vec3(0.70, 0.26, 0.06);
        vec3 hotTipW    = vec3(0.95, 0.78, 0.48);

        sampleCol = mix(coreBlackW, orange, coreness * 0.92);
        sampleCol = mix(sampleCol, hotTipW, tip * 0.88);
        sampleCol += hotTipW * pow(tip, 2.8) * 4.0;
        float baseWarmW = smoothstep(10.0, -2.0, pos.y) * coreness;
        sampleCol += vec3(0.60, 0.22, 0.05) * baseWarmW * 0.6;
        sampleCol *= 0.18 + 1.0 * clamp(pos.y / 28.0, 0.0, 1.0);
      }

      float NdotV = abs(dot(normalize(rd), norm));
      float fresPow = uMode < 0.5 ? 4.2 : 5.5;
      float fresnel = pow(1.0 - NdotV, fresPow);
      if(uMode < 0.5) {
        float rimBreak = 0.38 + 0.62 * smoothstep(0.25, 0.85, fbm(pos * 6.8 + norm * 1.5));
        rimBreak *= 0.55 + 0.45 * step(0.4, fbm(pos * 12.3 + 4.1));
        sampleCol += vec3(0.52, 0.86, 0.92) * fresnel * 1.35 * rimBreak;
      } else {
        sampleCol += vec3(0.95, 0.60, 0.25) * fresnel * 0.9;
      }

      float tipOpaque = smoothstep(7.0, 11.5, pos.y);
      float bodyGhost = mix(0.32, 1.0, tipOpaque)
                      * mix(0.4, 1.0, 0.65 + 0.35 * coreness);
      float alphaH = density * 0.26 * bodyGhost
        * mix(0.4, 1.0, smoothstep(-3.0, 11.0, pos.y))
        * (0.55 + 0.45 * coreness);
      float alpha = uMode < 0.5 ? alphaH : density * 0.07;
      col.rgb += sampleCol * alpha * (1.0 - col.a);
      col.a   += alpha * (1.0 - col.a);

      t += max(abs(sdfVal) * 0.32, 0.22);
    } else {
      t += max(abs(sdfVal) * 0.52, 0.58);
    }
  }

  if(col.a < 0.005) discard;
  gl_FragColor = col;
}
`

export function createPillar3(scene) {
  const geo = new THREE.SphereGeometry(62, 24, 24)
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
    depthTest: false,
    side: THREE.BackSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.set(0.62, 0.62, 0.62)
  mesh.position.set(26, 6, 22)
  scene.add(mesh)
  return { mesh, mat }
}

export function tickPillar3(mat, mesh, camera) {
  mat.uniforms.uCamPos.value
    .copy(camera.position)
    .sub(mesh.position)
}
