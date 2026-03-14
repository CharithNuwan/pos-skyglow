using System.Drawing;
using System.Text;

namespace BileetaBarcodePrintNet.Helpers;

/// <summary>
/// Converts a bitmap to TSPL BITMAP command so the Xprinter can print the image.
/// Uses 203 DPI; bitmap is converted to 1-bit monochrome (black/white), width padded to multiple of 8.
/// </summary>
public static class BitmapToTsplHelper
{
    private const int Dpi = 203;

    /// <summary>
    /// Converts a bitmap to TSPL commands (SIZE, GAP, DIRECTION, CLS, BITMAP, PRINT).
    /// The bitmap is converted to 1-bit monochrome; width is padded to a multiple of 8 pixels.
    /// Caller must dispose the bitmap; this method does not take ownership.
    /// </summary>
    public static string? BitmapToTsplBitmap(Bitmap bmp)
    {
        if (bmp == null || bmp.Width <= 0 || bmp.Height <= 0) return null;
        try
        {
            int w = bmp.Width;
            int h = bmp.Height;
            int stride = (w + 7) / 8;
            int paddedW = stride * 8;

            double widthMm = w * 25.4 / Dpi;
            double heightMm = h * 25.4 / Dpi;

            var sb = new StringBuilder();
            sb.Append("SIZE ").Append(widthMm.ToString("0.##")).Append(" mm, ").Append(heightMm.ToString("0.##")).Append(" mm\r\n");
            sb.Append("GAP 2 mm, 0 mm\r\n");
            sb.Append("DIRECTION 1\r\n");
            sb.Append("CLS\r\n");

            var hexData = EncodeBitmapToTsplHex(bmp, paddedW, h, stride);
            if (hexData == null) return null;
            sb.Append("BITMAP 0,0,").Append(paddedW).Append(",").Append(h).Append(",1,").Append(hexData).Append("\r\n");
            sb.Append("PRINT 1,1\r\n");
            return sb.ToString();
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Encodes bitmap as 1-bit row data: 8 pixels per byte, MSB = left, 1 = black. Hex-encoded.
    /// Pads each row to paddedW (multiple of 8). Returns null on error.
    /// </summary>
    private static string? EncodeBitmapToTsplHex(Bitmap bmp, int paddedW, int height, int stride)
    {
        try
        {
            var bytes = new List<byte>();
            for (int y = 0; y < height; y++)
            {
                for (int byteIndex = 0; byteIndex < stride; byteIndex++)
                {
                    byte b = 0;
                    for (int bit = 0; bit < 8; bit++)
                    {
                        int x = byteIndex * 8 + bit;
                        if (x < bmp.Width && IsBlack(bmp, x, y))
                            b |= (byte)(0x80 >> bit);
                    }
                    bytes.Add(b);
                }
            }
            var hex = new StringBuilder(bytes.Count * 2);
            foreach (byte b in bytes)
                hex.Append(b.ToString("X2"));
            return hex.ToString();
        }
        catch
        {
            return null;
        }
    }

    private static bool IsBlack(Bitmap bmp, int x, int y)
    {
        Color c = bmp.GetPixel(x, y);
        int gray = (c.R + c.G + c.B) / 3;
        return gray < 128;
    }
}
