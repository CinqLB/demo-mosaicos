// src/components/tile-simulator/KitchenFloorPreview.tsx
"use client";

import { Box, Button } from "@mui/material";
import { useEffect, useRef } from "react";

type Props = {
  floorTextureUrl: string | null; // PNG generado del mosaico (dataURL)
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    if (!src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.error("Error cargando imagen", src, e);
      reject(new Error(`No se pudo cargar la imagen: ${src}`));
    };

    img.src = src;
  });
}

export default function KitchenFloorPreview({ floorTextureUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !floorTextureUrl) return;

    let cancelled = false;

    const render = async () => {
      try {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 1. Imagen de la cocina
        const roomImg = await loadImage("/rooms/kitchen_base.png");
        if (cancelled) return;

        canvas.width = roomImg.width;
        canvas.height = roomImg.height;

        // 2. Textura del mosaico
        const tileImg = await loadImage(floorTextureUrl);
        if (cancelled) return;

        const pattern = ctx.createPattern(tileImg, "repeat");
        if (!pattern) {
          console.error("No se pudo crear pattern para el mosaico");
          return;
        }

        // 3. Pintar mosaico con "perspectiva"
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // guardamos estado normal
        ctx.save();

        // 🔥 Ajusta estos valores para controlar el ángulo
        const scaleY = 1; // aplasta verticalmente (más pequeño = más profundidad)
        const shearX = 0.4; // inclina las líneas horizontales

        // Movemos el origen hacia abajo para que el piso "salga" desde la parte baja
        ctx.translate(0, canvas.height * 0);

        // setTransform(a, b, c, d, e, f):
        // | a c e |
        // | b d f |
        // | 0 0 1 |
        ctx.transform(1, 0, shearX, scaleY, 0, 0);

        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width * 2, canvas.height); // un poco más ancho por el shear

        // restauramos matriz para dibujar la cocina sin deformarla
        ctx.restore();

        // 4. Dibujar cocina en offscreen y hacer chroma key al negro
        const off = document.createElement("canvas");
        off.width = roomImg.width;
        off.height = roomImg.height;
        const offCtx = off.getContext("2d");
        if (!offCtx) return;

        offCtx.drawImage(roomImg, 0, 0, off.width, off.height);

        let imageData: ImageData;
        try {
          imageData = offCtx.getImageData(0, 0, off.width, off.height);
        } catch (e) {
          console.error("Error leyendo pixels del canvas (¿CORS?)", e);
          ctx.drawImage(roomImg, 0, 0, canvas.width, canvas.height);
          return;
        }

        const data = imageData.data;
        const threshold = 25;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (r < threshold && g < threshold && b < threshold) {
            data[i + 3] = 0;
          }
        }

        offCtx.putImageData(imageData, 0, 0);

        // 5. Cocina encima (ya con el piso transparente)
        ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        console.error("Error renderizando cocina", err);
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [floorTextureUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kitchen-floor-preview.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1366,
        mx: "auto",
      }}
    >
      <Box
        component="canvas"
        ref={canvasRef}
        sx={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: 2,
          boxShadow: (theme) => theme.shadows[3],
        }}
      />
      <Box sx={{ mt: 1, textAlign: "right" }}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleDownload}
          disabled={!floorTextureUrl}
        >
          Descargar imagen
        </Button>
      </Box>
    </Box>
  );
}
