// src/components/tile-simulator/KitchenFloorPreviewFabric.tsx
"use client";

import { Box, Button } from "@mui/material";
import { useEffect, useRef } from "react";

type Props = {
  floorTextureUrl: string | null; // PNG generado del mosaico (dataURL)
};

// Utilidades de perspectiva ------------------------------

type Point = { x: number; y: number };
type Quad = { p1: Point; p2: Point; p3: Point; p4: Point };

function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function rotatePoint(
  p: Point,
  cx: number,
  cy: number,
  angleDeg: number
): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = p.x - cx;
  const dy = p.y - cy;

  // Rotación horaria (clockwise)
  return {
    x: cx + dx * cos + dy * sin,
    y: cy - dx * sin + dy * cos,
  };
}

/**
 * Dibuja srcCanvas deformado en perspectiva sobre destCtx
 * usando un quad (p1=izq/arriba, p2=der/arriba, p3=der/abajo, p4=izq/abajo).
 * Implementado por “rebanadas” horizontales (aprox, pero se ve muy bien).
 */
function drawCanvasWithPerspective(
  srcCanvas: HTMLCanvasElement,
  destCtx: CanvasRenderingContext2D,
  quad: Quad,
  steps = 250
) {
  const sw = srcCanvas.width;
  const sh = srcCanvas.height;

  destCtx.save();

  // Clip general al cuadrilátero del piso
  destCtx.beginPath();
  destCtx.moveTo(quad.p1.x, quad.p1.y);
  destCtx.lineTo(quad.p2.x, quad.p2.y);
  destCtx.lineTo(quad.p3.x, quad.p3.y);
  destCtx.lineTo(quad.p4.x, quad.p4.y);
  destCtx.closePath();
  destCtx.clip();

  const stripSrcHeight = sh / steps;

  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;

    const sy = stripSrcHeight * i;

    const ptl = lerp(quad.p1, quad.p4, t0); // top-left destino
    const ptr = lerp(quad.p2, quad.p3, t0); // top-right destino
    const pbl = lerp(quad.p1, quad.p4, t1); // bottom-left destino
    // bottom-right se aproxima implícitamente

    const dxTop = (ptr.x - ptl.x) / sw;
    const dyTop = (ptr.y - ptl.y) / sw;

    const dxLeft = (pbl.x - ptl.x) / stripSrcHeight;
    const dyLeft = (pbl.y - ptl.y) / stripSrcHeight;

    destCtx.save();
    destCtx.setTransform(dxTop, dyTop, dxLeft, dyLeft, ptl.x, ptl.y);

    destCtx.drawImage(
      srcCanvas,
      0,
      sy,
      sw,
      stripSrcHeight,
      0,
      0,
      sw,
      stripSrcHeight
    );

    destCtx.restore();
  }

  destCtx.restore();
}

// --------------------------------------------------------

export default function KitchenFloorPreviewFabric({ floorTextureUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !floorTextureUrl) return;

    let disposed = false;
    let fabricCanvas: any = null;

    (async () => {
      const fabricModule = await import("fabric");
      const fabric: any = (fabricModule as any).fabric ?? fabricModule;

      if (!canvasRef.current || disposed) return;

      // Helper para cargar imágenes
      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          fabric.util.loadImage(
            src,
            (img: HTMLImageElement | null) => {
              if (img) resolve(img);
              else reject(new Error(`No se pudo cargar: ${src}`));
            },
            { crossOrigin: "anonymous" }
          );
        });

      // 1) Cargar base y máscara
      const [baseImgEl, maskImgEl] = await Promise.all([
        loadImage("/rooms/kitchen_base.png"),
        loadImage("/rooms/kitchen_floor_mask.png"),
      ]);
      if (disposed) return;

      const width = baseImgEl.width;
      const height = baseImgEl.height;

      // 2) Generar cocina SIN piso usando la máscara
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const offCtx = off.getContext("2d");
      if (!offCtx) return;

      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = width;
      baseCanvas.height = height;
      const baseCtx = baseCanvas.getContext("2d")!;
      baseCtx.drawImage(baseImgEl, 0, 0, width, height);
      const baseData = baseCtx.getImageData(0, 0, width, height);

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext("2d")!;
      maskCtx.drawImage(maskImgEl, 0, 0, width, height);
      const maskData = maskCtx.getImageData(0, 0, width, height);

      const basePixels = baseData.data;
      const maskPixels = maskData.data;

      const floorThreshold = 40; // ajusta si hace falta

      for (let i = 0; i < basePixels.length; i += 4) {
        const mr = maskPixels[i];
        const mg = maskPixels[i + 1];
        const mb = maskPixels[i + 2];
        const brightness = (mr + mg + mb) / 3;
        if (brightness > floorThreshold) {
          // zona de piso -> transparentar
          basePixels[i + 3] = 0;
        }
      }

      offCtx.putImageData(baseData, 0, 0);
      const kitchenTopUrl = off.toDataURL("image/png");

      if (disposed) return;

      // 3) Crear canvas Fabric sobre nuestro <canvas>
      fabricCanvas = new fabric.Canvas(canvasRef.current!, {
        selection: false,
      });
      fabricCanvas.setWidth(width);
      fabricCanvas.setHeight(height);

      // 4) Cargar textura del mosaico (tile)
      const tileImgEl: HTMLImageElement = await new Promise((resolve) => {
        fabric.util.loadImage(floorTextureUrl, (img: HTMLImageElement) =>
          resolve(img)
        );
      });
      if (disposed) return;

      // 5) Crear un canvas grande con el patrón repetido
      const patternCanvas = document.createElement("canvas");
      patternCanvas.width = width * 2;
      patternCanvas.height = height * 2;
      const pctx = patternCanvas.getContext("2d");
      if (!pctx) return;

      const pattern = pctx.createPattern(tileImgEl, "repeat");
      if (!pattern) return;

      // Escala del tile (más pequeño = más “tileado”)
      const tileScale = 0.4; // ajusta a tu gusto (0.5, 0.8, etc.)

      pctx.save();
      pctx.scale(tileScale, tileScale);
      pctx.fillStyle = pattern;
      // compensar la escala al rellenar
      pctx.fillRect(
        0,
        0,
        patternCanvas.width / tileScale,
        patternCanvas.height / tileScale
      );
      pctx.restore();

      // 6) Canvas final del piso con perspectiva
      const floorCanvas = document.createElement("canvas");
      floorCanvas.width = width;
      floorCanvas.height = height;
      const floorCtx = floorCanvas.getContext("2d");
      if (!floorCtx) return;

      // Definir el cuadrilátero del piso en la imagen final
      // Ajusta estos puntos para que coincidan EXACTAMENTE con tu render

      // Quad base SIN rotación, muy generoso
      const baseQuad: Quad = {
        p1: { x: -width * 0.4, y: -height * 0.1 }, // arriba izquierda (fuera del canvas)
        p2: { x: width * 1.3, y: height * 0.05 }, // arriba derecha (un poco fuera)
        p3: { x: width * 1.5, y: height * 1.2 }, // abajo derecha (más abajo => cerca)
        p4: { x: -width * 0.6, y: height * 1.25 }, // abajo izquierda (algo fuera)
      };

      const cx = width / 2;
      const cy = height / 2;
      const angleDeg = -40; // giro horario

      const quad: Quad = {
        p1: rotatePoint(baseQuad.p1, cx, cy, angleDeg),
        p2: rotatePoint(baseQuad.p2, cx, cy, angleDeg),
        p3: rotatePoint(baseQuad.p3, cx, cy, angleDeg),
        p4: rotatePoint(baseQuad.p4, cx, cy, angleDeg),
      };

      // Pintar patrón con perspectiva en floorCanvas
      drawCanvasWithPerspective(patternCanvas, floorCtx, quad, 250);

      // 7) Crear imagen Fabric del piso
      const floorImg = new fabric.Image(floorCanvas, {
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });

      fabricCanvas.add(floorImg);

      // 8) Cargar y poner la cocina SIN piso encima
      const kitchenTopImg: any = await new Promise((resolve) => {
        fabric.Image.fromURL(kitchenTopUrl, (img: any) => resolve(img), {
          crossOrigin: "anonymous",
        });
      });
      if (disposed) return;

      kitchenTopImg.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });

      fabricCanvas.add(kitchenTopImg);
      kitchenTopImg.bringToFront();

      fabricCanvas.renderAll();
    })();

    return () => {
      disposed = true;
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
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
