package com.posskyglow.printbridge

import org.json.JSONObject
import java.nio.charset.Charset

/**
 * Builds ESC/POS byte array for thermal receipt from payload JSON
 * (invoice_number, items[], subtotal, total_amount, shop_name, etc.).
 */
object EscPosBuilder {
    private val CHARSET = Charset.forName("UTF-8")

    private const val ESC = 0x1B
    private const val GS = 0x1D
    private const val LF = 0x0A

    fun buildReceipt(payload: JSONObject): ByteArray {
        val out = mutableListOf<Byte>()
        fun send(vararg b: Int) = b.forEach { out.add(it.toByte()) }
        fun sendStr(s: String) = out.addAll(s.toByteArray(CHARSET).toList())
        val sym = payload.optString("currency_symbol", "$")

        // Init
        send(ESC, 0x40) // ESC @
        // ---- Header: centered, shop name double-height ----
        send(ESC, 0x61, 1)   // center
        send(GS, 0x21, 0x10)  // double height
        val shopTitle = if (payload.optString("invoice_number", "").startsWith("TEST-")) "Testing" else payload.optString("shop_name", "Receipt")
        sendStr(shopTitle.take(32))
        send(LF)
        send(GS, 0x21, 0x00)  // normal
        if (payload.optString("thermal_show_address", "1") != "0") {
            payload.optString("shop_address", "").takeIf { it.isNotBlank() }?.let { sendStr(it.take(32)); send(LF) }
        }
        sendStr(payload.optString("shop_phone", "").take(24))
        send(LF)
        payload.optString("shop_email", "").takeIf { it.isNotBlank() }?.let { sendStr(it.take(32)); send(LF) }
        if (payload.optString("thermal_show_header", "1") != "0") {
            payload.optString("receipt_header", "").takeIf { it.isNotBlank() }?.let { sendStr(it.take(32)); send(LF) }
        }
        send(ESC, 0x61, 0)   // left align
        sendStr("--------------------------------")
        send(LF)
        // ---- Transaction ----
        sendStr("Invoice: ${payload.optString("invoice_number", "")}")
        send(LF)
        sendStr("Date: ${payload.optString("sale_date", "").take(19)}")
        send(LF)
        payload.optString("cashier_name", "").takeIf { it.isNotBlank() }?.let { sendStr("Cashier: $it"); send(LF) }
        payload.optString("customer_name", "").takeIf { it.isNotBlank() }?.let { sendStr("Customer: $it"); send(LF) }
        sendStr("--------------------------------")
        send(LF)
        // ---- Items table: header then rows ----
        sendStr(String.format("%-10s %2s %8s %8s", "Item", "Qty", "Price", "Total"))
        send(LF)
        val items = payload.optJSONArray("items")
        if (items != null) {
            for (i in 0 until items.length()) {
                val it = items.getJSONObject(i)
                val name = it.optString("name", "Item").take(10)
                val qty = it.optInt("qty", 1)
                val unitPrice = it.optDouble("unit_price", 0.0)
                val total = it.optDouble("total", 0.0)
                sendStr(String.format("%-10s %2d %s%6.2f %s%6.2f", name, qty, sym, unitPrice, sym, total))
                send(LF)
            }
        }
        sendStr("--------------------------------")
        send(LF)
        val subtotal = payload.optDouble("subtotal", 0.0)
        sendStr(String.format("Subtotal %s%.2f", sym, subtotal))
        send(LF)
        val tax = payload.optDouble("tax_amount", 0.0)
        if (tax > 0) {
            sendStr(String.format("Tax      %s%.2f", sym, tax))
            send(LF)
        }
        val discount = payload.optDouble("discount_amount", 0.0)
        if (discount > 0) {
            sendStr(String.format("Discount -%s%.2f", sym, discount))
            send(LF)
        }
        send(GS, 0x21, 0x08)  // bold
        val total = payload.optDouble("total_amount", 0.0)
        sendStr(String.format("TOTAL    %s%.2f", sym, total))
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr("--------------------------------")
        send(LF)
        sendStr("Payment: ${payload.optString("payment_method", "cash")}")
        send(LF)
        if (payload.optDouble("cash_received", 0.0) > 0) {
            sendStr(String.format("Cash:    %s%.2f", sym, payload.getDouble("cash_received")))
            send(LF)
            sendStr(String.format("Change:  %s%.2f", sym, payload.optDouble("change_amount", 0.0)))
            send(LF)
        }
        send(ESC, 0x61, 1)   // center for footer
        payload.optString("receipt_footer", "").takeIf { it.isNotBlank() }?.let { sendStr(it.take(32)); send(LF) }
        sendStr("*** Thank you for your business ***")
        send(LF)
        send(ESC, 0x61, 0)
        send(LF, LF)
        send(GS, 0x56, 0)  // full cut
        return out.toByteArray()
    }

    /** Builds a short test receipt (title + date/time). */
    fun buildTestReceipt(shopName: String = "Print Bridge"): ByteArray {
        val out = mutableListOf<Byte>()
        fun send(vararg b: Int) = b.forEach { out.add(it.toByte()) }
        fun sendStr(s: String) = out.addAll(s.toByteArray(CHARSET).toList())

        send(ESC, 0x40)
        send(ESC, 0x61, 1)
        send(GS, 0x21, 0x10)
        sendStr(shopName.take(32))
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr("Test print")
        send(LF)
        send(ESC, 0x61, 0)
        sendStr("--------------------------------")
        send(LF)
        sendStr("Date: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())}")
        send(LF)
        sendStr("--------------------------------")
        send(LF)
        sendStr("If you see this, the printer")
        send(LF)
        sendStr("is working correctly.")
        send(LF, LF)
        send(GS, 0x56, 0)
        return out.toByteArray()
    }

    /** Builds a short receipt for auth/config errors so user knows printer works but token/company ID may be wrong. */
    fun buildConfigErrorReceipt(): ByteArray {
        val out = mutableListOf<Byte>()
        fun send(vararg b: Int) = b.forEach { out.add(it.toByte()) }
        fun sendStr(s: String) = out.addAll(s.toByteArray(CHARSET).toList())
        send(ESC, 0x40)
        send(ESC, 0x61, 1)
        send(GS, 0x21, 0x10)
        sendStr("Testing")
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr("Check API token")
        send(LF)
        sendStr("and company ID")
        send(LF)
        send(ESC, 0x61, 0)
        sendStr("--------------------------------")
        send(LF)
        sendStr("If you see this, printer")
        send(LF)
        sendStr("works but token or")
        send(LF)
        sendStr("company ID is wrong.")
        send(LF, LF)
        send(GS, 0x56, 0)
        return out.toByteArray()
    }

    /**
     * Builds a "font size check" receipt showing Normal, Double height, Double width, Bold, and Quad (2x2).
     * Use this to see which modes your thermal printer supports.
     */
    fun buildFontSizeCheckReceipt(shopName: String = "Shop"): ByteArray {
        val out = mutableListOf<Byte>()
        fun send(vararg b: Int) = b.forEach { out.add(it.toByte()) }
        fun sendStr(s: String) = out.addAll(s.toByteArray(CHARSET).toList())

        send(ESC, 0x40)
        send(ESC, 0x61, 1)   // center
        send(GS, 0x21, 0x10)  // double height
        sendStr("Font size check")
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr(shopName.take(32))
        send(LF)
        sendStr(java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date()))
        send(LF)
        send(ESC, 0x61, 0)   // left
        sendStr("--------------------------------")
        send(LF)
        sendStr("Normal (1x1):")
        send(LF)
        sendStr("The quick brown fox")
        send(LF)
        sendStr("--------------------------------")
        send(LF)
        sendStr("Double height (2x1):")
        send(LF)
        send(GS, 0x21, 0x10)
        sendStr("Tall text 2x1")
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr("--------------------------------")
        send(LF)
        sendStr("Double width (1x2):")
        send(LF)
        send(GS, 0x21, 0x01)
        sendStr("Wide 1x2")
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr("--------------------------------")
        send(LF)
        sendStr("Bold:")
        send(LF)
        send(GS, 0x21, 0x08)
        sendStr("Bold text")
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr("--------------------------------")
        send(LF)
        sendStr("Quad / 2x2 (if supported):")
        send(LF)
        send(GS, 0x21, 0x11)
        sendStr("2x2")
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr("--------------------------------")
        send(LF)
        sendStr("Compare lines above to see")
        send(LF)
        sendStr("what your printer supports.")
        send(LF, LF)
        send(GS, 0x56, 0)
        return out.toByteArray()
    }
}
