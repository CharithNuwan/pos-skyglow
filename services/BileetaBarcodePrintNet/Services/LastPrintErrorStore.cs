namespace BileetaBarcodePrintNet.Services;

/// <summary>
/// Stores the last print failure message so Status can show it in the web UI
/// when Windows does not report it (e.g. paper out on USB label printers).
/// Cleared when a print or line feed succeeds.
/// </summary>
public static class LastPrintErrorStore
{
    private static readonly object Lock = new();
    private static string _lastError = "";

    public static void Set(string message)
    {
        lock (Lock)
        {
            _lastError = string.IsNullOrWhiteSpace(message) ? "Print failed" : message.Trim();
        }
    }

    public static string Get()
    {
        lock (Lock)
            return _lastError ?? "";
    }

    public static void Clear()
    {
        lock (Lock)
            _lastError = "";
    }
}
