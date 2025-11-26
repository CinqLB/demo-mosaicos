// src/app/simulator/page.tsx
import { TilePattern, TileColor, TileSize } from "@/lib/tile-simulator/types";
import TileSimulator from "@/components/tile-simulator/TileSimulator";

const PATTERNS: TilePattern[] = [
  {
    id: "pattern-A",
    code: "A",
    name: "Mosaico A (demo)",
    previewUrl: "/patterns/10667.svg", // mismo archivo
    svgPath: "/patterns/10667.svg", // mismo archivo
  },
  {
    id: "pattern-B",
    code: "B",
    name: "Mosaico B (demo)",
    previewUrl: "/patterns/10446.svg", // mismo archivo
    svgPath: "/patterns/10446.svg", // mismo archivo
  },
];

const COLORS: TileColor[] = [
  // Blancos & Neutros
  { id: "c1", name: "Blanco puro", hex: "#ffffff" },
  { id: "c2", name: "Blanco roto", hex: "#f5f5f5" },
  { id: "c3", name: "Hueso", hex: "#e7dfcf" },
  { id: "c4", name: "Arena", hex: "#d9c7a8" },
  { id: "c5", name: "Marfil", hex: "#f0e4cc" },

  // Grises
  { id: "c6", name: "Gris claro", hex: "#d3d3d3" },
  { id: "c7", name: "Gris medio", hex: "#a0a0a0" },
  { id: "c8", name: "Gris carbón", hex: "#4a4a4a" },
  { id: "c9", name: "Antracita", hex: "#2b2b2b" },
  { id: "c10", name: "Negro intenso", hex: "#111111" },

  // Tierra / Arcilla
  { id: "c11", name: "Terracota", hex: "#c86a4a" },
  { id: "c12", name: "Barro rojo", hex: "#a64328" },
  { id: "c13", name: "Marrón oscuro", hex: "#6b3f2a" },
  { id: "c14", name: "Chocolate", hex: "#4b2e23" },

  // Verdes
  { id: "c15", name: "Verde oliva", hex: "#6b7a3a" },
  { id: "c16", name: "Verde hierba", hex: "#4d8c3c" },
  { id: "c17", name: "Verde botella", hex: "#234e52" },
  { id: "c18", name: "Verde oscuro", hex: "#0f2f23" },

  // Azules
  { id: "c19", name: "Azul cielo", hex: "#8ecae6" },
  { id: "c20", name: "Azul mediterráneo", hex: "#0077b6" },
  { id: "c21", name: "Azul cobalto", hex: "#0047ab" },
  { id: "c22", name: "Azul noche", hex: "#0a1a2f" },

  // Amarillos / Dorados
  { id: "c23", name: "Oro viejo", hex: "#bfa26f" },
  { id: "c24", name: "Mostaza", hex: "#c49b2e" },
  { id: "c25", name: "Amarillo soleado", hex: "#ffdd44" },

  // Rojos / Rosados
  { id: "c26", name: "Rojo óxido", hex: "#b03a2e" },
  { id: "c27", name: "Rojo vino", hex: "#7b1d2d" },
  { id: "c28", name: "Rosa viejo", hex: "#d8a1a1" },

  // Azules / Verdes Agua
  { id: "c29", name: "Aguamarina", hex: "#7cd4c1" },
  { id: "c30", name: "Turquesa", hex: "#3fb6a8" },
  { id: "c31", name: "Verde mar", hex: "#2a7267" },

  // Extras Premium
  { id: "c32", name: "Grafito", hex: "#3b3b3b" },
  { id: "c33", name: "Cemento", hex: "#b8b8b8" },
  { id: "c34", name: "Plomo", hex: "#878787" },
  { id: "c35", name: "Latte", hex: "#c7b199" },
  { id: "c36", name: "Cuarzo", hex: "#ebe6e0" },
];

const SIZES: TileSize[] = [
  { id: "15x15", label: "15 × 15 cm", widthCm: 15, heightCm: 15 },
  { id: "20x20", label: "20 × 20 cm", widthCm: 20, heightCm: 20 },
];

export default function SimulatorPage() {
  return <TileSimulator patterns={PATTERNS} colors={COLORS} sizes={SIZES} />;
}
