#import "FoodClassifier.h"

/**
 * iOS stub (P1.12): keeps the iOS target compiling against the codegen spec.
 * classifyImage rejects with E_CLASSIFICATION_FAILED; isAvailable returns NO.
 * The real Vision-framework implementation (`VNClassifyImageRequest`) is P3.1.
 */
@implementation FoodClassifier

- (void)classifyImage:(NSString *)uri
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  reject(@"E_CLASSIFICATION_FAILED",
         @"Food classification on iOS lands in Phase 3 (Vision framework)",
         nil);
}

- (void)isAvailable:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  resolve(@NO);
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
