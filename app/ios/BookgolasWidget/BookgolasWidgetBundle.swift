import WidgetKit
import SwiftUI

@main
struct BookgolasWidgetBundle: WidgetBundle {
    var body: some Widget {
        BookgolasSmallWidget()
        BookgolasMediumWidget()
        BookgolasQuickActionWidget()
        BookgolasLockScreenCircularWidget()
        BookgolasLockScreenRectangularWidget()
        BookgolasLockScreenInlineWidget()
    }
}
