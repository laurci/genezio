export const template = `
/**
* KOTLIN 
* This is an auto generated code. This code should not be modified since the file can be overwriten
* if new genezio commands are executed.
*/
package {{packageName}}

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.JsonElement
import org.http4k.core.HttpHandler
import org.http4k.core.Method.OPTIONS
import org.http4k.core.Method.POST
import org.http4k.core.Request
import org.http4k.core.Response
import org.http4k.core.Status.Companion.OK
import org.http4k.core.then
import org.http4k.filter.AllowAll
import org.http4k.filter.CorsPolicy
import org.http4k.filter.OriginPolicy
import org.http4k.filter.ServerFilters
import org.http4k.routing.bind
import org.http4k.routing.routes
import org.http4k.server.SunHttp
import org.http4k.server.asServer
import kotlinx.serialization.json.jsonArray
import com.amazonaws.services.lambda.runtime.Context
import com.amazonaws.services.lambda.runtime.RequestHandler

@Serializable
data class JsonRpcRequest(
        val jsonrpc: String,
        val id: Int,
        val method: String,
        val params: List<JsonElement>?,
)

@Serializable
data class JsonRpcResponse(val jsonrpc: String, val id: Int, val result: String)

class LambdaHandler : RequestHandler<Map<String, Any>, String> { 
  override fun handleRequest(event: Map<String, Any>, context : Context): String {
      println(event)
      return processRequest(event)
  }
}

fun processRequestDirect(json_rpc : String): String {
  return processRequest(mapOf("body" to json_rpc))
}

fun processRequest(event: Map<String, Any>): String {
    println("PROCESSING REQ")
    // Get request body
    var request: JsonRpcRequest = JsonRpcRequest("", 2, "", listOf())
    var req_id = 0
    try {
        var eventBody = event["body"].toString().replace("\\\\", "")
        if(eventBody.get(0) != '"') {
          eventBody = "\\"" + eventBody + "\\""
        }
        request = Json.decodeFromString(eventBody.substring(1, eventBody.length - 1))
        req_id = request.id
    } catch (e: Exception) {
        println(e)
        return "{\\"jsonrpc\\":\\"2.0\\",\\"result\\":\\"There was a problem with the request format.\\",\\"id\\":\\"$req_id\\"}"
    }


    val method = request.method
    val params = request.params
    
    // Test if class is instantiable
    try {
        {{className}}()
        println("Class instantiable")
    } catch (e: Exception) {
        println(e)
        return "{\\"jsonrpc\\":\\"2.0\\",\\"result\\":\\"Class could not be instantiated. Check logs for more information.\\",\\"id\\":\\"$req_id\\"}"
    }

    when (method) {
        {{#jsonRpcMethods}}
        "{{className}}.{{name}}" -> {
            {{#parameters}}
            var param{{index}} = {{{cast}}}
            {{/parameters}}
            var func_res = {{className}}().{{name}}({{#parameters}}param{{index}}{{^last}},{{/last}}{{/parameters}});
            var res_str = Json.encodeToString(func_res)
            return "{\\"jsonrpc\\":\\"2.0\\",\\"result\\":$res_str,\\"id\\":\\"$req_id\\"}"
        }
        {{/jsonRpcMethods}}
        else -> {
            println("method not found")
            return "{\\"jsonrpc\\":\\"2.0\\",\\"result\\":\\"Method not found.\\",\\"id\\":\\"$req_id\\"}"
        }
    }
}

fun main(args: Array<String>) {
  var port: Int = 8080
  if (args.size == 1) {
    port = Integer.parseInt(args[0])
  }

  val router: HttpHandler =
      ServerFilters.Cors(
              CorsPolicy(
                  OriginPolicy.AllowAll(),
                  headers = listOf("accept", "authorization", "content-type"),
                  methods = listOf(POST,OPTIONS)
              )
          )
          .then(
              routes(
                  "/" bind
                      POST to { req: Request ->
                          val req_body = Json.parseToJsonElement(req.bodyString())
                          val rpc_req = req_body.jsonObject.toMap()
                          val response = processRequest(rpc_req)
                          var response_str = response.replace("\\\\", "")
                          println("ABOUT TO SEND: " + response_str)
                          Response(OK).body(response_str)
                      },
              )
          )

  println("Kotlin server running on port: $port")
  router.asServer(SunHttp(port)).start()
}
`;