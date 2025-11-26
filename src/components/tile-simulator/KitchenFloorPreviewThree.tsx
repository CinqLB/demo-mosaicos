"use client";

import { Box, Button, Slider, Typography } from "@mui/material";
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

const BASE_IMAGE_SRC = "/rooms/kitchen_base.png";
const CANVAS_WIDTH = 1366;
const CANVAS_HEIGHT = 768;

// intensidades base de luces
const AMBIENT_BASE = 0.4;
const HEMI_BASE = 0.7;
const DIR_BASE = 1.4;

export default function KitchenFloorPreviewThree({ patternUrl }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [kitchenTopUrl, setKitchenTopUrl] = useState<string | null>(null);
  const floorRenderUrlRef = useRef<string | null>(null);

  // THREE refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientRef = useRef<THREE.AmbientLight | null>(null);
  const hemiRef = useRef<THREE.HemisphereLight | null>(null);

  // =======================
  //   DEFAULTS ACTUALES
  // =======================
  const [camX, setCamX] = useState(123);
  const [camY, setCamY] = useState(437);
  const [camZ, setCamZ] = useState(379);

  const [floorRotXDeg, setFloorRotXDeg] = useState(-91);
  const [floorRotYDeg, setFloorRotYDeg] = useState(-3);
  const [floorRotZDeg, setFloorRotZDeg] = useState(-27);

  const [tileScale, setTileScale] = useState(0.09);

  const [floorPosX, setFloorPosX] = useState(40);
  const [floorPosY, setFloorPosY] = useState(0);
  const [floorPosZ, setFloorPosZ] = useState(126);

  const [noReflections, setNoReflections] = useState(false);

  // sliders de luz / color
  const [exposure, setExposure] = useState(1.2);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [gamma, setGamma] = useState(1);

  const [showSliders, setShowSliders] = useState(false);

  // ========= helper para responsividad =========
  const resizeRenderer = () => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const container = containerRef.current;

    if (!renderer || !camera || !scene || !container) return;

    const width = container.clientWidth;
    const height = (width * CANVAS_HEIGHT) / CANVAS_WIDTH; // mantener 16:9

    renderer.setSize(width, height, false);
    renderer.domElement.width = width;
    renderer.domElement.height = height;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    floorRenderUrlRef.current = renderer.domElement.toDataURL("image/png");
  };

  // ======================
  //   LOAD BASE IMAGE
  // ======================
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const img = await loadImage(BASE_IMAGE_SRC);
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext("2d")!;

      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const data = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const px = data.data;

      // transparentar piso negro original
      for (let i = 0; i < px.length; i += 4) {
        const br = (px[i] + px[i + 1] + px[i + 2]) / 3;
        if (br < 10) px[i + 3] = 0;
      }

      ctx.putImageData(data, 0, 0);
      setKitchenTopUrl(canvas.toDataURL());
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ======================
  //   INIT THREE
  // ======================
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas || !patternUrl) return;

    let disposed = false;

    // limpiar escena previa
    if (floorMeshRef.current) {
      const mat = floorMeshRef.current.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();

      floorMeshRef.current.geometry.dispose();
      floorMeshRef.current = null;
    }

    if (textureRef.current) {
      textureRef.current.dispose();
      textureRef.current = null;
    }

    if (sceneRef.current) sceneRef.current.clear();

    // renderer
    let renderer = rendererRef.current;

    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });

      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setClearColor(0xffffff, 1);

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = exposure * gamma;

      rendererRef.current = renderer;
    } else {
      renderer.setClearColor(0xffffff, 1);
      renderer.toneMappingExposure = exposure * gamma;
    }

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      CANVAS_WIDTH / CANVAS_HEIGHT,
      0.1,
      2000
    );
    cameraRef.current = camera;

    // luces
    const ambient = new THREE.AmbientLight(0xffffff, AMBIENT_BASE * brightness);
    ambientRef.current = ambient;
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(
      0xffffff,
      0x444444,
      HEMI_BASE * brightness
    );
    hemi.position.set(0, 200, 0);
    hemiRef.current = hemi;
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(
      0xffffff,
      noReflections ? 0 : DIR_BASE * brightness * contrast
    );
    dir.position.set(300, 600, 300);
    dirLightRef.current = dir;
    scene.add(dir);

    // textura
    const loader = new THREE.TextureLoader();
    loader.load(
      patternUrl,
      (texture) => {
        if (disposed) return;

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1 / tileScale, 1 / tileScale);
        texture.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = texture;

        const geom = new THREE.PlaneGeometry(1800, 1100);

        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
          roughness: noReflections ? 1 : 0.35,
          metalness: noReflections ? 0 : 0.05,
        });

        const mesh = new THREE.Mesh(geom, mat);
        floorMeshRef.current = mesh;
        scene.add(mesh);

        // cámara + piso con defaults
        camera.position.set(camX, camY, camZ);
        camera.lookAt(0, 0, 0);

        mesh.rotation.x = THREE.MathUtils.degToRad(floorRotXDeg);
        mesh.rotation.y = THREE.MathUtils.degToRad(floorRotYDeg);
        mesh.rotation.z = THREE.MathUtils.degToRad(floorRotZDeg);
        mesh.position.set(floorPosX, floorPosY, floorPosZ);

        // tamaño inicial del renderer según contenedor
        resizeRenderer();
      },
      undefined,
      () => {}
    );

    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternUrl, noReflections, brightness, contrast, exposure, gamma]);

  // ======================
  //   RERENDER ON CHANGE
  // ======================
  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const floor = floorMeshRef.current;
    const tex = textureRef.current;
    const dir = dirLightRef.current;
    const ambient = ambientRef.current;
    const hemi = hemiRef.current;

    if (!renderer || !scene || !camera || !floor) return;

    // cámara
    camera.position.set(camX, camY, camZ);
    camera.lookAt(0, 0, 0);

    // piso
    floor.rotation.x = THREE.MathUtils.degToRad(floorRotXDeg);
    floor.rotation.y = THREE.MathUtils.degToRad(floorRotYDeg);
    floor.rotation.z = THREE.MathUtils.degToRad(floorRotZDeg);
    floor.position.set(floorPosX, floorPosY, floorPosZ);

    // textura
    if (tex) {
      tex.repeat.set(1 / tileScale, 1 / tileScale);
      tex.needsUpdate = true;
    }

    // material
    const mat = floor.material as THREE.MeshStandardMaterial;
    mat.roughness = noReflections ? 1 : 0.35;
    mat.metalness = noReflections ? 0 : 0.05;
    mat.color.setScalar(saturation);
    mat.needsUpdate = true;

    // luces
    if (ambient) ambient.intensity = AMBIENT_BASE * brightness;
    if (hemi) hemi.intensity = HEMI_BASE * brightness;
    if (dir) {
      dir.intensity = noReflections ? 0 : DIR_BASE * brightness * contrast;
    }

    renderer.toneMappingExposure = exposure * gamma;

    resizeRenderer();
  }, [
    camX,
    camY,
    camZ,
    floorRotXDeg,
    floorRotYDeg,
    floorRotZDeg,
    floorPosX,
    floorPosY,
    floorPosZ,
    tileScale,
    noReflections,
    brightness,
    contrast,
    saturation,
    exposure,
    gamma,
  ]);

  // ======================
  //   HANDLE WINDOW RESIZE
  // ======================
  useEffect(() => {
    const onResize = () => {
      resizeRenderer();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======================
  //   DOWNLOAD IMAGE
  // ======================
  const handleDownload = async () => {
    if (!floorRenderUrlRef.current || !kitchenTopUrl) return;

    const [floorImg, topImg] = await Promise.all([
      loadImage(floorRenderUrlRef.current),
      loadImage(kitchenTopUrl),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(floorImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(topImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    canvas.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simulador-suelo.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <Box sx={{ width: "100%", maxWidth: CANVAS_WIDTH, mx: "auto" }}>
      {/* CONTENEDOR RESPONSIVO: mantiene aspect ratio 16:9 */}
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`,
        }}
      >
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

        {kitchenTopUrl && (
          <Box
            component="img"
            src={kitchenTopUrl}
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

      {/* === CONTROLES === */}
      {/* === CONTROLES === */}
      <Box sx={{ mt: 2 }}>
        {/* Botones principales */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" size="small" onClick={handleDownload}>
            Descargar imagen
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => setNoReflections((v) => !v)}
          >
            {noReflections ? "Activar reflejos" : "Quitar reflejos"}
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={() => setShowSliders((v) => !v)}
          >
            {showSliders ? "Ocultar ajustes" : "Mostrar ajustes"}
          </Button>
        </Box>

        {/* =============================== */}
        {/*        BLOQUE COLAPSABLE        */}
        {/* =============================== */}
        {showSliders && (
          <Box
            sx={{
              mt: 3,
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            {/* ======= COLUMNA 1 ======= */}
            <Box sx={{ width: { xs: "100%", sm: "48%", md: "32%" } }}>
              <Typography variant="subtitle2">Cámara</Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">camX ({camX})</Typography>
                <Slider
                  min={-400}
                  max={400}
                  value={camX}
                  onChange={(_, v) => setCamX(v as number)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">camY ({camY})</Typography>
                <Slider
                  min={100}
                  max={700}
                  value={camY}
                  onChange={(_, v) => setCamY(v as number)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">camZ ({camZ})</Typography>
                <Slider
                  min={200}
                  max={800}
                  value={camZ}
                  onChange={(_, v) => setCamZ(v as number)}
                />
              </Box>
            </Box>

            {/* ======= COLUMNA 2 ======= */}
            <Box sx={{ width: { xs: "100%", sm: "48%", md: "32%" } }}>
              <Typography variant="subtitle2">Piso – Rotación</Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">rotX ({floorRotXDeg})</Typography>
                <Slider
                  min={-120}
                  max={0}
                  value={floorRotXDeg}
                  onChange={(_, v) => setFloorRotXDeg(v as number)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">rotY ({floorRotYDeg})</Typography>
                <Slider
                  min={-80}
                  max={80}
                  value={floorRotYDeg}
                  onChange={(_, v) => setFloorRotYDeg(v as number)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">rotZ ({floorRotZDeg})</Typography>
                <Slider
                  min={-180}
                  max={180}
                  value={floorRotZDeg}
                  onChange={(_, v) => setFloorRotZDeg(v as number)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  tileScale ({tileScale})
                </Typography>
                <Slider
                  min={0.05}
                  max={0.4}
                  step={0.01}
                  value={tileScale}
                  onChange={(_, v) => setTileScale(v as number)}
                />
              </Box>
              <Typography variant="subtitle2">Piso – Posición</Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  floorPosX ({floorPosX})
                </Typography>
                <Slider
                  min={-200}
                  max={200}
                  value={floorPosX}
                  onChange={(_, v) => setFloorPosX(v as number)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  floorPosY ({floorPosY})
                </Typography>
                <Slider
                  min={-200}
                  max={200}
                  value={floorPosY}
                  onChange={(_, v) => setFloorPosY(v as number)}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  floorPosZ ({floorPosZ})
                </Typography>
                <Slider
                  min={0}
                  max={300}
                  value={floorPosZ}
                  onChange={(_, v) => setFloorPosZ(v as number)}
                />
              </Box>
            </Box>

            {/* ======= COLUMNA 3 ======= */}
            <Box sx={{ width: { xs: "100%", sm: "48%", md: "32%" } }}>
              <Typography variant="subtitle2">Luz / Color</Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  exposición ({exposure.toFixed(2)})
                </Typography>
                <Slider
                  min={0.4}
                  max={2.5}
                  step={0.01}
                  value={exposure}
                  onChange={(_, v) => setExposure(v as number)}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  brillo ({brightness.toFixed(2)})
                </Typography>
                <Slider
                  min={0}
                  max={2}
                  step={0.01}
                  value={brightness}
                  onChange={(_, v) => setBrightness(v as number)}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  contraste ({contrast.toFixed(2)})
                </Typography>
                <Slider
                  min={0}
                  max={2}
                  step={0.01}
                  value={contrast}
                  onChange={(_, v) => setContrast(v as number)}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  saturación ({saturation.toFixed(2)})
                </Typography>
                <Slider
                  min={0}
                  max={2}
                  step={0.01}
                  value={saturation}
                  onChange={(_, v) => setSaturation(v as number)}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">
                  gamma ({gamma.toFixed(2)})
                </Typography>
                <Slider
                  min={0.5}
                  max={2}
                  step={0.01}
                  value={gamma}
                  onChange={(_, v) => setGamma(v as number)}
                />
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
