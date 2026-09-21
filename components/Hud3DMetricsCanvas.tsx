import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Hud3DRingProps {
  percentage: number;
  isDark: boolean;
  accentColor?: string;
}

const Hud3DRing: React.FC<Hud3DRingProps> = ({ percentage, isDark, accentColor }) => {
  const mainRingRef = useRef<THREE.Mesh>(null);
  const outerGyroRef = useRef<THREE.Mesh>(null);
  const innerGyroRef = useRef<THREE.Mesh>(null);
  const particlesGroupRef = useRef<THREE.Group>(null);

  const clampedPct = Math.max(0, Math.min(100, percentage));
  const normalizedProgress = clampedPct / 100;

  // Colors based on theme and completion
  const primaryGlowColor = useMemo(() => {
    if (accentColor) return accentColor;
    if (clampedPct >= 100) return '#00F59B'; // Emerald Green
    if (clampedPct >= 50) return '#00F0FF'; // Cyan HUD
    return '#FFB800'; // Amber HUD
  }, [clampedPct, accentColor]);

  const secondaryColor = isDark ? '#1E3A8A' : '#94A3B8';
  const wireframeColor = isDark ? '#00F0FF' : '#2563EB';

  // 60fps orbital rotation
  useFrame((_, delta) => {
    if (mainRingRef.current) {
      mainRingRef.current.rotation.z += delta * 0.35;
      mainRingRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.15;
    }
    if (outerGyroRef.current) {
      outerGyroRef.current.rotation.y += delta * 0.5;
      outerGyroRef.current.rotation.x -= delta * 0.25;
    }
    if (innerGyroRef.current) {
      innerGyroRef.current.rotation.y -= delta * 0.4;
      innerGyroRef.current.rotation.z += delta * 0.3;
    }
    if (particlesGroupRef.current) {
      particlesGroupRef.current.rotation.z -= delta * 0.2;
    }
  });

  // Calculate arc for progress torus
  const arcLength = Math.max(0.1, normalizedProgress * Math.PI * 2);

  return (
    <group>
      {/* Dynamic Lighting */}
      <ambientLight intensity={isDark ? 0.6 : 0.9} />
      <pointLight
        position={[4, 4, 6]}
        color={primaryGlowColor}
        intensity={isDark ? 2.5 : 1.5}
        distance={15}
      />
      <pointLight
        position={[-4, -3, -4]}
        color={isDark ? '#00F0FF' : '#3B82F6'}
        intensity={isDark ? 1.8 : 1.0}
        distance={12}
      />

      {/* 1. Base Track Ring (Subtle Background) */}
      <mesh rotation={[Math.PI / 6, 0, 0]}>
        <torusGeometry args={[1.7, 0.08, 16, 64]} />
        <meshStandardMaterial
          color={secondaryColor}
          transparent
          opacity={isDark ? 0.25 : 0.35}
          roughness={0.6}
        />
      </mesh>

      {/* 2. Active Progress Torus (Emissive Glowing Arc) */}
      <mesh ref={mainRingRef} rotation={[Math.PI / 6, 0, 0]}>
        <torusGeometry args={[1.7, 0.14, 16, 64, arcLength]} />
        <meshStandardMaterial
          color={primaryGlowColor}
          emissive={primaryGlowColor}
          emissiveIntensity={isDark ? 2.2 : 1.2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* 3. Outer Sci-Fi Gyro Wireframe Ring */}
      <mesh ref={outerGyroRef}>
        <torusGeometry args={[2.15, 0.02, 8, 48]} />
        <meshStandardMaterial
          color={wireframeColor}
          wireframe
          transparent
          opacity={isDark ? 0.45 : 0.3}
        />
      </mesh>

      {/* 4. Inner Tactical Targeting Ring */}
      <mesh ref={innerGyroRef}>
        <torusGeometry args={[1.25, 0.02, 6, 32]} />
        <meshStandardMaterial
          color={primaryGlowColor}
          wireframe
          transparent
          opacity={isDark ? 0.5 : 0.35}
        />
      </mesh>

      {/* 5. Orbiting Data Nodes */}
      <group ref={particlesGroupRef} rotation={[Math.PI / 4, 0, 0]}>
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const angle = (idx / 6) * Math.PI * 2;
          const radius = 1.7;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const isNodeActive = (idx / 6) <= normalizedProgress;

          return (
            <mesh key={idx} position={[x, y, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial
                color={isNodeActive ? primaryGlowColor : secondaryColor}
                emissive={isNodeActive ? primaryGlowColor : '#000000'}
                emissiveIntensity={isNodeActive && isDark ? 2.0 : 0.5}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

export interface Hud3DMetricsCanvasProps {
  percentage: number;
  isDark: boolean;
  accentColor?: string;
  height?: number;
}

export const Hud3DMetricsCanvas: React.FC<Hud3DMetricsCanvasProps> = ({
  percentage,
  isDark,
  accentColor,
  height = 190,
}) => {
  return (
    <View style={[styles.canvasContainer, { height }]}>
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 48 }}
        style={styles.canvas}
        gl={{ alpha: true, antialias: true }}
      >
        <Hud3DRing
          percentage={percentage}
          isDark={isDark}
          accentColor={accentColor}
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
});
