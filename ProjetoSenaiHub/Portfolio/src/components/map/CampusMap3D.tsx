"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { RotateCcw } from "lucide-react"
import { CAMPUS_BLOCKS, type CampusBlockId } from "@/data/campus"

const DIMMED = 0.22
const FULL = 1
const DEFAULT_DIR = new THREE.Vector3(0.92, 0.44, 0.78).normalize()

type BlockGroup = { id: CampusBlockId; group: THREE.Group }

function applyOpacity(mesh: THREE.Mesh, opacity: number) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const mat of mats) {
    if (!mat) continue
    mat.opacity = opacity
    mat.transparent = opacity < 0.99
    mat.depthWrite = opacity >= 0.92
    mat.needsUpdate = true
  }
}

function setBlockOpacity(blocks: BlockGroup[], selected: CampusBlockId | null) {
  for (const block of blocks) {
    const opacity = selected === null || block.id === selected ? FULL : DIMMED
    block.group.traverse((child) => {
      if (child instanceof THREE.Mesh) applyOpacity(child, opacity)
    })
  }
}

function findBlockId(object: THREE.Object3D | null): CampusBlockId | null {
  let current: THREE.Object3D | null = object
  while (current) {
    if (current.userData.blockId) return current.userData.blockId as CampusBlockId
    current = current.parent
  }
  return null
}

function fitCampus(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  center: THREE.Vector3,
  maxDim: number,
) {
  const safeDim = Math.max(maxDim, 1)
  const fov = (camera.fov * Math.PI) / 180
  const distance = ((safeDim / 2) / Math.tan(fov / 2)) * 0.56
  controls.target.copy(center)
  camera.position.copy(center).add(DEFAULT_DIR.clone().multiplyScalar(distance))
  camera.near = Math.max(distance / 200, 0.1)
  camera.far = Math.max(distance * 40, 5000)
  camera.updateProjectionMatrix()
  controls.update()
}

export function CampusMap3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const blocksRef = useRef<BlockGroup[]>([])
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const centerRef = useRef(new THREE.Vector3())
  const maxDimRef = useRef(40)
  const selectedRef = useRef<CampusBlockId | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CampusBlockId | null>(null)
  const [progress, setProgress] = useState(0)

  const focusBlock = (blockId: CampusBlockId | null) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    if (!blockId) {
      fitCampus(camera, controls, centerRef.current, maxDimRef.current)
      return
    }

    const block = blocksRef.current.find((b) => b.id === blockId)
    if (!block) return
    const box = new THREE.Box3().setFromObject(block.group)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const radius = Math.max(size.x, size.y, size.z, 1) * 1.4
    controls.target.copy(center)
    camera.position.set(center.x + radius, center.y + radius * 0.65, center.z + radius)
    controls.update()
  }

  const selectBlock = (id: CampusBlockId | null) => {
    selectedRef.current = id
    setSelected(id)
    setBlockOpacity(blocksRef.current, id)
    focusBlock(id)
  }

  useEffect(() => {
    const container = containerRef.current
    const host = hostRef.current
    if (!container || !host) return

    let disposed = false
    let visible = true
    let raf = 0

    setLoading(true)
    setError(null)
    setProgress(0)
    setSelected(null)
    selectedRef.current = null
    blocksRef.current = []

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xe8edf5)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.className = "block h-full w-full touch-none"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.maxPolarAngle = Math.PI / 2.05
    controlsRef.current = controls

    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const key = new THREE.DirectionalLight(0xffffff, 1.25)
    key.position.set(40, 80, 30)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xdce8ff, 0.6)
    fill.position.set(-30, 30, -20)
    scene.add(fill)
    scene.add(new THREE.HemisphereLight(0xf0f4ff, 0x6b7280, 0.4))

    const campusRoot = new THREE.Group()
    scene.add(campusRoot)

    const resize = () => {
      if (disposed) return
      const w = container.clientWidth
      const h = container.clientHeight
      if (w < 2 || h < 2) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true
      },
      { threshold: 0.02 },
    )
    io.observe(container)

    const animate = () => {
      if (disposed) return
      raf = requestAnimationFrame(animate)
      if (!visible || document.hidden) return
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const pointerStart = { x: 0, y: 0 }
    let moved = false

    const onDown = (e: PointerEvent) => {
      pointerStart.x = e.clientX
      pointerStart.y = e.clientY
      moved = false
    }
    const onMove = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 6) moved = true
    }
    const onUp = (e: PointerEvent) => {
      if (moved || disposed) return
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(campusRoot.children, true)
      if (!hits.length) {
        selectBlock(null)
        return
      }
      const id = findBlockId(hits[0].object)
      selectBlock(id === selectedRef.current ? null : id)
    }

    renderer.domElement.addEventListener("pointerdown", onDown)
    renderer.domElement.addEventListener("pointermove", onMove)
    renderer.domElement.addEventListener("pointerup", onUp)

    const loader = new GLTFLoader()

    ;(async () => {
      try {
        const total = CAMPUS_BLOCKS.length
        for (let i = 0; i < total; i++) {
          if (disposed) return
          const block = CAMPUS_BLOCKS[i]
          const gltf = await loader.loadAsync(block.modelFile)
          if (disposed) return

          const wrapper = new THREE.Group()
          wrapper.name = block.name
          wrapper.userData.blockId = block.id
          wrapper.add(gltf.scene)

          wrapper.traverse((child) => {
            child.userData.blockId = block.id
            if (!(child instanceof THREE.Mesh) || !child.material) return
            if (Array.isArray(child.material)) {
              child.material = child.material.map((m) => m.clone())
            } else {
              child.material = child.material.clone()
            }
          })

          campusRoot.add(wrapper)
          blocksRef.current.push({ id: block.id, group: wrapper })
          setProgress(Math.round(((i + 1) / total) * 100))
        }

        if (disposed) return

        campusRoot.updateMatrixWorld(true)
        const box = new THREE.Box3().setFromObject(campusRoot)
        if (box.isEmpty()) {
          throw new Error("Bounding box vazia — modelos sem geometria.")
        }

        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z, 1)
        centerRef.current.copy(center)
        maxDimRef.current = maxDim

        resize()
        fitCampus(camera, controls, center, maxDim)
        renderer.render(scene, camera)
        setLoading(false)
      } catch (err) {
        if (disposed) return
        console.error("[CampusMap3D]", err)
        setError("Não foi possível carregar os modelos 3D do campus.")
        setLoading(false)
      }
    })()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      renderer.domElement.removeEventListener("pointerdown", onDown)
      renderer.domElement.removeEventListener("pointermove", onMove)
      renderer.domElement.removeEventListener("pointerup", onUp)
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement)
      }
      cameraRef.current = null
      controlsRef.current = null
      blocksRef.current = []
    }
    // Monta uma única vez — callbacks usam refs/state setters estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = CAMPUS_BLOCKS.find((b) => b.id === selected)

  return (
    <div
      ref={containerRef}
      className="relative h-[min(72vh,640px)] w-full overflow-hidden rounded-[1.5rem] bg-[#e8edf5]"
      data-lenis-prevent
    >
      <div ref={hostRef} className="absolute inset-0 z-0" />

      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#e8edf5]/95 backdrop-blur-sm">
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Carregando campus · {progress}%
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#e8edf5] p-6 text-center text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap gap-2 sm:left-5 sm:top-5">
            {CAMPUS_BLOCKS.map((block) => (
              <button
                key={block.id}
                type="button"
                data-cursor
                onClick={() => selectBlock(selected === block.id ? null : block.id)}
                className="pointer-events-auto rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  background: selected === block.id ? block.accent : "rgba(255,255,255,0.85)",
                  color: selected === block.id ? "#fff" : "var(--ink)",
                  border: `1px solid ${selected === block.id ? block.accent : "rgba(10,12,16,0.08)"}`,
                }}
              >
                {block.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-cursor
            onClick={() => selectBlock(null)}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-[var(--ink)] shadow-sm backdrop-blur sm:right-5 sm:top-5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resetar vista
          </button>

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-sm">
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                {active ? "Bloco selecionado" : "Campus completo"}
              </p>
              <p className="mt-1 display text-2xl" style={{ color: active?.accent ?? "var(--ink)" }}>
                {active?.name ?? "SENAI Campus 3D"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                {active?.blurb ??
                  "Arraste para orbitar · scroll para zoom · clique em um bloco para destacar."}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
