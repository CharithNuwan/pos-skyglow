using System.Text;
using BileetaBarcodePrintNet.Helpers;
using BileetaBarcodePrintNet.Models;
using BileetaBarcodePrintNet.Services;
using Microsoft.AspNetCore.Mvc;

namespace BileetaBarcodePrintNet.Controllers;

[ApiController]
[Route("[controller]")]
public class ValuesController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<ValuesController> _logger;

    public ValuesController(IConfiguration config, ILogger<ValuesController> logger)
    {
        _config = config;
        _logger = logger;
    }

    private string GetPrinterName()
    {
        // 1. Config path
        var path = _config["BarcodePrint:PrinterFilePath"] ?? "C:\\BileetaBarcode\\Printer.txt";
        if (System.IO.File.Exists(path))
        {
            var name = ReadPrinterNameFromFile(path);
            if (!string.IsNullOrWhiteSpace(name)) return name;
        }
        // 2. Default path
        if (path != "C:\\BileetaBarcode\\Printer.txt" && System.IO.File.Exists("C:\\BileetaBarcode\\Printer.txt"))
        {
            var name = ReadPrinterNameFromFile("C:\\BileetaBarcode\\Printer.txt");
            if (!string.IsNullOrWhiteSpace(name)) return name;
        }
        // 3. Next to the executable (for Windows Service)
        var exeDir = AppContext.BaseDirectory;
        var localPath = Path.Combine(exeDir, "Printer.txt");
        if (System.IO.File.Exists(localPath))
        {
            var name = ReadPrinterNameFromFile(localPath);
            if (!string.IsNullOrWhiteSpace(name)) return name;
        }
        return _config["BarcodePrint:PrinterName"] ?? "";
    }

    private static string ReadPrinterNameFromFile(string path)
    {
        try
        {
            return System.IO.File.ReadAllText(path).Trim();
        }
        catch
        {
            return "";
        }
    }

    private string TemplatePath(string fileName) =>
        Path.Combine(_config["BarcodePrint:TemplateBasePath"] ?? "C:\\BileetaBarcode\\BarcodeTemplate\\Source", fileName);

    /// <summary>
    /// Maps frontend barcode type (e.g. "12" for EAN-13) to TSPL type string the printer expects.
    /// When map12ToEan13 is true, "12" is converted to "EAN13". Set map12ToEan13 to false if your printer expects numeric "12" for EAN-13 (e.g. XP-T202UA).
    /// </summary>
    private static string MapBarcodeTypeToTspl(string? barcodeType, bool map12ToEan13 = true)
    {
        if (string.IsNullOrWhiteSpace(barcodeType)) return "128";
        string t = barcodeType.Trim();
        if (t == "12") return map12ToEan13 ? "EAN13" : "12";
        if (t == "8" || t.Equals("EAN8", StringComparison.OrdinalIgnoreCase)) return "EAN8";
        return t; // "128", "EAN13", "CODE39", etc. used as-is
    }

    /// <summary>
    /// Resolves template file path by trying: basePath then parent folder; for each: baseName.txt, baseNameWithX.txt, baseName.lbl, baseNameWithX.lbl.
    /// e.g. 50mm25mm -> also tries 50mmx25mm; so 50mmx25mm.lbl in BarcodeTemplate (parent of Source) is found.
    /// </summary>
    private static string? ResolveTemplateFile(string basePath, string baseName, string baseNameWithX)
    {
        string[] names = { baseName + ".txt", baseNameWithX + ".txt", baseName + ".lbl", baseNameWithX + ".lbl" };
        foreach (string name in names)
        {
            string p = Path.Combine(basePath, name);
            if (System.IO.File.Exists(p)) return p;
        }
        string? parent = Path.GetDirectoryName(basePath);
        if (!string.IsNullOrEmpty(parent))
        {
            foreach (string name in names)
            {
                string p = Path.Combine(parent, name);
                if (System.IO.File.Exists(p)) return p;
            }
        }
        return null;
    }

    [HttpGet("Test")]
    public IActionResult Test()
    {
        return Ok("Success 1");
    }

    [HttpGet("Status")]
    public IActionResult Status()
    {
        string printerName = GetPrinterName();
        bool printerConfigured = !string.IsNullOrWhiteSpace(printerName);
        string? comPort = _config["BarcodePrint:PrinterComPort"]?.Trim();
        string lastError = LastPrintErrorStore.Get();

        // If a COM port is configured, query printer directly (ZPL ~HS) for paper out/error
        if (!string.IsNullOrEmpty(comPort))
        {
            string? comStatus = ComPortStatusHelper.GetStatusFromComPort(comPort);
            if (comStatus != null && comStatus != "OK")
            {
                return Ok(new
                {
                    serviceOk = true,
                    printerConfigured,
                    printerName = printerName ?? "",
                    printerOnline = false,
                    printerStatusMessage = comStatus
                });
            }
            if (comStatus == "OK")
            {
                LastPrintErrorStore.Clear();
                return Ok(new
                {
                    serviceOk = true,
                    printerConfigured,
                    printerName = printerName ?? "",
                    printerOnline = true,
                    printerStatusMessage = "OK"
                });
            }
        }

        if (string.IsNullOrEmpty(lastError) && printerConfigured)
        {
            string? jobError = PrinterStatusHelper.GetLastPrintJobError(printerName);
            if (!string.IsNullOrEmpty(jobError))
                lastError = jobError;
        }
        string printerStatusMessage;
        bool printerOnline;

        if (!string.IsNullOrEmpty(lastError))
        {
            printerStatusMessage = lastError;
            printerOnline = false;
        }
        else
        {
            printerStatusMessage = printerConfigured ? PrinterStatusHelper.GetPrinterStatusMessage(printerName) : "";
            printerOnline = printerConfigured && PrinterStatusHelper.IsPrinterOnline(printerName);
        }

        return Ok(new
        {
            serviceOk = true,
            printerConfigured,
            printerName = printerName ?? "",
            printerOnline,
            printerStatusMessage = printerStatusMessage ?? ""
        });
    }

    /// <summary>
    /// Runs a test feed and checks the queue for errors (e.g. paper out). Use "Check now" in Printer Config.
    /// </summary>
    [HttpGet("CheckPrinter")]
    public IActionResult CheckPrinter()
    {
        string printer = GetPrinterName();
        if (string.IsNullOrWhiteSpace(printer))
            return Ok(new { ok = false, message = "Printer not configured." });

        try
        {
            // Clear any pending jobs so "Check now" prints only the test feed, not the last barcode from a previous print list
            PrinterStatusHelper.PurgePrintQueue(printer);

            string tempPath = Path.Combine(Path.GetTempPath(), "barcode_feed.txt");
            const string tsplFeed = "CLS\r\nPRINT 1,1\r\n";
            System.IO.File.WriteAllText(tempPath, tsplFeed, Encoding.ASCII);
            string destination = @"\\localhost\" + printer;
            System.IO.File.Copy(tempPath, destination, true);
            Thread.Sleep(2000);
            string? jobError = PrinterStatusHelper.GetLastPrintJobError(printer);
            if (!string.IsNullOrEmpty(jobError))
            {
                LastPrintErrorStore.Set(jobError);
                return Ok(new { ok = false, message = jobError });
            }
            LastPrintErrorStore.Clear();
            return Ok(new { ok = true, message = "OK" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CheckPrinter failed");
            LastPrintErrorStore.Set("Check failed: " + ex.Message);
            return Ok(new { ok = false, message = ex.Message });
        }
    }

    [HttpGet("LineFeed")]
    public IActionResult LineFeed()
    {
        try
        {
            string printer = GetPrinterName();
            if (string.IsNullOrWhiteSpace(printer))
            {
                _logger.LogWarning("Printer name not configured for LineFeed.");
                return StatusCode(500, "Printer not configured. Set BarcodePrint:PrinterName or create printer file.");
            }

            string tempPath = Path.Combine(Path.GetTempPath(), "barcode_feed.txt");
            // TSPL: only CLS + PRINT 1,1 - use printer's current label settings to avoid ERR
            const string tsplFeed = "CLS\r\nPRINT 1,1\r\n";
            System.IO.File.WriteAllText(tempPath, tsplFeed, Encoding.ASCII);
            string destination = @"\\localhost\" + printer;
            System.IO.File.Copy(tempPath, destination, true);
            Thread.Sleep(300);
            LastPrintErrorStore.Clear();
            // Give spooler time to update job status (e.g. paper out); then check queue for failed job
            Thread.Sleep(1500);
            string? jobError = PrinterStatusHelper.GetLastPrintJobError(printer);
            if (!string.IsNullOrEmpty(jobError))
                LastPrintErrorStore.Set(jobError);
            return Ok("OK");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LineFeed failed");
            string msg = ex.Message.Contains("paper", StringComparison.OrdinalIgnoreCase) ? "Paper out" : "Print failed: " + ex.Message;
            LastPrintErrorStore.Set(msg);
            return StatusCode(500, ex.Message);
        }
    }

    [HttpPost("PrintRequest")]
    public IActionResult PrintRequest([FromBody] List<BarcodeTemplate>? barcods)
    {
        try
        {
            if (barcods == null || barcods.Count == 0)
                return BadRequest("No barcode data provided.");

            string printer = GetPrinterName();
            if (string.IsNullOrWhiteSpace(printer))
            {
                _logger.LogWarning("Printer name not configured. Set BarcodePrint:PrinterName or create BarcodePrint:PrinterFilePath (e.g. C:\\BileetaBarcode\\Printer.txt)");
                return StatusCode(500, "Printer not configured. Set BarcodePrint:PrinterName or create printer file.");
            }

            string destinationPrefix = @"\\localhost\";
            string basePathRaw = _config["BarcodePrint:TemplateBasePath"] ?? "C:\\BileetaBarcode\\BarcodeTemplate\\Source";
            string basePath = Path.GetFullPath(basePathRaw.Trim());
            _logger.LogInformation("PrintRequest: template base path resolved to {BasePath}", basePath);
            int printedCount = 0;
            string requestId = Guid.NewGuid().ToString("N")[..8];
            string? comPort = _config["BarcodePrint:PrinterComPort"]?.Trim();
            bool useComPort = !string.IsNullOrEmpty(comPort);

            _logger.LogInformation("PrintRequest: requestId={RequestId}, received {Count} item(s). First item BarcodeNo={BarcodeNo}, ProductDesc={Desc}, SellingPrice={Price}",
                requestId,
                barcods.Count,
                barcods[0].BarcodeNo ?? "(null)",
                barcods[0].ProductDesc ?? "(null)",
                barcods[0].SellingPrice ?? "(null)");

            // Clear any pending jobs in the Windows print queue so the printer does not output the previous label
            PrinterStatusHelper.PurgePrintQueue(printer);
            _logger.LogInformation("PrintRequest: using printer name \"{Printer}\" (must match Windows Settings exactly). Purged queue.", printer);

            int postPurgeMs = 500;
            if (_config["BarcodePrint:PostPurgeDelayMs"] != null && int.TryParse(_config["BarcodePrint:PostPurgeDelayMs"], out int cfgPostPurge))
                postPurgeMs = Math.Max(0, Math.Min(5000, cfgPostPurge));
            if (postPurgeMs > 0)
            {
                _logger.LogInformation("PrintRequest: waiting {Ms}ms after purge for USB driver to settle.", postPurgeMs);
                Thread.Sleep(postPurgeMs);
            }

            int initialDelayMs = 2000;
            if (_config["BarcodePrint:PrintRequestInitialDelayMs"] != null && int.TryParse(_config["BarcodePrint:PrintRequestInitialDelayMs"], out int cfgInitial))
                initialDelayMs = Math.Max(200, Math.Min(60000, cfgInitial));
            _logger.LogInformation("PrintRequest: waiting {Ms}ms for printer to clear before writing.", initialDelayMs);
            Thread.Sleep(initialDelayMs);

            // Send a clear-buffer job so the printer flushes any previous barcode from its internal buffer (uses one label)
            bool sendClearBeforePrint = string.Equals(_config["BarcodePrint:SendClearBeforePrint"], "true", StringComparison.OrdinalIgnoreCase);
            if (sendClearBeforePrint)
            {
                const string tsplClear = "~R\r\nCLS\r\nPRINT 1,1\r\n";
                int clearDelayMs = 5000;
                if (_config["BarcodePrint:ClearBeforePrintDelayMs"] != null && int.TryParse(_config["BarcodePrint:ClearBeforePrintDelayMs"], out int cfgClear))
                    clearDelayMs = Math.Max(1000, Math.Min(15000, cfgClear));
                if (useComPort)
                {
                    bool ok = ComPortPrintHelper.SendString(comPort!, tsplClear, Encoding.ASCII);
                    if (ok)
                        _logger.LogInformation("PrintRequest: sent clear-buffer via COM port.");
                    else
                        _logger.LogWarning("PrintRequest: clear-buffer via COM failed, continuing with labels.");
                    Thread.Sleep(clearDelayMs);
                }
                else
                {
                    string clearPath = Path.Combine(Path.GetTempPath(), "barcode_clear_before.txt");
                    System.IO.File.WriteAllText(clearPath, "CLS\r\nPRINT 1,1\r\n", Encoding.ASCII);
                    Thread.Sleep(200);
                    string destinationFile = destinationPrefix + printer;
                    try
                    {
                        System.IO.File.Copy(clearPath, destinationFile, true);
                        _logger.LogInformation("PrintRequest: sent clear-buffer job to flush previous barcode.");
                        Thread.Sleep(clearDelayMs);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "PrintRequest: clear-buffer send failed, continuing with labels.");
                    }
                }
            }

            int itemIndex = 0;
            bool map12ToEan13 = _config["BarcodePrint:MapBarcodeType12ToEAN13"] != "false";
            foreach (var item in barcods)
            {
                string? templateId = (item.BarcodeTemplateId?.ToString() ?? item.Temp_TemplateId?.ToString() ?? "1").Trim();
                if (string.IsNullOrEmpty(templateId)) templateId = "1";
                string decs1 = "";
                string decs2 = "";
                string? productDesc = item.ProductDesc ?? "";
                int length = productDesc.Length;
                if (length <= 35)
                    decs1 = productDesc;
                else
                {
                    decs1 = productDesc[..35];
                    decs2 = length > 36 ? productDesc[35..] : "";
                }

                int noOfBarcode = int.TryParse(item.NoOfBarcode, out int n) ? n : 1;
                string price = "0.00";
                if (!string.IsNullOrWhiteSpace(item.SellingPrice) && decimal.TryParse(item.SellingPrice, out decimal p))
                    price = p.ToString("0.00");

                string templateFile;
                string baseName;
                string baseNameWithX;
                if (templateId == "1" || templateId == "18")
                {
                    baseName = "50mm25mm";
                    baseNameWithX = "50mmx25mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX) ?? Path.Combine(basePath, "50mm25mm.txt");
                }
                else if (templateId == "6")
                {
                    baseName = "50mm25mmWoExp";
                    baseNameWithX = "50mmx25mmWoExp";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX) ?? Path.Combine(basePath, "50mm25mmWoExp.txt");
                }
                else if (templateId == "20")
                {
                    baseName = "30mm20mm";
                    baseNameWithX = "30mmx20mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX) ?? Path.Combine(basePath, "30mm20mm.txt");
                }
                else
                {
                    baseName = "50mm25mm";
                    baseNameWithX = "50mmx25mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX) ?? Path.Combine(basePath, "50mm25mm.txt");
                }

                if (!System.IO.File.Exists(templateFile))
                {
                    _logger.LogWarning("Template not found for templateId={TemplateId}: path={Path} (basePath={BasePath})", templateId, templateFile, basePath);
                    continue;
                }

                string str = System.IO.File.ReadAllText(templateFile, Encoding.Default);
                string tsplBarcodeType = MapBarcodeTypeToTspl(item.BarcodeType, map12ToEan13);
                str = str.Replace("@BarcodeType", tsplBarcodeType);
                str = str.Replace("@CompanyName", item.CompanyName ?? "");
                str = str.Replace("@Barcode", item.BarcodeNo ?? "");
                str = str.Replace("@ItemCode", item.ProductCode ?? "");
                str = str.Replace("@Des1", decs1);
                str = str.Replace("@Des2", decs2);
                str = str.Replace("@Price", price);
                str = str.Replace("@Qty", item.Quantity ?? "1");
                str = str.Replace("@Count", item.NoOfBarcode ?? "1");
                str = str.Replace("@Mdf", item.ManufactureDate ?? "");
                str = str.Replace("@Exp", item.ExpiryDate ?? "");
                str = str.Replace("@bt", tsplBarcodeType);
                str = str.Replace("@BatchNo", item.BatchNo ?? "");
                str = str.Replace("@S", !string.IsNullOrEmpty(item.BarcodeType) ? item.BarcodeType : "");

                // XPrinter XP-T202UA ghost-job fix: prepend ~R to flush internal buffer before each job
                bool prependReset = _config["BarcodePrint:PrependResetBeforePrint"] != "false";
                if (prependReset)
                    str = "~R\r\n" + str;

                bool strContainsBarcode = str.Contains(item.BarcodeNo ?? "");
                bool strContainsPrice = str.Contains(price);
                bool useFileCopy = !useComPort && string.Equals(_config["BarcodePrint:UseFileCopyForPrint"], "true", StringComparison.OrdinalIgnoreCase);
                string sendMethod = useComPort ? "COM port " + comPort : (useFileCopy ? "file copy" : "raw print");
                _logger.LogInformation("PrintRequest: item[{Index}] BarcodeNo={BarcodeNo}, Price={Price}. After replace: template contains BarcodeNo={HasBarcode}, contains Price={HasPrice}. Sending via {Method}.",
                    itemIndex, item.BarcodeNo ?? "(null)", price, strContainsBarcode, strContainsPrice, sendMethod);

                for (int i = 0; i < noOfBarcode; i++)
                    {
                        _logger.LogInformation("PrintRequest: requestId={RequestId}, send {CopyNum} (BarcodeNo={BarcodeNo}, Price={Price}) via {Method}", requestId, printedCount + 1, item.BarcodeNo ?? "(null)", price, sendMethod);
                        bool sent;
                        if (useComPort)
                        {
                            sent = ComPortPrintHelper.SendString(comPort!, str, Encoding.Default);
                            if (!sent)
                                _logger.LogWarning("PrintRequest: ComPortPrintHelper.SendString failed for copy {CopyNum}", printedCount + 1);
                        }
                        else if (useFileCopy)
                        {
                            // Unique temp file per label so the driver never gets a reused file (prevents sending previous request's data)
                            string uniqueTempFile = Path.Combine(Path.GetTempPath(), "BileetaBarcode_" + requestId + "_" + itemIndex + "_" + i + ".txt");
                            try
                            {
                                System.IO.File.WriteAllText(uniqueTempFile, str, Encoding.Default);
                                Thread.Sleep(100);
                                string destFile = destinationPrefix + printer;
                                System.IO.File.Copy(uniqueTempFile, destFile, true);
                                sent = true;
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "PrintRequest: File.Copy failed for copy {CopyNum}", printedCount + 1);
                                sent = false;
                            }
                            finally
                            {
                                try { if (System.IO.File.Exists(uniqueTempFile)) System.IO.File.Delete(uniqueTempFile); } catch { /* ignore */ }
                            }
                        }
                        else
                        {
                            string jobName = "Barcode " + requestId + "_" + itemIndex + "_" + i;
                            sent = RawPrintHelper.SendRawString(printer, str, Encoding.Default, jobName);
                            if (!sent)
                                _logger.LogWarning("PrintRequest: RawPrintHelper.SendRawString failed for copy {CopyNum}", printedCount + 1);
                        }
                        if (sent)
                            {
                                printedCount++;
                                _logger.LogInformation("PrintRequest: print command sent to printer (requestId={RequestId}, copy {CopyNum}, BarcodeNo={BarcodeNo}, Price={Price})", requestId, printedCount, item.BarcodeNo ?? "(null)", price);
                            }
                        // Optional: save exact TSPL we sent so you can open and verify (e.g. barcode/price)
                        string? saveLastSentPath = _config["BarcodePrint:SaveLastSentToPath"];
                        if (!string.IsNullOrWhiteSpace(saveLastSentPath))
                        {
                            try
                            {
                                Directory.CreateDirectory(saveLastSentPath);
                                string lastSentFile = Path.Combine(saveLastSentPath, "last-sent.txt");
                                System.IO.File.WriteAllText(lastSentFile, str, Encoding.Default);
                                _logger.LogInformation("PrintRequest: saved sent TSPL to {Path} for verification.", lastSentFile);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "PrintRequest: could not save last-sent TSPL.");
                            }
                        }
                        int afterCopyMs = 1000;
                        if (_config["BarcodePrint:PrintRequestDelayAfterCopyMs"] != null && int.TryParse(_config["BarcodePrint:PrintRequestDelayAfterCopyMs"], out int cfgAfter))
                            afterCopyMs = Math.Max(200, Math.Min(30000, cfgAfter));
                        Thread.Sleep(afterCopyMs);
                    }
                itemIndex++;
            }

            if (printedCount == 0)
            {
                _logger.LogWarning("PrintRequest: no labels printed. Template file not found in {BasePath} or its parent. For template ID 20 use 30mm20mm.txt; for ID 1/18 use 50mm25mm.txt.", basePath);
                return StatusCode(500, "Print template not found. Ensure the template file (e.g. 30mm20mm.txt for template ID 20) exists in: " + basePath + " . Check service logs for the exact path that was not found.");
            }

            LastPrintErrorStore.Clear();
            // Give spooler time to update job status; then check queue for failed job
            Thread.Sleep(1500);
            string? jobError = PrinterStatusHelper.GetLastPrintJobError(printer);
            if (!string.IsNullOrEmpty(jobError))
            {
                LastPrintErrorStore.Set(jobError);
                _logger.LogWarning("PrintRequest: spooler reported job error for {Printer}: {Error}", printer, jobError);
            }
            else
                _logger.LogInformation("PrintRequest: spooler job check for {Printer}: no error reported (queue may be empty if printer uses direct-to-printer).", printer);
            return Ok(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintRequest failed");
            string msg = ex.Message.Contains("paper", StringComparison.OrdinalIgnoreCase) ? "Paper out" : "Print failed: " + ex.Message;
            LastPrintErrorStore.Set(msg);
            return StatusCode(500, "Printer not respond...! " + ex.Message);
        }
    }

    /// <summary>
    /// Prints labels by rendering each to the same image as the PNG preview, converting to TSPL BITMAP, and sending to the printer.
    /// Use when you want printed output to match the preview exactly (e.g. one-by-one printing). Same request body as PrintRequest.
    /// </summary>
    [HttpPost("PrintPngRequest")]
    public IActionResult PrintPngRequest([FromBody] List<BarcodeTemplate>? barcods)
    {
        try
        {
            if (barcods == null || barcods.Count == 0)
                return BadRequest("No barcode data provided.");

            string printer = GetPrinterName();
            if (string.IsNullOrWhiteSpace(printer))
            {
                _logger.LogWarning("Printer name not configured for PrintPngRequest.");
                return StatusCode(500, "Printer not configured. Set BarcodePrint:PrinterName or create printer file.");
            }

            int printedCount = 0;
            string requestId = Guid.NewGuid().ToString("N")[..8];
            bool prependReset = _config["BarcodePrint:PrependResetBeforePrint"] != "false";
            bool map12ToEan13 = _config["BarcodePrint:MapBarcodeType12ToEAN13"] != "false";

            _logger.LogInformation("PrintPngRequest: requestId={RequestId}, received {Count} item(s).", requestId, barcods.Count);

            PrinterStatusHelper.PurgePrintQueue(printer);
            _logger.LogInformation("PrintPngRequest: using printer \"{Printer}\". Purged queue.", printer);

            int postPurgeMs = 500;
            if (_config["BarcodePrint:PostPurgeDelayMs"] != null && int.TryParse(_config["BarcodePrint:PostPurgeDelayMs"], out int cfgPostPurge))
                postPurgeMs = Math.Max(0, Math.Min(5000, cfgPostPurge));
            if (postPurgeMs > 0)
            {
                _logger.LogInformation("PrintPngRequest: waiting {Ms}ms after purge.", postPurgeMs);
                Thread.Sleep(postPurgeMs);
            }

            int initialDelayMs = 2000;
            if (_config["BarcodePrint:PrintRequestInitialDelayMs"] != null && int.TryParse(_config["BarcodePrint:PrintRequestInitialDelayMs"], out int cfgInitial))
                initialDelayMs = Math.Max(200, Math.Min(60000, cfgInitial));
            _logger.LogInformation("PrintPngRequest: waiting {Ms}ms before first label.", initialDelayMs);
            Thread.Sleep(initialDelayMs);

            int itemIndex = 0;
            foreach (var item in barcods)
            {
                string? templateId = (item.BarcodeTemplateId?.ToString() ?? item.Temp_TemplateId?.ToString() ?? "1").Trim();
                if (string.IsNullOrEmpty(templateId)) templateId = "1";
                string decs1 = "";
                string decs2 = "";
                string? productDesc = item.ProductDesc ?? "";
                int length = productDesc.Length;
                if (length <= 35)
                    decs1 = productDesc;
                else
                {
                    decs1 = productDesc[..35];
                    decs2 = length > 36 ? productDesc[35..] : "";
                }

                int noOfBarcode = int.TryParse(item.NoOfBarcode, out int n) ? n : 1;
                string price = "0.00";
                if (!string.IsNullOrWhiteSpace(item.SellingPrice) && decimal.TryParse(item.SellingPrice, out decimal p))
                    price = p.ToString("0.00");

                string tsplBarcodeType = MapBarcodeTypeToTspl(item.BarcodeType, map12ToEan13);

                for (int i = 0; i < noOfBarcode; i++)
                {
                    using var bmp = LabelToPngHelper.RenderLabelToBitmap(templateId, item.BarcodeNo ?? "", price, decs1, decs2, item.ProductCode, item.Quantity ?? "1", tsplBarcodeType);
                    if (bmp == null)
                    {
                        _logger.LogWarning("PrintPngRequest: failed to render label for BarcodeNo={BarcodeNo}", item.BarcodeNo);
                        continue;
                    }
                    string? tsplBitmap = BitmapToTsplHelper.BitmapToTsplBitmap(bmp);
                    if (string.IsNullOrEmpty(tsplBitmap))
                    {
                        _logger.LogWarning("PrintPngRequest: failed to convert bitmap to TSPL for BarcodeNo={BarcodeNo}", item.BarcodeNo);
                        continue;
                    }
                    if (prependReset)
                        tsplBitmap = "~R\r\n" + tsplBitmap;

                    string jobName = "BarcodePng " + requestId + "_" + itemIndex + "_" + i;
                    bool sent = RawPrintHelper.SendRawString(printer, tsplBitmap, Encoding.Default, jobName);
                    if (sent)
                    {
                        printedCount++;
                        _logger.LogInformation("PrintPngRequest: sent label (requestId={RequestId}, copy {CopyNum}, BarcodeNo={BarcodeNo}, Price={Price})", requestId, printedCount, item.BarcodeNo ?? "(null)", price);
                    }
                    else
                        _logger.LogWarning("PrintPngRequest: SendRawString failed for copy {CopyNum}", printedCount + 1);

                    int afterCopyMs = 1000;
                    if (_config["BarcodePrint:PrintRequestDelayAfterCopyMs"] != null && int.TryParse(_config["BarcodePrint:PrintRequestDelayAfterCopyMs"], out int cfgAfter))
                        afterCopyMs = Math.Max(200, Math.Min(30000, cfgAfter));
                    Thread.Sleep(afterCopyMs);
                }
                itemIndex++;
            }

            if (printedCount == 0)
            {
                _logger.LogWarning("PrintPngRequest: no labels printed.");
                return StatusCode(500, "No labels printed. Check that template IDs and data are valid.");
            }

            LastPrintErrorStore.Clear();
            Thread.Sleep(1500);
            string? jobError = PrinterStatusHelper.GetLastPrintJobError(printer);
            if (!string.IsNullOrEmpty(jobError))
            {
                LastPrintErrorStore.Set(jobError);
                _logger.LogWarning("PrintPngRequest: spooler reported job error for {Printer}: {Error}", printer, jobError);
            }
            else
                _logger.LogInformation("PrintPngRequest: spooler job check for {Printer}: no error reported.", printer);
            return Ok(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PrintPngRequest failed");
            string msg = ex.Message.Contains("paper", StringComparison.OrdinalIgnoreCase) ? "Paper out" : "Print failed: " + ex.Message;
            LastPrintErrorStore.Set(msg);
            return StatusCode(500, "Printer not respond...! " + ex.Message);
        }
    }

    /// <summary>
    /// Builds the same TSPL as PrintRequest but saves to a file instead of sending to the printer.
    /// Use when printer is off to verify the file with other software (e.g. Notepad) without wasting labels.
    /// </summary>
    [HttpPost("PreviewRequest")]
    public IActionResult PreviewRequest([FromBody] List<BarcodeTemplate>? barcods)
    {
        try
        {
            if (barcods == null || barcods.Count == 0)
                return BadRequest("No barcode data provided.");

            string basePath = _config["BarcodePrint:TemplateBasePath"] ?? "C:\\BileetaBarcode\\BarcodeTemplate\\Source";
            string previewDir = _config["BarcodePrint:PreviewOutputPath"] ?? "C:\\BileetaBarcode\\Preview";
            string previewPngDir = _config["BarcodePrint:PreviewPngOutputPath"] ?? "C:\\BileetaBarcode\\PreviewPng";

            try { Directory.CreateDirectory(previewDir); }
            catch (Exception ex) { _logger.LogWarning(ex, "Could not create preview directory: {Dir}", previewDir); }
            try { Directory.CreateDirectory(previewPngDir); }
            catch (Exception ex) { _logger.LogWarning(ex, "Could not create preview PNG directory: {Dir}", previewPngDir); }

            var fullTspl = new StringBuilder();
            var savedPngPaths = new List<string>();
            int labelIndex = 0;
            string pngTimeStamp = DateTime.Now.ToString("yyyy-MM-dd-HHmmss");
            bool map12ToEan13 = _config["BarcodePrint:MapBarcodeType12ToEAN13"] != "false";

            foreach (var item in barcods)
            {
                string? templateId = (item.BarcodeTemplateId?.ToString() ?? item.Temp_TemplateId?.ToString() ?? "1").Trim();
                if (string.IsNullOrEmpty(templateId)) templateId = "1";
                string decs1 = "";
                string decs2 = "";
                string? productDesc = item.ProductDesc ?? "";
                int length = productDesc.Length;
                if (length <= 35)
                    decs1 = productDesc;
                else
                {
                    decs1 = productDesc[..35];
                    decs2 = length > 36 ? productDesc[35..] : "";
                }

                int noOfBarcode = int.TryParse(item.NoOfBarcode, out int n) ? n : 1;
                string price = "0.00";
                if (!string.IsNullOrWhiteSpace(item.SellingPrice) && decimal.TryParse(item.SellingPrice, out decimal p))
                    price = p.ToString("0.00");

                string? templateFile;
                string baseName;
                string baseNameWithX;
                if (templateId == "1" || templateId == "18")
                {
                    baseName = "50mm25mm";
                    baseNameWithX = "50mmx25mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX);
                }
                else if (templateId == "6")
                {
                    baseName = "50mm25mmWoExp";
                    baseNameWithX = "50mmx25mmWoExp";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX);
                }
                else if (templateId == "20")
                {
                    baseName = "30mm20mm";
                    baseNameWithX = "30mmx20mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX);
                }
                else
                {
                    baseName = "50mm25mm";
                    baseNameWithX = "50mmx25mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX);
                }

                if (string.IsNullOrEmpty(templateFile) || !System.IO.File.Exists(templateFile))
                {
                    _logger.LogWarning("PreviewRequest: template not found for templateId={Id}, BarcodeNo={BarcodeNo}", templateId, item.BarcodeNo);
                    fullTspl.AppendLine("; Template not found for BarcodeNo=" + (item.BarcodeNo ?? "(null)"));
                    continue;
                }

                string str = System.IO.File.ReadAllText(templateFile, Encoding.Default);
                string tsplBarcodeType = MapBarcodeTypeToTspl(item.BarcodeType, map12ToEan13);
                str = str.Replace("@BarcodeType", tsplBarcodeType);
                str = str.Replace("@CompanyName", item.CompanyName ?? "");
                str = str.Replace("@Barcode", item.BarcodeNo ?? "");
                str = str.Replace("@ItemCode", item.ProductCode ?? "");
                str = str.Replace("@Des1", decs1);
                str = str.Replace("@Des2", decs2);
                str = str.Replace("@Price", price);
                str = str.Replace("@Qty", item.Quantity ?? "1");
                str = str.Replace("@Count", item.NoOfBarcode ?? "1");
                str = str.Replace("@Mdf", item.ManufactureDate ?? "");
                str = str.Replace("@Exp", item.ExpiryDate ?? "");
                str = str.Replace("@bt", tsplBarcodeType);
                str = str.Replace("@BatchNo", item.BatchNo ?? "");
                str = str.Replace("@S", !string.IsNullOrEmpty(item.BarcodeType) ? item.BarcodeType : "");

                for (int i = 0; i < noOfBarcode; i++)
                {
                    labelIndex++;
                    fullTspl.Append("\r\n; --- Label ").Append(labelIndex).Append(" ---\r\n");
                    fullTspl.Append(str);

                    // Save PNG for this label in PreviewPng folder
                    string pngFileName = "barcode-preview-" + pngTimeStamp + "-" + labelIndex + ".png";
                    string pngPath = Path.Combine(previewPngDir, pngFileName);
                    if (LabelToPngHelper.SaveLabelPng(templateId, item.BarcodeNo ?? "", price, decs1, decs2, item.ProductCode, item.Quantity ?? "1", tsplBarcodeType, pngPath))
                        savedPngPaths.Add(pngPath);
                }
            }

            if (fullTspl.Length == 0)
            {
                _logger.LogWarning("PreviewRequest: no template content generated. Check template files in {BasePath}", basePath);
                return StatusCode(500, "No template found. Ensure template files exist in " + basePath + " (see README).");
            }

            string fileName = "barcode-preview-" + pngTimeStamp + ".txt";
            string savedPath = Path.Combine(previewDir, fileName);
            System.IO.File.WriteAllText(savedPath, fullTspl.ToString(), Encoding.Default);
            _logger.LogInformation("PreviewRequest: saved TSPL to {Path}, PNG(s) to {PngCount} file(s) in {PngDir}", savedPath, savedPngPaths.Count, previewPngDir);

            return Ok(new { savedPath, savedPngPaths });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PreviewRequest failed");
            return StatusCode(500, "Preview failed: " + ex.Message);
        }
    }
}
