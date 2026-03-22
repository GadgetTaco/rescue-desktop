# RESCUE NextGen™ Desktop App
**GadgetTaco LLC — Internal Build Instructions**

A thin Electron wrapper that delivers RESCUE NextGen™ as a proper Windows desktop
application. One universal build works at every site — no per-site configuration needed.

---

## How It Works

The app connects to `http://192.168.50.1/rescue` — the NUC IP is the same at every
site. On startup it fetches the site name from the AWARE health endpoint
(`http://192.168.50.1:8080/api/v1/health`) and displays it in the titlebar automatically.
If the NUC isn't reachable yet, the site label is hidden gracefully until the app connects.

```
Titlebar: [icon] RESCUE NextGen™ | MT Kingswells   ● Online   [RESCUE Dashboard ↗] [─][□][✕]
```

---

## Prerequisites (on Mac, one time)

```bash
node --version          # needs v18+  (confirmed v24.4.0 ✓)
brew install imagemagick  # for icon conversion
```

---

## Icon Setup (One Time)

```bash
cd "/Volumes/Dock HD/GitHub/rescue-desktop/assets"

# Convert SVG → PNG
rsvg-convert -w 512 -h 512 rescue-icon.svg -o rescue-icon.png
# OR: brew install librsvg first

# Convert PNG → ICO (multi-resolution for Windows)
convert rescue-icon.png \
  -define icon:auto-resize=256,128,64,48,32,16 \
  rescue-icon.ico

# Or just upload rescue-icon.svg to https://convertio.co/svg-ico/
```

Create `assets/LICENSE.rtf`:
```
{\rtf1\ansi Copyright (c) 2025 GadgetTaco LLC. All rights reserved. RESCUE NextGen is a trademark of Maersk Training Inc. AWARE is a trademark of GadgetTaco LLC.}
```

---

## Build (One Universal Installer)

```bash
cd "/Volumes/Dock HD/GitHub/rescue-desktop"
npm install         # first time only
npm run dev         # test locally on Mac
npm run dist        # → dist/RESCUE-NextGen-Setup-1.0.0.exe
```

**The same `.exe` installs on every tablet at every site.** No configuration needed.
The site name appears automatically once the tablet connects to the NUC.

---

## Deploy

1. Copy `dist/RESCUE-NextGen-Setup-1.0.0.exe` to USB
2. Run on each Surface tablet — installs like any Windows app
3. Connect tablet to `AWARE-Training-Site` WiFi
4. Open **RESCUE NextGen** from desktop

---

## File Structure

```
rescue-desktop/
├── main.js           ← Electron main process (NUC IP hardcoded: 192.168.50.1)
├── preload.js        ← Secure IPC bridge
├── app.html          ← Titlebar + iframe (fetches site name from NUC at startup)
├── package.json      ← electron-builder config
├── README.md         ← This file
└── assets/
    ├── rescue-icon.svg    ← Source (vector, from aware-docs/branding/rescue/)
    ├── rescue-icon.ico    ← Windows (create from SVG)
    ├── rescue-icon.png    ← PNG fallback
    └── LICENSE.rtf        ← Installer license text
```

---

## Updating

- **RESCUE app updated on NUC** → nothing to do, tablets get it automatically
- **New desktop app version** → bump version in package.json, `npm run dist`, redistribute .exe
- **NUC IP changes at a site** → update `NUC_IP` in `main.js` and `app.html`, rebuild

---

*Maintained by Jeff Skinner — GadgetTaco LLC*
*ClickUp: https://app.clickup.com/t/86agbxyy4*
