/**
 * Computes the procedural height of the terrain at any X/Z coordinate.
 *
 * Central city zone (radius < 95) is flat at Y = 0.
 * Beyond radius 95, rolling hills are generated using sine/cosine combinations.
 */
export function getTerrainHeight(x: number, z: number): number {
  const rSq = x * x + z * z
  const r = Math.sqrt(rSq)
  
  if (r < 95) return 0 // central city is completely flat
  
  const t = Math.min(1.0, (r - 95) / 100)
  
  // Rolling hills formula
  const hills = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 8 + Math.sin(x * 0.05) * 2.5
  return hills * t
}
