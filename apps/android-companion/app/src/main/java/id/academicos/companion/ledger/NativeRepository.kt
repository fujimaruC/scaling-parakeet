package id.academicos.companion.ledger

import android.content.Context
import android.content.pm.ApplicationInfo
import android.net.ConnectivityManager
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import android.util.Base64

class NativeRepository private constructor(context:Context) {
    private val app=context.applicationContext as android.app.Application
    private val vault=PrivateStore(app)
    private val executor=Executors.newSingleThreadExecutor()
    private val main=Handler(Looper.getMainLooper())
    private val epoch=AtomicInteger(0)
    @Volatile var busy=false; private set
    @Volatile var pending:WriteOperation?=null; private set
    @Volatile var credentials:JSONObject?=null; private set
    @Volatile var storageError:String?=null; private set
    @Volatile var boundaryChecked=false; private set
    @Volatile var unconfirmedAfterAuthLoss=app.getSharedPreferences("owner-ui",0).getBoolean("uncertain_after_auth_loss",false); private set
    private var views=JSONObject()
    @Volatile private var navigation:JSONObject?=null
    fun online():Boolean=(app.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager).activeNetworkInfo?.isConnected==true
    fun initialize(done:()->Unit){executor.execute{try{credentials=vault.read("credentials");pending=vault.read("request")?.let{WriteOperation.from(it)};views=vault.read("views")?:JSONObject();navigation=vault.read("navigation")}catch(e:Exception){storageError=(e as? StoreFailure)?.code?:"LEDGER_STORAGE_FAILED"};main.post{done()}}}
    fun async(work:()->Unit){executor.execute(work)}
    fun ui(work:()->Unit){main.post(work)}
    fun state():JSONObject?=navigation?.let{JSONObject(it.toString())}
    fun saveState(value:JSONObject){val snapshot=JSONObject(value.toString());navigation=snapshot;val e=epoch.get();executor.execute{if(e==epoch.get())try{vault.update(mapOf("navigation" to snapshot))}catch(_:Exception){storageError="LEDGER_STORAGE_FAILED"}}}
    private fun checkBase(base:String):URL {
        val u=URL(base);require(u.userInfo==null&&u.query==null&&u.ref==null&&(u.path==""||u.path=="/"))
        val debug=app.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE !=0
        require(u.protocol=="https"||(debug&&u.protocol=="http"&&u.host in listOf("localhost","10.0.2.2")))
        return u
    }
    private fun request(path:String,method:String="GET",body:String?=null,operation:WriteOperation?=null,baseOverride:String?=null,tokenOverride:String?=null,authenticated:Boolean=true):JSONObject {
        val session=credentials?:if(baseOverride==null)throw ApiFailure(401,"AUTH_REQUIRED")else JSONObject()
        val base=checkBase(baseOverride?:session.getString("base")).toString().trimEnd('/')
        require(path.startsWith("/")&&!path.startsWith("//")&&!path.contains('#'))
        val connection=URL(base+"/api/device/v1"+path).openConnection() as HttpURLConnection
        connection.instanceFollowRedirects=false;connection.connectTimeout=12000;connection.readTimeout=15000;connection.requestMethod=method
        connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("Cache-Control","no-store")
        if(authenticated)connection.setRequestProperty("Authorization","Bearer "+(tokenOverride?:session.getString("token")))
        // Never set Origin, Cookie, Access or collector headers on the cloud connection.
        if(operation!=null){connection.setRequestProperty("Idempotency-Key",operation.id);operation.version?.let{connection.setRequestProperty("If-Match",it)}}
        try {
            if(body!=null){connection.doOutput=true;connection.setRequestProperty("Content-Type","application/json");val bytes=body.toByteArray(Charsets.UTF_8);connection.setFixedLengthStreamingMode(bytes.size);connection.outputStream.use{it.write(bytes)}}
            val status=connection.responseCode
            if(status in 300..399)throw ApiFailure(502,"API_REDIRECT_REJECTED")
            val stream=if(status in 200..299)connection.inputStream else connection.errorStream
            val text=stream?.use{input->val out=java.io.ByteArrayOutputStream();val buffer=ByteArray(4096);while(true){val n=input.read(buffer);if(n<0)break;if(out.size()+n>4*1024*1024)throw ApiFailure(502,"RESPONSE_TOO_LARGE");out.write(buffer,0,n)};String(out.toByteArray(),Charsets.UTF_8)} ?: ""
            val json=try{JSONObject(text)}catch(_:Exception){throw ApiFailure(if(status in 200..299)502 else status,"INVALID_API_RESPONSE")}
            if(status !in 200..299)throw ApiFailure(status,json.optJSONObject("error")?.optString("code","REQUEST_FAILED")?:"REQUEST_FAILED")
            if(!json.has("data")||!json.has("meta"))throw ApiFailure(502,"INVALID_API_RESPONSE")
            return json
        }finally{connection.disconnect()}
    }
    private fun authLoss(){
        if(pending!=null){unconfirmedAfterAuthLoss=true;if(!app.getSharedPreferences("owner-ui",0).edit().putBoolean("uncertain_after_auth_loss",true).commit())storageError="LEDGER_STORAGE_FAILED"}
        epoch.incrementAndGet();credentials=null;pending=null;navigation=null;boundaryChecked=false;views=JSONObject();try{vault.clear()}catch(_:Exception){storageError="LEDGER_STORAGE_FAILED"}
    }
    fun acknowledgeAuthLoss(done:()->Unit){executor.execute{app.getSharedPreferences("owner-ui",0).edit().putBoolean("uncertain_after_auth_loss",false).apply();unconfirmedAfterAuthLoss=false;main.post(done)}}
    private fun observed(path:String,env:JSONObject,cached:Boolean):Observation {
        val data=env.opt("data");val items=data as? JSONArray;val cursor=env.optJSONObject("meta")?.nullable("next_cursor");val obj=data as? JSONObject;val more=cursor!=null||obj?.nullable("next_history_cursor")!=null||(path=="/reminders"&&(items?.length()?:0)>=100)||(obj?.optJSONArray("actions")?.length()?:0)<(obj?.optInt("actions_total",0)?:0)
        return Observation(env,NativePolicy.state(true,false,false,items!=null&&items.length()==0,more),cached,env.optJSONObject("meta")?.optString("server_time"))
    }
    private fun get(path:String):Observation {
        val e=epoch.get()
        if(!online())return views.optJSONObject(path)?.let{observed(path,it,true)}?:Observation(null,LoadState.UNAVAILABLE,true,code="NOT_OBSERVED")
        try {
            val env=request(path);if(e!=epoch.get())throw ApiFailure(401,"SESSION_CHANGED")
            views.put(path,env);while(views.length()>24)views.remove(views.keys().next())
            vault.update(mapOf("views" to views));return observed(path,env,false)
        }catch(t:Exception){
            if(t is StoreFailure){storageError=t.code;return Observation(null,LoadState.UNAVAILABLE,code=t.code)}
            val error=t as? ApiFailure
            if(error?.status in listOf(401,403)){authLoss();throw t}
            if(error!=null&&error.status in 400..499) return Observation(null,LoadState.UNAVAILABLE,false,code=error.code)
            return views.optJSONObject(path)?.let{observed(path,it,true)}?:Observation(null,LoadState.UNAVAILABLE,!online(),code=error?.code?:"NETWORK_UNAVAILABLE")
        }
    }
    fun remember(path:String,envelope:JSONObject){val e=epoch.get();val copy=JSONObject(envelope.toString());executor.execute{if(e==epoch.get()&&credentials!=null)try{views.put(path,copy);while(views.length()>24)views.remove(views.keys().next());vault.update(mapOf("views" to views))}catch(t:Exception){storageError=(t as? StoreFailure)?.code?:"LEDGER_STORAGE_FAILED"}}}
    fun read(path:String,done:(Observation)->Unit){val e=epoch.get();executor.execute{
        val out=try{get(path)}catch(t:Exception){Observation(null,LoadState.UNAVAILABLE,code=(t as? ApiFailure)?.code?:"REQUEST_FAILED")}
        main.post{if(e==epoch.get()||credentials==null)done(out)}
    }}
    fun boundary(done:(String?)->Unit){boundaryChecked=false;val e=epoch.get();executor.execute{
        var code:String?=null
        try {
            if(!online())throw ApiFailure(0,"NETWORK_UNAVAILABLE")
            val me=request("/me").getJSONObject("data");val c=credentials?:throw ApiFailure(401,"AUTH_REQUIRED")
            val known=c.nullable("subject");if(known!=null&&known!=me.getString("subject"))throw ApiFailure(401,"OWNER_CHANGED")
            val sources=request("/sources");val inventory=JSONArray(sources.getJSONArray("data").objects().sortedBy{it.getString("id")}.map{JSONObject().put("id",it.getString("id")).put("generation",it.getInt("generation")).put("purged_at",it.opt("purged_at"))}).toString()
            if(c.optString("inventory","")!=inventory){views=JSONObject();vault.update(mapOf("views" to views))}
            c.put("subject",me.getString("subject")).put("inventory",inventory)
            if(e==epoch.get()){credentials=c;vault.update(mapOf("credentials" to c));boundaryChecked=true}
        }catch(t:Exception){val a=t as? ApiFailure;code=a?.code?:"NETWORK_UNAVAILABLE";if(a?.status in listOf(401,403))authLoss()}
        main.post{if(e==epoch.get()||credentials==null)done(code)}
    }}
    fun enroll(base:String,grant:String,done:(String?)->Unit){executor.execute{
        var code:String?=null
        try {
            checkBase(base)
            var c=credentials
            if(c==null){val bytes=ByteArray(32);SecureRandom().nextBytes(bytes);val id=UUID.randomUUID().toString();val secret=Base64.encodeToString(bytes,Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING);val tok="aos1.$id.$secret"
                c=JSONObject().put("base",base.trimEnd('/')).put("id",id).put("token",tok).put("secret",secret).put("status","pending");vault.update(mapOf("credentials" to c));credentials=c
            }
            require(c.getString("base")==base.trimEnd('/'))
            val result=request("/enroll","POST",JSONObject().put("client_id",c.getString("id")).put("secret",c.getString("secret")).put("grant",grant.trim()).toString(),baseOverride=base,authenticated=false).getJSONObject("data")
            c.put("status",result.getString("status")).put("expires_at",result.getString("expires_at"));vault.update(mapOf("credentials" to c));credentials=c
        }catch(t:Exception){code=(t as? ApiFailure)?.code?:"ENROLLMENT_FAILED"}
        main.post{done(code)}
    }}
    fun previewPurge(source:String,done:(JSONObject?,String?)->Unit){val e=epoch.get();executor.execute{var result:JSONObject?=null;var code:String?=null;try{result=request("/sources/"+java.net.URLEncoder.encode(source,"UTF-8")+"/purge-preview","POST","{}").getJSONObject("data")}catch(t:Exception){val f=t as? ApiFailure;code=f?.code?:"NETWORK_UNAVAILABLE";if(f?.status in listOf(401,403))authLoss()};main.post{if(e==epoch.get()||credentials==null)done(result,code)}}}
    fun fingerprint():String=credentials?.optString("token")?.let{token->MessageDigest.getInstance("SHA-256").digest(token.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it.toInt() and 255)}}?:""
    fun enrollmentStatus(done:(String?)->Unit){executor.execute{var code:String?=null;try{val result=request("/enrollment").getJSONObject("data");val c=credentials?:throw ApiFailure(401,"AUTH_REQUIRED");c.put("status",result.getString("status")).put("expires_at",result.getString("expires_at"));vault.update(mapOf("credentials" to c));credentials=c}catch(t:Exception){code=(t as? ApiFailure)?.code?:"NETWORK_UNAVAILABLE"};main.post{done(code)}}}
    fun write(op:WriteOperation,retry:Boolean=false,done:(JSONObject?,String?)->Unit){
        if(busy||!online()||credentials?.optString("status")!="active"||(pending!=null&&!retry)){done(null,"WRITE_UNAVAILABLE");return}
        busy=true;val e=epoch.get();executor.execute{
            var answer:JSONObject?=null;var code:String?=null
            try {
                if(e!=epoch.get())throw ApiFailure(401,"SESSION_CHANGED")
                if(retry&&pending?.id!=op.id)throw ApiFailure(409,"JOURNAL_CHANGED")
                vault.update(mapOf("request" to op.json()));pending=op
                val response=request(op.path,op.method,op.body,op)
                if(e!=epoch.get())throw ApiFailure(401,"SESSION_CHANGED")
                // Commit receipt, invalidation and journal removal together before final success.
                val completedNavigation=JSONObject((navigation?:JSONObject()).toString()).apply{remove("form")}
                vault.update(mapOf("receipt" to JSONObject().put("operation",op.json()).put("response",response),"views" to JSONObject(),"request" to null,"navigation" to completedNavigation))
                navigation=completedNavigation
                views=JSONObject();pending=null;answer=response.getJSONObject("data")
            }catch(t:Exception){if(t is StoreFailure)storageError=t.code;val a=t as? ApiFailure;code=a?.code?:(t as? StoreFailure)?.code?:"SAVE_UNCONFIRMED"
                if(a?.status in listOf(401,403)){try{authLoss()}catch(_:Exception){storageError="LEDGER_STORAGE_FAILED"}}
                else if(a!=null&&!NativePolicy.retainPending(a.status)){try{vault.update(mapOf("request" to null));pending=null}catch(_:Exception){code="LEDGER_STORAGE_FAILED"}}
            }finally{busy=false};main.post{if(e==epoch.get()||credentials==null)done(answer,code)}
        }
    }
    fun logout(done:()->Unit){epoch.incrementAndGet();credentials=null;pending=null;navigation=null;views=JSONObject();boundaryChecked=false;executor.execute{try{vault.clear();storageError=null}catch(_:Exception){storageError="LEDGER_STORAGE_FAILED"};main.post{done()}}}
    companion object { @Volatile private var instance:NativeRepository?=null;fun get(context:Context):NativeRepository=instance?:synchronized(this){instance?:NativeRepository(context).also{instance=it}} }
}
