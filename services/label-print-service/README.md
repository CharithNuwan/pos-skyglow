# Label print service (Windows)

This service runs on the PC connected to the Xprinter. It polls the POS API for **label** print jobs, renders them to PDF, and sends them to the default (or specified) printer with **no dialog**. Use **Print via service** in the Print Labels UI after creating a print API token in Settings.

## Requirements

- **Windows** (uses `pdf-to-printer`, which is Windows-only)
- **Node.js 18+**
- Same **print API token** as used for the Android receipt printer (Settings → Print API token)
- **Xprinter** set as default printer, or set `PRINTER_NAME` (e.g. `Xprinter_XP_T202UA`)

## Config (environment variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | Yes | POS API base URL (e.g. `https://yge.omega.vercel.app`) |
| `PRINT_API_TOKEN` | Yes | Same token as in Settings → Print API token |
| `COMPANY_ID` | No | Default `1` |
| `POLL_INTERVAL_MS` | No | Default `5000` (5 seconds) |
| `PRINTER_NAME` | No | Printer name (e.g. `Xprinter_XP_T202UA`). If unset, uses default printer |

## Run once (console)

```bash
cd services/label-print-service
npm install
set API_BASE_URL=https://your-pos-url.com
set PRINT_API_TOKEN=your-token
node index.js
```

## Run as a Windows service (NSSM)

1. Install [NSSM](https://nssm.cc/download) (or use Chocolatey: `choco install nssm`).
2. Open an **Administrator** Command Prompt or PowerShell.
3. Install the service (adjust paths and env):

```bat
nssm install LabelPrintService "C:\Program Files\nodejs\node.exe" "C:\path\to\pos-skyglow\services\label-print-service\index.js"
nssm set LabelPrintService AppDirectory "C:\path\to\pos-skyglow\services\label-print-service"
nssm set LabelPrintService AppEnvironmentExtra "API_BASE_URL=https://your-pos-url.com" "PRINT_API_TOKEN=your-token" "COMPANY_ID=1"
nssm start LabelPrintService
```

4. To use a specific printer instead of the default:

```bat
nssm set LabelPrintService AppEnvironmentExtra "API_BASE_URL=..." "PRINT_API_TOKEN=..." "PRINTER_NAME=Xprinter_XP_T202UA"
```

5. Uninstall when not needed:

```bat
nssm stop LabelPrintService
nssm remove LabelPrintService confirm
```

## Flow

1. User clicks **Print via service** in the app → POS creates a `type: 'label'` job in the API.
2. This service polls `GET /api/print-jobs/pending`, gets label jobs.
3. For each job it builds label HTML (barcodes via `bwip-js`), renders to PDF with Puppeteer, prints via `pdf-to-printer`, then marks the job done with `PUT /api/print-jobs/:id`.

No browser or print dialog is involved on the PC; the Xprinter receives the job directly.
