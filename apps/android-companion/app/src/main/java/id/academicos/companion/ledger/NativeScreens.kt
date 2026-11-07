package id.academicos.companion.ledger

import android.app.AlertDialog
import android.graphics.Color
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.*
import id.academicos.companion.MainActivity
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class NativeScreens(private val a:MainActivity) {
    private val u=a.ui
    private val rows=ArrayList<Row>()
    private fun bind(field:EditText,key:String){field.addTextChangedListener(object:android.text.TextWatcher{override fun beforeTextChanged(s:CharSequence?,start:Int,count:Int,after:Int){};override fun afterTextChanged(e:android.text.Editable?){};override fun onTextChanged(s:CharSequence?,start:Int,before:Int,count:Int){a.navigation.put(key,s.toString());a.persist()}})}
    private fun title(key:String){rows.add(Row(key){u.text(u.t(key),28f,true)})}
    private fun note(value:String){rows.add(Row{u.message(value)})}
    private fun action(key:String,enabled:Boolean=true,run:()->Unit){rows.add(Row{u.button(u.t(key),enabled,action=run)})}
    private fun status(path:String):Observation {
        val o=a.observation(path)
        when(o.state){
            LoadState.UNLOADED->{note(u.t("unloaded"));action("refresh"){a.fetch(path)}}
            LoadState.LOADING->note(u.t("loading"))
            LoadState.UNAVAILABLE->{note(u.t("unavailable")+" · "+(o.code?:"NOT_OBSERVED"));action("refresh",!a.repo.busy){a.fetch(path)}}
            LoadState.EMPTY->note(u.t("empty"))
            LoadState.PARTIAL->note(u.t("partial"))
            LoadState.READY->Unit
        }
        if(o.cached)note(u.t("offline")+(o.observed?:u.t("unavailable")))
        return o
    }
    private fun fresh(path:String):Boolean {val o=a.observation(path);return a.writable&&!o.cached&&o.state in listOf(LoadState.READY,LoadState.PARTIAL,LoadState.EMPTY)}
    private fun more(path:String){if(a.observation(path).cursor!=null)action("more",fresh(path)){a.loadMore(path)}}
    private fun context(task:Task)=a.contexts.objects().find{it.getString("id")==task.context}?.optString("display_name")?:u.t(if(task.context==null)"personal" else "context_missing")
    private fun task(task:Task,path:String){rows.add(Row{
        val line=u.row();line.setPadding(0,u.dp(4),0,u.dp(4))
        val done=task.status=="done";val pending=a.repo.pending?.takeIf{it.path=="/tasks/"+task.id}?.let{try{JSONObject(it.body).optString("status",task.status)}catch(_:Exception){task.status}}
        val toggle=u.button(if((pending?:task.status)=="done")"✓" else "□",fresh(path)){
            a.perform(WriteOperation.create("/tasks/"+a.encode(task.id),"PATCH",JSONObject().put("status",if(done)"todo" else "done"),"toggle",task.version))
        }.apply{contentDescription=u.t(if(done)"reopen" else "complete")+": "+task.title;layoutParams=LinearLayout.LayoutParams(u.dp(48),-2)}
        val text=task.title+"\n"+context(task)+" · "+task.due.label(u.locale,u.id)+"\n"+u.t(pending?:task.status)
        val body=u.button(text,action={a.navigate("detail",task.id)}).apply{typeface=u.body;textSize=16f;gravity=Gravity.START or Gravity.CENTER_VERTICAL;layoutParams=LinearLayout.LayoutParams(0,-2,1f);if(done)paintFlags=paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG}
        line.addView(toggle);line.addView(body);line
    })}
    private fun parsed(path:String):List<Task> = a.items(path).map{Task(it)}
    fun rows():List<Row> {
        when(a.page){"today"->today();"tasks"->tasks();"detail"->detail();"review"->review();"calendar"->calendar();"settings"->settings();"sources"->sources();"source"->source();"history"->history();"reminders"->reminders();else->today()}
        return rows
    }
    private fun today(){
        title("today");val briefing=status("/briefing").data as? JSONObject
        briefing?.let{b->val counts=b.getJSONObject("counts");note(u.t("review")+": "+b.getInt("pending")+" · "+u.t("undated")+": "+counts.optInt("no_date"));if(b.getInt("pending")>0)action("review"){a.navigate("review")}}
        val path=a.taskPath();val obs=status(path)
        if(a.preferences==null){note(u.t("timezone")+" · "+u.t("unavailable"));return}
        val today=LocalDate.now(ZoneId.of(a.zone));val tasks=parsed(path).filter{it.status!="archived"}.sortedBy{it.sortKey(a.zone)}
        title("due_today");val due=tasks.filter{it.day(a.zone)?.let{day->day<=today&&(it.status!="done"||day==today)}==true}.sortedWith(compareBy<Task>{it.status=="done"}.thenBy{it.sortKey(a.zone)});if(due.isEmpty()&&obs.envelope!=null&&obs.state in listOf(LoadState.READY,LoadState.EMPTY))note(u.t("no_today"))
        for(t in due){rows.add(Row{
            val box=u.box();box.addView(u.button(t.title,action={a.navigate("detail",t.id)}).apply{typeface=u.body;textSize=20f});box.addView(u.message(context(t)+" · "+t.due.label(u.locale,u.id)))
            if(t.instant!=null&&t.status!="done"){
                val seconds=t.instant.epochSecond-Instant.now().epochSecond
                box.addView(u.text(if(seconds<0)u.t("overdue")else if(seconds<3600)"${seconds/60}m"else if(seconds<86400)"${seconds/3600}h ${(seconds%3600)/60}m"else "${seconds/86400}d",26f,true))
                val bar=u.row();val window=if(seconds<86400)86400.0 else 7*86400.0;val filled=((1-seconds.coerceAtLeast(0).toDouble().coerceAtMost(window)/window)*16).toInt()
                repeat(16){index->bar.addView(View(a).apply{setBackgroundColor(if(index<filled)if(seconds<86400)u.urgent else u.accent else u.muted);importantForAccessibility=View.IMPORTANT_FOR_ACCESSIBILITY_NO},LinearLayout.LayoutParams(0,u.dp(12),1f).apply{setMargins(u.dp(1),0,u.dp(1),0)})};box.addView(bar)
            }
            box.addView(u.button(u.t(if(t.status=="done")"reopen" else "complete"),fresh(path),primary=true){a.perform(WriteOperation.create("/tasks/"+a.encode(t.id),"PATCH",JSONObject().put("status",if(t.status=="done")"todo" else "done"),"toggle",t.version))});box
        })}
        title("week");tasks.filter{it.day(a.zone)?.let{d->d>today&&d<=today.plusDays(7)}==true}.forEach{task(it,path)}
        action("undated"){a.navigate("tasks");a.navigation.put("group","undated");a.persist();a.render()}
        note(tasks.count{it.day(a.zone)==null}.toString()+" "+u.t("loaded"));more(path)
        action("add",a.writable){a.forms.quick()};action("refresh"){a.refresh()}
    }
    private fun tasks(){
        title("tasks");rows.add(Row{
            val box=u.column(0)
            u.choice(box,"task_type",listOf("all","academic","organization","personal").map{it to u.t(it)},a.navigation.optString("filter","all")){value->if(value!=a.navigation.optString("filter","all")){a.navigation.put("filter",value);a.persist();a.fetch(a.taskPath());a.render()}}
            val q=u.field(box,"search",a.navigation.optString("query_draft",a.navigation.optString("query")));bind(q,"query_draft");box.addView(u.button(u.t("search_action")){a.navigation.put("query",q.text.toString().take(200));a.persist();a.fetch(a.taskPath());a.render()});box
        })
        val path=a.taskPath();status(path);if(a.preferences==null){note(u.t("timezone")+" · "+u.t("unavailable"));return}
        val tasks=parsed(path).filter{it.status!="archived"}.sortedBy{it.sortKey(a.zone)};val today=LocalDate.now(ZoneId.of(a.zone))
        for(key in listOf("today","week","later","undated","done")){val group=tasks.filter{it.group(today,a.zone)==key};if(group.isNotEmpty()){title(key);group.forEach{task(it,path)}}}
        val archived=parsed(path).filter{it.status=="archived"};if(archived.isNotEmpty()){title("archived");archived.forEach{task(it,path)}}
        more(path);action("add",a.writable){a.forms.quick()}
    }
    private fun detail(){
        title("detail");val path=a.detailPath();val o=status(path);val view=o.data as? JSONObject?:return;val task=Task(view.getJSONObject("task"))
        rows.add(Row{val box=u.box();box.addView(u.text(task.title,28f,true));box.addView(u.message(context(task)));box.addView(u.text(task.due.label(u.locale,u.id),24f,true));val sources=view.optJSONArray("sources")?:JSONArray();box.addView(u.message(if(sources.length()>0)sources.objects().joinToString(" · "){it.getString("display_name")}else if(task.value.optInt("manual_owned")==1)u.t("manual")else u.t("unavailable")));box})
        title("reminders");note(u.t("policy"));val policy=view.optJSONObject("reminder_policy")
        if(policy==null)note(u.t("unavailable"))else {
            note(u.t(if(view.optString("reminder_policy_origin")=="configured")"policy_saved" else "policy_default"))
            when{!policy.optBoolean("enabled",true)->note(u.t("policy_disabled"));task.due.precision in listOf("unknown","approximate")->note(u.t("policy_none"));task.due.precision=="date_only"->note(u.t("prior_day")+" "+policy.optInt("date_only_hour").toString().padStart(2,'0')+":00 · "+task.due.zone);else->note((policy.optJSONArray("offset_hours")?:JSONArray()).toString()+" "+u.t("hours_before"))}
        }
        task.value.nullable("description")?.let{title("notes");note(it)}
        title("history");(view.optJSONArray("history")?:JSONArray()).objects().forEach{event->rows.add(Row{val box=u.column(0);box.addView(u.text(u.t(event.optString("event_type","updated")),18f,true));box.addView(u.message(event.getString("created_at")));for(key in listOf("before_json","after_json")){val value=event.nullable(key);if(value!=null)try{val fields=JSONObject(value);val due=fields.optJSONObject("due");if(due!=null)box.addView(u.message(u.t(if(key=="before_json")"before" else "after")+": "+Due.from(due).label(u.locale,u.id)))}catch(_:Exception){box.addView(u.message(u.t("unavailable")))}};box})}
        if(view.nullable("next_history_cursor")!=null)action("history_more",fresh(path)){a.loadMore(path,true)}
        action("date_edit",fresh(path)){a.forms.date(task)};action("edit",fresh(path)){a.forms.editor(task)}
        action(if(task.status=="done")"reopen" else "complete",fresh(path)){a.perform(WriteOperation.create("/tasks/"+a.encode(task.id),"PATCH",JSONObject().put("status",if(task.status=="done")"todo" else "done"),"toggle",task.version))}
        action("delete",fresh(path)){a.confirm(u.t("delete"),u.t("confirm_delete")){a.perform(WriteOperation.create("/tasks/"+a.encode(task.id),"DELETE",JSONObject(),"delete",task.version))}}
    }
    private fun review(){
        title("review");status("/briefing");val path=a.candidatePath();val obs=status(path);val proposals=a.items(path)
        val total=(a.observation("/briefing").data as? JSONObject)?.optInt("pending")
        if(proposals.isEmpty()){if(obs.envelope!=null)action("today"){a.navigate("today")};return}
        val index=a.navigation.optInt("candidate_index",0).coerceIn(0,proposals.size-1);val c=proposals[index];val fields=c.getJSONObject("fields");val conflict=fields.optString("kind")=="deadline_change"
        note("${index+1}/${proposals.size} "+u.t("loaded")+" · "+u.t("review")+": "+(total?.toString()?:u.t("unavailable")))
        note(u.t("swipe_hint"))
        val draftKey="proposal_draft_"+c.getString("id")+"_"+c.getInt("version");val patch=a.navigation.optJSONObject(draftKey)
        val due=patch?.optJSONObject("due")?:fields.getJSONObject("due")
        val target=a.navigation.optJSONObject("target_"+c.getString("id")+"_"+c.getInt("version"))
        val evidence=c.optJSONArray("evidence_ids")?:JSONArray();val hasIssues=(c.optJSONArray("issues")?:JSONArray()).length()>0
        rows.add(Row{
            val stack=u.box();stack.addView(u.text(u.t(if(conflict)"conflict" else "new_proposal"),16f,true));stack.addView(u.text(patch?.optString("title",fields.optString("title"))?:fields.optString("title"),24f,true));stack.addView(u.message(c.optString("source_label",u.t("unavailable"))))
            val context=(patch?:fields).nullable("context_id");stack.addView(u.message(a.contexts.objects().find{it.optString("id")==context}?.optString("display_name")?:u.t(if(context==null)"personal" else "context_missing")))
            if(conflict){stack.addView(u.text(u.t("before"),16f,true));stack.addView(u.message(target?.let{Task(it).due.label(u.locale,u.id)}?:u.t("target_choose")));stack.addView(u.text(u.t("after"),16f,true))}
            stack.addView(u.text(Due.from(due).label(u.locale,u.id),26f,true));stack.addView(u.message(u.t("old_claim")))
            stack.addView(u.message(u.t("evidence")));if(evidence.length()==0)stack.addView(u.message(u.t("evidence_missing")))else repeat(evidence.length()){stack.addView(u.message(evidence.getString(it)))}
            if(hasIssues){stack.addView(u.message(u.t("issues")));stack.addView(u.message((c.optJSONArray("issues")?:JSONArray()).toString()))}
            var downX=0f;var downY=0f
            stack.contentDescription=(patch?.optString("title",fields.optString("title"))?:fields.optString("title"))+" · "+Due.from(due).label(u.locale,u.id)
            stack.setOnClickListener{a.showNotice(u.t("swipe_hint"))}
            stack.setOnTouchListener{view,event->when(event.actionMasked){
                MotionEvent.ACTION_DOWN->{downX=event.x;downY=event.y;true}
                MotionEvent.ACTION_MOVE->{val dx=kotlin.math.abs(event.x-downX);val dy=kotlin.math.abs(event.y-downY);view.parent.requestDisallowInterceptTouchEvent(dx>dy&&dx>u.dp(18));true}
                MotionEvent.ACTION_UP->{view.performClick();if(kotlin.math.abs(event.x-downX)>u.dp(90)&&kotlin.math.abs(event.y-downY)<u.dp(40))a.showNotice(u.t("approve_help"));true}
                MotionEvent.ACTION_CANCEL->{view.parent.requestDisallowInterceptTouchEvent(false);false}
                else->false
            }}
            val frame=android.widget.FrameLayout(a);frame.setPadding(0,0,0,u.dp(24));frame.clipChildren=false
            if(proposals.size-index>2)frame.addView(u.box().apply{scaleX=.92f;translationY=u.dp(20).toFloat();importantForAccessibility=View.IMPORTANT_FOR_ACCESSIBILITY_NO},android.widget.FrameLayout.LayoutParams(-1,u.dp(100),Gravity.BOTTOM))
            if(proposals.size-index>1)frame.addView(u.box().apply{scaleX=.96f;translationY=u.dp(10).toFloat();importantForAccessibility=View.IMPORTANT_FOR_ACCESSIBILITY_NO},android.widget.FrameLayout.LayoutParams(-1,u.dp(100),Gravity.BOTTOM))
            frame.addView(stack,android.widget.FrameLayout.LayoutParams(-1,-2));frame
        })
        if(conflict){
            rows.add(Row{val box=u.column(0);val query=u.field(box,"target_search",a.navigation.optString("target_draft",a.navigation.optString("target_query")));bind(query,"target_draft");box.addView(u.button(u.t("search_action")){a.navigation.put("target_query",query.text.toString().take(200));a.persist();a.fetch(a.targetPath());a.render()});box})
            val targetPath=a.targetPath();status(targetPath)
            rows.add(Row{val box=u.column(0);val candidates=a.items(targetPath);u.choice(box,"target",listOf("" to u.t("target_choose"))+candidates.map{it.getString("id") to it.getString("title")},target?.optString("id")?:""){id->
                val selected=candidates.find{it.getString("id")==id}
                if(id!=(target?.optString("id")?:"")){a.navigation.put("target_"+c.getString("id")+"_"+c.getInt("version"),selected?:JSONObject.NULL);a.persist();a.render()}
            };box});more(targetPath)
        }
        action("date_edit",fresh(path)){a.forms.proposalDate(c,patch?:JSONObject().put("due",due),draftKey)}
        action("proposal_draft",fresh(path)){a.forms.proposalEditor(c,target,patch,draftKey)}
        val promotable=fields.optString("kind") in listOf("assignment","exam","meeting","personal_action","organizational_duty","deadline_change")
        val canApprove=fresh(path)&&evidence.length()>0&&(!conflict||target!=null)&&((!hasIssues&&promotable)||patch?.optBoolean("owner_reviewed",false)==true)
        action("approve",canApprove){
            val displayTitle=patch?.optString("title",fields.getString("title"))?:fields.getString("title")
            val body=displayTitle+"\n"+Due.from(due).label(u.locale,u.id)+"\n"+(target?.optString("title")?:u.t("new_proposal"))+"\n\n"+u.t("approve_help")
            a.confirm(u.t("approve"),body,u.t("approve_confirm")){
                val payload=JSONObject().put("action",if(patch!=null)"accept_with_edits" else "accept").put("expected_candidate_version",c.getInt("version"))
                if(patch!=null){val safe=JSONObject(patch.toString());safe.remove("owner_reviewed");payload.put("task_patch",safe)}
                if(target!=null)payload.put("target_task_id",target.getString("id")).put("expected_task_version",target.getInt("version"))
                a.perform(WriteOperation.create("/candidates/"+a.encode(c.getString("id"))+"/review","POST",payload,"accept")){a.navigation.remove(draftKey);a.navigation.remove("target_"+c.getString("id")+"_"+c.getInt("version"));a.persist()}
            }
        }
        for(actionName in listOf("reject","clarify"))action(actionName,fresh(path)){
            a.confirm(u.t(actionName),fields.getString("title")){
                val payload=JSONObject().put("action",if(actionName=="reject")"reject" else "needs_clarification").put("expected_candidate_version",c.getInt("version"))
                if(target!=null)payload.put("target_task_id",target.getString("id")).put("expected_task_version",target.getInt("version"))
                a.perform(WriteOperation.create("/candidates/"+a.encode(c.getString("id"))+"/review","POST",payload,actionName))
            }
        }
        if(index>0)action("previous"){a.navigation.put("candidate_index",index-1);a.persist();a.render()};if(index<proposals.size-1)action("next"){a.navigation.put("candidate_index",index+1);a.persist();a.render()};more(path)
    }
    private fun calendar(){
        title("calendar");val month=a.month();val path=a.calendarPath();val o=status(path);val tasks=parsed(path)
        rows.add(Row{val bar=u.row();bar.addView(u.button(u.t("previous"),month.year>1900){a.navigation.put("month",month.minusMonths(1).toString());a.navigation.remove("day");a.persist();a.fetch(a.calendarPath());a.render()}.apply{layoutParams=LinearLayout.LayoutParams(0,-2,1f)});bar.addView(u.text(month.format(DateTimeFormatter.ofPattern("MMMM yyyy",u.locale)),22f,true).apply{gravity=Gravity.CENTER;layoutParams=LinearLayout.LayoutParams(0,-2,2f)});bar.addView(u.button(u.t("next"),month.year<9899){a.navigation.put("month",month.plusMonths(1).toString());a.navigation.remove("day");a.persist();a.fetch(a.calendarPath());a.render()}.apply{layoutParams=LinearLayout.LayoutParams(0,-2,1f)});bar})
        val selected=try{LocalDate.parse(a.navigation.optString("day",month.toString()))}catch(_:Exception){month};val today=LocalDate.now(ZoneId.of(a.zone))
        rows.add(Row{
            val horizontal=HorizontalScrollView(a);val grid=u.column(0);grid.minimumWidth=u.dp(336)
            val header=u.row();repeat(7){index->header.addView(u.text(LocalDate.of(2026,11,2).plusDays(index.toLong()).format(DateTimeFormatter.ofPattern("EEE",u.locale)),12f,true).apply{gravity=Gravity.CENTER},LinearLayout.LayoutParams(u.dp(48),-2))};grid.addView(header)
            val offset=month.dayOfWeek.value-1;var line=u.row();repeat(offset){line.addView(View(a),LinearLayout.LayoutParams(u.dp(48),u.dp(48)))}
            for(number in 1..month.lengthOfMonth()){
                val day=month.withDayOfMonth(number);val found=tasks.filter{it.day(a.zone)==day&&it.status!="archived"};val label=day.format(DateTimeFormatter.ofPattern("EEEE d MMMM yyyy",u.locale))+" · "+if(o.envelope==null)u.t("unavailable")else "${found.size} "+u.t("tasks")+" · "+found.map{context(it)}.distinct().joinToString(", ")+(if(o.cursor!=null)" · "+u.t("loaded")else"")
                val button=u.button(number.toString()+if(found.any{it.status!="done"})"\n▪" else "",action={a.navigation.put("day",day.toString());a.persist();a.render()}).apply{contentDescription=label+(if(day==today)" · "+u.t("today")else"");isSelected=day==selected;if(day==selected){setTextColor(u.onAccent);background=u.border(u.accent)}else if(day==today)background=u.border(u.card,u.accent);textSize=16f;setPadding(0,u.dp(4),0,u.dp(4));layoutParams=LinearLayout.LayoutParams(u.dp(48),-2)}
                line.addView(button);if((offset+number)%7==0){grid.addView(line);line=u.row()}
            };if(line.childCount>0)grid.addView(line);horizontal.addView(grid);horizontal
        })
        note(selected.format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy",u.locale)));if(o.envelope!=null&&o.state in listOf(LoadState.READY,LoadState.EMPTY,LoadState.PARTIAL)&&tasks.none{it.day(a.zone)==selected&&it.status!="archived"})note(u.t("empty")+(if(o.cursor!=null)" · "+u.t("partial")else""));tasks.filter{it.day(a.zone)==selected&&it.status!="archived"}.sortedBy{it.sortKey(a.zone)}.forEach{task(it,path)};more(path);action("undated"){a.navigate("tasks");a.navigation.put("group","undated");a.persist();a.render()};action("add",a.writable){a.forms.quick()}
    }
    private fun settings(){
        title("settings");status("/settings")
        rows.add(Row{val box=u.box();val prefs=a.getSharedPreferences("owner-ui",0)
            u.choice(box,"language",listOf("id" to "Bahasa Indonesia","en" to "English"),prefs.getString("language","id")?:"id"){v->if(v!=prefs.getString("language","id")){a.persist();prefs.edit().putString("language",v).apply();a.recreate()}}
            u.choice(box,"theme",listOf("system","light","dark").map{it to u.t(it)},prefs.getString("theme","system")?:"system"){v->if(v!=prefs.getString("theme","system")){a.persist();prefs.edit().putString("theme",v).apply();a.recreate()}}
            val motion=u.check(box,"motion",prefs.getBoolean("reduced_motion",false));motion.setOnCheckedChangeListener{_,v->prefs.edit().putBoolean("reduced_motion",v).apply()}
            val zone=u.field(box,"timezone",a.navigation.optString("timezone_draft",a.preferences?.optString("timezone")?:""));bind(zone,"timezone_draft");box.addView(u.button(u.t("save_timezone"),fresh("/settings")){
                val pref=a.preferences?:return@button
                a.perform(WriteOperation.create("/settings","PATCH",JSONObject().put("language",if(u.id)"id" else "en").put("theme",prefs.getString("theme","system")).put("timezone",zone.text.toString()),"settings",pref.getInt("version")))
            });box})
        title("context");status("/contexts");a.contexts.objects().forEach{note(it.getString("display_name")+" · "+u.t(it.getString("type")))};action("add_context",a.writable){a.forms.createContext()}
        for(key in listOf("reminders","sources","history"))action(key){a.navigate(key)}
        note(u.t("export_help"));action("export",a.writable){a.exportCanonical()};note(u.t("backup_linux"));note(u.t("push_note"))
        note(u.t("expiry")+": "+(a.repo.credentials?.optString("expires_at")?:u.t("unavailable")))
        action("admin"){a.openAdmin()};action("revoke_self",a.writable){a.confirm(u.t("revoke_self"),u.t("logout_help")){a.perform(WriteOperation.create("/session","DELETE",JSONObject(),"revoke")){a.repo.logout{a.render()}}}}
        action("logout"){a.logout()};note(u.t("capture_notice"));action("open_capture"){a.openCapture()}
    }
    private fun sources(){title("sources");val path="/sources";status(path);a.items(path).forEach{s->rows.add(Row{val box=u.box();box.addView(u.text(s.getString("display_name"),20f,true));box.addView(u.message(s.getString("kind")+" · "+s.getString("id")+" · "+s.getInt("generation")));box.addView(u.message(s.nullable("last_sync_at")?:u.t("unavailable")));box.addView(u.button(u.t("acknowledgments")){a.navigate("source",s.getString("id"))});if(s.isNull("purged_at"))box.addView(u.button(u.t("purge"),fresh(path)){a.forms.purge(s)});box})};action("add_source",a.writable){a.forms.createSource()};note(u.t("backup_linux"))}
    private fun source(){title("acknowledgments");val path=a.sourcePath();val o=status(path);val value=o.data as? JSONObject?:return
        note(u.t("inventory_partial"));if(value.optBoolean("cloud_purged"))note(u.t(if(value.optBoolean("local_wipe_pending"))"linux_pending" else "linux_ack"))
        val actions=value.optJSONArray("actions")?:JSONArray();if(actions.length()==0)note(u.t("not_acknowledged"))
        actions.objects().forEach{action->rows.add(Row{val box=u.box();box.addView(u.text(action.optString("kind")+" · "+action.getString("id"),16f,true));val progress=action.optString("progress");val status=action.optString("status");box.addView(u.message(u.t(progress)+" · "+u.t(if(status=="retired_unconfirmed")"retired" else if(status=="expired")"expired" else if(status=="confirmed")"applied" else if(progress=="delivered")"delivered" else "not_acknowledged")));if(!action.isNull("applied_at"))box.addView(u.message(action.getString("applied_at")))else box.addView(u.button(u.t("retire"),fresh(path)){a.confirm(u.t("retire"),u.t("inventory_partial")){a.perform(WriteOperation.create("/device-actions/"+a.encode(action.getString("id"))+"/retire","POST",JSONObject(),"retire"))}});box})}
        if(actions.length()<value.optInt("actions_total")){note(u.t("partial"));action("more",fresh(path)){val more=path+"?actions_offset="+actions.length();a.repo.read(more){next->if(a.isDestroyed||a.page!="source"||a.sourcePath()!=path)return@read;val data=next.data as? JSONObject;if(data!=null&&!next.cached){val merged=JSONArray(actions.toString());data.getJSONArray("actions").objects().forEach{merged.put(it)};data.put("actions",merged);next.envelope?.put("data",data);a.observations[path]=next;next.envelope?.let{a.repo.remember(path,it)}}else a.showNotice(u.t("unavailable"));a.render()}}}
    }
    private fun history(){
        title("history");val path="/history";status(path);note(u.t("recent_only"))
        a.items(path).forEach { event -> rows.add(Row {
            val box=u.box();box.addView(u.text(u.t(event.optString("event_type","updated")),18f,true));box.addView(u.message(event.getString("created_at")));box.addView(u.message(event.getString("task_id")))
            for(key in listOf("before_json","after_json")){
                event.nullable(key)?.let { raw ->
                    try{val j=JSONObject(raw);j.nullable("title")?.let{title->box.addView(u.text(title))};j.optJSONObject("due")?.let{due->box.addView(u.message(Due.from(due).label(u.locale,u.id)))}}
                    catch(_:Exception){box.addView(u.message(u.t("unavailable")))}
                }
            };box
        })}
    }
    private fun reminders(){title("reminders");val path="/reminders";status(path);note(u.t("recent_only"));note(u.t("push_note"));a.items(path).forEach{entry->rows.add(Row{val box=u.box();box.addView(u.text(entry.getString("created_at")));box.addView(u.button(u.t("detail")){a.navigate("detail",entry.getString("task_id"))});box.addView(u.button(u.t("read"),fresh(path)){a.perform(WriteOperation.create("/reminders/"+a.encode(entry.getString("id"))+"/read","PATCH",JSONObject(),"read"))});box.addView(u.button(u.t("snooze"),fresh(path)){a.perform(WriteOperation.create("/reminders/"+a.encode(entry.getString("id"))+"/snooze","POST",JSONObject().put("until",Instant.now().plusSeconds(3600).toString()),"snooze"))});box})};action("save_rules",fresh("/settings")){a.forms.reminderRules()}}
}
