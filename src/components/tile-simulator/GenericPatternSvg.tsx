// src/components/tile-simulator/GenericPatternSvg.tsx
"use client";

import { Box, SxProps } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

const svgCache = new Map<string, string>();

type GenericPatternSvgProps = {
  svgPath: string;
  /** Record shapeId -> color hex */
  shapeColors: Record<string, string>;
  rotationDeg?: number;
  /** Llamado una sola vez cuando detectamos las formas */
  onShapesDetected?: (shapeIds: string[]) => void;
  /** Llamado cuando el usuario hace click en una forma */
  onShapeClick?: (shapeId: string) => void;
};

/**
 * Carga un SVG desde public, detecta <path>, <polygon>, <rect>,
 * les asegura un id y permite:
 *  - recolor por #id vía CSS
 *  - click por shape vía addEventListener
 */
export default function GenericPatternSvg({
  svgPath,
  shapeColors,
  rotationDeg = 0,
  onShapesDetected,
  onShapeClick,
}: GenericPatternSvgProps) {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [shapeIds, setShapeIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 🔹 Efecto: cargar y procesar SVG
  // IMPORTANTE: sólo depende de svgPath, NO de onShapesDetected (para evitar loop)
  useEffect(() => {
    let isMounted = true;

    const loadSvg = async () => {
      if (svgCache.has(svgPath)) {
        const cached = svgCache.get(svgPath) || null;
        if (!cached || !isMounted) return;
        processSvg(cached);
        return;
      }

      const res = await fetch(svgPath);
      const text = await res.text();
      svgCache.set(svgPath, text);
      if (!isMounted) return;
      processSvg(text);
    };

    const processSvg = (original: string) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(original, "image/svg+xml");
        const svgEl = doc.documentElement;

        const shapes = svgEl.querySelectorAll("path, polygon, rect");

        const ids: string[] = [];
        shapes.forEach((el, index) => {
          let id = el.getAttribute("id");
          if (!id || id.trim() === "") {
            id = `auto-shape-${index}`;
            el.setAttribute("id", id);
          }
          ids.push(id);
        });

        const serialized = new XMLSerializer().serializeToString(doc);

        setShapeIds(ids);
        setSvgMarkup(serialized);
        // 🔸 Llamamos al callback, pero NO está en deps del effect
        if (onShapesDetected) {
          onShapesDetected(ids);
        }
      } catch (err) {
        console.error("Error parsing SVG:", err);
        setSvgMarkup(original);
      }
    };

    loadSvg();

    return () => {
      isMounted = false;
    };
  }, [svgPath]); // <- sólo svgPath

  // 🎨 Reglas dinámicas de fill por shapeId
  const dynamicSx = useMemo(() => {
    const sxRules: Record<string, SxProps> = {};

    shapeIds.forEach((id) => {
      const color = shapeColors[id];
      if (!color && !onShapeClick) return;

      sxRules[`& svg #${id}`] = {
        ...(color ? { fill: color } : {}),
        cursor: onShapeClick ? "pointer" : "default",
      };
    });

    return sxRules;
  }, [shapeIds, shapeColors, onShapeClick]);

  // 🖱️ Manejar clicks en las formas
  useEffect(() => {
    if (!containerRef.current || !svgMarkup || !onShapeClick) return;

    const root = containerRef.current;

    // Esperamos al siguiente frame por si React aún está pintando
    const timeout = setTimeout(() => {
      const shapes = root.querySelectorAll<SVGGraphicsElement>(
        "svg path, svg polygon, svg rect"
      );

      const listeners: Array<{
        el: SVGGraphicsElement;
        handler: (e: Event) => void;
      }> = [];

      shapes.forEach((el) => {
        const id = el.getAttribute("id");
        if (!id) return;

        const handler = (e: Event) => {
          e.stopPropagation();
          onShapeClick(id);
        };

        el.addEventListener("click", handler);
        listeners.push({ el, handler });
      });

      // Cleanup
      return () => {
        listeners.forEach(({ el, handler }) => {
          try {
            el.removeEventListener("click", handler);
          } catch {
            // En algunos entornos/Extensiones puede lanzar warnings, los ignoramos
          }
        });
      };
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [svgMarkup, onShapeClick]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        height: "100%",
        transform: `rotate(${rotationDeg}deg)`,
        transformOrigin: "center center",
        transition: "transform 0.2s ease",
        "& svg": {
          width: "100%",
          height: "100%",
          display: "block",
        },
        ...dynamicSx,
      }}
      dangerouslySetInnerHTML={svgMarkup ? { __html: svgMarkup } : undefined}
    />
  );
}
