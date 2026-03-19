// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'BookGolas';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonConfirm => 'OK';

  @override
  String get commonSave => 'Save';

  @override
  String get commonDelete => 'Delete';

  @override
  String get commonChange => 'Change';

  @override
  String get commonComplete => 'Done';

  @override
  String get commonClose => 'Close';

  @override
  String get commonRetry => 'Retry';

  @override
  String get commonNext => 'Next';

  @override
  String get commonSkip => 'Skip';

  @override
  String get commonStart => 'Get Started';

  @override
  String get navHome => 'Home';

  @override
  String get navLibrary => 'Library';

  @override
  String get navStats => 'Stats';

  @override
  String get navCalendar => 'Calendar';

  @override
  String booksCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count books',
      one: '1 book',
    );
    return '$_temp0';
  }

  @override
  String daysCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count days',
      one: '1 day',
    );
    return '$_temp0';
  }

  @override
  String pagesCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count pages',
      one: '1 page',
    );
    return '$_temp0';
  }

  @override
  String get weekdayMon => 'Mon';

  @override
  String get weekdayTue => 'Tue';

  @override
  String get weekdayWed => 'Wed';

  @override
  String get weekdayThu => 'Thu';

  @override
  String get weekdayFri => 'Fri';

  @override
  String get weekdaySat => 'Sat';

  @override
  String get weekdaySun => 'Sun';

  @override
  String get timeAm => 'AM';

  @override
  String get timePm => 'PM';

  @override
  String get unitYear => '';

  @override
  String get unitMonth => '';

  @override
  String get unitDay => '';

  @override
  String get unitHour => '';

  @override
  String get unitMinute => '';

  @override
  String get unitSecond => '';

  @override
  String readingComplete(int hours, int minutes, int seconds) {
    String _temp0 = intl.Intl.pluralLogic(
      hours,
      locale: localeName,
      other: '$hours hr $minutes min reading complete!',
      zero: '$minutes min $seconds sec reading complete!',
    );
    return '$_temp0';
  }

  @override
  String get timerStopConfirmTitle => 'Stop reading?';

  @override
  String timerStopConfirmMessage(String duration) {
    return 'You\'ve been reading for $duration.';
  }

  @override
  String get timerContinueButton => 'Continue';

  @override
  String get timerStopButton => 'Stop';

  @override
  String get pageInputHint => 'Page number';

  @override
  String pageUpdateSuccess(int page) {
    return 'Updated to page $page';
  }

  @override
  String get pageUpdateFailed => 'Failed to update page';

  @override
  String get pageUpdateLater => 'Later';

  @override
  String get statusReading => 'Reading';

  @override
  String get statusPlanned => 'To Read';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusReread => 'Reread';

  @override
  String get priorityUrgent => 'Urgent';

  @override
  String get priorityHigh => 'High';

  @override
  String get priorityMedium => 'Medium';

  @override
  String get priorityLow => 'Low';

  @override
  String get contentTypeHighlight => 'Highlight';

  @override
  String get contentTypeMemo => 'Memo';

  @override
  String get contentTypePhoto => 'Photo';

  @override
  String get languageSettingLabel => 'Language';

  @override
  String get homeBookList => 'Book List';

  @override
  String get bookListTabReading => 'Reading';

  @override
  String get bookListTabPlanned => 'To Read';

  @override
  String get bookListTabCompleted => 'Completed';

  @override
  String get bookListTabReread => 'Reread';

  @override
  String get bookListTabAll => 'All';

  @override
  String get bookListFilterAll => 'All';

  @override
  String get bookDetailTabRecord => 'Record';

  @override
  String get bookDetailTabHistory => 'History';

  @override
  String get bookDetailTabReview => 'Review';

  @override
  String get bookDetailTabDetail => 'Details';

  @override
  String get bookDetailStartDate => 'Start Date';

  @override
  String get bookDetailTargetDate => 'Target Date';

  @override
  String get bookDetailReviewWritten => 'Written';

  @override
  String get bookDetailReviewNotWritten => 'Not yet written';

  @override
  String get bookDetailLegendAchieved => 'Achieved';

  @override
  String get bookDetailLegendMissed => 'Missed';

  @override
  String get bookDetailLegendScheduled => 'Scheduled';

  @override
  String get bookDetailLater => 'Later';

  @override
  String get myLibraryTitle => 'My Library';

  @override
  String get chartTitle => 'My Reading Status';

  @override
  String get chartTabOverview => 'Overview';

  @override
  String get chartTabAnalysis => 'Analysis';

  @override
  String get chartTabActivity => 'Activity';

  @override
  String get chartPeriodDaily => 'Daily';

  @override
  String get chartPeriodWeekly => 'Weekly';

  @override
  String get chartPeriodMonthly => 'Monthly';

  @override
  String get chartDailyAverage => 'Daily Average';

  @override
  String get chartIncrease => 'Change';

  @override
  String get chartLess => 'Less';

  @override
  String get chartMore => 'More';

  @override
  String get myPageTitle => 'My Page';

  @override
  String get myPageSettings => 'Settings';

  @override
  String get myPageChangeAvatar => 'Change';

  @override
  String get myPageLogout => 'Logout';

  @override
  String get loginAppName => 'BookGolas';

  @override
  String get loginEmailLabel => 'Email';

  @override
  String get loginPasswordLabel => 'Password';

  @override
  String get loginNicknameLabel => 'Nickname';

  @override
  String get loginOrDivider => 'or';

  @override
  String get loginButton => 'Login';

  @override
  String get loginSignupButton => 'Sign Up';

  @override
  String get loginDescriptionSignIn =>
      'One page a day,\nwe support your reading';

  @override
  String get loginDescriptionSignUp =>
      'Start your reading habit\nwith BookGolas';

  @override
  String get loginDescriptionForgotPassword =>
      'We\'ll send a reset link\nto your registered email';

  @override
  String get loginEmailRequired => 'Please enter your email';

  @override
  String get loginEmailInvalid => 'Please enter a valid email address';

  @override
  String get loginPasswordHint => 'Enter 6 or more characters';

  @override
  String get loginPasswordRequired => 'Please enter your password';

  @override
  String get loginPasswordMinLength => 'Password must be at least 6 characters';

  @override
  String get loginNicknameHint => 'Name to use in the app';

  @override
  String get loginNicknameRequired => 'Please enter your nickname';

  @override
  String get loginForgotPasswordButton => 'Forgot your password?';

  @override
  String get loginSignupPrompt => 'Don\'t have an account? Sign Up';

  @override
  String get loginSigninPrompt => 'Already have an account? Login';

  @override
  String get loginBackButton => 'Back to Login';

  @override
  String get loginSaveEmail => 'Save email';

  @override
  String get loginResetPasswordButton => 'Send password reset email';

  @override
  String get loginSignupSuccess => 'Sign up complete. Please check your email.';

  @override
  String get loginResetPasswordSuccess => 'Password reset email sent.';

  @override
  String get loginUnexpectedError => 'An unexpected error occurred.';

  @override
  String get loginInvalidCredentials => 'Email or password is incorrect.';

  @override
  String get loginEmailNotConfirmed => 'Email verification is not complete.';

  @override
  String get loginEmailAlreadyRegistered => 'This email is already registered.';

  @override
  String get loginPasswordTooShort => 'Password must be at least 6 characters.';

  @override
  String get loginErrorInvalidCredentials => 'Email or password is incorrect.';

  @override
  String get loginErrorEmailNotConfirmed =>
      'Email verification is not complete.';

  @override
  String get loginErrorEmailAlreadyRegistered =>
      'This email is already registered.';

  @override
  String get loginErrorPasswordTooShort =>
      'Password must be at least 6 characters.';

  @override
  String get loginEmailHint => 'Enter your email';

  @override
  String get loginForgotPassword => 'Forgot your password?';

  @override
  String get loginNoAccount => 'Don\'t have an account?';

  @override
  String get loginHaveAccount => 'Already have an account?';

  @override
  String get loginBackToSignIn => 'Back to Sign In';

  @override
  String get myPageDeleteAccount => 'Delete Account';

  @override
  String myPageDeleteAccountError(String error) {
    return 'Failed to delete account: $error';
  }

  @override
  String myPageNotificationTime(String time) {
    return 'Notification set for $time';
  }

  @override
  String get myPageNotificationChangeFailed =>
      'Failed to change notification settings';

  @override
  String get myPageAvatarChanged => 'Avatar changed';

  @override
  String myPageAvatarChangeFailed(String error) {
    return 'Failed to change avatar: $error';
  }

  @override
  String get myPageNicknameHint => 'Enter your nickname';

  @override
  String get languageKorean => 'Korean';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChangeConfirmTitle => 'Change Language';

  @override
  String languageChangeConfirmMessage(String language) {
    return 'Are you sure you want to change the language to $language?';
  }

  @override
  String get myPageNoNotification => 'No notification';

  @override
  String get myPageNotificationEnabled => 'Notifications enabled';

  @override
  String get reviewTitle => 'Book Review';

  @override
  String get reviewSave => 'Save';

  @override
  String get reviewReplace => 'Replace';

  @override
  String get reviewExit => 'Exit';

  @override
  String get readingStartSetDate => 'Set Start Date';

  @override
  String get readingStartUndetermined => 'Undetermined';

  @override
  String get dialogOpacity => 'Opacity';

  @override
  String get dialogThickness => 'Thickness';

  @override
  String get dialogTakePhoto => 'Take Photo';

  @override
  String get dialogReplaceImage => 'Replace';

  @override
  String get dialogViewFull => 'View Full';

  @override
  String get dialogCopy => 'Copy';

  @override
  String get dialogEdit => 'Edit';

  @override
  String get dialogSaved => 'Saved';

  @override
  String get dialogSaving => 'Saving...';

  @override
  String get dialogUpload => 'Upload';

  @override
  String get dialogSelect => 'Select';

  @override
  String get dialogApply => 'Apply';

  @override
  String get dialogExtract => 'Extract';

  @override
  String get dialogOkay => 'Okay';

  @override
  String get dialogExtractIt => 'Extract';

  @override
  String get dialogThinkAboutIt => 'Think About It';

  @override
  String get genreNovel => 'Novel';

  @override
  String get genreLiterature => 'Literature';

  @override
  String get genreSelfHelp => 'Self-Help';

  @override
  String get genreBusiness => 'Business';

  @override
  String get genreHumanities => 'Humanities';

  @override
  String get genreScience => 'Science';

  @override
  String get genreHistory => 'History';

  @override
  String get genreEssay => 'Essay';

  @override
  String get genrePoetry => 'Poetry';

  @override
  String get genreComic => 'Comic';

  @override
  String get genreUncategorized => 'Uncategorized';

  @override
  String get errorInitFailed => 'An error occurred during initialization';

  @override
  String get errorLoadFailed => 'Failed to load';

  @override
  String get errorNoRecords => 'No records';

  @override
  String get loadingInit => 'Initializing app...';

  @override
  String get homeNoReadingBooks =>
      'No reading books in progress. Please register a book first.';

  @override
  String get homeNoReadingBooksShort => 'No reading books in progress';

  @override
  String get homeSwitchToAllBooks => 'Switched to all books view.';

  @override
  String get homeSwitchToReadingDetail => 'Switched to reading detail view.';

  @override
  String get homeToggleAllBooks => 'View All Books';

  @override
  String get homeToggleReadingOnly => 'View Reading Only';

  @override
  String get bookListErrorLoadFailed => 'Failed to load data';

  @override
  String get bookListErrorCheckNetwork =>
      'Please check your network connection';

  @override
  String get bookListEmptyPlanned => 'No books planned to read';

  @override
  String get bookListEmptyPaused => 'No paused books';

  @override
  String get bookListEmptyAll => 'No reading started yet';

  @override
  String get bookListEmptyReading =>
      'Shall we start a reading journey with Bookgolas?';

  @override
  String get bookListReadingEmptyAction => 'Start Reading Journey';

  @override
  String get searchModeBookSearch => 'Book Search';

  @override
  String get searchModeAiRecordSearch => 'AI Record Search';

  @override
  String get bookListEmptyCompleted => 'No completed books';

  @override
  String bookListEmptyStatus(String status) {
    return 'No $status books';
  }

  @override
  String get bookDetailScreenTitle => 'Reading Details';

  @override
  String get bookDetailCompletionCongrats => 'Congratulations on finishing!';

  @override
  String get bookDetailCompletionPrompt =>
      'While the afterglow of reading is still fresh,\nwould you like to write a review?';

  @override
  String get bookDetailWriteReview => 'Write Review';

  @override
  String get bookDetailEditReview => 'Edit Review';

  @override
  String get bookDetailReviewDescription =>
      'Record your thoughts after reading';

  @override
  String get bookDetailReviewEditDescription =>
      'Review and edit your written review';

  @override
  String get bookDetailContinueReading => 'Continue Reading';

  @override
  String get bookDetailContinueReadingDesc =>
      'Let\'s focus and achieve your reading goal!';

  @override
  String get bookDetailRestartReading => 'Start New Reading';

  @override
  String get bookDetailPlannedStartDate => 'Planned Start Date';

  @override
  String get bookDetailPlannedStartDateUndetermined => 'Start date not set';

  @override
  String get bookDetailPlanUpdated => 'Reading plan has been updated';

  @override
  String bookDetailPausedPosition(
      int currentPage, int totalPages, int percentage) {
    return 'Paused at: ${currentPage}p / ${totalPages}p ($percentage%)';
  }

  @override
  String bookDetailAttemptStart(int attemptNumber) {
    return 'Starting attempt #$attemptNumber!';
  }

  @override
  String bookDetailAttemptStartWithDays(int attemptNumber, int daysLeft) {
    return 'Starting attempt #$attemptNumber! D-$daysLeft';
  }

  @override
  String bookDetailAttemptStartEncouragement(int attemptNumber) {
    return 'Starting attempt #$attemptNumber. Let\'s do it!';
  }

  @override
  String get bookDetailGoalAchieved => 'Goal achieved!';

  @override
  String bookDetailPagesRead(int pagesRead, int pagesLeft) {
    return '+$pagesRead pages! ${pagesLeft}p left to today\'s goal';
  }

  @override
  String bookDetailPagesReached(int pagesRead, int currentPage) {
    return '+$pagesRead pages! Reached ${currentPage}p';
  }

  @override
  String get bookDetailRecordSaved => 'Record saved';

  @override
  String get bookDetailUploadFailed => 'Upload Failed';

  @override
  String get bookDetailNetworkError =>
      'Please check your network connection.\nTry again if the connection is stable.';

  @override
  String get bookDetailUploadError =>
      'An error occurred while saving the record.\nPress the upload button to try again.';

  @override
  String get bookDetailImageReplaced => 'Image replaced';

  @override
  String get bookDetailDeleteConfirmTitle => 'Delete this reading?';

  @override
  String get bookDetailDeleteConfirmMessage =>
      'Deleted reading records cannot be recovered.';

  @override
  String get bookDetailDeleteSuccess => 'Reading deleted';

  @override
  String get bookDetailDeleteImageConfirmTitle => 'Delete this item?';

  @override
  String get bookDetailDeleteImageConfirmMessage =>
      'This item cannot be recovered once deleted.';

  @override
  String bookDetailItemsDeleted(int count) {
    return '$count items deleted';
  }

  @override
  String get bookDetailPauseReadingMessage =>
      'Taking a break from reading. Feel free to start again anytime!';

  @override
  String get bookDetailNewJourneyStart =>
      'Starting a new reading journey! Fighting! 📚';

  @override
  String get bookDetailNoteStructure => 'Note Structure';

  @override
  String get bookDetailPriorityUrgent => 'Urgent';

  @override
  String get bookDetailPriorityHigh => 'High';

  @override
  String get bookDetailPriorityMedium => 'Medium';

  @override
  String get bookDetailPriorityLow => 'Low';

  @override
  String get bookDetailError => 'An error occurred';

  @override
  String get calendarMonthSelect => 'Select Month';

  @override
  String get calendarCancel => 'Cancel';

  @override
  String get calendarConfirm => 'OK';

  @override
  String calendarPagesRead(int pages) {
    return '$pages pages read';
  }

  @override
  String get calendarCompleted => 'Completed';

  @override
  String get calendarSelectMonth => 'Select Month';

  @override
  String get calendarFilterAll => 'All';

  @override
  String get calendarFilterReading => 'Reading';

  @override
  String get calendarFilterCompleted => 'Completed';

  @override
  String get calendarLoadError => 'Failed to load data';

  @override
  String get myPageDeleteAccountTitle => '계정 삭제';

  @override
  String get myPageDeleteAccountConfirm =>
      '정말로 계정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.';

  @override
  String get myPageDeleteAccountSuccess => '계정이 성공적으로 삭제되었습니다.';

  @override
  String get myPageDeleteAccountFailed => '계정 삭제에 실패했습니다. 다시 시도해주세요.';

  @override
  String myPageErrorOccurred(String error) {
    return '오류가 발생했습니다: $error';
  }

  @override
  String get myPageNotificationTimeTitle => 'Notification Time';

  @override
  String get myPageDarkMode => 'Dark Mode';

  @override
  String get myPageDailyReadingNotification => 'Daily Reading Goal Reminder';

  @override
  String get myPageNoNotifications => '알림을 받지 않습니다';

  @override
  String get myPageNotificationsEnabled => 'Notifications enabled';

  @override
  String get myPageNotificationsDisabled => 'Notifications disabled';

  @override
  String get myPageNotificationSettingsFailed =>
      'Failed to change notification settings';

  @override
  String get myPageTestNotification => '테스트 알림 (30초 후)';

  @override
  String get myPageTestNotificationScheduled => '30초 후에 테스트 알림이 발송됩니다!';

  @override
  String get myPageNoNickname => '닉네임 없음';

  @override
  String get myPageEnterNickname => '닉네임을 입력하세요';

  @override
  String get myPageProfileImageChanged => '프로필 이미지가 변경되었습니다';

  @override
  String myPageProfileImageChangeFailed(String error) {
    return '프로필 이미지 변경 실패: $error';
  }

  @override
  String get myPageLanguageKorean => '한국어';

  @override
  String get myPageLanguageEnglish => 'English';

  @override
  String get myPageDeleteAccountButton => '계정 삭제';

  @override
  String myPageNotificationTimeChanged(String time) {
    return 'Notification time changed to $time';
  }

  @override
  String get myPageNotificationTimeChangeFailed =>
      'Failed to change notification time';

  @override
  String myPageDailyReadingNotificationSubtitle(String time) {
    return 'Notification at $time daily';
  }

  @override
  String get reviewDraftLoaded => 'Draft loaded.';

  @override
  String get reviewCopied => 'Review copied.';

  @override
  String get reviewBookNotFound => 'Book information not found.';

  @override
  String get reviewSaveFailed => 'Save failed. Please try again.';

  @override
  String get reviewSaveError => 'An error occurred while saving.';

  @override
  String get reviewReplaceConfirmTitle =>
      'You have content in progress.\nReplace with AI draft?';

  @override
  String get reviewAIDraftGenerated => 'AI draft generated. Feel free to edit!';

  @override
  String get reviewAIDraftGenerateFailed =>
      'AI draft generation failed. Please try again.';

  @override
  String get reviewAIDraftGenerateError =>
      'An error occurred while generating AI draft.';

  @override
  String get reviewSaveCompleteTitle => 'Review saved!';

  @override
  String get reviewSaveCompleteMessage =>
      'Your saved review can be found in the \'Review\' tab or\n\'My Library > Review\'.';

  @override
  String get reviewExitConfirmTitle => 'Stop writing and exit?';

  @override
  String get reviewExitConfirmSubtitle => 'Your draft will be saved.';

  @override
  String get reviewAIGenerating => 'AI is writing a draft...';

  @override
  String get reviewAIButtonLabel => 'Write review draft with AI';

  @override
  String get reviewTextFieldHint =>
      'Feel free to write your thoughts, impressive parts, and inspiration from this book.';

  @override
  String get readingStartTitle => 'Start Reading';

  @override
  String get readingStartSubtitle => 'Search for a book to start reading.';

  @override
  String get readingStartNoResults => 'No search results';

  @override
  String get readingStartAnalyzing => 'Analyzing reading patterns...';

  @override
  String get readingStartAIRecommendation => 'AI Personalized Recommendations';

  @override
  String readingStartAIRecommendationDesc(String userName) {
    return 'Books recommended by analyzing $userName\'s reading patterns';
  }

  @override
  String get readingStartSearchHint => 'Enter book title.';

  @override
  String get readingStartSelectionComplete => 'Selection Complete';

  @override
  String get readingStartPlannedStartDate => 'Planned Reading Start Date';

  @override
  String get readingStartStartingToday => 'Starting from today';

  @override
  String get readingStartTargetDeadline => 'Target Deadline';

  @override
  String get readingStartTargetDeadlineNote =>
      'You can change the target date even after starting to read';

  @override
  String get barcodeScannerTitle => 'ISBN Barcode Scan';

  @override
  String get barcodeScannerInstruction =>
      'Please scan the ISBN barcode on the back of the book';

  @override
  String get barcodeScannerFrameHint => 'Align the barcode within the frame';

  @override
  String get scannerErrorPermissionDenied =>
      'Camera permission is required\nPlease allow permission in settings';

  @override
  String get scannerErrorInitializing => 'Initializing camera';

  @override
  String get scannerErrorGeneral => 'Camera error occurred\nPlease try again';

  @override
  String get bookDetailTabRecordLabel => 'Record';

  @override
  String get bookDetailTabHistoryLabel => 'History';

  @override
  String get bookDetailTabDetailLabel => 'Details';

  @override
  String get highlightOpacity => 'Opacity';

  @override
  String get highlightThickness => 'Thickness';

  @override
  String get todayGoalSettingTitle => 'Today\'s Goal Setting';

  @override
  String get todayGoalStartPageLabel => 'Start Page';

  @override
  String get todayGoalTargetPageLabel => 'Target Page';

  @override
  String get bookStatusCompleted => 'Completed';

  @override
  String get bookStatusPlanned => 'To Read';

  @override
  String get bookStatusReread => 'Reread';

  @override
  String get bookStatusReading => 'Reading';

  @override
  String get bookCompletionCongrats => 'Congratulations on finishing!';

  @override
  String get bookCompletionQuestion => 'How was this book?';

  @override
  String get reviewOneLinePlaceholder => 'One-line review (optional)';

  @override
  String get reviewOneLineHint => 'Express this book in one word...';

  @override
  String get bookCompletionLater => 'Later';

  @override
  String get bookCompletionDone => 'Done';

  @override
  String get ratingBad => 'Disappointing 😢';

  @override
  String get ratingOkay => 'Just okay 😐';

  @override
  String get ratingGood => 'Good 🙂';

  @override
  String get ratingGreat => 'Great! 😊';

  @override
  String get ratingExcellent => 'Excellent! 🤩';

  @override
  String get recordSearch => 'Record Search';

  @override
  String get pageUpdate => 'Page Update';

  @override
  String get dayLabels => 'Sun,Mon,Tue,Wed,Thu,Fri,Sat';

  @override
  String streakAchieved(int streak) {
    return '$streak day streak!';
  }

  @override
  String get streakFirstRecord => 'Leave your first record today';

  @override
  String get mindmapInsufficientData =>
      'Insufficient reading records.\nAt least 5 highlights or memos are required.';

  @override
  String get contentBadgeHighlight => 'Highlight';

  @override
  String get contentBadgeMemo => 'Memo';

  @override
  String get contentBadgeOCR => 'Photo OCR';

  @override
  String get readingScheduleStartDate => 'Start Date';

  @override
  String get readingScheduleTargetDate => 'Target Date';

  @override
  String readingScheduleTotalDays(int totalDays) {
    return '($totalDays days)';
  }

  @override
  String readingScheduleAttempt(int attemptCount) {
    return 'Attempt $attemptCount';
  }

  @override
  String get pageUpdateDialogTitle => 'Update Current Page';

  @override
  String get pageUpdateValidationRequired => 'Please enter a number';

  @override
  String get pageUpdateValidationNonNegative =>
      'Please enter a page number of 0 or more';

  @override
  String pageUpdateValidationExceedsTotal(int totalPages) {
    return 'Cannot exceed total pages ($totalPages)';
  }

  @override
  String pageUpdateValidationLessThanCurrent(int currentPage) {
    return 'Cannot be less than current page ($currentPage)';
  }

  @override
  String pageUpdateCurrentPage(int currentPage) {
    return 'Currently ${currentPage}p';
  }

  @override
  String pageUpdateTotalPages(int totalPages) {
    return ' / Total ${totalPages}p';
  }

  @override
  String get pageUpdateNewPageLabel => 'New Page Number';

  @override
  String get pageUpdateCancel => 'Cancel';

  @override
  String get pageUpdateButton => 'Update';

  @override
  String get timerDidNotRead => 'I didn\'t read';

  @override
  String get imageSourceDocumentScan => 'Document Scan';

  @override
  String get imageSourceDocumentScanDesc =>
      'Auto-detects documents and corrects distortion';

  @override
  String get imageSourceAutoCorrection => 'Flatten & Auto Correct';

  @override
  String get imageSourceSimulatorError =>
      'Camera is not available on simulator';

  @override
  String get imageSourceTakePhoto => 'Take Photo';

  @override
  String get imageSourceGeneralPhoto => 'General Photo';

  @override
  String get imageSourceFromLibrary => 'From Library';

  @override
  String get imageSourceSelectSaved => 'Select Saved Image';

  @override
  String get imageSourceReplaceTitle => 'Replace Image';

  @override
  String get imageSourceCameraTitle => 'Take Photo';

  @override
  String get imageSourceCameraDesc => 'Take a photo and extract text instantly';

  @override
  String get imageSourceGalleryTitle => 'Select from Library';

  @override
  String get imageSourceGalleryDesc => 'Extract text from a saved image';

  @override
  String get imageSourceReplaceConfirmation => 'Replace this image?';

  @override
  String get imageSourceReplaceWarning =>
      'Previously extracted text will be lost.';

  @override
  String get dailyTargetDialogTitle => 'Change Daily Target Page';

  @override
  String get dailyTargetScheduleHeader => 'Expected Schedule';

  @override
  String get dailyTargetPagesPerDay => 'Pages/Day';

  @override
  String dailyTargetPagesLeft(int pagesLeft) {
    return '$pagesLeft pages';
  }

  @override
  String dailyTargetDaysLeft(int daysLeft) {
    return ' remaining · D-$daysLeft';
  }

  @override
  String get dailyTargetChangeButton => 'Change';

  @override
  String get dailyTargetNotFound => 'Book information not found';

  @override
  String dailyTargetUpdateSuccess(int newDailyTarget) {
    return 'Today\'s goal changed to ${newDailyTarget}p';
  }

  @override
  String dailyTargetUpdateError(String error) {
    return 'Failed to change goal: $error';
  }

  @override
  String get editPlannedBookTitle => 'Edit Reading Plan';

  @override
  String get editPlannedBookStartDate => 'Planned Start Date';

  @override
  String get editPlannedBookCancel => 'Cancel';

  @override
  String get editPlannedBookSave => 'Save';

  @override
  String get updateTargetDateTitle => 'Change Target Date';

  @override
  String updateTargetDateAttempt(int nextAttemptCount) {
    return 'Will change to attempt $nextAttemptCount';
  }

  @override
  String updateTargetDateFormatted(int year, int month, int day) {
    return '$year/$month/$day';
  }

  @override
  String get updateTargetDateCancel => 'Cancel';

  @override
  String get updateTargetDateButton => 'Change';

  @override
  String get reviewLinkSectionTitle => 'Related Links';

  @override
  String get reviewLinkAladinTitle => 'View on Aladin';

  @override
  String get reviewLinkAladinSubtitle => 'Book Details';

  @override
  String get reviewLinkViewButton => 'View Review';

  @override
  String get reviewLinkAddButton => 'Add Review Link';

  @override
  String get reviewLinkViewDescription => 'My written review';

  @override
  String get reviewLinkAddDescription =>
      'Add review link from blog, Notion, etc.';

  @override
  String get reviewLinkDialogTitle => 'Review Link';

  @override
  String get reviewLinkDialogHint =>
      'Enter review link from blog, Notion, Brunch, etc.';

  @override
  String get reviewLinkInvalidUrl => 'Please enter a valid URL';

  @override
  String get reviewLinkUrlLabel => 'Review URL';

  @override
  String get reviewLinkDeleteButton => 'Delete';

  @override
  String get reviewLinkSaveButton => 'Save';

  @override
  String get existingImageEditingWarning => 'You have unsaved changes.';

  @override
  String get existingImageDiscardChanges => 'Discard Changes';

  @override
  String get existingImageContinueEditing => 'Continue Editing';

  @override
  String existingImageExceedsTotal(int totalPages) {
    return 'Cannot exceed total pages ($totalPages)';
  }

  @override
  String get existingImageSaved => 'Saved';

  @override
  String get existingImageCloseButton => 'Close';

  @override
  String get existingImageCancelButton => 'Cancel';

  @override
  String get existingImagePageNotSet => 'Page not set';

  @override
  String get existingImageSavingButton => 'Saving...';

  @override
  String get existingImageSaveButton => 'Save';

  @override
  String get existingImageDeleteButton => 'Delete';

  @override
  String get existingImageTextHint => 'Enter text...';

  @override
  String existingImageHighlightCount(int count) {
    return 'Highlight $count';
  }

  @override
  String get existingImageHighlightLabel => 'Highlight';

  @override
  String get existingImageExtractText => 'Extract Text';

  @override
  String get existingImageReplaceButton => 'Replace';

  @override
  String get existingImageRecordText => 'Record Text';

  @override
  String get existingImageViewAll => 'View All';

  @override
  String get existingImageCopyMessage => 'Text copied.';

  @override
  String get existingImageCopyButton => 'Copy';

  @override
  String get existingImageEditButton => 'Edit';

  @override
  String get existingImageClearAllButton => 'Clear All';

  @override
  String get existingImageNoRecordedText => 'No recorded text.';

  @override
  String get addMemorablePageCreditWarning =>
      'Used credits cannot be recovered.';

  @override
  String addMemorablePageExceedsTotal(int totalPages) {
    return 'Cannot exceed total pages ($totalPages)';
  }

  @override
  String get addMemorablePageExceedsError => 'Cannot exceed total pages.';

  @override
  String get addMemorablePageResetConfirm => 'Really reset the content?';

  @override
  String get addMemorablePageResetCancel => 'Cancel';

  @override
  String get addMemorablePageResetButton => 'Reset';

  @override
  String get addMemorablePageTitle => 'Add Record';

  @override
  String get addMemorablePageResetTitle => 'Reset';

  @override
  String addMemorablePageHighlightCount(int count) {
    return 'Highlight ($count)';
  }

  @override
  String get addMemorablePageHighlightLabel => 'Highlight';

  @override
  String get addMemorablePageExtractText => 'Extract Text';

  @override
  String get addMemorablePageReplaceButton => 'Replace';

  @override
  String get addMemorablePageAddImage => 'Tap to add image';

  @override
  String get addMemorablePageOptional => '(Optional)';

  @override
  String get addMemorablePagePageCount => 'Page Count';

  @override
  String get addMemorablePageTextHint => 'Record an impressive passage.';

  @override
  String get addMemorablePageRecordText => 'Record Text';

  @override
  String get addMemorablePageViewAll => 'View All';

  @override
  String get addMemorablePageClearAll => 'Clear All';

  @override
  String get addMemorablePageUploadButton => 'Upload';

  @override
  String get addMemorablePageUploading => 'Uploading...';

  @override
  String get pauseReadingTitle => 'Take a Break';

  @override
  String pauseReadingMessage(int progress, int currentPage, int totalPages) {
    return 'Pausing reading at $progress% ($currentPage / $totalPages pages).';
  }

  @override
  String get pauseReadingEncouragement => 'You can resume anytime!';

  @override
  String get pauseReadingCancel => 'Cancel';

  @override
  String get pauseReadingButton => 'Take a Break';

  @override
  String get readingManagementTitle => 'Reading Management';

  @override
  String readingManagementProgress(
      int progress, int currentPage, int totalPages) {
    return 'Currently $progress% in progress ($currentPage / $totalPages pages)';
  }

  @override
  String get readingManagementPauseLabel => 'Take a Break';

  @override
  String get readingManagementPauseDesc => 'You can read it again later';

  @override
  String get readingManagementDeleteLabel => 'Delete';

  @override
  String get readingManagementDeleteDesc => 'Reading records will be deleted';

  @override
  String get readingManagementThinkAbout => 'Let me think about it';

  @override
  String get bookReviewTabNoReview => 'No review yet';

  @override
  String get bookReviewTabDescription => 'Record your thoughts after reading';

  @override
  String get bookReviewTabWriteButton => 'Write Review';

  @override
  String get bookReviewTabMyReview => 'My Review';

  @override
  String get bookReviewTabEditButton => 'Edit Review';

  @override
  String dashboardProgressPagesLeft(int pagesLeft) {
    return '$pagesLeft pages';
  }

  @override
  String get dashboardProgressRemaining => ' remaining';

  @override
  String dashboardProgressDailyTarget(int dailyTarget) {
    return 'Today\'s goal: ${dailyTarget}p';
  }

  @override
  String get dashboardProgressAchieved => 'Goal Achieved';

  @override
  String get detailTabManagement => 'Reading Management';

  @override
  String get detailTabManagementDesc => 'Pause, delete, etc.';

  @override
  String get detailTabDeleteReading => 'Delete Reading';

  @override
  String get detailTabReview => 'Review';

  @override
  String get detailTabReviewWritten => 'Written';

  @override
  String get detailTabReviewNotWritten => 'Not yet written';

  @override
  String get detailTabReviewDescription => 'Record your thoughts after reading';

  @override
  String get detailTabSchedule => 'Reading Schedule';

  @override
  String get detailTabScheduleStartDate => 'Start Date';

  @override
  String get detailTabScheduleTargetDate => 'Target Date';

  @override
  String detailTabAttempt(int attemptCount, String attemptEncouragement) {
    return 'Attempt $attemptCount · $attemptEncouragement';
  }

  @override
  String get detailTabChangeButton => 'Change';

  @override
  String get detailTabGoalAchievement => 'Goal Achievement';

  @override
  String detailTabAchievementStats(int passedDays, int achievedCount) {
    return '$achievedCount out of $passedDays days achieved';
  }

  @override
  String get detailTabLegendAchieved => 'Achieved';

  @override
  String get detailTabLegendMissed => 'Missed';

  @override
  String get detailTabLegendScheduled => 'Scheduled';

  @override
  String get memorablePagesNoImages => 'No images added yet';

  @override
  String get memorablePagesAddPrompt => 'Add using the + button below';

  @override
  String memorablePagesSelected(int count) {
    return '$count selected';
  }

  @override
  String get memorablePagesSortPageDesc => 'Page (High to Low)';

  @override
  String get memorablePagesSortPageAsc => 'Page (Low to High)';

  @override
  String get memorablePagesSortDateDesc => 'Recent First';

  @override
  String get memorablePagesSortDateAsc => 'Oldest First';

  @override
  String get memorablePagesSortType => 'Page';

  @override
  String get memorablePagesSortDate => 'Date';

  @override
  String get memorablePagesDeleteButton => 'Delete';

  @override
  String get memorablePagesCompleteButton => 'Done';

  @override
  String get memorablePagesSelectButton => 'Select';

  @override
  String get memorablePagesPreviewHint => 'Tap for details';

  @override
  String get fullTitleSheetTitle => 'Book Title';

  @override
  String get fullTitleSheetCopyMessage => 'Title copied';

  @override
  String get fullTitleSheetCopyButton => 'Copy';

  @override
  String get fullTitleSheetStoreButton => 'View in Store';

  @override
  String deleteConfirmationItemCount(int count) {
    return 'Delete $count items?';
  }

  @override
  String get deleteConfirmationWarning => 'Deleted items cannot be recovered.';

  @override
  String get deleteConfirmationCancel => 'Cancel';

  @override
  String get deleteConfirmationButton => 'Delete';

  @override
  String get progressHistoryNoRecords => 'No progress records';

  @override
  String get progressHistoryCumulativePages => '📈 Cumulative Pages';

  @override
  String progressHistoryAttempt(int attemptCount, String attemptEncouragement) {
    return 'Attempt $attemptCount · $attemptEncouragement';
  }

  @override
  String progressHistoryRecordDays(int recordCount) {
    return '$recordCount days recorded';
  }

  @override
  String get progressHistoryLegendCumulative => 'Cumulative Pages';

  @override
  String get progressHistoryLegendDaily => 'Daily Pages';

  @override
  String progressHistoryChartCumulative(int cumulativePage) {
    return 'Cumulative: $cumulativePage p\n';
  }

  @override
  String progressHistoryChartDaily(int dailyPage) {
    return 'Daily: +$dailyPage p';
  }

  @override
  String get progressHistoryMilestoneFirstCompletion => 'Finally finished!';

  @override
  String progressHistoryMilestoneFirstCompletionMsg(int attemptCount) {
    return 'You succeeded after $attemptCount attempts. You\'re amazing for not giving up!';
  }

  @override
  String get progressHistoryMilestoneCompletion =>
      'Congratulations on finishing!';

  @override
  String get progressHistoryMilestoneCompletionMsg =>
      'You achieved your goal. Ready for the next book?';

  @override
  String get progressHistoryMilestoneRetry => 'Let\'s finish this time';

  @override
  String progressHistoryMilestoneRetryMsg(int attemptCount) {
    return 'This is attempt $attemptCount. Reset your goal and finish reading!';
  }

  @override
  String get progressHistoryMilestoneDeadlinePassed => 'Deadline passed';

  @override
  String get progressHistoryMilestoneDeadlinePassedMsg =>
      'No worries, set a new deadline and try again!';

  @override
  String get progressHistoryMilestoneFastPace => 'Amazing pace!';

  @override
  String get progressHistoryMilestoneFastPaceMsg =>
      'You\'re reading much faster than expected. You\'ll finish early!';

  @override
  String get progressHistoryMilestoneOnTrack => 'On track!';

  @override
  String get progressHistoryMilestoneOnTrackMsg =>
      'You\'re ahead of schedule. Keep it up!';

  @override
  String get progressHistoryMilestoneOnSchedule => 'On schedule';

  @override
  String get progressHistoryMilestoneOnScheduleMsg =>
      'You\'re reading steadily. Keep going!';

  @override
  String get progressHistoryMilestoneBehind => 'Let\'s pick up the pace';

  @override
  String get progressHistoryMilestoneBehindMsg =>
      'You can finish this time. Read a bit more each day!';

  @override
  String get progressHistoryMilestoneFallBehind => 'Let\'s read a bit more';

  @override
  String get progressHistoryMilestoneFallBehindMsg =>
      'You\'re slightly behind. A little more reading today will catch you up!';

  @override
  String get progressHistoryMilestoneGiveUp => 'Don\'t give up!';

  @override
  String progressHistoryMilestoneGiveUpMsg(int attemptCount) {
    return 'You\'re on attempt $attemptCount. Adjust your deadline or focus more!';
  }

  @override
  String get progressHistoryMilestoneReset => 'May need to reset goal';

  @override
  String get progressHistoryMilestoneResetMsg =>
      'At this pace, it\'s hard to achieve the goal. Adjust your deadline?';

  @override
  String get progressHistoryDailyRecords => '📅 Daily Records';

  @override
  String get progressHistoryPageLabel => 'Pages';

  @override
  String progressHistoryCumulativeLabel(int page) {
    return 'Cumulative: $page pages';
  }

  @override
  String get dailyTargetConfirmTitle => 'Change Daily Target';

  @override
  String get dailyTargetConfirmMessage =>
      'Today\'s goal cannot be changed,\nbut the new goal will apply from tomorrow.';

  @override
  String get dailyTargetConfirmQuestion => 'Change it?';

  @override
  String get dailyTargetConfirmCancel => 'Cancel';

  @override
  String get dailyTargetConfirmButton => 'Change';

  @override
  String get widgetExtractedTextTitle => 'Extracted Text';

  @override
  String get widgetExtractedTextSubtitle =>
      'Please verify the extracted content. You can edit it directly!';

  @override
  String get widgetExtractedTextApply => 'Apply';

  @override
  String get widgetExtractedTextCancel => 'Select Again';

  @override
  String get widgetExtractedTextHint => 'Enter text';

  @override
  String widgetExtractedTextPage(int pageNumber) {
    return 'Page $pageNumber';
  }

  @override
  String get widgetFullTextTitle => 'Memo Text';

  @override
  String get widgetFullTextHint => 'Enter text...';

  @override
  String get widgetFullTextCopied => 'Text copied.';

  @override
  String get widgetFullTextCollapse => 'Collapse';

  @override
  String get widgetFullTextCopy => 'Copy';

  @override
  String get widgetFullTextEdit => 'Edit';

  @override
  String get widgetFullTextClearAll => 'Clear All';

  @override
  String get widgetNavigationBackToDetail => 'Back to Reading Detail';

  @override
  String get widgetDatePickerYear => '';

  @override
  String get widgetDatePickerMonth => '';

  @override
  String get widgetDatePickerDay => '';

  @override
  String get widgetTimePickerAm => 'AM';

  @override
  String get widgetTimePickerPm => 'PM';

  @override
  String get widgetTimePickerHour => '';

  @override
  String get widgetTimePickerMinute => '';

  @override
  String get widgetBookstoreSelectTitle => 'Select Bookstore';

  @override
  String widgetBookstoreSearch(String searchTitle) {
    return 'Search \"$searchTitle\"';
  }

  @override
  String get widgetBookstoreAladin => 'Aladin';

  @override
  String get widgetBookstoreKyobo => 'Kyobo';

  @override
  String get widgetHighlightEditTitle => 'Edit Highlight';

  @override
  String get widgetHighlightOpacity => 'Opacity';

  @override
  String get widgetHighlightStrokeWidth => 'Stroke Width';

  @override
  String get widgetPageUpdate => 'Update Page';

  @override
  String get widgetRecommendationViewDetail => 'View Book Details';

  @override
  String get widgetRecommendationViewDetailSubtitle =>
      'Check book info at bookstore';

  @override
  String get widgetRecommendationStartReading => 'Start Reading';

  @override
  String get widgetRecommendationStartReadingSubtitle =>
      'Begin reading this book';

  @override
  String get widgetRecommendationSelectBookstore => 'Select Bookstore';

  @override
  String widgetRecommendationSearchBookstore(String searchTitle) {
    return 'Search results for \'$searchTitle\'';
  }

  @override
  String get recallTextCopied => 'Text copied';

  @override
  String get recallRecordLabel => 'Record';

  @override
  String get recallGlobalSearchTitle => 'Search All Records';

  @override
  String get recallGlobalSearching => 'Searching all books...';

  @override
  String get recallRecentGlobalSearches => 'Recent Global Searches';

  @override
  String get recallGlobalEmptyTitle => 'Search all reading records';

  @override
  String get recallGlobalEmptySubtitle =>
      'AI will find scattered records across multiple books';

  @override
  String recallSourcesByBookCount(int count) {
    return 'Referenced records ($count books)';
  }

  @override
  String recallMoreBooksCount(int count) {
    return 'View $count more books';
  }

  @override
  String get recallAIAnswer => 'AI Answer';

  @override
  String get recallGlobalSearchHint =>
      'Example: \"What was mentioned about habits?\"';

  @override
  String get recallMyRecordsSearchTitle => 'Search My Records';

  @override
  String get recallMyRecordsSearching => 'Searching your records...';

  @override
  String get recallRecentSearches => 'Recent Searches';

  @override
  String get recallSuggestedQuestions => 'Suggested Questions';

  @override
  String get recallEmptyTitle => 'Search for what you\'re curious about';

  @override
  String get recallEmptySubtitle => 'Find from highlights, notes, and photos';

  @override
  String get recallRelatedRecords => 'Related Records';

  @override
  String get recallCopyButton => 'Copy';

  @override
  String get recallJustNow => 'Just now';

  @override
  String recallMinutesAgo(int count) {
    return '$count minutes ago';
  }

  @override
  String recallHoursAgo(int count) {
    return '$count hours ago';
  }

  @override
  String recallDaysAgo(int count) {
    return '$count days ago';
  }

  @override
  String get recallMyRecordsSearchHint =>
      'Example: \"What did the author say about habits?\"';

  @override
  String get recallPageLabel => 'Page';

  @override
  String recallRecordCountLabel(int count) {
    return '$count records';
  }

  @override
  String get recallContentCopied => 'Content copied';

  @override
  String get recallViewInBook => 'View in Book';

  @override
  String get bookListPageUnit => 'pages';

  @override
  String completedBookDaysToComplete(int days) {
    return 'Completed in $days days';
  }

  @override
  String get completedBookSameDayComplete => 'Completed same day';

  @override
  String completedBookAchievementRate(int rate) {
    return 'Achievement rate $rate%';
  }

  @override
  String get pausedBookUnknownDate => 'Unknown';

  @override
  String plannedBookStartDate(String date) {
    return 'Start date: $date';
  }

  @override
  String get plannedBookStartDateUndetermined => 'Start date undetermined';

  @override
  String get prioritySelectorLabel => 'Priority (Optional)';

  @override
  String get statusSelectorLabel => 'Reading Status';

  @override
  String get statusPlannedLabel => 'To Read';

  @override
  String get statusReadingLabel => 'Start Now';

  @override
  String get contentTypeNote => 'Note';

  @override
  String get genreBusinessEconomics => 'Business';

  @override
  String get genreMessageNovel1 => 'You\'re a literature enthusiast!';

  @override
  String get genreMessageNovel2 => 'Living in the world of stories';

  @override
  String get genreMessageNovel3 => 'A devoted novel reader';

  @override
  String get genreMessageLiterature1 => 'You\'re a literature enthusiast!';

  @override
  String get genreMessageLiterature2 =>
      'A reader who understands literary depth';

  @override
  String get genreMessageLiterature3 =>
      'Someone who enjoys the beauty of words';

  @override
  String get genreMessageSelfHelp1 => 'You\'re constantly growing!';

  @override
  String get genreMessageSelfHelp2 => 'A reader who never stops improving';

  @override
  String get genreMessageSelfHelp3 => 'Preparing for a better tomorrow';

  @override
  String get genreMessageBusiness1 => 'You have a sharp business mind!';

  @override
  String get genreMessageBusiness2 => 'Running towards success';

  @override
  String get genreMessageBusiness3 => 'You have CEO potential';

  @override
  String get genreMessageHumanities1 => 'You enjoy deep contemplation';

  @override
  String get genreMessageHumanities2 =>
      'A reader who enjoys philosophical thinking';

  @override
  String get genreMessageHumanities3 =>
      'Someone who explores humanity and the world';

  @override
  String get genreMessageScience1 => 'You\'re a curious explorer!';

  @override
  String get genreMessageScience2 => 'Uncovering the principles of the world';

  @override
  String get genreMessageScience3 => 'A scientific thinker';

  @override
  String get genreMessageHistory1 => 'You find wisdom in history';

  @override
  String get genreMessageHistory2 => 'Seeing the future through the past';

  @override
  String get genreMessageHistory3 => 'You have the spirit of a history buff';

  @override
  String get genreMessageEssay1 => 'You empathize with life stories';

  @override
  String get genreMessageEssay2 =>
      'A reader who finds meaning in everyday life';

  @override
  String get genreMessageEssay3 => 'Someone with warm sensibility';

  @override
  String get genreMessagePoetry1 => 'A poet\'s soul with rich emotions';

  @override
  String get genreMessagePoetry2 =>
      'Someone who understands the beauty of language';

  @override
  String get genreMessagePoetry3 => 'You have excellent poetic sensitivity';

  @override
  String get genreMessageComic1 => 'You enjoy both fun and emotion';

  @override
  String get genreMessageComic2 =>
      'A reader who reads stories through pictures';

  @override
  String get genreMessageComic3 => 'Someone who appreciates comics';

  @override
  String get genreMessageUncategorized1 => 'You\'re exploring diverse fields!';

  @override
  String get genreMessageUncategorized2 => 'A reader without genre boundaries';

  @override
  String get genreMessageUncategorized3 =>
      'Someone who loves all kinds of books';

  @override
  String genreMessageDefault(String genre) {
    return 'You\'re an expert in $genre!';
  }

  @override
  String genreMessageDefault2(String genre) {
    return 'You have a deep interest in $genre';
  }

  @override
  String genreMessageDefault3(String genre) {
    return 'You have the qualities of a $genre enthusiast';
  }

  @override
  String get paywallTitle => 'Bookgolas Pro';

  @override
  String get paywallSubtitle => 'Unlock all features without limits';

  @override
  String get paywallBenefit1 => 'Unlimited concurrent reading';

  @override
  String get paywallBenefit2 => 'AI Recall 30 times per month';

  @override
  String get paywallBenefit3 => 'Reading insights & statistics';

  @override
  String get paywallMonthly => 'Monthly';

  @override
  String get paywallMonthlyPrice => '\$3.90';

  @override
  String get paywallPerMonth => '/mo';

  @override
  String get paywallYearly => 'Yearly';

  @override
  String get paywallYearlyPrice => '\$29.90';

  @override
  String get paywallPerYear => '/yr';

  @override
  String get paywallYearlySavings => 'Save 36% with yearly';

  @override
  String get paywallRestore => 'Restore purchases';

  @override
  String get paywallRestoreSuccess => 'Subscription restored successfully';

  @override
  String get concurrentReadingLimitTitle => 'Concurrent Reading Limit';

  @override
  String get concurrentReadingLimitMessage =>
      'Free users can read up to 3 books simultaneously. Upgrade to Pro for unlimited access.';

  @override
  String get aiRecallLimitTitle => 'AI Recall Usage Limit';

  @override
  String get aiRecallLimitMessage =>
      'You\'ve used all your AI Recall searches for this month.';

  @override
  String aiRecallRemainingUses(int count) {
    return '$count searches remaining this month';
  }

  @override
  String get subscriptionTitle => 'Subscription';

  @override
  String get subscriptionProStatus => 'Bookgolas Pro';

  @override
  String get subscriptionFreeStatus => 'Free User';

  @override
  String get subscriptionProDescription => 'Unlock all features without limits';

  @override
  String get subscriptionFreeDescription => 'Feature limits apply';

  @override
  String get subscriptionUpgradeTitle => 'Upgrade to Pro';

  @override
  String get subscriptionMonthly => 'Monthly';

  @override
  String get subscriptionMonthlyPrice => '\$3.90';

  @override
  String get subscriptionPerMonth => '/mo';

  @override
  String get subscriptionYearly => 'Yearly';

  @override
  String get subscriptionYearlyPrice => '\$29.90';

  @override
  String get subscriptionPerYear => '/yr';

  @override
  String get subscriptionYearlySavings => 'Save 36%';

  @override
  String get subscriptionBenefitsTitle => 'Pro Benefits';

  @override
  String get subscriptionBenefit1 => 'Unlimited concurrent reading';

  @override
  String get subscriptionBenefit2 => 'AI Recall 30 times per month';

  @override
  String get subscriptionBenefit3 => 'Reading insights & statistics';

  @override
  String get subscriptionManageTitle => 'Manage Subscription';

  @override
  String get subscriptionRestore => 'Restore Purchases';

  @override
  String get subscriptionManageSubscription => 'Subscription Settings';

  @override
  String get subscriptionManageSubtitle => 'Change or cancel subscription';

  @override
  String get subscriptionRestoreSuccess => 'Subscription restored successfully';

  @override
  String get subscriptionRestoreFailed => 'Restore failed';

  @override
  String get proUpgradeBannerTitle => 'Upgrade to Pro';

  @override
  String get proUpgradeBannerSubtitle => 'Unlimited reading · AI Recall';

  @override
  String get proUpgradeBannerCta => 'Upgrade Now';

  @override
  String get proUpgradeBannerMini => 'Upgrade to Pro';

  @override
  String get proUpgradeBannerMiniDesc =>
      'AI search, reading insights & all features unlimited';

  @override
  String get myPageSubscriptionUpgrade => 'Upgrade to Pro';

  @override
  String get myPageSubscriptionManage => 'Manage Subscription';

  @override
  String get myPageNotificationDisabled => 'Notifications disabled';

  @override
  String get myPageTestNotificationSent => 'Test notification sent';

  @override
  String get barcodeScannerHint => 'Align barcode within frame';

  @override
  String get scannerErrorDefault => 'Scanner error occurred';

  @override
  String get extractingText => 'Extracting text...';

  @override
  String get ocrExtractionFailed => 'Text extraction failed';

  @override
  String get extractTextConfirmTitle => 'Extract text?';

  @override
  String extractTextFreeRemaining(int remaining, int total) {
    return 'Free extractions remaining: $remaining/$total';
  }

  @override
  String get ocrProUnlimitedButton => 'Pro members get unlimited extractions!';

  @override
  String get ocrLimitReachedTitle =>
      'You\'ve used all free extractions for today';

  @override
  String get ocrLimitReachedMessage =>
      'Upgrade to Pro for unlimited\ntext extractions every day';

  @override
  String get ocrLimitReachedUpgrade => 'Upgrade to Pro';

  @override
  String get noThanksButton => 'No thanks';

  @override
  String get extractButton => 'Extract';

  @override
  String get ocrAreaSelectTitle => 'Select area to extract';

  @override
  String get imageLoadFailed => 'Failed to load image';

  @override
  String get extractTextOverwriteMessage => 'This will overwrite existing text';

  @override
  String get loadingImage => 'Loading image...';

  @override
  String get ocrReExtractionFailed => 'Re-extraction failed';

  @override
  String get reScanButton => 'Scan again';

  @override
  String get documentScanFailed => 'Document scan failed';

  @override
  String get expectedSchedule => 'Expected Schedule';

  @override
  String get dailyTargetChangeTitle => 'Change Daily Target';

  @override
  String get pagesPerDay => 'pages/day';

  @override
  String get bookInfoNotFound => 'Book info not found';

  @override
  String get goalChangeFailed => 'Failed to change goal';

  @override
  String get editReadingPlanTitle => 'Edit Reading Plan';

  @override
  String get editPlannedStartDate => 'Planned Start Date';

  @override
  String get validationEnterNumber => 'Please enter a number';

  @override
  String get validationPageMinimum => 'Page must be at least 0';

  @override
  String validationPageExceedsTotal(int totalPages) {
    return 'Cannot exceed $totalPages pages';
  }

  @override
  String validationPageBelowCurrent(int currentPage) {
    return 'Cannot be less than current page ($currentPage)';
  }

  @override
  String get updatePageTitle => 'Update Page';

  @override
  String currentPageLabel(int page) {
    return 'Current: ${page}p';
  }

  @override
  String totalPageLabel(int page) {
    return 'Total: ${page}p';
  }

  @override
  String get newPageNumber => 'New page number';

  @override
  String get updateButton => 'Update';

  @override
  String get changeTargetDateTitle => 'Change Target Date';

  @override
  String attemptChangeMessage(int attempt) {
    return 'This will start attempt #$attempt';
  }

  @override
  String get confirmChange => 'Confirm Change';

  @override
  String get searchRecordsButton => 'Search Records';

  @override
  String get resetConfirmMessage => 'Are you sure you want to reset?';

  @override
  String get resetButton => 'Reset';

  @override
  String get addRecordTitle => 'Add Record';

  @override
  String get highlightLabel => 'Highlight';

  @override
  String highlightWithCount(int count) {
    return 'Highlight ($count)';
  }

  @override
  String get extractTextButton => 'Extract Text';

  @override
  String get replaceButton => 'Replace';

  @override
  String get tapToAddImage => 'Tap to add image';

  @override
  String get optionalLabel => '(Optional)';

  @override
  String get recallPage => 'Page';

  @override
  String get recordHint => 'Record your thoughts...';

  @override
  String get recordTextLabel => 'Record Text';

  @override
  String get viewFullButton => 'View Full';

  @override
  String get clearAllButton => 'Clear All';

  @override
  String get uploadButton => 'Upload';

  @override
  String get uploading => 'Uploading...';

  @override
  String get unsavedChangesMessage => 'You have unsaved changes';

  @override
  String get discardChangesButton => 'Discard';

  @override
  String get continueEditingButton => 'Continue Editing';

  @override
  String pageExceedsTotalError(int totalPages) {
    return 'Cannot exceed total pages ($totalPages)';
  }

  @override
  String get pageNotSet => 'Page not set';

  @override
  String get textInputHint => 'Enter text...';

  @override
  String get textCopied => 'Text copied';

  @override
  String get copyButton => 'Copy';

  @override
  String get editButton => 'Edit';

  @override
  String get noRecordedText => 'No recorded text';

  @override
  String get bookInfoDetail => 'Book Details';

  @override
  String get invalidUrl => 'Invalid URL';

  @override
  String get bookReviewTabTitle => 'Review';

  @override
  String get bookDetailDeleteReading => 'Delete Reading';

  @override
  String get bookDetailSchedule => 'Reading Schedule';

  @override
  String get bookDetailGoalProgress => 'Goal Progress';

  @override
  String bookDetailAchievementStatus(int achieved, int total) {
    return '$achieved of $total days achieved';
  }

  @override
  String get bookDetailNoPhotos => 'No photos yet';

  @override
  String get bookDetailAddPhotoHint => 'Add using the + button below';

  @override
  String get memorablePagesSortByPage => 'Sort by Page';

  @override
  String get memorablePagesSortByDate => 'Sort by Date';

  @override
  String get memorablePagesDelete => 'Delete';

  @override
  String get memorablePagesDone => 'Done';

  @override
  String get memorablePagesSelect => 'Select';

  @override
  String get noProgressRecords => 'No progress records';

  @override
  String get historyTabCumulativePages => 'Cumulative Pages';

  @override
  String get historyTabDailyPages => 'Daily Pages';

  @override
  String get historyTabDailyRecords => 'Daily Records';

  @override
  String historyTabCumulativeLabel(int page) {
    return 'Cumulative: ${page}p';
  }

  @override
  String get historyTabPagesUnit => 'pages';

  @override
  String daysRecorded(int days) {
    return '$days days recorded';
  }

  @override
  String get unitPages => 'pages';

  @override
  String get bookListErrorNetworkCheck =>
      'Please check your network connection';

  @override
  String bookListCompletedIn(int days) {
    return 'Completed in $days days';
  }

  @override
  String get bookListCompletedSameDay => 'Completed same day';

  @override
  String bookListAchievementRate(int rate) {
    return 'Achievement rate $rate%';
  }

  @override
  String bookListCompletedDate(String date) {
    return 'Completed: $date';
  }

  @override
  String get bookListUnknown => 'Unknown';

  @override
  String bookListPlannedStartDate(String date) {
    return 'Start: $date';
  }

  @override
  String get bookListUndetermined => 'Start date undetermined';

  @override
  String get reviewReplaceConfirm => 'Replace with AI draft?';

  @override
  String get reviewReplaceButton => 'Replace';

  @override
  String get reviewAIDraftFailed => 'AI draft generation failed';

  @override
  String get reviewAIDraftError => 'Error generating AI draft';

  @override
  String get reviewSaveComplete => 'Review saved';

  @override
  String get reviewExitConfirm => 'Exit without saving?';

  @override
  String get reviewExitMessage => 'Your draft will be saved';

  @override
  String get aiDraftGenerating => 'AI is writing...';

  @override
  String get aiDraftGenerate => 'Generate AI Draft';

  @override
  String get reviewHint => 'Write your thoughts about the book...';

  @override
  String get bookstoreSelectTitle => 'Select Bookstore';

  @override
  String get bookstoreAladdin => 'Aladin';

  @override
  String get bookstoreKyobo => 'Kyobo';

  @override
  String get bookstoreTabNew => 'Bookstores';

  @override
  String get bookstoreTabUsed => 'Used Books';

  @override
  String get bookstoreSearchSuffix => 'search';

  @override
  String get bookstoreAladdinUsed => 'Aladin Used';

  @override
  String get bookstoreAladdinUsedStore => 'Aladin Used Store';

  @override
  String get bookstoreYes24Used => 'Yes24 Used';

  @override
  String get bookInfoTitleCopied => 'Title copied';

  @override
  String get bookInfoExpandTitle => 'Show full title';

  @override
  String get bookInfoCollapseTitle => 'Collapse';

  @override
  String get expandedNavBackToDetail => 'Back to Detail';

  @override
  String get highlightEditTitle => 'Edit Highlight';

  @override
  String get highlightEditDone => 'Done';

  @override
  String get datePickerMonthJan => 'Jan';

  @override
  String get datePickerMonthFeb => 'Feb';

  @override
  String get datePickerMonthMar => 'Mar';

  @override
  String get datePickerMonthApr => 'Apr';

  @override
  String get datePickerMonthMay => 'May';

  @override
  String get datePickerMonthJun => 'Jun';

  @override
  String get datePickerMonthJul => 'Jul';

  @override
  String get datePickerMonthAug => 'Aug';

  @override
  String get datePickerMonthSep => 'Sep';

  @override
  String get datePickerMonthOct => 'Oct';

  @override
  String get datePickerMonthNov => 'Nov';

  @override
  String get datePickerMonthDec => 'Dec';

  @override
  String get koreanDatePickerYear => '';

  @override
  String get koreanDatePickerMonth => '';

  @override
  String get koreanDatePickerDay => '';

  @override
  String get recommendationViewDetail => 'View Details';

  @override
  String get recommendationViewDetailSubtitle => 'Check book info';

  @override
  String get recommendationStartReading => 'Start Reading';

  @override
  String get recommendationStartReadingSubtitle => 'Begin reading this book';

  @override
  String get recommendationBookstoreSelect => 'Select Bookstore';

  @override
  String get aiFeaturesTitle => 'AI Features';

  @override
  String get bookRecommendButton => 'Book Recommendations';

  @override
  String get homeViewAllBooksMessage => 'Showing all books';

  @override
  String get homeViewReadingMessage => 'Showing reading books only';

  @override
  String get homeViewAllBooks => 'View All Books';

  @override
  String get homeViewReadingOnly => 'Reading Only';

  @override
  String get myLibraryTabReading => 'Reading';

  @override
  String get myLibraryTabReview => 'Reviews';

  @override
  String get myLibraryTabRecord => 'Records';

  @override
  String get myLibrarySearchHint => 'Search books...';

  @override
  String get myLibraryFilterAll => 'All';

  @override
  String get myLibraryNoSearchResults => 'No search results';

  @override
  String get myLibraryNoBooks => 'No books yet';

  @override
  String get myLibraryNoReviewBooks => 'No review books';

  @override
  String get myLibraryNoRecords => 'No records yet';

  @override
  String get myLibraryAiSearch => 'AI Search';

  @override
  String get myLibraryFilterHighlight => 'Highlights';

  @override
  String get myLibraryFilterMemo => 'Memos';

  @override
  String get myLibraryFilterPhoto => 'Photos';

  @override
  String get onboardingTitle1 => 'Track Your Reading';

  @override
  String get onboardingDescription1 =>
      'Set daily reading goals and track your progress';

  @override
  String get onboardingTitle2 => 'Save Memorable Moments';

  @override
  String get onboardingDescription2 =>
      'Capture highlights and thoughts from your books';

  @override
  String get onboardingTitle3 => 'Achieve Your Goals';

  @override
  String get onboardingDescription3 =>
      'Complete books and celebrate your achievements';

  @override
  String totalDaysFormat(int days) {
    return '$days days total';
  }

  @override
  String attemptOrdinal(int attempt) {
    return 'Attempt #$attempt';
  }

  @override
  String streakDaysAchieved(int days) {
    return '$days day streak!';
  }

  @override
  String pagesRemaining(int pages) {
    return '$pages pages remaining';
  }

  @override
  String todayGoalWithPages(int pages) {
    return 'Today\'s goal: ${pages}p';
  }

  @override
  String pagesRemainingShort(int pages) {
    return '${pages}p remaining';
  }

  @override
  String pagesRemainingWithDays(int days) {
    return ' · D-$days';
  }

  @override
  String todayGoalChanged(int pages) {
    return 'Today\'s goal changed to ${pages}p';
  }

  @override
  String get chartAiInsightTitle => 'AI Insight';

  @override
  String get chartAiInsightClearMemory => 'Clear Memory';

  @override
  String get chartAiInsightClearMemoryTitle => 'Clear AI Memory?';

  @override
  String get chartAiInsightClearMemoryMessage =>
      'Previous analysis will be deleted';

  @override
  String get chartAiInsightClearMemoryCancel => 'Cancel';

  @override
  String get chartAiInsightClearMemoryConfirm => 'Clear';

  @override
  String get chartAiInsightAnalyzing => 'Analyzing...';

  @override
  String get chartAiInsightUnknownError => 'Unknown error occurred';

  @override
  String get chartAiInsightRetry => 'Retry';

  @override
  String get chartAiInsightMinBooksRequired => 'More books needed';

  @override
  String chartAiInsightMinBooksMessage(int count) {
    return 'Complete at least $count books for AI analysis';
  }

  @override
  String get chartAiInsightMinBooksHint => 'Keep reading to unlock insights';

  @override
  String get chartAiInsightSampleLabel => 'Sample';

  @override
  String get chartAiInsightEmptyState => 'No insights yet';

  @override
  String get chartAiInsightGenerateButton => 'Generate Insight';

  @override
  String get chartAiInsightAlreadyAnalyzed => 'Already analyzed';

  @override
  String chartAnnualGoalTitle(int year) {
    return '$year Reading Goal';
  }

  @override
  String chartAnnualGoalAchieved(int count) {
    return '$count books completed!';
  }

  @override
  String chartAnnualGoalRemaining(int count) {
    return '$count books remaining';
  }

  @override
  String get chartAnnualGoalAchievedMessage =>
      'Congratulations! You achieved your goal!';

  @override
  String chartAnnualGoalAheadMessage(int diff) {
    return 'You\'re $diff books ahead!';
  }

  @override
  String get chartAnnualGoalMotivationMessage =>
      'Keep reading to reach your goal!';

  @override
  String get chartAnnualGoalSetGoal => 'Set Goal';

  @override
  String get chartAnnualGoalSetGoalMessage => 'Set your annual reading goal';

  @override
  String get chartCompletionRateLabel => 'Completion Rate';

  @override
  String chartCompletionRateBooks(int count) {
    return '$count books';
  }

  @override
  String get chartAbandonRateLabel => 'Abandoned';

  @override
  String chartAbandonRateBooks(int count) {
    return '$count books';
  }

  @override
  String get chartRetrySuccessRateLabel => 'Retry Success';

  @override
  String get chartRetrySuccessRateBooks => 'successful retries';

  @override
  String get chartCompletionRateTitle => 'Completion Rate';

  @override
  String get chartCompletionRateSummaryStarted => 'Started';

  @override
  String get chartCompletionRateSummaryCompleted => 'Completed';

  @override
  String get chartCompletionRateSummaryInProgress => 'In Progress';

  @override
  String get chartCompletionRateSummaryAbandoned => 'Abandoned';

  @override
  String get chartCompletionRateEmptyMessage => 'No completion data';

  @override
  String get chartCompletionRateEmptyHint => 'Complete a book to see stats';

  @override
  String get chartGenreAnalysisTitle => 'Genre Analysis';

  @override
  String get chartGenreAnalysisTotalCompleted => 'Total Completed';

  @override
  String get chartGenreAnalysisDiversity => 'Genre Diversity';

  @override
  String get chartGenreAnalysisEmptyMessage => 'No genre data';

  @override
  String get chartGenreAnalysisEmptyHint => 'Complete books to see analysis';

  @override
  String get chartHighlightStatsTitle => 'Highlight Stats';

  @override
  String get chartHighlightStatsHighlights => 'Highlights';

  @override
  String get chartHighlightStatsMemos => 'Memos';

  @override
  String get chartHighlightStatsPhotos => 'Photos';

  @override
  String get chartHighlightStatsByGenre => 'By Genre';

  @override
  String get chartHighlightStatsEmptyMessage => 'No highlights yet';

  @override
  String get chartHighlightStatsEmptyHint => 'Add highlights while reading';

  @override
  String chartMonthlyBooksTitle(int year) {
    return '$year Monthly Books';
  }

  @override
  String get chartMonthlyBooksThisMonth => 'This Month';

  @override
  String get chartMonthlyBooksLastMonth => 'Last Month';

  @override
  String get chartMonthlyBooksChange => 'Change';

  @override
  String get chartMonthlyBooksCustomRange => 'Custom Range';

  @override
  String get chartBookStatusTitle => 'Reading Status';

  @override
  String get chartBookStatusAnnual => 'Annual';

  @override
  String get chartBookStatusMonthly => 'Monthly';

  @override
  String get chartBookStatusWeekly => 'Weekly';

  @override
  String get chartBookStatusCustom => 'Custom';

  @override
  String get chartBookStatusTotal => 'Total';

  @override
  String get chartBookStatusDays => 'Days';

  @override
  String get chartBookStatusMaxDay => 'Max Day';

  @override
  String chartMonthlyBooksTooltip(int month, int count) {
    return '$month: $count books';
  }

  @override
  String chartReadingStreakTitle(int year) {
    return '$year Reading Activity';
  }

  @override
  String get chartReadingStreakDaysRead => 'Days Read';

  @override
  String get chartReadingStreakTotalPages => 'Total Pages';

  @override
  String get chartReadingStreakDailyAverage => 'Daily Average';

  @override
  String chartReadingStreakTooltip(int month, int day, int pages) {
    return '$month/$day: ${pages}p';
  }

  @override
  String get chartReadingStreakMonthJan => 'Jan';

  @override
  String get chartReadingStreakMonthMar => 'Mar';

  @override
  String get chartReadingStreakMonthMay => 'May';

  @override
  String get chartReadingStreakMonthJul => 'Jul';

  @override
  String get chartReadingStreakMonthSep => 'Sep';

  @override
  String get chartReadingStreakMonthNov => 'Nov';

  @override
  String get chartReadingStreakLess => 'Less';

  @override
  String get chartReadingStreakMore => 'More';

  @override
  String get chartErrorLoadFailed => 'Failed to load chart';

  @override
  String get chartErrorRetry => 'Retry';

  @override
  String get chartAiInsight => 'AI Insight';

  @override
  String get chartCompletionRate => 'Completion Rate';

  @override
  String get chartRecordsHighlights => 'Records & Highlights';

  @override
  String get chartGenreAnalysis => 'Genre Analysis';

  @override
  String get chartReadingStats => 'Reading Stats';

  @override
  String get chartTotalPages => 'Total Pages';

  @override
  String get chartDailyAvgPages => 'Daily Average';

  @override
  String get chartMaxDaily => 'Max Daily';

  @override
  String get chartConsecutiveDays => 'Consecutive Days';

  @override
  String get chartMinDaily => 'Min Daily';

  @override
  String get chartTodayGoal => 'Today\'s Goal';

  @override
  String get bookListCardOverallProgress => 'Progress';

  @override
  String get chartDailyPages => 'Daily Pages';

  @override
  String get chartCumulativePages => 'Cumulative Pages';

  @override
  String get chartDailyReadPages => 'Daily Read Pages';

  @override
  String get chartReadingProgress => 'Reading Progress';

  @override
  String get chartNoData => 'No data';

  @override
  String get chartNoReadingRecords => 'No reading records';

  @override
  String get readingProgressTitle => 'Reading Progress';

  @override
  String get readingProgressLoadFailed => 'Failed to load progress';

  @override
  String get readingProgressNoRecords => 'No progress records';

  @override
  String readingGoalSheetTitle(int year) {
    return '$year Reading Goal';
  }

  @override
  String get readingGoalSheetQuestion => 'How many books do you want to read?';

  @override
  String get readingGoalSheetRecommended => 'Recommended';

  @override
  String get readingGoalSheetBooks => 'books';

  @override
  String get readingGoalSheetCustom => 'Custom';

  @override
  String get readingGoalSheetHint => 'Enter number';

  @override
  String get readingGoalSheetCancel => 'Cancel';

  @override
  String get readingGoalSheetUpdate => 'Update';

  @override
  String get readingGoalSheetSet => 'Set Goal';

  @override
  String readingGoalSheetBooksPerMonth(String books) {
    return '$books books/month';
  }

  @override
  String get readingGoalSheetMotivation1 => 'Great start!';

  @override
  String get readingGoalSheetMotivation2 => 'Good pace!';

  @override
  String get readingGoalSheetMotivation3 => 'Ambitious reader!';

  @override
  String get readingGoalSheetMotivation4 => 'Book enthusiast!';

  @override
  String get readingGoalSheetMotivation5 => 'Reading champion!';

  @override
  String get readingStartPriority => 'Priority';

  @override
  String get readingStartAiRecommendation => 'AI Recommendation';

  @override
  String readingStartAiRecommendationDesc(String userName) {
    return 'Books recommended based on $userName\'s reading patterns';
  }

  @override
  String get readingStartConfirm => 'Confirm';

  @override
  String readingStartPages(int pages) {
    return '$pages pages';
  }

  @override
  String get readingStartPlannedDate => 'Planned Start Date';

  @override
  String get readingStartToday => 'Today';

  @override
  String get readingStartTargetDate => 'Target Date';

  @override
  String get readingStartTargetDateNote =>
      'You can change the target date later';

  @override
  String get readingStartSaveError => 'Failed to save';

  @override
  String get readingStartReserve => 'Reserve';

  @override
  String get readingStartBegin => 'Begin';

  @override
  String get scheduleTargetDays => 'Target Days';

  @override
  String scheduleTargetDaysValue(int days) {
    return '$days days';
  }

  @override
  String get scheduleDailyGoal => 'Daily Goal';

  @override
  String get readingStatusLabel => 'Reading Status';

  @override
  String get readingStatusPlanned => 'To Read';

  @override
  String get readingStatusStartNow => 'Start Now';

  @override
  String get recallSearchAllRecords => 'Search All Records';

  @override
  String get recallSearchingAllBooks => 'Searching all books...';

  @override
  String get recallSearchAllReadingRecords => 'Search all reading records';

  @override
  String get recallAiFindsScatteredRecords =>
      'AI finds scattered records across books';

  @override
  String get recallAiAnswer => 'AI Answer';

  @override
  String get recallReferencedRecords => 'Referenced Records';

  @override
  String recallMoreBooks(int count) {
    return 'View $count more books';
  }

  @override
  String recallRecordCount(int count) {
    return '$count records';
  }

  @override
  String get recallSearchMyRecords => 'Search My Records';

  @override
  String get recallSearchingYourRecords => 'Searching your records...';

  @override
  String get recallSuggestedQuestion1 => 'What were the key takeaways?';

  @override
  String get recallSuggestedQuestion2 => 'What was mentioned about habits?';

  @override
  String get recallSuggestedQuestion3 => 'Any interesting quotes?';

  @override
  String get recallSuggestedQuestion4 => 'What inspired me most?';

  @override
  String get recallSearchCurious => 'Search for what you\'re curious about';

  @override
  String get recallFindInRecords => 'Find in highlights, notes, and photos';

  @override
  String get recallCopy => 'Copy';

  @override
  String durationSeconds(int seconds) {
    return '${seconds}s';
  }

  @override
  String durationMinutes(int minutes) {
    return '${minutes}m';
  }

  @override
  String durationHours(int hours) {
    return '${hours}h';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '${hours}h ${minutes}m';
  }

  @override
  String historyDateTimeFormat(
      int year, int month, int day, int hour, int minute) {
    return '$month/$day/$year $hour:$minute';
  }

  @override
  String get loginErrorEmailInvalid =>
      'Email address is invalid or already registered.';

  @override
  String get loginResendVerification => 'Resend verification email';

  @override
  String get loginResendVerificationSuccess =>
      'Verification email has been resent. Please check your email.';

  @override
  String get loginResendVerificationCooldown => 'Please try again in a moment.';

  @override
  String get loginErrorEmailRateLimit =>
      'Email send limit exceeded. Please try again later.';

  @override
  String get loginSignupExistingEmail =>
      'This email is already registered. Please try logging in.';

  @override
  String get bookInfoViewButton => 'View Book Info';

  @override
  String get bookInfoSheetTitle => 'Book Details';

  @override
  String get bookInfoTabDescription => 'Synopsis';

  @override
  String get bookInfoTabDetail => 'Details';

  @override
  String get bookInfoNoDescription => 'No synopsis available';

  @override
  String get bookInfoNoDetail => 'No details available';

  @override
  String get bookInfoNoIsbn => 'Cannot load details without ISBN';

  @override
  String get bookInfoPublisher => 'Publisher';

  @override
  String get bookInfoIsbn => 'ISBN';

  @override
  String get bookInfoPageCount => 'Pages';

  @override
  String get bookInfoGenre => 'Genre';

  @override
  String get bookInfoViewInBookstore => 'View in Bookstore';

  @override
  String get myPageAccountSection => 'Account';

  @override
  String get myPageAnnouncements => 'Announcements';

  @override
  String get myPageChangePassword => 'Change Password';

  @override
  String get myPageChangePasswordTitle => 'Change Password';

  @override
  String get myPageConfirmPassword => 'Confirm Password';

  @override
  String get myPageCurrentPassword => 'Current Password';

  @override
  String get myPageCurrentPasswordRequired =>
      'Please enter your current password';

  @override
  String get myPageInfoSection => 'Info';

  @override
  String get myPageLogoutAndDelete => 'Logout | Delete Account';

  @override
  String get myPageNewPassword => 'New Password';

  @override
  String get myPageNotificationAnnouncements => 'Announcements';

  @override
  String get myPageNotificationCategories => 'Notification Settings';

  @override
  String get myPageNotificationDailyReminder => 'Daily Reading Reminder';

  @override
  String get myPageNotificationGoalAlarm => 'Reading Goal Alarm';

  @override
  String get myPageNotificationEventNudge => 'Event Nudge Notifications';

  @override
  String myPageNotificationGoalAlarmSubtitle(String time) {
    return 'Check reading status daily at $time';
  }

  @override
  String get myPagePasswordChanged => 'Password changed successfully';

  @override
  String get myPagePasswordChangeFailed => 'Failed to change password';

  @override
  String get myPagePasswordMismatch => 'Passwords do not match';

  @override
  String get myPagePasswordTooShort => 'Password must be at least 6 characters';

  @override
  String myPagePasswordChangeErrorDetail(String error) {
    return 'Password change failed: $error';
  }

  @override
  String get myPageWrongCurrentPassword => 'Current password is incorrect';

  @override
  String get myPageTermsAndPolicy => 'Terms & Policy';

  @override
  String get myPageTermsOfService => 'Terms of Service';

  @override
  String get myPagePrivacyPolicy => 'Privacy Policy';

  @override
  String get myPageVersion => 'Version';

  @override
  String get bookDetailPlannedStart => 'Planned Start';

  @override
  String get bookDetailTbd => 'TBD';

  @override
  String get bookDetailRecordThoughts => 'Record your thoughts';

  @override
  String get bookDetailReviewYourWritten => 'Review your written review';

  @override
  String get bookDetailResumeReading => 'Resume Reading';

  @override
  String bookDetailAttemptCount(int count) {
    return '$count attempt';
  }

  @override
  String get bookDetailAchieveGoal => 'Achieve your reading goal!';

  @override
  String get bookDetailSaved => 'Saved';

  @override
  String get bookDetailReadingPaused => 'Reading paused';

  @override
  String get bookDetailDeleted => 'Deleted';

  @override
  String bookDetailAttemptStarted(int count) {
    return 'Attempt $count started!';
  }

  @override
  String get bookDetailSaveError =>
      'An error occurred while saving.\nPlease try again.';

  @override
  String get subscriptionUnavailable =>
      'Subscription service is currently unavailable.';

  @override
  String get myPagePasswordSameAsOld =>
      'New password must be different from the current password';

  @override
  String get passwordRecoveryTitle => 'Set New Password';

  @override
  String get passwordRecoveryDescription => 'Enter your new password';

  @override
  String get passwordRecoveryNewPassword => 'New Password';

  @override
  String get passwordRecoveryConfirmPassword => 'Confirm New Password';

  @override
  String get passwordRecoveryButton => 'Change Password';

  @override
  String get passwordRecoverySuccess =>
      'Password changed successfully. Please log in with your new password.';

  @override
  String get passwordRecoveryFailed => 'Failed to change password';

  @override
  String get shareBookCard => 'Share book card';

  @override
  String get shareBookCardError => 'An error occurred while sharing';

  @override
  String get shareStatusReading => 'Reading';

  @override
  String get shareStatusCompleted => 'Completed';

  @override
  String get shareStatusPlanned => 'To Read';

  @override
  String get shareStatusWillRetry => 'Re-reading';

  @override
  String get loginSocialGoogle => 'Continue with Google';

  @override
  String get loginSocialApple => 'Continue with Apple';

  @override
  String get pageSwipeHint => '◀ Swipe to update page ▶';

  @override
  String get webviewLoadError => 'Unable to load page';

  @override
  String get bottomBarStartReading => 'Start Reading';

  @override
  String get bottomBarRecord => 'Record';

  @override
  String get bottomBarTimerStart => 'Start Timer';

  @override
  String get bottomBarPageUpdate => 'Update Page';

  @override
  String get bottomBarAddRecord => 'Add Record';

  @override
  String get bottomBarAiRecordSearch => 'AI Record Search';
}
