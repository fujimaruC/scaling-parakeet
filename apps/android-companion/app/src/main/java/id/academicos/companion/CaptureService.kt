package id.academicos.companion
import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

class CaptureService: NotificationListenerService() {
 companion object { var active: CaptureService? = null; private set }
 private var attempts=0
 fun describeActive(): List<String> = activeNotifications.filter {it.packageName=="com.whatsapp"}.map { "Title: ${it.notification.extras.getCharSequence(Notification.EXTRA_TITLE) ?: "[unavailable]"} | Group key: ${it.groupKey}" }
 private val executor=ThreadPoolExecutor(1,1,30,TimeUnit.SECONDS,ArrayBlockingQueue<Runnable>(100))
 private fun health(state: String){getSharedPreferences("health",0).edit().putString("listener",state).putLong("reported",System.currentTimeMillis()).apply()}
 override fun onListenerConnected(){active=this;attempts=0;health("connected");activeNotifications?.forEach {capture(it)}}
 override fun onListenerDisconnected(){active=null;health("disconnected");if(attempts<3){attempts++;android.os.Handler(mainLooper).postDelayed({try{requestRebind(android.content.ComponentName(this,CaptureService::class.java))}catch(_: Exception){health("rebind_blocked")}},attempts*3000L)}}
 override fun onNotificationPosted(event: StatusBarNotification){capture(event)}
 override fun onDestroy(){active=null;executor.shutdown();health("stopped");super.onDestroy()}
 private fun capture(event: StatusBarNotification){
  if(event.packageName!="com.whatsapp") return
  val settings=getSharedPreferences("capture",0)
  if(!settings.getBoolean("enabled",false) || !Transport(this).configured()) return
  val n=event.notification
  if((n.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return
  // Explicit owner-tested conjunction; this is a probe, no claim of universal conversation IDs.
  val title=n.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: return
  val expected=settings.getString("title","") ?: return
  val expectedGroup=settings.getString("group","") ?: return
  if(expected.isBlank() || expectedGroup.isBlank() || title!=expected || event.groupKey!=expectedGroup) return
  val messages=try{(Notification.Builder.recoverBuilder(this,n).style as? Notification.MessagingStyle)?.messages}catch(_:Exception){null}
  val selected=messages?.takeIf {it.isNotEmpty()}?.map {Pair(it.text?.toString() ?: "",if(it.timestamp>0)it.timestamp else null)}
   ?: listOf(Pair(n.extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: "",null))
  val parts=selected.filter {it.first.isNotBlank() && it.first.length<=16000}
  if(parts.isEmpty()) {health("hidden_or_empty_preview");return}
  for((text,time) in parts){
   val payload=JSONObject().put("notification_key",event.key).put("observed_at",event.postTime).put("source_message_at",time ?: JSONObject.NULL).put("text",text).toString()
   try {executor.execute {try {Queue(applicationContext).use {it.add(payload)}}catch(_: Exception){health("storage_error")}}} catch(_: java.util.concurrent.RejectedExecutionException){health("queue_overflow")}
  }
 }
}
