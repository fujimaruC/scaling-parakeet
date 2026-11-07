package id.academicos.companion.ledger

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class StoreFailure(val code:String): Exception(code)
// Separate database and aliases. Never call Queue.resetAfterOwnerConfirmation from ledger logout/repair.
class PrivateStore(context:Context) {
    private val app=context.applicationContext
    private class Db(context:Context):SQLiteOpenHelper(context,"owner-ledger.db",null,1),AutoCloseable {
        override fun onCreate(db:SQLiteDatabase){db.execSQL("CREATE TABLE private_state(id TEXT PRIMARY KEY,payload BLOB NOT NULL)")}
        override fun onUpgrade(db:SQLiteDatabase,old:Int,next:Int){throw StoreFailure("UNSUPPORTED_LEDGER_SCHEMA")}
        override fun close(){super.close()}
    }
    private fun key(hasCiphertext:Boolean):SecretKey {
        val store=KeyStore.getInstance("AndroidKeyStore").apply {load(null)}
        val existing=store.getKey(ALIAS,null) as? SecretKey
        if(existing!=null)return existing
        if(hasCiphertext)throw StoreFailure("LEDGER_KEY_MISSING")
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build())
        }.generateKey()
    }
    fun read(id:String):JSONObject?=synchronized(LOCK){
        Db(app).use {helper->
            val db=helper.readableDatabase
            val any=db.rawQuery("SELECT EXISTS(SELECT 1 FROM private_state)",null).use {it.moveToFirst();it.getInt(0)==1}
            // Even reads of a missing row must not conceal key loss over other protected rows.
            val k=key(any)
            db.rawQuery("SELECT payload FROM private_state WHERE id=?",arrayOf(id)).use {row->
                if(!row.moveToFirst())return@synchronized null
                try {
                    val bytes=row.getBlob(0);if(bytes.size<28)throw StoreFailure("LEDGER_CIPHERTEXT_INVALID")
                    val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,k,GCMParameterSpec(128,bytes.copyOfRange(0,12)))
                    cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
                    JSONObject(String(cipher.doFinal(bytes.copyOfRange(12,bytes.size)),Charsets.UTF_8))
                }catch(e:StoreFailure){throw e}catch(_:Exception){throw StoreFailure("LEDGER_CIPHERTEXT_INVALID")}
            }
        }
    }
    fun update(values:Map<String,JSONObject?>)=synchronized(LOCK){
        Db(app).use {helper->
            val db=helper.writableDatabase
            val any=db.rawQuery("SELECT EXISTS(SELECT 1 FROM private_state)",null).use {it.moveToFirst();it.getInt(0)==1}
            val k=key(any);db.beginTransaction()
            try {
                for((id,value) in values) {
                    if(value==null)db.delete("private_state","id=?",arrayOf(id))
                    else {
                        val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,k);cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
                        val encrypted=cipher.iv+cipher.doFinal(value.toString().toByteArray(Charsets.UTF_8))
                        val row=ContentValues().apply{put("id",id);put("payload",encrypted)}
                        if(db.insertWithOnConflict("private_state",null,row,SQLiteDatabase.CONFLICT_REPLACE)<0)throw StoreFailure("LEDGER_STORAGE_FAILED")
                    }
                };db.setTransactionSuccessful()
            }finally{db.endTransaction()}
        }
    }
    fun clear()=synchronized(LOCK){
        // An explicit ledger-only reset works even when its old key is gone.
        Db(app).use {it.writableDatabase.delete("private_state",null,null)}
        val keys=KeyStore.getInstance("AndroidKeyStore").apply{load(null)};keys.deleteEntry(ALIAS)
    }
    companion object {private val LOCK=Any();private const val ALIAS="academic-os-owner-ledger-v1"}
}
