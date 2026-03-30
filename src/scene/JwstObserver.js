import * as THREE from 'three'

/** World +Z is “behind” default spawn view (camera at z≈52 faces −Z toward pillars). */
export const JWST_SPAWN_BEHIND_DIR = new THREE.Vector3(0, 0, 1)

/** Mini-Webb anchor: ~13 units behind default camera (0, 10, 52). */
export const JWST_ANCHOR = new THREE.Vector3(0, 10.5, 65)

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
uniform vec3 uCamWorld;
uniform vec3 uJwstPos;
uniform vec3 uBehindDir;

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Hex prism, hex in XZ, extruded along Y (six vertical faces).
float sdHexPrismY(vec3 p, float hexR, float halfY) {
  vec3 q = abs(p);
  float hex2d = max((q.z * 0.86602540378 + q.x * 0.5), q.x) - hexR;
  return max(hex2d, q.y - halfY);
}

float jwstMirrorSDF(vec3 w) {
  vec3 p = w - uJwstPos;
  p -= vec3(0.0, 1.35, 0.0);
  return sdHexPrismY(p, 3.15, 0.11);
}

float jwstShieldSDF(vec3 w) {
  vec3 p = w - uJwstPos;
  p -= vec3(0.0, -2.65, 0.0);
  float c = 0.70710678118;
  mat2 R = mat2(c, -c, c, c);
  p.xz = R * p.xz;
  return sdBox(p, vec3(23.5, 0.11, 8.2));
}

vec3 jwstNormal(vec3 w) {
  vec2 e = vec2(0.0025, 0.0);
  float m = jwstMirrorSDF(w);
  float s = jwstShieldSDF(w);
  float d = min(m, s);
  return normalize(vec3(
    (min(jwstMirrorSDF(w + e.xyy), jwstShieldSDF(w + e.xyy))
      - min(jwstMirrorSDF(w - e.xyy), jwstShieldSDF(w - e.xyy))),
    (min(jwstMirrorSDF(w + e.yxy), jwstShieldSDF(w + e.yxy))
      - min(jwstMirrorSDF(w - e.yxy), jwstShieldSDF(w - e.yxy))),
    (min(jwstMirrorSDF(w + e.yyx), jwstShieldSDF(w + e.yyx))
      - min(jwstMirrorSDF(w - e.yyx), jwstShieldSDF(w - e.yyx)))
  ));
}

void main() {
  vec3 ro = uCamWorld;
  vec3 rd = normalize(vWorldPos - uCamWorld);

  if (dot(rd, uBehindDir) < 0.18) {
    discard;
  }

  float tNear = 2.0;
  vec3 j = uJwstPos - ro;
  float b = dot(j, rd);
  float c = dot(j, j) - 900.0;
  float disc = b * b - c;
  if (disc < 0.0) {
    discard;
  }
  float t0 = -b - sqrt(disc);
  if (t0 > 1.0) {
    tNear = t0;
  }

  float t = tNear;
  vec3 hitRgb = vec3(0.0);
  bool gotHit = false;
  const int MAX_STEPS = 40;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 pos = ro + rd * t;
    float dm = jwstMirrorSDF(pos);
    float ds = jwstShieldSDF(pos);
    float d = min(dm, ds);

    if (d < 0.006) {
      vec3 n = jwstNormal(pos);
      vec3 L = normalize(vec3(0.35, 0.85, 0.25));
      float diff = max(dot(n, L), 0.0);
      vec3 V = normalize(ro - pos);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(n, H), 0.0), 64.0);

      bool isMirror = dm < ds;
      vec3 baseCol = isMirror
        ? vec3(1.0, 0.8, 0.2)
        : vec3(0.7, 0.7, 0.8);
      float amb = isMirror ? 0.22 : 0.18;
      vec3 col = baseCol * (amb + diff * 0.95) + baseCol * spec * (isMirror ? 1.35 : 0.55);
      float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.2);
      col += (isMirror ? vec3(1.0, 0.92, 0.45) : vec3(0.9, 0.92, 1.0)) * rim * 0.35;

      hitRgb = col;
      gotHit = true;
      break;
    }

    t += clamp(d, 0.04, 1.8);
    if (t > 220.0) {
      break;
    }
  }

  if (!gotHit) {
    discard;
  }
  gl_FragColor = vec4(hitRgb, 1.0);
}
`

export function createJwstObserver(scene) {
  const geo = new THREE.SphereGeometry(200, 20, 20)
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    uniforms: {
      uCamWorld: { value: new THREE.Vector3() },
      uJwstPos: { value: JWST_ANCHOR.clone() },
      uBehindDir: { value: JWST_SPAWN_BEHIND_DIR.clone() },
    },
    transparent: false,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = 100
  mesh.name = 'JwstObserver'
  scene.add(mesh)
  return { mesh, mat }
}

export function tickJwstObserver(mat, camera) {
  mat.uniforms.uCamWorld.value.copy(camera.position)
}
