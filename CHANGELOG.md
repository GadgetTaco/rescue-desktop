# Changelog

## [1.2.3] - 2026-05-22
### Changed
- **Slim wrapper** - app.html reduced from ~400 lines to 44. Removed splash screen, titlebar, hamburger menu, system health dots, offline overlay, hz-top/hz-corner hotzone divs, swipe gesture detection, and health polling loop. RESCUE NextGen frontend now owns 100% of visible UI with no competing Electron UI layers.
- **postMessage bridge** - update:ready IPC event is now relayed into the RESCUE iframe via postMessage so the RESCUE avatar badge reflects pending updates. RESCUE iframe can postMessage quit/installUpdate back to Electron.

### Added
- **Popup blocker** - setWindowOpenHandler denies all new-window/popup requests.

### Fixed  
- **Touch conflict resolved** - Removed hz-corner (80x60px invisible overlay in top-right) that was intercepting touches intended for the RESCUE AppHeader user avatar.

## [1.2.2] - 2026-05-22
### Fixed
- Move hz-corner hotzone from top-right to top-left to stop intercepting avatar taps.

## [1.2.1] - 2026-05-22
### Added
- Initial stable release with kiosk mode, WiFi enforcement, auto-updater, health display.
