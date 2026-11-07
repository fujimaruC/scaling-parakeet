package id.academicos.companion.ledger

import android.app.Activity
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.graphics.drawable.StateListDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.*
import id.academicos.companion.R

class Ui(val activity:Activity) {
    private val fieldIds=HashMap<String,Int>()
    private val preferences=activity.getSharedPreferences("owner-ui",0)
    val id=preferences.getString("language","id")!="en"
    val locale=java.util.Locale(if(id)"id" else "en")
    val dark=when(preferences.getString("theme","system")){"dark"->true;"light"->false;else->activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK==Configuration.UI_MODE_NIGHT_YES}
    val bg=Color.parseColor(if(dark)"#16161a" else "#f4f2ec")
    val card=Color.parseColor(if(dark)"#202026" else "#ffffff")
    val ink=Color.parseColor(if(dark)"#f2f0ea" else "#1b1b1f")
    val muted=Color.parseColor(if(dark)"#a9a69d" else "#66635b")
    val accent=Color.parseColor(if(dark)"#7c95ff" else "#2f54eb")
    val urgent=Color.parseColor(if(dark)"#ff7a63" else "#b73421")
    val onAccent=if(dark)bg else Color.WHITE
    val pixel:Typeface=activity.resources.getFont(R.font.pixelify)
    val body:Typeface=activity.resources.getFont(R.font.inter)
    fun t(key:String)=Copy.text(activity,key)
    fun dp(value:Int)=(value*activity.resources.displayMetrics.density+.5f).toInt()
    fun text(value:CharSequence,size:Float=16f,heading:Boolean=false):TextView=TextView(activity).apply {
        text=value;textSize=size;setTextColor(ink);typeface=if(heading)pixel else body;setPadding(0,dp(6),0,dp(6));setTextIsSelectable(false)
        if(heading)accessibilityLiveRegion=View.ACCESSIBILITY_LIVE_REGION_NONE
    }
    fun column(padding:Int=12)=LinearLayout(activity).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(padding),dp(padding),dp(padding),dp(padding));layoutParams=ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT)}
    fun row()=LinearLayout(activity).apply{orientation=LinearLayout.HORIZONTAL;gravity=Gravity.CENTER_VERTICAL;layoutParams=ViewGroup.LayoutParams(-1,-2)}
    fun border(fill:Int=card,stroke:Int=ink)=GradientDrawable().apply{setColor(fill);setStroke(dp(2),stroke)}
    fun calendarBorder(selected:Boolean,today:Boolean):StateListDrawable {
        val fill=if(selected)accent else card
        val focus=border(fill,if(selected)onAccent else accent).apply{setStroke(dp(3),if(selected)onAccent else accent)}
        return StateListDrawable().apply{addState(intArrayOf(android.R.attr.state_focused),focus);addState(intArrayOf(),border(fill,if(today&&!selected)accent else ink))}
    }
    fun focusBorder()=StateListDrawable().apply{addState(intArrayOf(android.R.attr.state_focused),border(card,accent));addState(intArrayOf(),border())}
    fun box():AccessibleBox=AccessibleBox(activity).apply{
        orientation=LinearLayout.VERTICAL;layoutParams=ViewGroup.LayoutParams(-1,-2)
        val shadow=border(ink);val face=border();background=LayerDrawable(arrayOf(shadow,face)).apply{setLayerInset(0,dp(4),dp(4),0,0);setLayerInset(1,0,0,dp(4),dp(4))};setPadding(dp(16),dp(12),dp(16),dp(16))
    }
    fun button(value:String,enabled:Boolean=true,primary:Boolean=false,action:()->Unit):Button=Button(activity).apply{
        text=value;isAllCaps=false;typeface=pixel;textSize=17f;minHeight=dp(48);minimumHeight=dp(48);minWidth=dp(48);setPadding(dp(12),dp(8),dp(12),dp(8));setTextColor(if(primary)onAccent else ink)
        val fill=if(primary)accent else card
        background=StateListDrawable().apply{addState(intArrayOf(android.R.attr.state_pressed),border(fill,accent));addState(intArrayOf(android.R.attr.state_focused),border(fill,if(primary)onAccent else accent));addState(intArrayOf(),border(fill))}
        stateListAnimator=null;isEnabled=enabled;alpha=1f;contentDescription=value;setOnClickListener{action()}
        layoutParams=LinearLayout.LayoutParams(-1,-2).apply{setMargins(0,dp(4),0,dp(4))}
    }
    fun drawable(key:String):android.graphics.drawable.Drawable {
        val patterns=mapOf("back" to listOf("00100","01000","11111","01000","00100"),"settings" to listOf("01010","11111","01010","11111","01010"),"today" to listOf("00100","10101","01110","10101","00100"),"tasks" to listOf("10111","00000","10111","00000","10111"),"review" to listOf("11111","10001","11011","10101","11111"),"calendar" to listOf("01010","11111","10001","10101","11111"),"add" to listOf("00100","00100","11111","00100","00100"))
        val pattern=patterns[key]?:patterns.getValue("add");val bitmap=android.graphics.Bitmap.createBitmap(5,5,android.graphics.Bitmap.Config.ARGB_8888)
        pattern.forEachIndexed{y,row->row.forEachIndexed{x,c->if(c=='1')bitmap.setPixel(x,y,ink)}}
        return android.graphics.drawable.BitmapDrawable(activity.resources,bitmap).apply{isFilterBitmap=false;setBounds(0,0,dp(24),dp(24))}
    }
    fun icon(key:String,action:()->Unit):ImageButton=ImageButton(activity).apply{setImageDrawable(drawable(key));setPadding(dp(12),dp(12),dp(12),dp(12));minimumHeight=dp(48);minimumWidth=dp(48);contentDescription=t(key);background=focusBorder();setOnClickListener{action()};layoutParams=LinearLayout.LayoutParams(dp(48),dp(48))}
    fun field(parent:LinearLayout,key:String,value:String="",secret:Boolean=false,multiline:Boolean=false):EditText {
        val label=text(t(key));val input=EditText(activity).apply{setText(value);textSize=16f;typeface=body;setTextColor(ink);setHintTextColor(muted);minHeight=dp(48);setPadding(dp(8),dp(8),dp(8),dp(8));background=focusBorder();id=fieldIds.getOrPut(key){View.generateViewId()};contentDescription=t(key);inputType=if(secret)129 else if(multiline)131073 else 1;isSaveEnabled=!secret;importantForAutofill=View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS;setSelectAllOnFocus(false)}
        label.labelFor=input.id;parent.addView(label);parent.addView(input);return input
    }
    fun choice(parent:LinearLayout,key:String,items:List<Pair<String,String>>,selected:String,onChange:(String)->Unit):Spinner {
        val label=text(t(key));val spinner=Spinner(activity).apply{id=View.generateViewId();minimumHeight=dp(48);contentDescription=t(key)};label.labelFor=spinner.id
        spinner.adapter=object:ArrayAdapter<String>(activity,android.R.layout.simple_spinner_item,items.map{it.second}) {
            init{setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)}
            override fun getView(position:Int,convertView:View?,parent:ViewGroup):View=(super.getView(position,convertView,parent) as TextView).apply{setTextColor(ink);textSize=16f;typeface=body;minHeight=dp(48)}
        };spinner.setSelection(items.indexOfFirst{it.first==selected}.coerceAtLeast(0));spinner.onItemSelectedListener=object:AdapterView.OnItemSelectedListener{override fun onNothingSelected(p:AdapterView<*>?){ };override fun onItemSelected(p:AdapterView<*>?,v:View?,position:Int,id:Long){onChange(items[position].first)}}
        parent.addView(label);parent.addView(spinner);return spinner
    }
    fun check(parent:LinearLayout,key:String,checked:Boolean):CheckBox=CheckBox(activity).apply{text=t(key);textSize=16f;typeface=body;setTextColor(ink);minHeight=dp(48);minimumWidth=dp(48);isChecked=checked;contentDescription=t(key);parent.addView(this)}
    fun message(value:String)=text(value,14f).apply{setTextColor(muted);accessibilityLiveRegion=View.ACCESSIBILITY_LIVE_REGION_POLITE}
    fun configureWindow(){activity.window.statusBarColor=bg;activity.window.navigationBarColor=bg;activity.window.decorView.systemUiVisibility=if(dark)0 else View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR}
}
class Row(val anchor:String?=null,val create:()->View)
class RowsAdapter(private val rows:List<Row>):BaseAdapter(){
    override fun getCount()=rows.size
    override fun getItem(position:Int)=rows[position]
    override fun getItemId(position:Int)=position.toLong()
    override fun getView(position:Int,convertView:View?,parent:ViewGroup):View {
        val row=rows[position];if(convertView?.tag===row)return convertView
        return row.create().apply{tag=row}
    }
}

class AccessibleBox(context:Context):LinearLayout(context){override fun performClick():Boolean=super.performClick()}
class FeedbackScroll(context:Context):ScrollView(context){override fun onMeasure(width:Int,height:Int){val cap=resources.displayMetrics.heightPixels/3;super.onMeasure(width,View.MeasureSpec.makeMeasureSpec(if(View.MeasureSpec.getMode(height)==View.MeasureSpec.UNSPECIFIED)cap else kotlin.math.min(cap,View.MeasureSpec.getSize(height)),View.MeasureSpec.AT_MOST))}}
