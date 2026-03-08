package com.posskyglow.printbridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Foreground service that polls for pending print jobs and (later) sends them to Bluetooth printer.
 * Part 4: polls GET pending and logs; Part 5 adds Bluetooth + ESC/POS.
 */
class PrintService : Service() {
    private val running = AtomicBoolean(false)
    private var pollThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Print Bridge running"))
        startPolling()
    }

    override fun onDestroy() {
        isPolling = false
        running.set(false)
        pollThread?.interrupt()
        super.onDestroy()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun startPolling() {
        if (running.getAndSet(true)) return
        pollThread = Thread {
            val prefs = (application as PrintBridgeApp).preferences
            val baseUrl = prefs.serverUrl
            val token = prefs.printApiToken
            val companyId = prefs.companyId
            if (baseUrl.isBlank() || token.isBlank()) {
                Log.w(TAG, "PrintService: server URL or token missing, skipping poll")
                (application as? PrintBridgeApp)?.logBuffer?.add("Not configured")
                isPolling = false
                running.set(false)
                return@Thread
            }
            isPolling = true
            val pendingUrl = "$baseUrl/api/print-jobs/pending?token=${java.net.URLEncoder.encode(token, "UTF-8")}&company_id=$companyId"
            while (running.get() && !Thread.currentThread().isInterrupted) {
                try {
                    val jobs = fetchPending(pendingUrl)
                    if (jobs.isNotEmpty()) {
                        Log.i(TAG, "PrintService: claimed ${jobs.size} job(s)")
                        updateNotification("Print Bridge: printing ${jobs.size} job(s)")
                        (application as? PrintBridgeApp)?.logBuffer?.add("Claimed ${jobs.size} job(s)")
                        for (job in jobs) {
                            val ok = printJob(job, prefs)
                            reportJobStatus(baseUrl, token, job.job_id, ok)
                            (application as? PrintBridgeApp)?.logBuffer?.add("Job #${job.job_id}: ${if (ok) "done" else "failed"}")
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "PrintService: poll error", e)
                }
                try {
                    Thread.sleep(POLL_INTERVAL_MS)
                } catch (_: InterruptedException) {
                    break
                }
            }
            running.set(false)
            isPolling = false
        }.apply { isDaemon = true; start() }
    }

    private fun fetchPending(urlString: String): List<PrintJobDto> {
        val url = URL(urlString)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 10_000
        conn.readTimeout = 10_000
        conn.setRequestProperty("Accept", "application/json")
        val code = conn.responseCode
        if (code != 200) {
            conn.errorStream?.readBytes()?.toString(Charsets.UTF_8)?.let { Log.w(TAG, it) }
            return emptyList()
        }
        val body = conn.inputStream.readBytes().toString(Charsets.UTF_8)
        conn.disconnect()
        val json = JSONObject(body)
        val arr = json.optJSONArray("jobs") ?: return emptyList()
        val list = mutableListOf<PrintJobDto>()
        for (i in 0 until arr.length()) {
            val ob = arr.getJSONObject(i)
            list.add(
                PrintJobDto(
                    job_id = ob.optInt("job_id", 0),
                    type = ob.optString("type", "receipt"),
                    payload = ob.optJSONObject("payload") ?: JSONObject()
                )
            )
        }
        return list
    }

    private fun printJob(job: PrintJobDto, prefs: AppPreferences): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ContextCompat.checkSelfPermission(this, android.Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Bluetooth permission missing")
            return false
        }
        val address = prefs.printerAddress
        if (address.isBlank()) {
            Log.w(TAG, "No printer address configured")
            return false
        }
        val adapter = BluetoothAdapter.getDefaultAdapter() ?: return false
        if (!adapter.isEnabled) return false
        @Suppress("DEPRECATION")
        val device: BluetoothDevice? = adapter.getRemoteDevice(address)
        if (device == null) return false
        var socket: BluetoothSocket? = null
        return try {
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            socket.connect()
            val bytes = when (job.type) {
                "receipt" -> EscPosBuilder.buildReceipt(job.payload)
                else -> EscPosBuilder.buildReceipt(job.payload)
            }
            socket.outputStream.write(bytes)
            socket.outputStream.flush()
            Thread.sleep(500)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Print failed", e)
            false
        } finally {
            try { socket?.close() } catch (_: Exception) {}
        }
    }

    private fun reportJobStatus(baseUrl: String, token: String, jobId: Int, success: Boolean) {
        try {
            val url = URL("$baseUrl/api/print-jobs/$jobId")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "PUT"
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("X-Print-Token", token)
            conn.connectTimeout = 10_000
            conn.readTimeout = 10_000
            conn.outputStream.use { it.write(JSONObject().put("status", if (success) "done" else "failed").toString().toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            conn.disconnect()
            if (code !in 200..299) Log.w(TAG, "PUT job $jobId status returned $code")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to report job $jobId", e)
        }
    }

    private fun updateNotification(title: String) {
        try {
            getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, buildNotification(title))
        } catch (_: Exception) {}
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Print Bridge",
                NotificationManager.IMPORTANCE_LOW
            ).apply { setShowBadge(false) }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String): Notification {
        val pending = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setSmallIcon(android.R.drawable.ic_menu_manage)
            .setContentIntent(pending)
            .setOngoing(true)
            .build()
    }

    companion object {
        /** True while the polling loop is running; used by MainActivity to show status label. */
        @Volatile
        var isPolling: Boolean = false
            private set
        private const val TAG = "PrintService"
        private const val CHANNEL_ID = "print_bridge_channel"
        private const val NOTIFICATION_ID = 9001
        private const val POLL_INTERVAL_MS = 5000L
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }
}

/** Minimal DTO for a claimed print job. */
data class PrintJobDto(val job_id: Int, val type: String, val payload: JSONObject)
