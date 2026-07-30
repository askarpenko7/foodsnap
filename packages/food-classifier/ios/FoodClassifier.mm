#import "FoodClassifier.h"

// CocoaPods generates this header from the pod's Swift sources. It declares
// FoodClassifierImpl, where the Vision work lives — the codegen spec is ObjC,
// so this file is only the shim between the TurboModule and Swift.
#import "FoodClassifier-Swift.h"

/**
 * iOS classification (P3.1), backed by the Vision framework.
 *
 * The contract matches the Kotlin/ML Kit implementation exactly: top 5 by
 * confidence descending, anything below 0.1 dropped, and rejections carrying
 * `E_FILE_NOT_FOUND` or `E_CLASSIFICATION_FAILED` so the UI branches on the
 * failure rather than parsing a message.
 */
@implementation FoodClassifier

- (void)classifyImage:(NSString *)uri
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  // The Swift side dispatches Vision onto a background queue, so this returns
  // immediately and the promise settles from that queue — safe for a
  // TurboModule promise, and the same threading shape as the Kotlin side.
  [FoodClassifierImpl classifyWithURI:uri
                           completion:^(NSArray<NSDictionary<NSString *, id> *> *_Nullable results,
                                        NSString *_Nullable code,
                                        NSString *_Nullable message) {
    if (code != nil) {
      reject(code, message, nil);
      return;
    }
    resolve(results ?: @[]);
  }];
}

- (void)isAvailable:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  resolve(@([FoodClassifierImpl isAvailable]));
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeFoodClassifierSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"FoodClassifier";
}

@end
