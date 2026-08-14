"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, OrbitControls, TransformControls } from "@react-three/drei";
import { Plane, Vector3, type Group, type Object3D } from "three";
import { RAD } from "@/lib/utils";
import {
  buildWorldMatrices,
  jointPosition,
  type FigurePose,
  type SceneJSON,
} from "@/lib/mannequin/pose";
import { IK_CHAINS, type BoneId, type Vec3 } from "@/lib/mannequin/skeleton";
import { useEditor } from "@/lib/mannequin/store";
import { Figure, ROLE_COLORS } from "./figure";

/* ========================================================================== */
/* Lighting & environment                                                     */
/* ========================================================================== */

function Stage({ showGrid }: { showGrid: boolean }) {
  return (
    <>
      <color attach="background" args={["#0a0c10"]} />
      <fog attach="fog" args={["#0a0c10", 7, 16]} />

      {/* Key / fill / rim — a hard key with cool fill reads as "gym at night". */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 7, 4]} intensity={1.5} color="#fff4ec" />
      <directionalLight position={[-5, 3, -4]} intensity={0.7} color="#5f9ecf" />
      <directionalLight position={[0, 2, -6]} intensity={0.5} color="#dc2626" />

      {/* The HDR is fetched from a CDN. Isolating it behind its own boundary
          means a slow or unavailable network only costs us the reflections
          instead of blanking the entire viewport. */}
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={0.25} />
      </Suspense>

      {/* Mat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <circleGeometry args={[4.2, 72]} />
        <meshStandardMaterial color="#12161c" roughness={0.95} metalness={0} />
      </mesh>

      {showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={0.25}
          cellThickness={0.5}
          cellColor="#1e2530"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#2b3644"
          fadeDistance={14}
          fadeStrength={1.4}
          followCamera={false}
          infiniteGrid
        />
      )}

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.7}
        scale={8}
        blur={2.4}
        far={2.5}
        resolution={512}
        color="#000000"
      />
    </>
  );
}

/* ========================================================================== */
/* IK handles                                                                 */
/* ========================================================================== */

const dragPlane = new Plane();
const planeNormal = new Vector3();
const hitPoint = new Vector3();

function IkHandles({ figure, figureIndex }: { figure: FigurePose; figureIndex: number }) {
  const { camera } = useThree();
  const dragIk = useEditor((s) => s.dragIk);
  const commit = useEditor((s) => s.commit);
  const setDragging = useEditor((s) => s.setDragging);
  const setActiveFigure = useEditor((s) => s.setActiveFigure);
  const selectBone = useEditor((s) => s.selectBone);
  const activeFigure = useEditor((s) => s.activeFigure);

  const [dragging, setLocalDragging] = useState<BoneId | null>(null);
  const [hovered, setHovered] = useState<BoneId | null>(null);

  // Effector positions are derived from the pose, so handles follow the rig
  // automatically without needing to live inside the bone hierarchy.
  const positions = useMemo(() => {
    const world = buildWorldMatrices(figure);
    return IK_CHAINS.map((chain) => ({
      chain,
      position: jointPosition(world, chain.effector).toArray() as Vec3,
    }));
  }, [figure]);

  const onPointerDown = useCallback(
    (bone: BoneId, position: Vec3) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      (event.target as Element)?.setPointerCapture?.(event.pointerId);

      if (activeFigure !== figureIndex) setActiveFigure(figureIndex);
      selectBone(bone);
      commit();
      setLocalDragging(bone);
      setDragging(true);

      // Drag across a plane that faces the camera through the handle, so the
      // handle tracks the cursor exactly regardless of orbit angle.
      camera.getWorldDirection(planeNormal);
      dragPlane.setFromNormalAndCoplanarPoint(
        planeNormal.negate(),
        new Vector3(...position),
      );
    },
    [activeFigure, camera, commit, figureIndex, selectBone, setActiveFigure, setDragging],
  );

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!dragging) return;
      event.stopPropagation();
      if (event.ray.intersectPlane(dragPlane, hitPoint)) {
        dragIk(dragging, hitPoint);
      }
    },
    [dragging, dragIk],
  );

  const endDrag = useCallback(() => {
    if (!dragging) return;
    setLocalDragging(null);
    setDragging(false);
  }, [dragging, setDragging]);

  useEffect(() => {
    window.addEventListener("pointerup", endDrag);
    return () => window.removeEventListener("pointerup", endDrag);
  }, [endDrag]);

  const palette = ROLE_COLORS[figure.role];

  return (
    <group>
      {/* Invisible catcher so the pointer keeps producing rays off the handle. */}
      {dragging && (
        <mesh onPointerMove={onPointerMove} onPointerUp={endDrag} visible={false}>
          <sphereGeometry args={[40, 8, 8]} />
          <meshBasicMaterial side={2} />
        </mesh>
      )}

      {positions.map(({ chain, position }) => {
        const isActive = dragging === chain.effector;
        const isHover = hovered === chain.effector;
        return (
          <mesh
            key={chain.effector}
            position={position}
            scale={isActive ? 1.5 : isHover ? 1.3 : 1}
            renderOrder={3}
            onPointerDown={onPointerDown(chain.effector, position)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(chain.effector);
            }}
            onPointerOut={() => setHovered(null)}
          >
            <sphereGeometry args={[0.042, 16, 16]} />
            <meshBasicMaterial
              color={isActive ? "#ffffff" : isHover ? palette.rim : "#22d3ee"}
              transparent
              opacity={isActive ? 1 : 0.85}
              depthTest={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ========================================================================== */
/* Gizmo                                                                      */
/* ========================================================================== */

function Gizmo({ target }: { target: Object3D | null }) {
  const gizmoMode = useEditor((s) => s.gizmoMode);
  const moveWholeFigure = useEditor((s) => s.moveWholeFigure);
  const selectedBone = useEditor((s) => s.selectedBone);
  const setDragging = useEditor((s) => s.setDragging);
  const commit = useEditor((s) => s.commit);
  const setJointAngles = useEditor((s) => s.setJointAngles);
  const setFigureTransform = useEditor((s) => s.setFigureTransform);

  if (!target || gizmoMode === "off") return null;
  if (!moveWholeFigure && !selectedBone) return null;

  return (
    <TransformControls
      object={target}
      mode={moveWholeFigure ? gizmoMode : "rotate"}
      size={moveWholeFigure ? 0.9 : 0.55}
      space="local"
      onMouseDown={() => {
        commit();
        setDragging(true);
      }}
      onMouseUp={() => setDragging(false)}
      onObjectChange={() => {
        if (moveWholeFigure) {
          setFigureTransform(
            target.position.toArray() as Vec3,
            [
              target.rotation.x * RAD,
              target.rotation.y * RAD,
              target.rotation.z * RAD,
            ],
          );
        } else if (selectedBone) {
          setJointAngles(selectedBone, [
            target.rotation.x * RAD,
            target.rotation.y * RAD,
            target.rotation.z * RAD,
          ]);
        }
      }}
    />
  );
}

/* ========================================================================== */
/* Capture bridge                                                             */
/* ========================================================================== */

export type CaptureFn = () => string | null;

function CaptureBridge({ onReady }: { onReady: (capture: CaptureFn) => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    onReady(() => {
      // Force a synchronous render: the WebGL back buffer is only guaranteed to
      // hold readable pixels immediately after a draw, even with
      // preserveDrawingBuffer enabled.
      gl.render(scene, camera);
      try {
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    });
  }, [gl, scene, camera, onReady]);

  return null;
}

/* ========================================================================== */
/* Camera sync & keyboard controls                                            */
/* ========================================================================== */

function CameraSync({ camera: cameraState }: { camera: SceneJSON["camera"] }) {
  const camera = useThree((s) => s.camera);
  const applied = useRef<string>("");

  useEffect(() => {
    const key = JSON.stringify(cameraState);
    if (applied.current === key) return;
    applied.current = key;
    camera.position.set(...cameraState.position);
    camera.lookAt(...cameraState.target);
  }, [cameraState, camera]);

  return null;
}

function CameraKeyboardControls({ preview }: { preview?: boolean }) {
  // Grab the active Three.js camera and the OrbitControls instance
  const { camera, controls } = useThree();
  // Connect to Zustand state to save camera position when movement stops
  const setCamera = useEditor((s) => s.setCamera);

  // We use refs instead of useState so we don't trigger React re-renders every time a key is pressed
  const keys = useRef<{ [key: string]: boolean }>({});
  const hasMoved = useRef(false);

  useEffect(() => {
    // Disable WASD completely if the app is in "preview" mode
    if (preview) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      // Ignore key presses if the user is typing in an input box or text area
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return;
      }
      keys.current[e.key.toLowerCase()] = true; // Mark key as pressed
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false; // Mark key as released
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [preview]);

  // useFrame executes its code right before every single frame is drawn (e.g. 60 times a second)
  useFrame((_, delta) => {
    if (preview || !controls) return;

    // Base speed: 4 units per second, scaled by delta time for consistent speed across monitor refresh rates
    let speed = 4 * delta;
    if (keys.current["shift"]) speed *= 2.5; // Sprint modifier

    // Calculate a flat "Right" vector pointing out the right side of the camera lens
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; // Crush the vertical axis so pressing 'D' slides sideways, not diagonally into the sky
    
    if (right.lengthSq() > 0.0001) {
      right.normalize(); // Stretch the flattened vector back to length 1
    } else {
      right.set(1, 0, 0); // Failsafe if looking perfectly straight down
    }

    // Cross the world's perfect "Up" with our flat "Right" vector to get a perfect, flat "Forward"
    const forward = new Vector3().crossVectors(new Vector3(0, 1, 0), right).normalize();
    
    const movement = new Vector3(); // Start with zero movement

    // Accumulate the movement vector based on which keys are held
    if (keys.current["w"]) movement.add(forward);
    if (keys.current["s"]) movement.sub(forward);
    if (keys.current["a"]) movement.sub(right);
    if (keys.current["d"]) movement.add(right);
    if (keys.current["q"]) movement.y += 1; // Pure vertical Up
    if (keys.current["e"]) movement.y -= 1; // Pure vertical Down

    if (movement.lengthSq() > 0) {
      // Normalizing prevents diagonal movement (holding W+D) from being faster than moving straight
      movement.normalize().multiplyScalar(speed);
      
      // Move both the camera AND the invisible point it pivots around (target) by the exact same distance
      camera.position.add(movement);
      (controls as any).target.add(movement);
      (controls as any).update(); // Tell OrbitControls to process the math changes
      
      hasMoved.current = true; // Track that we moved this frame
    } else if (hasMoved.current) {
      // If we didn't move this frame, but moved LAST frame, this is the exact moment the user stopped.
      hasMoved.current = false;
      
      // Convert Three.js coordinates to plain arrays and save to the global app state
      const pos = camera.position.toArray() as Vec3;
      const tgt = (controls as any).target.toArray() as Vec3;
      setCamera(pos, tgt);
    }
  });

  return null;
}

/* ========================================================================== */
/* Viewport                                                                   */
/* ========================================================================== */

interface ViewportProps {
  /** Read-only display mode: no handles, no gizmo, slow auto-orbit. */
  preview?: boolean;
  scene?: SceneJSON;
  onCaptureReady?: (capture: CaptureFn) => void;
  className?: string;
}

export function MannequinViewport({
  preview = false,
  scene: overrideScene,
  onCaptureReady,
  className,
}: ViewportProps) {
  const storeScene = useEditor((s) => s.scene);
  const scene = overrideScene ?? storeScene;

  const activeFigure = useEditor((s) => s.activeFigure);
  const selectedBone = useEditor((s) => s.selectedBone);
  const hoveredBone = useEditor((s) => s.hoveredBone);
  const showHandles = useEditor((s) => s.showHandles);
  const showGrid = useEditor((s) => s.showGrid);
  const isDragging = useEditor((s) => s.isDragging);
  const dimInactiveFigure = useEditor((s) => s.dimInactiveFigure);
  const moveWholeFigure = useEditor((s) => s.moveWholeFigure);
  const selectBone = useEditor((s) => s.selectBone);
  const hoverBone = useEditor((s) => s.hoverBone);
  const setActiveFigure = useEditor((s) => s.setActiveFigure);
  const setCamera = useEditor((s) => s.setCamera);

  const boneRefs = useRef(new Map<string, Group>());
  const rootRefs = useRef(new Map<number, Group>());
  const [gizmoTarget, setGizmoTarget] = useState<Object3D | null>(null);

  const registerBone = useCallback(
    (index: number) => (bone: BoneId, object: Group | null) => {
      const key = `${index}:${bone}`;
      if (object) boneRefs.current.set(key, object);
      else boneRefs.current.delete(key);
    },
    [],
  );

  const registerRoot = useCallback(
    (index: number) => (object: Group | null) => {
      if (object) rootRefs.current.set(index, object);
      else rootRefs.current.delete(index);
    },
    [],
  );

  // Resolve the gizmo target after render, once the refs above are populated.
  useEffect(() => {
    if (preview) return setGizmoTarget(null);
    const target = moveWholeFigure
      ? (rootRefs.current.get(activeFigure) ?? null)
      : selectedBone
        ? (boneRefs.current.get(`${activeFigure}:${selectedBone}`) ?? null)
        : null;
    setGizmoTarget(target);
  }, [preview, moveWholeFigure, activeFigure, selectedBone, scene]);

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        shadows={false}
        gl={{
          // Required so the viewport can be captured as a PNG for note frames.
          preserveDrawingBuffer: true,
          antialias: true,
        }}
        camera={{
          position: scene.camera.position,
          fov: 38,
          near: 0.05,
          far: 100,
        }}
        onPointerMissed={() => !preview && selectBone(null)}
      >
        <Stage showGrid={!preview && showGrid} />
        <CameraSync camera={scene.camera} />
        <CameraKeyboardControls preview={preview} />
        {onCaptureReady && <CaptureBridge onReady={onCaptureReady} />}

        {scene.figures.map((figure, index) => (
          <group
            key={figure.id}
            onPointerDown={() => {
              if (!preview && index !== activeFigure && !figure.frozen) setActiveFigure(index);
            }}
          >
            <Figure
              figure={figure}
              dimmed={!preview && dimInactiveFigure && index !== activeFigure}
              selectedBone={index === activeFigure ? selectedBone : null}
              hoveredBone={index === activeFigure ? hoveredBone : null}
              onSelectBone={preview || figure.frozen ? undefined : selectBone}
              onHoverBone={preview || figure.frozen ? undefined : hoverBone}
              registerBone={registerBone(index)}
              registerRoot={registerRoot(index)}
              showHandles={!preview && showHandles && index === activeFigure}
            />
            {!preview && showHandles && index === activeFigure && !figure.frozen && (
              <IkHandles figure={figure} figureIndex={index} />
            )}
          </group>
        ))}

        {!preview && !scene.figures[activeFigure]?.frozen && <Gizmo target={gizmoTarget} />}

        <OrbitControls
          enabled={!isDragging}
          enablePan={!preview}
          autoRotate={preview}
          autoRotateSpeed={0.45}
          minDistance={0.8}
          maxDistance={9}
          maxPolarAngle={Math.PI / 2 - 0.02}
          target={scene.camera.target}
          makeDefault
          onEnd={(event) => {
            if (preview) return;
            const controls = event?.target as unknown as {
              object?: { position: { toArray(): number[] } };
              target?: { toArray(): number[] };
            };
            const position = controls?.object?.position?.toArray() as Vec3 | undefined;
            const target = controls?.target?.toArray() as Vec3 | undefined;
            if (position && target) setCamera(position, target);
          }}
        />
      </Canvas>
    </div>
  );
}
