#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import <objc/message.h>

@interface BbpsSdkReact : RCTEventEmitter <RCTBridgeModule>
@property (nonatomic, strong) id bbpsService;
@end

@implementation BbpsSdkReact
{
    NSMutableArray *_eventQueue;
    RCTPromiseResolveBlock _waitingPromise;
}

RCT_EXPORT_MODULE(BbpsSdkReact);

+ (BOOL)requiresMainQueueSetup { return YES; }

- (instancetype)init {
    self = [super init];
    if (self) {
        _eventQueue = [NSMutableArray array];
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"BBPS_EVENT"];
}

- (void)emitEvent:(NSDictionary *)body {
    if (!body) return;
    NSString *eventName = body[@"event"] ?: @"UNKNOWN";
    
    // Deliver via RCTEventEmitter (works in Bridge mode)
    [self sendEventWithName:@"BBPS_EVENT" body:body];
    
    // Also buffer for polling (works in all modes including Bridgeless)
    @synchronized(_eventQueue) {
        if (_waitingPromise) {
            NSError *err;
            NSData *jsonData = [NSJSONSerialization dataWithJSONObject:body options:0 error:&err];
            NSString *jsonString = err ? @"{}" : [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
            _waitingPromise(jsonString);
            _waitingPromise = nil;
        } else {
            [_eventQueue addObject:body];
        }
    }
}

RCT_EXPORT_METHOD(waitForEvent:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    @synchronized(_eventQueue) {
        if (_eventQueue.count > 0) {
            NSDictionary *event = [_eventQueue firstObject];
            [_eventQueue removeObjectAtIndex:0];
            NSError *err;
            NSData *jsonData = [NSJSONSerialization dataWithJSONObject:event options:0 error:&err];
            NSString *jsonString = err ? @"{}" : [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
            resolve(jsonString);
        } else {
            _waitingPromise = resolve;
        }
    }
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
    // Deprecated: events now emitted via RCTEventEmitter sendEventWithName.
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
            NSString *eventName = response[@"event"] ?: @"UNKNOWN";
            id payload = response[@"payload"] ?: @{};
            NSDictionary *wrapped = @{
                @"event": eventName,
                @"payload": payload
            };
            [self emitEvent:wrapped];
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
    [self emitEvent:@{@"event": @"test_emit", @"payload": @{@"message": @"hello_from_ios"}}];
    resolve(@"test emit done");
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
    });
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {}
RCT_EXPORT_METHOD(removeListeners:(double)count) {}

@end
