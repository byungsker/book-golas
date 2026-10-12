# Bookgolas iOS 1.0.2 App Review follow-up

Status: review fixes and focused tests are prepared; the iOS minimum is consistently set to 15.0 with owner approval. Both RevenueCat Flutter plugins are pinned to 10.2.3 and resolve native iOS SDK 5.78.0. An unsigned Xcode 27 arm64 simulator build compiled and launched to the missing-key guard because its placeholder was passed as an Xcode setting instead of a Flutter Dart define. A corrected Flutter simulator build passed a loopback-only Supabase URL and dummy key through `--dart-define`, but failed during Xcode linking with `No space left on device`; the first screen and ATT flow remain unverified. Android validation is blocked by the existing AndroidX dependency/toolchain mismatch. Physical-device verification and genuine App Store screenshots remain pending. The Marketing URL is already present on the rejected 1.0.2 metadata.

## Review reference

- App: Bookgolas (`6757021809`)
- Review submission: [Apple review details](https://appstoreconnect.apple.com/apps/6757021809/distribution/reviewsubmissions/details/f209d38c-0885-4897-afb7-7a5e3f58cfdd)
- Rejected version/build: 1.0.2 / 17201
- Review date: August 29, 2026
- Review reported: ATT prompt not found on iOS/iPadOS 26.6; Sign in with Apple failed on iPhone 17 Pro Max and iPad Air 11-inch M3; 6.5-inch iPhone screenshots showed only login.

The rejection is historical evidence. It does not establish that each failure reproduces in the current 1.0.2 source.

## Source baseline and simulator limits

- The active mobile line is `version/mobile/1.0.2`, based on `8b255d74945522ca9757f7aefc002f7481f05d80`. The source manifest is `1.0.2+15002`; the rejected App Store build was `17201`. Any future upload for this version must use a build number greater than `17201`. This task did not change the build number, sign, archive, or upload a binary.
- The Mac is Apple silicon on macOS Tahoe 26.6.2 with Xcode 27.0 (build 27A266a) as its only installed Xcode. Simulator profiles include iPhone 17 Pro Max and iPad Air 11-inch on iOS 26.5; no physical device is attached. The user approved keeping Xcode 27 and raising the app minimum to iOS 15.0. The 15.0 minimum is now consistent in the Podfile, app/test Xcode configurations, `AppFrameworkInfo.plist`, and Fastlane's post-archive plist fix. Existing widget targets at iOS 17.0 were preserved. No additional Xcode was installed and no global `xcode-select` setting was changed. See [Apple's Xcode SDK/system requirements](https://developer.apple.com/xcode/system-requirements/) and [current submission requirements](https://developer.apple.com/news/upcoming-requirements/).
- After upgrading the plugins, `pod update PurchasesHybridCommon PurchasesHybridCommonUI --repo-update` succeeded. `app/pubspec.lock` pins `purchases_flutter` and `purchases_ui_flutter` 10.2.3; `app/ios/Podfile.lock` resolves `PurchasesHybridCommon` and `PurchasesHybridCommonUI` 18.14.1 plus `RevenueCat` and `RevenueCatUI` 5.78.0. RevenueCat's [5.78.0 release](https://github.com/RevenueCat/purchases-ios/releases/tag/5.78.0) lists an Xcode 27 compilation fix.
- The unsigned Xcode 27 `dev` simulator build completed for arm64 with code signing disabled. The `Runner.app` was installed and launched on an iOS 26.5 iPhone 17 Pro Max simulator. It displayed the app's missing-configuration guard for `SUPABASE_ANON_KEY`: the local build supplied a dummy key as an Xcode setting, while the Dart code reads it through `String.fromEnvironment`. No real credential was used. This confirms compilation and process launch only; it did not exercise onboarding or ATT. A prior default-architecture attempt hit the Flutter engine script's architecture-list mismatch, so the successful build targeted Apple silicon (`ARCHS=arm64`). The Xcode build also warned that the widget extension's build number is `1` while the simulator app's is `15002`; the Fastlane archive lanes pass the Flutter build number to all targets. This is not physical-device or App Store validation.
- Android debug validation did not complete. The checked-in Android toolchain is AGP 8.1.0, Gradle 8.3, Kotlin 1.8.22, and compile SDK 35. The local Flutter 3.41 diagnostic first requested AGP 8.1.1; with that temporary diagnostic bump, `:app:checkDebugAarMetadata` reported AndroidX requirements for SDK 36/AGP 8.9.1 and SDK 37/AGP 9.1.0. The pub lock pins `mobile_scanner` 7.1.4 (its Android plugin sets compile SDK 36 and uses CameraX 1.5.1) and `image_picker_android` 0.8.13+10 (which depends on AndroidX Activity 1.11.0). It also pins `home_widget` 0.9.0, whose Android build declares Maven ranges `glance-appwidget:1.+` and `work-runtime-ktx:2.+`; the Gradle build resolved a Glance preview that requires SDK 37/AGP 9.1.0. The Dart pub lock does not lock those Maven versions. Upstream `home_widget` 0.9.2 added stable Android dependency pins and AGP 9 support, but that pin alone does not address the other locked plugins' SDK 36/AGP 8.9.1 requirements ([changelog](https://pub.dev/packages/home_widget/changelog), [pinning commit](https://github.com/ABausG/home_widget/commit/e42f1f7c)). The CI uses Flutter 3.35.0 stable and runs `pub get`/tests; it does not build an Android APK, so it provides no Android build validation. Conclusion: a `home_widget` pin alone cannot preserve the current AGP 8.1.0/SDK 35 toolchain. Aligning the broader Android dependencies and toolchain is a separate decision; no dependency override or Android toolchain change was made.
- Focused tests pass: `flutter test --no-pub test/data/services/subscription_service_test.dart test/data/services/ad_service_test.dart test/data/services/auth_service_test.dart` (13/13). Targeted analysis of the modified Dart files reports no issues. Full `flutter analyze --no-pub` completes with 115 informational lints in existing unrelated files.
- The repo has isolated synthetic fixtures in `app/test/helpers/test_helper.dart`. The BOK-389/BOK-392 integration tests create `Book` models in memory, use a loopback-only Supabase URL, and disable remote book loading. They can check individual screens without an auth account, role change, or real library data; they are not an end-to-end signed-in app and are not a substitute for physical review evidence. The corrected Flutter simulator build failed during Xcode linking for lack of disk space, so it produced no runnable bundle and no onboarding/ATT result.

## Code changes prepared

### App Tracking Transparency

The existing iOS target already has `NSUserTrackingUsageDescription`, the localized prompt text, and the permission-handler tracking macro. Before this change, first-run onboarding and age selection were behind authentication, while ATT was first requested during AdMob initialization after login. That made the prompt unreachable to a reviewer who could not sign in.

The updated first-run order is onboarding → age choice → ATT request for age 14+ → sign-in. Users under 14 do not receive the ATT request. Declining the prompt does not block onboarding or sign-in; ad initialization remains gated by the existing age, consent, and tracking checks. No privacy declarations were changed. Apple describes ATT as the system permission required before tracking across apps and websites: [User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/).

This changes prompt timing only; it does not claim that every app behavior is tracking or change the App Privacy answers. If the app does not track across other companies' apps or websites, the owner must make the App Privacy declarations accurate and should not rely on this prompt as a substitute. The code requests ATT only after a persisted 14-or-older choice; an unknown or under-14 status blocks the request and ads.

Focused tests cover age gating and coalescing concurrent ATT requests. These tests do not verify that iOS displays the system prompt on a physical device.

### Sign in with Apple

The current client uses Apple’s identity token and nonce flow with the Apple sign-in entitlement present. One post-authentication step wrote Apple’s optional name into the user profile; a database error from that optional write bubbled up and could be surfaced as a generic sign-in failure even after Supabase had accepted the Apple token.

The profile-name update is now best-effort and cannot turn an already successful token sign-in into a reported authentication failure. A unit test covers that error boundary. This is a concrete client-side failure path, but it does not establish the cause of the historical device failures. End-to-end Apple ID sign-in still needs to be exercised on physical iPhone and iPad hardware. If it still fails, inspect Apple/Supabase provider configuration and device logs with the app owner; no credentials or provider settings were changed here.

## Screenshot capture plan

No genuine App Store feature screenshots are present under `app/metadata`. Existing framed images elsewhere in the repository are design/mockup assets and are not suitable as App Store evidence. Capture real app screens from an authenticated QA account with representative data, then replace the 6.5-inch iPhone screenshot set in App Store Connect.

Suggested set:

1. Home reading tracker with at least one currently-reading book and visible progress.
2. My Library showing the reading states and saved books.
3. A reading chart with populated activity data.
4. A book detail or reading journal screen showing a real note/highlight workflow.

Use the app UI as rendered on the device: no device frames, composited system dialogs, altered content, or synthetic data represented as a real account. These images have not yet been captured because no physical device or approved QA account/data was available in this execution environment.

The repo's synthetic fixtures are suitable for isolated screen-layout tests only. No approved fixture-driven full-app route currently covers Home, Library, and Charts together, and no genuine 6.5-inch App Store screenshot set has been produced.

## App Store Connect metadata

The verified live 1.0.1 listing has an empty Marketing URL in `en-US` and `ko`. The rejected 1.0.2 record already has `https://book-golas.vercel.app` for both locales, so no Marketing URL edit is outstanding for resubmitting 1.0.2. Preserve that value on the version being resubmitted; copy it to a future version if one is created. No App Store Connect metadata was changed here.

## Review reply draft — do not send until placeholders are replaced

> Hello App Review Team,
>
> Thank you for the review. In this build, first-run setup now collects the age selection before sign-in and requests App Tracking Transparency for users aged 14 or older before authentication and ad initialization. Users can continue if they decline. We verified the fresh-install flow on **[device model and iOS version]**; the attached recording shows launch, age selection, the system ATT prompt, and the subsequent sign-in screen.
>
> We also made Apple profile-name synchronization non-blocking after successful Apple token authentication. We verified Sign in with Apple on **[iPhone model/iOS version and iPad model/iPadOS version]** using **[fresh and existing Apple ID account coverage]**.
>
> The updated 6.5-inch iPhone screenshots show **[name the actual screens attached]**. The Marketing URL is set to `https://book-golas.vercel.app` for the English and Korean localizations.
>
> **[Attach the physical-device recording and genuine App Store screenshots. Remove this note and complete every bracketed item before sending.]**
>
> Best regards,
> Bookgolas team

Do not state that ATT or Apple sign-in is verified until the physical-device checks pass. If Sign in with Apple still fails, replace the claim with the observed result and investigate the provider/backend path before replying.

## Physical-device recording procedure

Use the updated candidate built from this PR after it has been incorporated into the approved 1.0.2 release source. Do not use rejected build 17201; it predates these changes. The installed build must retain the production app identifier, `NSUserTrackingUsageDescription`, and Sign in with Apple capability. Before any new App Store/TestFlight upload, use the approved signing path and a build number greater than 17201.

1. On a dedicated QA iPhone running iOS 26.6 or the current supported iOS release, install the updated candidate. Use a clean test device or reset only its test tracking-permission state so Bookgolas is `notDetermined`; verify the system allows apps to request tracking. Do not reset or change settings on the owner's everyday device.
2. Start the native iOS screen recording before launching Bookgolas. Keep one continuous, unedited recording and show the device model/iOS version at the start if practical.
3. Launch Bookgolas, move through the intro pages, open the age-choice sheet, and select the 14-or-older option. Capture the native ATT alert before sign-in or ad initialization.
4. Choose one system option and keep recording through the subsequent login screen. For the deny path, show that onboarding continues. If both Allow and Ask App Not to Track paths are checked, reset the dedicated device's authorization state between runs and save each original recording.
5. Separately exercise Sign in with Apple on physical iPhone and iPad hardware using an existing, owner-approved QA Apple ID/account. Capture the native Apple sheet, successful return to Bookgolas, and the landing screen. Do not create an account, change roles, or use the reviewer credentials for this check. Exercise first-time and returning-user flows only if their QA identities already exist.
6. Capture the 6.5-inch screenshot set from the real app UI with an existing approved QA account that contains only approved synthetic demo books and reading activity. Include Home tracker, Library, populated chart, and one book/note detail screen. Export native, uncomposited screenshots at the size App Store Connect accepts for the 6.5-inch slot.

A simulator can help verify control ordering and render isolated fixture screens after storage space is available and the correct local Dart-define configuration is supplied. It cannot provide Apple's requested physical-device recording or prove Apple ID/provider sign-in on hardware.

## PR check diagnostics

The Vercel checks on this mobile PR fail before build with `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST`: `book-golas-admin` expects `apps/admin`, and `book-golas` expects `apps/client`. Those roots exist on `dev`, `main`, and `version/client/1.1.0`, but not on `version/mobile/1.0.2`, whose intended top-level app roots are `app/` and `web/`. This is consistent with the repository's multi-release layout and may be an expected preview failure for the mobile line; it is not evidence that the Vercel project settings are globally wrong. No Vercel setting was changed. These preview checks do not validate the iOS simulator build; use the current PR check status for their latest result.

## Remaining owner actions

- Incorporate this PR into the approved release source and create a candidate build greater than build 17201 using the authorized signing path.
- Resolve Android build validation in a separate change. The `home_widget` 0.9.2+1 pin is within the current `^0.9.0` constraint and addresses its dynamic Android dependencies, but it does not satisfy the other locked plugins' SDK 36/AGP 8.9.1 requirements. Align the Android dependency set, compile SDK, AGP, Gradle wrapper, and Flutter compatibility, then rerun the debug build; do not force unsupported transitive versions. The 10.2.3 RevenueCat change resolved and compiled on iOS.
- Record the physical ATT flow and test Apple sign-in on iPhone and iPad with an existing approved QA account.
- Capture genuine 6.5-inch screenshots using an approved QA account populated only with approved synthetic demo data.
- Attach the verified physical video/screenshots and complete every response placeholder. Keep the reply in draft until the evidence exists.
- Submit the new version only after these checks and any required metadata updates are complete.

No App Store submission, binary upload, metadata mutation, paid agreement change, or provider/security-setting change was performed for this preparation work.
