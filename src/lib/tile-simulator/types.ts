export type PatternZone = {
    id: string // "zone-1", "zone-2", "borde", etc.
    label: string // Texto para la UI: "Fondo", "Borde", etc.
  }
  
  export type TilePattern = {
    id: string
    code: string
    name: string
    previewUrl: string      // thumb
    svgPath?: string        // SVG con zonas, ej: "/patterns/pattern-n.svg"
    zones?: PatternZone[]   // listado de zonas coloreables
  }
  
  export type TileColor = {
    id: string
    name: string
    hex: string
  }
  
  export type TileSize = {
    id: string
    label: string
    widthCm: number
    heightCm: number
  }
  
  export type ViewMode = 'four-tiles' | 'one-tile'
  