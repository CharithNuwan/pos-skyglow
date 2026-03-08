package com.posskyglow.printbridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private val refreshLog = object : Runnable {
        override fun run() {
            updateServiceStatus()
            updateLog()
            handler.postDelayed(this, 2000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        val prefs = (application as PrintBridgeApp).preferences

        updateStatus(prefs)
        updateServiceStatus()
        updateLog()

        requestMissingPermissions()

        findViewById<Button>(R.id.main_btn_settings).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        findViewById<Button>(R.id.main_btn_start).setOnClickListener {
            startService(Intent(this, PrintService::class.java))
        }

        findViewById<Button>(R.id.main_btn_stop).setOnClickListener {
            stopService(Intent(this, PrintService::class.java))
        }

        findViewById<Button>(R.id.main_btn_test_print).setOnClickListener {
            doTestPrint()
        }
    }

    override fun onResume() {
        super.onResume()
        val prefs = (application as PrintBridgeApp).preferences
        updateStatus(prefs)
        updateServiceStatus()
        handler.removeCallbacks(refreshLog)
        handler.post(refreshLog)
    }

    override fun onPause() {
        handler.removeCallbacks(refreshLog)
        super.onPause()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQ_PERMISSIONS || grantResults.isEmpty()) return
        val notificationIndex = permissions.indexOf(Manifest.permission.POST_NOTIFICATIONS)
        if (notificationIndex >= 0) {
            if (grantResults[notificationIndex] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Notifications enabled ✓", Toast.LENGTH_SHORT).show()
            } else {
                showNotificationDeniedDialog()
            }
        }
    }

    /** Collects all missing runtime permissions (Bluetooth + notification) and requests them in one call. */
    private fun requestMissingPermissions() {
        val toRequest = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                toRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                toRequest.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        if (toRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, toRequest.toTypedArray(), REQ_PERMISSIONS)
        }
    }

    private fun showNotificationDeniedDialog() {
        AlertDialog.Builder(this)
            .setTitle("Notifications off")
            .setMessage("To show the running indicator when polling, enable notifications for Print Bridge.")
            .setPositiveButton("Open Settings") { _, _ ->
                startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:$packageName")
                })
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun updateStatus(prefs: AppPreferences) {
        findViewById<TextView>(R.id.main_status).text = if (prefs.isConfigured())
            "Server: ${prefs.serverUrl}\nCompany ID: ${prefs.companyId}"
        else
            "Not configured. Open Settings."
        findViewById<TextView>(R.id.main_printer).text = if (prefs.printerAddress.isNotBlank())
            "Printer: ${prefs.printerAddress}" else "Printer: —"
    }

    private fun updateServiceStatus() {
        findViewById<TextView>(R.id.main_service_status).text =
            if (PrintService.isPolling) "Status: Polling" else "Status: Stopped"
    }

    private fun updateLog() {
        val lines = (application as PrintBridgeApp).logBuffer.getLines()
        findViewById<TextView>(R.id.main_log).text = if (lines.isEmpty()) "—" else lines.joinToString("\n")
    }

    private fun doTestPrint() {
        val prefs = (application as PrintBridgeApp).preferences
        if (prefs.printerAddress.isBlank()) {
            Toast.makeText(this, "Select a printer in Settings first", Toast.LENGTH_SHORT).show()
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

    companion object {
        private const val REQ_PERMISSIONS = 1002
    }
}
