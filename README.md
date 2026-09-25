# VigneshArts

A portfolio website for **Vignesh** ([@mr_un_vi](https://instagram.com/mr_un_vi)), a pencil sketch and portrait artist. The work blends pop culture icons with fine art shading.

Built with plain **HTML, CSS and JavaScript**. There are no frameworks, no libraries and no build step.

---

## ✨ Features

- **Opening screen:** "VigneshArts" in large type. The letters rise in, a gold pencil line draws itself underneath, and pencils float around the name.
- **Scroll animations:** headings build letter by letter, text rises in word by word, and the artist's photo slides in to meet the text. Everything is tied to the scroll position, so it reverses when you scroll back up.
- **Art grid:** each tile flies in from a different side with a slight 3D tilt, and each row lands in a wave.
- **Moving pencils:** the pencils sway, tilt with scroll speed, shift with the mouse, and get pushed away when a cursor or finger comes close.
- **Picture viewer:**
  - Opens by zooming out from the picture you clicked.
  - Swipe or use the arrow keys to move between pictures.
  - Pinch or double-tap to zoom.
  - Swipe down to close.
  - Includes a thumbnail strip.
- **Works on any screen:** tuned for phones, tablets, phones held sideways and desktops, and never scrolls sideways.
- **Accessible:**
  - All interactive parts work with the keyboard.
  - Focus stays inside the picture viewer while it's open.
  - Animations are turned off for visitors who set their device to reduce motion.

---

## 📁 Project Structure

```
├── index.html      # Home: opening screen, art grid, about, contact
├── gallery.html    # Full gallery page
├── style.css       # All styles and responsive layouts
├── script.js       # Scroll animations, pencils, picture viewer
└── assets/         # Artwork and the artist's photo
```

---

## 🚀 Run Locally

No install needed. Serve the folder with any static server:

```bash
git clone https://github.com/sanketh908/vignesh-Arts.git
cd vignesh-Arts
python3 -m http.server 8000
```

Then open **http://localhost:8000**.

> Opening `index.html` directly (`file://`) works too, but a local server matches how it behaves when hosted.

---

## 🖼️ Adding New Artwork

1. Resize the image to about **2400px on the long edge** so it loads fast (phone photos are often 5–10 MB), and put it in `assets/`.
2. Add one line to the grid in `index.html` and to the grid in `gallery.html`:

```html
<figure class="g-item tile"><img src="assets/your-image.jpg" alt="Artwork 20" width="1800" height="2400" data-lb loading="lazy"></figure>
```

The number caption, fly-in animation and picture viewer are all added automatically.

---

## 🌐 Deploy

It's a static site, so it can be hosted for free on:

- **GitHub Pages:** Settings → Pages → deploy from the `main` branch
- **Netlify** or **Vercel:** drag and drop the folder, or connect the repo

---

## 📬 Contact

Interested in the artwork or commissions?

- 📧 Email: [vacharya2006@gmail.com](mailto:vacharya2006@gmail.com)
- 📸 Instagram: [@mr_un_vi](https://instagram.com/mr_un_vi)

---

© 2026 VigneshArts. All rights reserved.
