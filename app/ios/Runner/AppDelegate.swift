import Flutter
import UIKit
import FirebaseCore
import FirebaseMessaging
import home_widget

final class StatusBarFlutterViewController: FlutterViewController {
  private var isDarkTheme = false

  func updateStatusBar(isDark: Bool) {
    isDarkTheme = isDark
    setNeedsStatusBarAppearanceUpdate()
  }

  override var preferredStatusBarStyle: UIStatusBarStyle {
    if #available(iOS 13.0, *) {
      return isDarkTheme ? .lightContent : .darkContent
    }
    return isDarkTheme ? .lightContent : .default
  }
}

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var deepLinkChannel: FlutterMethodChannel?
  private var pendingDeepLink: [String: Any]?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()

    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
    }

    application.registerForRemoteNotifications()

    if #available(iOS 17, *) {
      HomeWidgetBackgroundWorker.setPluginRegistrantCallback { registry in
        GeneratedPluginRegistrant.register(with: registry)
      }
    }

    GeneratedPluginRegistrant.register(with: self)

    let controller = window?.rootViewController as! StatusBarFlutterViewController

    let systemUiChannel = FlutterMethodChannel(
      name: "com.bookgolas.app/system_ui",
      binaryMessenger: controller.binaryMessenger
    )
    systemUiChannel.setMethodCallHandler { [weak self] call, result in
      guard call.method == "setStatusBarBrightness",
            let isDark = call.arguments as? Bool else {
        result(FlutterMethodNotImplemented)
        return
      }

      if #available(iOS 13.0, *) {
        self?.window?.overrideUserInterfaceStyle = isDark ? .dark : .light
      }
      controller.updateStatusBar(isDark: isDark)
      result(nil)
    }

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
    deepLinkChannel?.setMethodCallHandler { [weak self] call, result in
      switch call.method {
      case "consumePendingDeepLink":
        result(self?.pendingDeepLink)
      case "acknowledgeDeepLink":
        guard let payload = call.arguments as? [String: Any],
              let urlString = payload["url"] as? String,
              let useReplacement = payload["useReplacement"] as? Bool else {
          result(FlutterError(code: "INVALID_ARGUMENT", message: "Deep link payload is required", details: nil))
          return
        }
        if self?.pendingDeepLink?["url"] as? String == urlString,
           self?.pendingDeepLink?["useReplacement"] as? Bool == useReplacement {
          self?.pendingDeepLink = nil
        }
        result(nil)
      default:
        result(FlutterMethodNotImplemented)
      }
    }

    let didFinish = super.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )

    if let url = launchOptions?[.url] as? URL, url.scheme == "bookgolas" {
      sendDeepLink(url.absoluteString, useReplacement: isHomeWidgetURL(url))
    }

    if let shortcutItem = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem,
       let urlString = deepLinkURL(for: shortcutItem) {
      sendDeepLink(urlString, useReplacement: true)
      return false
    }

    return didFinish
  }

  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    if url.scheme == "bookgolas" {
      sendDeepLink(url.absoluteString, useReplacement: isHomeWidgetURL(url))
      return true
    }
    return super.application(app, open: url, options: options)
  }

  override func application(
    _ application: UIApplication,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    guard let urlString = deepLinkURL(for: shortcutItem) else {
      completionHandler(false)
      return
    }
    sendDeepLink(urlString, useReplacement: true)
    completionHandler(true)
  }

  private func sendDeepLink(_ urlString: String, useReplacement: Bool) {
    let payload: [String: Any] = [
      "url": urlString,
      "useReplacement": useReplacement
    ]
    pendingDeepLink = payload
    deepLinkChannel?.invokeMethod("onDeepLink", arguments: payload)
  }

  private func isHomeWidgetURL(_ url: URL) -> Bool {
    URLComponents(url: url, resolvingAgainstBaseURL: false)?
      .queryItems?
      .contains(where: { $0.name == "homeWidget" && $0.value?.lowercased() == "true" }) == true
  }

  private func deepLinkURL(for shortcutItem: UIApplicationShortcutItem) -> String? {
    switch shortcutItem.type {
    case "com.bookgolas.continue-reading":
      return "bookgolas://book/detail/current"
    case "com.bookgolas.scan-page":
      return "bookgolas://book/scan/current"
    case "com.bookgolas.add-book":
      return "bookgolas://book/search"
    default:
      return nil
    }
  }
}
