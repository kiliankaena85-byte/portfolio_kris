/**
 * Procedural WebGL / Three.js Interactive Background
 * Features:
 * - Organic procedural shader sphere with 3D noise displacement
 * - Real-time reaction to mouse coordinates (smooth damped tilt & surface pull)
 * - Dynamic responsiveness to Lenis scroll speed (wave excitation & rotation)
 * - Deep dark chromatic palette with Fresnel neon lavender and lime edge glow
 * - Ambient dust mote field for spatial depth
 * - Zero external GLB models (100% procedural & lightweight)
 */

(function () {
  'use strict';

  // Check if WebGL is supported
  function isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  if (!isWebGLAvailable() || !window.THREE) {
    console.info('WebGL or Three.js unavailable, falling back to CSS dynamic gradients.');
    return;
  }

  const container = document.getElementById('webgl-canvas-container');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 6.5;

  const renderer = new THREE.WebGLRenderer({
    powerPreference: 'high-performance',
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0); // Transparent to show dark background
  container.appendChild(renderer.domElement);

  // Mouse & Scroll State
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let scrollVelocity = 0;
  let targetScrollVelocity = 0;

  // GLSL Simplex Noise Shader Code
  const vertexShader = `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uScrollVelocity;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vDisplacement;
    varying vec2 vUv;

    // Classic 3D Perlin/Simplex-style noise functions
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    
    float snoise(vec3 v){
      const vec2  C = vec2(1.0/6.0, 1.0/3.0);
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      vec3 x1 = x0 - i1 + 1.0 * C.xxx;
      vec3 x2 = x0 - i2 + 2.0 * C.xxx;
      vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

      i = mod(i, 289.0 );
      vec4 p = permute( permute( permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Calculate dynamic noise displacement
      vec3 noiseCoords = position * 0.9 + vec3(uTime * 0.18);
      float noise1 = snoise(noiseCoords);
      float noise2 = snoise(noiseCoords * 2.2 + vec3(uTime * 0.12)) * 0.5;
      
      // Additional displacement influenced by mouse pull and scroll velocity
      vec3 mouseInfluence = vec3(uMouse * 0.45, 0.0);
      float distToMouse = length(position.xy - mouseInfluence.xy);
      float mouseWave = sin(distToMouse * 3.5 - uTime * 2.0) * 0.12 * smoothstep(2.5, 0.0, distToMouse);
      
      float totalDisplacement = (noise1 + noise2 + mouseWave) * (0.32 + uScrollVelocity * 0.4);
      vDisplacement = totalDisplacement;

      vec3 newPosition = position + normal * totalDisplacement;
      vPosition = newPosition;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorMid;
    uniform vec3 uColorAccent;
    uniform vec3 uColorNeonLime;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vDisplacement;
    varying vec2 vUv;

    void main() {
      // View direction for Fresnel rim calculation
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = dot(viewDir, vNormal);
      fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
      float fresnelRim = pow(fresnel, 2.8);

      // Gradient mixing according to displacement & height
      float normDisp = smoothstep(-0.4, 0.5, vDisplacement);
      
      vec3 baseGradient = mix(uColorBase, uColorMid, normDisp);
      vec3 richColor = mix(baseGradient, uColorAccent, pow(normDisp, 1.8));

      // Neon lime rim accent on high curvature & displacement peaks
      float limeHighlight = pow(fresnel, 4.0) * (0.4 + 0.6 * normDisp);
      richColor = mix(richColor, uColorNeonLime, limeHighlight * 0.65);

      // Add gentle glowing aura intensity
      float alpha = 0.55 + fresnelRim * 0.45;
      
      gl_FragColor = vec4(richColor, alpha);
    }
  `;

  // Create organic icosahedron geometry with adaptive subdivision for fluid curves & rock-solid 60fps
  const detail = window.innerWidth < 768 ? 12 : 18;
  const geometry = new THREE.IcosahedronGeometry(2.1, detail);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uScrollVelocity: { value: 0 },
    uColorBase: { value: new THREE.Color('#0a0322') },      // Deep Obsidian Purple
    uColorMid: { value: new THREE.Color('#381885') },       // Velvet Royal Indigo
    uColorAccent: { value: new THREE.Color('#a855f7') },    // Orchid Lavender Glow
    uColorNeonLime: { value: new THREE.Color('#d4ff3f') }   // High-voltage Cyber Lime
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    blending: THREE.NormalBlending,
    wireframe: false,
    side: THREE.FrontSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(1.4, -0.2, 0); // Positioned slightly to the right to frame hero text
  scene.add(mesh);

  // Subtle wireframe halo orbiting slightly offset
  const wireGeometry = new THREE.IcosahedronGeometry(2.35, 6);
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x8b5cf6,
    wireframe: true,
    transparent: true,
    opacity: 0.07
  });
  const wireMesh = new THREE.Mesh(wireGeometry, wireMaterial);
  wireMesh.position.copy(mesh.position);
  scene.add(wireMesh);

  // Floating Micro-Particle Starfield for Cyber-Depth
  const particleCount = 200;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 16;
    particlePositions[i + 1] = (Math.random() - 0.5) * 12;
    particlePositions[i + 2] = (Math.random() - 0.5) * 8 - 1;
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.035,
    color: 0xc4b5fd,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Event Listeners
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    // Shift sphere position on smaller screens so it stays nicely centered or behind text
    if (width < 768) {
      mesh.position.set(0, 0.4, -0.5);
      mesh.scale.set(0.75, 0.75, 0.75);
    } else {
      mesh.position.set(1.4, -0.2, 0);
      mesh.scale.set(1, 1, 1);
    }
    wireMesh.position.copy(mesh.position);
    wireMesh.scale.copy(mesh.scale);
  });

  // Call resize initially to adjust for mobile/desktop layout
  if (window.innerWidth < 768) {
    mesh.position.set(0, 0.4, -0.5);
    mesh.scale.set(0.75, 0.75, 0.75);
    wireMesh.position.copy(mesh.position);
    wireMesh.scale.copy(mesh.scale);
  }

  // Hook into Lenis scroll velocity via custom event or global poll
  window.addEventListener('lenis-scroll', (e) => {
    if (e.detail && typeof e.detail.velocity === 'number') {
      targetScrollVelocity = Math.min(Math.abs(e.detail.velocity) * 0.003, 0.8);
    }
  });

  // Clock
  const clock = new THREE.Clock();

  // Animation Loop
  function render() {
    requestAnimationFrame(render);

    if (document.visibilityState === 'hidden') return;

    const elapsedTime = clock.getElapsedTime();

    // Lerp mouse coordinates
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Decay scroll velocity lerp
    scrollVelocity += (targetScrollVelocity - scrollVelocity) * 0.08;
    targetScrollVelocity *= 0.92;

    // Update uniforms
    uniforms.uTime.value = elapsedTime;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uScrollVelocity.value = scrollVelocity;

    // Organic mesh rotation
    mesh.rotation.y = elapsedTime * 0.15 + mouse.x * 0.35;
    mesh.rotation.x = elapsedTime * 0.08 - mouse.y * 0.25;

    wireMesh.rotation.y = -elapsedTime * 0.08 + mouse.x * 0.2;
    wireMesh.rotation.x = -elapsedTime * 0.05 - mouse.y * 0.15;

    // Floating particles drift
    particles.rotation.y = elapsedTime * 0.02;
    particles.rotation.x = elapsedTime * 0.01;

    renderer.render(scene, camera);
  }

  render();
})();
