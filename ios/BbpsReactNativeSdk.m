#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import <objc/message.h>

@interface BbpsReactNativeSdk : RCTEventEmitter <RCTBridgeModule>
@property (nonatomic, strong) id bbpsService;
@property (nonatomic, copy) RCTResponseSenderBlock eventCallback;
@end

@implementation BbpsReactNativeSdk

RCT_EXPORT_MODULE(BbpsReactNativeSdk);

+ (BOOL)requiresMainQueueSetup { return YES; }

- (NSArray<NSString *> *)supportedEvents {
    return @[@"BBPS_EVENT"];
}

- (UIViewController *)topViewController {
    UIWindow *window = [[UIApplication sharedApplication] keyWindow];
    if (!window) window = [[[UIApplication sharedApplication] windows] firstObject];
    UIViewController *top = window.rootViewController;
    while (top.presentedViewController) top = top.presentedViewController;
    return top;
}

- (Class)bbpsServiceClass {
    return NSClassFromString(@"BBPSService");
}

- (void)rejectMissingSDK:(RCTPromiseRejectBlock)reject {
    reject(@"BBPS_SDK_MISSING",
           @"BBPSService class not found. Ensure BBPSSDK is linked via SPM.",
           nil);
}

RCT_EXPORT_METHOD(createService:(NSString *)clientId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        Class cls = [self bbpsServiceClass];
        if (!cls) { [self rejectMissingSDK:reject]; return; }

        id raw = [cls alloc];
        self.bbpsService = ((id (*)(id, SEL, NSString *))objc_msgSend)(raw,
                                                                        @selector(initWithClientId:),
                                                                        clientId);
        resolve(nil);
    });
}

RCT_EXPORT_METHOD(registerEventCallback:(RCTResponseSenderBlock)callback)
{
    self.eventCallback = callback;
}

RCT_EXPORT_METHOD(initiate:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        if (!self.bbpsService) {
            reject(@"INITIATE_ERROR", @"Service not created. Call createService first.", nil);
            return;
        }

        UIViewController *vc = [self topViewController];
        if (!vc) {
            reject(@"INITIATE_ERROR", @"No active UIViewController found.", nil);
            return;
        }

        __weak typeof(self) welf = self;
        id eventBlock = [^(NSDictionary *response) {
            __strong typeof(welf) self = welf;
            if (!self) return;
            if (self.eventCallback) {
                NSString *eventName = response[@"event"] ?: @"UNKNOWN";
                id payload = response[@"payload"] ?: @{};
                NSDictionary *wrapped = @{
                    @"event": eventName,
                    @"payload": payload
                };
                self.eventCallback(@[wrapped]);
            }
        } copy];

        ((void (*)(id, SEL, UIViewController *, NSDictionary *, id))
         objc_msgSend)(self.bbpsService,
                       @selector(initiate:payload:callback:),
                       vc,
                       payload,
                       eventBlock);

        resolve(nil);
    });
}

RCT_EXPORT_METHOD(process:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        if (!self.bbpsService) {
            reject(@"PROCESS_ERROR", @"Service not created. Call createService first.", nil);
            return;
        }

        SEL selSingle = @selector(process:);
        if ([self.bbpsService respondsToSelector:selSingle]) {
            ((void (*)(id, SEL, NSDictionary *))
             objc_msgSend)(self.bbpsService,
                           selSingle,
                           payload);
        } else {
            reject(@"PROCESS_ERROR", @"process: selector not found on BBPSService.", nil);
        }

        resolve(nil);
    });
}

RCT_EXPORT_METHOD(testEmit:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (self.eventCallback) {
        self.eventCallback(@[@{@"event": @"test_emit", @"payload": @{@"message": @"hello_from_ios"}}]);
        resolve(@"test emit done");
    } else {
        resolve(@"test emit done but no callback registered");
    }
}

RCT_EXPORT_METHOD(onBackPressed:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        UIViewController *top = [self topViewController];
        if (top) {
            [top dismissViewControllerAnimated:YES completion:^{ resolve(@(YES)); }];
        } else {
            resolve(@(NO));
        }
    });
}

RCT_EXPORT_METHOD(terminate) {
    dispatch_async(dispatch_get_main_queue(), ^{
        self.bbpsService = nil;
        self.eventCallback = nil;
    });
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {}
RCT_EXPORT_METHOD(removeListeners:(double)count) {}

@end
