export const kotlinSdk = `package sdk

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse.BodyHandlers

@Serializable
data class JsonRpcRequest(
    val jsonrpc: String,
    val id: Int,
    val method: String,
    val params: List<JsonElement>?,
)

@Serializable
data class JsonRpcResult(
    val jsonrpc: String,
    val id: Int,
    val result: JsonElement,
)

@Serializable
data class JsonRpcError(
    val jsonrpc: String,
    val id: Int,
    val result: JsonElement,
)

class Remote(private val url: URI){
    val json = Json { ignoreUnknownKeys = true } 
    fun makeRequest(method : String, args : List<JsonElement>): JsonElement {
        val body = JsonRpcRequest(
            jsonrpc = "2.0",
            id = 1,
            method= method,
            params = args
        )

        val body_str = json.encodeToString(body)
        val client = HttpClient.newBuilder().build()
        val request = HttpRequest.newBuilder().uri(url)
            .POST(HttpRequest.BodyPublishers.ofString(body_str))
            .setHeader("Content-Type", "application/json")
            .build()

        val response = client.send(request, BodyHandlers.ofString())
        return json.decodeFromString<JsonRpcResult>(response.body()).result

    }
}
`