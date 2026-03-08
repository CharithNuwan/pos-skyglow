package com.posskyglow.printbridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class SettingsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        val app = application as PrintBridgeApp
        val prefs = app.preferences

        findViewById<EditText>(R.id.settings_server_url).setText(prefs.serverUrl)
        findViewById<EditText>(R.id.settings_token).setText(prefs.printApiToken)
        findViewById<EditText>(R.id.settings_company_id).setText(prefs.companyId.toString())
        findViewById<EditText>(R.id.settings_shop_name).setText(prefs.shopName)

        findViewById<Button>(R.id.settings_select_printer).setOnClickListener {
            startActivity(Intent(this, PrinterSelectActivity::class.java))
        }

        findViewById<Button>(R.id.settings_test_print).setOnClickListener {
            doTestPrint()
        }

        findViewById<Button>(R.id.settings_save).setOnClickListener {
            val url = findViewById<EditText>(R.id.settings_server_url).text.toString().trim().removeSuffix("/")
            val token = findViewById<EditText>(R.id.settings_token).text.toString().trim()
            val companyId = findViewById<EditText>(R.id.settings_company_id).text.toString().toIntOrNull() ?: 1
            val shopName = findViewById<EditText>(R.id.settings_shop_name).text.toString().trim()
            if (url.isBlank()) {
                Toast.makeText(this, "Server URL required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (token.isBlank()) {
                Toast.makeText(this, "Print API token required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.serverUrl = url
            prefs.printApiToken = token
            prefs.companyId = companyId
            prefs.shopName = shopName
            Toast.makeText(this, "Settings saved", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    private fun doTestPrint() {
        val prefs = (application as PrintBridgeApp).preferences
        if (prefs.printerAddress.isBlank()) {
            Toast.makeText(this, "Select a printer first", Toast.LENGTH_SHORT).show()
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this, "Bluetooth permission required", Toast.LENGTH_SHORT).show()
            return
        }
        val shopName = prefs.shopName.ifBlank { "Print Bridge" }
        Thread {
            val success = BluetoothPrintHelper.sendToPrinter(prefs.printerAddress, EscPosBuilder.buildTestReceipt(shopName))
            runOnUiThread {
                if (success) {
                    Toast.makeText(this, "Test print sent ✓", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Test print failed. Check printer is on and paired.", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }
}
