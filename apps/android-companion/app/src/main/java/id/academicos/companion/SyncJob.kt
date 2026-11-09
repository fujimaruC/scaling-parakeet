package id.academicos.companion
import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import java.util.concurrent.Executors
class SyncJob:JobService(){
 private val executor=Executors.newSingleThreadExecutor()
 override fun onStartJob(params:JobParameters):Boolean{executor.execute{var retry=false;try{Transport(this).sync()}catch(_:Exception){retry=true;getSharedPreferences("health",0).edit().putString("transfer","pending_or_unreachable").apply()};jobFinished(params,retry)};return true}
 override fun onStopJob(params:JobParameters)=true
 override fun onDestroy(){executor.shutdown();super.onDestroy()}
 companion object {fun schedule(context:Context){(context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler).schedule(JobInfo.Builder(1042,ComponentName(context,SyncJob::class.java)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L).setPersisted(true).setBackoffCriteria(30000L,JobInfo.BACKOFF_POLICY_EXPONENTIAL).build())}}
}
