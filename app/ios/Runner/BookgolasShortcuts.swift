import AppIntents
#if canImport(UIKit)
import UIKit
#endif

// MARK: - App Intents

@available(iOS 16.0, *)
struct ContinueReadingIntent: AppIntent {
    static var title: LocalizedStringResource = "Continue Reading"
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "bookgolas://book/detail/current") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct ScanPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Scan Page"
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "bookgolas://book/scan/current") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct AddBookIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Book"
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "bookgolas://book/search") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

// MARK: - App Shortcuts Provider

@available(iOS 16.0, *)
struct BookgolasShortcuts: AppShortcutsProvider {
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ContinueReadingIntent(),
            phrases: [
                "Continue reading in \(.applicationName)",
                "\(.applicationName)에서 이어서 읽기"
            ],
            shortTitle: "Continue Reading",
            systemImageName: "book.fill"
        )

        AppShortcut(
            intent: ScanPageIntent(),
            phrases: [
                "Scan a page in \(.applicationName)",
                "\(.applicationName)에서 페이지 스캔"
            ],
            shortTitle: "Scan Page",
            systemImageName: "doc.viewfinder"
        )

        AppShortcut(
            intent: AddBookIntent(),
            phrases: [
                "Add a book in \(.applicationName)",
                "\(.applicationName)에서 책 추가"
            ],
            shortTitle: "Add Book",
            systemImageName: "plus.circle"
        )
    }
}
