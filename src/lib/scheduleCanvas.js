// Canvas uses the same drawing commands as the PDF, without a browser PDF plugin.
export function scheduleCanvas(canvas) {
  const scale = 6;
  canvas.width = 210 * scale;
  canvas.height = 297 * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 210, 297);
  let weight = "normal", size = 11, fill = "white", stroke = "black", ink = "black";
  const color = (values) => `rgb(${values.length === 1 ? [values[0], values[0], values[0]] : values})`;
  const font = () => { ctx.font = `${weight} ${size * 25.4 / 72}px Arial, sans-serif`; };
  const surface = {
    setDrawColor: (...values) => { stroke = color(values); },
    setFillColor: (...values) => { fill = color(values); },
    setTextColor: (...values) => { ink = color(values); },
    setLineWidth: (value) => { ctx.lineWidth = value; },
    setFont: (_family, style) => { weight = style === "bold" ? "bold" : "normal"; font(); },
    setFontSize: (value) => { size = value; font(); },
    getTextWidth: (text) => ctx.measureText(String(text)).width,
    text: (text, x, y, options = {}) => {
      ctx.fillStyle = ink;
      ctx.textAlign = options.align || "left";
      ctx.fillText(String(text), x, y);
    },
    rect: (x, y, w, h, mode) => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      if (mode?.includes("F")) ctx.fillRect(x, y, w, h);
      if (!mode || mode.includes("D") || mode === "S") ctx.strokeRect(x, y, w, h);
    },
    line: (x1, y1, x2, y2) => {
      ctx.strokeStyle = stroke;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    },
  };
  font();
  return surface;
}