package id.academicos.companion
import id.academicos.companion.ledger.CaptureMatch
import id.academicos.companion.ledger.NativePolicy
import id.academicos.companion.ledger.LoadState
import java.time.LocalDate
object NativePolicyTest {
 @JvmStatic fun main(args:Array<String>){
  var count=0
  fun case(name:String,run:()->Unit){run();count++;println("PASS native-policy: $name")}
  fun invalid(run:()->Unit){var rejected=false;try{run()}catch(_:IllegalArgumentException){rejected=true};check(rejected)}
  val day=LocalDate.of(2026,11,7)
  case("four precisions preserve null and field invariants"){
   NativePolicy.shape("datetime",null,"2026-11-07T13:45:00","Asia/Makassar");NativePolicy.shape("date_only","2026-11-07",null,"Asia/Makassar");NativePolicy.shape("unknown",null,null,null);NativePolicy.shape("approximate",null,null,null)
   invalid{NativePolicy.shape("date_only","2026-11-07","2026-11-07T00:00:00","UTC")};invalid{NativePolicy.shape("unknown","2026-11-07",null,null)};invalid{NativePolicy.shape("approximate",null,null,"UTC")};invalid{NativePolicy.shape("datetime",null,null,"UTC")};invalid{NativePolicy.shape("unsupported",null,null,null)}
  }
  case("unknown and approximate completed tasks remain undated"){check(NativePolicy.group("unknown",null,day,"done")=="undated");check(NativePolicy.group("approximate",null,day,"done")=="undated");check(NativePolicy.group("date_only",day,day,"done")=="done")}
  case("owner-calendar group boundaries") {check(NativePolicy.group("date_only",day.minusDays(1),day,"todo")=="today");check(NativePolicy.group("datetime",day.plusDays(7),day,"todo")=="week");check(NativePolicy.group("datetime",day.plusDays(8),day,"todo")=="later")}
  case("uncertain and throttled requests retain immutable pending state"){for(s in listOf(0,408,425,429,500,502,503))check(NativePolicy.retainPending(s));for(s in listOf(400,404,409,410,422,428))check(!NativePolicy.retainPending(s))}
  case("five observation states remain distinct") {val values=listOf(NativePolicy.state(false,false,false,false,false),NativePolicy.state(false,true,false,false,false),NativePolicy.state(false,false,true,false,false),NativePolicy.state(true,false,false,true,false),NativePolicy.state(true,false,false,false,true));check(values==listOf(LoadState.UNLOADED,LoadState.LOADING,LoadState.UNAVAILABLE,LoadState.EMPTY,LoadState.PARTIAL));check(values.toSet().size==5)}
  case("conversation identity strips the mutating message counter"){
   check(CaptureMatch.conversation("Ana (2 messages)","Ana")=="Ana")
   check(CaptureMatch.conversation("Ana (3 messages)","Ana (3 messages)")=="Ana")
   check(CaptureMatch.conversation("Ana (12 messages)",null)=="Ana")
   check(CaptureMatch.conversation("Ana",null)=="Ana")
   check(CaptureMatch.conversation(" (2 messages) ",null)==null)
   check(CaptureMatch.conversation(null,null)==null)
   check(CaptureMatch.conversation("  ","  ")==null)
   check(CaptureMatch.conversation("Ana: see you",null)=="Ana: see you")
  }
  case("capture selector needs exact identity and exact group"){
   check(CaptureMatch.matches("Ana","g","Ana (2 messages)",null,"g"))
   check(CaptureMatch.matches("Ana (2 messages)","g","Ana",null,"g"))
   check(!CaptureMatch.matches("Ana","g","Ana","Ana","other"))
   check(!CaptureMatch.matches("Ana","g","Ann","Ann","g"))
   check(!CaptureMatch.matches("Ana","g","Ana (2 messages)",null,null))
   check(!CaptureMatch.matches("","g","Ana",null,"g"))
   check(!CaptureMatch.matches("Ana","","Ana",null,""))
  }
  case("a different conversation name never normalises onto another"){
   check(!CaptureMatch.matches("Ana","g","Ana: Maria",null,"g"))
   check(!CaptureMatch.matches("Ana","g","Ana: Maria","Ana: Maria","g"))
   check(CaptureMatch.conversation("Ana: Maria",null)=="Ana: Maria")
   check(CaptureMatch.conversation("Ana Maria",null)=="Ana Maria")
  }
  println("Native policy cases: $count; no Android runtime, device or account used.")
 }
}
