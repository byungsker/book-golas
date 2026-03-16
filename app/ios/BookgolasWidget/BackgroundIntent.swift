import AppIntents
import Foundation
import home_widget

@available(iOS 16, *)
public struct BackgroundIntent: AppIntent {
    static public var title: LocalizedStringResource = "Bookgolas Background Intent"

    @Parameter(title: "Widget URI")
    var url: URL?

    @Parameter(title: "AppGroup")
    var appGroup: String?

    public init() {}

    public init(url: URL?, appGroup: String?) {
        self.url = url
        self.appGroup = appGroup
    }

    public func perform() async throws -> some IntentResult {
        await HomeWidgetBackgroundWorker.run(url: url, appGroup: appGroup!)
        return .result()
    }
}
