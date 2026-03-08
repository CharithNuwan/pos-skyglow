package com.posskyglow.printbridge

import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.google.zxing.common.BitMatrix

/**
 * Generates CODE128 barcode as ESC/POS raster (GS v 0) so the printer draws it
 * as a bitmap. Use this when native GS k barcode commands are not supported.
 */
object BarcodeRasterHelper {
    private const val GS = 0x1D

    /**
     * Encodes [content] as CODE128 and returns ESC/POS raster bytes (GS v 0).
     * [widthPixels] should fit the printer (e.g. 384 for 58mm). [heightPixels] is barcode height.
     * Returns null if encoding fails.
     */
    @JvmStatic
    fun barcodeToEscPosRaster(
        content: String,
        widthPixels: Int = 384,
        heightPixels: Int = 80
    ): ByteArray? {
        return try {
            val matrix: BitMatrix = MultiFormatWriter().encode(
                content,
                BarcodeFormat.CODE_128,
                widthPixels,
                heightPixels
            )
            bitMatrixToGsV0(matrix)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Converts ZXing BitMatrix to GS v 0 m xL xH yL yH d1...dk.
     * Raster: row by row, each row is widthBytes bytes, 8 horizontal pixels per byte (MSB left).
     */
    private fun bitMatrixToGsV0(matrix: BitMatrix): ByteArray {
        val w = matrix.width
        val h = matrix.height
        val widthBytes = (w + 7) / 8
        val dataSize = widthBytes * h
        val out = ByteArray(8 + dataSize)  // GS v 0 m xL xH yL yH = 8 bytes
        out[0] = GS.toByte()
        out[1] = 0x76   // 'v'
        out[2] = 0x30   // '0'
        out[3] = 0       // m = 0 (normal)
        out[4] = (widthBytes and 0xFF).toByte()
        out[5] = (widthBytes shr 8 and 0xFF).toByte()
        out[6] = (h and 0xFF).toByte()
        out[7] = (h shr 8 and 0xFF).toByte()
        var idx = 8
        for (y in 0 until h) {
            for (bx in 0 until widthBytes) {
                var b = 0
                for (i in 0..7) {
                    val x = bx * 8 + (7 - i)
                    if (x < w && matrix.get(x, y)) b = b or (1 shl i)
                }
                out[idx++] = b.toByte()
            }
        }
        return out
    }
}
