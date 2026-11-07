package id.academicos.companion.ledger
import java.time.LocalDate
import java.time.LocalDateTime
// Platform-free rules used by the production model and repository.
object NativePolicy {
 fun retainPending(status:Int):Boolean = status !in 400..499 || status in listOf(408,425,429)
 fun shape(precision:String,date:String?,wall:String?,zone:String?){
  when(precision){
   "datetime"->{require(date==null&&wall!=null&&!zone.isNullOrBlank());LocalDateTime.parse(wall)}
   "date_only"->{require(date!=null&&wall==null&&!zone.isNullOrBlank());LocalDate.parse(date)}
   "unknown","approximate"->require(date==null&&wall==null&&zone==null)
   else->throw IllegalArgumentException("UNSUPPORTED_PRECISION")
  }
 }
 fun group(precision:String,day:LocalDate?,today:LocalDate,status:String):String {
  if(precision=="unknown"||precision=="approximate")return "undated"
  require(day!=null);if(status=="done")return "done"
  return if(day<=today)"today"else if(day<=today.plusDays(7))"week"else "later"
 }
 fun state(observed:Boolean,loading:Boolean,failed:Boolean,empty:Boolean,more:Boolean):LoadState = when{
  loading->LoadState.LOADING
  failed->LoadState.UNAVAILABLE
  !observed->LoadState.UNLOADED
  more->LoadState.PARTIAL
  empty->LoadState.EMPTY
  else->LoadState.READY
 }
}
