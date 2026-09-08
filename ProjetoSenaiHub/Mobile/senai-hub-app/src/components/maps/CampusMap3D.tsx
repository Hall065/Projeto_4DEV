import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Asset } from 'expo-asset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { loadArrayBufferAsync, Renderer } from 'expo-three';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, X } from 'lucide-react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CAMPUS_BLOCKS, CAMPUS_BLOCK_BY_ID, type CampusBlockId } from '@/constants/campusBlocks';
import { colors } from '@/constants/colors';
import {
  CAMPUS_PERSON_ROLE_COLORS,
  CAMPUS_PERSON_ROLE_LABELS,
  type CampusPersonLegendItem,
  type CampusPersonLocation,
} from '@/types/campusPeople';
import {
  CAMPUS_TICKET_KIND_LABELS,
  CAMPUS_TICKET_STATUS_COLORS,
  CAMPUS_TICKET_STATUS_LABELS,
  type CampusTicketMarker,
} from '@/types/campusTickets';
import { ticketMarkerColor } from '@/utils/campusTicketMarkers';
import {
  buildBlockPinMarkers,
  buildGeographicPinMarkers,
  disposePinMarkerGroup,
  type PinMarkerBlock,
} from './campusPinMarker3d';
import { useI18n } from '@/hooks/useI18n';

const DIMMED_OPACITY = 0.2;
const FULL_OPACITY = 1;
const MIN_XRAY_OPACITY = 0.1;
const DEFAULT_CAMERA_ZOOM = 0.56;
const DEFAULT_CAMERA_DIRECTION = new THREE.Vector3(0.92, 0.44, 0.78).normalize();
const DEFAULT_CAMERA_YAW = Math.atan2(DEFAULT_CAMERA_DIRECTION.x, DEFAULT_CAMERA_DIRECTION.z);
const DEFAULT_CAMERA_PITCH = Math.asin(DEFAULT_CAMERA_DIRECTION.y);
const DRAG_THRESHOLD_PX = 8;

interface BlockGroup {
  id: CampusBlockId;
  group: THREE.Group;
}

interface MeshOpacityTarget {
  mesh: THREE.Mesh;
  blockId: CampusBlockId;
  center: THREE.Vector3;
  radius: number;
}

interface OrbitState {
  target: THREE.Vector3;
  yaw: number;
  pitch: number;
  distance: number;
  minDistance: number;
  maxDistance: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startYaw: number;
  startPitch: number;
  startDistance: number;
  startPinchDistance: number;
  moved: boolean;
}

interface GltfResult {
  scene?: THREE.Object3D;
  scenes?: THREE.Object3D[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computeCampusFitDistance(maxDim: number, fovDeg: number): number {
  const fovRad = (fovDeg * Math.PI) / 180;
  return ((maxDim / 2) / Math.tan(fovRad / 2)) * DEFAULT_CAMERA_ZOOM;
}

function applyCameraOrbit(camera: THREE.PerspectiveCamera, orbit: OrbitState) {
  const horizontal = Math.cos(orbit.pitch);
  const direction = new THREE.Vector3(
    Math.sin(orbit.yaw) * horizontal,
    Math.sin(orbit.pitch),
    Math.cos(orbit.yaw) * horizontal
  );

  camera.position.copy(orbit.target).add(direction.multiplyScalar(orbit.distance));
  camera.lookAt(orbit.target);
}

function applyDefaultCampusView(orbit: OrbitState, center: THREE.Vector3, distance: number) {
  orbit.target.copy(center);
  orbit.distance = distance;
  orbit.yaw = DEFAULT_CAMERA_YAW;
  orbit.pitch = DEFAULT_CAMERA_PITCH;
}

function applyRendererViewport(
  renderer: Renderer,
  width: number,
  height: number
) {
  renderer.setSize(width, height, false);
  renderer.setViewport(0, 0, width, height);
  renderer.setScissorTest(false);
}

function prepareMaterials(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone());
    } else if (child.material) {
      child.material = child.material.clone();
    }
  });
}

function applyMeshOpacity(mesh: THREE.Mesh, opacity: number) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    material.opacity = opacity;
    material.transparent = opacity < 0.99;
    material.depthWrite = opacity >= 0.92;
    material.needsUpdate = true;
  }
}

function collectMeshTargets(blocks: BlockGroup[]): MeshOpacityTarget[] {
  const targets: MeshOpacityTarget[] = [];
  for (const block of blocks) {
    block.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const box = new THREE.Box3().setFromObject(child);
      const center = box.getCenter(new THREE.Vector3());
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      targets.push({
        mesh: child,
        blockId: block.id,
        center,
        radius: Math.max(sphere.radius, 1),
      });
    });
  }
  return targets;
}

function updateProximityOpacity(
  camera: THREE.PerspectiveCamera,
  lookTarget: THREE.Vector3,
  meshTargets: MeshOpacityTarget[],
  selectedBlockId: CampusBlockId | null,
  campusRadius: number
) {
  const cameraToTarget = camera.position.distanceTo(lookTarget);
  const fadeStart = campusRadius * 0.55;
  const fadeEnd = campusRadius * 0.12;
  const zoomFactor = 1 - THREE.MathUtils.smoothstep(cameraToTarget, fadeEnd, fadeStart);

  const viewDir = new THREE.Vector3().subVectors(lookTarget, camera.position);
  const viewLength = viewDir.length();
  if (viewLength < 0.001) return;
  viewDir.divideScalar(viewLength);

  const toCenter = new THREE.Vector3();
  const lateral = new THREE.Vector3();

  for (const { mesh, blockId, center, radius } of meshTargets) {
    const selectionOpacity =
      selectedBlockId === null || blockId === selectedBlockId ? FULL_OPACITY : DIMMED_OPACITY;

    if (zoomFactor <= 0.001) {
      applyMeshOpacity(mesh, selectionOpacity);
      continue;
    }

    toCenter.subVectors(center, camera.position);
    const distToMesh = toCenter.length();
    const distAlongView = toCenter.dot(viewDir);
    const lateralDistance = lateral.copy(toCenter).addScaledVector(viewDir, -distAlongView).length();

    const isObstructing =
      distAlongView > 0 &&
      distAlongView < cameraToTarget + radius * 0.5 &&
      lateralDistance < radius * 2.2;

    const proximityFactor = 1 - THREE.MathUtils.smoothstep(distToMesh, fadeEnd, fadeStart);
    const obstructionWeight = isObstructing ? 1 : proximityFactor * 0.45;
    const xrayStrength = zoomFactor * Math.max(proximityFactor, obstructionWeight);
    const xrayOpacity = THREE.MathUtils.lerp(FULL_OPACITY, MIN_XRAY_OPACITY, xrayStrength);

    applyMeshOpacity(mesh, selectionOpacity * xrayOpacity);
  }
}

function findBlockId(object: THREE.Object3D | null): CampusBlockId | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData.blockId) return current.userData.blockId as CampusBlockId;
    current = current.parent;
  }
  return null;
}

function findMarkerId(object: THREE.Object3D | null): string | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData.markerId) return current.userData.markerId as string;
    current = current.parent;
  }
  return null;
}

function extractGltfScene(result: GltfResult): THREE.Object3D | null {
  return result.scene ?? result.scenes?.[0] ?? null;
}

function toAbsoluteWebAssetUri(uri: string): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return uri;
  return new URL(uri, window.location.origin).toString();
}

async function loadCampusModelAsync(modelAsset: number): Promise<GltfResult> {
  const [asset] = await Asset.loadAsync(modelAsset);
  const uri = toAbsoluteWebAssetUri(asset.localUri ?? asset.uri);
  const arrayBuffer = await loadArrayBufferAsync({ uri, onProgress: undefined });
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', resolve, reject);
  });
}

function disposeSceneObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}

function distanceBetweenTouches(event: GestureResponderEvent) {
  const touches = event.nativeEvent.touches;
  if (touches.length < 2) return 0;
  const [first, second] = touches;
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
}

interface CampusMap3DViewerProps {
  people?: CampusPersonLocation[];
  personLegend?: CampusPersonLegendItem[];
  ticketMarkers?: CampusTicketMarker[];
  selectedBlockId: CampusBlockId | null;
  selectedPersonId: string | null;
  selectedTicketId?: string | null;
  onSelectBlock: (blockId: CampusBlockId | null) => void;
  onSelectPerson: (personId: string | null) => void;
  onSelectTicket?: (ticketId: string | null) => void;
  onFatalError?: (message: string) => void;
  viewerHeight?: ViewStyle['height'];
  minHeight?: number;
  compact?: boolean;
  showPanel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CampusMap3DViewer({
  people = [],
  personLegend,
  ticketMarkers = [],
  selectedBlockId,
  selectedPersonId,
  selectedTicketId = null,
  onSelectBlock,
  onSelectPerson,
  onSelectTicket,
  onFatalError,
  viewerHeight = 380,
  minHeight = 360,
  compact = false,
  showPanel = true,
  style,
}: CampusMap3DViewerProps) {
  const { t } = useI18n();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const blocksRef = useRef<BlockGroup[]>([]);
  const meshTargetsRef = useRef<MeshOpacityTarget[]>([]);
  const peopleRef = useRef(people);
  const ticketMarkersRef = useRef(ticketMarkers);
  const selectedBlockRef = useRef<CampusBlockId | null>(selectedBlockId);
  const selectedPersonRef = useRef<string | null>(selectedPersonId);
  const selectedTicketRef = useRef<string | null>(selectedTicketId);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const mapReadyRef = useRef(false);
  const markerRadiusRef = useRef(10);
  const campusCenterRef = useRef(new THREE.Vector3());
  const campusBoundsRef = useRef(new THREE.Box3());
  const campusDistanceRef = useRef(40);
  const campusRadiusRef = useRef(40);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const animationRef = useRef<number | null>(null);
  const viewportRef = useRef({ width: 0, height: 0 });
  const renderBufferRef = useRef({ width: 1, height: 1 });
  const disposedRef = useRef(false);
  const touchRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startYaw: DEFAULT_CAMERA_YAW,
    startPitch: DEFAULT_CAMERA_PITCH,
    startDistance: 40,
    startPinchDistance: 0,
    moved: false,
  });
  const orbitRef = useRef<OrbitState>({
    target: new THREE.Vector3(),
    yaw: DEFAULT_CAMERA_YAW,
    pitch: DEFAULT_CAMERA_PITCH,
    distance: 40,
    minDistance: 3,
    maxDistance: 160,
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedBlocks, setLoadedBlocks] = useState<CampusBlockId[]>([]);

  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedPersonId) ?? null,
    [people, selectedPersonId]
  );
  const selectedTicket = useMemo(
    () => ticketMarkers.find((marker) => marker.id === selectedTicketId) ?? null,
    [selectedTicketId, ticketMarkers]
  );
  const selectedBlockPeople = useMemo(
    () => (selectedBlockId ? people.filter((person) => person.blockId === selectedBlockId) : []),
    [people, selectedBlockId]
  );
  const selectedBlockTickets = useMemo(
    () => (selectedBlockId ? ticketMarkers.filter((marker) => marker.blockId === selectedBlockId) : []),
    [selectedBlockId, ticketMarkers]
  );

  const applySelectedMarkerScale = useCallback(() => {
    const markers = markersGroupRef.current;
    if (!markers) return;

    markers.traverse((marker) => {
      if (!marker.userData.markerId) return;
      const isSelected =
        marker.userData.markerId === selectedPersonRef.current ||
        marker.userData.markerId === selectedTicketRef.current;
      marker.scale.setScalar(isSelected ? 1.32 : 1);
    });
  }, []);

  const syncMapMarkers = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !mapReadyRef.current) return;

    if (markersGroupRef.current) {
      scene.remove(markersGroupRef.current);
      disposePinMarkerGroup(markersGroupRef.current);
      markersGroupRef.current = null;
    }

    const markerRoot = new THREE.Group();
    markerRoot.name = 'campus-map-markers';

    const geographicPeople = peopleRef.current.filter((person) => person.geo);
    const blockPeople = peopleRef.current.filter((person) => !person.geo && person.blockId);

    if (geographicPeople.length > 0 && !campusBoundsRef.current.isEmpty()) {
      markerRoot.add(
        buildGeographicPinMarkers(
          geographicPeople,
          blocksRef.current as PinMarkerBlock[],
          campusBoundsRef.current,
          markerRadiusRef.current,
          (person) => person.markerColor ?? CAMPUS_PERSON_ROLE_COLORS[person.role]
        )
      );
    }

    if (blockPeople.length > 0) {
      markerRoot.add(
        buildBlockPinMarkers(
          blockPeople,
          blocksRef.current as PinMarkerBlock[],
          markerRadiusRef.current,
          (person) => person.markerColor ?? CAMPUS_PERSON_ROLE_COLORS[person.role]
        )
      );
    }

    if (ticketMarkersRef.current.length > 0) {
      markerRoot.add(
        buildBlockPinMarkers(
          ticketMarkersRef.current,
          blocksRef.current as PinMarkerBlock[],
          markerRadiusRef.current,
          ticketMarkerColor
        )
      );
    }

    if (markerRoot.children.length === 0) return;
    markersGroupRef.current = markerRoot;
    scene.add(markersGroupRef.current);
    applySelectedMarkerScale();
  }, [applySelectedMarkerScale]);

  const focusBlock = useCallback((blockId: CampusBlockId | null) => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (!blockId) {
      applyDefaultCampusView(orbitRef.current, campusCenterRef.current, campusDistanceRef.current);
      applyCameraOrbit(camera, orbitRef.current);
      return;
    }

    const block = blocksRef.current.find((entry) => entry.id === blockId);
    if (!block) return;

    const box = new THREE.Box3().setFromObject(block.group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 1.4;

    orbitRef.current.target.copy(center);
    orbitRef.current.distance = clamp(radius * 1.55, orbitRef.current.minDistance, orbitRef.current.maxDistance);
    orbitRef.current.yaw = DEFAULT_CAMERA_YAW;
    orbitRef.current.pitch = DEFAULT_CAMERA_PITCH;
    applyCameraOrbit(camera, orbitRef.current);
  }, []);

  const focusMarker = useCallback((markerId: string) => {
    const camera = cameraRef.current;
    const markers = markersGroupRef.current;
    if (!camera || !markers) return;

    let selectedMarker: THREE.Object3D | null = null;
    markers.traverse((entry) => {
      if (!selectedMarker && entry.userData.markerId === markerId) selectedMarker = entry;
    });
    if (!selectedMarker) return;

    const target = (selectedMarker as THREE.Object3D).getWorldPosition(new THREE.Vector3());
    orbitRef.current.target.copy(target);
    orbitRef.current.distance = clamp(
      markerRadiusRef.current * 11,
      orbitRef.current.minDistance,
      orbitRef.current.maxDistance
    );
    orbitRef.current.yaw = DEFAULT_CAMERA_YAW;
    orbitRef.current.pitch = DEFAULT_CAMERA_PITCH;
    applyCameraOrbit(camera, orbitRef.current);
  }, []);

  const handleResetView = useCallback(() => {
    onSelectBlock(null);
    onSelectPerson(null);
    onSelectTicket?.(null);
    focusBlock(null);
  }, [focusBlock, onSelectBlock, onSelectPerson, onSelectTicket]);

  const pickAt = useCallback(
    (x: number, y: number) => {
      const camera = cameraRef.current;
      const { width, height } = viewportRef.current;
      if (!camera || width <= 0 || height <= 0) return;

      pointerRef.current.x = (x / width) * 2 - 1;
      pointerRef.current.y = -(y / height) * 2 + 1;
      raycasterRef.current.setFromCamera(pointerRef.current, camera);

      if (markersGroupRef.current) {
        const markerIntersects = raycasterRef.current.intersectObjects([markersGroupRef.current], true);
        const markerId = markerIntersects.length > 0 ? findMarkerId(markerIntersects[0].object) : null;
        if (markerId) {
          const person = peopleRef.current.find((entry) => entry.id === markerId);
          const ticket = ticketMarkersRef.current.find((entry) => entry.id === markerId);
          if (person) {
            onSelectPerson(person.id);
            onSelectTicket?.(null);
            onSelectBlock(person.blockId ?? null);
            if (person.blockId) focusBlock(person.blockId);
            else focusMarker(person.id);
            return;
          }
          if (ticket) {
            onSelectPerson(null);
            onSelectTicket?.(ticket.id);
            onSelectBlock(ticket.blockId);
            focusBlock(ticket.blockId);
            return;
          }
        }
      }

      const blockIntersects = raycasterRef.current.intersectObjects(
        blocksRef.current.map((block) => block.group),
        true
      );
      const blockId = blockIntersects.length > 0 ? findBlockId(blockIntersects[0].object) : null;

      onSelectPerson(null);
      onSelectTicket?.(null);
      onSelectBlock(blockId);
      if (blockId) focusBlock(blockId);
    },
    [focusBlock, focusMarker, onSelectBlock, onSelectPerson, onSelectTicket]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const touch = touchRef.current;
          touch.startX = event.nativeEvent.locationX;
          touch.startY = event.nativeEvent.locationY;
          touch.startYaw = orbitRef.current.yaw;
          touch.startPitch = orbitRef.current.pitch;
          touch.startDistance = orbitRef.current.distance;
          touch.startPinchDistance = distanceBetweenTouches(event);
          touch.moved = false;
        },
        onPanResponderMove: (event, gestureState) => {
          const touch = touchRef.current;
          const touches = event.nativeEvent.touches;

          if (Math.hypot(gestureState.dx, gestureState.dy) > DRAG_THRESHOLD_PX) {
            touch.moved = true;
          }

          if (touches.length >= 2) {
            const currentPinchDistance = distanceBetweenTouches(event);
            if (touch.startPinchDistance > 0 && currentPinchDistance > 0) {
              orbitRef.current.distance = clamp(
                touch.startDistance * (touch.startPinchDistance / currentPinchDistance),
                orbitRef.current.minDistance,
                orbitRef.current.maxDistance
              );
            }
            return;
          }

          orbitRef.current.yaw = touch.startYaw - gestureState.dx * 0.008;
          orbitRef.current.pitch = clamp(touch.startPitch + gestureState.dy * 0.006, 0.12, 1.18);
        },
        onPanResponderRelease: (event) => {
          if (!touchRef.current.moved) {
            pickAt(event.nativeEvent.locationX, event.nativeEvent.locationY);
          }
        },
      }),
    [pickAt]
  );

  const zoomBy = useCallback((amount: number) => {
    orbitRef.current.distance = clamp(
      orbitRef.current.distance + amount,
      orbitRef.current.minDistance,
      orbitRef.current.maxDistance
    );
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;

    viewportRef.current = { width, height };
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (camera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    if (renderer) {
      const renderSize =
        Platform.OS === 'web'
          ? { width, height }
          : renderBufferRef.current;
      applyRendererViewport(renderer, renderSize.width, renderSize.height);
    }
  }, []);

  const setFatalError = useCallback(
    (message: string) => {
      setLoadError(message);
      setLoading(false);
      onFatalError?.(message);
    },
    [onFatalError]
  );

  const handleContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      disposedRef.current = false;
      setLoading(true);
      setLoadError(null);

      try {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe8edf5);
        sceneRef.current = scene;

        renderBufferRef.current = {
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
        };
        const layoutWidth = viewportRef.current.width;
        const layoutHeight = viewportRef.current.height;
        const cameraWidth = layoutWidth > 0 ? layoutWidth : gl.drawingBufferWidth;
        const cameraHeight = layoutHeight > 0 ? layoutHeight : gl.drawingBufferHeight;
        const renderWidth =
          Platform.OS === 'web' && layoutWidth > 0
            ? layoutWidth
            : gl.drawingBufferWidth;
        const renderHeight =
          Platform.OS === 'web' && layoutHeight > 0
            ? layoutHeight
            : gl.drawingBufferHeight;

        const camera = new THREE.PerspectiveCamera(
          50,
          cameraWidth / cameraHeight,
          0.1,
          5000
        );
        cameraRef.current = camera;

        const renderer = new Renderer({
          gl,
          antialias: true,
          clearColor: 0xe8edf5,
          width: renderWidth,
          height: renderHeight,
        });
        renderer.setPixelRatio(1);
        applyRendererViewport(renderer, renderWidth, renderHeight);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.sortObjects = true;
        rendererRef.current = renderer;

        scene.add(new THREE.AmbientLight(0xffffff, 0.85));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(40, 80, 30);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xdce8ff, 0.55);
        fillLight.position.set(-30, 30, -20);
        scene.add(fillLight);
        scene.add(new THREE.HemisphereLight(0xf0f4ff, 0x6b7280, 0.35));

        const campusRoot = new THREE.Group();
        scene.add(campusRoot);
        blocksRef.current = [];
        meshTargetsRef.current = [];
        mapReadyRef.current = false;

        const animate = () => {
          if (disposedRef.current) return;
          animationRef.current = requestAnimationFrame(animate);
          if (cameraRef.current && rendererRef.current && sceneRef.current) {
            const bufferWidth = gl.drawingBufferWidth;
            const bufferHeight = gl.drawingBufferHeight;
            if (
              renderBufferRef.current.width !== bufferWidth ||
              renderBufferRef.current.height !== bufferHeight
            ) {
              renderBufferRef.current = { width: bufferWidth, height: bufferHeight };
              applyRendererViewport(rendererRef.current, bufferWidth, bufferHeight);
            } else if (Platform.OS !== 'web') {
              rendererRef.current.setViewport(0, 0, bufferWidth, bufferHeight);
            }
            gl.viewport(0, 0, bufferWidth, bufferHeight);
            applyCameraOrbit(cameraRef.current, orbitRef.current);
            if (meshTargetsRef.current.length > 0) {
              updateProximityOpacity(
                cameraRef.current,
                orbitRef.current.target,
                meshTargetsRef.current,
                selectedBlockRef.current,
                campusRadiusRef.current
              );
            }
            rendererRef.current.render(sceneRef.current, cameraRef.current);
            gl.endFrameEXP();
          }
        };
        animate();

        const loaded: CampusBlockId[] = [];
        const errors: string[] = [];

        for (const block of CAMPUS_BLOCKS) {
          try {
            const gltf = await loadCampusModelAsync(block.modelAsset);
            if (disposedRef.current) return;

            const modelScene = extractGltfScene(gltf);
            if (!modelScene) throw new Error('Cena GLB vazia.');

            const group = new THREE.Group();
            group.name = block.name;
            group.userData.blockId = block.id;
            group.add(modelScene);
            prepareMaterials(group);
            campusRoot.add(group);
            blocksRef.current.push({ id: block.id, group });
            loaded.push(block.id);
          } catch (error) {
            console.error(`[CampusMap3D] Falha ao carregar ${block.name}:`, error);
            errors.push(block.name);
          }
        }

        if (disposedRef.current) return;

        if (loaded.length === 0) {
          setLoadedBlocks([]);
          setFatalError('Nao foi possivel carregar os modelos 3D do campus.');
          return;
        }

        const box = new THREE.Box3().setFromObject(campusRoot);
        if (box.isEmpty()) {
          setLoadedBlocks([]);
          setFatalError('Os modelos 3D foram carregados, mas estao vazios.');
          return;
        }

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const radius = maxDim * 0.75;

        campusCenterRef.current.copy(center);
        campusBoundsRef.current.copy(box);
        campusRadiusRef.current = Math.max(radius, 20);
        campusDistanceRef.current = Math.max(computeCampusFitDistance(maxDim, camera.fov), 20);
        markerRadiusRef.current = Math.max(radius * 0.022, 7);
        orbitRef.current.minDistance = Math.max(radius * 0.08, 3);
        orbitRef.current.maxDistance = Math.max(radius * 4, 80);
        applyDefaultCampusView(orbitRef.current, center, campusDistanceRef.current);
        applyCameraOrbit(camera, orbitRef.current);

        meshTargetsRef.current = collectMeshTargets(blocksRef.current);
        mapReadyRef.current = true;
        syncMapMarkers();

        if (errors.length > 0) {
          setLoadError(`Modelos ausentes: ${errors.join(', ')}`);
        }

        setLoadedBlocks(loaded);
        setLoading(false);
      } catch (error) {
        console.error('[CampusMap3D] Falha ao iniciar GLView:', error);
        setFatalError('Nao foi possivel iniciar o mapa 3D neste dispositivo.');
      }
    },
    [setFatalError, syncMapMarkers]
  );

  useEffect(() => {
    peopleRef.current = people;
    ticketMarkersRef.current = ticketMarkers;
    syncMapMarkers();
  }, [people, syncMapMarkers, ticketMarkers]);

  useEffect(() => {
    selectedBlockRef.current = selectedBlockId;
    focusBlock(selectedBlockId);
  }, [focusBlock, selectedBlockId]);

  useEffect(() => {
    selectedPersonRef.current = selectedPersonId;
    applySelectedMarkerScale();
    const person = peopleRef.current.find((entry) => entry.id === selectedPersonId);
    if (person?.geo && selectedPersonId) focusMarker(selectedPersonId);
  }, [applySelectedMarkerScale, focusMarker, selectedPersonId]);

  useEffect(() => {
    selectedTicketRef.current = selectedTicketId;
    applySelectedMarkerScale();
  }, [applySelectedMarkerScale, selectedTicketId]);

  useEffect(
    () => () => {
      disposedRef.current = true;
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      if (markersGroupRef.current) {
        sceneRef.current?.remove(markersGroupRef.current);
        disposePinMarkerGroup(markersGroupRef.current);
        markersGroupRef.current = null;
      }
      if (sceneRef.current) disposeSceneObject(sceneRef.current);
      sceneRef.current?.clear();
      rendererRef.current?.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      blocksRef.current = [];
      meshTargetsRef.current = [];
      campusBoundsRef.current.makeEmpty();
      mapReadyRef.current = false;
    },
    []
  );

  return (
    <View
      style={[styles.viewer, { height: viewerHeight, minHeight }, style]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <GLView style={StyleSheet.absoluteFill} onContextCreate={handleContextCreate} />

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.navy} />
          <Text style={styles.loadingText}>{t("Carregando mapa 3D...")}</Text>
        </View>
      ) : null}

      {!loading && loadedBlocks.length === 0 && !loadError ? (
        <View style={styles.loadingOverlay}>
          <Text style={styles.emptyText}>{t("Nenhum bloco do campus foi carregado.")}</Text>
        </View>
      ) : null}

      {loadError && loadedBlocks.length > 0 ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{loadError}</Text>
        </View>
      ) : null}

      {!loading && loadedBlocks.length > 0 ? (
        <>
          <View style={styles.toolbar}>
            <Pressable accessibilityRole="button" onPress={() => zoomBy(-campusRadiusRef.current * 0.08)} style={styles.iconButton}>
              <Plus size={16} color={colors.navy} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => zoomBy(campusRadiusRef.current * 0.08)} style={styles.iconButton}>
              <Minus size={16} color={colors.navy} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleResetView} style={styles.iconButton}>
              <RotateCcw size={16} color={colors.navy} />
            </Pressable>
          </View>

          {showPanel ? (
            <View style={[styles.legend, compact && styles.legendCompact]}>
              {ticketMarkers.length > 0
                ? Object.entries(CAMPUS_TICKET_STATUS_LABELS).map(([status, label]) => (
                    <View key={status} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          {
                            backgroundColor:
                              CAMPUS_TICKET_STATUS_COLORS[
                                status as keyof typeof CAMPUS_TICKET_STATUS_COLORS
                              ],
                          },
                        ]}
                      />
                      <Text style={styles.legendText}>{label}</Text>
                    </View>
                  ))
                : (personLegend ?? Object.entries(CAMPUS_PERSON_ROLE_LABELS).map(([role, label]) => ({
                    label,
                    color: CAMPUS_PERSON_ROLE_COLORS[role as keyof typeof CAMPUS_PERSON_ROLE_COLORS],
                  }))).map((item) => (
                    <View key={item.label} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.legendText}>{item.label}</Text>
                    </View>
                  ))}
            </View>
          ) : null}

          {showPanel && (selectedPerson || selectedTicket || selectedBlockId) ? (
            <View style={styles.selectionPanel}>
              {selectedPerson ? (
                <>
                  <Text numberOfLines={1} style={styles.selectionTitle}>{selectedPerson.name}</Text>
                  <Text numberOfLines={1} style={styles.selectionText}>
                    {CAMPUS_PERSON_ROLE_LABELS[selectedPerson.role]} - {selectedPerson.blockId
                      ? CAMPUS_BLOCK_BY_ID[selectedPerson.blockId].name
                      : t("Ponto GPS projetado no campus")}
                  </Text>
                  <Text numberOfLines={1} style={styles.selectionMuted}>
                    {[selectedPerson.room, selectedPerson.detail].filter(Boolean).join(' - ')}
                  </Text>
                </>
              ) : selectedTicket ? (
                <>
                  <Text numberOfLines={1} style={styles.selectionTitle}>
                    {selectedTicket.code} - {selectedTicket.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.selectionText}>
                    {CAMPUS_TICKET_KIND_LABELS[selectedTicket.kind]} - {CAMPUS_BLOCK_BY_ID[selectedTicket.blockId].name}
                  </Text>
                  <Text numberOfLines={2} style={styles.selectionMuted}>
                    {[
                      selectedTicket.room ? `Sala ${selectedTicket.room}` : null,
                      CAMPUS_TICKET_STATUS_LABELS[selectedTicket.status],
                      selectedTicket.assignee ?? 'Sem responsavel',
                    ].filter(Boolean).join(' - ')}
                  </Text>
                </>
              ) : selectedBlockId ? (
                <>
                  <Text numberOfLines={1} style={styles.selectionTitle}>{CAMPUS_BLOCK_BY_ID[selectedBlockId].name}</Text>
                  <Text numberOfLines={1} style={styles.selectionText}>
                    {ticketMarkers.length > 0
                      ? `${selectedBlockTickets.length} atendimento(s) mapeado(s)`
                      : `${selectedBlockPeople.length} pessoa(s) mapeada(s)`}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

interface CampusMap3DContainerProps {
  people?: CampusPersonLocation[];
  personLegend?: CampusPersonLegendItem[];
  ticketMarkers?: CampusTicketMarker[];
  highlightPersonId?: string | null;
  highlightTicketId?: string | null;
  onSelectPerson?: (personId: string | null) => void;
  onSelectTicket?: (ticketId: string | null) => void;
  moduleLabel?: string;
  minHeight?: number;
  compact?: boolean;
  fallback?: ReactNode;
}

export function CampusMap3DContainer({
  people = [],
  personLegend,
  ticketMarkers = [],
  highlightPersonId = null,
  highlightTicketId = null,
  onSelectPerson,
  onSelectTicket,
  moduleLabel = 'SENAI Connect',
  minHeight = 380,
  compact = false,
  fallback,
}: CampusMap3DContainerProps) {
  const { t } = useI18n();
  const [selectedBlockId, setSelectedBlockId] = useState<CampusBlockId | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightPersonId || !people.length) return;
    const person = people.find((entry) => entry.id === highlightPersonId);
    if (!person) return;
    setSelectedPersonId(person.id);
    setSelectedBlockId(person.blockId ?? null);
  }, [highlightPersonId, people]);

  useEffect(() => {
    if (!highlightTicketId || !ticketMarkers.length) return;
    const marker = ticketMarkers.find((entry) => entry.id === highlightTicketId);
    if (!marker) return;
    setSelectedTicketId(marker.id);
    setSelectedPersonId(null);
    setSelectedBlockId(marker.blockId);
  }, [highlightTicketId, ticketMarkers]);

  const handleSelectPerson = useCallback(
    (personId: string | null) => {
      setSelectedPersonId(personId);
      if (personId) setSelectedTicketId(null);
      onSelectPerson?.(personId);
    },
    [onSelectPerson]
  );

  const handleSelectTicket = useCallback(
    (ticketId: string | null) => {
      setSelectedTicketId(ticketId);
      if (ticketId) setSelectedPersonId(null);
      onSelectTicket?.(ticketId);
    },
    [onSelectTicket]
  );

  const renderViewer = (expanded: boolean) => (
    <CampusMap3DViewer
      people={people}
      personLegend={personLegend}
      ticketMarkers={ticketMarkers}
      selectedBlockId={selectedBlockId}
      selectedPersonId={selectedPersonId}
      selectedTicketId={selectedTicketId}
      onSelectBlock={setSelectedBlockId}
      onSelectPerson={handleSelectPerson}
      onSelectTicket={handleSelectTicket}
      onFatalError={setFatalError}
      viewerHeight={expanded ? '100%' : minHeight}
      minHeight={expanded ? 1 : minHeight}
      compact={compact || expanded}
      style={expanded ? styles.fullscreenViewer : undefined}
    />
  );

  if (fatalError && fallback) {
    return (
      <View style={styles.fallbackWrap}>
        <View style={styles.fallbackMessage}>
          <Text style={styles.fallbackText}>{fatalError}</Text>
        </View>
        {fallback}
      </View>
    );
  }

  return (
    <>
      <View style={{ minHeight }}>
        {!fullscreen ? renderViewer(false) : null}
        {!fullscreen ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setFullscreen(true)}
            style={styles.maximizeButton}
          >
            <Maximize2 size={16} color={colors.white} />
          </Pressable>
        ) : null}
      </View>

      <Modal visible={fullscreen} animationType="slide" onRequestClose={() => setFullscreen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>{t("Mapa 3D do campus SENAI")}</Text>
              <Text style={styles.modalSubtitle}>{moduleLabel}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setFullscreen(false)} style={styles.closeButton}>
              <Minimize2 size={17} color={colors.navy} />
              <X size={17} color={colors.navy} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>{renderViewer(true)}</View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  viewer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#E8EDF5',
  },
  fullscreenViewer: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E8EDF5',
    padding: 18,
  },
  loadingText: {
    color: colors.grayText,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.grayText,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  warning: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    zIndex: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE7A3',
    backgroundColor: '#FFF6DB',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  warningText: {
    color: '#9A5B00',
    fontSize: 11,
    fontWeight: '800',
  },
  toolbar: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 18,
    gap: 7,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  legend: {
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 18,
    maxWidth: 156,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(221,230,241,0.82)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    gap: 6,
  },
  legendCompact: {
    maxWidth: 140,
  },
  legendItem: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.navy,
    fontSize: 10,
    fontWeight: '800',
  },
  selectionPanel: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    zIndex: 18,
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(221,230,241,0.9)',
    backgroundColor: 'rgba(255,255,255,0.93)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  selectionTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
  },
  selectionText: {
    color: colors.grayText,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  selectionMuted: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  maximizeButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 22,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: colors.grayText,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  modalBody: {
    flex: 1,
    padding: 10,
  },
  fallbackWrap: {
    gap: 10,
  },
  fallbackMessage: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE7A3',
    backgroundColor: '#FFF6DB',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  fallbackText: {
    color: '#9A5B00',
    fontSize: 11,
    fontWeight: '800',
  },
});
