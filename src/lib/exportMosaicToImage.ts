// src/lib/exportMosaicToImage.ts
import html2canvas from 'html2canvas'

export async function exportMosaicToImage(dom: HTMLElement) {
  const rect = dom.getBoundingClientRect()

  const canvas = await html2canvas(dom, {
    backgroundColor: null,
    // subir la escala mejora muchísimo la nitidez
    scale: 3, // antes 2; si tu máquina aguanta puedes subir a 4
    width: rect.width,
    height: rect.height,
    useCORS: true,
  })

  return canvas.toDataURL('image/png')
}
