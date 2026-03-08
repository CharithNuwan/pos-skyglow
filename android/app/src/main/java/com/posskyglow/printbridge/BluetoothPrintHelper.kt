package com.posskyglow.printbridge

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import java.util.UUID

/** Shared helper to send raw bytes to a Bluetooth printer (used by MainActivity and SettingsActivity). */
object BluetoothPrintHelper {
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    fun sendToPrinter(address: String, bytes: ByteArray): Boolean {
        val adapter = BluetoothAdapter.getDefaultAdapter() ?: return false
        if (!adapter.isEnabled) return false
        val device: BluetoothDevice? = try {
            @Suppress("DEPRECATION")
            adapter.getRemoteDevice(address)
        } catch (e: Exception) {
            null
        } ?: return false
        var socket: BluetoothSocket? = null
        return try {
            socket = device!!.createRfcommSocketToServiceRecord(SPP_UUID)
            socket!!.connect()
            socket!!.outputStream.write(bytes)
            socket!!.outputStream.flush()
            Thread.sleep(500)
            true
        } catch (e: Exception) {
            false
        } finally {
            try { socket?.close() } catch (_: Exception) {}
        }
    }
}
