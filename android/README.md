# Print Bridge (Android)

Android app that polls the POS SkyGlow server for pending print jobs and sends receipts to a paired Bluetooth thermal printer (ESC/POS).

## Flow

1. **POS** creates a row in `print_jobs` after each sale (fire-and-forget POST).
2. **Print Bridge** polls `GET /api/print-jobs/pending?token=...&company_id=...`; server atomically marks jobs as `printing` and returns them.
3. App opens Bluetooth RFCOMM to the configured printer, builds ESC/POS from the payload, sends, then calls `PUT /api/print-jobs/:id` with `status: done` or `failed`.

## Setup

1. Open the `android` folder in Android Studio (or run `./gradlew wrapper` then `./gradlew assembleDebug` from this directory).
2. In the app: **Settings** — set Server URL (e.g. `https://your-pos.com`), Print API Token (from POS web Settings → Print Bridge), Company ID (usually `1`), and optionally Shop name.
3. **Settings → Select printer** — choose a paired Bluetooth thermal printer.
4. **Start polling** — starts the foreground service that polls every 5 seconds and prints claimed jobs.

## Build

From this directory, after generating the wrapper:

- `./gradlew assembleDebug` — build APK (output in `app/build/outputs/apk/debug/`).
- Or open in Android Studio and Run.

## Permissions

- **Bluetooth** — to connect to the printer (runtime permission on Android 12+).
- **Internet** — to call the POS API.
- **Foreground service** — for the polling service.
- **Boot completed** — optionally start the service on boot if the app is configured.

## Parts implemented

- **Part 1–2** (backend): `print_jobs` table + API (POST create, GET pending with atomic claim, PUT status); Settings Print API Token; POSClient POST after sale.
- **Part 3**: Android project, `AppPreferences`, Settings screen (server URL, token, company ID, shop name).
- **Part 4**: Printer selection UI (paired BT devices), `PrintService` foreground polling.
- **Part 5**: Bluetooth RFCOMM + ESC/POS receipt building + PUT job done/failed.
- **Part 6**: Main screen (status, printer, Start/Stop, log); `BootReceiver` to start service on boot when configured.
