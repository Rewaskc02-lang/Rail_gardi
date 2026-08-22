import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * ThreeTrainCanvas
 * Cinematic 3D Particle Vortex Galaxy & Realistic Illuminated Locomotive
 * Custom GLSL vertex/fragment shaders + additive volumetric blending
 */
export default function ThreeTrainCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    const bgVoid = 0x211926; // Diadora Bright Delivery deep violet-charcoal
    scene.background = new THREE.Color(bgVoid);
    scene.fog = new THREE.FogExp2(bgVoid, 0.012);

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4.2, 24);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lighting for Realistic Locomotive Shading
    const ambientLight = new THREE.AmbientLight(0x46344e, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfaed26, 1.5);
    sunLight.position.set(20, 30, 20);
    scene.add(sunLight);

    const blueBackLight = new THREE.DirectionalLight(0x00f59b, 1.0);
    blueBackLight.position.set(-20, 15, -20);
    scene.add(blueBackLight);

    // 2. Ambient particle field. Keep it deliberately light: the landing page
    // has its own frame canvas and non-landing routes do not need a GPU stress test.
    const gu = {
      time: { value: 0 }
    };

    const sizes = [];
    const shift = [];
    const pushShift = () => {
      shift.push(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
        Math.random() * 0.9 + 0.1
      );
    };

    const pts = [];
    // Core Particle Sphere
    for (let i = 0; i < 3500; i++) {
      sizes.push(Math.random() * 1.8 + 0.4);
      pushShift();
      pts.push(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5));
    }
    // Disk Vortex Ring
    for (let i = 0; i < 6500; i++) {
      const r = 8;
      const R = 45;
      const rand = Math.pow(Math.random(), 1.5);
      const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
      pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2.5));
      sizes.push(Math.random() * 1.6 + 0.4);
      pushShift();
    }

    const particleGeo = new THREE.BufferGeometry().setFromPoints(pts);
    particleGeo.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
    particleGeo.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

    const particleMat = new THREE.PointsMaterial({
      size: 0.13,
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      onBeforeCompile: (shader) => {
        shader.uniforms.time = gu.time;
        shader.vertexShader = `
          uniform float time;
          attribute float sizes;
          attribute vec4 shift;
          varying vec3 vColor;
          ${shader.vertexShader}
        `.replace(
          `gl_PointSize = size;`,
          `gl_PointSize = size * sizes;`
        ).replace(
          `#include <color_vertex>`,
          `#include <color_vertex>
            float d = length(abs(position) / vec3(45., 12., 45.));
            d = clamp(d, 0., 1.);
            vColor = mix(vec3(250., 237., 38.), vec3(157., 141., 143.), d) / 255.;
          `
        ).replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
            float t = time;
            float moveT = mod(shift.x + shift.z * t, 6.28318530718);
            float moveS = mod(shift.y + shift.z * t, 6.28318530718);
            transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * (shift.w * 0.6);
          `
        );

        shader.fragmentShader = `
          varying vec3 vColor;
          ${shader.fragmentShader}
        `.replace(
          `#include <clipping_planes_fragment>`,
          `#include <clipping_planes_fragment>
            float d = length(gl_PointCoord.xy - 0.5);
          `
        ).replace(
          `vec4 diffuseColor = vec4( diffuse, opacity );`,
          `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.08, d) * 0.85 );`
        );
      }
    });

    const galaxyMesh = new THREE.Points(particleGeo, particleMat);
    galaxyMesh.rotation.order = "ZYX";
    galaxyMesh.rotation.z = 0.25;
    scene.add(galaxyMesh);

    // 3. GLOWING VECTOR RAIL CORRIDOR & SLEEPERS
    const railGroup = new THREE.Group();
    const glowLineMat = new THREE.MeshBasicMaterial({ color: 0xfaed26, transparent: true, opacity: 0.85 });
    const darkRailMat = new THREE.MeshStandardMaterial({ color: 0x46344e, metalness: 0.9, roughness: 0.2 });

    const railGeo = new THREE.BoxGeometry(0.09, 0.18, 360);
    const leftRail = new THREE.Mesh(railGeo, glowLineMat);
    leftRail.position.set(-1.6, 0.05, -80);
    const rightRail = new THREE.Mesh(railGeo, glowLineMat);
    rightRail.position.set(1.6, 0.05, -80);
    railGroup.add(leftRail, rightRail);

    // Sleepers (Ties)
    const sleeperGeo = new THREE.BoxGeometry(4.2, 0.06, 0.3);
    for (let z = 60; z > -260; z -= 2.4) {
      const sleeper = new THREE.Mesh(sleeperGeo, darkRailMat);
      sleeper.position.set(0, 0, z);
      railGroup.add(sleeper);
    }

    // Ground Grid
    const groundGrid = new THREE.GridHelper(360, 72, 0xfaed26, 0x2d2333);
    groundGrid.position.set(0, -0.05, -80);
    groundGrid.material.opacity = 0.35;
    groundGrid.material.transparent = true;
    scene.add(groundGrid);

    scene.add(railGroup);

    // 4. REALISTIC DETAILED LOCOMOTIVE + PASSENGER COACHES
    const trainGroup = new THREE.Group();

    // Body Material - High specularity metallic navy
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x46344e,
      metalness: 0.92,
      roughness: 0.18
    });

    const darkAccentMat = new THREE.MeshStandardMaterial({
      color: 0x2d2333,
      metalness: 0.95,
      roughness: 0.1
    });

    const glassMat = new THREE.MeshBasicMaterial({
      color: 0xfaed26
    });

    const glowStripeMat = new THREE.MeshBasicMaterial({
      color: 0xfaed26
    });

    // --- LOCOMOTIVE HEAD ENGINE ---
    const locoGroup = new THREE.Group();

    // Main Engine Body (Beveled feel)
    const engineBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, 11), bodyMat);
    engineBody.position.set(0, 1.5, 0);
    locoGroup.add(engineBody);

    // Aerodynamic Nose Wedge
    const noseGeo = new THREE.ConeGeometry(1.65, 3.8, 4);
    const nose = new THREE.Mesh(noseGeo, darkAccentMat);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    nose.position.set(0, 1.45, -6.6);
    locoGroup.add(nose);

    // Neon Accent Speed Stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.08, 12), glowStripeMat);
    stripe.position.set(0, 1.35, -0.5);
    locoGroup.add(stripe);

    // Cockpit Windshield (Angled Cyan Glow)
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 0.1), glassMat);
    windshield.position.set(0, 2.0, -5.6);
    windshield.rotation.x = -0.3;
    locoGroup.add(windshield);

    // Side Windows
    for (let zw = -2.5; zw <= 3.5; zw += 1.8) {
      const leftWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.1), glassMat);
      leftWin.position.set(-1.22, 1.8, zw);
      const rightWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.1), glassMat);
      rightWin.position.set(1.22, 1.8, zw);
      locoGroup.add(leftWin, rightWin);
    }

    // Heavy Wheel Bogies (8 Steel Wheels)
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const wheelZ = [-4.2, -2.5, 2.2, 4.0];
    wheelZ.forEach((wz) => {
      const leftW = new THREE.Mesh(wheelGeo, wheelMat);
      leftW.rotation.z = Math.PI / 2;
      leftW.position.set(-1.45, 0.25, wz);
      const rightW = new THREE.Mesh(wheelGeo, wheelMat);
      rightW.rotation.z = Math.PI / 2;
      rightW.position.set(1.45, 0.25, wz);
      locoGroup.add(leftW, rightW);
    });

    // Roof Pantograph Lattice & Exhaust
    const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 2.0), darkAccentMat);
    pantoBase.position.set(0, 2.65, 2.0);
    locoGroup.add(pantoBase);

    // High-Intensity Volumetric Headlight
    const headlight = new THREE.SpotLight(0x00f5a0, 16, 75, Math.PI / 6.5, 0.5, 1.2);
    headlight.position.set(0, 1.7, -7.8);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, 0, -45);
    scene.add(spotTarget);
    headlight.target = spotTarget;
    locoGroup.add(headlight);

    // Volumetric Headlight Cone Beam
    const coneGeo = new THREE.ConeGeometry(6.5, 38, 32, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x00d8f6,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const volumetricCone = new THREE.Mesh(coneGeo, coneMat);
    volumetricCone.rotation.x = -Math.PI / 2;
    volumetricCone.position.set(0, 0, -19);
    headlight.add(volumetricCone);

    trainGroup.add(locoGroup);

    // --- LINKED PASSENGER COACH 1 ---
    const coach1 = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.0, 11), bodyMat);
    coach1.position.set(0, 1.5, 13.5);
    const coach1Stripe = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.08, 11), glowStripeMat);
    coach1Stripe.position.set(0, 1.35, 13.5);
    trainGroup.add(coach1, coach1Stripe);

    // Coach 1 Windows
    for (let zw = 9.5; zw <= 17.5; zw += 1.8) {
      const leftWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.1), glassMat);
      leftWin.position.set(-1.2, 1.7, zw);
      const rightWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.1), glassMat);
      rightWin.position.set(1.2, 1.7, zw);
      trainGroup.add(leftWin, rightWin);
    }

    trainGroup.position.set(0, 0, 12);
    scene.add(trainGroup);

    // 5. INERTIAL SCROLL KINEMATICS
    let targetScroll = 0;
    let currentScroll = 0;

    const onScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      targetScroll = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // 6. ANIMATION LOOP
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Update Shader Galaxy Time
      gu.time.value = elapsedTime * Math.PI * 0.12;
      galaxyMesh.rotation.y = elapsedTime * 0.012;

      // Inertial Dampening (Lerp 0.045)
      currentScroll += (targetScroll - currentScroll) * 0.045;

      // Advance Train along track
      trainGroup.position.z = 12 - currentScroll * 150;

      // Smooth Camera tracking with dynamic banking
      camera.position.z = trainGroup.position.z + 14 + Math.sin(currentScroll * Math.PI) * 2.5;
      camera.position.x = Math.sin(currentScroll * 2) * 2.0;
      camera.position.y = 3.4 + Math.cos(currentScroll * 2) * 0.4;
      camera.lookAt(0, 1.3, trainGroup.position.z - 15);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0
      }}
      aria-hidden="true"
    />
  );
}
