package id.academicos.companion
import android.app.Activity
import android.app.ActivityManager
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.*
import android.view.WindowManager

class MainActivity: Activity(){
 private lateinit var content: LinearLayout
 override fun onCreate(saved: Bundle?){super.onCreate(saved);window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);render()}
 override fun onResume(){super.onResume();render()}
 override fun onNewIntent(value:Intent){super.onNewIntent(value);setIntent(value);render()}
 private fun button(text:String,action:()->Unit){content.addView(Button(this).apply {this.text=text;setOnClickListener{action()}})}
 private fun line(text:String){content.addView(TextView(this).apply {this.text=text;textSize=16f;setPadding(0,16,0,16)})}
 private fun repair(code:String){
  android.util.Log.e("AOS-PROBE","queueRepair=true code=$code")
  line("Academic OS · Queue repair required")
  line("$code. Capture and transfer are blocked. No automatic key replacement is allowed. Owner action is required; interrupted resets stay blocked.")
  button("Reset private queue and pairing"){
   android.app.AlertDialog.Builder(this).setMessage("Permanently discard all queued notifications and encrypted pairing/batch state? Capture will pause. Re-pair with Linux afterward. Untransferred events will be lost; use an export on Linux to backfill where possible.").setPositiveButton("Reset"){_,_->
    try{Queue.resetAfterOwnerConfirmation(this);render()}catch(_:Exception){line("Reset incomplete. Capture stays blocked. Retry the reset; no new key is generated.")}
   }.setNegativeButton("Cancel",null).show()
  }
 }
 private fun render(){
  content=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setPadding(28,32,28,32)};setContentView(ScrollView(this).apply {addView(content)})
  val low=(getSystemService(ACTIVITY_SERVICE) as ActivityManager).isLowRamDevice
  val granted=Settings.Secure.getString(contentResolver,"enabled_notification_listeners")?.split(":")?.any {it=="$packageName/$packageName.CaptureService" || it=="$packageName/.CaptureService"}==true
  val health=getSharedPreferences("health",0);val settings=getSharedPreferences("capture",0)
  val evidenceRun=intent.getStringExtra("evidence_run")
  if(evidenceRun!=null && evidenceRun.matches(Regex("[0-9a-f-]{36}"))){
   val count=try{Queue(this).use {it.count()}}catch(_:Exception){null}
   val record=org.json.JSONObject().put("run",evidenceRun).put("android_api",android.os.Build.VERSION.SDK_INT).put("device_model",android.os.Build.MODEL).put("device_build",android.os.Build.DISPLAY).put("version",packageManager.getPackageInfo(packageName,0).versionName).put("notification_access",granted).put("low_ram",low).put("queue_count",count?:org.json.JSONObject.NULL).put("observed_gap_count",health.getInt("gaps",0)).put("repair_required",count==null)
   android.util.Log.i("AOS-EVIDENCE",record.toString())
  }

  val queued=try{Queue(this).use {it.count()}}catch(e:QueueUnavailable){repair(e.code);return}catch(_:Exception){repair("QUEUE_STORAGE_UNAVAILABLE");return}
  // Sanitized device record for M0 evidence: booleans and counts only, never message content.
  android.util.Log.i("AOS-PROBE","lowRam=$low granted=$granted listener=${health.getString("listener","unknown")} queue=$queued gaps=${health.getInt("gaps",0)}")
  line("Academic OS · Android 9 probe")
  line("Notification access: $granted · low-RAM: $low\nListener: ${health.getString("listener","unknown")}\nQueue: $queued events · observed drops: ${health.getInt("gaps",0)}")
  if(health.getBoolean("owner_reset",false))line("Owner reset recorded. Earlier untransferred events may have been discarded; an empty queue does not prove complete collection.")
  line("Partial coverage only. Missing notifications cannot be recovered here. Private transfer queues until Linux is reachable. Delivery and complete message coverage are never guaranteed.")
  button("Notification access settings"){startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))}
  line("Test only an owner-controlled synthetic conversation. Verify exact title AND notification group key locally. Leave disabled until verified; no broad capture.")
  button("Inspect active WhatsApp metadata"){val service=CaptureService.active;if(service==null)line("Listener not connected; no metadata inspected.")else try{service.describeActive().forEach {line(it)}}catch(_: Exception){line("Metadata unavailable")}}
  val title=EditText(this).apply {hint="Verified notification title";setText(settings.getString("title",""))};content.addView(title)
  val group=EditText(this).apply {hint="Verified notification group key";setText(settings.getString("group",""))};content.addView(group)
  val enabled=Switch(this).apply {text="Enable selected test conversation";isChecked=settings.getBoolean("enabled",false);isEnabled=!low};content.addView(enabled)
  button("Save selected mapping") {if(Queue(this).use {it.count()}>0&&(title.text.toString()!=settings.getString("title","")||group.text.toString()!=settings.getString("group",""))){line("Sync or wipe the old queue before changing conversation mapping");return@button};settings.edit().putString("title",title.text.toString()).putString("group",group.text.toString()).putBoolean("enabled",enabled.isChecked && title.text.isNotBlank() && group.text.isNotBlank()).apply();render()}
  line("Pair only with your private Linux HTTPS receiver. Verify the certificate fingerprint on Linux. No cloud or account keys are entered here.")
  val endpoint=EditText(this).apply {hint="https://PRIVATE-LINUX-HOST:8766"};content.addView(endpoint)
  val pin=EditText(this).apply {hint="Receiver certificate SHA-256"};content.addView(pin)
  val token=EditText(this).apply {hint="5-minute pairing invitation";inputType=129};content.addView(token)
  button("Pair private receiver"){val address=endpoint.text.toString();val fingerprint=pin.text.toString();val invitation=token.text.toString();token.setText("");Thread{try{Transport(this).pair(address,fingerprint,invitation);SyncJob.schedule(this);runOnUiThread {line("Paired. Test synthetic transfer before real groups.")}}catch(_:Exception){runOnUiThread {line("Pairing failed. Check invitation, private connection, peer fingerprint, hostname and time.")}}}.start()}
  button("Sync queued events"){Thread{try{Transport(this).sync();runOnUiThread {render()}}catch(_:Exception){runOnUiThread {line("Sync pending. Queue retained; check private receiver and peer identity.")}}}.start()}
  if(Transport(this).configured())SyncJob.schedule(this)
  button("Pause collection"){settings.edit().putBoolean("enabled",false).apply();render()}
  button("Wipe local queue"){android.app.AlertDialog.Builder(this).setMessage("Delete all queued raw notifications?").setPositiveButton("Delete"){_,_->Queue(this).use {it.wipe()};Transport(this).clearPending();render()}.setNegativeButton("Cancel",null).show()}
 }
}
