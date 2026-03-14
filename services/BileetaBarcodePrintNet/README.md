# Xprinter – Barcode Print (.NET 9)

HTTP API service (exposed as **Xprinter**) that sends barcode label data to a local printer. Compatible with the legacy BarcodePrint Windows Service API (same endpoints and payload).

**Base URL:** `http://localhost:8083/Xprinter/` (on the same machine). All API calls are under this path. From another device on the same network, use `http://<PC_IP>:8083/Xprinter/`. The service listens on all interfaces (`0.0.0.0:8083`). If Windows Firewall blocks the connection, add an inbound rule to allow TCP port 8083.

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/Xprinter/Values/Test` | Health check; returns `"Success 1"` |
| GET | `/Xprinter/Values/Status` | Returns service and printer status (for Printer Config dialog). |
| GET | `/Xprinter/Values/CheckPrinter` | Runs a test feed and checks for errors; returns `{ ok, message }`. |
| GET | `/Xprinter/Values/LineFeed` | Sends an empty line to the printer (paper/label feed). Returns `"OK"` on success. |
| POST | `/Xprinter/Values/PrintRequest` | Send barcodes to printer. Body: JSON array of `BarcodeTemplate`. Returns `true` on success. |
| POST | `/Xprinter/Values/PrintPngRequest` | Same body as PrintRequest. Renders each label as the same image as the PNG preview, converts to TSPL BITMAP, and sends to the printer. Use when you want printed output to match the preview exactly (e.g. one-by-one printing). |
| POST | `/Xprinter/Values/PreviewRequest` | Same body as PrintRequest. Builds TSPL and saves to a file (no printer). Also renders each label to PNG and saves in the PreviewPng folder. Returns `{ savedPath, savedPngPaths }`. Use when printer is off to verify or print the PNG. |

## Configuration

Edit `appsettings.json` (or use environment variables):

```json
{
  "BarcodePrint": {
    "PrinterName": "",
    "PrinterFilePath": "C:\\BileetaBarcode\\Printer.txt",
    "PrinterComPort": "",
    "TemplateBasePath": "C:\\BileetaBarcode\\BarcodeTemplate\\Source",
    "UsePrinterFile": true
  }
 }
```

- **UsePrinterFile** `true`: printer name is read from the file at **PrinterFilePath** (one line = Windows printer share name, e.g. `XP-T202UA`).
- **UsePrinterFile** `false`: use **PrinterName** directly (e.g. `XP-T202UA` for Xprinter XP-T202UA).
- Set **PrinterName** or the contents of **Printer.txt** to your printer’s share name (e.g. `Xprinter XP-T202UA`). Use the **exact** name from Windows Settings → Printers. If the name is wrong, the first print may not show in the queue and "Print test page" may reprint the last label. The service sends output to `\\localhost\<PrinterName>`.
- **PrinterComPort** (optional): When set (e.g. `COM3`), the service sends TSPL **directly to the COM port** for PrintRequest, bypassing the Windows spooler — avoids XP-T202UA ghost jobs. Also used for direct status query via ZPL `~HS` if supported. Find the port in Device Manager → Ports (COM & LPT). Leave empty to use Windows printer (spooler) only.
- **TemplateBasePath**: folder containing template files (e.g. `50mm25mm.txt`, `50mmx25mm.lbl`). The service also looks in the **parent** of this folder (e.g. `C:\BileetaBarcode\BarcodeTemplate` if TemplateBasePath is `...\BarcodeTemplate\Source`).
- **PrintRequestInitialDelayMs** (optional, default 2000): Milliseconds to wait at the start of each PrintRequest before writing. Increase if the printer sometimes prints the previous label.
- **PostPurgeDelayMs** (optional, default 500): Milliseconds to wait after purging the print queue so the USB driver can settle; helps avoid XP-T202UA ghost jobs.
- **PrependResetBeforePrint** (optional, default `true`): When true, prepends TSPL `~R` (XPrinter soft reset) before each label to flush the printer internal buffer; set to `false` to disable.
- **PrintRequestDelayAfterCopyMs** (optional, default 1000): Milliseconds to wait after each file copy to the printer before the next copy or response. Increase if multiple labels in one request get mixed up.
- **Print path:** The service sends label data using the **Windows raw print API** (StartDocPrinter / WritePrinter with datatype RAW), not by copying a file to `\\localhost\PrinterName`. So only the current job is sent — same behaviour as when you select a file and print in Windows. No temp file is used for printing; the previous "old label first" issue from file copy is avoided.
- **SendClearBeforePrint** (optional, default `false`): If `true`, before sending your labels the service sends a small "clear buffer" job (CLS + PRINT 1,1) so the printer flushes any previous barcode. Uses one blank label per request. Default is `false` so the real label is not skipped; if you see the previous barcode printing again, set to `true` and consider increasing **ClearBeforePrintDelayMs** to 5000–6000 so the real label is sent after the clear job finishes.
- **ClearBeforePrintDelayMs** (optional, default 5000): After sending the clear-buffer job, wait this many milliseconds before sending the real labels. Increase (e.g. 6000) if the real label does not print when SendClearBeforePrint is true.
- **MapBarcodeType12ToEAN13** (optional, default `true`): When the POS sends BarcodeType "12" (EAN-13), the service can map it to "EAN13" in the TSPL. Set to `false` to send "12" as-is (use for XP-T202UA if it expects numeric "12" for EAN-13 and prints wrong with "EAN13").
- **UseFileCopyForPrint** (optional, default `false`): When `false`, the service uses the **Windows raw print API** (WritePrinter), which creates a real job in the print queue. When `true`, the service writes TSPL to a **unique temp file per label** (e.g. `BileetaBarcode_<requestId>_<item>_<copy>.txt` in the system temp folder), copies it to `\\localhost\PrinterName`, then deletes the temp file. Using a unique file per label avoids the driver sending a previous request’s data (e.g. first request not printing, second request then printing the first request’s label). On some setups file copy does not create a queue job; then set to `false` or share the printer.
- **PreviewOutputPath** (optional, default `C:\BileetaBarcode\Preview`): Folder where PreviewRequest saves the built TSPL file. Create this folder if it does not exist. Open the saved `.txt` file with Notepad or other software to verify without printing.
- **PreviewPngOutputPath** (optional, default `C:\BileetaBarcode\PreviewPng`): Folder where PreviewRequest saves PNG images of each label (one PNG per label). Used when calling PreviewRequest so you can view or print the label as an image.

**PrintPngRequest:** Use **PrintPngRequest** when you want the printed label to look exactly like the PNG preview (same layout: barcode, barcode number, price). The service renders each label to a bitmap, converts it to TSPL BITMAP, and sends it to the printer. Same purge, delays, and PrependResetBeforePrint as PrintRequest. Use for one-by-one printing when the template-based PrintRequest output does not match the preview.
- **SaveLastSentToPath** (optional): If set (e.g. `C:\BileetaBarcode\Debug`), after each label the service writes the exact TSPL sent to the printer to `last-sent.txt` in this folder. Open that file after printing to confirm the barcode and price the service sent. If `last-sent.txt` shows the correct data but the label shows something else, the issue is likely the printer queue or driver (e.g. previous job). Leave empty to disable.

### Xprinter XP-T202UA (2/3 inch label series)

The **Xprinter XP-T202UA** (芯烨) is a dual-mode thermal printer: **label mode** (TSPL) and **receipt mode** (ESC/POS). For barcode labels use **label mode**. Specs: 203 DPI, 48 mm print width, 576 KB Flash/RAM, USB (optional Wi‑Fi/Bluetooth/LAN). Supports CODE128, EAN-13, QR and other 1D/2D barcodes.

- **Official product page:** [xprinter.net/product/498](https://www.xprinter.net/product/498.html) (XP-T202UA).
- **Drivers and manuals:** [xprinter.net](https://www.xprinter.net/) → 驱动下载 → **2/3寸标签驱动** (2/3 inch label driver); **开发包/编程手册** (development package / programming manual) includes SDK docs for 58/80/**2/3 inch label** series (Windows SDK may contain TSPL details).
- **User manual / FAQ:** 服务支持 → **2/3寸标签系列常见问题** (e.g. self-test, mode switch, paper loading). Mode switch: 模式切换方法 — ensure the printer is in **label (TSPL) mode**, not receipt mode.
- **Printer-side config:** There is **no published DIP switch or menu option** on the XP-T202UA to “clear buffer” or “disable keeping previous barcode.” Buffer clearing is done by **TSPL**: the `CLS` command clears the image buffer. This service uses **SendClearBeforePrint** (sends `CLS` + `PRINT 1,1` before your labels) so the printer does not reprint the previous barcode. If you need different behaviour, adjust **PrintRequestInitialDelayMs** and **ClearBeforePrintDelayMs** in `appsettings.json`, or contact Xprinter support: **400-613-9828** / csm-zhuhai@300.cn.

**XP-T202UA spooler ghost job (first request does not print, next request prints the previous label):** The XP-T202UA USB driver can hold a job in its internal buffer so it never appears in the Windows queue and only prints when the next job is sent. The service applies these mitigations by default: (1) **PrependResetBeforePrint** — prepends TSPL `~R` (XPrinter soft reset) before each job to flush the printer buffer. (2) **PostPurgeDelayMs** — 500 ms delay after purging the queue so the USB driver can settle. (3) **PrinterComPort** — if set (e.g. `COM3`), the service sends TSPL directly to the COM port instead of the Windows spooler, bypassing ghost jobs entirely. Find the port in Device Manager → Ports (COM & LPT). (4) **SendClearBeforePrint** — set to `true` to send a blank label before each request; uses one extra label but forces a flush. Recommended: keep PrependResetBeforePrint and PostPurgeDelayMs; if the issue persists, set **PrinterComPort** to your printer's COM port.

**You must define print templates for PrintRequest to work:**

1. Create the template folder on the PC where the service runs (if it does not exist), e.g. `C:\BileetaBarcode\BarcodeTemplate\Source`, or use the parent `C:\BileetaBarcode\BarcodeTemplate`.
2. Place a template file in that folder (or in the parent of Source). The service looks for any of these names in **TemplateBasePath** or its parent:
   - `50mm25mm.txt` or `50mmx25mm.txt` (template ID 1/18) — **barcode + price only**.
   - `30mm20mm.txt` or `30mmx20mm.txt` (template ID **20**) — for 30×20 mm labels; use when printing 30×20 from the POS (label size “30×20”).
   - `50mm25mm.lbl` or `50mmx25mm.lbl` (same; **must be plain-text TSPL** with placeholders, not a binary format)
   - For template ID 6: `50mm25mmWoExp.txt` / `50mmx25mmWoExp.lbl`, etc.
   - Copy the sample from the project: `BileetaBarcodePrintNet\TemplateSource\50mm25mm.txt` into your TemplateBasePath (or its parent).
3. Templates are TSPL text. Placeholders `@Barcode`, `@Price`, `@ItemCode`, `@Des1`, `@Des2`, `@Qty`, etc. are replaced by the service. The included `50mm25mm.txt` uses only `@Barcode` and `@Price` for a simple barcode + price label. If you use a `.lbl` file, it must be **plain text** (TSPL), not a binary format.

If no template file is found, **PrintRequest** returns 500 with a message. LineFeed works without templates.

**Troubleshooting — wrong barcode or price printed (e.g. you send 786982515592 @ Rs 200 but printer outputs 4792081022427 @ Rs 1000):**

1. **Confirm what the service sent:** Set **SaveLastSentToPath** in `appsettings.json` (e.g. `C:\BileetaBarcode\Debug`), restart the service, print one label, then open `C:\BileetaBarcode\Debug\last-sent.txt` in Notepad. Check whether the file contains the barcode and price you sent (e.g. `786982515592` and `200.00`) or the wrong ones. Alternatively use **PreviewRequest** (same JSON body as PrintRequest): the saved preview file shows the TSPL the service would send; no printer is used.
2. **If last-sent.txt (or preview) is correct:** The service is sending the right data; the wrong label is likely from a previous job (driver/queue). Try: (a) Purge the printer queue before printing (Settings → Printer Config → the service calls purge at the start of each request), (b) avoid double-clicking Print so only one job is sent, (c) ensure no other app is printing to the same printer.
3. **If last-sent.txt shows the wrong barcode/price:** There may be a bug in template or replacement; ensure **TemplateBasePath** points to the folder that has the correct `30mm20mm.txt` (or the template for the template ID you use) and that the template uses placeholders `@Barcode`, `@Price`, etc., not hardcoded values.

**Troubleshooting — "print command sent" but nothing prints and queue shows "No print jobs":** The service hands the job to the Windows spooler; if the queue is always empty and nothing prints, try: (1) **Printer properties → Advanced**: If **"Print directly to the printer"** is checked, jobs bypass the queue and go straight to the device. Uncheck it so jobs go through the spooler (they will appear in the queue and errors may be visible). (2) Confirm the **Print Queue** window is for **Xprinter XP-T202UA** (use the Printers dropdown). (3) Try **UseFileCopyForPrint** = `true` and ensure the printer is **shared** (Sharing tab → Share this printer); then the service copies a file to `\\localhost\PrinterName` and a job may appear. (4) Check the service log after the request: it now logs "spooler job check: no error reported" or the spooler error if the driver reported one.

**Troubleshooting — label shows barcode but no price:** (1) Ensure your template file contains a TEXT line with the `@Price` placeholder. (2) The service picks the file by **name**: for template ID 1 it loads `50mm25mm.txt`; for template ID 20 (30×20 mm) it loads `30mm20mm.txt`. If you use 30×20 labels, save your template as **30mm20mm.txt** and choose label size **30×20** in the POS so it sends template ID 20. Copy the project’s `TemplateSource\30mm20mm.txt` or `50mm25mm.txt` into **TemplateBasePath** (or its parent) as needed.

**Label Designer (web):** In the AWMS UI, open **Settings → Printer Config** and click **Generate print template** to open the built-in label designer. There you can set label size (width/height in mm), add text and barcode elements with placeholders, drag to position them, and **Export .lbl** to download a TSPL file. Copy the downloaded file to the TemplateBasePath folder (or its parent) on the PC where the BarcodePrint service runs.

## Designing the .lbl / .txt template

The template must be **plain text** containing **TSPL** (TSC printer command language). Your printer (e.g. TTP-244 Pro) understands TSPL.

### Option 1: Use a text editor (simplest)

1. Copy the sample template and edit it:
   - From the project: `BarcodePrint\BileetaBarcodePrintNet\TemplateSource\50mm25mm.txt`
   - Save as `50mm25mm.txt` or `50mmx25mm.lbl` in `C:\BileetaBarcode\BarcodeTemplate\` (or `...\Source`).

2. **TSPL commands** (one per line):
   - `SIZE 50 mm, 25 mm` – label width and height (match your roll).
   - `GAP 2 mm, 0 mm` – gap between labels (or `GAP 0,0` for continuous).
   - `DIRECTION 1` – print direction.
   - `CLS` – clear buffer.
   - `TEXT x,y,"font",rotation,x-mul,y-mul,"content"` – text at (x,y). Use placeholders in the last argument.
   - `BARCODE x,y,"type",height,readable,rotation,narrow,wide,"data"` – barcode; use `"@Barcode"` for the data.
   - `PRINT 1,1` – print 1 copy, 1 set.

3. **Placeholders** (the service replaces these with real data):

   | Placeholder | Replaced with |
   |-------------|----------------|
   | `@Barcode`  | Barcode number |
   | `@ItemCode` | Product code   |
   | `@Des1`     | First 35 chars of product description |
   | `@Des2`     | Rest of description (if longer than 35) |
   | `@Price`    | Selling price  |
   | `@Qty`      | Quantity       |
   | `@Count`    | NoOfBarcode    |
   | `@Mdf`      | Manufacture date |
   | `@Exp`      | Expiry date    |
   | `@BatchNo`  | Batch number   |
   | `@bt`       | Barcode type (same as @BarcodeType after mapping) |
   | `@BarcodeType` | TSPL barcode type. The POS sends "12" (EAN-13) or "128" (Code 128). By default the service maps "12" → "EAN13". Set **MapBarcodeType12ToEAN13** to `false` in config to send "12" as-is (e.g. for XP-T202UA if it expects numeric "12"). |

   Example line: `TEXT 20,20,"2",0,1,1,"@ItemCode"` → prints the product code at position (20,20).

4. Adjust **x, y** and font size to fit your layout. Coordinates are in dots (e.g. 20 ≈ 20 dots from left/top).

### Option 2: Use TSC label design software

If you use **TSC’s label design software** (e.g. TSPL Designer, or software that came with the printer):

1. Design the label visually (text, barcode, etc.).
2. Export or save the layout as **TSPL** (plain text), not as a binary .lbl project.
3. In the exported TSPL file, replace fixed values with the placeholders above (e.g. replace the barcode data with `@Barcode`, product code with `@ItemCode`).
4. Save that file as `50mm25mm.txt` or `50mmx25mm.lbl` (plain text) in the template folder.

If the software only saves a **binary** .lbl project, it cannot be used directly; use Option 1 or export TSPL from the software if available.

### Reference: 50×25 mm sample (plain text)

```
SIZE 50 mm, 25 mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
TEXT 20,20,"2",0,1,1,"@ItemCode"
TEXT 20,45,"2",0,1,1,"@Des1"
TEXT 20,70,"2",0,1,1,"@Des2"
BARCODE 20,95,"128",50,1,0,2,2,"@Barcode"
TEXT 20,160,"2",0,1,1,"Qty: @Qty  Price: @Price"
PRINT 1,1
```

For more TSPL commands (fonts, sizes, other barcode types), see TSC’s TSPL programming manual for your printer model.

## Run (development)

From the project folder:

```powershell
cd BileetaBarcodePrintNet
dotnet restore
dotnet run
```

Then open: http://localhost:8083/Xprinter/Values/Test

## Run as a Windows Service

1. **Publish**
   ```powershell
   dotnet publish -c Release -o C:\Services\BileetaBarcodePrint
   ```

2. **Create the service** (run PowerShell or CMD as **Administrator**)
   ```powershell
   sc create "BileetaBarcodePrint" binPath="C:\Services\BileetaBarcodePrint\BileetaBarcodePrintNet.exe" start=auto
   ```

3. **Start**
   ```powershell
   sc start BileetaBarcodePrint
   ```

4. **Stop / Remove**
   ```powershell
   sc stop BileetaBarcodePrint
   sc delete BileetaBarcodePrint
   ```

Or use **services.msc** → find **BileetaBarcodePrint** → Start/Stop.

## Supported template IDs (PrintRequest)

- **1**, **18**: 50mm×25mm (with expiry) – uses `50mm25mm.txt`
- **6**: 50mm×25mm no expiry – uses `50mm25mmWoExp.txt`

Other template IDs fall back to `50mm25mm.txt`. Add more in `ValuesController.cs` if needed.
