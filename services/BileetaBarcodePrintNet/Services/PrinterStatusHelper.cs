using System.Runtime.InteropServices;

namespace BileetaBarcodePrintNet.Services;

/// <summary>
/// Windows-only helper to check printer status using winspool.drv.
/// </summary>
public static class PrinterStatusHelper
{
    private const uint PRINTER_STATUS_ERROR = 0x00000002;
    private const uint PRINTER_STATUS_PAPER_JAM = 0x00000008;
    private const uint PRINTER_STATUS_PAPER_OUT = 0x00000010;
    private const uint PRINTER_STATUS_OFFLINE = 0x00000080;
    private const uint PRINTER_STATUS_DOOR_OPEN = 0x00000400;
    private const uint PRINTER_ATTRIBUTE_WORK_OFFLINE = 0x00000400;

    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern bool GetPrinter(IntPtr hPrinter, int dwLevel, IntPtr pPrinter, int dwBuf, out int dwNeeded);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool EnumJobs(IntPtr hPrinter, uint FirstJob, uint NoJobs, uint Level, IntPtr pJob, uint cbBuf, out uint pcbNeeded, out uint pcReturned);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool SetJob(IntPtr hPrinter, uint JobId, uint Level, IntPtr pJob, uint Command);

    private const uint JOB_CONTROL_DELETE = 0x00000008;

    private const uint JOB_STATUS_ERROR = 0x00000002;
    private const uint JOB_STATUS_PAPEROUT = 0x00000040;

    /// <summary>
    /// Returns true if the printer is online and ready; false if offline, in error, or not found.
    /// </summary>
    public static bool IsPrinterOnline(string? printerName)
    {
        if (string.IsNullOrWhiteSpace(printerName) || !OperatingSystem.IsWindows())
            return false;

        try
        {
            if (!OpenPrinter(printerName.Trim(), out IntPtr hPrinter, IntPtr.Zero))
                return false;

            try
            {
                if (!TryGetPrinterStatus(hPrinter, out uint attributes, out uint status))
                    return false;

                bool hasError = (status & PRINTER_STATUS_ERROR) != 0;
                bool workOffline = (attributes & PRINTER_ATTRIBUTE_WORK_OFFLINE) != 0;
                return !hasError && !workOffline;
            }
            finally
            {
                ClosePrinter(hPrinter);
            }
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Returns a short status message for the printer: "OK", "Paper out", "Paper jam", "Door open", "Offline", "Error", or empty if not available.
    /// </summary>
    public static string GetPrinterStatusMessage(string? printerName)
    {
        if (string.IsNullOrWhiteSpace(printerName) || !OperatingSystem.IsWindows())
            return "";

        try
        {
            if (!OpenPrinter(printerName.Trim(), out IntPtr hPrinter, IntPtr.Zero))
                return "Not found";

            try
            {
                if (!TryGetPrinterStatus(hPrinter, out uint attributes, out uint status))
                    return "Error";

                if ((attributes & PRINTER_ATTRIBUTE_WORK_OFFLINE) != 0)
                    return "Offline";

                if ((status & PRINTER_STATUS_ERROR) != 0) return "Error";
                if ((status & PRINTER_STATUS_PAPER_OUT) != 0) return "Paper out";
                if ((status & PRINTER_STATUS_PAPER_JAM) != 0) return "Paper jam";
                if ((status & PRINTER_STATUS_DOOR_OPEN) != 0) return "Door open";
                if ((status & PRINTER_STATUS_OFFLINE) != 0) return "Offline";

                return "OK";
            }
            finally
            {
                ClosePrinter(hPrinter);
            }
        }
        catch
        {
            return "Error";
        }
    }

    /// <summary>
    /// Purges all jobs from the printer queue. Use before sending a test feed so "Check now" prints only the test label.
    /// </summary>
    public static void PurgePrintQueue(string? printerName)
    {
        if (string.IsNullOrWhiteSpace(printerName) || !OperatingSystem.IsWindows())
            return;

        try
        {
            if (!OpenPrinter(printerName.Trim(), out IntPtr hPrinter, IntPtr.Zero))
                return;

            try
            {
                EnumJobs(hPrinter, 0, 64, 1, IntPtr.Zero, 0, out uint bytesNeeded, out uint _);
                if (bytesNeeded == 0) return;

                IntPtr buffer = Marshal.AllocHGlobal((int)bytesNeeded);
                try
                {
                    if (!EnumJobs(hPrinter, 0, 64, 1, buffer, bytesNeeded, out _, out uint numReturned))
                        return;
                    int ptrSize = IntPtr.Size;
                    int jobSize = 4 + (ptrSize * 6) + 4 + 4 + 4 + 4 + 4 + 16;
                    for (uint i = 0; i < numReturned; i++)
                    {
                        int offset = (int)i * jobSize;
                        uint jobId = (uint)Marshal.ReadInt32(buffer, offset);
                        SetJob(hPrinter, jobId, 0, IntPtr.Zero, JOB_CONTROL_DELETE);
                    }
                }
                finally
                {
                    Marshal.FreeHGlobal(buffer);
                }
            }
            finally
            {
                ClosePrinter(hPrinter);
            }
        }
        catch
        {
            // Ignore purge errors
        }
    }

    /// <summary>
    /// Checks the printer's queue for a recently failed job (e.g. paper out). Returns a short message if found, or null.
    /// Call this shortly after LineFeed/PrintRequest; the spooler may set job error status when the device fails.
    /// </summary>
    public static string? GetLastPrintJobError(string? printerName)
    {
        if (string.IsNullOrWhiteSpace(printerName) || !OperatingSystem.IsWindows())
            return null;

        try
        {
            if (!OpenPrinter(printerName.Trim(), out IntPtr hPrinter, IntPtr.Zero))
                return null;

            try
            {
                EnumJobs(hPrinter, 0, 64, 1, IntPtr.Zero, 0, out uint bytesNeeded, out uint _);
                if (bytesNeeded == 0) return null;

                IntPtr buffer = Marshal.AllocHGlobal((int)bytesNeeded);
                try
                {
                    if (!EnumJobs(hPrinter, 0, 64, 1, buffer, bytesNeeded, out _, out uint numReturned))
                        return null;
                    if (numReturned == 0) return null;

                    // JOB_INFO_1: JobId (4), 6 pointers, Status (4), Priority, Position, TotalPages, PagesPrinted (4 each), SYSTEMTIME (16)
                    int ptrSize = IntPtr.Size;
                    int jobSize = 4 + (ptrSize * 6) + 4 + 4 + 4 + 4 + 4 + 16;
                    for (int i = (int)numReturned - 1; i >= 0; i--)
                    {
                        int offset = i * jobSize;
                        int statusOffset = offset + 4 + (ptrSize * 6);
                        uint status = (uint)Marshal.ReadInt32(buffer, statusOffset);
                        if ((status & JOB_STATUS_PAPEROUT) != 0) return "Paper out";
                        if ((status & JOB_STATUS_ERROR) != 0) return "Print error";
                    }
                    return null;
                }
                finally
                {
                    Marshal.FreeHGlobal(buffer);
                }
            }
            finally
            {
                ClosePrinter(hPrinter);
            }
        }
        catch
        {
            return null;
        }
    }

    private static bool TryGetPrinterStatus(IntPtr hPrinter, out uint attributes, out uint status)
    {
        attributes = 0;
        status = 0;
        GetPrinter(hPrinter, 2, IntPtr.Zero, 0, out int bytesNeeded);
        if (bytesNeeded <= 0) return false;

        IntPtr buffer = Marshal.AllocHGlobal(bytesNeeded);
        try
        {
            if (!GetPrinter(hPrinter, 2, buffer, bytesNeeded, out _))
                return false;

            int ptrSize = IntPtr.Size;
            int offsetAttributes = ptrSize * 13;
            int offsetStatus = offsetAttributes + 4 * 5;

            attributes = (uint)Marshal.ReadInt32(buffer, offsetAttributes);
            status = (uint)Marshal.ReadInt32(buffer, offsetStatus);
            return true;
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }
}
