package id.academicos.companion
import android.app.Activity
import android.app.ActivityManager
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.provider.Settings
import android.view.WindowManager
import android.widget.*
import id.academicos.companion.ledger.Ui

// Existing capture, queue, receipt and pairing implementations are used unchanged.
// This local screen is always reachable, even when owner-cloud authentication is unavailable.
class CaptureActivity:Activity(){
    private lateinit var ui:Ui
    private lateinit var content:LinearLayout
    override fun attachBaseContext(base:Context){val cfg=Configuration(base.resources.configuration).apply{setLocale(java.util.Locale(base.getSharedPreferences("owner-ui",0).getString("language","id")?:"id"))};super.attachBaseContext(base.createConfigurationContext(cfg))}
    override fun onCreate(saved:Bundle?){val pref=getSharedPreferences("owner-ui",0);val dark=when(pref.getString("theme","system")){"dark"->true;"light"->false;else->resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK==Configuration.UI_MODE_NIGHT_YES};setTheme(if(dark)R.style.NativeDark else R.style.NativeLight);super.onCreate(saved);window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);ui=Ui(this);ui.configureWindow()}
    override fun onResume(){super.onResume();render()}
    private fun line(value:String){content.addView(ui.message(value))}
    private fun button(key:String,action:()->Unit){content.addView(ui.button(ui.t(key),action=action))}
    private fun repair(code:String){line(ui.t("queue_repair"));line(code);line(ui.t("queue_repair_help"));button("reset_queue"){AlertDialog.Builder(this).setMessage(ui.t("reset_queue_confirm")).setNegativeButton(ui.t("cancel"),null).setPositiveButton(ui.t("yes")){_,_->try{Queue.resetAfterOwnerConfirmation(this);render()}catch(_:Exception){line(ui.t("reset_incomplete"))}}.show()}}
    private fun render(){
        content=ui.column();content.setBackgroundColor(ui.bg);setContentView(ScrollView(this).apply{addView(content)});button("back"){finish()};content.addView(ui.text(ui.t("capture_status"),28f,true))
        val low=(getSystemService(ACTIVITY_SERVICE) as ActivityManager).isLowRamDevice
        val granted=Settings.Secure.getString(contentResolver,"enabled_notification_listeners")?.split(":")?.any{it=="$packageName/$packageName.CaptureService"||it=="$packageName/.CaptureService"}==true
        val health=getSharedPreferences("health",0);val settings=getSharedPreferences("capture",0)
        val queued=try{Queue(this).use{it.count()}}catch(e:QueueUnavailable){repair(e.code);return}catch(_:Exception){repair("QUEUE_STORAGE_UNAVAILABLE");return}
        line(ui.t("permission")+": $granted · "+ui.t("low_ram")+": $low");line(ui.t("listener")+": "+health.getString("listener","unknown"));line(ui.t("queue_status")+": $queued · "+ui.t("observed_gaps")+": "+health.getInt("gaps",0))
        if(health.getBoolean("owner_reset",false))line(ui.t("owner_reset"));line(ui.t("capture_limitations"));button("notification_settings"){startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))};line(ui.t("test_mapping"))
        button("inspect_metadata"){val service=CaptureService.active;if(service==null)line(ui.t("listener_disconnected"))else try{service.describeActive().forEach{line(it)}}catch(_:Exception){line(ui.t("metadata_unavailable"))}}
        val title=ui.field(content,"verified_title",settings.getString("title","")?:"");val group=ui.field(content,"verified_group",settings.getString("group","")?:"")
        val enabled=ui.check(content,"enable_mapping",settings.getBoolean("enabled",false));enabled.isEnabled=!low
        button("save_mapping"){
            try{if(Queue(this).use{it.count()}>0&&(title.text.toString()!=settings.getString("title","")||group.text.toString()!=settings.getString("group",""))){line(ui.t("mapping_blocked"));return@button};settings.edit().putString("title",title.text.toString()).putString("group",group.text.toString()).putBoolean("enabled",enabled.isChecked&&title.text.isNotBlank()&&group.text.isNotBlank()).apply();render()}catch(_:Exception){line(ui.t("queue_repair_help"))}
        }
        line(ui.t("pair_notice"));val endpoint=ui.field(content,"private_endpoint");val pin=ui.field(content,"certificate_pin");val token=ui.field(content,"pair_grant",secret=true)
        button("pair"){val address=endpoint.text.toString();val fingerprint=pin.text.toString();val invitation=token.text.toString();token.setText("");Thread{try{Transport(this).pair(address,fingerprint,invitation);SyncJob.schedule(this);runOnUiThread{line(ui.t("paired"))}}catch(_:Exception){runOnUiThread{if(!isDestroyed)line(ui.t("pair_failed"))}}}.start()}
        button("sync_queue"){Thread{try{Transport(this).sync();runOnUiThread{if(!isDestroyed)render()}}catch(_:Exception){runOnUiThread{if(!isDestroyed)line(ui.t("sync_pending"))}}}.start()}
        if(Transport(this).configured())SyncJob.schedule(this)
        button("pause_capture"){settings.edit().putBoolean("enabled",false).apply();render()}
        button("wipe_queue"){AlertDialog.Builder(this).setMessage(ui.t("wipe_confirm")).setNegativeButton(ui.t("cancel"),null).setPositiveButton(ui.t("yes")){_,_->try{Queue(this).use{it.wipe()};Transport(this).clearPending();render()}catch(_:Exception){line(ui.t("queue_repair_help"))}}.show()}
    }
}
