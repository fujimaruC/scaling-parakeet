package id.academicos.companion.ledger

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

fun JSONObject.nullable(name: String): String? = if (isNull(name)) null else getString(name)
fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }
fun blankDue() = JSONObject().put("precision", "unknown").put("local_date", JSONObject.NULL).put("local_datetime", JSONObject.NULL).put("timezone", JSONObject.NULL)

data class Due(val precision: String, val date: String?, val wall: String?, val zone: String?) {
    companion object {
        fun from(value: JSONObject): Due {
            val p = value.getString("precision")
            val d = value.nullable("local_date"); val w = value.nullable("local_datetime"); val z = value.nullable("timezone")
            require(p in listOf("datetime", "date_only", "approximate", "unknown"))
            when (p) {
                "datetime" -> { require(d == null && w != null && z != null); LocalDateTime.parse(w); ZoneId.of(z) }
                "date_only" -> { require(d != null && w == null && z != null); LocalDate.parse(d); ZoneId.of(z) }
                else -> require(d == null && w == null && z == null)
            }
            return Due(p, d, w, z)
        }
    }
    fun json() = JSONObject().put("precision",precision).put("local_date",date ?: JSONObject.NULL).put("local_datetime",wall ?: JSONObject.NULL).put("timezone",zone ?: JSONObject.NULL)
    fun label(locale: Locale, id: Boolean): String = when (precision) {
        "datetime" -> LocalDateTime.parse(wall).format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy HH:mm", locale)) + " · " + zone
        "date_only" -> LocalDate.parse(date).format(DateTimeFormatter.ofPattern("EEE, d MMM yyyy", locale)) + if(id) " · Tanggal saja" else " · Date only"
        "approximate" -> if(id) "Perkiraan — belum dikonfirmasi" else "Approximate — not confirmed"
        else -> if(id) "Belum ada tanggal" else "No date yet"
    }
}
data class Task(val value: JSONObject) {
    val id = value.getString("id")
    val title = value.getString("title")
    val status = value.getString("status")
    val version = value.getInt("version")
    val context = value.nullable("context_id")
    val due = Due.from(value.getJSONObject("due"))
    val instant: Instant? = value.nullable("due_at_utc")?.let { Instant.parse(it) }
    init { require(status in listOf("todo","doing","blocked","done","archived")); require((due.precision == "datetime") == (instant != null)) }
    fun day(ownerZone: String): LocalDate? = when(due.precision) { "datetime" -> instant!!.atZone(ZoneId.of(ownerZone)).toLocalDate(); "date_only" -> LocalDate.parse(due.date); else -> null }
    fun group(today: LocalDate, zone: String): String {
        val day=day(zone) ?: return "undated"
        if(status=="done")return "done"
        return if(day<=today) "today" else if(day<=today.plusDays(7)) "week" else "later"
    }
    fun sortKey(zone: String): String = day(zone)?.toString().orEmpty()+":"+(instant?.toString() ?: "~")+":"+id
}
enum class LoadState { UNLOADED, LOADING, UNAVAILABLE, EMPTY, PARTIAL, READY }
data class Observation(val envelope: JSONObject?, val state: LoadState, val cached: Boolean = false, val observed: String? = null, val code: String? = null) {
    val data: Any? get() = envelope?.opt("data")
    val cursor: String? get() = envelope?.optJSONObject("meta")?.nullable("next_cursor")
}
data class WriteOperation(val id: String, val path: String, val method: String, val body: String, val version: String?, val label: String) {
    fun json()=JSONObject().put("id",id).put("path",path).put("method",method).put("body",body).put("version",version ?: JSONObject.NULL).put("label",label)
    companion object {
        fun from(v:JSONObject)=WriteOperation(v.getString("id"),v.getString("path"),v.getString("method"),v.getString("body"),v.nullable("version"),v.getString("label"))
        fun create(path:String,method:String,body:JSONObject,label:String,version:Int?=null)=WriteOperation(java.util.UUID.randomUUID().toString(),path,method,body.toString(),version?.toString(),label)
    }
}
class ApiFailure(val status: Int, val code: String): Exception(code)
