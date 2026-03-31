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
uniform vec3 uPillarColor;
uniform vec3 uGlowColor;
uniform sampler2D uPillarMask;
uniform float uUseTexture;
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
    mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
        mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
        mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float val = 0.0;
  float amp = 0.5;
  for(int i = 0; i < 3; i++) {
    val += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return val;
}

float sampleMask(vec3 pos) {
  // World space ranges:
  // X: -14 to 14  (3 pillars side by side)
  // Y:  -2 to 30  (base to tips)
  // Z: -12 to 12  (depth)

  // U = horizontal = X axis
  float sampleX = pos.x;
  float sampleY = pos.y;

  // For pillar 3 (right) move the texturing lookup further right and higher
  // so it is visually separated from pillar 2 (center) and appears taller.
  if (pos.x > 5.0) {
    sampleX += 6.5;
    sampleY += 2.8;
  }

  float pillarStretch = 1.06;
  float xStretched = sampleX * pillarStretch;
  float u = clamp((xStretched + 14.0) / 28.0, 0.0, 1.0);

  // V = vertical = Y axis (V=0 is TOP of image, V=1 is BOTTOM)
  float v = clamp(1.0 - ((sampleY + 2.0) / 32.0), 0.0, 1.0);

  // Crop to pillar region in image
  u = 0.10 + u * 0.80;
  v = 0.02 + v * 0.96;

  // Tiny FBM warp — just enough to break hard edges
  float wx = (fbm(vec3(pos.x * 0.05, pos.y * 0.04, pos.z * 0.03)) - 0.5) * 0.025;
  float wy = (fbm(vec3(pos.y * 0.05, pos.z * 0.04, pos.x * 0.03) + 2.1) - 0.5) * 0.025;

  vec2 uv = clamp(vec2(u + wx, v + wy), 0.01, 0.99);
  float lum = dot(texture2D(uPillarMask, uv).rgb, vec3(0.299, 0.587, 0.114));

  // Z depth falloff — gaussian-style
  float zFalloff = exp(-pos.z * pos.z * 0.008);

  // Threshold — remove dark background
  float threshold = smoothstep(0.05, 0.18, lum);

  return lum * zFalloff * threshold;
}

float hybridDensity(vec3 pos) {
  float maskVal = sampleMask(pos);
  if (maskVal < 0.01) return 0.0;

  vec3 np = pos * 0.09;
  float coarse = fbm(np);
  float fine = fbm(np * 3.1 + 2.7) * 0.3;
  float fbmVal = clamp(coarse + fine, 0.0, 1.0);

  float yFade = smoothstep(-2.0, 1.5, pos.y)
              * smoothstep(32.0, 26.0, pos.y);
  float xFade = smoothstep(20.0, 10.0, abs(pos.x));
  float zFade = smoothstep(13.0, 5.0, abs(pos.z));

  float density = maskVal * fbmVal * yFade * xFade * zFade;
  density += maskVal * maskVal * 0.45 * yFade * zFade;

  return clamp(density * 3.2, 0.0, 1.0);
}

void main() {
  vec3 ro = uCamPos;
  vec3 rd = normalize(vWorldPos - uCamPos);

  vec4 col = vec4(0.0);
  float t = 0.0;
  float maxT = 120.0;

  for(int i = 0; i < 64; i++) {
    if(col.a > 0.95 || t > maxT) break;
    vec3 pos = ro + rd * t;

    // Skip samples outside pillar volume bounds
    if(pos.y < -4.0 || pos.y > 34.0 || abs(pos.x) > 18.0 || abs(pos.z) > 14.0) {
      t += 0.75;
      continue;
    }

    float density = hybridDensity(pos);

    if(density > 0.015) {

      vec3 sampleCol;

      if(uMode < 0.5) {
        // HUBBLE VISIBLE LIGHT
        vec3 denseCore = vec3(0.28, 0.08, 0.03);
        vec3 midTone   = vec3(0.52, 0.20, 0.07);
        vec3 tipGlow   = vec3(0.98, 0.92, 0.78);
        vec3 tealWisp  = vec3(0.25, 0.55, 0.55);

        float core = clamp(density * 2.0, 0.0, 1.0);
        float tip  = pow(clamp(pos.y / 26.0, 0.0, 1.0), 2.2);
        float edge = 1.0 - core;

        sampleCol  = mix(denseCore, midTone, core * 0.7);
        sampleCol  = mix(sampleCol, tipGlow, tip * 0.9);
        sampleCol += tealWisp * edge * 0.25;
        sampleCol += tipGlow  * pow(tip, 3.0) * 1.5;

      } else {
        // WEBB INFRARED
        float heightRatio = clamp(pos.y / 28.0, 0.0, 1.0);
        float coreness    = clamp(density * 1.8, 0.0, 1.0);

        vec3 denseCore = vec3(0.45, 0.10, 0.02);
        vec3 midTone   = vec3(0.75, 0.30, 0.08);
        vec3 tipGlow   = vec3(0.95, 0.75, 0.55);
        vec3 edgeWisp  = vec3(0.60, 0.35, 0.45);

        sampleCol = mix(denseCore, midTone, coreness * 1.2);
        sampleCol = mix(sampleCol, tipGlow, pow(heightRatio, 2.0) * 0.90);
        sampleCol = mix(sampleCol, edgeWisp, (1.0 - coreness) * 0.35);
        sampleCol += vec3(0.4, 0.15, 0.05) * fbm(pos * 0.25) * density * 0.6;
        sampleCol += tipGlow * pow(heightRatio, 4.0) * 1.4;
      }

      float topLight = 0.45 + 0.7 * heightRatio;
      sampleCol *= topLight;

      float alpha = density * 0.15;
      col.rgb += sampleCol * alpha * (1.0 - col.a);
      col.a   += alpha * (1.0 - col.a);

      t += 0.32;
    } else {
      t += 0.75;
    }
  }

  if(col.a < 0.005) discard;
  gl_FragColor = col;
}
`

export function createVolumetricPillars(scene) {
  const loader = new THREE.TextureLoader()
  const pillarMask = loader.load('/textures/pillars_mask.png')
  pillarMask.wrapS = THREE.ClampToEdgeWrapping
  pillarMask.wrapT = THREE.ClampToEdgeWrapping
  pillarMask.minFilter = THREE.LinearFilter
  pillarMask.magFilter = THREE.LinearFilter

  const geo = new THREE.SphereGeometry(90, 32, 32)

  const mat = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    uniforms: {
      uCamPos:      { value: new THREE.Vector3() },
      uTime:        { value: 1.0 },
      uPillarColor: { value: new THREE.Color(0.80, 0.45, 0.10) },
      uGlowColor:   { value: new THREE.Color(1.00, 0.75, 0.25) },
      uPillarMask:  { value: pillarMask },
      uUseTexture:  { value: 1.0 },
      uMode:        { value: 0.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(0, 12, 0)
  scene.add(mesh)

  return { mesh, mat }
}

export function updateSpectralMode(mat, mode) {
  mat.uniforms.uMode.value = mode === 'webb' ? 1.0 : 0.0
}
