package id.academicos.companion

import android.app.Activity
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.*
import id.academicos.companion.ledger.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class MainActivity:Activity() {
    lateinit var ui:Ui
    lateinit var repo:NativeRepository
    lateinit var forms:NativeForms
    var navigation=JSONObject().put("page","today")
    val observations=HashMap<String,Observation>()
    var contexts=JSONArray()
    var preferences:JSONObject?=null
    private lateinit var root:LinearLayout
    private lateinit var list:ListView
    private lateinit var feedback:LinearLayout
    private val handler=Handler(Looper.getMainLooper())
    private var initialized=false
    private var hadSession=false
    private var generation=0
    private var renderedKey=""
    private var exportData:String?=null
    private var undoId:String?=null
    private var undoUntil=0L
    private var notice:String?=null
    val page:String get()=navigation.optString("page","today")
    val zone:String get()=preferences?.optString("timezone","Asia/Makassar")?:"Asia/Makassar"
    val writable:Boolean get()=repo.boundaryChecked&&repo.online()&&!repo.busy&&repo.pending==null&&repo.credentials?.optString("status")=="active"
    override fun attachBaseContext(base:Context){
        val language=base.getSharedPreferences("owner-ui",0).getString("language","id")?:"id"
        val config=Configuration(base.resources.configuration).apply{setLocale(java.util.Locale(language))}
        super.attachBaseContext(base.createConfigurationContext(config))
    }
    override fun onCreate(saved:Bundle?){
        val prefs=getSharedPreferences("owner-ui",0)
        val dark=when(prefs.getString("theme","system")){"dark"->true;"light"->false;else->resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK==Configuration.UI_MODE_NIGHT_YES}
        setTheme(if(dark)R.style.NativeDark else R.style.NativeLight)
        super.onCreate(saved);window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        ui=Ui(this);ui.configureWindow();repo=NativeRepository.get(this);forms=NativeForms(this)
        renderLoading()
        repo.initialize{if(isDestroyed)return@initialize;initialized=true;navigation=repo.state()?:navigation;hadSession=repo.credentials!=null;render();if(repo.credentials?.optString("status")=="active"){refresh();forms.restore()}}
    }
    override fun onResume(){super.onResume();CaptureEvidence.emit(this);if(initialized){if(repo.credentials?.optString("status")=="active")refresh()else render()};handler.removeCallbacks(ticker);handler.postDelayed(ticker,30000)}
    override fun onPause(){handler.removeCallbacks(ticker);if(initialized)persist();super.onPause()}
    override fun onDestroy(){handler.removeCallbacksAndMessages(null);super.onDestroy()}
    override fun onNewIntent(value:Intent){super.onNewIntent(value);setIntent(value);CaptureEvidence.emit(this)}
    private val ticker=object:Runnable{override fun run(){if(initialized&&!forms.isOpen&&currentFocus !is EditText&&repo.credentials?.optString("status")=="active")render();handler.postDelayed(this,30000)}}
    override fun onBackPressed(){if(forms.isOpen){forms.close();return};val stack=navigation.optJSONArray("stack");if(stack!=null&&stack.length()>0){val prior=stack.getJSONObject(stack.length()-1);stack.remove(stack.length()-1);prior.put("stack",stack);navigation=prior;generation++;persist();loadScreen();render()}else if(page!="today"){navigate("today",replace=true)}else super.onBackPressed()}
    fun persist(){repo.saveState(navigation)}
    fun navigate(target:String,id:String?=null,replace:Boolean=false){
        val stack=navigation.optJSONArray("stack")?:JSONArray()
        if(!replace){val previous=JSONObject(navigation.toString());previous.remove("stack");previous.remove("form");stack.put(previous);while(stack.length()>12)stack.remove(0)}
        navigation=JSONObject().put("page",target).put("stack",stack);id?.let{navigation.put("id",it)}
        generation++;persist();loadScreen();render()
    }
    fun refresh(){if(repo.busy)return;notice=null;val ticket=++generation
        repo.boundary{code->if(isDestroyed||ticket!=generation)return@boundary;notice=code;observations.clear();loadCommon();loadScreen();render()}
    }
    private fun loadCommon(){fetch("/contexts"){o->if(o.data is JSONArray)contexts=o.data as JSONArray};fetch("/settings"){o->val previous=zone;if(o.data is JSONObject)preferences=o.data as JSONObject;if(page=="calendar"&&zone!=previous)fetch(calendarPath())}}
    fun fetch(path:String,done:((Observation)->Unit)?=null){
        val ticket=generation;observations[path]=Observation(observations[path]?.envelope,LoadState.LOADING)
        repo.read(path){out->if(isDestroyed||ticket!=generation)return@read;observations[path]=out;done?.invoke(out);render()}
    }
    fun loadScreen(){if(repo.credentials?.optString("status")!="active")return
        when(page){
            "today"->{fetch("/briefing");fetch(taskPath())}
            "tasks"->fetch(taskPath())
            "detail"->fetch(detailPath())
            "review"->{fetch("/briefing");fetch(candidatePath());if(navigation.optString("target_query").isNotEmpty())fetch(targetPath())}
            "calendar"->fetch(calendarPath())
            "settings"->{fetch("/settings"){if(it.data is JSONObject)preferences=it.data as JSONObject};fetch("/contexts"){if(it.data is JSONArray)contexts=it.data as JSONArray}}
            "sources"->{fetch("/sources");fetch("/health")}
            "source"->{fetch(sourcePath());fetch("/health")}
            "history"->fetch("/history?limit=50")
            "reminders"->{fetch("/reminders");fetch("/settings"){if(it.data is JSONObject)preferences=it.data as JSONObject}}
        }
    }
    fun taskPath():String {
        val params=ArrayList<String>();params.add("limit=100");params.add("title_only=1")
        navigation.optString("filter").takeIf{it.isNotEmpty()&&it!="all"}?.let{params.add("context_type="+encode(it))}
        navigation.optString("query").takeIf{it.isNotEmpty()}?.let{params.add("q="+encode(it))}
        return "/tasks?"+params.joinToString("&")
    }
    fun detailPath()="/tasks/"+encode(navigation.optString("id"))+"?view=read"
    fun candidatePath()="/candidates?limit=100"
    fun targetPath()="/tasks?limit=50&title_only=1&q="+encode(navigation.optString("target_query"))
    fun sourcePath()="/sources/"+encode(navigation.optString("id"))+"/purge-status"
    fun month():LocalDate=try{LocalDate.parse(navigation.optString("month",LocalDate.now(ZoneId.of(zone)).withDayOfMonth(1).toString()))}catch(_:Exception){LocalDate.now(ZoneId.of(zone)).withDayOfMonth(1)}
    fun calendarPath():String{val month=month();return "/tasks?limit=100&date_from=$month&date_to=${month.withDayOfMonth(month.lengthOfMonth())}&timezone="+encode(zone)}
    fun encode(value:String)=java.net.URLEncoder.encode(value,"UTF-8")
    fun observation(path:String)=observations[path]?:Observation(null,LoadState.UNLOADED)
    fun items(path:String)=((observation(path).data as? JSONArray)?:JSONArray()).objects()
    fun loadMore(path:String,history:Boolean=false){
        val old=observation(path);val cursor=if(history)(old.data as? JSONObject)?.nullable("next_history_cursor")else old.cursor
        if(cursor==null||old.cached||!repo.online())return
        val suffix=if(history)"&history_before=" else "&cursor="
        val next=path+(if(path.contains('?'))suffix else suffix.replace('&','?'))+encode(cursor)
        val ticket=generation;observations[path]=old.copy(state=LoadState.LOADING);render()
        repo.read(next){result->if(isDestroyed||ticket!=generation)return@read
            if(result.envelope!=null&&!result.cached){
                if(history){val a=old.data as JSONObject;val b=result.data as JSONObject
                    if(a.getJSONObject("task").getInt("version")!=b.getJSONObject("task").getInt("version")){fetch(path);return@read}
                    val merged=JSONArray(a.getJSONArray("history").toString());b.getJSONArray("history").objects().forEach{merged.put(it)};b.put("history",merged);result.envelope.put("data",b);observations[path]=result
                }else{val merged=JSONArray((old.data as JSONArray).toString());val ids=merged.objects().map{it.optString("id")}.toMutableSet();(result.data as JSONArray).objects().forEach{if(ids.add(it.optString("id")))merged.put(it)};result.envelope.put("data",merged);observations[path]=result}
            }else{observations[path]=old;notice=result.code?:ui.t("unavailable")};observations[path]?.envelope?.let{repo.remember(path,it)};render()
        }
    }
    fun perform(operation:WriteOperation,retry:Boolean=false,success:((JSONObject)->Unit)?=null){
        if(!retry&&!writable){showNotice(ui.t("online_only"));return}
        repo.write(operation,retry){answer,code->if(isDestroyed)return@write
            if(answer!=null){notice=ui.t("saved");if(operation.label in listOf("accept","reject")&&answer.has("review_action")&&!answer.optBoolean("undone")){undoId=answer.getString("review_action");undoUntil=android.os.SystemClock.uptimeMillis()+4500;handler.postDelayed({undoId=null;renderFeedback()},4500)}else undoId=null
                if(!getSharedPreferences("owner-ui",0).getBoolean("reduced_motion",false)&&android.animation.ValueAnimator.areAnimatorsEnabled())root.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY)
                observations.clear();forms.close();if(operation.method=="DELETE"&&operation.path.startsWith("/tasks/"))navigate("tasks",replace=true)
                success?.invoke(answer);loadCommon();loadScreen()
            }else {notice=(code?:"SAVE_UNCONFIRMED")+" · "+ui.t("unknown_outcome");forms.reportFailure(notice!!)}
            render()
        };render()
    }
    fun showNotice(value:String){notice=value;renderFeedback()}
    fun confirm(title:String,body:String,positive:String=ui.t("yes"),action:()->Unit){AlertDialog.Builder(this).setTitle(title).setMessage(body).setNegativeButton(ui.t("cancel"),null).setPositiveButton(positive){_,_->action()}.show().window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)}
    private fun renderLoading(){val col=ui.column();col.setBackgroundColor(ui.bg);col.addView(ui.text(ui.t("loading")));setContentView(col)}
    fun render(){if(isDestroyed)return
        if(!initialized){renderLoading();return}
        if(repo.credentials==null&&hadSession){observations.clear();contexts=JSONArray();preferences=null;navigation=JSONObject().put("page","today");hadSession=false}
        if(repo.credentials!=null)hadSession=true
        val key=page+":"+navigation.optString("id")+":"+navigation.optString("month")+":"+navigation.optString("query")+":"+navigation.optString("filter")
        val scroll=if(::list.isInitialized&&key==renderedKey)list.onSaveInstanceState()else null
        val focused=currentFocus as? EditText;val focusId=focused?.id;val selection=focused?.selectionStart?:0;renderedKey=key
        root=ui.column(0);root.setBackgroundColor(ui.bg)
        val header=ui.row();header.setPadding(ui.dp(12),ui.dp(8),ui.dp(12),ui.dp(4))
        header.addView(ui.icon("back"){onBackPressed()})
        header.addView(ui.text(ui.t("app_name"),24f,true).apply{layoutParams=LinearLayout.LayoutParams(0,-2,1f)})
        header.addView(ui.icon("settings"){navigate("settings")})
        root.addView(header)
        list=ListView(this).apply{divider=null;setPadding(ui.dp(12),0,ui.dp(12),ui.dp(12));clipToPadding=false;isSaveEnabled=false;descendantFocusability=android.view.ViewGroup.FOCUS_AFTER_DESCENDANTS}
        root.addView(list,LinearLayout.LayoutParams(-1,0,1f));feedback=ui.column(8);root.addView(FeedbackScroll(this).apply{addView(feedback)})
        if(repo.credentials?.optString("status")=="active"&&page in listOf("today","tasks","calendar")){
            root.addView(ui.row().apply{gravity=Gravity.END;addView(ui.icon("add"){forms.quick()}.apply{isEnabled=writable;layoutParams=LinearLayout.LayoutParams(ui.dp(56),ui.dp(56))})})
        }
        if(repo.credentials?.optString("status")=="active"){
            val nav=ui.row();for(tab in listOf("today","tasks","review","calendar")){nav.addView(ui.button(ui.t(tab)+(if(page==tab)" ✓"else""),action={navigate(tab,replace=true)}).apply{layoutParams=LinearLayout.LayoutParams(0,-2,1f);isSelected=page==tab;setCompoundDrawables(null,ui.drawable(tab),null,null);contentDescription=ui.t(tab)+(if(page==tab)" · "+ui.t("enabled")else"")})};root.addView(nav)
        }
        setContentView(root)
        try{val rows=when{
            repo.storageError!=null->repairRows()
            repo.credentials?.optString("status")!="active"->enrollRows()
            else->NativeScreens(this).rows()
        };list.adapter=RowsAdapter(rows);if(scroll!=null)list.onRestoreInstanceState(scroll);if(focusId!=null&&!forms.isOpen)list.post{list.findViewById<EditText>(focusId)?.let{it.requestFocus();it.setSelection(selection.coerceAtMost(it.text.length))}};if(navigation.optString("group")=="undated"){val index=rows.indexOfFirst{it.anchor=="undated"};if(index>=0)list.post{list.setSelection(index)}}}catch(_:Exception){list.adapter=RowsAdapter(listOf(Row{ui.message(ui.t("unavailable")+" · INVALID_API_RESPONSE")},Row{ui.button(ui.t("refresh"),action={refresh()})},Row{ui.button(ui.t("open_capture"),action={openCapture()})}))}
        renderFeedback()
    }
    private fun renderFeedback(){if(!::feedback.isInitialized)return;feedback.removeAllViews()
        notice?.let{feedback.addView(ui.message(it))}
        if(repo.unconfirmedAfterAuthLoss){feedback.addView(ui.message(ui.t("auth_uncertain")));feedback.addView(ui.button(ui.t("ack_uncertain"),enabled=repo.boundaryChecked&&repo.online(),action={confirm(ui.t("ack_uncertain"),ui.t("auth_uncertain")){repo.acknowledgeAuthLoss{render()}}}))}
        if(repo.credentials?.optString("status")=="active")try{val expiry=Instant.parse(repo.credentials!!.getString("expires_at"));if(expiry.epochSecond-Instant.now().epochSecond<=7*86400)feedback.addView(ui.message(ui.t("expiry_warning")+" · "+expiry))}catch(_:Exception){}
        repo.pending?.let{operation->feedback.addView(ui.message(ui.t("unknown_outcome")+" · "+operation.label));feedback.addView(ui.button(ui.t("retry"),enabled=repo.online()&&!repo.busy,action={perform(operation,retry=true)}));feedback.addView(ui.button(ui.t("detail")){confirm(ui.t("unknown_outcome"),operation.body,ui.t("close")){}})}
        if(undoId!=null&&android.os.SystemClock.uptimeMillis()<undoUntil){val action=undoId!!;feedback.addView(ui.button(ui.t("undo"),enabled=writable,action={perform(WriteOperation.create("/review-actions/"+encode(action)+"/undo","POST",JSONObject(),"undo"))}))}
    }
    private fun enrollRows():List<Row> = listOf(Row{
        val box=ui.box();box.addView(ui.text(ui.t("enroll"),28f,true));box.addView(ui.message(ui.t("enroll_help")))
        val c=repo.credentials
        val base=ui.field(box,"base_url",c?.optString("base")?:getSharedPreferences("owner-ui",0).getString("last_base","")?:"")
        val grant=ui.field(box,"grant",secret=true)
        val secure=(getSystemService(KEYGUARD_SERVICE) as KeyguardManager).isDeviceSecure
        if(!secure)box.addView(ui.message(ui.t("screen_lock")))
        box.addView(ui.button(ui.t("enroll_send"),enabled=secure&&!repo.busy,primary=true){
            getSharedPreferences("owner-ui",0).edit().putString("last_base",base.text.toString().trim()).apply()
            val invitation=grant.text.toString();grant.setText("");repo.enroll(base.text.toString().trim(),invitation){code->if(!isDestroyed){notice=code;render();if(repo.credentials?.optString("status")=="active"){refresh();forms.restore()}}}
        })
        if(c!=null){box.addView(ui.text(ui.t("fingerprint")));box.addView(ui.text(repo.fingerprint()).apply{setTextIsSelectable(false)})
            box.addView(ui.message(c.optString("status")+" · "+c.optString("expires_at")))
            box.addView(ui.button(ui.t("enroll_check")){repo.enrollmentStatus{code->if(!isDestroyed){notice=code;render();if(repo.credentials?.optString("status")=="active"){refresh();forms.restore()}}}})
            box.addView(ui.button(ui.t("admin")){openAdmin()});box.addView(ui.button(ui.t("logout")){logout()})}
        box.addView(ui.button(ui.t("open_capture")){openCapture()});box
    })
    private fun repairRows()=listOf(Row{val box=ui.box();box.addView(ui.text(ui.t("repair"),24f,true));box.addView(ui.message(repo.storageError?:"LEDGER_STORAGE_FAILED"));box.addView(ui.message(ui.t("repair_help")));box.addView(ui.button(ui.t("reset_tasks")){confirm(ui.t("reset_tasks"),ui.t("repair_help")){repo.logout{render()}}});box.addView(ui.button(ui.t("open_capture")){openCapture()});box})
    fun logout(){confirm(ui.t("logout"),ui.t("logout_help")){forms.close();repo.logout{navigation=JSONObject().put("page","today");notice=null;render()}}}
    fun openCapture(){startActivity(Intent(this,CaptureActivity::class.java))}
    fun openAdmin(){val base=repo.credentials?.optString("base")?:getSharedPreferences("owner-ui",0).getString("last_base","")?:"";try{val u=Uri.parse(base);if(u.scheme!="https")throw IllegalArgumentException();startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(base.trimEnd('/')+"/owner-devices")))}catch(_:Exception){showNotice(ui.t("unavailable"))}}
    fun exportCanonical(){val path="/export";fetch(path){o->val data=o.data as? JSONObject;if(data==null||o.cached){showNotice(ui.t("unavailable"));return@fetch};exportData=data.toString(2);startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply{type="application/json";addCategory(Intent.CATEGORY_OPENABLE);putExtra(Intent.EXTRA_TITLE,"academic-os-canonical.json")},EXPORT)} }
    override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?){super.onActivityResult(requestCode,resultCode,data);if(requestCode!=EXPORT||resultCode!=RESULT_OK)return;val uri=data?.data?:return;val bytes=exportData?.toByteArray(Charsets.UTF_8);exportData=null;if(bytes==null){showNotice(ui.t("unavailable"));return};repo.async{var ok=false;try{contentResolver.openOutputStream(uri,"wt")?.use{it.write(bytes);ok=true}}catch(_:Exception){};repo.ui{if(!isDestroyed)showNotice(ui.t(if(ok)"saved" else "error"))}}}
    companion object{private const val EXPORT=810}
}
