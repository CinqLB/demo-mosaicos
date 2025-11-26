// src/components/tile-simulator/TileSimulator.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import GridViewIcon from "@mui/icons-material/GridView";
import CropSquareIcon from "@mui/icons-material/CropSquare";

import {
  TilePattern,
  TileColor,
  TileSize,
  ViewMode,
} from "@/lib/tile-simulator/types";
import GenericPatternSvg from "./GenericPatternSvg";
import { exportMosaicToImage } from "@/lib/exportMosaicToImage";
import KitchenFloorPreviewThree from "./KitchenFloorPreviewThree";

type Props = {
  patterns: TilePattern[];
  colors: TileColor[];
  sizes: TileSize[];
};

const BASE_PRICE_PER_M2 = 55; // demo

export default function TileSimulator({ patterns, colors, sizes }: Props) {
  // Patrón, tamaño, vista, rotación, área
  const [selectedPatternId, setSelectedPatternId] = useState<string>(
    patterns[0]?.id
  );
  const [selectedSizeId, setSelectedSizeId] = useState<string>(sizes[0]?.id);
  const [viewMode, setViewMode] = useState<ViewMode>("one-tile");
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<number>(4.8);
  const [previewMode, setPreviewMode] = useState<"mosaic" | "kitchen">(
    "mosaic"
  );

  // mosaico para la UI + para exportar textura (siempre será 4x4 internamente)
  const mosaicRef = useRef<HTMLDivElement | null>(null);

  // URL de la textura del piso (PNG generado desde el mosaico 4x4)
  const [floorTextureUrl, setFloorTextureUrl] = useState<string | null>(null);

  const selectedPattern = useMemo(
    () => patterns.find((p) => p.id === selectedPatternId) ?? patterns[0],
    [patterns, selectedPatternId]
  );

  const selectedSize = useMemo(
    () => sizes.find((s) => s.id === selectedSizeId) ?? sizes[0],
    [sizes, selectedSizeId]
  );

  const hasSvg = !!selectedPattern.svgPath;

  // IDs de formas detectadas en el SVG
  const [shapeIds, setShapeIds] = useState<string[]>([]);

  // Colores por shapeId
  const [shapeColors, setShapeColors] = useState<Record<string, string>>({});

  // Color seleccionado en la paleta
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    colors[0]?.id ?? null
  );

  // Resetear shapes/colores al cambiar de patrón
  useEffect(() => {
    setShapeIds([]);
    setShapeColors({});
  }, [selectedPatternId]);

  // Regenerar la textura SIEMPRE desde el mosaico 4x4 (mosaicRef),
  // independientemente de si la vista actual es one-tile o four-tiles.
  useEffect(() => {
    if (!mosaicRef.current) return;

    let cancelled = false;

    const generate = async () => {
      try {
        const png = await exportMosaicToImage(mosaicRef.current!);
        if (!cancelled) {
          setFloorTextureUrl(png);
        }
      } catch (err) {
        console.error("Error exportando mosaico a imagen", err);
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [shapeColors, rotation, selectedPattern.svgPath]);

  const handleShapesDetected = (ids: string[]) => {
    setShapeIds(ids);

    // Inicializamos las formas con un color base (ej. primer color de la paleta)
    setShapeColors((prev) => {
      const next = { ...prev };
      const baseColor = colors[0]?.hex ?? "#f5f5f5";
      ids.forEach((id) => {
        if (!next[id]) {
          next[id] = baseColor;
        }
      });
      return next;
    });
  };

  const handleShapeClick = (shapeId: string) => {
    if (!selectedColorId) return;
    const color = colors.find((c) => c.id === selectedColorId);
    if (!color) return;

    setShapeColors((prev) => ({
      ...prev,
      [shapeId]: color.hex,
    }));
  };

  const pricePerM2 = useMemo(() => {
    const baseArea = 15 * 15;
    const sizeArea = selectedSize.widthCm * selectedSize.heightCm;
    const sizeFactor = sizeArea / baseArea;
    return +(BASE_PRICE_PER_M2 * sizeFactor).toFixed(2);
  }, [selectedSize]);

  const totalPrice = useMemo(
    () => +(pricePerM2 * (area || 0)).toFixed(2),
    [pricePerM2, area]
  );

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleAddToCart = () => {
    console.log("ADD_TO_CART", {
      patternId: selectedPattern.id,
      sizeId: selectedSize.id,
      area,
      pricePerM2,
      totalPrice,
      shapeColors,
      shapeIds,
    });
    alert("Configuración añadida a la cesta (demo).");
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(0, 380px) minmax(0, 1fr)",
        },
        gap: 3,
      }}
    >
      {/* IZQUIERDA: Configuración */}
      <Card
        sx={{
          order: { xs: 2, md: 1 },
        }}
      >
        <CardHeader title="Configura tu baldosa" />
        <CardContent>
          {/* 1. Patrón */}
          <Typography variant="subtitle2" gutterBottom>
            1. Elegir referencia
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
              gap: 1,
              mb: 2,
              maxHeight: 260,
              overflowY: "auto",
              borderRadius: 1,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              p: 1,
            }}
          >
            {patterns.map((pattern) => {
              const isActive = pattern.id === selectedPatternId;
              return (
                <Box
                  key={pattern.id}
                  onClick={() => setSelectedPatternId(pattern.id)}
                  sx={(theme) => ({
                    cursor: "pointer",
                    borderRadius: 1,
                    border: isActive
                      ? `2px solid ${theme.palette.primary.main}`
                      : `1px solid ${theme.palette.divider}`,
                    overflow: "hidden",
                    position: "relative",
                    backgroundColor: "#eee",
                  })}
                >
                  {pattern.previewUrl && (
                    <Box
                      component="img"
                      src={pattern.previewUrl}
                      alt={pattern.name}
                      sx={{ width: "100%", display: "block" }}
                    />
                  )}
                  {!pattern.previewUrl && (
                    <Box sx={{ width: "100%", pt: "100%" }} />
                  )}
                  <Box
                    sx={(theme) => ({
                      position: "absolute",
                      left: 0,
                      bottom: 0,
                      width: "100%",
                      bgcolor: "rgba(0,0,0,0.6)",
                      color: theme.palette.common.white,
                      fontSize: 10,
                      textAlign: "center",
                      py: 0.2,
                    })}
                  >
                    {pattern.code}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* 2. Paleta de colores */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            2. Paleta de colores
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block" }}
          >
            Selecciona un color y luego haz click en una zona del mosaico para
            aplicarlo.
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              mb: 2,
            }}
          >
            {colors.map((color) => {
              const isActive = color.id === selectedColorId;
              return (
                <Box
                  key={color.id}
                  onClick={() => setSelectedColorId(color.id)}
                  sx={(theme) => ({
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    bgcolor: color.hex,
                    border: isActive
                      ? `2px solid ${theme.palette.primary.main}`
                      : `1px solid ${theme.palette.divider}`,
                    boxShadow: isActive
                      ? `0 0 0 2px ${theme.palette.primary.light}`
                      : "none",
                    cursor: "pointer",
                  })}
                  title={color.name}
                />
              );
            })}
          </Box>

          {/* 3. Tamaño */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            3. Tamaño de la baldosa
          </Typography>
          <Select
            fullWidth
            size="small"
            value={selectedSizeId}
            onChange={(e) => setSelectedSizeId(e.target.value as string)}
            sx={{ mb: 2 }}
          >
            {sizes.map((size) => (
              <MenuItem key={size.id} value={size.id}>
                {size.label}
              </MenuItem>
            ))}
          </Select>

          {/* 4. Superficie */}
          <Typography variant="subtitle2" gutterBottom>
            4. Superficie necesaria (m²)
          </Typography>
          <TextField
            size="small"
            type="number"
            fullWidth
            value={area}
            onChange={(e) =>
              setArea(
                Number.isNaN(parseFloat(e.target.value))
                  ? 0
                  : parseFloat(e.target.value)
              )
            }
            inputProps={{ min: 0, step: 0.1 }}
            sx={{ mb: 2 }}
          />

          {/* Resumen de precio */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2">
            Precio/m² excl. IVA: <strong>{pricePerM2.toFixed(2)} €</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Total aprox.: <strong>{totalPrice.toFixed(2)} €</strong>
          </Typography>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleAddToCart}
          >
            Añadir a la cesta
          </Button>
        </CardContent>
      </Card>

      {/* DERECHA: Vista previa */}
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          order: { xs: 1, md: 2 },
        }}
      >
        <CardHeader
          title="Simulación del suelo (virtual)"
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              <ToggleButtonGroup
                value={previewMode}
                exclusive
                size="small"
                onChange={(_, val) => val && setPreviewMode(val)}
              >
                <ToggleButton value="mosaic">Mosaico</ToggleButton>
                <ToggleButton value="kitchen">Cocina</ToggleButton>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                size="small"
                onChange={(_, val) => val && setViewMode(val)}
              >
                <ToggleButton value="four-tiles">
                  <GridViewIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="one-tile">
                  <CropSquareIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRotate}
                sx={{ minWidth: 0, px: 1 }}
              >
                <RotateLeftIcon fontSize="small" />
              </Button>
            </Box>
          }
        />
        <CardContent sx={{ flex: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(0, 2fr) minmax(0, 1fr)",
              },
              gap: 3,
              alignItems: "flex-start",
            }}
          >
            {/* Vista principal del suelo */}
            {previewMode === "mosaic" ? (
              // === Vista mosaico aislado ===
              <Box
                sx={(theme) => ({
                  width: "100%",
                  maxWidth: 520,
                  mx: "auto",
                  aspectRatio: "1 / 1",
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  overflow: "hidden",
                  position: "relative",
                })}
              >
                <Box
                  ref={mosaicRef}
                  sx={{
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                  }}
                >
                  {hasSvg ? (
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gridTemplateRows: "repeat(4, 1fr)",
                        // truco: siempre 4x4 para textura,
                        // pero si la vista es "one-tile", hacemos zoom al centro
                        transform:
                          viewMode === "one-tile" ? "scale(2)" : "scale(1)",
                        transformOrigin: "center center",
                      }}
                    >
                      {Array.from({ length: 16 }).map((_, idx) => (
                        <Box key={idx}>
                          <GenericPatternSvg
                            svgPath={selectedPattern.svgPath!}
                            shapeColors={shapeColors}
                            rotationDeg={rotation}
                            onShapesDetected={
                              idx === 0 ? handleShapesDetected : undefined
                            }
                            onShapeClick={handleShapeClick}
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#e0e0e0",
                      }}
                    />
                  )}
                </Box>
              </Box>
            ) : (
              // === Vista mosaico montado en la cocina ===
              <KitchenFloorPreviewThree patternUrl={floorTextureUrl} />
            )}

            {/* Detalles de configuración */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Detalles de la configuración
              </Typography>
              <Typography variant="body2">
                Referencia: <strong>{selectedPattern.code}</strong>
              </Typography>
              <Typography variant="body2">
                Patrón: <strong>{selectedPattern.name}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Formas detectadas en SVG: <strong>{shapeIds.length}</strong>
              </Typography>
              <Typography variant="body2">
                Tamaño: <strong>{selectedSize.label}</strong>
              </Typography>
              <Typography variant="body2">
                Superficie: <strong>{area.toFixed(2)} m²</strong>
              </Typography>
              <Typography variant="body2">
                Precio/m²: <strong>{pricePerM2.toFixed(2)} €</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Total aprox.: <strong>{totalPrice.toFixed(2)} €</strong>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
