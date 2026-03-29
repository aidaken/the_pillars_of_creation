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

  // Remap to center portion of image where pillars actually are
  u = 0.15 + u * 0.70;
  v = 0.05 + v * 0.88;

  // FBM warp — displaces UV organically, no linear z bands
  vec2 warp = vec2(
    fbm(vec3(pos.xz * 0.06, 0.0) + 0.5) - 0.5,
    fbm(vec3(pos.xz * 0.06, 1.7) + 0.5) - 0.5
  ) * 0.06;

  // Z-depth: use noise not linear shift
  float zNoise = fbm(vec3(pos.x * 0.05, pos.y * 0.04, pos.z * 0.08));
  float zFalloff = smoothstep(10.0, 0.0, abs(pos.z - zNoise * 4.0));

  vec2 warpedUV = clamp(vec2(u, v) + warp, 0.0, 1.0);
  float lum = dot(
    texture2D(uPillarMask, warpedUV).rgb,
    vec3(0.299, 0.587, 0.114)
  );

  // Kill background pixels — only keep pillar structure
  float threshold = smoothstep(0.06, 0.18, lum);

  return lum * zFalloff * threshold;
}

float hybridDensity(vec3 pos) {
  float maskVal = sampleMask(pos);

  vec3 np = pos * 0.10;
  float coarse = fbm(np);
  float fine   = fbm(np * 2.8 + 3.1) * 0.35;
  float fbmVal = coarse + fine;

  float yFade = smoothstep(-3.0, 1.0, pos.y)
              * smoothstep(30.0, 25.0, pos.y);

  // Soft spatial bounds — no hard edges
  float xFade = smoothstep(18.0, 10.0, abs(pos.x));
  float zFade = smoothstep(12.0, 4.0, abs(pos.z));

  float density = maskVal * fbmVal * yFade * xFade * zFade;
  density += maskVal * maskVal * 0.5 * yFade * zFade;

  return clamp(density * 3.0, 0.0, 1.0);
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
      float heightRatio = clamp(pos.y / 30.0, 0.0, 1.0);

      vec3 coreCol  = uPillarColor * (0.6 + density * 0.8);
      vec3 edgeCol  = uGlowColor  * (0.4 + heightRatio * 0.6);
      vec3 sampleCol = mix(coreCol, edgeCol, smoothstep(0.4, 0.8, density));

      sampleCol *= (0.5 + heightRatio * 0.8);

      float alpha = density * 0.16;
      col.rgb += sampleCol * alpha * (1.0 - col.a);
      col.a   += alpha * (1.0 - col.a);

      t += 0.35;
    } else {
      t += 0.9;
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
      uTime:        { value: 0 },
      uPillarColor: { value: new THREE.Color(0.80, 0.45, 0.10) },
      uGlowColor:   { value: new THREE.Color(1.00, 0.75, 0.25) },
      uPillarMask:  { value: pillarMask },
      uUseTexture:  { value: 1.0 },
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

export function tickVolumetricPillars(mat, mesh, camera, elapsed) {
  mat.uniforms.uCamPos.value.copy(camera.position).sub(mesh.position)
  mat.uniforms.uTime.value = elapsed
}
