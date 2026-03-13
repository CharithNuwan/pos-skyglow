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
- Set **PrinterName** or the contents of **Printer.txt** to your printer’s share name (e.g. `XP-T202UA`). The service sends output to `\\localhost\<PrinterName>`.
- **PrinterComPort** (optional): COM port for direct status query (e.g. `COM3`). Use this for TSPL/ZPL-compatible printers (e.g. TTP-244 Pro) connected via **RS-232** or a virtual COM port so the app can detect paper out/error via the ZPL `~HS` command. If the printer is connected only via USB, it may not appear as a COM port in Windows—use RS-232 or check if your model has a USB virtual COM driver. Leave empty to use Windows printer status only.
- **TemplateBasePath**: folder containing template files (e.g. `50mm25mm.txt`, `50mmx25mm.lbl`). The service also looks in the **parent** of this folder (e.g. `C:\BileetaBarcode\BarcodeTemplate` if TemplateBasePath is `...\BarcodeTemplate\Source`).

**You must define print templates for PrintRequest to work:**

1. Create the template folder on the PC where the service runs (if it does not exist), e.g. `C:\BileetaBarcode\BarcodeTemplate\Source`, or use the parent `C:\BileetaBarcode\BarcodeTemplate`.
2. Place a template file in that folder (or in the parent of Source). The service looks for any of these names in **TemplateBasePath** or its parent:
   - `50mm25mm.txt` or `50mmx25mm.txt` (template ID 1/18) — the project’s sample is **barcode + price only** (one BARCODE, one TEXT line with `@Price`).
   - `50mm25mm.lbl` or `50mmx25mm.lbl` (same; **must be plain-text TSPL** with placeholders, not a binary format)
   - For template ID 6: `50mm25mmWoExp.txt` / `50mmx25mmWoExp.lbl`, etc.
   - Copy the sample from the project: `BileetaBarcodePrintNet\TemplateSource\50mm25mm.txt` into your TemplateBasePath (or its parent).
3. Templates are TSPL text. Placeholders `@Barcode`, `@Price`, `@ItemCode`, `@Des1`, `@Des2`, `@Qty`, etc. are replaced by the service. The included `50mm25mm.txt` uses only `@Barcode` and `@Price` for a simple barcode + price label. If you use a `.lbl` file, it must be **plain text** (TSPL), not a binary format.

If no template file is found, **PrintRequest** returns 500 with a message. LineFeed works without templates.

**Troubleshooting — label shows barcode but no price:** Ensure your template file contains a TEXT line that uses the `@Price` placeholder (e.g. `TEXT 20,160,"2",0,1,1,"Rs @Price"`). Copy the project’s `TemplateSource\50mm25mm.txt` into the folder set by **TemplateBasePath** (or its parent), overwriting any existing file. The included sample is barcode + price only.

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
   | `@bt`       | Barcode type   |

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
