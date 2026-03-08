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

        // Init
        send(ESC, 0x40) // ESC @
        // Center + double height for shop name
        send(ESC, 0x61, 1)   // center
        send(GS, 0x21, 0x10)  // double height
        sendStr(payload.optString("shop_name", "Receipt").take(32))
        send(LF)
        send(GS, 0x21, 0x00)  // normal
        sendStr(payload.optString("shop_phone", "").take(24))
        send(LF)
        send(ESC, 0x61, 0)   // left align
        sendStr("--------------------------------")
        send(LF)
        sendStr("Invoice: ${payload.optString("invoice_number", "")}")
        send(LF)
        sendStr("Date: ${payload.optString("sale_date", "").take(19)}")
        send(LF)
        payload.optString("customer_name", "").takeIf { it.isNotBlank() }?.let {
            sendStr("Customer: $it")
            send(LF)
        }
        sendStr("--------------------------------")
        send(LF)
        val items = payload.optJSONArray("items")
        if (items != null) {
            for (i in 0 until items.length()) {
                val it = items.getJSONObject(i)
                val name = it.optString("name", "Item").take(20)
                val qty = it.optInt("qty", 1)
                val total = it.optDouble("total", 0.0)
                val sym = payload.optString("currency_symbol", "$")
                sendStr(String.format("%-20s x%-2d %s%.2f", name, qty, sym, total))
                send(LF)
            }
        }
        sendStr("--------------------------------")
        send(LF)
        val sym = payload.optString("currency_symbol", "$")
        val subtotal = payload.optDouble("subtotal", 0.0)
        sendStr(String.format("Subtotal: %s%.2f", sym, subtotal))
        send(LF)
        val tax = payload.optDouble("tax_amount", 0.0)
        if (tax > 0) {
            sendStr(String.format("Tax:      %s%.2f", sym, tax))
            send(LF)
        }
        val discount = payload.optDouble("discount_amount", 0.0)
        if (discount > 0) {
            sendStr(String.format("Discount: -%s%.2f", sym, discount))
            send(LF)
        }
        send(GS, 0x21, 0x08)  // bold
        val total = payload.optDouble("total_amount", 0.0)
        sendStr(String.format("TOTAL:   %s%.2f", sym, total))
        send(LF)
        send(GS, 0x21, 0x00)
        sendStr("Payment: ${payload.optString("payment_method", "cash")}")
        send(LF)
        if (payload.optDouble("cash_received", 0.0) > 0) {
            sendStr(String.format("Cash:    %s%.2f", sym, payload.getDouble("cash_received")))
            send(LF)
            sendStr(String.format("Change:  %s%.2f", sym, payload.optDouble("change_amount", 0.0)))
            send(LF)
        }
        payload.optString("receipt_footer", "").takeIf { it.isNotBlank() }?.let {
            sendStr(it.take(32))
            send(LF)
        }
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
}
