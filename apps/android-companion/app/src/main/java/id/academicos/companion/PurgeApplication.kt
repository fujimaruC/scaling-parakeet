package id.academicos.companion

/** Order is a privacy guarantee: no application acknowledgment before durable local work. */
internal object PurgeApplication {
    fun apply(pause: () -> Unit, wipe: () -> Unit, clearBatch: () -> Unit, acknowledge: () -> Unit) {
        pause()
        wipe()
        clearBatch()
        acknowledge()
    }
}
