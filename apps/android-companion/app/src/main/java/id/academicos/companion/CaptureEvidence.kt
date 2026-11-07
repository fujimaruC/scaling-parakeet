package id.academicos.companion
import android.app.Activity
import android.app.ActivityManager
import android.provider.Settings
import org.json.JSONObject

object CaptureEvidence {
    fun emit(activity:Activity){
        val run=activity.intent.getStringExtra("evidence_run")?:return
        if(!run.matches(Regex("[0-9a-f-]{36}")))return
        val granted=Settings.Secure.getString(activity.contentResolver,"enabled_notification_listeners")?.split(":")?.any{it=="${activity.packageName}/${activity.packageName}.CaptureService"||it=="${activity.packageName}/.CaptureService"}==true
        val count=try{Queue(activity).use{it.count()}}catch(_:Exception){null}
        val health=activity.getSharedPreferences("health",0)
        val record=JSONObject().put("run",run).put("android_api",android.os.Build.VERSION.SDK_INT).put("device_model",android.os.Build.MODEL).put("device_build",android.os.Build.DISPLAY).put("version",activity.packageManager.getPackageInfo(activity.packageName,0).versionName).put("notification_access",granted).put("low_ram",(activity.getSystemService(Activity.ACTIVITY_SERVICE) as ActivityManager).isLowRamDevice).put("queue_count",count?:JSONObject.NULL).put("observed_gap_count",health.getInt("gaps",0)).put("repair_required",count==null)
        android.util.Log.i("AOS-EVIDENCE",record.toString())
    }
}
