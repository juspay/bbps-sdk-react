package com.bbpssdkreact

import android.util.Log
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*
import `in`.org.npci.bbps.BBPSService
import `in`.org.npci.bbps.BBPSAgentInterface
import org.json.JSONArray
import org.json.JSONObject

class BbpsSdkReactModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), BBPSAgentInterface, LifecycleEventListener {

    private var bbpsService: BBPSService? = null
    private var eventCallback: Callback? = null

    init {
        reactContext.addLifecycleEventListener(this)
    }

    companion object {
        private const val TAG = "BBPS_RN"
    }

    override fun getName(): String = "BbpsSdkReact"

    override fun onHostResume() {}
    override fun onHostPause() {}
    override fun onHostDestroy() {}

    override fun initiate_result(payload: JSONObject) {
        sendEventToJS(payload)
    }

    override fun process_result(payload: JSONObject) {
        sendEventToJS(payload)
    }

    override fun do_payment(payload: JSONObject) {
        sendEventToJS(payload)
    }

    override fun refresh_auth(payload: JSONObject) {
        sendEventToJS(payload)
    }

    private fun sendEventToJS(nativeResponse: JSONObject) {
        val event = nativeResponse.optString("event", "UNKNOWN")
        val payload = nativeResponse.opt("payload") ?: JSONObject()
        val cb = eventCallback
        if (cb != null) {
            try {
                val wrapper = JSONObject()
                wrapper.put("event", event)
                wrapper.put("payload", payload)
                cb.invoke(jsonToWritableMap(wrapper))
            } catch (e: Exception) {
                Log.e(TAG, "Callback invoke failed", e)
            }
        } else {
            Log.w(TAG, "No event callback registered, dropping event: $event")
        }
    }

    private fun jsonToWritableMap(json: JSONObject): WritableMap {
        val map = Arguments.createMap()
        val keys = json.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            when (val value = json.get(key)) {
                is String -> map.putString(key, value)
                is Boolean -> map.putBoolean(key, value)
                is Double -> map.putDouble(key, value)
                is Int -> map.putInt(key, value)
                is Long -> map.putDouble(key, value.toDouble())
                is JSONObject -> map.putMap(key, jsonToWritableMap(value))
                is JSONArray -> map.putArray(key, jsonToWritableArray(value))
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }

    private fun jsonToWritableArray(array: JSONArray): WritableArray {
        val writableArray = Arguments.createArray()
        for (i in 0 until array.length()) {
            when (val value = array.get(i)) {
                is String -> writableArray.pushString(value)
                is Boolean -> writableArray.pushBoolean(value)
                is Double -> writableArray.pushDouble(value)
                is Int -> writableArray.pushInt(value)
                is Long -> writableArray.pushDouble(value.toDouble())
                is JSONObject -> writableArray.pushMap(jsonToWritableMap(value))
                is JSONArray -> writableArray.pushArray(jsonToWritableArray(value))
                else -> writableArray.pushString(value.toString())
            }
        }
        return writableArray
    }

    @ReactMethod
    fun createService(clientId: String, promise: Promise) {
        try {
            bbpsService = BBPSService(reactApplicationContext, this, clientId)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CREATE_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun registerEventCallback(callback: Callback) {
        eventCallback = callback
    }

    @ReactMethod
    fun testEmit(promise: Promise) {
        try {
            val testMap = Arguments.createMap()
            testMap.putString("event", "test_emit")
            
            val payloadMap = Arguments.createMap()
            payloadMap.putString("message", "hello_from_testEmit")
            testMap.putMap("payload", payloadMap)

            eventCallback?.invoke(testMap)
            promise.resolve("test emit done")
        } catch (e: Exception) {
            promise.reject("TEST_EMIT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun initiate(payload: ReadableMap, promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity as? FragmentActivity
                ?: throw IllegalStateException("Could not get Fragment activity.")
            val service = bbpsService
                ?: throw IllegalStateException("Service not created. Call createService first.")
            service.initiate(activity, readableMapToJson(payload))
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("INITIATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun process(payload: ReadableMap, promise: Promise) {
        try {
            val service = bbpsService
                ?: throw IllegalStateException("Service not created. Call createService first.")
            service.process(readableMapToJson(payload))
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PROCESS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun onBackPressed(promise: Promise) {
        val handled = bbpsService?.onBackPressed() ?: false
        promise.resolve(handled)
    }

    @ReactMethod
    fun terminate() {
        bbpsService?.terminate()
        bbpsService = null
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun readableMapToJson(readableMap: ReadableMap): JSONObject {
        val json = JSONObject()
        val iterator = readableMap.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (readableMap.getType(key)) {
                ReadableType.Null -> json.put(key, JSONObject.NULL)
                ReadableType.Boolean -> json.put(key, readableMap.getBoolean(key))
                ReadableType.Number -> json.put(key, readableMap.getDouble(key))
                ReadableType.String -> json.put(key, readableMap.getString(key))
                ReadableType.Map -> json.put(key, readableMapToJson(readableMap.getMap(key)!!))
                ReadableType.Array -> json.put(key, readableArrayToJson(readableMap.getArray(key)!!))
            }
        }
        return json
    }

    private fun readableArrayToJson(readableArray: ReadableArray): JSONArray {
        val array = JSONArray()
        for (i in 0 until readableArray.size()) {
            when (readableArray.getType(i)) {
                ReadableType.Null -> array.put(JSONObject.NULL)
                ReadableType.Boolean -> array.put(readableArray.getBoolean(i))
                ReadableType.Number -> array.put(readableArray.getDouble(i))
                ReadableType.String -> array.put(readableArray.getString(i))
                ReadableType.Map -> array.put(readableMapToJson(readableArray.getMap(i)!!))
                ReadableType.Array -> array.put(readableArrayToJson(readableArray.getArray(i)!!))
            }
        }
        return array
    }
}
