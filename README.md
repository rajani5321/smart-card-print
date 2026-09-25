# Smart Card Print Studio - PDF Auto-Detect, Dual Sided & Self-Cut

A high-definition, browser-based smart card printing and self-cut utility for identity cards (Aadhaar, PAN, Voter ID, Driving Licence, Ayushman Card, and custom cards).

## Key Features

### 1. 📄 One-Click PDF Auto-Detection (e-Aadhaar / e-PAN / e-Card)
- **Direct PDF Upload**: Upload any official e-Aadhaar, e-PAN, Ayushman (PMJAY), or Voter ID PDF.
- **Automatic 300 DPI Rasterization**: PDF.js vector engine renders the PDF at crystal-clear commercial 300 DPI resolution.
- **Card Boundary Detection**:
  - Automatically identifies the card rectangle in the bottom section of official e-Aadhaar and e-PAN sheets.
  - Automatically splits the card: **Left half = Front Side**, **Right half = Back Side**.
- **Password-Protected PDF Support**:
  - Official e-Aadhaar PDFs are encrypted by UIDAI. If an encrypted PDF is uploaded, a clean prompt asks for your password (First 4 letters of Name in CAPS + Year of Birth, e.g. `RAJA1995`) and unlocks it directly in your browser.
- **Split & Swap Controls**:
  - Toggle between **Side-by-Side (Left/Right)**, **Stacked (Top/Bottom)**, or **2 Pages (Page 1 & 2)**.
  - One-click **⇄ Swap Sides** button if sides need reversal.

### 2. Dual-Sided Card Printing (Front & Back on 1 Sheet)
- **Upload 2 Images at Once**: Drag & drop two image files simultaneously or click **"Upload 2 Images (Front & Back)"**.
- **Separate Dropzones**: Individual dropzones and file pickers for **Front Side** and **Back Side**.
- **Individual Controls**: Rotate 90° and OpenCV auto-deskew separately for each side.

### 3. Self-Cut & Fold Guides
- **Foldable Side-by-Side (Self-Cut & Fold)**:
  - Joins Front and Back horizontally ($171.20 \times 53.98\text{ mm}$).
  - Adds a subtle **Center Fold Guide Line** with tick marks and `✂ FOLD` indicators.
  - Simply cut around the 4 outer crop marks, fold down the center, and insert into a lamination pouch!
- **Foldable Top-to-Bottom**: Front on top, Back on bottom for vertical folding.
- **Separate Cards**: Front and Back spaced with gap for individual cutting.
- **Precision Corner Crop Marks (Trim Marks)**:
  - Commercial printing L-marks offset 1.5mm outside the card corners for razor-sharp scissor or rotary trimmer cuts without borders showing on the card.
- **CR80 3.18mm Corner Radius Guides**:
  - Shows standard smart card rounded corners for corner rounding punches.

### 4. High-Definition 300 & 600 DPI Output
- True DPI scaling ($\text{scale} = \text{DPI} / 25.4$):
  - A4 sheet at 300 DPI: **$2,480 \times 3,508\text{ px}$**.
  - Card at 300 DPI: **$1,011 \times 638\text{ px}$** per side.
- High-quality bicubic smoothing (`imageSmoothingQuality = "high"`).
- Proportional Fit Modes: **Fit & Fill (Cover)**, **Fit Entire Image (Contain)**, and **Stretch**.
- Real-time **Brightness** and **Contrast** adjustments.

### 5. Export & Print
- **📄 Download PDF**: Vector-positioned 300 DPI PDF ready for printing.
- **🖼️ Download High-Res PNG**: Lossless image of the entire A4 sheet.
- **🖨️ Print Directly**: Custom `@page` CSS margins ensuring 100% actual physical size.

## How to Run
Open `index.html` in Chrome or Edge, or start a local server:
```bash
python -m http.server 8080
```
Open `http://localhost:8080`.

## Printing & Self-Cut Instructions
1. Click **"📄 Upload PDF"** and select your e-Aadhaar or e-PAN PDF.
2. If prompted, enter your PDF password (e.g., `RAJA1995`).
3. The app automatically extracts the card, splits Front and Back, and renders the Foldable Side-by-Side layout.
4. In the print dialog, select **Scale: Actual Size (100%)** and **Margins: None**.
5. Cut along the outer crop marks, fold along the center guide line, and laminate your double-sided smart card!
