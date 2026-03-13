using System.IO.Ports;
using System.Text;
using System.Text.RegularExpressions;

namespace BileetaBarcodePrintNet.Services;

/// <summary>
/// Optional: query printer status directly via COM port using ZPL ~HS (Host Status).
/// TTP-244 Pro is TSPL-EZ / ZPL compatible; when connected via RS-232 or a virtual COM port,
/// this can detect paper out/error even when Windows does not report it.
/// Enable by setting BarcodePrint:PrinterComPort in config (e.g. "COM3"). Leave empty to use Windows status only.
/// </summary>
public static class ComPortStatusHelper
{
    private const string StatusCommand = "~HS\r\n";
    private const int ReadTimeoutMs = 1500;
    private const int WriteTimeoutMs = 2000;

    /// <summary>
    /// Query printer status via COM port. Returns "OK", "Paper out", "Ribbon out", "Error", or null if not configured / not available.
    /// </summary>
    public static string? GetStatusFromComPort(string? comPortName)
    {
        if (string.IsNullOrWhiteSpace(comPortName) || !OperatingSystem.IsWindows())
            return null;

        try
        {
            using var port = new SerialPort(comPortName.Trim(), 9600, Parity.None, 8, StopBits.One)
            {
                ReadTimeout = ReadTimeoutMs,
                WriteTimeout = WriteTimeoutMs,
                Encoding = Encoding.ASCII
            };

            port.Open();
            port.DiscardInBuffer();
            port.Write(StatusCommand);
            Thread.Sleep(200);
            var response = ReadAvailable(port);

            if (string.IsNullOrEmpty(response))
                return null;

            return ParseHsResponse(response);
        }
        catch
        {
            return null;
        }
    }

    private static string? ReadAvailable(SerialPort port)
    {
        try
        {
            var sb = new StringBuilder();
            var buffer = new char[256];
            var deadline = DateTime.UtcNow.AddMilliseconds(ReadTimeoutMs);
            while (DateTime.UtcNow < deadline)
            {
                if (port.BytesToRead == 0)
                {
                    Thread.Sleep(50);
                    continue;
                }
                int n = port.Read(buffer, 0, buffer.Length);
                if (n <= 0) break;
                sb.Append(buffer, 0, n);
                if (sb.ToString().IndexOf('\x03') >= 0) break; // ETX
            }
            return sb.Length > 0 ? sb.ToString() : null;
        }
        catch
        {
            return null;
        }
    }

    private static string? ParseHsResponse(string response)
    {
        string r = response.ToUpperInvariant();
        if (r.Contains("PAPER OUT") || r.Contains("PAPEROUT"))
            return "Paper out";
        if (r.Contains("RIBBON OUT") || r.Contains("RIBBONOUT") || r.Contains("RIBBON END"))
            return "Ribbon out";
        if (r.Contains("HEAD OPEN") || r.Contains("HEAD UP"))
            return "Head open";
        if (r.Contains("ERROR") || r.Contains("ERR "))
            return "Error";

        // ZPL ~HS first line: <STX>aaa,b,c,...  where aaa can be decimal or hex status bits
        var stxMatch = Regex.Match(response, @"\x02([^\x03]+)");
        if (stxMatch.Success)
        {
            string firstLine = stxMatch.Groups[1].Value.Trim();
            string[] parts = firstLine.Split(',');
            if (parts.Length > 0 && int.TryParse(parts[0].Trim(), out int statusBits))
            {
                if ((statusBits & 0x04) != 0) return "Paper out";
                if ((statusBits & 0x02) != 0) return "Error";
            }
        }

        return "OK";
    }
}
