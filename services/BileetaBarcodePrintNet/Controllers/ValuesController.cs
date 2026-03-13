using System.Text;
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
            string basePath = _config["BarcodePrint:TemplateBasePath"] ?? "C:\\BileetaBarcode\\BarcodeTemplate\\Source";
            int printedCount = 0;

            foreach (var item in barcods)
            {
                string? templateId = item.BarcodeTemplateId ?? "1";
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
                string tempFile;
                string baseName;
                string baseNameWithX;
                if (templateId == "1" || templateId == "18")
                {
                    baseName = "50mm25mm";
                    baseNameWithX = "50mmx25mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX) ?? Path.Combine(basePath, "50mm25mm.txt");
                    tempFile = Path.Combine(Path.GetTempPath(), "50mm25mm_Temp.txt");
                }
                else if (templateId == "6")
                {
                    baseName = "50mm25mmWoExp";
                    baseNameWithX = "50mmx25mmWoExp";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX) ?? Path.Combine(basePath, "50mm25mmWoExp.txt");
                    tempFile = Path.Combine(Path.GetTempPath(), "50mm25mmWoExp_Temp.txt");
                }
                else if (templateId == "20")
                {
                    baseName = "30mm20mm";
                    baseNameWithX = "30mmx20mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX) ?? Path.Combine(basePath, "30mm20mm.txt");
                    tempFile = Path.Combine(Path.GetTempPath(), "30mm20mm_Temp.txt");
                }
                else
                {
                    baseName = "50mm25mm";
                    baseNameWithX = "50mmx25mm";
                    templateFile = ResolveTemplateFile(basePath, baseName, baseNameWithX) ?? Path.Combine(basePath, "50mm25mm.txt");
                    tempFile = Path.Combine(Path.GetTempPath(), "50mm25mm_Temp.txt");
                }

                if (!System.IO.File.Exists(templateFile))
                {
                    _logger.LogWarning("Template not found: {Path}", templateFile);
                    continue;
                }

                string str = System.IO.File.ReadAllText(templateFile, Encoding.Default);
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
                str = str.Replace("@bt", item.BarcodeType ?? "");
                str = str.Replace("@BatchNo", item.BatchNo ?? "");
                str = str.Replace("@S", string.IsNullOrEmpty(item.BarcodeType) ? item.BarcodeType ?? "" : "");

                for (int i = 0; i < noOfBarcode; i++)
                {
                    System.IO.File.WriteAllText(tempFile, str, Encoding.Default);
                    string destinationFile = destinationPrefix + printer;
                    System.IO.File.Copy(tempFile, destinationFile, true);
                    printedCount++;
                    // Give printer time to process this job before sending the next; otherwise only the last label may print
                    Thread.Sleep(1200);
                }
            }

            if (printedCount == 0)
            {
                _logger.LogWarning("PrintRequest: no labels printed. Template file not found at {BasePath}. Copy 50mm25mm.txt (or 50mmx25mm.lbl) to that folder or its parent.", basePath);
                return StatusCode(500, "Print template not found. Ensure 50mm25mm.txt or 50mmx25mm.lbl exists in " + basePath + " or in its parent folder (see README).");
            }

            LastPrintErrorStore.Clear();
            // Give spooler time to update job status; then check queue for failed job
            Thread.Sleep(1500);
            string? jobError = PrinterStatusHelper.GetLastPrintJobError(printer);
            if (!string.IsNullOrEmpty(jobError))
                LastPrintErrorStore.Set(jobError);
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
}
