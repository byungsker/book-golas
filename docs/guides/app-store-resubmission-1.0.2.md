# Bookgolas iOS 1.0.2 App Review follow-up

Status: implementation and focused tests prepared; physical-device verification and App Store Connect updates are still pending.

## Review reference

- App: Bookgolas (`6757021809`)
- Review submission: [Apple review details](https://appstoreconnect.apple.com/apps/6757021809/distribution/reviewsubmissions/details/f209d38c-0885-4897-afb7-7a5e3f58cfdd)
- Rejected version/build: 1.0.2 / 17201
- Review date: August 29, 2026
- Review reported: ATT prompt not found on iOS/iPadOS 26.6; Sign in with Apple failed on iPhone 17 Pro Max and iPad Air 11-inch M3; 6.5-inch iPhone screenshots showed only login.

The rejection is historical evidence. It does not establish that each failure reproduces in the current 1.0.2 source.

## Code changes prepared

### App Tracking Transparency

The existing iOS target already has `NSUserTrackingUsageDescription`, the localized prompt text, and the permission-handler tracking macro. Before this change, first-run onboarding and age selection were behind authentication, while ATT was first requested during AdMob initialization after login. That made the prompt unreachable to a reviewer who could not sign in.

The updated first-run order is onboarding → age choice → ATT request for age 14+ → sign-in. Users under 14 do not receive the ATT request. Declining the prompt does not block onboarding or sign-in; ad initialization remains gated by the existing age, consent, and tracking checks. No privacy declarations were changed. Apple describes ATT as the system permission required before tracking across apps and websites: [User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/).

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

## App Store Connect metadata

The parent task verified that the live 1.0.1 listing has an empty Marketing URL in both `en-US` and `ko`, while the rejected 1.0.2 record has `https://book-golas.vercel.app` for both locales. Set that URL on the new version metadata in both locales before the next review submission. Metadata was not changed here.

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

## Remaining owner actions

- Run a fresh install on a physical iPhone running iOS 26.6 or the current supported iOS release and record launch → age choice → ATT prompt → subsequent flow.
- Exercise Apple sign-in on physical iPhone and iPad hardware, including a new Apple ID profile and a returning user if available.
- Capture the real core-feature screenshot set from an approved QA account.
- Set the Marketing URL in the new version’s English and Korean metadata.
- Attach the verified video/screenshots and complete the review reply placeholders.
- Submit the new version only after these checks and metadata updates are complete.

No App Store submission, binary upload, metadata mutation, paid agreement change, or provider/security-setting change was performed for this preparation work.
