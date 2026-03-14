using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using ZXing;
using ZXing.Common;
using ZXing.Windows.Compatibility;

namespace BileetaBarcodePrintNet.Helpers;

/// <summary>
/// Renders a barcode label (same layout as TSPL templates) to a PNG file.
/// Uses 203 DPI equivalent so 1 TSPL dot = 1 pixel.
/// </summary>
public static class LabelToPngHelper
{
    private const int Dpi = 203; // Match thermal label printer DPI

    /// <summary>Convert mm to pixels at 203 DPI.</summary>
    private static int MmToPx(double mm) => (int)Math.Round(mm / 25.4 * Dpi);

    /// <summary>Map TSPL barcode type to ZXing BarcodeFormat.</summary>
    private static BarcodeFormat GetBarcodeFormat(string? tsplType)
    {
        if (string.IsNullOrWhiteSpace(tsplType)) return BarcodeFormat.CODE_128;
        var t = tsplType.Trim().ToUpperInvariant();
        if (t == "12" || t == "EAN13") return BarcodeFormat.EAN_13;
        if (t == "128" || t == "CODE128") return BarcodeFormat.CODE_128;
        return BarcodeFormat.CODE_128;
    }

    /// <summary>
    /// Renders one label to a bitmap in memory (same layout as PNG preview).
    /// Caller must dispose the returned bitmap. Returns null if layout or render fails.
    /// </summary>
    public static Bitmap? RenderLabelToBitmap(
        string templateId,
        string barcode,
        string price,
        string? desc1,
        string? desc2,
        string? itemCode,
        string? quantity,
        string? tsplBarcodeType)
    {
        int width, height;
        var layout = GetLayout(templateId, barcode, price, desc1, desc2, itemCode, quantity, out width, out height);
        if (layout == null) return null;

        var bmp = new Bitmap(width, height);
        bmp.SetResolution(Dpi, Dpi);
        using (var g = Graphics.FromImage(bmp))
        {
            g.Clear(Color.White);
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;
            g.TextRenderingHint = TextRenderingHint.AntiAlias;

            var format = GetBarcodeFormat(tsplBarcodeType);
            using (var barcodeBmp = RenderBarcode(barcode, format, layout.BarcodeHeight))
            {
                if (barcodeBmp != null)
                    g.DrawImage(barcodeBmp, layout.BarcodeX, layout.BarcodeY, layout.BarcodeWidth, layout.BarcodeHeight);
            }

            const float defaultFontSize = 8f;
            using var brush = new SolidBrush(Color.Black);
            foreach (var line in layout.TextLines)
            {
                float fontSize = line.FontSize > 0 ? line.FontSize : defaultFontSize;
                using var font = new Font("Arial", fontSize, FontStyle.Regular);
                float x = line.CenterHorizontally
                    ? (layout.Width - g.MeasureString(line.Text, font).Width) / 2
                    : line.X;
                g.DrawString(line.Text, font, brush, x, line.Y);
            }
        }
        return bmp;
    }

    /// <summary>
    /// Renders one label to PNG and saves to the given path.
    /// Returns true if saved successfully.
    /// </summary>
    public static bool SaveLabelPng(
        string templateId,
        string barcode,
        string price,
        string? desc1,
        string? desc2,
        string? itemCode,
        string? quantity,
        string? tsplBarcodeType,
        string outputPath)
    {
        try
        {
            using var bmp = RenderLabelToBitmap(templateId, barcode, price, desc1, desc2, itemCode, quantity, tsplBarcodeType);
            if (bmp == null) return false;
            var dir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir))
                Directory.CreateDirectory(dir);
            bmp.Save(outputPath, ImageFormat.Png);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private sealed class LabelLayout
    {
        public int BarcodeX { get; set; }
        public int BarcodeY { get; set; }
        public int BarcodeWidth { get; set; }
        public int BarcodeHeight { get; set; }
        public int Width { get; set; }
        public List<TextLineInfo> TextLines { get; } = new();
    }

    private sealed class TextLineInfo
    {
        public float X { get; set; }
        public float Y { get; set; }
        public string Text { get; set; } = "";
        public bool CenterHorizontally { get; set; }
        public float FontSize { get; set; } // 0 = use default (8f)
    }

    private static LabelLayout? GetLayout(
        string templateId,
        string? barcodeVal,
        string? priceVal,
        string? desc1Val,
        string? desc2Val,
        string? itemCodeVal,
        string? quantityVal,
        out int width,
        out int height)
    {
        width = 0;
        height = 0;
        var id = (templateId ?? "1").Trim();
        var priceStr = priceVal ?? "0.00";
        var barcodeStr = barcodeVal ?? "";
        if (id == "20")
        {
            width = MmToPx(30);
            height = MmToPx(20);
            var layout20 = new LabelLayout
            {
                BarcodeX = 6,
                BarcodeY = 10,
                BarcodeWidth = width - 12,
                BarcodeHeight = 80,
                Width = width
            };
            // Barcode number and price center-aligned on label
            layout20.TextLines.Add(new TextLineInfo { X = 0, Y = 92, Text = barcodeStr, CenterHorizontally = true, FontSize = 7f });
            layout20.TextLines.Add(new TextLineInfo { X = 0, Y = 116, Text = "Rs " + priceStr, CenterHorizontally = true, FontSize = 7f });
            return layout20;
        }
        if (id == "6")
        {
            width = MmToPx(50);
            height = MmToPx(25);
            var layout = new LabelLayout
            {
                BarcodeX = 20,
                BarcodeY = 95,
                BarcodeWidth = width - 40,
                BarcodeHeight = 50,
                Width = width
            };
            layout.TextLines.Add(new TextLineInfo { X = 20, Y = 20, Text = itemCodeVal ?? "" });
            layout.TextLines.Add(new TextLineInfo { X = 20, Y = 45, Text = desc1Val ?? "" });
            layout.TextLines.Add(new TextLineInfo { X = 20, Y = 70, Text = desc2Val ?? "" });
            layout.TextLines.Add(new TextLineInfo { X = 0, Y = 148, Text = barcodeStr, CenterHorizontally = true, FontSize = 7f });
            layout.TextLines.Add(new TextLineInfo { X = 20, Y = 160, Text = "Qty: " + (quantityVal ?? "1"), CenterHorizontally = true, FontSize = 10f });
            return layout;
        }
        width = MmToPx(50);
        height = MmToPx(25);
        var layout50 = new LabelLayout
        {
            BarcodeX = 20,
            BarcodeY = 95,
            BarcodeWidth = width - 40,
            BarcodeHeight = 50,
            Width = width
        };
        layout50.TextLines.Add(new TextLineInfo { X = 0, Y = 148, Text = barcodeStr, CenterHorizontally = true, FontSize = 7f });
        layout50.TextLines.Add(new TextLineInfo { X = 20, Y = 160, Text = "Rs " + priceStr, CenterHorizontally = true, FontSize = 11f });
        return layout50;
    }

    private static Bitmap? RenderBarcode(string content, BarcodeFormat format, int heightPx)
    {
        if (string.IsNullOrWhiteSpace(content)) return null;
        try
        {
            var writer = new BarcodeWriter
            {
                Format = format,
                Options = new EncodingOptions
                {
                    Height = Math.Max(40, heightPx),
                    Width = 200,
                    PureBarcode = true,
                    Margin = 2
                }
            };
            var bmp = writer.Write(content);
            return bmp;
        }
        catch
        {
            return null;
        }
    }
}
