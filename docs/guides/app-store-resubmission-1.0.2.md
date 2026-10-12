# Bookgolas iOS 1.0.2 App Review follow-up

Status: implementation and focused tests prepared; physical-device verification and genuine App Store screenshots remain pending. The Marketing URL is already present on the rejected 1.0.2 metadata.

## Review reference

- App: Bookgolas (`6757021809`)
- Review submission: [Apple review details](https://appstoreconnect.apple.com/apps/6757021809/distribution/reviewsubmissions/details/f209d38c-0885-4897-afb7-7a5e3f58cfdd)
- Rejected version/build: 1.0.2 / 17201
- Review date: August 29, 2026
- Review reported: ATT prompt not found on iOS/iPadOS 26.6; Sign in with Apple failed on iPhone 17 Pro Max and iPad Air 11-inch M3; 6.5-inch iPhone screenshots showed only login.

The rejection is historical evidence. It does not establish that each failure reproduces in the current 1.0.2 source.

## Source baseline and simulator limits

- The active mobile line is `version/mobile/1.0.2`, based on `8b255d74945522ca9757f7aefc002f7481f05d80`. The source manifest is `1.0.2+15002`; the rejected App Store build was `17201`. Any future upload for this version must use a build number greater than `17201`. This task did not change the build number, sign, archive, or upload a binary.
- Xcode 27.0 and the XcodeBuildMCP simulator workflow are available. XcodeBuildMCP lists 12 iOS 26.5 simulators, including iPhone 17 Pro Max and iPad Air 11-inch; all were shut down. Physical-device workflow tools and an attached device were unavailable.
- A simulator build was attempted with the `dev` scheme and explicit loopback Supabase URL plus a dummy test key; no production credentials, account, or library data were used. The build stopped before launch because CocoaPods support files are absent. `pod install --deployment --no-repo-update` could not reach `https://cdn.cocoapods.org/` in this restricted environment. Xcode 27 also rejects the current iOS 14 deployment target because it supports targets 15.0 and later. No minimum-OS change was made because that would drop support for iOS 14 and needs an owner decision.
- The repo has isolated synthetic fixtures in `app/test/helpers/test_helper.dart`. The BOK-389/BOK-392 integration tests create `Book` models in memory, use a loopback-only Supabase URL, and disable remote book loading. These can check individual screens without an auth account, role change, or real library data; they are not an end-to-end signed-in app and are not a substitute for physical review evidence. The current Xcode simulator build blocker prevented running them on a simulator here.

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

A simulator can help verify control ordering and render isolated fixture screens once the CocoaPods/Xcode target issues are resolved. It cannot provide Apple's requested physical-device recording or prove Apple ID/provider sign-in on hardware.

## PR check diagnostics

At PR head `f4dce5b43fb253f3ee3c72d3aeae4af4850179e4`, CodeRabbit succeeded. Both Vercel preview checks failed before build with `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST`: `book-golas-admin` is configured to root `apps/admin`, and `book-golas` to root `apps/client`; neither directory exists in this repo (the mobile/web roots are `app/` and `web/`). These are existing Vercel project-root mismatches unrelated to the Flutter/docs-only PR. Their external Vercel settings were not changed here.

## Remaining owner actions

- Incorporate this PR into the approved release source and create a candidate build greater than build 17201 using the authorized signing path.
- Resolve CocoaPods availability and decide whether iOS 14 support should be raised to iOS 15 for Xcode 27 builds; do not change the minimum OS without that product decision.
- Record the physical ATT flow and test Apple sign-in on iPhone and iPad with an existing approved QA account.
- Capture genuine 6.5-inch screenshots using an approved QA account populated only with approved synthetic demo data.
- Attach the verified physical video/screenshots and complete every response placeholder. Keep the reply in draft until the evidence exists.
- Submit the new version only after these checks and any required metadata updates are complete.

No App Store submission, binary upload, metadata mutation, paid agreement change, or provider/security-setting change was performed for this preparation work.
