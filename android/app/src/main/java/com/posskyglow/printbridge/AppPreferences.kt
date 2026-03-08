package com.posskyglow.printbridge

import android.content.Context
import android.content.SharedPreferences

/**
 * Stores server URL, print API token, company ID, and shop name
 * for the Print Bridge Android app.
 */
class AppPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, "") ?: ""
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value?.trim()?.removeSuffix("/") ?: "").apply()

    var printApiToken: String
        get() = prefs.getString(KEY_PRINT_API_TOKEN, "") ?: ""
        set(value) = prefs.edit().putString(KEY_PRINT_API_TOKEN, value ?: "").apply()

    var companyId: Int
        get() = prefs.getInt(KEY_COMPANY_ID, 1)
        set(value) = prefs.edit().putInt(KEY_COMPANY_ID, value).apply()

    var shopName: String
        get() = prefs.getString(KEY_SHOP_NAME, "") ?: ""
        set(value) = prefs.edit().putString(KEY_SHOP_NAME, value ?: "").apply()

    /** Saved Bluetooth printer address (e.g. "00:11:22:33:44:55"). */
    var printerAddress: String
        get() = prefs.getString(KEY_PRINTER_ADDRESS, "") ?: ""
        set(value) = prefs.edit().putString(KEY_PRINTER_ADDRESS, value ?: "").apply()

    fun isConfigured(): Boolean = serverUrl.isNotBlank() && printApiToken.isNotBlank()

    companion object {
        private const val PREFS_NAME = "print_bridge_prefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_PRINT_API_TOKEN = "print_api_token"
        private const val KEY_COMPANY_ID = "company_id"
        private const val KEY_SHOP_NAME = "shop_name"
        private const val KEY_PRINTER_ADDRESS = "printer_address"
    }
}
