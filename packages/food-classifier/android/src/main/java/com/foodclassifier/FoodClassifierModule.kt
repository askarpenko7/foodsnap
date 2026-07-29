package com.foodclassifier

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import java.io.File
import java.io.IOException

/**
 * On-device image classification via ML Kit Image Labeling (default on-device
 * model — no API key, no network calls at inference time).
 *
 * MVP tradeoff (interview material): the generic ML Kit labeler returns
 * non-food labels too ("Tableware", "Ingredient"); the app ranks/filters
 * client-side. Bundling a food-specific TFLite model is the roadmap item —
 * see README §roadmap. Same tradeoff applies to the iOS Vision classifier.
 *
 * Threading: ML Kit's Task API runs inference off the UI thread internally;
 * the success/failure listeners below fire on the main thread, and resolving
 * a TurboModule promise from there is safe.
 */
class FoodClassifierModule(reactContext: ReactApplicationContext) :
  NativeFoodClassifierSpec(reactContext) {

  override fun classifyImage(uri: String, promise: Promise) {
    val parsed = Uri.parse(uri)
    val path = parsed.path
    if (path == null || !File(path).exists()) {
      promise.reject("E_FILE_NOT_FOUND", "No readable image file at $uri")
      return
    }

    val image = try {
      InputImage.fromFilePath(reactApplicationContext, parsed)
    } catch (e: IOException) {
      promise.reject("E_CLASSIFICATION_FAILED", "Could not decode image at $uri", e)
      return
    }

    ImageLabeling.getClient(ImageLabelerOptions.DEFAULT_OPTIONS)
      .process(image)
      .addOnSuccessListener { labels ->
        val results = Arguments.createArray()
        labels
          .asSequence()
          .filter { it.confidence >= CONFIDENCE_FLOOR }
          .sortedByDescending { it.confidence }
          .take(TOP_K)
          .forEach { label ->
            val item = Arguments.createMap()
            item.putString("label", label.text)
            item.putDouble("confidence", label.confidence.toDouble())
            results.pushMap(item)
          }
        promise.resolve(results)
      }
      .addOnFailureListener { e ->
        promise.reject("E_CLASSIFICATION_FAILED", "ML Kit image labeling failed", e)
      }
  }

  override fun isAvailable(promise: Promise) {
    // The default on-device model ships with Google Play services and is
    // downloaded lazily on first use on the rare device that lacks it, so the
    // labeler is effectively always available on GMS devices. A pre-warm/
    // model-download check is a possible refinement, not MVP scope.
    promise.resolve(true)
  }

  companion object {
    const val NAME = NativeFoodClassifierSpec.NAME
    private const val TOP_K = 5
    private const val CONFIDENCE_FLOOR = 0.1f
  }
}
