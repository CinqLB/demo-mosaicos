// src/components/tile-simulator/RoomPreview.tsx
"use client";

import { Box } from "@mui/material";
import { ROOM1_FLOOR_POLYGON } from "@/lib/room-polygons";

type Props = {
  floorTextureUrl: string | null;
};

export default function RoomPreview({ floorTextureUrl }: Props) {
  const polyCss = `polygon(${ROOM1_FLOOR_POLYGON.map(
    (p) => `${p.x}px ${p.y}px`
  ).join(", ")})`;

  return (
    <Box
      sx={{ position: "relative", width: "100%", maxWidth: 1100, mx: "auto" }}
    >
      {/* Imagen del cuarto */}
      <Box
        component="img"
        src="/rooms/room_interior.png"
        alt="Habitación"
        sx={{ width: "100%", display: "block" }}
      />

      {/* Si aún no tenemos textura, no dibujamos nada encima */}
      {floorTextureUrl && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            clipPath: polyCss,
            transform: "perspective(800px) rotateX(60deg)",
            transformOrigin: "top center",
            backgroundImage: `url(${floorTextureUrl})`,
            backgroundSize: "250px 250px", // tamaño baldosa en la foto
            backgroundRepeat: "repeat",
            opacity: 0.9,
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
}
