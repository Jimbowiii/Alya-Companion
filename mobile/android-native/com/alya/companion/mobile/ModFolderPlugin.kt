package com.alya.companion.mobile

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import androidx.activity.result.ActivityResult
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.BufferedInputStream
import java.net.HttpURLConnection
import java.net.URL

@InvokeArg class TreeArgs { lateinit var treeUri: String }
@InvokeArg class CopyArgs { lateinit var treeUri: String; lateinit var sourceUri: String; lateinit var fallbackFileName: String }
@InvokeArg class DownloadArgs { lateinit var treeUri: String; lateinit var url: String; lateinit var fallbackFileName: String }
@InvokeArg class AssetArgs { lateinit var treeUri: String; lateinit var assetName: String; lateinit var fileName: String }

@TauriPlugin
class ModFolderPlugin(private val activity: Activity): Plugin(activity) {
  @Command fun pickFolder(invoke: Invoke) {
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
    }
    startActivityForResult(invoke, intent, "folderPicked")
  }

  @ActivityCallback private fun folderPicked(invoke: Invoke, result: ActivityResult) {
    val uri = result.data?.data
    if (result.resultCode != Activity.RESULT_OK || uri == null) { invoke.reject("Sélection annulée."); return }
    val flags = result.data?.flags?.and(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION) ?: (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    runCatching { activity.contentResolver.takePersistableUriPermission(uri, flags) }
    invoke.resolve(JSObject().apply { put("uri", uri.toString()) })
  }

  private fun rootDoc(tree: Uri): Uri = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))
  private fun children(tree: Uri): Uri = DocumentsContract.buildChildDocumentsUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))

  private fun findChild(tree: Uri, name: String): Uri? {
    activity.contentResolver.query(children(tree), arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)?.use { cursor ->
      val idIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
      val nameIndex = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
      while (cursor.moveToNext()) if (cursor.getString(nameIndex).equals(name, true)) return DocumentsContract.buildDocumentUriUsingTree(tree, cursor.getString(idIndex))
    }
    return null
  }

  private fun createOrReplace(tree: Uri, fileName: String): Uri {
    findChild(tree, fileName)?.let { runCatching { DocumentsContract.deleteDocument(activity.contentResolver, it) } }
    val mime = if (fileName.lowercase().endsWith(".zip")) "application/zip" else "application/octet-stream"
    return DocumentsContract.createDocument(activity.contentResolver, rootDoc(tree), mime, fileName) ?: throw IllegalStateException("Impossible de créer $fileName dans le dossier choisi.")
  }

  private fun copyStream(tree: Uri, fileName: String, input: java.io.InputStream): Long {
    val target = createOrReplace(tree, fileName)
    activity.contentResolver.openOutputStream(target, "w")!!.use { output -> input.use { return it.copyTo(output) } }
  }

  @Command fun listFolder(invoke: Invoke) {
    val args = invoke.parseArgs(TreeArgs::class.java)
    runCatching {
      val names = mutableListOf<String>()
      val tree = Uri.parse(args.treeUri)
      activity.contentResolver.query(children(tree), arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME), null, null, null)?.use { cursor ->
        val idx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
        while (cursor.moveToNext()) names.add(cursor.getString(idx))
      }
      JSObject().apply { put("files", names) }
    }.onSuccess { invoke.resolve(it) }.onFailure { invoke.reject(it.message ?: "Lecture dossier impossible") }
  }

  @Command fun copyToFolder(invoke: Invoke) {
    val args = invoke.parseArgs(CopyArgs::class.java)
    Thread {
      runCatching {
        val source = Uri.parse(args.sourceUri)
        var name = args.fallbackFileName
        activity.contentResolver.query(source, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) name = c.getString(0) ?: name }
        val input = activity.contentResolver.openInputStream(source) ?: error("Fichier source inaccessible")
        val bytes = copyStream(Uri.parse(args.treeUri), name, input)
        JSObject().apply { put("fileName", name); put("bytes", bytes) }
      }.onSuccess { invoke.resolve(it) }.onFailure { invoke.reject(it.message ?: "Import impossible") }
    }.start()
  }

  private fun htmlDecode(value: String) = value.replace("&amp;", "&").replace("&#39;", "'").replace("&quot;", "\"")

  private fun resolveUrl(raw: String): String {
    if (raw.contains("mega.nz/")) error("MEGA_BROWSER_REQUIRED")
    Regex("drive\\.google\\.com/file/d/([^/]+)").find(raw)?.groupValues?.get(1)?.let { return "https://drive.usercontent.google.com/download?id=$it&export=download&confirm=t" }
    if (!raw.contains("mediafire.com/")) return raw
    val connection = URL(raw).openConnection() as HttpURLConnection
    connection.instanceFollowRedirects = true; connection.connectTimeout = 20000; connection.readTimeout = 20000
    val html = connection.inputStream.bufferedReader().use { it.readText() }
    val patterns = listOf(
      Regex("href=\\\"([^\\\"]+)\\\"[^>]*id=\\\"downloadButton\\\"", RegexOption.IGNORE_CASE),
      Regex("id=\\\"downloadButton\\\"[^>]*href=\\\"([^\\\"]+)\\\"", RegexOption.IGNORE_CASE)
    )
    for (pattern in patterns) pattern.find(html)?.groupValues?.get(1)?.let { return htmlDecode(it) }
    error("Lien MediaFire direct introuvable")
  }

  private fun dispositionName(connection: HttpURLConnection, fallback: String): String {
    val cd = connection.getHeaderField("Content-Disposition") ?: return fallback
    Regex("filename\\*?=(?:UTF-8''|\\\")?([^\\\";]+)", RegexOption.IGNORE_CASE).find(cd)?.groupValues?.get(1)?.let { return Uri.decode(it).trim() }
    return fallback
  }

  @Command fun downloadToFolder(invoke: Invoke) {
    val args = invoke.parseArgs(DownloadArgs::class.java)
    Thread {
      runCatching {
        val direct = resolveUrl(args.url)
        val connection = URL(direct).openConnection() as HttpURLConnection
        connection.instanceFollowRedirects = true; connection.connectTimeout = 30000; connection.readTimeout = 120000
        connection.setRequestProperty("User-Agent", "Mozilla/5.0 ALYA-Companion-Mobile")
        connection.connect()
        if (connection.responseCode !in 200..299) error("Téléchargement HTTP ${connection.responseCode}")
        val name = dispositionName(connection, args.fallbackFileName)
        val bytes = copyStream(Uri.parse(args.treeUri), name, BufferedInputStream(connection.inputStream))
        JSObject().apply { put("fileName", name); put("bytes", bytes) }
      }.onSuccess { invoke.resolve(it) }.onFailure {
        if (it.message == "MEGA_BROWSER_REQUIRED") invoke.reject("MEGA_BROWSER_REQUIRED") else invoke.reject(it.message ?: "Téléchargement impossible")
      }
    }.start()
  }

  @Command fun installPackaged(invoke: Invoke) {
    val args = invoke.parseArgs(AssetArgs::class.java)
    Thread {
      runCatching {
        val bytes = copyStream(Uri.parse(args.treeUri), args.fileName, activity.assets.open("alya-mods/${args.assetName}"))
        JSObject().apply { put("fileName", args.fileName); put("bytes", bytes) }
      }.onSuccess { invoke.resolve(it) }.onFailure { invoke.reject(it.message ?: "Installation du mod ALYA impossible") }
    }.start()
  }
}


