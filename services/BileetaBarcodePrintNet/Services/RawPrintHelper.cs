using System.Runtime.InteropServices;
using System.Text;

namespace BileetaBarcodePrintNet.Services;

/// <summary>
/// Sends raw bytes to a Windows printer via the spooler (StartDocPrinter / WritePrinter).
/// Same mechanism as "normal print" — one job with exact content, no file copy.
/// </summary>
public static class RawPrintHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    private struct DOC_INFO_1
    {
        public string pDocName;
        public string pOutputFile;
        public string pDatatype;
    }

    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern bool StartDocPrinter(IntPtr hPrinter, int level, IntPtr pDocInfo);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr hPrinter, byte[] pBuf, int cbBuf, out int pcWritten);

    /// <summary>
    /// Sends raw data to the printer as a single spooler job (datatype RAW).
    /// Use a unique document name so the spooler does not merge or replay a previous job.
    /// Returns true if all bytes were sent; false otherwise.
    /// </summary>
    /// <param name="printerName">Exact printer name as in Windows Settings (e.g. "Xprinter XP-T202UA").</param>
    /// <param name="data">Raw bytes to send (e.g. TSPL).</param>
    /// <param name="documentName">Optional unique job name (e.g. "Barcode 2e815a4a"). If null, uses "Barcode Label".</param>
    public static bool SendRawBytes(string printerName, byte[] data, string? documentName = null)
    {
        if (string.IsNullOrWhiteSpace(printerName) || data == null || data.Length == 0)
            return false;

        if (!OperatingSystem.IsWindows())
            return false;

        IntPtr hPrinter = IntPtr.Zero;
        try
        {
            if (!OpenPrinter(printerName.Trim(), out hPrinter, IntPtr.Zero))
                return false;

            var docInfo = new DOC_INFO_1
            {
                pDocName = string.IsNullOrWhiteSpace(documentName) ? "Barcode Label" : documentName,
                pOutputFile = null!,
                pDatatype = "RAW"
            };

            int size = Marshal.SizeOf(docInfo);
            IntPtr pDocInfo = Marshal.AllocHGlobal(size);
            try
            {
                Marshal.StructureToPtr(docInfo, pDocInfo, false);
                if (!StartDocPrinter(hPrinter, 1, pDocInfo))
                    return false;
            }
            finally
            {
                Marshal.DestroyStructure(pDocInfo, typeof(DOC_INFO_1));
                Marshal.FreeHGlobal(pDocInfo);
            }

            try
            {
                if (!StartPagePrinter(hPrinter))
                    return false;

                if (!WritePrinter(hPrinter, data, data.Length, out int written) || written != data.Length)
                    return false;

                EndPagePrinter(hPrinter);
            }
            finally
            {
                EndDocPrinter(hPrinter);
            }

            return true;
        }
        finally
        {
            if (hPrinter != IntPtr.Zero)
                ClosePrinter(hPrinter);
        }
    }

    /// <summary>
    /// Sends a string as raw bytes using the given encoding (e.g. Encoding.Default for TSPL).
    /// </summary>
    /// <param name="documentName">Optional unique job name so the spooler does not replay the previous job.</param>
    public static bool SendRawString(string printerName, string content, Encoding encoding, string? documentName = null)
    {
        if (string.IsNullOrEmpty(content))
            return false;
        byte[] data = encoding.GetBytes(content);
        return SendRawBytes(printerName, data, documentName);
    }
}
