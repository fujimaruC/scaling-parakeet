package id.academicos.companion
import android.content.Context
import android.util.Base64
import org.json.JSONObject
import org.json.JSONArray
import java.net.URL
import java.security.MessageDigest
import java.security.cert.X509Certificate
import java.security.cert.CertificateException
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import javax.net.ssl.*

class Transport(private val context:Context){
 companion object {private val transferLock=Any()}
 private val prefs=context.getSharedPreferences("private-pairing",0)
 private fun hash(bytes:ByteArray)=MessageDigest.getInstance("SHA-256").digest(bytes)
 private fun hex(bytes:ByteArray)=bytes.joinToString(""){"%02x".format(it.toInt() and 255)}
 fun configured()=prefs.contains("config")
 fun clearPending(){prefs.edit().remove("batch").commit()}
 private fun request(config:JSONObject,path:String,method:String="GET",payload:String="",signed:Boolean=true):JSONObject{
  val endpoint=URL(config.getString("endpoint"))
  require(endpoint.protocol=="https" && endpoint.userInfo==null && endpoint.query==null && endpoint.ref==null && (endpoint.path.isEmpty()||endpoint.path=="/")){"Private HTTPS receiver required"}
  val addresses=java.net.InetAddress.getAllByName(endpoint.host);require(addresses.isNotEmpty() && addresses.all {address->val raw=address.address;address.isSiteLocalAddress || address.isLoopbackAddress || (raw.size==4 && (raw[0].toInt() and 255)==100 && (raw[1].toInt() and 255) in 64..127)}){"Receiver must resolve to a private network"}
  val pin=config.getString("pin").replace(":","").lowercase();require(pin.matches(Regex("[0-9a-f]{64}"))){"Certificate SHA-256 required"}
  val manager=object:X509TrustManager{
   override fun getAcceptedIssuers():Array<X509Certificate> = emptyArray()
   override fun checkClientTrusted(chain:Array<X509Certificate>,authType:String){throw CertificateException("Client trust unsupported")}
   override fun checkServerTrusted(chain:Array<X509Certificate>,authType:String){if(chain.isEmpty())throw CertificateException("Missing peer");chain[0].checkValidity();if(!MessageDigest.isEqual(pin.toByteArray(),hex(hash(chain[0].encoded)).toByteArray()))throw CertificateException("Peer pin mismatch")}
  }
  val ssl=SSLContext.getInstance("TLS");ssl.init(null,arrayOf<TrustManager>(manager),null)
  val connection=URL(endpoint.toString().trimEnd('/')+path).openConnection() as HttpsURLConnection
  connection.sslSocketFactory=ssl.socketFactory
  // Keep platform hostname verification. A matching pin never permits a wrong hostname.
  connection.instanceFollowRedirects=false;connection.connectTimeout=10000;connection.readTimeout=30000;connection.requestMethod=method
  val bytes=payload.toByteArray(Charsets.UTF_8)
  if(signed){val stamp=(System.currentTimeMillis()/1000).toString();val nonce=UUID.randomUUID().toString();val digest=hex(hash(bytes));val canonical=listOf(method,path,stamp,nonce,digest).joinToString("\n");val mac=Mac.getInstance("HmacSHA256");mac.init(SecretKeySpec(config.getString("secret").toByteArray(Charsets.UTF_8),"HmacSHA256"));val signature=Base64.encodeToString(mac.doFinal(canonical.toByteArray(Charsets.UTF_8)),Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING);connection.setRequestProperty("X-Device-Id",config.getString("device_id"));connection.setRequestProperty("X-Request-Timestamp",stamp);connection.setRequestProperty("X-Nonce",nonce);connection.setRequestProperty("X-Signature",signature)}
  try{if(method=="POST"){connection.doOutput=true;connection.setRequestProperty("Content-Type","application/json");connection.setFixedLengthStreamingMode(bytes.size);connection.outputStream.use {it.write(bytes)}};if(connection.responseCode !in 200..299)throw IllegalStateException("RECEIVER_REJECTED");val response=connection.inputStream.use {input->val buffer=java.io.ByteArrayOutputStream();val chunk=ByteArray(4096);while(true){val read=input.read(chunk);if(read<0)break;if(buffer.size()+read>262144)throw IllegalStateException("RESPONSE_TOO_LARGE");buffer.write(chunk,0,read)};buffer.toString("UTF-8")};return JSONObject(response)}finally{connection.disconnect()}
 }
 fun pair(endpoint:String,pin:String,token:String){
  Queue(context).use {queue->require(queue.count()==0){"Sync or wipe the old queue before pairing"};val invitationHash=hex(hash(token.trim().toByteArray(Charsets.UTF_8)));val device=if(prefs.getString("pending_invite",null)==invitationHash)prefs.getString("pending_device",null) ?: UUID.randomUUID().toString() else UUID.randomUUID().toString();check(prefs.edit().putString("pending_invite",invitationHash).putString("pending_device",device).commit());val config=JSONObject().put("endpoint",endpoint.trim()).put("pin",pin.trim());val result=request(config,"/local/v1/pair","POST",JSONObject().put("token",token.trim()).put("device_id",device).toString(),false);require(result.getString("device_id")==device);config.put("device_id",device).put("secret",result.getString("secret")).put("source_id",result.getString("source_id")).put("source_generation",result.getInt("source_generation"));check(prefs.edit().putString("config",queue.seal(config.toString())).remove("pending_device").remove("pending_invite").remove("batch").commit())}
 }
 private fun finishReceipt(config:JSONObject,queue:Queue){
  val saved=prefs.getString("receipt_ack",null)?:return
  val ack=JSONObject(queue.open(saved));val list=ack.getJSONArray("ids")
  PurgeApplication.apply({Unit},{queue.acknowledge((0 until list.length()).map{list.getString(it)})},{check(prefs.edit().remove("batch").commit())},{request(config,"/local/v1/receipt-applied","POST",JSONObject().put("batch_id",ack.getString("batch_id")).put("phase","applied").toString());Unit})
  check(prefs.edit().remove("receipt_ack").commit())
 }
 fun sync():Unit=synchronized(transferLock){
  if(!configured())return
  Queue(context).use {queue->val config=JSONObject(queue.open(prefs.getString("config",null)!!));finishReceipt(config,queue);val status=request(config,"/local/v1/device-status");if(status.getBoolean("revoked")||status.getInt("source_generation")!=config.getInt("source_generation")){request(config,"/local/v1/purge-ack","POST",JSONObject().put("generation",status.getInt("source_generation")).put("phase","delivered").toString());PurgeApplication.apply({check(context.getSharedPreferences("capture",0).edit().putBoolean("enabled",false).commit())},{queue.wipe()},{check(prefs.edit().remove("batch").commit())},{request(config,"/local/v1/purge-ack","POST",JSONObject().put("generation",status.getInt("source_generation")).put("phase","applied").toString());Unit});check(prefs.edit().clear().commit());return}
   val saved=prefs.getString("batch",null);val batch=if(saved!=null)JSONObject(queue.open(saved))else{val events=queue.events();if(events.isEmpty())return;JSONObject().put("protocol",1).put("device_id",config.getString("device_id")).put("batch_id",UUID.randomUUID().toString()).put("source_id",config.getString("source_id")).put("source_generation",config.getInt("source_generation")).put("events",JSONArray().also {array->for(event in events){array.put(event.second);if(array.toString().toByteArray(Charsets.UTF_8).size>220000){array.remove(array.length()-1);break}};require(array.length()>0){"EVENT_TOO_LARGE"}}).also {require(it.toString().toByteArray().size<=262144){"BATCH_TOO_LARGE"};check(prefs.edit().putString("batch",queue.seal(it.toString())).commit())}}
   val receipt=request(config,"/local/v1/notification-batches","POST",batch.toString());require(receipt.getString("state")=="committed" && receipt.getString("batch_id")==batch.getString("batch_id") && receipt.getInt("count")==batch.getJSONArray("events").length()){"INVALID_RECEIPT"};request(config,"/local/v1/receipt-applied","POST",JSONObject().put("batch_id",batch.getString("batch_id")).put("phase","delivered").toString());val ids=(0 until batch.getJSONArray("events").length()).map {batch.getJSONArray("events").getJSONObject(it).getString("event_id")};check(prefs.edit().putString("receipt_ack",queue.seal(JSONObject().put("batch_id",batch.getString("batch_id")).put("ids",JSONArray(ids)).toString())).commit());finishReceipt(config,queue);context.getSharedPreferences("health",0).edit().putString("transfer","linux_committed").putLong("last_receipt",System.currentTimeMillis()).apply()
  }
 }
}
