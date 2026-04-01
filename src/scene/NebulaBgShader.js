import * as THREE from 'three'

// ─── Vertex ───────────────────────────────────────────────────────────────────
const vertexShader = /* glsl */`
  varying vec3 vDir;
  void main() {
    // world-space direction for sphere surface point
    vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// ─── Fragment ─────────────────────────────────────────────────────────────────
const fragmentShader = /* glsl */`
  varying vec3 vDir;
  uniform float uTime;
  uniform float uMode; // 0 = Hubble, 1 = Webb

  // ── noise primitives ──────────────────────────────────────────────────────

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  // tri-linear value noise in 3-D
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n = dot(i, vec3(1.0, 57.0, 113.0));
    float a = hash(n      ); float b = hash(n + 1.0  );
    float c = hash(n + 57.0); float d = hash(n + 58.0);
    float e = hash(n +113.0); float ff= hash(n +114.0);
    float g = hash(n +170.0); float h = hash(n +171.0);

    return mix(
      mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
      mix(mix(e, ff,f.x), mix(g, h, f.x), f.y),
      f.z
    );
  }

  // 6-octave FBM
  float fbm(vec3 p) {
    float v = 0.0, a = 0.55;
    vec3 sh = vec3(100.0);
    for (int i = 0; i < 6; i++) {
      v += a * vnoise(p);
      p  = p * 2.05 + sh;
      a *= 0.50;
    }
    return v;
  }

  // ── main ──────────────────────────────────────────────────────────────────

  void main() {
    vec3 d = normalize(vDir);

    // slow drift over time
    float t = uTime * 0.00015;

    // base sampling coords – unit sphere → scale up for gentler noise
    vec3 p = d * 2.8 + vec3(t, 0.0, t * 0.4);

    // ── domain warp (gives the filamentary, swirling shape) ────────────────
    vec3 q = vec3(
      fbm(p + vec3(0.00, 0.00, 0.00)),
      fbm(p + vec3(5.20, 1.30, 2.60)),
      fbm(p + vec3(1.70, 9.20, 3.10))
    );
    vec3 r = vec3(
      fbm(p + 1.8 * q + vec3(1.70, 9.20, 0.00)),
      fbm(p + 1.8 * q + vec3(8.30, 2.80, 0.00)),
      fbm(p + 1.8 * q + vec3(4.10, 6.50, 1.10))
    );

    float nBase    = fbm(p + 1.5 * r);          // large swirling structures
    float nDetail  = fbm(p * 2.5 + r * 0.7);    // finer wisps
    float nHighlit = fbm(p * 4.0 + q * 0.4);    // bright knots

    // overall cloud density (0–1)
    float density  = nBase * 0.60 + nDetail * 0.30 + nHighlit * 0.10;
    density = clamp(density, 0.0, 1.0);

    // dust lanes (local minima kill the brightness)
    float dust = pow(clamp(1.0 - nBase, 0.0, 1.0), 5.0);

    // directional masks
    float lateralR  = d.x * 0.5 + 0.5;      // 0 left → 1 right
    float vertDown  = 1.0 - (d.y * 0.5 + 0.5); // 0 top → 1 bottom
    float centerBand = 1.0 - abs(d.x) * 0.8;  // bright near the pillars

    // highlight mask – bright knots in gas
    float hilite = pow(max(0.0, nHighlit - 0.38), 1.8);

    // ── Hubble palette (SII/Hα/OIII → gold / teal / cyan) ──────────────────
    vec3 hubbleDark  = vec3(0.006, 0.012, 0.028);
    vec3 hubbleTeal  = vec3(0.030, 0.200, 0.260);  // OIII teal
    vec3 hubbleCyan  = vec3(0.050, 0.380, 0.470);  // bright cyan ionised
    vec3 hubbleGold  = vec3(0.300, 0.170, 0.025);  // SII warm gold
    vec3 hubbleGreen = vec3(0.080, 0.190, 0.060);  // Hα green-gold

    // ── Webb palette (NIRCam → rust / amber / cream) ────────────────────────
    vec3 webbDark   = vec3(0.012, 0.008, 0.006);
    vec3 webbRust   = vec3(0.340, 0.090, 0.015);
    vec3 webbAmber  = vec3(0.560, 0.280, 0.040);
    vec3 webbCream  = vec3(0.720, 0.480, 0.180);
    vec3 webbDeep   = vec3(0.160, 0.040, 0.005);

    vec3 col;

    if (uMode < 0.5) {
      // ── Hubble ─────────────────────────────────────────────────────────────
      // Start with deep dark
      col = hubbleDark;

      // Large teal sweep – stronger on the right and upper hemisphere
      float tealMask = density * mix(0.4, 1.0, lateralR);
      col = mix(col, hubbleTeal, tealMask * 0.90);

      // Bright cyan knots in ionised caps
      col = mix(col, hubbleCyan, hilite * mix(0.3, 0.9, lateralR));

      // Warm SII gold along the lower/center band (where pillars live)
      float goldMask = density * vertDown * centerBand;
      col = mix(col, hubbleGold, goldMask * 0.75);

      // Green-gold mid-tones scattered across
      col += hubbleGreen * nDetail * density * 0.25;

      // dust lanes darken locally
      col *= (1.0 - dust * 0.70);

    } else {
      // ── Webb ───────────────────────────────────────────────────────────────
      col = webbDark;

      float rustMask = density * mix(0.6, 1.0, 1.0 - lateralR);
      col = mix(col, webbRust, rustMask * 0.85);

      // Amber highlights
      col = mix(col, webbAmber, hilite * 0.80);

      // Cream knots at the very brightest tips
      col = mix(col, webbCream, hilite * hilite * 0.60);

      // Deeper red on the sides
      float deepMask = density * (1.0 - centerBand) * 0.6;
      col = mix(col, webbDeep, deepMask);

      col *= (1.0 - dust * 0.55);
    }

    // ── global dim – background should be subtle, not compete with pillars ──
    col *= 0.55;

    // ── smooth poles to pure black so the sphere caps don't show artefacts ──
    float poleFade = 1.0 - pow(abs(d.y), 2.5);
    col *= poleFade;

    gl_FragColor = vec4(col, 1.0);
  }
`

// ─── Public API ───────────────────────────────────────────────────────────────

export function createNebulaBgShader(scene) {
  const geo = new THREE.SphereGeometry(480, 64, 48)
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uMode: { value: 0.0 },   // 0 = Hubble, 1 = Webb
    },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.renderOrder = -100   // draw first, behind everything
  scene.add(mesh)

  return { mat, mesh }
}

export function setNebulaBgShaderMode(mat, mode) {
  mat.uniforms.uMode.value = mode === 'webb' ? 1.0 : 0.0
}

export function tickNebulaBgShader(mat, delta) {
  mat.uniforms.uTime.value += delta
}
