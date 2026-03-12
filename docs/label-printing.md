# One-Click Label Printing (No Dialog)

To print labels directly to your Xprinter XP-T202UA without the system print dialog, use Chrome with **kiosk-printing** and set the label printer as the default printer.

## 1. Set the default printer (Windows)

1. Open **Settings** → **Bluetooth & devices** → **Printers & scanners** (or **Devices and Printers** in Control Panel).
2. Find **Xprinter XP-T202UA** and right-click it.
3. Select **Set as default printer**.

Labels will print to the default printer when using kiosk-printing.

## 2. Run Chrome with kiosk-printing

Chrome must be started with the `--kiosk-printing` flag so that `window.print()` sends the job straight to the default printer with no dialog.

### Option A: Shortcut

1. Right-click the desktop → **New** → **Shortcut**.
2. **Target** (use your actual Chrome path), for example:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing
   ```
   Or if Chrome is in Program Files (x86):
   ```
   "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk-printing
   ```
3. Name the shortcut (e.g. "Chrome POS").
4. Use this shortcut whenever you open the POS. All print actions from this window will go to the default printer without showing the dialog.

### Option B: Command line

From Command Prompt or PowerShell:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing
```

Then open your POS URL in that Chrome window.

## 3. Use the POS

1. Open the POS in the Chrome window you started with `--kiosk-printing`.
2. Go to **Print Labels**, select products and options, then click **Print X Labels**.
3. The labels are sent to the Xprinter with no print dialog.

## Notes

- Only that Chrome window (and any windows opened from it) use kiosk-printing. Other Chrome windows behave normally.
- If you open the POS in a normal Chrome window, the usual print dialog will still appear.
- This applies to Chrome and Chromium-based browsers (e.g. Edge with the equivalent flag, if supported).
