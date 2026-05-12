package com.example.curier_mobile.data.remote.realtime

import android.util.Log
import com.example.curier_mobile.data.local.preferences.ServerConfigManager
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.mapper.toDomainModel
import com.example.curier_mobile.data.remote.dto.OrderDto
import com.squareup.moshi.Moshi
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import org.json.JSONObject
import java.net.URI

/**
 * Менеджер Socket.IO подключения к namespace `/realtime` бэкенда.
 *
 * Конструируется как синглтон в [com.example.curier_mobile.core.di.NetworkModule]:
 * URL берётся из [ServerConfigManager], токен — из [TokenManager]. Реконнектами
 * занимается сам socket.io-client (auto-reconnect включён по умолчанию).
 *
 * События публикуются через [SharedFlow] с буфером в 16 элементов
 * (`DROP_OLDEST`), чтобы при медленной подписчике не теряться,
 * но и не блокировать сетевой поток.
 */
class RealtimeManager(
    private val serverConfigManager: ServerConfigManager,
    private val tokenManager: TokenManager,
    moshi: Moshi
) {

    private val orderDtoAdapter = moshi.adapter(OrderDto::class.java)

    private val _events = MutableSharedFlow<RealtimeEvent>(
        replay = 0,
        extraBufferCapacity = 16,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val events: SharedFlow<RealtimeEvent> = _events.asSharedFlow()

    private var socket: Socket? = null

    /**
     * Подключается, если URL и токен заданы. Идемпотентен — повторный
     * вызов с теми же параметрами ничего не делает; со сменой URL/токена
     * старое подключение закрывается перед открытием нового.
     */
    @Synchronized
    fun connect() {
        val baseUrl = serverConfigManager.getBaseUrl() ?: return
        val token = tokenManager.getAccessToken() ?: return

        if (socket?.connected() == true) {
            return
        }

        val rootUri = URI.create(baseUrl.trimEnd('/'))
        val options = IO.Options.builder()
            .setAuth(mapOf("token" to token))
            .setTransports(arrayOf("websocket"))
            .setReconnection(true)
            .build()

        val newSocket = IO.socket(URI.create("$rootUri/realtime"), options)
        newSocket.on(Socket.EVENT_CONNECT) {
            Log.d(TAG, "Realtime connected")
        }
        newSocket.on(Socket.EVENT_DISCONNECT) { args ->
            Log.d(TAG, "Realtime disconnected: ${args.firstOrNull()}")
        }
        newSocket.on(Socket.EVENT_CONNECT_ERROR) { args ->
            Log.w(TAG, "Realtime connect_error: ${args.firstOrNull()}")
        }

        newSocket.on(EVENT_ORDERS_NEW) { args ->
            parseOrder(args)?.let {
                _events.tryEmit(RealtimeEvent.OrderAssigned(it))
            }
        }
        newSocket.on(EVENT_ORDERS_REASSIGNED) { args ->
            parseOrder(args)?.let {
                _events.tryEmit(RealtimeEvent.OrderReassigned(it))
            }
        }

        socket?.disconnect()
        socket = newSocket
        newSocket.connect()
    }

    @Synchronized
    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
    }

    /**
     * Переподключиться с актуальным токеном — например, после
     * `auth/refresh`. Также вызывается после смены сервера.
     */
    @Synchronized
    fun reconnectWithCurrentCredentials() {
        disconnect()
        connect()
    }

    private fun parseOrder(args: Array<out Any?>): com.example.curier_mobile.domain.model.Order? {
        val raw = args.firstOrNull() as? JSONObject ?: return null
        return try {
            val dto = orderDtoAdapter.fromJson(raw.toString()) ?: return null
            dto.toDomainModel()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse order payload", e)
            null
        }
    }

    companion object {
        private const val TAG = "RealtimeManager"
        private const val EVENT_ORDERS_NEW = "orders:new"
        private const val EVENT_ORDERS_REASSIGNED = "orders:reassigned"
    }
}
