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
  for(int i = 0; i < 5; i++) {
    val += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return val;
}

float pillarSDF(vec3 p) {
  float d = 1e9;

  // Pillar 1 — tallest left
  float y1 = clamp(p.y, 0.0, 26.0);
  float r1 = mix(3.5, 1.0, y1 / 26.0);
  d = min(d, length(p.xz - vec2(-5.0, 0.5)) - r1
        - fbm(p * 0.15 + uTime * 0.02) * 2.5
        + smoothstep(26.0, 22.0, p.y) * 1.5);

  // Pillar 2 — medium center
  float y2 = clamp(p.y, 0.0, 18.0);
  float r2 = mix(2.8, 0.8, y2 / 18.0);
  d = min(d, length(p.xz - vec2(1.5, 1.0)) - r2
        - fbm(p * 0.18 + 1.7 + uTime * 0.02) * 2.2
        + smoothstep(18.0, 14.0, p.y) * 1.2);

  // Pillar 3 — short right
  float y3 = clamp(p.y, 0.0, 12.0);
  float r3 = mix(2.2, 0.6, y3 / 12.0);
  d = min(d, length(p.xz - vec2(8.0, -0.5)) - r3
        - fbm(p * 0.22 + 3.4 + uTime * 0.02) * 1.8
        + smoothstep(12.0, 9.0, p.y) * 1.0);

  // Base connecting cloud
  float baseR = length(p.xz - vec2(1.5, 0.3)) / 12.0;
  float base = baseR - 1.0 + p.y * 0.15
             - fbm(p * 0.12) * 1.8;
  d = min(d, mix(base, d, smoothstep(0.0, 8.0, p.y)));

  return d;
}

void main() {
  vec3 ro = uCamPos;
  vec3 rd = normalize(vWorldPos - uCamPos);

  vec4 col = vec4(0.0);
  float t = 0.0;
  float maxT = 120.0;

  for(int i = 0; i < 128; i++) {
    if(col.a > 0.95 || t > maxT) break;
    vec3 pos = ro + rd * t;

    if(abs(pos.x) > 20.0 || pos.y < -5.0 || pos.y > 35.0 || abs(pos.z) > 16.0) {
      t += 1.5;
      continue;
    }

    float sdf = pillarSDF(pos);

    if(sdf < 0.0) {
      float density = clamp(-sdf * 0.35, 0.0, 1.0);
      float heightFade = smoothstep(-2.0, 2.0, pos.y);
      density *= heightFade;

      float heightRatio = clamp(pos.y / 28.0, 0.0, 1.0);
      vec3 sampleCol = mix(uPillarColor * 0.7, uGlowColor, heightRatio * 0.4);

      float rim = clamp(sdf / -3.0, 0.0, 1.0);
      sampleCol = mix(sampleCol * 1.8, sampleCol, rim);

      float alpha = density * 0.06;
      col.rgb += sampleCol * alpha * (1.0 - col.a);
      col.a   += alpha * (1.0 - col.a);

      t += 0.4;
    } else {
      t += max(sdf * 0.6, 0.3);
    }
  }

  if(col.a < 0.005) discard;
  gl_FragColor = col;
}
`

export function createVolumetricPillars(scene) {
  const geo = new THREE.SphereGeometry(80, 32, 32)

  const mat = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    uniforms: {
      uCamPos:      { value: new THREE.Vector3() },
      uTime:        { value: 0 },
      uPillarColor: { value: new THREE.Color(0.55, 0.30, 0.08) },
      uGlowColor:   { value: new THREE.Color(0.80, 0.50, 0.15) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(1, 10, 0)
  scene.add(mesh)

  return { mesh, mat }
}

export function tickVolumetricPillars(mat, mesh, camera, elapsed) {
  mat.uniforms.uCamPos.value.copy(camera.position).sub(mesh.position)
  mat.uniforms.uTime.value = elapsed
}
