import Foundation
import Vision

/**
 * On-device image classification via the Vision framework's built-in
 * classifier — no model download, no API key, no network at inference time.
 *
 * MVP tradeoff (interview material), the same one the Kotlin side carries:
 * `VNClassifyImageRequest` is a *general* taxonomy classifier with ~1300 labels,
 * not a food model. It happily returns "food", "cuisine" and "tableware"
 * alongside the dish, so the app ranks and filters client-side (see
 * `apps/mobile/src/lib/labels.ts`). Bundling a food-specific CoreML model would
 * remove the problem and is the roadmap's first item.
 *
 * Written in Swift and exposed to the TurboModule through ObjC interop, because
 * create-react-native-library 0.63 no longer ships a Swift TurboModule template
 * — the generated spec is ObjC, so `FoodClassifier.mm` is the shim over this.
 */
@objc(FoodClassifierImpl)
public final class FoodClassifierImpl: NSObject {

  /** Mirrors the TS spec: top 5, sorted by confidence descending. */
  private static let topK = 5
  /** Mirrors the TS spec: anything less confident than this is noise. */
  private static let confidenceFloor: Float = 0.1

  @objc public static let errorFileNotFound = "E_FILE_NOT_FOUND"
  @objc public static let errorClassificationFailed = "E_CLASSIFICATION_FAILED"

  /**
   * Resolves a `file://` URI (or a bare path) to something Vision can read.
   * react-native-image-picker hands us `file://…`, but a caller passing a plain
   * path should not be punished for it.
   */
  private static func fileURL(from uri: String) -> URL? {
    if let url = URL(string: uri), url.isFileURL {
      return url
    }
    // Not a URL, or a URL without a scheme — treat it as a filesystem path.
    return URL(fileURLWithPath: uri)
  }

  /**
   * Runs classification off the main thread and calls back with either results
   * or a coded failure. Exactly one of `results` / `code` is non-nil.
   */
  @objc(classifyWithURI:completion:)
  public static func classify(
    uri: String,
    completion: @escaping (_ results: [[String: Any]]?, _ code: String?, _ message: String?) -> Void
  ) {
    guard let url = fileURL(from: uri),
          FileManager.default.fileExists(atPath: url.path) else {
      completion(nil, errorFileNotFound, "No readable image file at \(uri)")
      return
    }

    // Vision is synchronous and CPU-bound; keep it off the UI thread. The
    // completion block is invoked on this background queue, and resolving a
    // TurboModule promise from a background thread is safe.
    DispatchQueue.global(qos: .userInitiated).async {
      let request = VNClassifyImageRequest()

      // Simulator only. There is no Neural Engine there, and Vision's default
      // device selection does not fall back on its own — it fails outright with
      // "Failed to create espresso context". Pinning to the CPU at least lets
      // the flow run while developing.
      //
      // Be warned that it runs, but does not work: the Simulator's classifier
      // returns labels unrelated to the image (a pizza comes back as
      // "outdoor / night sky / moon"). The same binary on the same file outside
      // the Simulator returns "pizza 85.3%", so this is an emulation gap, not a
      // bug here — iOS label quality can only be judged on a real device.
      //
      // Devices keep Vision's default selection, which is both correct and
      // faster than anything we would pin.
      #if targetEnvironment(simulator)
        if #available(iOS 17.0, *) {
          if let devices = try? request.supportedComputeStageDevices[.main],
             let cpu = devices.first(where: { device in
               if case .cpu = device { return true }
               return false
             }) {
            request.setComputeDevice(cpu, for: .main)
          }
        }
      #endif

      let handler = VNImageRequestHandler(url: url, options: [:])

      do {
        try handler.perform([request])
      } catch {
        completion(nil, errorClassificationFailed,
                   "Vision could not process the image: \(error.localizedDescription)")
        return
      }

      guard let observations = request.results else {
        completion(nil, errorClassificationFailed, "Vision returned no results")
        return
      }

      let results = observations
        .filter { $0.confidence >= confidenceFloor }
        .sorted { $0.confidence > $1.confidence }
        .prefix(topK)
        .map { observation -> [String: Any] in
          [
            // Vision identifiers are lowercase taxonomy slugs ("hot_dog"); the
            // underscores would otherwise reach the nutrition lookup verbatim.
            "label": observation.identifier.replacingOccurrences(of: "_", with: " "),
            "confidence": Double(observation.confidence),
          ]
        }

      completion(Array(results), nil, nil)
    }
  }

  /**
   * `VNClassifyImageRequest` has shipped with the OS since iOS 13 and the app's
   * deployment target is well past that, so there is nothing to probe: no model
   * download, no entitlement, no hardware requirement. Returning a constant is
   * the honest answer, and it mirrors the Kotlin side, which is `true` for the
   * same reason. The method exists so a future backend with real preconditions
   * (a bundled CoreML model, say) can answer meaningfully without a spec change.
   */
  @objc public static func isAvailable() -> Bool {
    return true
  }
}
