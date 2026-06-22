package `in`.juspay.bbpssdkreact

import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import `in`.org.npci.bbps.BBPSService
import `in`.org.npci.bbps.BBPSAgentInterface
import org.json.JSONArray
import org.json.JSONObject

/**
 * BBPS React Native bridge module.
 *
 * Mirrors hyper-sdk-react pattern:
 * - Uses RCTDeviceEventEmitter with retry if bridge not ready
 * - Emits JSON strings (compatible with both legacy and Bridgeless)
 */
class BbpsSdkReactModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), BBPSAgentInterface {

    private var bbpsService: BBPSService? = null

    companion object {
        private const val TAG = "BBPS_RN"
        private const val EVENT_NAME = "BBPS_EVENT"
    }

    override fun getName(): String = "BbpsSdkReact"

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    // region BBPSAgentInterface callbacks

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

    // endregion

    // Buffer for events when JS isn't ready to receive them
    private val eventQueue = mutableListOf<JSONObject>()
    private var eventPromise: Promise? = null

    /**
     * Bridgeless-safe event delivery using Promise-based polling.
     * Events are queued and delivered via waitForEvent() Promise.
     */
    private fun sendEventToJS(data: JSONObject) {
        synchronized(eventQueue) {
            eventPromise?.let { promise ->
                try {
                    promise.resolve(data.toString())
                    eventPromise = null
                    return
                } catch (e: Exception) {
                    // Promise already resolved/rejected; fall through to queue
                }
            }
            eventQueue.add(data)
        }
    }

    @ReactMethod
    fun waitForEvent(promise: Promise) {
        synchronized(eventQueue) {
            if (eventQueue.isNotEmpty()) {
                val event = eventQueue.removeAt(0)
                promise.resolve(event.toString())
            } else {
                eventPromise = promise
            }
        }
    }

    private fun getJSModule(): DeviceEventManagerModule.RCTDeviceEventEmitter? {
        return try {
            reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get RCTDeviceEventEmitter", e)
            null
        }
    }

    // region Public API

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
        // Deprecated
    }

    @ReactMethod
    fun testEmit(promise: Promise) {
        try {
            val testData = JSONObject().apply {
                put("event", "test_emit")
                put("payload", JSONObject().apply {
                    put("message", "hello_from_testEmit")
                })
            }
            sendEventToJS(testData)
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

    // endregion

    // region JSON Helpers

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

    // endregion
}
