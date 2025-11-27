// src/components/tile-simulator/LivingRoomFloorPreviewThree.tsx
"use client";

import { Box, Button } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Props = {
  patternUrl: string | null;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Rutas de las imágenes
const BASE_IMAGE_SRC = "/rooms/living_base.png";
const MASK_IMAGE_SRC = "/rooms/living_mask.png";
// <<<--- PON AQUÍ LA RUTA DE TU IMAGEN DE SOMBRAS (blanco + grises)
const SHADOWS_IMAGE_SRC = "/rooms/living_shadow.png";
const SHADOW_INTENSITY = 1; // 0 = sin sombras, 1 = sombras completas

// Tamaño original del render
const CANVAS_WIDTH = 1366;
const CANVAS_HEIGHT = 768;

// Exposición fija
const TONE_EXPOSURE = 1.1;

// Dimensiones del plano del piso (en unidades de mundo)
const FLOOR_WIDTH = 2200;
const FLOOR_HEIGHT = 830;

// Tamaño de una baldosa en unidades de mundo (mismo en X y Z => cuadrados)
const TILE_WORLD_SIZE = 200;

// Altura "mundo" que cubre la cámara ortográfica (antes de aplicar zoom)
const ORTHO_VIEW_HEIGHT = 1400;

// === parámetros finales de cámara/piso (sin sliders) ===
const CAM_X = 0;
const CAM_Z = 200;
const CAM_ZOOM = 2.4;
const FLOOR_POS_X = 0;
const FLOOR_POS_Z = 100;

export default function LivingRoomFloorPreviewThree({ patternUrl }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [roomTopUrl, setRoomTopUrl] = useState<string | null>(null);
  const floorRenderUrlRef = useRef<string | null>(null);

  // THREE refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  // ======================
  //   CARGAR BASE + MÁSCARA (recortar MAGENTA encogido 1px)
  // ======================
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [baseImg, maskImg] = await Promise.all([
          loadImage(BASE_IMAGE_SRC),
          loadImage(MASK_IMAGE_SRC),
        ]);
        if (cancelled) return;

        const w = CANVAS_WIDTH;
        const h = CANVAS_HEIGHT;

        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = w;
        baseCanvas.height = h;
        const baseCtx = baseCanvas.getContext("2d");
        if (!baseCtx) return;

        baseCtx.drawImage(baseImg, 0, 0, w, h);
        const baseData = baseCtx.getImageData(0, 0, w, h);
        const bd = baseData.data;

        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = w;
        maskCanvas.height = h;
        const maskCtx = maskCanvas.getContext("2d");
        if (!maskCtx) return;

        maskCtx.drawImage(maskImg, 0, 0, w, h);
        const maskData = maskCtx.getImageData(0, 0, w, h);
        const md = maskData.data;

        // 1) mapa booleano de magenta casi puro
        const floorMask = new Uint8Array(w * h);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const mr = md[idx];
            const mg = md[idx + 1];
            const mb = md[idx + 2];

            const isMagenta = mr > 240 && mb > 240 && mg < 10;
            floorMask[y * w + x] = isMagenta ? 1 : 0;
          }
        }

        // 2) encoger 1px: solo queda piso si todo el vecindario 3x3 es magenta
        const shrinkMask = new Uint8Array(w * h);

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            let allNeighbors = true;
            for (let oy = -1; oy <= 1 && allNeighbors; oy++) {
              for (let ox = -1; ox <= 1; ox++) {
                if (floorMask[(y + oy) * w + (x + ox)] === 0) {
                  allNeighbors = false;
                  break;
                }
              }
            }
            shrinkMask[y * w + x] = allNeighbors ? 1 : 0;
          }
        }

        // 3) Aplicar máscara encogida a la base como alpha
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const isFloor = shrinkMask[y * w + x] === 1;
            if (isFloor) {
              bd[idx + 3] = 0; // piso → transparente
            }
          }
        }

        baseCtx.putImageData(baseData, 0, 0);
        const url = baseCanvas.toDataURL("image/png");
        setRoomTopUrl(url);
      } catch (err) {
        console.error("Error procesando base + máscara de sala:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ========= helper para responsividad =========
  const renderScene = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const floor = floorMeshRef.current;
    const container = containerRef.current;

    if (!renderer || !scene || !camera || !floor || !container) return;

    const width = container.clientWidth;
    const height = (width * CANVAS_HEIGHT) / CANVAS_WIDTH;
    const aspect = width / height;

    renderer.setSize(width, height, false);
    renderer.domElement.width = width;
    renderer.domElement.height = height;

    // actualizar frustum ortográfico según el aspect
    const viewHeight = ORTHO_VIEW_HEIGHT;
    const viewWidth = viewHeight * aspect;

    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    floorRenderUrlRef.current = renderer.domElement.toDataURL("image/png");
  };

  // ======================
  //   INIT THREE (una vez)
  // ======================
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0xffffff, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = TONE_EXPOSURE;
    rendererRef.current = renderer;

    const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    const viewHeight = ORTHO_VIEW_HEIGHT;
    const viewWidth = viewHeight * aspect;

    // Cámara ORTOGRÁFICA top-down, con los valores finales
    const camera = new THREE.OrthographicCamera(
      -viewWidth / 2,
      viewWidth / 2,
      viewHeight / 2,
      -viewHeight / 2,
      0.1,
      3000
    );
    camera.position.set(CAM_X, 1000, CAM_Z);
    camera.lookAt(CAM_X, 0, CAM_Z);
    camera.up.set(0, 0, -1);
    camera.zoom = CAM_ZOOM;
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Luces fijas
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    hemi.position.set(0, 400, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(300, 800, 300);
    scene.add(dir);

    renderScene();

    const onResize = () => {
      renderScene();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);

      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (floorMeshRef.current) {
        const geom = floorMeshRef.current.geometry;
        const mat = floorMeshRef.current.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
        geom.dispose();
        floorMeshRef.current = null;
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======================
  //   CARGAR TEXTURA DEL PISO
  // ======================
  useEffect(() => {
    if (!patternUrl) return;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!renderer || !scene) return;

    // limpiar piso anterior
    if (floorMeshRef.current) {
      scene.remove(floorMeshRef.current);
      const geom = floorMeshRef.current.geometry;
      const mat = floorMeshRef.current.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
      geom.dispose();
      floorMeshRef.current = null;
    }
    if (textureRef.current) {
      textureRef.current.dispose();
      textureRef.current = null;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      patternUrl,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        // === Repeticiones calculadas para que las baldosas sean cuadradas en mundo ===
        const repeatsX = FLOOR_WIDTH / TILE_WORLD_SIZE;
        const repeatsY = FLOOR_HEIGHT / TILE_WORLD_SIZE;
        texture.repeat.set(repeatsX, repeatsY);

        textureRef.current = texture;

        const geom = new THREE.PlaneGeometry(FLOOR_WIDTH, FLOOR_HEIGHT);

        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
          roughness: 0.4,
          metalness: 0.05,
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = THREE.MathUtils.degToRad(-90);
        mesh.position.set(FLOOR_POS_X, 0, FLOOR_POS_Z);

        floorMeshRef.current = mesh;
        scene.add(mesh);

        renderScene();
      },
      undefined,
      (err) => {
        console.error("Error cargando textura del piso:", err);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternUrl]);

  const handleDownload = async () => {
    if (!floorRenderUrlRef.current || !roomTopUrl) return;

    const [floorImg, shadowsImg, topImg] = await Promise.all([
      loadImage(floorRenderUrlRef.current),
      loadImage(SHADOWS_IMAGE_SRC),
      loadImage(roomTopUrl),
    ]);

    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1) piso (mosaico)
    ctx.drawImage(floorImg, 0, 0, w, h);

    // 2) sombras en blanco+gris con intensidad variable
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = SHADOW_INTENSITY; // <<<---
    ctx.drawImage(shadowsImg, 0, 0, w, h);
    ctx.globalAlpha = 1; // reset

    // 3) capa superior (muebles, etc.)
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(topImg, 0, 0, w, h);

    canvas.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simulador-sala.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <Box sx={{ width: "100%", maxWidth: CANVAS_WIDTH, mx: "auto" }}>
      {/* VIEWPORT */}
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`,
        }}
      >
        {/* Piso 3D */}
        <canvas
          ref={threeCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />

        {/* Sombras en tiempo real (misma imagen blanco+gris) */}
        <Box
          component="img"
          src={SHADOWS_IMAGE_SRC}
          alt="Sombras"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            pointerEvents: "none",
            mixBlendMode: "multiply",
            opacity: SHADOW_INTENSITY,
          }}
        />

        {/* Sala sin piso (base con máscara) */}
        {roomTopUrl && (
          <Box
            component="img"
            src={roomTopUrl}
            alt="Sala sin piso"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "fill",
              pointerEvents: "none",
            }}
          />
        )}
      </Box>

      <Box sx={{ mt: 2, textAlign: "left" }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleDownload}
          disabled={!patternUrl}
        >
          Descargar imagen
        </Button>
      </Box>
    </Box>
  );
}
