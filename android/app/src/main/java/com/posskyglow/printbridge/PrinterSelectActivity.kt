package com.posskyglow.printbridge

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * Lists paired Bluetooth devices; user selects one to use as receipt printer.
 */
class PrinterSelectActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_printer_select)
        val list = findViewById<ListView>(R.id.printer_list)
        val adapter = ArrayAdapter<String>(this, android.R.layout.simple_list_item_1, mutableListOf())
        list.adapter = adapter

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.BLUETOOTH_CONNECT), REQ_BT)
                list.setOnItemClickListener { _, _, _, _ -> }
                return
            }
        }

        val bt = BluetoothAdapter.getDefaultAdapter()
        if (bt == null || !bt.isEnabled) {
            adapter.add("Bluetooth is off or unavailable")
            return
        }
        @Suppress("DEPRECATION")
        val paired = bt.bondedDevices
        val pairedList = paired.toList()
        val names = pairedList.map { "${it.name ?: "Unknown"} (${it.address})" }
        adapter.clear()
        adapter.addAll(names)
        val addresses = pairedList.map { it.address }
        list.setOnItemClickListener { _, _, position, _ ->
            if (position < addresses.size) {
                (application as PrintBridgeApp).preferences.printerAddress = addresses[position]
                Toast.makeText(this, "Printer saved", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_BT && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            recreate()
        }
    }

    companion object {
        private const val REQ_BT = 1001
    }
}
