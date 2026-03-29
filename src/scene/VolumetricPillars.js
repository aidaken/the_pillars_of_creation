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
  float u = clamp((pos.x + 13.0) / 26.0, 0.0, 1.0);
  float v = clamp(1.0 - ((pos.y - 1.0) / 28.0), 0.02, 0.98);

  // Focus on center of image where pillars are
  u = 0.18 + u * 0.64;
  v = 0.04 + v * 0.90;

  // FBM warp — organic displacement, NO linear bands
  float wx = fbm(vec3(pos.x * 0.07, pos.y * 0.05, pos.z * 0.06));
  float wy = fbm(vec3(pos.x * 0.06, pos.y * 0.07, pos.z * 0.05) + 4.1);
  vec2 warp = (vec2(wx, wy) - 0.5) * 0.05;

  // Z falloff using noise — breaks flat plane completely
  float zNoise = fbm(vec3(pos.x * 0.04, pos.y * 0.03, pos.z * 0.09) + 2.3);
  float zFalloff = smoothstep(11.0, 0.0, abs(pos.z - (zNoise - 0.5) * 5.0));

  vec2 finalUV = clamp(vec2(u, v) + warp, 0.01, 0.99);
  float lum = dot(
    texture2D(uPillarMask, finalUV).rgb,
    vec3(0.299, 0.587, 0.114)
  );

  // Threshold — kill dark background pixels
  float threshold = smoothstep(0.05, 0.20, lum);

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
  float xFade = smoothstep(16.0, 9.0, abs(pos.x));
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

    float density = hybridDensity(pos);

    if(density > 0.015) {
      float heightRatio = clamp(pos.y / 28.0, 0.0, 1.0);
      float coreness = clamp(density * 1.8, 0.0, 1.0);

      vec3 sampleCol;

      if(uMode < 0.5) {
        // HUBBLE VISIBLE LIGHT
        vec3 denseCore = vec3(0.35, 0.12, 0.05);
        vec3 midTone   = vec3(0.55, 0.25, 0.10);
        vec3 tipGlow   = vec3(0.95, 0.88, 0.72);
        vec3 edgeWisp  = vec3(0.70, 0.55, 0.40);

        sampleCol = mix(denseCore, midTone, coreness);
        sampleCol = mix(sampleCol, tipGlow, pow(heightRatio, 2.5) * 0.85);
        sampleCol = mix(sampleCol, edgeWisp, (1.0 - coreness) * 0.4);
        sampleCol += tipGlow * pow(heightRatio, 5.0) * 1.2;

      } else {
        // WEBB INFRARED
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

  const geo = new THREE.SphereGeometry(80, 16, 16)

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
  mesh.position.set(0, 8, 0)
  scene.add(mesh)

  return { mesh, mat }
}

export function updateSpectralMode(mat, mode) {
  mat.uniforms.uMode.value = mode === 'webb' ? 1.0 : 0.0
}
