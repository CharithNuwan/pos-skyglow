using System.IO.Ports;
using System.Text;

namespace BileetaBarcodePrintNet.Services;

/// <summary>
/// Sends TSPL (or any raw bytes) directly to the printer via COM port.
/// Bypasses the Windows spooler — avoids ghost jobs and USB buffer carryover on XP-T202UA.
/// Enable by setting BarcodePrint:PrinterComPort (e.g. "COM3") in config.
/// </summary>
public static class ComPortPrintHelper
{
    private const int DefaultBaudRate = 9600;
    private const int WriteTimeoutMs = 10000;

    /// <summary>
    /// Sends the string as bytes to the COM port. Returns true if sent successfully.
    /// </summary>
    public static bool SendString(string comPortName, string content, Encoding encoding)
    {
        if (string.IsNullOrWhiteSpace(comPortName) || string.IsNullOrEmpty(content))
            return false;
        byte[] data = encoding.GetBytes(content);
        return SendBytes(comPortName, data);
    }

    /// <summary>
    /// Sends raw bytes to the COM port. Returns true if sent successfully.
    /// </summary>
    public static bool SendBytes(string comPortName, byte[] data)
    {
        if (string.IsNullOrWhiteSpace(comPortName) || data == null || data.Length == 0)
            return false;

        try
        {
            using var port = new SerialPort(comPortName.Trim(), DefaultBaudRate, Parity.None, 8, StopBits.One)
            {
                WriteTimeout = WriteTimeoutMs,
                Encoding = Encoding.Default
            };
            port.Open();
            port.Write(data, 0, data.Length);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
