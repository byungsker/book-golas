import WidgetKit
import SwiftUI
import AppIntents

#if canImport(UIKit)
import UIKit
#endif

// MARK: - Shared Constants

private let appGroupId = "group.com.bookgolas.app"

// MARK: - Data Model

struct BookWidgetEntry: TimelineEntry {
    let date: Date
    let bookId: String
    let bookTitle: String
    let bookAuthor: String
    let currentPage: Int
    let totalPages: Int
    let imagePath: String
    let bookStatus: String
    let isEmpty: Bool

    var progress: Double {
        guard totalPages > 0 else { return 0 }
        return Double(currentPage) / Double(totalPages)
    }

    var displayTitle: String {
        if let dashRange = bookTitle.range(of: " - ") {
            return String(bookTitle[bookTitle.startIndex..<dashRange.lowerBound])
        }
        if let dashRange = bookTitle.range(of: " : ") {
            return String(bookTitle[bookTitle.startIndex..<dashRange.lowerBound])
        }
        return bookTitle
    }

    static let placeholder = BookWidgetEntry(
        date: Date(),
        bookId: "",
        bookTitle: "Book Title",
        bookAuthor: "Author",
        currentPage: 42,
        totalPages: 100,
        imagePath: "",
        bookStatus: "reading",
        isEmpty: false
    )

    static let empty = BookWidgetEntry(
        date: Date(),
        bookId: "",
        bookTitle: "",
        bookAuthor: "",
        currentPage: 0,
        totalPages: 0,
        imagePath: "",
        bookStatus: "",
        isEmpty: true
    )
}

// MARK: - Book Entity for AppIntent Configuration

@available(iOS 17.0, macOS 14.0, watchOS 10.0, *)
struct BookEntity: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Book")
    static var defaultQuery = BookEntityQuery()

    var id: String
    var title: String
    var author: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(author)")
    }
}

@available(iOS 17.0, macOS 14.0, watchOS 10.0, *)
struct BookEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [BookEntity] {
        let allBooks = loadBookEntities()
        return allBooks.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [BookEntity] {
        return loadBookEntities()
    }

    func defaultResult() async -> BookEntity? {
        return loadBookEntities().first
    }

    private func loadBookEntities() -> [BookEntity] {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let jsonStr = defaults.string(forKey: "reading_books_json"),
              let data = jsonStr.data(using: .utf8),
              let books = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
        else { return [] }

        return books.compactMap { dict in
            guard let id = dict["id"] as? String, !id.isEmpty,
                  let title = dict["title"] as? String
            else { return nil }
            return BookEntity(
                id: id,
                title: title,
                author: dict["author"] as? String ?? ""
            )
        }
    }
}

@available(iOS 17.0, macOS 14.0, watchOS 10.0, *)
struct SelectBookIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Book"
    static var description: IntentDescription = "Choose which book to display"

    @Parameter(title: "Book")
    var book: BookEntity?
}

// MARK: - Configurable Timeline Provider (iOS 17+)

@available(iOS 17.0, *)
struct BookgolasConfigurableProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> BookWidgetEntry {
        BookWidgetEntry.placeholder
    }

    func snapshot(for configuration: SelectBookIntent, in context: Context) async -> BookWidgetEntry {
        return readEntry(for: configuration.book?.id)
    }

    func timeline(for configuration: SelectBookIntent, in context: Context) async -> Timeline<BookWidgetEntry> {
        let entry = readEntry(for: configuration.book?.id)
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func readEntry(for selectedBookId: String?) -> BookWidgetEntry {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            return BookWidgetEntry.empty
        }

        if let bookId = selectedBookId,
           let jsonStr = defaults.string(forKey: "reading_books_json"),
           let data = jsonStr.data(using: .utf8),
           let books = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
           let bookDict = books.first(where: { ($0["id"] as? String) == bookId }) {
            return BookWidgetEntry(
                date: Date(),
                bookId: bookDict["id"] as? String ?? "",
                bookTitle: bookDict["title"] as? String ?? "",
                bookAuthor: bookDict["author"] as? String ?? "",
                currentPage: bookDict["currentPage"] as? Int ?? 0,
                totalPages: bookDict["totalPages"] as? Int ?? 0,
                imagePath: bookDict["imagePath"] as? String ?? "",
                bookStatus: bookDict["status"] as? String ?? "reading",
                isEmpty: false
            )
        }

        let bookTitle = defaults.string(forKey: "book_title") ?? ""
        if bookTitle.isEmpty { return BookWidgetEntry.empty }

        return BookWidgetEntry(
            date: Date(),
            bookId: defaults.string(forKey: "book_id") ?? "",
            bookTitle: bookTitle,
            bookAuthor: defaults.string(forKey: "book_author") ?? "",
            currentPage: defaults.integer(forKey: "current_page"),
            totalPages: defaults.integer(forKey: "total_pages"),
            imagePath: defaults.string(forKey: "image_path") ?? "",
            bookStatus: defaults.string(forKey: "book_status") ?? "reading",
            isEmpty: false
        )
    }
}

// MARK: - Static Timeline Provider (Fallback)

struct BookgolasStaticProvider: TimelineProvider {
    func placeholder(in context: Context) -> BookWidgetEntry {
        BookWidgetEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (BookWidgetEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BookWidgetEntry>) -> Void) {
        let entry = readEntry()
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func readEntry() -> BookWidgetEntry {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            return BookWidgetEntry.empty
        }
        let bookTitle = defaults.string(forKey: "book_title") ?? ""
        if bookTitle.isEmpty { return BookWidgetEntry.empty }

        return BookWidgetEntry(
            date: Date(),
            bookId: defaults.string(forKey: "book_id") ?? "",
            bookTitle: bookTitle,
            bookAuthor: defaults.string(forKey: "book_author") ?? "",
            currentPage: defaults.integer(forKey: "current_page"),
            totalPages: defaults.integer(forKey: "total_pages"),
            imagePath: defaults.string(forKey: "image_path") ?? "",
            bookStatus: defaults.string(forKey: "book_status") ?? "reading",
            isEmpty: false
        )
    }
}

// MARK: - Cover Image Loader

struct CoverImageView: View {
    let imagePath: String
    let size: CGSize

    var body: some View {
        if let data = loadImageData(),
           let uiImage = UIImage(data: data) {
            Image(uiImage: uiImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: size.width, height: size.height)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        } else {
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.gray.opacity(0.2))
                .frame(width: size.width, height: size.height)
                .overlay(
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: min(size.width, size.height) * 0.4))
                        .foregroundColor(.gray.opacity(0.5))
                )
        }
    }

    private func loadImageData() -> Data? {
        guard !imagePath.isEmpty else { return nil }

        if let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) {
            let fileURL = containerURL.appendingPathComponent(imagePath)
            if let data = try? Data(contentsOf: fileURL) {
                return data
            }
        }

        let url = URL(fileURLWithPath: imagePath)
        if FileManager.default.fileExists(atPath: imagePath),
           let data = try? Data(contentsOf: url) {
            return data
        }

        return nil
    }
}

// MARK: - Linear Progress Bar

struct LinearProgressBar: View {
    let progress: Double
    var trackColor: Color = Color(red: 0.165, green: 0.165, blue: 0.227)
    var fillColor: Color = Color(red: 0.357, green: 0.498, blue: 1.0)

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(trackColor)
                    .frame(height: 5)
                RoundedRectangle(cornerRadius: 3)
                    .fill(fillColor)
                    .frame(width: geometry.size.width * CGFloat(min(progress, 1.0)), height: 5)
            }
        }
        .frame(height: 5)
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let isSmall: Bool

    var body: some View {
        VStack(spacing: isSmall ? 6 : 8) {
            Image(systemName: "book.closed")
                .font(.system(size: isSmall ? 28 : 32))
                .foregroundColor(.gray.opacity(0.5))
            Text(NSLocalizedString("widget_empty_title", tableName: nil, bundle: .main, value: "Add a book", comment: ""))
                .font(.system(size: isSmall ? 11 : 13, weight: .medium))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }
}

// MARK: - Small Widget (Book Progress)

struct BookgolasSmallWidgetView: View {
    var entry: BookWidgetEntry

    var body: some View {
        if entry.isEmpty {
            EmptyStateView(isSmall: true)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .widgetURL(URL(string: "bookgolas://book/search"))
        } else {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    CoverImageView(
                        imagePath: entry.imagePath,
                        size: CGSize(width: 44, height: 62)
                    )
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.displayTitle)
                            .font(.system(size: 13, weight: .semibold))
                            .lineLimit(2)
                            .truncationMode(.tail)
                            .foregroundColor(.primary)
                        Text(entry.bookAuthor)
                            .font(.system(size: 10))
                            .lineLimit(1)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer(minLength: 4)

                Text("p.\(entry.currentPage) / \(entry.totalPages)")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundColor(.secondary)

                LinearProgressBar(progress: entry.progress)
                    .padding(.top, 4)
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(URL(string: "bookgolas://book/detail/\(entry.bookId)"))
        }
    }
}

// MARK: - Quick Action Small Widget

struct QuickActionSmallWidgetView: View {
    let actionType: String
    var entry: BookWidgetEntry

    var body: some View {
        let config = actionConfig
        if let url = config.url {
            Link(destination: url) {
                VStack(spacing: 8) {
                    Image(systemName: config.icon)
                        .font(.system(size: 28, weight: .medium))
                        .foregroundColor(.accentColor)
                    Text(config.label)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.primary)
                    if !config.subtitle.isEmpty {
                        Text(config.subtitle)
                            .font(.system(size: 10))
                            .lineLimit(1)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    private var actionConfig: (icon: String, label: String, subtitle: String, url: URL?) {
        switch actionType {
        case "book":
            return (
                "book.fill",
                NSLocalizedString("widget_action_open_book", tableName: nil, bundle: .main, value: "Continue Reading", comment: ""),
                entry.isEmpty ? "" : entry.displayTitle,
                entry.isEmpty ? nil : URL(string: "bookgolas://book/detail/\(entry.bookId)")
            )
        case "scan":
            return (
                "doc.viewfinder",
                NSLocalizedString("widget_action_scan_page", tableName: nil, bundle: .main, value: "Scan Page", comment: ""),
                entry.isEmpty ? "" : entry.displayTitle,
                entry.isEmpty ? nil : URL(string: "bookgolas://book/scan/\(entry.bookId)")
            )
        case "add":
            return (
                "plus.circle",
                NSLocalizedString("widget_action_add_book", tableName: nil, bundle: .main, value: "Add Book", comment: ""),
                "",
                URL(string: "bookgolas://book/search")
            )
        default:
            return ("book.fill", "Book", "", nil)
        }
    }
}

// MARK: - Medium Widget (Redesigned: Info + Linear Progress)

struct BookgolasMediumWidgetView: View {
    var entry: BookWidgetEntry

    var body: some View {
        if entry.isEmpty {
            EmptyStateView(isSmall: false)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .widgetURL(URL(string: "bookgolas://book/search"))
        } else {
            ZStack(alignment: .bottom) {
                HStack(spacing: 12) {
                    CoverImageView(
                        imagePath: entry.imagePath,
                        size: CGSize(width: 95, height: 132)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 11))

                    VStack(alignment: .leading, spacing: 0) {
                        Text(entry.displayTitle)
                            .font(.system(size: 18, weight: .bold))
                            .lineLimit(2)
                            .truncationMode(.tail)
                            .foregroundColor(.white)

                        Text(entry.bookAuthor)
                            .font(.system(size: 11))
                            .lineLimit(1)
                            .foregroundColor(Color(red: 0.596, green: 0.596, blue: 0.627))
                            .padding(.top, 2)

                        Spacer(minLength: 4)

                        HStack {
                            Text("p.\(entry.currentPage) / \(entry.totalPages)")
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(Color(red: 0.596, green: 0.596, blue: 0.627))
                            Spacer()
                            Text("\(Int(entry.progress * 100))%")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundColor(Color(red: 0.357, green: 0.498, blue: 1.0))
                        }

                        LinearProgressBar(progress: entry.progress)
                            .padding(.top, 4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Divider()
                        .frame(height: 132)
                        .overlay(Color(red: 0.161, green: 0.161, blue: 0.161))

                    VStack(spacing: 10) {
                        QuickActionButton(
                            systemImage: "book.fill",
                            label: NSLocalizedString("widget_action_book", tableName: nil, bundle: .main, value: "Book", comment: ""),
                            url: URL(string: "bookgolas://book/detail/\(entry.bookId)")
                        )
                        QuickActionButton(
                            systemImage: "doc.viewfinder",
                            label: NSLocalizedString("widget_action_scan", tableName: nil, bundle: .main, value: "Scan", comment: ""),
                            url: URL(string: "bookgolas://book/scan/\(entry.bookId)")
                        )
                        QuickActionButton(
                            systemImage: "plus.circle",
                            label: NSLocalizedString("widget_action_add", tableName: nil, bundle: .main, value: "Add", comment: ""),
                            url: URL(string: "bookgolas://book/search")
                        )
                    }
                    .frame(width: 52)
                }
                .padding(.horizontal, 14)
                .padding(.top, 10)
                .padding(.bottom, 24)

                Text(NSLocalizedString("widget_app_name", tableName: nil, bundle: .main, value: "Bookgolas", comment: ""))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.bottom, 6)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let systemImage: String
    let label: String
    let url: URL?

    var body: some View {
        if let url = url {
            Link(destination: url) {
                VStack(spacing: 2) {
                    Image(systemName: systemImage)
                        .font(.system(size: 16))
                        .foregroundColor(Color(red: 0.357, green: 0.498, blue: 1.0))
                    Text(label)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(Color(red: 0.357, green: 0.498, blue: 1.0))
                }
                .frame(maxWidth: .infinity, minHeight: 36)
            }
        }
    }
}

// MARK: - Widget Entry Views with Container Background

struct BookgolasSmallEntryView: View {
    var entry: BookWidgetEntry

    var body: some View {
        BookgolasSmallWidgetView(entry: entry)
            .containerBackground(.fill.tertiary, for: .widget)
    }
}

struct BookgolasMediumEntryView: View {
    var entry: BookWidgetEntry

    var body: some View {
        BookgolasMediumWidgetView(entry: entry)
            .containerBackground(for: .widget) {
                ContainerRelativeShape()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.208, green: 0.208, blue: 0.208),
                                Color.black
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
    }
}

struct QuickActionSmallEntryView: View {
    let actionType: String
    var entry: BookWidgetEntry

    var body: some View {
        QuickActionSmallWidgetView(actionType: actionType, entry: entry)
            .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Widget Definitions

@available(iOS 17.0, *)
struct BookgolasSmallWidget: Widget {
    let kind: String = "BookgolasSmallWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectBookIntent.self, provider: BookgolasConfigurableProvider()) { entry in
            BookgolasSmallEntryView(entry: entry)
        }
        .configurationDisplayName("Bookgolas")
        .description(NSLocalizedString("widget_desc_small", tableName: nil, bundle: .main, value: "Reading progress at a glance", comment: ""))
        .supportedFamilies([.systemSmall])
    }
}

@available(iOS 17.0, *)
struct BookgolasMediumWidget: Widget {
    let kind: String = "BookgolasMediumWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectBookIntent.self, provider: BookgolasConfigurableProvider()) { entry in
            BookgolasMediumEntryView(entry: entry)
        }
        .configurationDisplayName("Bookgolas")
        .description(NSLocalizedString("widget_desc_medium", tableName: nil, bundle: .main, value: "Book info with quick actions", comment: ""))
        .supportedFamilies([.systemMedium])
    }
}

@available(iOS 17.0, *)
struct BookgolasQuickActionWidget: Widget {
    let kind: String = "BookgolasQuickActionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BookgolasStaticProvider()) { entry in
            QuickActionSmallEntryView(actionType: "add", entry: entry)
        }
        .configurationDisplayName(NSLocalizedString("widget_quick_action_title", tableName: nil, bundle: .main, value: "Quick Action", comment: ""))
        .description(NSLocalizedString("widget_quick_action_desc", tableName: nil, bundle: .main, value: "Quick access to book actions", comment: ""))
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Lock Screen Widgets (Accessory)

@available(iOSApplicationExtension 16.0, *)
struct BookgolasLockScreenCircularView: View {
    var entry: BookWidgetEntry

    var body: some View {
        if !entry.isEmpty {
            Gauge(value: entry.progress) {
                Image(systemName: "book.fill")
                    .font(.system(size: 10))
            } currentValueLabel: {
                Text("\(Int(entry.progress * 100))%")
                    .font(.system(size: 10, weight: .semibold))
            }
            .gaugeStyle(.accessoryCircular)
            .widgetURL(URL(string: "bookgolas://book/detail/\(entry.bookId)"))
        } else {
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "book.fill")
                    .font(.system(size: 16))
            }
        }
    }
}

@available(iOSApplicationExtension 16.0, *)
struct BookgolasLockScreenRectangularView: View {
    var entry: BookWidgetEntry

    var body: some View {
        if !entry.isEmpty {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.displayTitle)
                    .font(.system(size: 12, weight: .semibold))
                    .lineLimit(1)
                HStack(spacing: 4) {
                    Image(systemName: "book.fill")
                        .font(.system(size: 9))
                    Text("p.\(entry.currentPage)/\(entry.totalPages)")
                        .font(.system(size: 11))
                }
                .foregroundStyle(.secondary)
                Gauge(value: entry.progress) {
                    EmptyView()
                }
                .gaugeStyle(.accessoryLinear)
            }
            .widgetURL(URL(string: "bookgolas://book/detail/\(entry.bookId)"))
        } else {
            VStack(alignment: .leading, spacing: 2) {
                Text("Bookgolas")
                    .font(.system(size: 12, weight: .semibold))
                Text("No book in progress")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

@available(iOSApplicationExtension 16.0, *)
struct BookgolasLockScreenInlineView: View {
    var entry: BookWidgetEntry

    var body: some View {
        if !entry.isEmpty {
            let title = entry.displayTitle.count > 10
                ? String(entry.displayTitle.prefix(10)) + "..."
                : entry.displayTitle
            ViewThatFits {
                Label("\u{1F4D6} \(title) p.\(entry.currentPage)/\(entry.totalPages)", systemImage: "")
                Label("p.\(entry.currentPage)/\(entry.totalPages)", systemImage: "book.fill")
            }
            .widgetURL(URL(string: "bookgolas://book/detail/\(entry.bookId)"))
        } else {
            Label("Bookgolas", systemImage: "book.fill")
        }
    }
}

@available(iOSApplicationExtension 16.0, *)
struct BookgolasLockScreenCircularWidget: Widget {
    let kind: String = "BookgolasLockScreenCircular"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BookgolasStaticProvider()) { entry in
            BookgolasLockScreenCircularView(entry: entry)
        }
        .configurationDisplayName("Reading Progress")
        .description("Circular reading progress gauge")
        .supportedFamilies([.accessoryCircular])
    }
}

@available(iOSApplicationExtension 16.0, *)
struct BookgolasLockScreenRectangularWidget: Widget {
    let kind: String = "BookgolasLockScreenRectangular"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BookgolasStaticProvider()) { entry in
            BookgolasLockScreenRectangularView(entry: entry)
        }
        .configurationDisplayName("Reading Details")
        .description("Book title and reading progress")
        .supportedFamilies([.accessoryRectangular])
    }
}

@available(iOSApplicationExtension 16.0, *)
struct BookgolasLockScreenInlineWidget: Widget {
    let kind: String = "BookgolasLockScreenInline"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BookgolasStaticProvider()) { entry in
            BookgolasLockScreenInlineView(entry: entry)
        }
        .configurationDisplayName("Reading Inline")
        .description("Inline reading progress text")
        .supportedFamilies([.accessoryInline])
    }
}
