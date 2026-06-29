import { useMemo } from 'react'
import { Box3, Vector3 } from 'three'
import type { Object3D } from 'three'
import { useGLTF, Clone } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { ALL_BUILDING_URLS, getLayout } from './cityConfig'
import WorldObject from '../../components/World/WorldObject'

// Preload every building GLB so the city pops in together.
ALL_BUILDING_URLS.forEach((url) => useGLTF.preload(url))

/**
 * Procedural 8x8 city grid: clustered mid-rise blocks, skyscrapers at every
 * 3rd intersection, and a low-detail ring for depth. Sits on a cool-grey
 * ground plane.
 */
export default function CityGrid() {
  const gltfs = useGLTF(ALL_BUILDING_URLS) as unknown as Array<{
    scene: Object3D
  }>

  const sceneByUrl = useMemo(() => {
    const map = new Map<string, Object3D>()
    ALL_BUILDING_URLS.forEach((url, i) => map.set(url, gltfs[i].scene))
    return map
  }, [gltfs])

  const layout = useMemo(() => getLayout(), [])

  const buildingsMap = useMemo(() => {
    return layout.buildings.map((p, idx) => ({ p, id: `building_mid_${idx}` }))
  }, [layout.buildings])

  const skyscrapersMap = useMemo(() => {
    return layout.skyscrapers.map((p, idx) => ({ p, id: `skyscraper_${idx}` }))
  }, [layout.skyscrapers])

  const lowDetailMap = useMemo(() => {
    return layout.lowDetail.map((p, idx) => ({ p, id: `building_low_${idx}` }))
  }, [layout.lowDetail])

  // Pre-compute unscaled bounding box per model URL (once).
  const rawSizeByUrl = useMemo(() => {
    const map = new Map<string, { half: Vector3; center: Vector3 }>()
    const box = new Box3()
    ALL_BUILDING_URLS.forEach((url, i) => {
      box.setFromObject(gltfs[i].scene)
      map.set(url, {
        half: box.getSize(new Vector3()).multiplyScalar(0.5),
        center: box.getCenter(new Vector3()),
      })
    })
    return map
  }, [gltfs])

  // Build CuboidCollider specs for every building + skyscraper.
  // Position = building world pos + scaled model center offset.
  const buildingColliders = useMemo(() => {
    return [...layout.buildings, ...layout.skyscrapers].map((p, i) => {
      const raw = rawSizeByUrl.get(p.url)!
      const sc = p.scale
      return {
        id: i,
        args: [raw.half.x * sc, raw.half.y * sc, raw.half.z * sc] as [number, number, number],
        position: [
          p.position[0] + raw.center.x * sc,
          p.position[1] + raw.center.y * sc,
          p.position[2] + raw.center.z * sc,
        ] as [number, number, number],
      }
    })
  }, [layout.buildings, layout.skyscrapers, rawSizeByUrl])

  return (
    <group>


      {/* One fixed body holding all building wall colliders */}
      <RigidBody type="fixed" colliders={false}>
        {buildingColliders.map((c) => (
          <CuboidCollider
            key={c.id}
            args={c.args}
            position={c.position}
          />
        ))}
      </RigidBody>

      {/* Render Mid-Rise Buildings */}
      {buildingsMap.map(({ p, id }) => (
        <WorldObject
          key={id}
          name={id}
          type="building"
          position={p.position}
          rotation={[0, p.rotationY, 0]}
          scale={p.scale}
        >
          <Clone
            object={sceneByUrl.get(p.url)!}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={1}
            receiveShadow
          />
        </WorldObject>
      ))}

      {/* Render Skyscrapers */}
      {skyscrapersMap.map(({ p, id }) => (
        <WorldObject
          key={id}
          name={id}
          type="skyscraper"
          position={p.position}
          rotation={[0, p.rotationY, 0]}
          scale={p.scale}
        >
          <Clone
            object={sceneByUrl.get(p.url)!}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={1}
            receiveShadow
          />
        </WorldObject>
      ))}

      {/* Render Low Detail Outer Ring */}
      {lowDetailMap.map(({ p, id }) => (
        <WorldObject
          key={id}
          name={id}
          type="lowDetail"
          position={p.position}
          rotation={[0, p.rotationY, 0]}
          scale={p.scale}
        >
          <Clone
            object={sceneByUrl.get(p.url)!}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={1}
            receiveShadow
          />
        </WorldObject>
      ))}
    </group>
  )
}
