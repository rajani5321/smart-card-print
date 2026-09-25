const profiles = {
  // Physical dimensions in millimeters (CR80 standard: 85.60 × 53.98 mm)
  aadhaar: { name: "Aadhaar Card", w: 85.60, h: 53.98 },
  pan: { name: "PAN Card", w: 85.60, h: 53.98 },
  "ration card": { name: "Ration Card", w: 85.60, h: 53.98 },
  ration: { name: "Ration Card", w: 85.60, h: 53.98 },
  ayushman: { name: "Ayushman Card", w: 85.60, h: 53.98 },
  voter: { name: "Voter ID", w: 85.60, h: 53.98 },
  dl: { name: "Driving Licence", w: 85.60, h: 53.98 },
  custom: { name: "Custom", w: 85.60, h: 53.98 }
};

const $ = id => document.getElementById(id);

// State for Front and Back card images
const state = {
  front: { img: null, original: null, processed: null },
  back: { img: null, original: null, processed: null },
  pdf: {
    doc: null,
    file: null,
    password: "",
    page1Canvas: null,
    page2Canvas: null,
    detectedBox: null
  }
};

// Configure PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function setProfile() {
  if (!$("cardType") || !$("widthMm") || !$("heightMm")) return;
  const p = profiles[$("cardType").value];
  if (p) {
    $("widthMm").value = p.w;
    $("heightMm").value = p.h;
  }
  updatePixels();
  generateA4();
}

function updatePixels() {
  const w = Number($("widthMm")?.value) || 85.60;
  const h = Number($("heightMm")?.value) || 53.98;
  const d = Number($("dpi")?.value) || 300;
  const page = $("pageSize") ? $("pageSize").value : "a4";
  const ori = $("orientation") ? $("orientation").value : "portrait";

  let pw = page === "a4" ? 210 : 215.9;
  let ph = page === "a4" ? 297 : 279.4;
  if (ori === "landscape") [pw, ph] = [ph, pw];

  const cardPxW = Math.round(w * d / 25.4);
  const cardPxH = Math.round(h * d / 25.4);
  const pagePxW = Math.round(pw * d / 25.4);
  const pagePxH = Math.round(ph * d / 25.4);

  if ($("pixelSize")) $("pixelSize").textContent = `${cardPxW} × ${cardPxH} px (${d} DPI)`;
  if ($("pairSize")) $("pairSize").textContent = `${(w * 2).toFixed(2)} × ${h.toFixed(2)} mm`;
  if ($("pageSizePx")) $("pageSizePx").textContent = `${pagePxW} × ${pagePxH} px`;
}

// -------------------------------------------------------------
// IMAGE LOADING & PREVIEW
// -------------------------------------------------------------

function loadSideImage(side, file) {
  if (!file) return;
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    handlePdfFile(file);
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state[side].img = img;
    state[side].original = img;
    state[side].processed = null;
    drawMiniPreview(side);
    URL.revokeObjectURL(url);
    generateA4();
  };
  img.onerror = () => {
    alert(`Could not load ${side} image file.`);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function loadBothImages(fileList) {
  if (!fileList || fileList.length === 0) return;
  // If first file is PDF, handle as PDF
  if (fileList[0].type === "application/pdf" || fileList[0].name.toLowerCase().endsWith(".pdf")) {
    handlePdfFile(fileList[0]);
    return;
  }
  if (fileList.length >= 2) {
    loadSideImage("front", fileList[0]);
    loadSideImage("back", fileList[1]);
  } else if (fileList.length === 1) {
    if (!state.front.img) {
      loadSideImage("front", fileList[0]);
    } else {
      loadSideImage("back", fileList[0]);
    }
  }
}

function drawMiniPreview(side) {
  const img = state[side].img;
  const canvas = $(side + "Canvas");
  const wrap = $(side + "PreviewWrap");
  const drop = $(side + "Dropzone");
  const status = $(side + "Status");

  if (!img) {
    if (wrap) wrap.style.display = "none";
    if (drop) drop.style.display = "block";
    if (status) status.textContent = `Waiting for ${side} image`;
    return;
  }

  if (wrap) wrap.style.display = "block";
  if (drop) drop.style.display = "none";
  if (status) status.textContent = `Ready (${img.naturalWidth || img.width}×${img.naturalHeight || img.height}px)`;

  if (canvas) {
    const maxW = 320, maxH = 190;
    const s = Math.min(maxW / img.width, maxH / img.height, 1);
    canvas.width = Math.round(img.width * s);
    canvas.height = Math.round(img.height * s);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
}

function rotateSideImage(side, deg = 90) {
  const current = state[side].img;
  if (!current) return;
  const c = document.createElement("canvas");
  if (deg === 90 || deg === 270 || deg === -90) {
    c.width = current.naturalHeight || current.height;
    c.height = current.naturalWidth || current.width;
  } else {
    c.width = current.naturalWidth || current.width;
    c.height = current.naturalHeight || current.height;
  }
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(current, -current.width / 2, -current.height / 2);

  const im = new Image();
  im.onload = () => {
    state[side].img = im;
    state[side].processed = im;
    drawMiniPreview(side);
    generateA4();
  };
  im.src = c.toDataURL("image/png");
}

function removeSideImage(side) {
  state[side].img = null;
  state[side].original = null;
  state[side].processed = null;
  drawMiniPreview(side);
  generateA4();
}

function resetAll() {
  removeSideImage("front");
  removeSideImage("back");
  state.pdf = { doc: null, file: null, password: "", page1Canvas: null, page2Canvas: null, detectedBox: null };
  if ($("pdfDetectedBanner")) $("pdfDetectedBanner").style.display = "none";
  if ($("brightness")) { $("brightness").value = 0; if ($("brightnessVal")) $("brightnessVal").textContent = "0%"; }
  if ($("contrast")) { $("contrast").value = 0; if ($("contrastVal")) $("contrastVal").textContent = "0%"; }
  generateA4();
}

// -------------------------------------------------------------
// PDF AUTOMATIC DETECTION & SPLIT (e-Aadhaar, e-PAN, Ayushman)
// -------------------------------------------------------------

async function handlePdfFile(file, password = "") {
  if (!file) return;
  state.pdf.file = file;
  state.pdf.password = password;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined
    });
    const pdfDoc = await loadingTask.promise;
    state.pdf.doc = pdfDoc;

    if ($("pdfPasswordModal")) $("pdfPasswordModal").style.display = "none";
    if ($("pdfPasswordError")) $("pdfPasswordError").style.display = "none";

    await processPdfDocument(pdfDoc);
  } catch (err) {
    if (err.name === "PasswordException" || err.code === 1) {
      showPdfPasswordModal(file);
    } else {
      console.error("PDF load error:", err);
      alert("Error loading PDF: " + err.message);
    }
  }
}

function showPdfPasswordModal(file) {
  state.pdf.file = file;
  const modal = $("pdfPasswordModal");
  if (modal) {
    modal.style.display = "flex";
    if ($("pdfPasswordInput")) {
      $("pdfPasswordInput").value = "";
      $("pdfPasswordInput").focus();
    }
    if ($("pdfPasswordError")) $("pdfPasswordError").style.display = "none";
  }
}

// Render a single PDF page to canvas at 300 DPI
async function renderPdfPageToCanvas(pdfDoc, pageNum, dpi = 300) {
  const page = await pdfDoc.getPage(pageNum);
  const scale = dpi / 72; // Standard PDF points are 72 per inch
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

// Process loaded PDF document and auto-detect card
async function processPdfDocument(pdfDoc) {
  // Render Page 1 at 300 DPI
  const page1 = await renderPdfPageToCanvas(pdfDoc, 1, 300);
  state.pdf.page1Canvas = page1;

  if (pdfDoc.numPages >= 2) {
    const page2 = await renderPdfPageToCanvas(pdfDoc, 2, 300);
    state.pdf.page2Canvas = page2;
  } else {
    state.pdf.page2Canvas = null;
  }

  // Detect card rectangle in Page 1 (e-Aadhaar / e-PAN bottom card)
  const detectedBox = detectCardInCanvas(page1);
  state.pdf.detectedBox = detectedBox;

  applyPdfSplit();

  if ($("pdfDetectedBanner")) $("pdfDetectedBanner").style.display = "flex";
}

// Detect the card boundary in the rendered PDF canvas
function detectCardInCanvas(canvas) {
  const W = canvas.width;
  const H = canvas.height;

  // Try OpenCV edge detection in the bottom 45% of the page
  if (typeof cv !== "undefined" && cv.Mat) {
    try {
      const searchStartY = Math.round(H * 0.50);
      const searchH = H - searchStartY;

      const cropCanvas = document.createElement("canvas");
      const scaleDown = Math.min(1, 1000 / W);
      cropCanvas.width = Math.round(W * scaleDown);
      cropCanvas.height = Math.round(searchH * scaleDown);

      const cropCtx = cropCanvas.getContext("2d");
      cropCtx.drawImage(canvas, 0, searchStartY, W, searchH, 0, 0, cropCanvas.width, cropCanvas.height);

      const src = cv.imread(cropCanvas);
      const gray = new cv.Mat(), blur = new cv.Mat(), edges = new cv.Mat(), contours = new cv.MatVector(), hier = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
      cv.Canny(blur, edges, 40, 140);
      const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
      cv.dilate(edges, edges, kernel); kernel.delete();
      cv.findContours(edges, contours, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

      let bestRect = null, bestArea = 0;
      const totalSearchArea = cropCanvas.width * cropCanvas.height;

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        const area = cv.contourArea(approx);
        const r = cv.boundingRect(approx);
        const aspect = r.width / r.height;

        // Dual card (Front + Back side-by-side) has aspect ratio ~3.17 (2.4 to 3.8)
        if (aspect >= 2.4 && aspect <= 3.8 && area > totalSearchArea * 0.12 && area < totalSearchArea * 0.95) {
          if (area > bestArea) {
            bestArea = area;
            bestRect = r;
          }
        }
        approx.delete();
        cnt.delete();
      }

      src.delete(); gray.delete(); blur.delete(); edges.delete(); contours.delete(); hier.delete();

      if (bestRect) {
        return {
          x: Math.round(bestRect.x / scaleDown),
          y: Math.round(searchStartY + (bestRect.y / scaleDown)),
          w: Math.round(bestRect.width / scaleDown),
          h: Math.round(bestRect.height / scaleDown)
        };
      }
    } catch (e) {
      console.warn("OpenCV PDF detection fallback to standard geometry:", e);
    }
  }

  // -------------------------------------------------------------
  // FALLBACK: Standard UIDAI e-Aadhaar A4 geometry
  // -------------------------------------------------------------
  // At 300 DPI: Page is 2480 × 3508 px
  // Dual Card is 171.20 × 53.98 mm -> ~2022 × 638 px
  // Positioned in bottom ~25% of page, centered horizontally
  const cardW = Math.round(171.20 * (300 / 25.4)); // 2022 px
  const cardH = Math.round(53.98 * (300 / 25.4));  // 638 px
  const cardX = Math.round((W - cardW) / 2);       // ~229 px

  // Scan downward from 68% to 85% of page height to find the dark horizontal border line
  let bestY = Math.round(H * 0.72); // Default e-Aadhaar card Y (~2525 px)
  try {
    const ctx = canvas.getContext("2d");
    const scanStartY = Math.round(H * 0.65);
    const scanEndY = Math.round(H * 0.85);
    const midX = Math.round(W / 2);
    const imgData = ctx.getImageData(midX, scanStartY, 1, scanEndY - scanStartY).data;

    let darkestY = scanStartY, minBright = 255;
    for (let py = 0; py < (scanEndY - scanStartY); py++) {
      const idx = py * 4;
      const brightness = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
      if (brightness < minBright && brightness < 80) { // Dark border line
        minBright = brightness;
        darkestY = scanStartY + py;
        break;
      }
    }
    if (minBright < 80) {
      bestY = darkestY;
    }
  } catch (err) {}

  return {
    x: cardX,
    y: Math.min(bestY, H - cardH - 20),
    w: cardW,
    h: cardH
  };
}

// Split detected PDF card into Front & Back and assign to state
function applyPdfSplit() {
  const mode = $("pdfSplitMode")?.value || "horizontal";
  const p1 = state.pdf.page1Canvas;
  if (!p1) return;

  if (mode === "pages" && state.pdf.page2Canvas) {
    // Page 1 is Front, Page 2 is Back
    canvasToImage(state.pdf.page1Canvas, img => {
      state.front.img = img; state.front.original = img;
      drawMiniPreview("front"); generateA4();
    });
    canvasToImage(state.pdf.page2Canvas, img => {
      state.back.img = img; state.back.original = img;
      drawMiniPreview("back"); generateA4();
    });
    if ($("pdfDetectedText")) $("pdfDetectedText").textContent = "Extracted Page 1 as Front & Page 2 as Back at 300 DPI!";
    return;
  }

  const box = state.pdf.detectedBox || {
    x: Math.round((p1.width - 2022) / 2),
    y: Math.round(p1.height * 0.72),
    w: 2022,
    h: 638
  };

  if (mode === "horizontal") {
    // -------------------------------------------------------------
    // SIDE-BY-SIDE: Left half = Front, Right half = Back (e-Aadhaar / e-PAN)
    // -------------------------------------------------------------
    const halfW = Math.round(box.w / 2);

    // Front (Left)
    const frontC = document.createElement("canvas");
    frontC.width = halfW; frontC.height = box.h;
    frontC.getContext("2d").drawImage(p1, box.x, box.y, halfW, box.h, 0, 0, halfW, box.h);
    canvasToImage(frontC, img => {
      state.front.img = img; state.front.original = img;
      drawMiniPreview("front"); generateA4();
    });

    // Back (Right)
    const backC = document.createElement("canvas");
    backC.width = halfW; backC.height = box.h;
    backC.getContext("2d").drawImage(p1, box.x + halfW, box.y, halfW, box.h, 0, 0, halfW, box.h);
    canvasToImage(backC, img => {
      state.back.img = img; state.back.original = img;
      drawMiniPreview("back"); generateA4();
    });

    if ($("pdfDetectedText")) $("pdfDetectedText").textContent = "e-Aadhaar/PAN card split into Front (Left) & Back (Right) at 300 DPI!";

  } else if (mode === "vertical") {
    // -------------------------------------------------------------
    // STACKED: Top half = Front, Bottom half = Back
    // -------------------------------------------------------------
    const halfH = Math.round(box.h / 2);

    const frontC = document.createElement("canvas");
    frontC.width = box.w; frontC.height = halfH;
    frontC.getContext("2d").drawImage(p1, box.x, box.y, box.w, halfH, 0, 0, box.w, halfH);
    canvasToImage(frontC, img => {
      state.front.img = img; state.front.original = img;
      drawMiniPreview("front"); generateA4();
    });

    const backC = document.createElement("canvas");
    backC.width = box.w; backC.height = halfH;
    backC.getContext("2d").drawImage(p1, box.x, box.y + halfH, box.w, halfH, 0, 0, box.w, halfH);
    canvasToImage(backC, img => {
      state.back.img = img; state.back.original = img;
      drawMiniPreview("back"); generateA4();
    });

    if ($("pdfDetectedText")) $("pdfDetectedText").textContent = "Card split into Front (Top) & Back (Bottom) at 300 DPI!";
  }
}

// Convert canvas to Image object
function canvasToImage(canvas, callback) {
  const im = new Image();
  im.onload = () => callback(im);
  im.src = canvas.toDataURL("image/png");
}

// Swap Front & Back sides
function swapFrontBack() {
  const temp = state.front;
  state.front = state.back;
  state.back = temp;
  drawMiniPreview("front");
  drawMiniPreview("back");
  generateA4();
}

// OpenCV Auto-Deskew for a given side
function autoDetectSide(side) {
  const orig = state[side].original;
  if (!orig) return;
  const status = $(side + "Status");
  if (status) status.textContent = "Deskewing…";

  if (typeof cv === "undefined" || !cv.Mat) {
    if (status) status.textContent = "OpenCV loading; retry in 5s";
    return;
  }

  try {
    const maxDim = 1200;
    const scaleFactor = Math.min(1, maxDim / Math.max(orig.width, orig.height));
    const workW = Math.round(orig.width * scaleFactor), workH = Math.round(orig.height * scaleFactor);

    const workCanvas = document.createElement("canvas");
    workCanvas.width = workW; workCanvas.height = workH;
    const workCtx = workCanvas.getContext("2d");
    workCtx.imageSmoothingEnabled = true; workCtx.imageSmoothingQuality = "high";
    workCtx.drawImage(orig, 0, 0, workW, workH);

    const src = cv.imread(workCanvas);
    const gray = new cv.Mat(), blur = new cv.Mat(), edges = new cv.Mat(), contours = new cv.MatVector(), hier = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    cv.Canny(blur, edges, 40, 140);
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel); kernel.delete();
    cv.findContours(edges, contours, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let best = null, bestArea = 0;
    const minArea = workW * workH * 0.12, maxArea = workW * workH * 0.98;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.025 * peri, true);
      const area = cv.contourArea(approx);
      if (approx.rows === 4 && area > minArea && area < maxArea && cv.isContourConvex(approx)) {
        if (area > bestArea) { if (best) best.delete(); best = approx; bestArea = area; }
        else approx.delete();
      } else approx.delete();
      cnt.delete();
    }

    if (best) {
      const pts = [];
      for (let k = 0; k < 4; k++) {
        pts.push({ x: best.data32S[k * 2] / scaleFactor, y: best.data32S[k * 2 + 1] / scaleFactor });
      }
      best.delete();
      pts.sort((a, b) => a.y - b.y);
      const topPts = pts.slice(0, 2).sort((a, b) => a.x - b.x);
      const botPts = pts.slice(2, 4).sort((a, b) => a.x - b.x);
      const tl = topPts[0], tr = topPts[1], br = botPts[1], bl = botPts[0];

      const cw = Number($("widthMm")?.value) || 85.60, ch = Number($("heightMm")?.value) || 53.98;
      const cardRatio = cw / ch;
      const outW = Math.round(Math.max(Math.hypot(tr.x - tl.x, tr.y - tl.y), Math.hypot(br.x - bl.x, br.y - bl.y)));
      const outH = Math.round(outW / cardRatio);

      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = orig.naturalWidth || orig.width; fullCanvas.height = orig.naturalHeight || orig.height;
      fullCanvas.getContext("2d").drawImage(orig, 0, 0);

      const fullSrc = cv.imread(fullCanvas);
      const srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
      const dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH]);
      const M = cv.getPerspectiveTransform(srcCoords, dstCoords);
      const warped = new cv.Mat();
      cv.warpPerspective(fullSrc, warped, M, new cv.Size(outW, outH), cv.INTER_CUBIC, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));

      const outCanvas = document.createElement("canvas");
      outCanvas.width = outW; outCanvas.height = outH;
      cv.imshow(outCanvas, warped);

      const im = new Image();
      im.onload = () => {
        state[side].processed = im; state[side].img = im;
        drawMiniPreview(side); generateA4();
        if (status) status.textContent = `Deskewed (${outW}×${outH}px)`;
      };
      im.src = outCanvas.toDataURL("image/png");
      srcCoords.delete(); dstCoords.delete(); M.delete(); fullSrc.delete(); warped.delete();
    } else {
      if (status) status.textContent = "No 4-corner card found; using full image";
    }
    src.delete(); gray.delete(); blur.delete(); edges.delete(); contours.delete(); hier.delete();
  } catch (e) {
    console.error("OpenCV error:", e);
    if (status) status.textContent = "Detection error; original image kept";
  }
}

// -------------------------------------------------------------
// DRAWING & SELF-CUT GUIDES ON A4 CANVAS
// -------------------------------------------------------------

function drawCardSlot(ctx, img, x, y, w, h, cw, ch, fitMode, filterStr, placeholderLabel) {
  if (!img) {
    ctx.save();
    ctx.fillStyle = "#fafcff";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = Math.max(1, Math.round(0.18 * (w / cw)));
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#94a3b8";
    ctx.font = `600 ${Math.round(h * 0.08)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(placeholderLabel || "Empty Slot", x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = filterStr;

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  if (fitMode === "cover") {
    const targetAspect = cw / ch;
    const imgAspect = imgW / imgH;
    let sx = 0, sy = 0, sw = imgW, sh = imgH;
    if (imgAspect > targetAspect) {
      sw = imgH * targetAspect;
      sx = (imgW - sw) / 2;
    } else {
      sh = imgW / targetAspect;
      sy = (imgH - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  } else if (fitMode === "contain") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, w, h);
    const targetAspect = cw / ch;
    const imgAspect = imgW / imgH;
    let dw = w, dh = h, dx = x, dy = y;
    if (imgAspect > targetAspect) {
      dh = w / imgAspect;
      dy = y + (h - dh) / 2;
    } else {
      dw = h * imgAspect;
      dx = x + (w - dw) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

function drawCropMarks(ctx, x, y, w, h, scale, markLenMm = 4, offsetMm = 1.5) {
  const len = markLenMm * scale;
  const off = offsetMm * scale;
  ctx.save();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));

  // Top-Left corner
  ctx.beginPath();
  ctx.moveTo(x - off - len, y); ctx.lineTo(x - off, y);
  ctx.moveTo(x, y - off - len); ctx.lineTo(x, y - off);
  ctx.stroke();

  // Top-Right corner
  ctx.beginPath();
  ctx.moveTo(x + w + off, y); ctx.lineTo(x + w + off + len, y);
  ctx.moveTo(x + w, y - off - len); ctx.lineTo(x + w, y - off);
  ctx.stroke();

  // Bottom-Left corner
  ctx.beginPath();
  ctx.moveTo(x - off - len, y + h); ctx.lineTo(x - off, y + h);
  ctx.moveTo(x, y + h + off); ctx.lineTo(x, y + h + off + len);
  ctx.stroke();

  // Bottom-Right corner
  ctx.beginPath();
  ctx.moveTo(x + w + off, y + h); ctx.lineTo(x + w + off + len, y + h);
  ctx.moveTo(x + w, y + h + off); ctx.lineTo(x + w, y + h + off + len);
  ctx.stroke();

  ctx.restore();
}

function drawCenterFoldGuide(ctx, x, y, h, scale, mode = "yes", markLenMm = 3) {
  if (mode === "no") return;
  const len = markLenMm * scale;
  ctx.save();
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));

  // Top tick mark above card
  ctx.beginPath();
  ctx.moveTo(x, y - len);
  ctx.lineTo(x, y);
  ctx.stroke();

  // Dashed fold line through card
  if (mode === "yes") {
    ctx.beginPath();
    ctx.strokeStyle = "#94a3b8";
    ctx.setLineDash([Math.round(2 * scale), Math.round(2 * scale)]);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
  }

  // Bottom tick mark below card
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h + len);
  ctx.stroke();

  // Fold text indicator
  ctx.fillStyle = "#64748b";
  ctx.font = `${Math.round(2.2 * scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("✂ FOLD", x, y - len - (1 * scale));

  ctx.restore();
}

function drawCornerRadiusGuides(ctx, x, y, w, h, scale, radiusMm = 3.18) {
  const r = radiusMm * scale;
  ctx.save();
  ctx.strokeStyle = "rgba(100, 116, 139, 0.45)";
  ctx.lineWidth = Math.max(1, Math.round(0.15 * scale));
  ctx.setLineDash([Math.round(1.5 * scale), Math.round(1.5 * scale)]);

  // Top-Left
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.arc(x + w - r, y + r, r, 1.5 * Math.PI, 2 * Math.PI);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.arc(x + w - r, y + h - r, r, 0, 0.5 * Math.PI);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.arc(x + r, y + h - r, r, 0.5 * Math.PI, Math.PI);
  ctx.stroke();

  ctx.restore();
}

// -------------------------------------------------------------
// GENERATE A4 SHEET (300 / 600 DPI)
// -------------------------------------------------------------

function generateA4() {
  const canvas = $("a4Canvas");
  if (!canvas) return;

  const page = $("pageSize")?.value || "a4";
  const ori = $("orientation")?.value || "portrait";
  let pw = page === "a4" ? 210 : 215.9;
  let ph = page === "a4" ? 297 : 279.4;
  if (ori === "landscape") [pw, ph] = [ph, pw];

  const cw = Number($("widthMm")?.value) || 85.60;
  const ch = Number($("heightMm")?.value) || 53.98;
  const dpi = Number($("dpi")?.value) || 300;
  const copies = Math.max(1, Number($("copies")?.value) || 1);
  const layout = $("layoutArrangement")?.value || "fold_horizontal";
  const cutGuide = $("cutGuide")?.value || "crop_marks";
  const foldGuide = $("foldGuide")?.value || "yes";
  const roundGuide = $("roundGuide")?.value || "yes";
  const fitMode = $("fitMode")?.value || "cover";
  const marginMm = Number($("marginMm")?.value) || 12;
  const gapMm = Number($("gapMm")?.value) || 6;
  const brightness = Number($("brightness")?.value || 0) || 0;
  const contrast = Number($("contrast")?.value || 0) || 0;

  // True physical scale (300 DPI = ~11.811 px/mm)
  const scale = dpi / 25.4;
  canvas.width = Math.round(pw * scale);
  canvas.height = Math.round(ph * scale);

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // White paper background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const frontImg = state.front.img;
  const backImg = state.back.img;
  const filterStr = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;

  const cardW = cw * scale;
  const cardH = ch * scale;

  if (layout === "fold_horizontal") {
    // FOLDABLE SIDE-BY-SIDE (FRONT + BACK JOINED HORIZONTALLY)
    const pairW_mm = cw * 2;
    const pairH_mm = ch;
    const pairW = pairW_mm * scale;
    const pairH = pairH_mm * scale;

    const startX_mm = (pw - pairW_mm) / 2;
    const startX = startX_mm * scale;

    const maxPairs = Math.max(1, Math.floor((ph - 2 * marginMm + gapMm) / (pairH_mm + gapMm)));
    const count = Math.min(copies, maxPairs);

    for (let k = 0; k < count; k++) {
      const pairY_mm = marginMm + k * (pairH_mm + gapMm);
      const pairY = pairY_mm * scale;
      const frontX = startX;
      const backX = startX + cardW;

      drawCardSlot(ctx, frontImg, frontX, pairY, cardW, cardH, cw, ch, fitMode, filterStr, "🪪 Front Side");
      drawCardSlot(ctx, backImg, backX, pairY, cardW, cardH, cw, ch, fitMode, filterStr, "🔄 Back Side");

      drawCenterFoldGuide(ctx, backX, pairY, pairH, scale, foldGuide);

      if (cutGuide === "crop_marks" || cutGuide === "both") {
        drawCropMarks(ctx, frontX, pairY, pairW, pairH, scale, 4, 1.5);
      }
      if (cutGuide === "dashed" || cutGuide === "both") {
        ctx.save();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));
        ctx.setLineDash([Math.round(2 * scale), Math.round(1.5 * scale)]);
        ctx.strokeRect(frontX, pairY, pairW, pairH);
        ctx.restore();
      }
      if (cutGuide === "solid") {
        ctx.save();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));
        ctx.strokeRect(frontX, pairY, pairW, pairH);
        ctx.restore();
      }
      if (roundGuide === "yes") {
        drawCornerRadiusGuides(ctx, frontX, pairY, pairW, pairH, scale, 3.18);
      }
    }

  } else if (layout === "fold_vertical") {
    // FOLDABLE TOP-TO-BOTTOM
    const pairW_mm = cw;
    const pairH_mm = ch * 2;
    const pairW = pairW_mm * scale;
    const pairH = pairH_mm * scale;

    const cols = Math.max(1, Math.floor((pw - 2 * marginMm + gapMm) / (pairW_mm + gapMm)));
    const rows = Math.max(1, Math.floor((ph - 2 * marginMm + gapMm) / (pairH_mm + gapMm)));
    const count = Math.min(copies, cols * rows);

    for (let k = 0; k < count; k++) {
      const col = k % cols;
      const row = Math.floor(k / cols);
      const pairX = (marginMm + col * (pairW_mm + gapMm)) * scale;
      const pairY = (marginMm + row * (pairH_mm + gapMm)) * scale;
      const frontY = pairY;
      const backY = pairY + cardH;

      drawCardSlot(ctx, frontImg, pairX, frontY, cardW, cardH, cw, ch, fitMode, filterStr, "🪪 Front Side");
      drawCardSlot(ctx, backImg, pairX, backY, cardW, cardH, cw, ch, fitMode, filterStr, "🔄 Back Side");

      if (foldGuide !== "no") {
        ctx.save();
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));
        const len = 3 * scale;
        ctx.beginPath(); ctx.moveTo(pairX - len, backY); ctx.lineTo(pairX, backY); ctx.stroke();
        if (foldGuide === "yes") {
          ctx.beginPath(); ctx.strokeStyle = "#94a3b8";
          ctx.setLineDash([Math.round(2 * scale), Math.round(2 * scale)]);
          ctx.moveTo(pairX, backY); ctx.lineTo(pairX + cardW, backY); ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(pairX + cardW, backY); ctx.lineTo(pairX + cardW + len, backY); ctx.stroke();
        ctx.restore();
      }

      if (cutGuide === "crop_marks" || cutGuide === "both") {
        drawCropMarks(ctx, pairX, pairY, pairW, pairH, scale, 4, 1.5);
      }
      if (cutGuide === "dashed" || cutGuide === "both") {
        ctx.save();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));
        ctx.setLineDash([Math.round(2 * scale), Math.round(1.5 * scale)]);
        ctx.strokeRect(pairX, pairY, pairW, pairH);
        ctx.restore();
      }
      if (cutGuide === "solid") {
        ctx.save();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));
        ctx.strokeRect(pairX, pairY, pairW, pairH);
        ctx.restore();
      }
      if (roundGuide === "yes") {
        drawCornerRadiusGuides(ctx, pairX, pairY, pairW, pairH, scale, 3.18);
      }
    }

  } else {
    // SEPARATE CARDS OR SEQUENTIAL GRID
    const cols = Math.max(1, Math.floor((pw - 2 * marginMm + gapMm) / (cw + gapMm)));
    const rows = Math.max(1, Math.floor((ph - 2 * marginMm + gapMm) / (ch + gapMm)));
    const capacity = cols * rows;
    const totalCards = Math.min(copies * 2, capacity);

    for (let i = 0; i < totalCards; i++) {
      const isFront = (i % 2 === 0);
      const curImg = isFront ? frontImg : (backImg || frontImg);
      const label = isFront ? "🪪 Front Side" : "🔄 Back Side";

      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (marginMm + col * (cw + gapMm)) * scale;
      const y = (marginMm + row * (ch + gapMm)) * scale;

      drawCardSlot(ctx, curImg, x, y, cardW, cardH, cw, ch, fitMode, filterStr, label);

      if (cutGuide === "crop_marks" || cutGuide === "both") {
        drawCropMarks(ctx, x, y, cardW, cardH, scale, 3, 1);
      }
      if (cutGuide === "dashed" || cutGuide === "both") {
        ctx.save();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));
        ctx.setLineDash([Math.round(2 * scale), Math.round(1.5 * scale)]);
        ctx.strokeRect(x, y, cardW, cardH);
        ctx.restore();
      }
      if (cutGuide === "solid") {
        ctx.save();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = Math.max(1, Math.round(0.18 * scale));
        ctx.strokeRect(x, y, cardW, cardH);
        ctx.restore();
      }
      if (roundGuide === "yes") {
        drawCornerRadiusGuides(ctx, x, y, cardW, cardH, scale, 3.18);
      }
    }
  }

  canvas.dataset.pw = pw;
  canvas.dataset.ph = ph;
  canvas.dataset.dpi = dpi;
}

// -------------------------------------------------------------
// EXPORT & PRINT
// -------------------------------------------------------------

function downloadPDF() {
  if (!state.front.img && !state.back.img) {
    alert("Please upload a PDF or card image first.");
    return;
  }
  generateA4();
  const { jsPDF } = window.jspdf;
  const c = $("a4Canvas");
  const page = $("pageSize")?.value || "a4";
  const ori = $("orientation")?.value || "portrait";
  const format = page === "a4" ? "a4" : "letter";
  const doc = new jsPDF({ orientation: ori, unit: "mm", format, compress: true });
  const pw = Number(c.dataset.pw) || (page === "a4" ? 210 : 215.9);
  const ph = Number(c.dataset.ph) || (page === "a4" ? 297 : 279.4);
  const dpi = $("dpi")?.value || "300";

  const data = c.toDataURL("image/jpeg", 0.96);
  doc.addImage(data, "JPEG", 0, 0, pw, ph, undefined, "FAST");
  const cardType = ($("cardType")?.value || "card").toLowerCase();
  doc.save(`${cardType}-dual-print-${dpi}dpi-${page}.pdf`);
}

function downloadPNG() {
  if (!state.front.img && !state.back.img) {
    alert("Please upload a PDF or card image first.");
    return;
  }
  generateA4();
  const c = $("a4Canvas");
  const link = document.createElement("a");
  const cardType = ($("cardType")?.value || "card").toLowerCase();
  const dpi = $("dpi")?.value || "300";
  link.download = `${cardType}-dual-print-${dpi}dpi.png`;
  link.href = c.toDataURL("image/png");
  link.click();
}

function printA4() {
  if (!state.front.img && !state.back.img) {
    alert("Please upload a PDF or card image first.");
    return;
  }
  generateA4();
  const c = $("a4Canvas");
  const pw = c.dataset.pw || "210";
  const ph = c.dataset.ph || "297";
  c.style.setProperty("--print-w", `${pw}mm`);
  c.style.setProperty("--print-h", `${ph}mm`);
  window.print();
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------

// PDF Upload Button
$("uploadPdfBtn").onclick = () => $("pdfFileInput").click();
$("pdfFileInput").onchange = e => {
  if (e.target.files && e.target.files[0]) {
    handlePdfFile(e.target.files[0]);
  }
};

// PDF Password Modal Controls
$("submitPdfPasswordBtn").onclick = () => {
  const pwd = $("pdfPasswordInput")?.value || "";
  if (state.pdf.file) {
    handlePdfFile(state.pdf.file, pwd);
  }
};
$("pdfPasswordInput").onkeydown = e => {
  if (e.key === "Enter") {
    $("submitPdfPasswordBtn").click();
  }
};
$("cancelPdfPasswordBtn").onclick = () => {
  if ($("pdfPasswordModal")) $("pdfPasswordModal").style.display = "none";
};

// PDF Split & Swap Controls
$("pdfSplitMode").onchange = applyPdfSplit;
$("swapFrontBackBtn").onclick = swapFrontBack;

// Front Side Upload
$("chooseFrontBtn").onclick = () => $("frontFileInput").click();
$("frontFileInput").onchange = e => loadSideImage("front", e.target.files[0]);
$("frontDropzone").ondragover = e => { e.preventDefault(); $("frontDropzone").classList.add("drag"); };
$("frontDropzone").ondragleave = () => $("frontDropzone").classList.remove("drag");
$("frontDropzone").ondrop = e => {
  e.preventDefault();
  $("frontDropzone").classList.remove("drag");
  if (e.dataTransfer.files) loadBothImages(e.dataTransfer.files);
};
$("rotateFrontBtn").onclick = () => rotateSideImage("front", 90);
$("detectFrontBtn").onclick = () => autoDetectSide("front");
$("removeFrontBtn").onclick = () => removeSideImage("front");

// Back Side Upload
$("chooseBackBtn").onclick = () => $("backFileInput").click();
$("backFileInput").onchange = e => loadSideImage("back", e.target.files[0]);
$("backDropzone").ondragover = e => { e.preventDefault(); $("backDropzone").classList.add("drag"); };
$("backDropzone").ondragleave = () => $("backDropzone").classList.remove("drag");
$("backDropzone").ondrop = e => {
  e.preventDefault();
  $("backDropzone").classList.remove("drag");
  if (e.dataTransfer.files) {
    if (e.dataTransfer.files.length >= 2) loadBothImages(e.dataTransfer.files);
    else loadSideImage("back", e.dataTransfer.files[0]);
  }
};
$("rotateBackBtn").onclick = () => rotateSideImage("back", 90);
$("detectBackBtn").onclick = () => autoDetectSide("back");
$("removeBackBtn").onclick = () => removeSideImage("back");

// Multi-file Quick Upload Bar
$("chooseBothBtn").onclick = () => $("bothFileInput").click();
$("bothFileInput").onchange = e => loadBothImages(e.target.files);
$("resetAllBtn").onclick = resetAll;

// Parameters and Controls
$("cardType").onchange = setProfile;
$("widthMm").oninput = () => { updatePixels(); generateA4(); };
$("heightMm").oninput = () => { updatePixels(); generateA4(); };
$("dpi").onchange = () => { updatePixels(); generateA4(); };
$("copies").oninput = generateA4;

$("layoutArrangement").onchange = generateA4;
$("cutGuide").onchange = generateA4;
$("foldGuide").onchange = generateA4;
$("roundGuide").onchange = generateA4;
$("fitMode").onchange = generateA4;

$("pageSize").onchange = () => { updatePixels(); generateA4(); };
$("orientation").onchange = () => { updatePixels(); generateA4(); };
$("gapMm").oninput = generateA4;
$("marginMm").oninput = generateA4;

if ($("brightness")) {
  $("brightness").oninput = e => {
    const val = Number(e.target.value);
    if ($("brightnessVal")) $("brightnessVal").textContent = `${val > 0 ? "+" : ""}${val}%`;
    generateA4();
  };
}
if ($("contrast")) {
  $("contrast").oninput = e => {
    const val = Number(e.target.value);
    if ($("contrastVal")) $("contrastVal").textContent = `${val > 0 ? "+" : ""}${val}%`;
    generateA4();
  };
}

// Action Toolbar
$("generateBtn").onclick = generateA4;
$("pdfBtn").onclick = downloadPDF;
$("pngBtn").onclick = downloadPNG;
$("printBtn").onclick = printA4;

// Navigation buttons
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".nav-btn").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.section + "Section";
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
});

// Initialize on page load
setProfile();
updatePixels();
generateA4();
