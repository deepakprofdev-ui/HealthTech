import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Stars, OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function HealthCore({ riskScore = 0 }: { riskScore?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const color = new THREE.Color();
  // Green to Red based on risk score
  color.setHSL((100 - riskScore) / 360, 0.8, 0.5);

  // Use THREE.Timer as the modern replacement for THREE.Clock
  const timerRef = useRef<THREE.Timer>(new THREE.Timer());

  useFrame(() => {
    if (meshRef.current) {
      timerRef.current.update();
      const elapsed = timerRef.current.getElapsed();

      meshRef.current.rotation.x = elapsed * 0.2;
      meshRef.current.rotation.y = elapsed * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1, 64, 64]} scale={1.5}>
        <MeshDistortMaterial
          color={color}
          speed={3}
          distort={0.4 + (riskScore / 200)}
          radius={1}
        />
      </Sphere>
    </Float>
  );
}

export default function HealthScene({ riskScore }: { riskScore?: number }) {
  return (
    <div className="w-full h-full absolute inset-0 -z-10 bg-slate-950">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <HealthCore riskScore={riskScore} />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
