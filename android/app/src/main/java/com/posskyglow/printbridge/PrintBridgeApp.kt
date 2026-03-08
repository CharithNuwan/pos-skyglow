package com.posskyglow.printbridge

import android.app.Application
import java.util.Collections

class PrintBridgeApp : Application() {
    lateinit var preferences: AppPreferences
        private set

    val logBuffer: LogBuffer by lazy { LogBuffer() }

    override fun onCreate() {
        super.onCreate()
        preferences = AppPreferences(this)
    }
}

/** In-memory log for main screen; last 50 lines. */
class LogBuffer {
    private val lines = Collections.synchronizedList(mutableListOf<String>())
    private val max = 50

    fun add(message: String) {
        lines.add("${java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())} $message")
        while (lines.size > max) lines.removeAt(0)
    }

    fun getLines(): List<String> = lines.toList().reversed()
}
