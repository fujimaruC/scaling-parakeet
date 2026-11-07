package id.academicos.companion.ledger

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.text.Editable
import android.text.InputFilter
import android.text.TextWatcher
import android.view.View
import android.view.WindowManager
import android.widget.*
import id.academicos.companion.MainActivity
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

class NativeForms(private val a:MainActivity) {
    private val u get()=a.ui
    private var dialog:AlertDialog?=null
    private var restoration=false
    private var currentHost:LinearLayout?=null
    val isOpen:Boolean get()=dialog?.isShowing==true
    private fun preserve(form:JSONObject){a.navigation.put("form",form);a.persist()}
    private fun watch(edit:EditText,form:JSONObject,key:String){edit.addTextChangedListener(object:TextWatcher{override fun beforeTextChanged(s:CharSequence?,start:Int,count:Int,after:Int){};override fun onTextChanged(s:CharSequence?,start:Int,before:Int,count:Int){form.put(key,s?.toString()?:"");preserve(form)};override fun afterTextChanged(e:Editable?){} })}
    private fun show(type:String,title:String,form:JSONObject,content:(LinearLayout,JSONObject)->Unit){
        if(isOpen)return
        form.put("form_type",type);preserve(form)
        val host=u.column();currentHost=host;content(host,form)
        host.addView(u.button(u.t("close")){close()})
        val scroll=ScrollView(a).apply{addView(host);isFillViewport=true}
        val previous=a.currentFocus
        val created=AlertDialog.Builder(a).setTitle(title).setView(scroll).create();dialog=created
        created.setOnShowListener{host.focusableViewAvailable(host);host.findFocus()?.requestFocus();created.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)}
        created.setOnDismissListener{dialog=null;if(!a.isChangingConfigurations&&!a.isDestroyed){a.navigation.remove("form");a.persist();previous?.requestFocus()}}
        created.show();created.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
    fun reportFailure(message:String){
        val host=currentHost?:return;if(!isOpen)return;host.addView(u.message(message),0)
        val pending=a.repo.pending
        if(pending!=null){
            fun freeze(v:View){if(v is android.view.ViewGroup)repeat(v.childCount){freeze(v.getChildAt(it))};if(v is EditText||v is Spinner||v is CheckBox||(v is Button&&v.text.toString()!=u.t("close")))v.isEnabled=false}
            freeze(host);host.addView(u.button(u.t("retry"),a.repo.online()&&!a.repo.busy){a.perform(pending,retry=true)},1)
        }
    }
    fun close(){dialog?.dismiss();dialog=null;if(!a.isChangingConfigurations){a.navigation.remove("form");a.persist()}}
    fun restore(){if(restoration||isOpen||a.repo.pending!=null)return;restoration=true;val form=a.navigation.optJSONObject("form")?:return
        try{when(form.optString("form_type")){"quick"->quick(form);"editor"->editor(Task(form.getJSONObject("task")),form);"date"->date(Task(form.getJSONObject("task")),form);"proposal_date"->proposalDate(form.getJSONObject("candidate"),form.getJSONObject("patch"),form.getString("draft_key"),form);"proposal_editor"->proposalEditor(form.getJSONObject("candidate"),form.optJSONObject("target"),form.optJSONObject("patch"),form.getString("draft_key"),form);"context"->createContext(form);"source"->createSource(form);"rules"->reminderRules(form)}}catch(_:Exception){a.showNotice(u.t("unavailable"))}
    }
    private fun dateFields(box:LinearLayout,form:JSONObject):()->JSONObject {
        var due=form.optJSONObject("due")?:blankDue();form.put("due",due)
        val fields=u.column(0);box.addView(fields)
        fun render(){
            fields.removeAllViews()
            val selected=due.optString("precision","unknown")
            u.choice(fields,"precision",listOf("datetime","date_only","approximate","unknown").map{it to u.t(it)},selected){value->if(value!=selected){due=blankDue().put("precision",value);if(value in listOf("datetime","date_only"))due.put("timezone",a.zone);form.remove("wall_date");form.remove("wall_time");form.put("due",due);preserve(form);render()}}
            if(selected in listOf("datetime","date_only")){
                val dateText=due.nullable("local_date")?:due.nullable("local_datetime")?.take(10)?:form.nullable("wall_date")
                fields.addView(u.button(dateText?:u.t("date")){
                    val original=try{dateText?.let{LocalDate.parse(it)}}catch(_:Exception){null};val initial=original?:LocalDate.now()
                    DatePickerDialog(a,{_,year,month,day->val dayValue=LocalDate.of(year,month+1,day).toString();if(selected=="datetime"){val time=due.nullable("local_datetime")?.drop(11)?:form.nullable("wall_time");form.put("wall_date",dayValue);due.put("local_datetime",if(time==null)JSONObject.NULL else dayValue+"T"+time).put("local_date",JSONObject.NULL)}else due.put("local_date",dayValue).put("local_datetime",JSONObject.NULL);form.put("due",due);preserve(form);render()},initial.year,initial.monthValue-1,initial.dayOfMonth).show()
                })
                if(selected=="datetime"){
                    val current=due.nullable("local_datetime")?.drop(11)?:form.nullable("wall_time")
                    fields.addView(u.button(current?.take(5)?:u.t("time"),dateText!=null){
                        val time=try{current?.let{LocalTime.parse(it)}}catch(_:Exception){null}
                        TimePickerDialog(a,{_,hour,minute->val value=dateText+"T"+hour.toString().padStart(2,'0')+":"+minute.toString().padStart(2,'0')+":00";due.put("local_datetime",value);form.put("wall_time",value.drop(11));form.put("due",due);preserve(form);render()},time?.hour?:0,time?.minute?:0,true).show()
                    })
                }
                val zone=u.field(fields,"timezone",due.optString("timezone",a.zone));zone.addTextChangedListener(object:TextWatcher{override fun beforeTextChanged(s:CharSequence?,start:Int,count:Int,after:Int){};override fun afterTextChanged(e:Editable?){};override fun onTextChanged(s:CharSequence?,start:Int,before:Int,count:Int){due.put("timezone",s.toString());form.put("due",due);preserve(form)}})
            }else fields.addView(u.message(u.t(if(selected=="approximate")"approximate" else "no_instant")))
        }
        render()
        return {Due.from(due);if(due.optString("precision")=="datetime"&&due.isNull("local_datetime"))throw IllegalArgumentException();JSONObject(due.toString())}
    }
    private fun contextField(box:LinearLayout,form:JSONObject,filter:String?=null){
        val current=form.nullable("context_id")?:"";val choices=a.contexts.objects().filter{filter==null||it.optString("type")==filter}
        val items=ArrayList<Pair<String,String>>();items.add("" to u.t(if(filter!=null&&filter!="personal")"choose_context" else "personal"));items.addAll(choices.map{it.getString("id") to it.getString("display_name")})
        if(current.isNotEmpty()&&items.none{it.first==current})items.add(current to u.t("context_missing"))
        u.choice(box,"context",items,current){value->form.put("context_id",value);preserve(form)}
    }
    fun quick(saved:JSONObject?=null){
        val form=saved?:JSONObject().put("due",blankDue()).put("task_type","academic")
        show("quick",u.t("add"),form){box,draft->
            val title=u.field(box,"title",draft.optString("title"));title.filters=arrayOf(InputFilter.LengthFilter(240));watch(title,draft,"title")
            var type=draft.optString("task_type","academic");val contextHost=u.column(0)
            u.choice(box,"task_type",listOf("academic","organization","personal").map{it to u.t(it)},type){value->if(value!=type){type=value;draft.put("task_type",type).put("context_id","");preserve(draft);contextHost.removeAllViews();contextField(contextHost,draft,type)}}
            box.addView(contextHost);contextField(contextHost,draft,type)
            val due=dateFields(box,draft)
            box.addView(u.message(u.t("manual")))
            box.addView(u.button(u.t("add"),a.writable,primary=true){try{
                if(title.text.isBlank()||(type!="personal"&&draft.optString("context_id").isEmpty()))throw IllegalArgumentException()
                val payload=JSONObject().put("title",title.text.toString()).put("context_id",draft.nullable("context_id")?.takeIf{it.isNotEmpty()}?:JSONObject.NULL).put("kind",when(type){"academic"->"assignment";"organization"->"organizational_duty";else->"personal_action"}).put("due",due())
                a.perform(WriteOperation.create("/tasks","POST",payload,"create"))
            }catch(_:Exception){a.showNotice(u.t("required"));box.addView(u.message(u.t("required")))}})
            if(!a.writable)box.addView(u.message(u.t("online_only")))
        }
    }
    fun date(task:Task,saved:JSONObject?=null){
        val form=saved?:JSONObject().put("task",task.value).put("due",task.due.json())
        show("date",u.t("date_edit"),form){box,draft->val due=dateFields(box,draft);box.addView(u.button(u.t("save"),a.writable,primary=true){try{a.perform(WriteOperation.create("/tasks/"+a.encode(task.id),"PATCH",JSONObject().put("due",due()),"date",task.version))}catch(_:Exception){box.addView(u.message(u.t("date_required")))}});if(!a.writable)box.addView(u.message(u.t("online_only")))}
    }
    fun editor(task:Task,saved:JSONObject?=null){
        val form=saved?:JSONObject(task.value.toString()).put("task",task.value)
        editorForm("editor",form,task.value,false){payload->a.perform(WriteOperation.create("/tasks/"+a.encode(task.id),"PATCH",payload,"edit",task.version))}
    }
    fun proposalEditor(candidate:JSONObject,target:JSONObject?,patch:JSONObject?,draftKey:String,saved:JSONObject?=null){
        val original=if(target!=null)JSONObject(target.toString()).put("due",candidate.getJSONObject("fields").getJSONObject("due"))else JSONObject(candidate.getJSONObject("fields").toString())
        patch?.keys()?.forEach{key->if(key!="owner_reviewed")original.put(key,patch.get(key))}
        val form=saved?:JSONObject(original.toString()).put("candidate",candidate).put("target",target?:JSONObject.NULL).put("patch",patch?:JSONObject()).put("draft_key",draftKey)
        editorForm("proposal_editor",form,original,true){payload->payload.put("owner_reviewed",true);a.navigation.put(draftKey,payload);a.persist();close();a.render()}
    }
    private fun editorForm(type:String,form:JSONObject,original:JSONObject,proposal:Boolean,save:(JSONObject)->Unit){
        if(!form.has("due"))form.put("due",original.getJSONObject("due"))
        show(type,u.t(if(proposal)"proposal_draft" else "edit"),form){box,draft->
            val title=u.field(box,"title",draft.optString("title",original.optString("title")));title.filters=arrayOf(InputFilter.LengthFilter(240));watch(title,draft,"title")
            val notes=u.field(box,"notes",draft.nullable("description")?:"",multiline=true);notes.filters=arrayOf(InputFilter.LengthFilter(500));watch(notes,draft,"description")
            contextField(box,draft)
            val validKinds=listOf("assignment","exam","meeting","personal_action","organizational_duty");var kind=draft.optString("kind").takeIf{it in validKinds}?:""
            var status=draft.optString("status","todo");var priority=draft.optString("priority","normal").takeIf{it in listOf("low","normal","high","urgent")}?:"normal"
            u.choice(box,"kind",listOf("" to u.t("required"))+validKinds.map{it to u.t(it)},kind){value->kind=value;draft.put("kind",value);preserve(draft)}
            u.choice(box,"status",listOf("todo","doing","blocked","done","archived").map{it to u.t(it)},status){value->status=value;draft.put("status",value);preserve(draft)}
            u.choice(box,"priority",listOf("low","normal","high","urgent").map{it to u.t(it)},priority){value->priority=value;draft.put("priority",value);preserve(draft)}
            val due=dateFields(box,draft)
            if(proposal)box.addView(u.message(u.t("draft_only")))
            box.addView(u.button(u.t(if(proposal)"draft_save" else "save"),a.writable,primary=true){try{
                if(title.text.isBlank()||kind.isEmpty())throw IllegalArgumentException()
                val payload=JSONObject().put("title",title.text.toString()).put("description",notes.text.toString().takeIf{it.isNotEmpty()}?:JSONObject.NULL).put("context_id",draft.nullable("context_id")?.takeIf{it.isNotEmpty()}?:JSONObject.NULL).put("kind",kind).put("status",status).put("priority",priority).put("due",due())
                save(payload)
            }catch(_:Exception){box.addView(u.message(u.t("required")))}})
            if(!a.writable)box.addView(u.message(u.t("online_only")))
        }
    }
    fun proposalDate(candidate:JSONObject,patch:JSONObject,draftKey:String,saved:JSONObject?=null){
        val form=saved?:JSONObject().put("candidate",candidate).put("patch",patch).put("draft_key",draftKey).put("due",patch.optJSONObject("due")?:candidate.getJSONObject("fields").getJSONObject("due"))
        show("proposal_date",u.t("date_edit"),form){box,draft->val due=dateFields(box,draft);box.addView(u.message(u.t("draft_only")));box.addView(u.button(u.t("draft_save"),a.writable){try{val updated=JSONObject(patch.toString()).put("due",due());a.navigation.put(draftKey,updated);a.persist();close();a.render()}catch(_:Exception){box.addView(u.message(u.t("date_required")))}})}
    }
    fun createContext(saved:JSONObject?=null){val form=saved?:JSONObject().put("type","academic");show("context",u.t("add_context"),form){box,draft->val name=u.field(box,"context",draft.optString("name"));watch(name,draft,"name");var type=draft.optString("type","academic");u.choice(box,"task_type",listOf("academic","organization","personal").map{it to u.t(it)},type){value->type=value;draft.put("type",value);preserve(draft)};box.addView(u.button(u.t("add_context"),a.writable){if(name.text.isBlank()){box.addView(u.message(u.t("required")));return@button};a.perform(WriteOperation.create("/contexts","POST",JSONObject().put("type",type).put("display_name",name.text.toString()),"context"))})}}
    fun createSource(saved:JSONObject?=null){val form=saved?:JSONObject().put("kind","whatsapp_export");show("source",u.t("add_source"),form){box,draft->val name=u.field(box,"alias",draft.optString("name"));watch(name,draft,"name");var kind=draft.optString("kind","whatsapp_export");u.choice(box,"kind",listOf("whatsapp_export","whatsapp_notification","moodle_ical").map{it to it},kind){value->kind=value;draft.put("kind",value);preserve(draft)};box.addView(u.message(u.t("backup_linux")));box.addView(u.button(u.t("add_source"),a.writable){if(name.text.isBlank()){box.addView(u.message(u.t("required")));return@button};a.perform(WriteOperation.create("/sources","POST",JSONObject().put("kind",kind).put("display_name",name.text.toString()),"source"))})}}
    fun purge(source:JSONObject){
        if(isOpen)return
        val box=u.column();box.addView(u.text(source.getString("display_name"),22f,true));box.addView(u.message(u.t("loading")))
        val alert=AlertDialog.Builder(a).setTitle(u.t("purge")).setView(ScrollView(a).apply{addView(box)}).setNegativeButton(u.t("cancel"),null).create();dialog=alert;alert.setOnDismissListener{dialog=null};alert.show();alert.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        // Preview is a read-only POST, not a canonical operation, but still uses the authenticated device namespace.
        a.repo.previewPurge(source.getString("id")){value,code->if(!alert.isShowing||a.isDestroyed)return@previewPurge;box.removeAllViews();if(value==null){box.addView(u.message(u.t("unavailable")+" · "+(code?:"REQUEST_FAILED")));return@previewPurge}
            box.addView(u.message(u.t("purge_help")));value.getJSONArray("affected_tasks").objects().forEach{box.addView(u.text(it.getString("title")))}
            var policy="retain_as_manual";u.choice(box,"purge",listOf("retain_as_manual" to u.t("retain"),"delete" to u.t("delete_unsupported")),policy){policy=it}
            val confirmed=u.check(box,"purge_confirm",false);val button=u.button(u.t("purge_confirm"),false){a.confirm(u.t("purge_confirm"),u.t("purge_help")){a.perform(WriteOperation.create("/sources/"+a.encode(source.getString("id"))+"/purge","POST",JSONObject().put("expected_generation",value.getInt("generation")).put("task_policy",policy),"purge"))}}
            confirmed.setOnCheckedChangeListener{_,checked->button.isEnabled=checked&&a.writable};box.addView(button)
        }
    }
    fun reminderRules(saved:JSONObject?=null){val settings=a.preferences?:return;val policy=settings.optJSONObject("reminder_policy")?:JSONObject().put("enabled",true).put("offset_hours",JSONArray().put(24).put(3)).put("date_only_hour",9);val quiet=policy.optJSONObject("quiet_hours")?:JSONObject().put("enabled",false).put("start_hour",22).put("end_hour",7)
        val form=saved?:JSONObject().put("enabled",policy.optBoolean("enabled",true)).put("offsets",policy.getJSONArray("offset_hours").let{(0 until it.length()).joinToString(", "){i->it.get(i).toString()}}).put("hour",policy.optInt("date_only_hour",9).toString()).put("quiet",quiet.optBoolean("enabled")).put("start",quiet.optInt("start_hour",22).toString()).put("end",quiet.optInt("end_hour",7).toString()).put("version",settings.getInt("version"))
        show("rules",u.t("save_rules"),form){box,draft->val enabled=u.check(box,"enable_reminders",draft.getBoolean("enabled"));enabled.setOnCheckedChangeListener{_,v->draft.put("enabled",v);preserve(draft)};val offsets=u.field(box,"offsets",draft.getString("offsets"));watch(offsets,draft,"offsets");val hour=u.field(box,"date_hour",draft.getString("hour"));watch(hour,draft,"hour");val q=u.check(box,"quiet",draft.getBoolean("quiet"));q.setOnCheckedChangeListener{_,v->draft.put("quiet",v);preserve(draft)};val start=u.field(box,"quiet_start",draft.getString("start"));watch(start,draft,"start");val end=u.field(box,"quiet_end",draft.getString("end"));watch(end,draft,"end")
            box.addView(u.message(a.zone+" · "+u.t("policy")));box.addView(u.button(u.t("save_rules"),a.writable){try{
                val hours=if(offsets.text.isBlank())emptyList()else offsets.text.split(',').map{it.trim().toDouble()};require(hours.size<=5&&hours.distinct().size==hours.size&&hours.all{it.isFinite()&&it>0&&it<=168})
                val h=hour.text.toString().toInt();val s=start.text.toString().toInt();val e=end.text.toString().toInt();require(h in 0..23&&s in 0..23&&e in 0..23&&(!q.isChecked||s!=e))
                val payload=JSONObject().put("enabled",enabled.isChecked).put("offset_hours",JSONArray(hours)).put("date_only_hour",h).put("quiet_hours",JSONObject().put("enabled",q.isChecked).put("start_hour",s).put("end_hour",e))
                a.perform(WriteOperation.create("/settings/reminders","PATCH",payload,"rules",draft.getInt("version")))
            }catch(_:Exception){box.addView(u.message(u.t("required")))}})
        }
    }
}
