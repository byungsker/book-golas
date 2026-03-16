import Flutter
import UIKit
import FirebaseCore
import FirebaseMessaging
import home_widget

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var deepLinkChannel: FlutterMethodChannel?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()

    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
      let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
      UNUserNotificationCenter.current().requestAuthorization(
        options: authOptions,
        completionHandler: { _, _ in }
      )
    } else {
      let settings: UIUserNotificationSettings =
        UIUserNotificationSettings(types: [.alert, .badge, .sound], categories: nil)
      application.registerUserNotificationSettings(settings)
    }

    application.registerForRemoteNotifications()

    if #available(iOS 17, *) {
      HomeWidgetBackgroundWorker.setPluginRegistrantCallback { registry in
        GeneratedPluginRegistrant.register(with: registry)
      }
    }

    GeneratedPluginRegistrant.register(with: self)

    let controller = window?.rootViewController as! FlutterViewController

    let appGroupChannel = FlutterMethodChannel(
      name: "com.bookgolas.app/app_group",
      binaryMessenger: controller.binaryMessenger
    )
    appGroupChannel.setMethodCallHandler { (call, result) in
      if call.method == "getAppGroupDirectory" {
        if let containerURL = FileManager.default.containerURL(
          forSecurityApplicationGroupIdentifier: "group.com.bookgolas.app"
        ) {
          result(containerURL.path)
        } else {
          result(FlutterError(code: "UNAVAILABLE", message: "App Group container not found", details: nil))
        }
      } else {
        result(FlutterMethodNotImplemented)
      }
    }

    deepLinkChannel = FlutterMethodChannel(
      name: "com.bookgolas.app/deep_link",
      binaryMessenger: controller.binaryMessenger
    )

    if let url = launchOptions?[.url] as? URL, url.scheme == "bookgolas" {
      deepLinkChannel?.invokeMethod("onDeepLink", arguments: url.absoluteString)
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    if url.scheme == "bookgolas" {
      deepLinkChannel?.invokeMethod("onDeepLink", arguments: url.absoluteString)
    }
    return super.application(app, open: url, options: options)
  }

  override func application(
    _ application: UIApplication,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    switch shortcutItem.type {
    case "com.bookgolas.continue-reading":
      deepLinkChannel?.invokeMethod("onDeepLink", arguments: "bookgolas://book/detail/current")
    case "com.bookgolas.scan-page":
      deepLinkChannel?.invokeMethod("onDeepLink", arguments: "bookgolas://book/scan/current")
    case "com.bookgolas.add-book":
      deepLinkChannel?.invokeMethod("onDeepLink", arguments: "bookgolas://book/search")
    default:
      break
    }
    completionHandler(true)
  }
}
