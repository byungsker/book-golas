# Bookgolas iOS 1.0.2 App Review follow-up

Status: review fixes and focused tests are prepared; the iOS minimum is consistently set to 15.0 with owner approval. Both RevenueCat Flutter plugins are pinned to 10.2.3 and resolve native iOS SDK 5.78.0. The unsigned Xcode 27 arm64 simulator build succeeds, but the launch smoke check stops at the expected missing-key guard because the local build used placeholder configuration. Android validation is blocked by the existing AndroidX dependency/toolchain mismatch. Physical-device verification and genuine App Store screenshots remain pending. The Marketing URL is already present on the rejected 1.0.2 metadata.

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
- Android debug validation did not complete. Flutter first rejected the repository's AGP 8.1.0 as below its current 8.1.1 minimum. I tried AGP 8.1.1 for diagnosis, then reverted that local change after the next blocker proved to require a separate toolchain/dependency decision. With 8.1.1 the build failed at `:app:checkDebugAarMetadata`: the app compiles against SDK 35, while AndroidX artifacts require SDK 36 or 37 and AGP 8.9.1 or 9.1.0. The existing `home_widget` 0.9.0 Android plugin declares dynamic `androidx.glance:glance-appwidget:1.+` and `androidx.work:work-runtime-ktx:2.+` dependencies; Glance resolved to 1.3.0-alpha02, which requires SDK 37 and AGP 9.1.0. Flutter 3.41 also warns its Gradle/AGP/Kotlin compatibility window is moving forward. A separate retry with a clean temporary Gradle cache hit the host's low-disk limit; the subsequent attempt with the existing cache reached the AAR metadata failure. The Android build needs a separate dependency-pinning or toolchain-migration decision; this is not evidence of a RevenueCat API compile failure. The source AGP remains 8.1.0, and no Android targetSdk or minSdk change was made.
- Focused tests pass: `flutter test --no-pub test/data/services/subscription_service_test.dart test/data/services/ad_service_test.dart test/data/services/auth_service_test.dart` (13/13). Targeted analysis of the modified Dart files reports no issues. Full `flutter analyze --no-pub` completes with 115 informational lints in existing unrelated files.
- The repo has isolated synthetic fixtures in `app/test/helpers/test_helper.dart`. The BOK-389/BOK-392 integration tests create `Book` models in memory, use a loopback-only Supabase URL, and disable remote book loading. They can check individual screens without an auth account, role change, or real library data; they are not an end-to-end signed-in app and are not a substitute for physical review evidence. The RevenueCat compile error prevented running the app on a simulator here.

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

A simulator can help verify control ordering and render isolated fixture screens after the RevenueCat/Xcode compile issue is resolved. It cannot provide Apple's requested physical-device recording or prove Apple ID/provider sign-in on hardware.

## PR check diagnostics

The Vercel checks on this mobile PR fail before build with `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST`: `book-golas-admin` expects `apps/admin`, and `book-golas` expects `apps/client`. Those roots exist on `dev`, `main`, and `version/client/1.1.0`, but not on `version/mobile/1.0.2`, whose intended top-level app roots are `app/` and `web/`. This is consistent with the repository's multi-release layout and may be an expected preview failure for the mobile line; it is not evidence that the Vercel project settings are globally wrong. No Vercel setting was changed. These preview checks do not validate the iOS simulator build; use the current PR check status for their latest result.

## Remaining owner actions

- Incorporate this PR into the approved release source and create a candidate build greater than build 17201 using the authorized signing path.
- Resolve the Android debug-build dependency mismatch before claiming cross-platform build validation. Decide whether to pin the existing `home_widget` plugin's dynamic AndroidX dependencies to a compatible stable range or migrate the Android toolchain and Flutter Gradle integration to the versions required by SDK 37/AGP 9.1.0, then rerun the debug build. The 10.2.3 RevenueCat dependency change itself resolved and compiled on iOS.
- Record the physical ATT flow and test Apple sign-in on iPhone and iPad with an existing approved QA account.
- Capture genuine 6.5-inch screenshots using an approved QA account populated only with approved synthetic demo data.
- Attach the verified physical video/screenshots and complete every response placeholder. Keep the reply in draft until the evidence exists.
- Submit the new version only after these checks and any required metadata updates are complete.

No App Store submission, binary upload, metadata mutation, paid agreement change, or provider/security-setting change was performed for this preparation work.
