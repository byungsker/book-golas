// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get appTitle => '북골라스';

  @override
  String get commonCancel => '취소';

  @override
  String get commonConfirm => '확인';

  @override
  String get commonSave => '저장';

  @override
  String get commonDelete => '삭제';

  @override
  String get commonChange => '변경';

  @override
  String get commonComplete => '완료';

  @override
  String get commonClose => '닫기';

  @override
  String get commonRetry => '다시 시도';

  @override
  String get commonNext => '다음';

  @override
  String get commonSkip => '건너뛰기';

  @override
  String get commonStart => '시작하기';

  @override
  String get navHome => '홈';

  @override
  String get navLibrary => '서재';

  @override
  String get navStats => '상태';

  @override
  String get navCalendar => '캘린더';

  @override
  String booksCount(int count) {
    return '$count권';
  }

  @override
  String daysCount(int count) {
    return '$count일';
  }

  @override
  String pagesCount(int count) {
    return '$count페이지';
  }

  @override
  String get weekdayMon => '월';

  @override
  String get weekdayTue => '화';

  @override
  String get weekdayWed => '수';

  @override
  String get weekdayThu => '목';

  @override
  String get weekdayFri => '금';

  @override
  String get weekdaySat => '토';

  @override
  String get weekdaySun => '일';

  @override
  String get timeAm => '오전';

  @override
  String get timePm => '오후';

  @override
  String get unitYear => '년';

  @override
  String get unitMonth => '월';

  @override
  String get unitDay => '일';

  @override
  String get unitHour => '시';

  @override
  String get unitMinute => '분';

  @override
  String get unitSecond => '초';

  @override
  String readingComplete(int hours, int minutes, int seconds) {
    String _temp0 = intl.Intl.pluralLogic(
      hours,
      locale: localeName,
      other: '$hours시간 $minutes분 독서 완료!',
      zero: '$minutes분 $seconds초 독서 완료!',
    );
    return '$_temp0';
  }

  @override
  String get timerStopConfirmTitle => '독서를 종료하시겠어요?';

  @override
  String timerStopConfirmMessage(String duration) {
    return '지금까지 $duration 동안 독서하셨습니다.';
  }

  @override
  String get timerContinueButton => '계속하기';

  @override
  String get timerStopButton => '종료하기';

  @override
  String get pageInputHint => '페이지 번호';

  @override
  String pageUpdateSuccess(int page) {
    return '$page 페이지로 업데이트되었습니다';
  }

  @override
  String get pageUpdateFailed => '페이지 업데이트에 실패했습니다';

  @override
  String get pageUpdateLater => '나중에 하기';

  @override
  String get statusReading => '독서 중';

  @override
  String get statusPlanned => '읽을 예정';

  @override
  String get statusCompleted => '완독';

  @override
  String get statusReread => '다시 읽을 책';

  @override
  String get priorityUrgent => '긴급';

  @override
  String get priorityHigh => '높음';

  @override
  String get priorityMedium => '보통';

  @override
  String get priorityLow => '낮음';

  @override
  String get contentTypeHighlight => '하이라이트';

  @override
  String get contentTypeMemo => '메모';

  @override
  String get contentTypePhoto => '사진';

  @override
  String get languageSettingLabel => '언어';

  @override
  String get homeBookList => '독서 목록';

  @override
  String get bookListTabReading => '독서 중';

  @override
  String get bookListTabPlanned => '읽을 예정';

  @override
  String get bookListTabCompleted => '완독';

  @override
  String get bookListTabReread => '다시 읽을 책';

  @override
  String get bookListTabAll => '전체';

  @override
  String get bookListFilterAll => '전체';

  @override
  String get bookDetailTabRecord => '기록';

  @override
  String get bookDetailTabHistory => '히스토리';

  @override
  String get bookDetailTabReview => '독후감';

  @override
  String get bookDetailTabDetail => '상세';

  @override
  String get bookDetailStartDate => '시작일';

  @override
  String get bookDetailTargetDate => '목표일';

  @override
  String get bookDetailReviewWritten => '작성됨';

  @override
  String get bookDetailReviewNotWritten => '아직 작성되지 않음';

  @override
  String get bookDetailLegendAchieved => '달성';

  @override
  String get bookDetailLegendMissed => '미달성';

  @override
  String get bookDetailLegendScheduled => '예정';

  @override
  String get bookDetailLater => '나중에';

  @override
  String get myLibraryTitle => '나의 서재';

  @override
  String get chartTitle => '나의 독서 상태';

  @override
  String get chartTabOverview => '개요';

  @override
  String get chartTabAnalysis => '분석';

  @override
  String get chartTabActivity => '활동';

  @override
  String get chartPeriodDaily => '일별';

  @override
  String get chartPeriodWeekly => '주별';

  @override
  String get chartPeriodMonthly => '월별';

  @override
  String get chartDailyAverage => '일평균';

  @override
  String get chartIncrease => '증감';

  @override
  String get chartLess => '적음';

  @override
  String get chartMore => '많음';

  @override
  String get myPageTitle => '마이페이지';

  @override
  String get myPageSettings => '설정';

  @override
  String get myPageChangeAvatar => '변경';

  @override
  String get myPageLogout => '로그아웃';

  @override
  String get loginAppName => '북골라스';

  @override
  String get loginEmailLabel => '이메일';

  @override
  String get loginPasswordLabel => '비밀번호';

  @override
  String get loginNicknameLabel => '닉네임';

  @override
  String get loginOrDivider => '또는';

  @override
  String get loginButton => '로그인';

  @override
  String get loginSignupButton => '회원가입';

  @override
  String get loginDescriptionSignIn => '오늘도 한 페이지,\n당신의 독서를 응원합니다';

  @override
  String get loginDescriptionSignUp => '북골라스와 함께\n독서 습관을 시작해보세요';

  @override
  String get loginDescriptionForgotPassword => '가입하신 이메일로\n재설정 링크를 보내드립니다';

  @override
  String get loginEmailRequired => '이메일을 입력해주세요';

  @override
  String get loginEmailInvalid => '올바른 이메일 주소를 입력해주세요';

  @override
  String get loginPasswordHint => '6자 이상 입력해주세요';

  @override
  String get loginPasswordRequired => '비밀번호를 입력해주세요';

  @override
  String get loginPasswordMinLength => '비밀번호는 6자 이상이어야 합니다';

  @override
  String get loginNicknameHint => '앱에서 사용할 이름';

  @override
  String get loginNicknameRequired => '닉네임을 입력해주세요';

  @override
  String get loginForgotPasswordButton => '비밀번호를 잊으셨나요?';

  @override
  String get loginSignupPrompt => '계정이 없으신가요? 회원가입';

  @override
  String get loginSigninPrompt => '이미 계정이 있으신가요? 로그인';

  @override
  String get loginBackButton => '로그인으로 돌아가기';

  @override
  String get loginSaveEmail => '이메일 저장';

  @override
  String get loginResetPasswordButton => '비밀번호 재설정 이메일 보내기';

  @override
  String get loginSignupSuccess => '회원가입이 완료되었습니다. 이메일을 확인해주세요.';

  @override
  String get loginResetPasswordSuccess => '비밀번호 재설정 이메일을 보냈습니다.';

  @override
  String get loginUnexpectedError => '예상치 못한 오류가 발생했습니다.';

  @override
  String get loginInvalidCredentials => '이메일 또는 비밀번호가 올바르지 않습니다.';

  @override
  String get loginEmailNotConfirmed => '이메일 인증이 완료되지 않았습니다.';

  @override
  String get loginEmailAlreadyRegistered => '이미 등록된 이메일입니다.';

  @override
  String get loginPasswordTooShort => '비밀번호는 6자 이상이어야 합니다.';

  @override
  String get loginErrorInvalidCredentials => '이메일 또는 비밀번호가 올바르지 않습니다.';

  @override
  String get loginErrorEmailNotConfirmed => '이메일 인증이 완료되지 않았습니다.';

  @override
  String get loginErrorEmailAlreadyRegistered => '이미 등록된 이메일입니다.';

  @override
  String get loginErrorPasswordTooShort => '비밀번호는 6자 이상이어야 합니다.';

  @override
  String get loginEmailHint => '이메일을 입력하세요';

  @override
  String get loginForgotPassword => '비밀번호를 잊으셨나요?';

  @override
  String get loginNoAccount => '계정이 없으신가요?';

  @override
  String get loginHaveAccount => '이미 계정이 있으신가요?';

  @override
  String get loginBackToSignIn => '로그인으로 돌아가기';

  @override
  String get myPageDeleteAccount => '계정 삭제';

  @override
  String myPageDeleteAccountError(String error) {
    return '계정 삭제에 실패했습니다: $error';
  }

  @override
  String myPageNotificationTime(String time) {
    return '$time에 알림 설정됨';
  }

  @override
  String get myPageNotificationChangeFailed => '알림 설정 변경에 실패했습니다';

  @override
  String get myPageAvatarChanged => '프로필 사진이 변경되었습니다';

  @override
  String myPageAvatarChangeFailed(String error) {
    return '프로필 사진 변경에 실패했습니다: $error';
  }

  @override
  String get myPageNicknameHint => '닉네임을 입력하세요';

  @override
  String get languageKorean => '한국어';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageChangeConfirmTitle => '언어 변경';

  @override
  String languageChangeConfirmMessage(String language) {
    return '$language(으)로 언어를 변경하시겠습니까?';
  }

  @override
  String get myPageNoNotification => '알림 없음';

  @override
  String get myPageNotificationEnabled => '알림 활성화됨';

  @override
  String get reviewTitle => '독후감';

  @override
  String get reviewSave => '저장';

  @override
  String get reviewReplace => '대체하기';

  @override
  String get reviewExit => '나가기';

  @override
  String get readingStartSetDate => '시작일 지정';

  @override
  String get readingStartUndetermined => '미정';

  @override
  String get dialogOpacity => '투명도';

  @override
  String get dialogThickness => '굵기';

  @override
  String get dialogTakePhoto => '카메라로 촬영';

  @override
  String get dialogReplaceImage => '교체하기';

  @override
  String get dialogViewFull => '전체보기';

  @override
  String get dialogCopy => '복사하기';

  @override
  String get dialogEdit => '수정하기';

  @override
  String get dialogSaved => '저장되었습니다';

  @override
  String get dialogSaving => '저장 중...';

  @override
  String get dialogUpload => '업로드';

  @override
  String get dialogSelect => '선택';

  @override
  String get dialogApply => '적용하기';

  @override
  String get dialogExtract => '추출하기';

  @override
  String get dialogOkay => '괜찮아요';

  @override
  String get dialogExtractIt => '추출할게요';

  @override
  String get dialogThinkAboutIt => '고민해볼게요';

  @override
  String get genreNovel => '소설';

  @override
  String get genreLiterature => '문학';

  @override
  String get genreSelfHelp => '자기계발';

  @override
  String get genreBusiness => '경제경영';

  @override
  String get genreHumanities => '인문학';

  @override
  String get genreScience => '과학';

  @override
  String get genreHistory => '역사';

  @override
  String get genreEssay => '에세이';

  @override
  String get genrePoetry => '시';

  @override
  String get genreComic => '만화';

  @override
  String get genreUncategorized => '미분류';

  @override
  String get errorInitFailed => '초기화 중 오류가 발생했습니다';

  @override
  String get errorLoadFailed => '불러오기 실패';

  @override
  String get errorNoRecords => '기록이 없습니다';

  @override
  String get loadingInit => '앱을 초기화하는 중...';

  @override
  String get homeNoReadingBooks => '진행 중인 독서가 없습니다. 먼저 책을 등록해주세요.';

  @override
  String get homeNoReadingBooksShort => '진행 중인 독서가 없습니다';

  @override
  String get homeSwitchToAllBooks => '전체 독서 보기로 전환되었습니다.';

  @override
  String get homeSwitchToReadingDetail => '진행 중인 독서 보기로 전환되었습니다.';

  @override
  String get homeToggleAllBooks => '전체 독서 보기';

  @override
  String get homeToggleReadingOnly => '진행 중인 독서만 보기';

  @override
  String get bookListErrorLoadFailed => '데이터를 불러올 수 없습니다';

  @override
  String get bookListErrorCheckNetwork => '네트워크 연결을 확인해주세요';

  @override
  String get bookListEmptyPlanned => '읽을 예정인 책이 없습니다';

  @override
  String get bookListEmptyPaused => '잠시 쉬어가는 책이 없습니다';

  @override
  String get bookListEmptyAll => '아직 시작한 독서가 없습니다';

  @override
  String get bookListEmptyReading => '북골라스와 함께 독서 여정을 떠나볼까요?';

  @override
  String get bookListReadingEmptyAction => '독서 여정 떠나기';

  @override
  String get searchModeBookSearch => '도서 검색';

  @override
  String get searchModeAiRecordSearch => 'AI 기록 검색';

  @override
  String get bookListEmptyCompleted => '완독한 책이 없습니다';

  @override
  String bookListEmptyStatus(String status) {
    return '$status 책이 없습니다';
  }

  @override
  String get bookDetailScreenTitle => '독서 상세';

  @override
  String get bookDetailCompletionCongrats => '완독을 축하합니다!';

  @override
  String get bookDetailCompletionPrompt => '독서의 여운이 남아있을 때\n독후감을 작성해보시겠어요?';

  @override
  String get bookDetailWriteReview => '독후감 쓰러가기';

  @override
  String get bookDetailEditReview => '독후감 수정하기';

  @override
  String get bookDetailReviewDescription => '책을 읽고 느낀 점을 기록해보세요';

  @override
  String get bookDetailReviewEditDescription => '작성한 독후감을 다시 확인하고 수정해보세요';

  @override
  String get bookDetailContinueReading => '독서 다시 시작하기';

  @override
  String get bookDetailContinueReadingDesc => '이번에도 몰입해서 독서 목표를 달성해보아요!';

  @override
  String get bookDetailRestartReading => '이어서 독서하기';

  @override
  String get bookDetailPlannedStartDate => '독서 시작 예정';

  @override
  String get bookDetailPlannedStartDateUndetermined => '시작일 미정';

  @override
  String get bookDetailPlanUpdated => '독서 계획이 수정되었습니다';

  @override
  String bookDetailPausedPosition(
      int currentPage, int totalPages, int percentage) {
    return '중단 위치: ${currentPage}p / ${totalPages}p ($percentage%)';
  }

  @override
  String bookDetailAttemptStart(int attemptNumber) {
    return '$attemptNumber번째 도전을 시작합니다';
  }

  @override
  String bookDetailAttemptStartWithDays(int attemptNumber, int daysLeft) {
    return '$attemptNumber번째 도전 시작! D-$daysLeft';
  }

  @override
  String bookDetailAttemptStartEncouragement(int attemptNumber) {
    return '$attemptNumber번째 도전 시작! 화이팅!';
  }

  @override
  String get bookDetailGoalAchieved => '목표 달성!';

  @override
  String bookDetailPagesRead(int pagesRead, int pagesLeft) {
    return '+$pagesRead 페이지! 오늘 목표까지 ${pagesLeft}p 남음';
  }

  @override
  String bookDetailPagesReached(int pagesRead, int currentPage) {
    return '+$pagesRead 페이지! ${currentPage}p 도달';
  }

  @override
  String get bookDetailRecordSaved => '기록이 저장되었습니다';

  @override
  String get bookDetailUploadFailed => '업로드 실패';

  @override
  String get bookDetailNetworkError =>
      '네트워크 연결을 확인해주세요.\n연결 상태가 양호하면 다시 시도해주세요.';

  @override
  String get bookDetailUploadError =>
      '기록을 저장하는 중 오류가 발생했습니다.\n업로드 버튼을 눌러 다시 시도해주세요.';

  @override
  String get bookDetailImageReplaced => '이미지가 교체되었습니다';

  @override
  String get bookDetailDeleteConfirmTitle => '독서를 삭제하시겠습니까?';

  @override
  String get bookDetailDeleteConfirmMessage => '삭제된 독서 기록은 복구할 수 없습니다.';

  @override
  String get bookDetailDeleteSuccess => '독서가 삭제되었습니다';

  @override
  String get bookDetailDeleteImageConfirmTitle => '삭제하시겠습니까?';

  @override
  String get bookDetailDeleteImageConfirmMessage => '이 항목을 삭제하면 복구할 수 없습니다.';

  @override
  String bookDetailItemsDeleted(int count) {
    return '$count개 항목이 삭제되었습니다';
  }

  @override
  String get bookDetailPauseReadingMessage => '독서를 잠시 쉬어갑니다. 언제든 다시 시작하세요!';

  @override
  String get bookDetailNewJourneyStart => '새로운 독서 여정을 시작합니다! 화이팅! 📚';

  @override
  String get bookDetailNoteStructure => '노트 구조화';

  @override
  String get bookDetailPriorityUrgent => '긴급';

  @override
  String get bookDetailPriorityHigh => '높음';

  @override
  String get bookDetailPriorityMedium => '보통';

  @override
  String get bookDetailPriorityLow => '낮음';

  @override
  String get bookDetailError => '오류가 발생했습니다';

  @override
  String get calendarMonthSelect => '월 선택';

  @override
  String get calendarCancel => '취소';

  @override
  String get calendarConfirm => '확인';

  @override
  String calendarPagesRead(int pages) {
    return '$pages페이지 읽음';
  }

  @override
  String get calendarCompleted => '완독';

  @override
  String get calendarSelectMonth => '월 선택';

  @override
  String get calendarFilterAll => '전체';

  @override
  String get calendarFilterReading => '읽고 있는 책';

  @override
  String get calendarFilterCompleted => '완독한 책';

  @override
  String get calendarLoadError => '데이터를 불러오는데 실패했습니다';

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
  String get myPageNotificationTimeTitle => '알림 시간 설정';

  @override
  String get myPageDarkMode => '다크 모드';

  @override
  String get myPageDailyReadingNotification => '매일 독서 목표 알림';

  @override
  String get myPageNoNotifications => '알림을 받지 않습니다';

  @override
  String get myPageNotificationsEnabled => '알림이 활성화되었습니다';

  @override
  String get myPageNotificationsDisabled => '알림이 비활성화되었습니다';

  @override
  String get myPageNotificationSettingsFailed => '알림 설정 변경에 실패했습니다';

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
    return '알림 시간이 $time으로 변경되었습니다';
  }

  @override
  String get myPageNotificationTimeChangeFailed => '알림 시간 변경에 실패했습니다';

  @override
  String myPageDailyReadingNotificationSubtitle(String time) {
    return '매일 $time에 알림';
  }

  @override
  String get reviewDraftLoaded => '임시 저장된 내용을 불러왔습니다.';

  @override
  String get reviewCopied => '독후감이 복사되었습니다.';

  @override
  String get reviewBookNotFound => '책 정보를 찾을 수 없습니다.';

  @override
  String get reviewSaveFailed => '저장에 실패했습니다. 다시 시도해주세요.';

  @override
  String get reviewSaveError => '저장 중 오류가 발생했습니다.';

  @override
  String get reviewReplaceConfirmTitle =>
      '현재 작성 중인 내용이 있습니다.\nAI 초안으로 대체하시겠습니까?';

  @override
  String get reviewAIDraftGenerated => 'AI 초안이 생성되었습니다. 자유롭게 수정해주세요!';

  @override
  String get reviewAIDraftGenerateFailed => 'AI 초안 생성에 실패했습니다. 다시 시도해주세요.';

  @override
  String get reviewAIDraftGenerateError => 'AI 초안 생성 중 오류가 발생했습니다.';

  @override
  String get reviewSaveCompleteTitle => '독후감이 저장되었습니다!';

  @override
  String get reviewSaveCompleteMessage =>
      '저장한 독후감은 \'독후감\' 탭 또는\n\'나의 서재 > 독후감\'에서 확인할 수 있어요.';

  @override
  String get reviewExitConfirmTitle => '작성 중단하고 나가시겠어요?';

  @override
  String get reviewExitConfirmSubtitle => '작성 중이던 독후감은 임시 저장됩니다.';

  @override
  String get reviewAIGenerating => 'AI가 초안을 작성하고 있어요...';

  @override
  String get reviewAIButtonLabel => 'AI로 독후감 초안 작성하기';

  @override
  String get reviewTextFieldHint =>
      '이 책을 읽고 느낀 점, 인상 깊었던 부분, 나에게 준 영감 등을 자유롭게 적어보세요.';

  @override
  String get readingStartTitle => '독서 시작하기';

  @override
  String get readingStartSubtitle => '독서를 시작할 책을 검색해보세요.';

  @override
  String get readingStartNoResults => '검색 결과가 없습니다';

  @override
  String get readingStartAnalyzing => '독서 패턴을 분석하고 있어요...';

  @override
  String get readingStartAIRecommendation => 'AI 맞춤 추천';

  @override
  String readingStartAIRecommendationDesc(String userName) {
    return '$userName님의 독서 패턴을 분석하여 추천하는 책들이에요';
  }

  @override
  String get readingStartSearchHint => '책 제목을 입력해주세요.';

  @override
  String get readingStartSelectionComplete => '선택 완료';

  @override
  String get readingStartPlannedStartDate => '독서 시작 예정일';

  @override
  String get readingStartStartingToday => '오늘부터 시작합니다';

  @override
  String get readingStartTargetDeadline => '목표 마감일';

  @override
  String get readingStartTargetDeadlineNote => '독서 시작 후에도 목표일을 변경할 수 있습니다';

  @override
  String get barcodeScannerTitle => 'ISBN 바코드 스캔';

  @override
  String get barcodeScannerInstruction => '책 뒷면의 ISBN 바코드를 스캔해주세요';

  @override
  String get barcodeScannerFrameHint => '바코드를 프레임 안에 맞춰주세요';

  @override
  String get scannerErrorPermissionDenied => '카메라 권한이 필요합니다\n설정에서 권한을 허용해주세요';

  @override
  String get scannerErrorInitializing => '카메라를 초기화하는 중입니다';

  @override
  String get scannerErrorGeneral => '카메라 오류가 발생했습니다\n다시 시도해주세요';

  @override
  String get bookDetailTabRecordLabel => '기록';

  @override
  String get bookDetailTabHistoryLabel => '히스토리';

  @override
  String get bookDetailTabDetailLabel => '상세';

  @override
  String get highlightOpacity => '투명도';

  @override
  String get highlightThickness => '굵기';

  @override
  String get todayGoalSettingTitle => '오늘의 분량 설정';

  @override
  String get todayGoalStartPageLabel => '시작 페이지';

  @override
  String get todayGoalTargetPageLabel => '목표 페이지';

  @override
  String get bookStatusCompleted => '완독';

  @override
  String get bookStatusPlanned => '읽을 예정';

  @override
  String get bookStatusReread => '다시 읽을 책';

  @override
  String get bookStatusReading => '독서 중';

  @override
  String get bookCompletionCongrats => '완독을 축하합니다!';

  @override
  String get bookCompletionQuestion => '이 책은 어땠나요?';

  @override
  String get reviewOneLinePlaceholder => '한줄평 (선택사항)';

  @override
  String get reviewOneLineHint => '이 책을 한 마디로 표현하면...';

  @override
  String get bookCompletionLater => '나중에';

  @override
  String get bookCompletionDone => '완료';

  @override
  String get ratingBad => '아쉬웠어요 😢';

  @override
  String get ratingOkay => '그저 그랬어요 😐';

  @override
  String get ratingGood => '괜찮았어요 🙂';

  @override
  String get ratingGreat => '재미있었어요! 😊';

  @override
  String get ratingExcellent => '최고였어요! 🤩';

  @override
  String get recordSearch => '기록 검색';

  @override
  String get pageUpdate => '페이지 업데이트';

  @override
  String get dayLabels => '일,월,화,수,목,금,토';

  @override
  String streakAchieved(int streak) {
    return '$streak일 연속 달성!';
  }

  @override
  String get streakFirstRecord => '오늘 첫 기록을 남겨보세요';

  @override
  String get mindmapInsufficientData =>
      '독서 기록이 부족합니다.\n최소 5개 이상의 하이라이트나 메모가 필요합니다.';

  @override
  String get contentBadgeHighlight => '하이라이트';

  @override
  String get contentBadgeMemo => '메모';

  @override
  String get contentBadgeOCR => '사진 OCR';

  @override
  String get readingScheduleStartDate => '시작일';

  @override
  String get readingScheduleTargetDate => '목표일';

  @override
  String readingScheduleTotalDays(int totalDays) {
    return '($totalDays일)';
  }

  @override
  String readingScheduleAttempt(int attemptCount) {
    return '$attemptCount번째';
  }

  @override
  String get pageUpdateDialogTitle => '현재 페이지 업데이트';

  @override
  String get pageUpdateValidationRequired => '숫자를 입력해주세요';

  @override
  String get pageUpdateValidationNonNegative => '0 이상의 페이지를 입력해주세요';

  @override
  String pageUpdateValidationExceedsTotal(int totalPages) {
    return '총 페이지($totalPages)를 초과할 수 없습니다';
  }

  @override
  String pageUpdateValidationLessThanCurrent(int currentPage) {
    return '현재 페이지($currentPage) 이하입니다';
  }

  @override
  String pageUpdateCurrentPage(int currentPage) {
    return '현재 ${currentPage}p';
  }

  @override
  String pageUpdateTotalPages(int totalPages) {
    return ' / 총 ${totalPages}p';
  }

  @override
  String get pageUpdateNewPageLabel => '새 페이지 번호';

  @override
  String get pageUpdateCancel => '취소';

  @override
  String get pageUpdateButton => '업데이트';

  @override
  String get imageSourceDocumentScan => '문서 스캔';

  @override
  String get imageSourceDocumentScanDesc => '문서를 자동으로 인식하고 왜곡을 보정해요';

  @override
  String get imageSourceAutoCorrection => '평탄화 및 자동 보정';

  @override
  String get imageSourceSimulatorError => '시뮬레이터에서는 카메라를 사용할 수 없습니다';

  @override
  String get imageSourceTakePhoto => '카메라 촬영하기';

  @override
  String get imageSourceGeneralPhoto => '일반 촬영';

  @override
  String get imageSourceFromLibrary => '라이브러리에서 가져오기';

  @override
  String get imageSourceSelectSaved => '저장된 이미지 선택';

  @override
  String get imageSourceReplaceTitle => '이미지 교체';

  @override
  String get imageSourceCameraTitle => '카메라로 촬영';

  @override
  String get imageSourceCameraDesc => '사진을 찍어 텍스트를 바로 추출해요';

  @override
  String get imageSourceGalleryTitle => '라이브러리에서 선택';

  @override
  String get imageSourceGalleryDesc => '이미 저장된 이미지에서 텍스트를 추출해요';

  @override
  String get imageSourceReplaceConfirmation => '이미지를 교체하시겠습니까?';

  @override
  String get imageSourceReplaceWarning => '기존에 추출한 텍스트가 사라집니다.';

  @override
  String get dailyTargetDialogTitle => '일일 목표 페이지 변경';

  @override
  String get dailyTargetScheduleHeader => '예상 스케줄';

  @override
  String get dailyTargetPagesPerDay => '페이지/일';

  @override
  String dailyTargetPagesLeft(int pagesLeft) {
    return '$pagesLeft페이지';
  }

  @override
  String dailyTargetDaysLeft(int daysLeft) {
    return ' 남았어요 · D-$daysLeft';
  }

  @override
  String get dailyTargetChangeButton => '변경';

  @override
  String get dailyTargetNotFound => '도서 정보를 찾을 수 없습니다';

  @override
  String dailyTargetUpdateSuccess(int newDailyTarget) {
    return '오늘 목표: ${newDailyTarget}p로 변경되었습니다';
  }

  @override
  String dailyTargetUpdateError(String error) {
    return '목표 변경에 실패했습니다: $error';
  }

  @override
  String get editPlannedBookTitle => '독서 계획 수정';

  @override
  String get editPlannedBookStartDate => '시작 예정일';

  @override
  String get editPlannedBookCancel => '취소';

  @override
  String get editPlannedBookSave => '저장';

  @override
  String get updateTargetDateTitle => '목표일 변경';

  @override
  String updateTargetDateAttempt(int nextAttemptCount) {
    return '$nextAttemptCount번째 도전으로 변경됩니다';
  }

  @override
  String updateTargetDateFormatted(int year, int month, int day) {
    return '$year년 $month월 $day일';
  }

  @override
  String get updateTargetDateCancel => '취소';

  @override
  String get updateTargetDateButton => '변경하기';

  @override
  String get reviewLinkSectionTitle => '관련 링크';

  @override
  String get reviewLinkAladinTitle => '알라딘에서 보기';

  @override
  String get reviewLinkAladinSubtitle => '도서 상세 정보';

  @override
  String get reviewLinkViewButton => '독후감 보기';

  @override
  String get reviewLinkAddButton => '독후감 링크 추가';

  @override
  String get reviewLinkViewDescription => '내가 작성한 독후감';

  @override
  String get reviewLinkAddDescription => '블로그, 노션 등 독후감 링크를 추가하세요';

  @override
  String get reviewLinkDialogTitle => '독후감 링크';

  @override
  String get reviewLinkDialogHint => '블로그, 노션, 브런치 등 독후감 링크를 입력하세요';

  @override
  String get reviewLinkInvalidUrl => '올바른 URL을 입력해주세요';

  @override
  String get reviewLinkUrlLabel => '독후감 URL';

  @override
  String get reviewLinkDeleteButton => '삭제';

  @override
  String get reviewLinkSaveButton => '저장';

  @override
  String get existingImageEditingWarning => '수정 중인 내용이 있습니다.';

  @override
  String get existingImageDiscardChanges => '변경사항 무시';

  @override
  String get existingImageContinueEditing => '이어서 하기';

  @override
  String existingImageExceedsTotal(int totalPages) {
    return '총 페이지 수($totalPages)를 초과할 수 없습니다';
  }

  @override
  String get existingImageSaved => '저장되었습니다';

  @override
  String get existingImageCloseButton => '닫기';

  @override
  String get existingImageCancelButton => '취소';

  @override
  String get existingImagePageNotSet => '페이지 미설정';

  @override
  String get existingImageSavingButton => '저장 중...';

  @override
  String get existingImageSaveButton => '저장';

  @override
  String get existingImageDeleteButton => '삭제';

  @override
  String get existingImageTextHint => '텍스트를 입력하세요...';

  @override
  String existingImageHighlightCount(int count) {
    return '하이라이트 $count';
  }

  @override
  String get existingImageHighlightLabel => '하이라이트';

  @override
  String get existingImageExtractText => '텍스트 추출';

  @override
  String get existingImageReplaceButton => '교체하기';

  @override
  String get existingImageRecordText => '기록 문구';

  @override
  String get existingImageViewAll => '전체보기';

  @override
  String get existingImageCopyMessage => '텍스트가 복사되었습니다.';

  @override
  String get existingImageCopyButton => '복사하기';

  @override
  String get existingImageEditButton => '수정하기';

  @override
  String get existingImageClearAllButton => '모두 지우기';

  @override
  String get existingImageNoRecordedText => '기록된 문구가 없습니다.';

  @override
  String get addMemorablePageCreditWarning => '소모된 크레딧은 복구되지 않습니다.';

  @override
  String addMemorablePageExceedsTotal(int totalPages) {
    return '총 페이지 수($totalPages)를 초과할 수 없습니다';
  }

  @override
  String get addMemorablePageExceedsError => '전체 페이지 수를 초과할 수 없습니다.';

  @override
  String get addMemorablePageResetConfirm => '내용을 정말 초기화하시겠어요?';

  @override
  String get addMemorablePageResetCancel => '취소';

  @override
  String get addMemorablePageResetButton => '초기화';

  @override
  String get addMemorablePageTitle => '기록 추가';

  @override
  String get addMemorablePageResetTitle => '초기화';

  @override
  String addMemorablePageHighlightCount(int count) {
    return '하이라이트 ($count)';
  }

  @override
  String get addMemorablePageHighlightLabel => '하이라이트';

  @override
  String get addMemorablePageExtractText => '텍스트 추출';

  @override
  String get addMemorablePageReplaceButton => '교체하기';

  @override
  String get addMemorablePageAddImage => '터치하여 이미지 추가';

  @override
  String get addMemorablePageOptional => '(선택사항)';

  @override
  String get addMemorablePagePageCount => '페이지 수';

  @override
  String get addMemorablePageTextHint => '인상 깊은 대목을 기록해보세요.';

  @override
  String get addMemorablePageRecordText => '기록 문구';

  @override
  String get addMemorablePageViewAll => '전체보기';

  @override
  String get addMemorablePageClearAll => '모두 지우기';

  @override
  String get addMemorablePageUploadButton => '업로드';

  @override
  String get addMemorablePageUploading => '업로드 중...';

  @override
  String get pauseReadingTitle => '잠시 쉬어가기';

  @override
  String pauseReadingMessage(int progress, int currentPage, int totalPages) {
    return '현재 진행률 $progress% ($currentPage / $totalPages 페이지)에서\n독서를 잠시 중단합니다.';
  }

  @override
  String get pauseReadingEncouragement => '언제든지 다시 시작할 수 있어요!';

  @override
  String get pauseReadingCancel => '취소';

  @override
  String get pauseReadingButton => '잠시 쉬어가기';

  @override
  String get readingManagementTitle => '독서 관리';

  @override
  String readingManagementProgress(
      int progress, int currentPage, int totalPages) {
    return '현재 $progress% 진행 중이에요 ($currentPage / $totalPages 페이지)';
  }

  @override
  String get readingManagementPauseLabel => '잠시 쉬어가기';

  @override
  String get readingManagementPauseDesc => '나중에 다시 읽을 수 있어요';

  @override
  String get readingManagementDeleteLabel => '삭제하기';

  @override
  String get readingManagementDeleteDesc => '독서 기록이 삭제됩니다';

  @override
  String get readingManagementThinkAbout => '고민해볼게요';

  @override
  String get bookReviewTabNoReview => '아직 독후감이 없습니다';

  @override
  String get bookReviewTabDescription => '책을 읽고 느낀 점을 기록해보세요';

  @override
  String get bookReviewTabWriteButton => '독후감 작성하기';

  @override
  String get bookReviewTabMyReview => '나의 독후감';

  @override
  String get bookReviewTabEditButton => '독후감 수정하기';

  @override
  String dashboardProgressPagesLeft(int pagesLeft) {
    return '$pagesLeft페이지';
  }

  @override
  String get dashboardProgressRemaining => ' 남았어요';

  @override
  String dashboardProgressDailyTarget(int dailyTarget) {
    return '오늘 목표: ${dailyTarget}p';
  }

  @override
  String get dashboardProgressAchieved => '목표 달성';

  @override
  String get detailTabManagement => '독서 관리';

  @override
  String get detailTabManagementDesc => '쉬어가기, 삭제 등';

  @override
  String get detailTabDeleteReading => '독서 삭제';

  @override
  String get detailTabReview => '독후감';

  @override
  String get detailTabReviewWritten => '작성됨';

  @override
  String get detailTabReviewNotWritten => '아직 작성되지 않음';

  @override
  String get detailTabReviewDescription => '책을 읽고 느낀 점을 기록해보세요';

  @override
  String get detailTabSchedule => '독서 일정';

  @override
  String get detailTabScheduleStartDate => '시작일';

  @override
  String get detailTabScheduleTargetDate => '목표일';

  @override
  String detailTabAttempt(int attemptCount, String attemptEncouragement) {
    return '$attemptCount번째 · $attemptEncouragement';
  }

  @override
  String get detailTabChangeButton => '변경';

  @override
  String get detailTabGoalAchievement => '목표 달성 현황';

  @override
  String detailTabAchievementStats(int passedDays, int achievedCount) {
    return '$passedDays일 중 $achievedCount일 달성';
  }

  @override
  String get detailTabLegendAchieved => '달성';

  @override
  String get detailTabLegendMissed => '미달성';

  @override
  String get detailTabLegendScheduled => '예정';

  @override
  String get memorablePagesNoImages => '아직 추가된 사진이 없습니다';

  @override
  String get memorablePagesAddPrompt => '하단 + 버튼으로 추가해보세요';

  @override
  String memorablePagesSelected(int count) {
    return '$count개 선택됨';
  }

  @override
  String get memorablePagesSortPageDesc => '페이지 높은순';

  @override
  String get memorablePagesSortPageAsc => '페이지 낮은순';

  @override
  String get memorablePagesSortDateDesc => '최근 기록순';

  @override
  String get memorablePagesSortDateAsc => '오래된 기록순';

  @override
  String get memorablePagesSortType => '페이지';

  @override
  String get memorablePagesSortDate => '날짜';

  @override
  String get memorablePagesDeleteButton => '삭제';

  @override
  String get memorablePagesCompleteButton => '완료';

  @override
  String get memorablePagesSelectButton => '선택';

  @override
  String get memorablePagesPreviewHint => '탭하여 상세 보기';

  @override
  String get fullTitleSheetTitle => '도서 제목';

  @override
  String get fullTitleSheetCopyMessage => '제목이 복사되었습니다';

  @override
  String get fullTitleSheetCopyButton => '복사하기';

  @override
  String get fullTitleSheetStoreButton => '서점에서 보기';

  @override
  String deleteConfirmationItemCount(int count) {
    return '$count개 항목을 삭제하시겠습니까?';
  }

  @override
  String get deleteConfirmationWarning => '삭제한 항목은 복구할 수 없습니다.';

  @override
  String get deleteConfirmationCancel => '취소';

  @override
  String get deleteConfirmationButton => '삭제';

  @override
  String get progressHistoryNoRecords => '진행률 기록이 없습니다';

  @override
  String get progressHistoryCumulativePages => '📈 누적 페이지';

  @override
  String progressHistoryAttempt(int attemptCount, String attemptEncouragement) {
    return '$attemptCount번째 · $attemptEncouragement';
  }

  @override
  String progressHistoryRecordDays(int recordCount) {
    return '$recordCount일 기록';
  }

  @override
  String get progressHistoryLegendCumulative => '누적 페이지';

  @override
  String get progressHistoryLegendDaily => '일일 페이지';

  @override
  String progressHistoryChartCumulative(int cumulativePage) {
    return '누적: $cumulativePage p\n';
  }

  @override
  String progressHistoryChartDaily(int dailyPage) {
    return '일일: +$dailyPage p';
  }

  @override
  String get progressHistoryMilestoneFirstCompletion => '드디어 완독!';

  @override
  String progressHistoryMilestoneFirstCompletionMsg(int attemptCount) {
    return '$attemptCount번의 도전 끝에 완독에 성공했어요. 포기하지 않은 당신이 멋져요!';
  }

  @override
  String get progressHistoryMilestoneCompletion => '완독 축하해요!';

  @override
  String get progressHistoryMilestoneCompletionMsg =>
      '목표를 달성했어요. 다음 책도 함께 읽어볼까요?';

  @override
  String get progressHistoryMilestoneRetry => '이번엔 완주해봐요';

  @override
  String progressHistoryMilestoneRetryMsg(int attemptCount) {
    return '$attemptCount번째 도전이에요. 목표일을 재설정하고 끝까지 읽어볼까요?';
  }

  @override
  String get progressHistoryMilestoneDeadlinePassed => '목표일이 지났어요';

  @override
  String get progressHistoryMilestoneDeadlinePassedMsg =>
      '괜찮아요, 새 목표일을 설정하고 다시 시작해봐요!';

  @override
  String get progressHistoryMilestoneFastPace => '놀라운 속도예요!';

  @override
  String get progressHistoryMilestoneFastPaceMsg =>
      '예상보다 훨씬 빠르게 읽고 있어요. 이 페이스면 일찍 완독할 수 있겠어요!';

  @override
  String get progressHistoryMilestoneOnTrack => '순조롭게 진행 중!';

  @override
  String get progressHistoryMilestoneOnTrackMsg =>
      '계획보다 앞서가고 있어요. 이대로만 하면 목표 달성 확실해요!';

  @override
  String get progressHistoryMilestoneOnSchedule => '계획대로 진행 중';

  @override
  String get progressHistoryMilestoneOnScheduleMsg =>
      '꾸준히 읽고 있어요. 오늘도 조금씩 읽어볼까요?';

  @override
  String get progressHistoryMilestoneBehind => '조금 더 속도를 내볼까요?';

  @override
  String get progressHistoryMilestoneBehindMsg =>
      '이번에는 꼭 완독해봐요. 매일 조금씩 더 읽으면 따라잡을 수 있어요!';

  @override
  String get progressHistoryMilestoneFallBehind => '조금 더 읽어볼까요?';

  @override
  String get progressHistoryMilestoneFallBehindMsg =>
      '계획보다 살짝 뒤처졌어요. 오늘 조금 더 읽으면 따라잡을 수 있어요!';

  @override
  String get progressHistoryMilestoneGiveUp => '포기하지 마세요!';

  @override
  String progressHistoryMilestoneGiveUpMsg(int attemptCount) {
    return '$attemptCount번째 도전 중이에요. 목표일을 조정하거나 더 집중해서 읽어봐요!';
  }

  @override
  String get progressHistoryMilestoneReset => '목표 재설정이 필요할 수도';

  @override
  String get progressHistoryMilestoneResetMsg =>
      '현재 페이스로는 목표 달성이 어려워요. 목표일을 조정해볼까요?';

  @override
  String get progressHistoryDailyRecords => '📅 일별 기록';

  @override
  String get progressHistoryPageLabel => '페이지';

  @override
  String progressHistoryCumulativeLabel(int page) {
    return '누적: $page 페이지';
  }

  @override
  String get dailyTargetConfirmTitle => '일일 목표 변경';

  @override
  String get dailyTargetConfirmMessage =>
      '오늘의 목표는 수정할 수 없지만,\n내일부터 변경된 목표가 적용됩니다.';

  @override
  String get dailyTargetConfirmQuestion => '변경하시겠어요?';

  @override
  String get dailyTargetConfirmCancel => '취소';

  @override
  String get dailyTargetConfirmButton => '변경하기';

  @override
  String get widgetExtractedTextTitle => '추출된 텍스트';

  @override
  String get widgetExtractedTextSubtitle => '추출된 내용을 확인해주세요. 직접 수정도 가능해요!';

  @override
  String get widgetExtractedTextApply => '적용하기';

  @override
  String get widgetExtractedTextCancel => '다시 선택';

  @override
  String get widgetExtractedTextHint => '텍스트를 입력하세요';

  @override
  String widgetExtractedTextPage(int pageNumber) {
    return '페이지 $pageNumber';
  }

  @override
  String get widgetFullTextTitle => '기록 문구';

  @override
  String get widgetFullTextHint => '텍스트를 입력하세요...';

  @override
  String get widgetFullTextCopied => '텍스트가 복사되었습니다.';

  @override
  String get widgetFullTextCollapse => '축소보기';

  @override
  String get widgetFullTextCopy => '복사하기';

  @override
  String get widgetFullTextEdit => '수정하기';

  @override
  String get widgetFullTextClearAll => '모두 지우기';

  @override
  String get widgetNavigationBackToDetail => '독서상세 메뉴로';

  @override
  String get widgetDatePickerYear => '년';

  @override
  String get widgetDatePickerMonth => '월';

  @override
  String get widgetDatePickerDay => '일';

  @override
  String get widgetTimePickerAm => '오전';

  @override
  String get widgetTimePickerPm => '오후';

  @override
  String get widgetTimePickerHour => '시';

  @override
  String get widgetTimePickerMinute => '분';

  @override
  String get widgetBookstoreSelectTitle => '서점 선택';

  @override
  String widgetBookstoreSearch(String searchTitle) {
    return '\"$searchTitle\" 검색';
  }

  @override
  String get widgetBookstoreAladin => '알라딘';

  @override
  String get widgetBookstoreKyobo => '교보문고';

  @override
  String get widgetHighlightEditTitle => '하이라이트 편집';

  @override
  String get widgetHighlightOpacity => '투명도';

  @override
  String get widgetHighlightStrokeWidth => '굵기';

  @override
  String get widgetPageUpdate => '페이지 업데이트';

  @override
  String get widgetRecommendationViewDetail => '책 내용 상세보기';

  @override
  String get widgetRecommendationViewDetailSubtitle => '서점에서 책 정보 확인';

  @override
  String get widgetRecommendationStartReading => '독서 시작';

  @override
  String get widgetRecommendationStartReadingSubtitle => '해당 책으로 독서 시작';

  @override
  String get widgetRecommendationSelectBookstore => '서점 선택';

  @override
  String widgetRecommendationSearchBookstore(String searchTitle) {
    return '\'$searchTitle\' 검색 결과';
  }

  @override
  String get recallTextCopied => '텍스트가 복사되었습니다';

  @override
  String get recallRecordLabel => '기록';

  @override
  String get recallGlobalSearchTitle => '모든 기록 검색';

  @override
  String get recallGlobalSearching => '모든 책에서 검색하는 중...';

  @override
  String get recallRecentGlobalSearches => '최근 전역 검색';

  @override
  String get recallGlobalEmptyTitle => '모든 독서 기록에서 검색하세요';

  @override
  String get recallGlobalEmptySubtitle => '여러 책에 흩어진 기록들을\nAI가 종합하여 찾아드립니다';

  @override
  String recallSourcesByBookCount(int count) {
    return '참고한 기록 ($count권)';
  }

  @override
  String recallMoreBooksCount(int count) {
    return '$count권 더 보기';
  }

  @override
  String get recallAIAnswer => 'AI 답변';

  @override
  String get recallGlobalSearchHint => '예: \"습관에 대해 어떤 내용이 있었지?\"';

  @override
  String get recallMyRecordsSearchTitle => '내 기록 검색';

  @override
  String get recallMyRecordsSearching => '당신의 기록을 검색하는 중...';

  @override
  String get recallRecentSearches => '최근 검색';

  @override
  String get recallSuggestedQuestions => '추천 질문';

  @override
  String get recallEmptyTitle => '궁금한 내용을 검색해보세요';

  @override
  String get recallEmptySubtitle => '하이라이트, 메모, 사진 속에서 찾아드립니다';

  @override
  String get recallRelatedRecords => '관련 기록';

  @override
  String get recallCopyButton => '복사';

  @override
  String get recallJustNow => '방금 전';

  @override
  String recallMinutesAgo(int count) {
    return '$count분 전';
  }

  @override
  String recallHoursAgo(int count) {
    return '$count시간 전';
  }

  @override
  String recallDaysAgo(int count) {
    return '$count일 전';
  }

  @override
  String get recallMyRecordsSearchHint => '예: \"저자가 습관에 대해 뭐라고 했지?\"';

  @override
  String get recallPageLabel => '페이지';

  @override
  String recallRecordCountLabel(int count) {
    return '$count개 기록';
  }

  @override
  String get recallContentCopied => '내용이 복사되었습니다';

  @override
  String get recallViewInBook => '이 책에서 보기';

  @override
  String get bookListPageUnit => '페이지';

  @override
  String completedBookDaysToComplete(int days) {
    return '$days일만에 완독';
  }

  @override
  String get completedBookSameDayComplete => '당일 완독';

  @override
  String completedBookAchievementRate(int rate) {
    return '달성률 $rate%';
  }

  @override
  String get pausedBookUnknownDate => '알 수 없음';

  @override
  String plannedBookStartDate(String date) {
    return '시작 예정: $date';
  }

  @override
  String get plannedBookStartDateUndetermined => '시작일 미정';

  @override
  String get prioritySelectorLabel => '우선순위 (선택사항)';

  @override
  String get statusSelectorLabel => '독서 상태';

  @override
  String get statusPlannedLabel => '읽을 예정';

  @override
  String get statusReadingLabel => '바로 시작';

  @override
  String get contentTypeNote => '메모';

  @override
  String get genreBusinessEconomics => '경제경영';

  @override
  String get genreMessageNovel1 => '당신은 문학 소년이군요!';

  @override
  String get genreMessageNovel2 => '이야기 속에서 살고 있는 당신';

  @override
  String get genreMessageNovel3 => '소설의 세계에 푹 빠진 독서가';

  @override
  String get genreMessageLiterature1 => '당신은 문학 소년이군요!';

  @override
  String get genreMessageLiterature2 => '문학의 깊이를 아는 독자';

  @override
  String get genreMessageLiterature3 => '글의 아름다움을 즐기는 분';

  @override
  String get genreMessageSelfHelp1 => '끊임없이 성장하는 당신!';

  @override
  String get genreMessageSelfHelp2 => '발전을 멈추지 않는 독서가';

  @override
  String get genreMessageSelfHelp3 => '더 나은 내일을 준비하는 중';

  @override
  String get genreMessageBusiness1 => '비즈니스 마인드가 뛰어나시네요!';

  @override
  String get genreMessageBusiness2 => '성공을 향해 달려가는 중';

  @override
  String get genreMessageBusiness3 => '미래의 CEO 감이에요';

  @override
  String get genreMessageHumanities1 => '깊이 있는 사색을 즐기시는군요';

  @override
  String get genreMessageHumanities2 => '철학적 사유를 즐기는 독자';

  @override
  String get genreMessageHumanities3 => '인간과 세상을 탐구하는 분';

  @override
  String get genreMessageScience1 => '호기심 많은 탐험가시네요!';

  @override
  String get genreMessageScience2 => '세상의 원리를 파헤치는 중';

  @override
  String get genreMessageScience3 => '과학적 사고의 소유자';

  @override
  String get genreMessageHistory1 => '역사에서 지혜를 찾는 분이시네요';

  @override
  String get genreMessageHistory2 => '과거를 통해 미래를 보는 눈';

  @override
  String get genreMessageHistory3 => '역사 덕후의 기질이 보여요';

  @override
  String get genreMessageEssay1 => '삶의 이야기에 공감하시는 분';

  @override
  String get genreMessageEssay2 => '일상 속 의미를 찾는 독자';

  @override
  String get genreMessageEssay3 => '따뜻한 감성의 소유자';

  @override
  String get genreMessagePoetry1 => '감성이 풍부한 시인의 영혼';

  @override
  String get genreMessagePoetry2 => '언어의 아름다움을 아는 분';

  @override
  String get genreMessagePoetry3 => '시적 감수성이 뛰어나시네요';

  @override
  String get genreMessageComic1 => '재미와 감동을 동시에 즐기는 분';

  @override
  String get genreMessageComic2 => '그림으로 이야기를 읽는 독자';

  @override
  String get genreMessageComic3 => '만화의 매력을 아는 분';

  @override
  String get genreMessageUncategorized1 => '다양한 분야를 섭렵하는 중!';

  @override
  String get genreMessageUncategorized2 => '장르를 가리지 않는 독서가';

  @override
  String get genreMessageUncategorized3 => '책이라면 다 좋아하시는 분';

  @override
  String genreMessageDefault(String genre) {
    return '$genre 분야의 전문가시네요!';
  }

  @override
  String genreMessageDefault2(String genre) {
    return '$genre에 깊은 관심을 가지신 분';
  }

  @override
  String genreMessageDefault3(String genre) {
    return '$genre 마니아의 기질이 보여요';
  }

  @override
  String get paywallTitle => 'Bookgolas Pro';

  @override
  String get paywallSubtitle => '모든 기능을 제한 없이 사용하세요';

  @override
  String get paywallBenefit1 => '동시 읽기 무제한';

  @override
  String get paywallBenefit2 => 'AI Recall 월 30회 사용';

  @override
  String get paywallBenefit3 => '독서 인사이트 및 통계';

  @override
  String get paywallMonthly => '월간 구독';

  @override
  String get paywallMonthlyPrice => '₩3,900';

  @override
  String get paywallPerMonth => '/월';

  @override
  String get paywallYearly => '연간 구독';

  @override
  String get paywallYearlyPrice => '₩29,900';

  @override
  String get paywallPerYear => '/년';

  @override
  String get paywallYearlySavings => '연간 구독 시 36% 절약';

  @override
  String get paywallRestore => '이전 구매 복원';

  @override
  String get paywallRestoreSuccess => '구독이 복원되었습니다';

  @override
  String get concurrentReadingLimitTitle => '동시 읽기 제한';

  @override
  String get concurrentReadingLimitMessage =>
      '무료 사용자는 동시에 3권까지 읽을 수 있습니다. Pro로 업그레이드하여 무제한으로 이용하세요.';

  @override
  String get aiRecallLimitTitle => 'AI Recall 사용량 초과';

  @override
  String get aiRecallLimitMessage => '이번 달 AI Recall 사용 횟수를 모두 소진했습니다.';

  @override
  String aiRecallRemainingUses(int count) {
    return '이번 달 남은 횟수: $count회';
  }

  @override
  String get subscriptionTitle => '구독 관리';

  @override
  String get subscriptionProStatus => 'Bookgolas Pro';

  @override
  String get subscriptionFreeStatus => '무료 사용자';

  @override
  String get subscriptionProDescription => '모든 기능을 무제한으로 이용하세요';

  @override
  String get subscriptionFreeDescription => '기능 제한이 적용됩니다';

  @override
  String get subscriptionUpgradeTitle => 'Pro로 업그레이드';

  @override
  String get subscriptionMonthly => '월간 구독';

  @override
  String get subscriptionMonthlyPrice => '₩3,900';

  @override
  String get subscriptionPerMonth => '/월';

  @override
  String get subscriptionYearly => '연간 구독';

  @override
  String get subscriptionYearlyPrice => '₩29,900';

  @override
  String get subscriptionPerYear => '/년';

  @override
  String get subscriptionYearlySavings => '36% 절약';

  @override
  String get subscriptionBenefitsTitle => 'Pro 혜택';

  @override
  String get subscriptionBenefit1 => '동시 읽기 무제한';

  @override
  String get subscriptionBenefit2 => 'AI Recall 월 30회 사용';

  @override
  String get subscriptionBenefit3 => '독서 인사이트 및 통계';

  @override
  String get subscriptionManageTitle => '구독 관리';

  @override
  String get subscriptionRestore => '이전 구매 복원';

  @override
  String get subscriptionManageSubscription => '구독 설정';

  @override
  String get subscriptionManageSubtitle => '구독 변경 또는 해지';

  @override
  String get subscriptionRestoreSuccess => '구독이 복원되었습니다';

  @override
  String get subscriptionRestoreFailed => '복원에 실패했습니다';

  @override
  String get proUpgradeBannerTitle => 'Pro로 업그레이드';

  @override
  String get proUpgradeBannerSubtitle => '동시 읽기 · AI Recall 무제한';

  @override
  String get proUpgradeBannerCta => '업그레이드하기';

  @override
  String get proUpgradeBannerMini => 'Pro로 무제한 이용하기';

  @override
  String get proUpgradeBannerMiniDesc => 'AI 기록 검색, 독서 인사이트 등 모든 기능을 제한 없이';

  @override
  String get myPageSubscriptionUpgrade => 'Pro로 업그레이드';

  @override
  String get myPageSubscriptionManage => '구독 관리';

  @override
  String get myPageNotificationDisabled => '알림이 비활성화됨';

  @override
  String get myPageTestNotificationSent => '테스트 알림이 전송됨';

  @override
  String get barcodeScannerHint => '바코드를 프레임 안에 맞춰주세요';

  @override
  String get scannerErrorDefault => '스캐너 오류가 발생했습니다';

  @override
  String get extractingText => '텍스트 추출 중...';

  @override
  String get ocrExtractionFailed => '텍스트 추출 실패';

  @override
  String get extractTextConfirmTitle => '텍스트를 추출하시겠어요?';

  @override
  String extractTextFreeRemaining(int remaining, int total) {
    return '오늘 남은 무료 추출: $remaining/$total회';
  }

  @override
  String get ocrProUnlimitedButton => 'Pro 멤버십은 무제한으로 추출할 수 있어요!';

  @override
  String get ocrLimitReachedTitle => '오늘의 무료 추출 횟수를 모두 사용했어요';

  @override
  String get ocrLimitReachedMessage =>
      'Pro 멤버십으로 업그레이드하면\n매일 무제한으로 텍스트를 추출할 수 있어요';

  @override
  String get ocrLimitReachedUpgrade => 'Pro로 업그레이드';

  @override
  String get noThanksButton => '괜찮아요';

  @override
  String get extractButton => '추출하기';

  @override
  String get ocrAreaSelectTitle => '추출할 영역 선택';

  @override
  String get imageLoadFailed => '이미지 로드 실패';

  @override
  String get extractTextOverwriteMessage => '기존 텍스트를 덮어씁니다';

  @override
  String get loadingImage => '이미지 로딩 중...';

  @override
  String get ocrReExtractionFailed => '재추출 실패';

  @override
  String get reScanButton => '다시 스캔';

  @override
  String get documentScanFailed => '문서 스캔 실패';

  @override
  String get expectedSchedule => '예상 스케줄';

  @override
  String get dailyTargetChangeTitle => '일일 목표 변경';

  @override
  String get pagesPerDay => '페이지/일';

  @override
  String get bookInfoNotFound => '책 정보를 찾을 수 없습니다';

  @override
  String get goalChangeFailed => '목표 변경 실패';

  @override
  String get editReadingPlanTitle => '독서 계획 수정';

  @override
  String get editPlannedStartDate => '시작 예정일';

  @override
  String get validationEnterNumber => '숫자를 입력해주세요';

  @override
  String get validationPageMinimum => '페이지는 0 이상이어야 합니다';

  @override
  String validationPageExceedsTotal(int totalPages) {
    return '총 페이지($totalPages)를 초과할 수 없습니다';
  }

  @override
  String validationPageBelowCurrent(int currentPage) {
    return '현재 페이지($currentPage)보다 작을 수 없습니다';
  }

  @override
  String get updatePageTitle => '페이지 업데이트';

  @override
  String currentPageLabel(int page) {
    return '현재: ${page}p';
  }

  @override
  String totalPageLabel(int page) {
    return '총: ${page}p';
  }

  @override
  String get newPageNumber => '새 페이지 번호';

  @override
  String get updateButton => '업데이트';

  @override
  String get changeTargetDateTitle => '목표일 변경';

  @override
  String attemptChangeMessage(int attempt) {
    return '$attempt번째 도전이 시작됩니다';
  }

  @override
  String get confirmChange => '변경 확인';

  @override
  String get searchRecordsButton => '기록 검색';

  @override
  String get resetConfirmMessage => '정말 초기화하시겠습니까?';

  @override
  String get resetButton => '초기화';

  @override
  String get addRecordTitle => '기록 추가';

  @override
  String get highlightLabel => '하이라이트';

  @override
  String highlightWithCount(int count) {
    return '하이라이트 ($count)';
  }

  @override
  String get extractTextButton => '텍스트 추출';

  @override
  String get replaceButton => '교체하기';

  @override
  String get tapToAddImage => '탭하여 이미지 추가';

  @override
  String get optionalLabel => '(선택사항)';

  @override
  String get recallPage => '페이지';

  @override
  String get recordHint => '생각을 기록해주세요...';

  @override
  String get recordTextLabel => '기록 텍스트';

  @override
  String get viewFullButton => '전체보기';

  @override
  String get clearAllButton => '전체 삭제';

  @override
  String get uploadButton => '업로드';

  @override
  String get uploading => '업로드 중...';

  @override
  String get unsavedChangesMessage => '저장되지 않은 변경 사항이 있습니다';

  @override
  String get discardChangesButton => '버리기';

  @override
  String get continueEditingButton => '계속 편집';

  @override
  String pageExceedsTotalError(int totalPages) {
    return '총 페이지($totalPages)를 초과할 수 없습니다';
  }

  @override
  String get pageNotSet => '페이지 미설정';

  @override
  String get textInputHint => '텍스트 입력...';

  @override
  String get textCopied => '텍스트 복사됨';

  @override
  String get copyButton => '복사';

  @override
  String get editButton => '수정';

  @override
  String get noRecordedText => '기록된 텍스트 없음';

  @override
  String get bookInfoDetail => '도서 상세';

  @override
  String get invalidUrl => '잘못된 URL';

  @override
  String get bookReviewTabTitle => '독후감';

  @override
  String get bookDetailDeleteReading => '독서 삭제';

  @override
  String get bookDetailSchedule => '독서 일정';

  @override
  String get bookDetailGoalProgress => '목표 진행';

  @override
  String bookDetailAchievementStatus(int achieved, int total) {
    return '$total일 중 $achieved일 달성';
  }

  @override
  String get bookDetailNoPhotos => '사진이 없습니다';

  @override
  String get bookDetailAddPhotoHint => '아래 + 버튼으로 추가하세요';

  @override
  String get memorablePagesSortByPage => '페이지순';

  @override
  String get memorablePagesSortByDate => '날짜순';

  @override
  String get memorablePagesDelete => '삭제';

  @override
  String get memorablePagesDone => '완료';

  @override
  String get memorablePagesSelect => '선택';

  @override
  String get noProgressRecords => '진행 기록 없음';

  @override
  String get historyTabCumulativePages => '누적 페이지';

  @override
  String get historyTabDailyPages => '일일 페이지';

  @override
  String get historyTabDailyRecords => '일별 기록';

  @override
  String historyTabCumulativeLabel(int page) {
    return '누적: ${page}p';
  }

  @override
  String get historyTabPagesUnit => '페이지';

  @override
  String daysRecorded(int days) {
    return '$days일 기록됨';
  }

  @override
  String get unitPages => '페이지';

  @override
  String get bookListErrorNetworkCheck => '네트워크 연결을 확인해주세요';

  @override
  String bookListCompletedIn(int days) {
    return '$days일만에 완독';
  }

  @override
  String get bookListCompletedSameDay => '당일 완독';

  @override
  String bookListAchievementRate(int rate) {
    return '달성률 $rate%';
  }

  @override
  String bookListCompletedDate(String date) {
    return '완독: $date';
  }

  @override
  String get bookListUnknown => '알 수 없음';

  @override
  String bookListPlannedStartDate(String date) {
    return '시작: $date';
  }

  @override
  String get bookListUndetermined => '시작일 미정';

  @override
  String get reviewReplaceConfirm => 'AI 초안으로 대체하시겠습니까?';

  @override
  String get reviewReplaceButton => '대체하기';

  @override
  String get reviewAIDraftFailed => 'AI 초안 생성 실패';

  @override
  String get reviewAIDraftError => 'AI 초안 생성 오류';

  @override
  String get reviewSaveComplete => '독후감 저장됨';

  @override
  String get reviewExitConfirm => '저장하지 않고 나가시겠습니까?';

  @override
  String get reviewExitMessage => '임시 저장됩니다';

  @override
  String get aiDraftGenerating => 'AI가 작성 중...';

  @override
  String get aiDraftGenerate => 'AI 초안 생성';

  @override
  String get reviewHint => '책에 대한 생각을 적어보세요...';

  @override
  String get bookstoreSelectTitle => '서점 선택';

  @override
  String get bookstoreAladdin => '알라딘';

  @override
  String get bookstoreKyobo => '교보문고';

  @override
  String get expandedNavBackToDetail => '상세로 돌아가기';

  @override
  String get highlightEditTitle => '하이라이트 수정';

  @override
  String get highlightEditDone => '완료';

  @override
  String get datePickerMonthJan => '1월';

  @override
  String get datePickerMonthFeb => '2월';

  @override
  String get datePickerMonthMar => '3월';

  @override
  String get datePickerMonthApr => '4월';

  @override
  String get datePickerMonthMay => '5월';

  @override
  String get datePickerMonthJun => '6월';

  @override
  String get datePickerMonthJul => '7월';

  @override
  String get datePickerMonthAug => '8월';

  @override
  String get datePickerMonthSep => '9월';

  @override
  String get datePickerMonthOct => '10월';

  @override
  String get datePickerMonthNov => '11월';

  @override
  String get datePickerMonthDec => '12월';

  @override
  String get koreanDatePickerYear => '년';

  @override
  String get koreanDatePickerMonth => '월';

  @override
  String get koreanDatePickerDay => '일';

  @override
  String get recommendationViewDetail => '상세 보기';

  @override
  String get recommendationViewDetailSubtitle => '도서 정보 확인';

  @override
  String get recommendationStartReading => '독서 시작';

  @override
  String get recommendationStartReadingSubtitle => '이 책으로 독서 시작';

  @override
  String get recommendationBookstoreSelect => '서점 선택';

  @override
  String get aiFeaturesTitle => 'AI 기능';

  @override
  String get bookRecommendButton => '도서 추천';

  @override
  String get homeViewAllBooksMessage => '전체 도서 보기';

  @override
  String get homeViewReadingMessage => '읽는 중인 도서만 보기';

  @override
  String get homeViewAllBooks => '전체 보기';

  @override
  String get homeViewReadingOnly => '읽는 중만';

  @override
  String get myLibraryTabReading => '읽는 중';

  @override
  String get myLibraryTabReview => '독후감';

  @override
  String get myLibraryTabRecord => '기록';

  @override
  String get myLibrarySearchHint => '도서 검색...';

  @override
  String get myLibraryFilterAll => '전체';

  @override
  String get myLibraryNoSearchResults => '검색 결과 없음';

  @override
  String get myLibraryNoBooks => '도서가 없습니다';

  @override
  String get myLibraryNoReviewBooks => '독후감 도서 없음';

  @override
  String get myLibraryNoRecords => '기록 없음';

  @override
  String get myLibraryAiSearch => 'AI 검색';

  @override
  String get myLibraryFilterHighlight => '하이라이트';

  @override
  String get myLibraryFilterMemo => '메모';

  @override
  String get myLibraryFilterPhoto => '사진';

  @override
  String get onboardingTitle1 => '독서 기록하기';

  @override
  String get onboardingDescription1 => '매일 독서 목표를 세우고 진행 상황을 추적하세요';

  @override
  String get onboardingTitle2 => '인상적인 순간 저장';

  @override
  String get onboardingDescription2 => '책에서 하이라이트와 생각을 캡처하세요';

  @override
  String get onboardingTitle3 => '목표 달성하기';

  @override
  String get onboardingDescription3 => '책을 완독하고 성과를 축하하세요';

  @override
  String totalDaysFormat(int days) {
    return '총 $days일';
  }

  @override
  String attemptOrdinal(int attempt) {
    return '$attempt번째 도전';
  }

  @override
  String streakDaysAchieved(int days) {
    return '$days일 연속 달성!';
  }

  @override
  String pagesRemaining(int pages) {
    return '$pages페이지 남음';
  }

  @override
  String todayGoalWithPages(int pages) {
    return '오늘 목표: ${pages}p';
  }

  @override
  String pagesRemainingShort(int pages) {
    return '${pages}p 남음';
  }

  @override
  String pagesRemainingWithDays(int days) {
    return ' · D-$days';
  }

  @override
  String todayGoalChanged(int pages) {
    return '오늘 목표가 ${pages}p로 변경됨';
  }

  @override
  String get chartAiInsightTitle => 'AI 인사이트';

  @override
  String get chartAiInsightClearMemory => '기억 삭제';

  @override
  String get chartAiInsightClearMemoryTitle => 'AI 기억을 삭제하시겠습니까?';

  @override
  String get chartAiInsightClearMemoryMessage => '이전 분석이 삭제됩니다';

  @override
  String get chartAiInsightClearMemoryCancel => '취소';

  @override
  String get chartAiInsightClearMemoryConfirm => '삭제';

  @override
  String get chartAiInsightAnalyzing => '분석 중...';

  @override
  String get chartAiInsightUnknownError => '알 수 없는 오류 발생';

  @override
  String get chartAiInsightRetry => '다시 시도';

  @override
  String get chartAiInsightMinBooksRequired => '더 많은 책이 필요합니다';

  @override
  String chartAiInsightMinBooksMessage(int count) {
    return 'AI 분석을 위해 최소 $count권을 완독해주세요';
  }

  @override
  String get chartAiInsightMinBooksHint => '인사이트를 잠금 해제하려면 계속 읽어주세요';

  @override
  String get chartAiInsightSampleLabel => '샘플';

  @override
  String get chartAiInsightEmptyState => '인사이트 없음';

  @override
  String get chartAiInsightGenerateButton => '인사이트 생성';

  @override
  String get chartAiInsightAlreadyAnalyzed => '이미 분석됨';

  @override
  String chartAnnualGoalTitle(int year) {
    return '$year년 독서 목표';
  }

  @override
  String chartAnnualGoalAchieved(int count) {
    return '$count권 완독!';
  }

  @override
  String chartAnnualGoalRemaining(int count) {
    return '$count권 남음';
  }

  @override
  String get chartAnnualGoalAchievedMessage => '축하합니다! 목표를 달성했습니다!';

  @override
  String chartAnnualGoalAheadMessage(int diff) {
    return '$diff권 앞서고 있습니다!';
  }

  @override
  String get chartAnnualGoalMotivationMessage => '목표 달성을 위해 계속 읽어주세요!';

  @override
  String get chartAnnualGoalSetGoal => '목표 설정';

  @override
  String get chartAnnualGoalSetGoalMessage => '연간 독서 목표를 설정하세요';

  @override
  String get chartCompletionRateLabel => '완독률';

  @override
  String chartCompletionRateBooks(int count) {
    return '$count권';
  }

  @override
  String get chartAbandonRateLabel => '포기율';

  @override
  String chartAbandonRateBooks(int count) {
    return '$count권';
  }

  @override
  String get chartRetrySuccessRateLabel => '재도전 성공률';

  @override
  String get chartRetrySuccessRateBooks => '성공한 재도전';

  @override
  String get chartCompletionRateTitle => '완독률';

  @override
  String get chartCompletionRateSummaryStarted => '시작함';

  @override
  String get chartCompletionRateSummaryCompleted => '완료함';

  @override
  String get chartCompletionRateSummaryInProgress => '진행 중';

  @override
  String get chartCompletionRateSummaryAbandoned => '포기함';

  @override
  String get chartCompletionRateEmptyMessage => '완독 데이터 없음';

  @override
  String get chartCompletionRateEmptyHint => '책을 완독하면 통계를 확인할 수 있습니다';

  @override
  String get chartGenreAnalysisTitle => '장르 분석';

  @override
  String get chartGenreAnalysisTotalCompleted => '총 완독';

  @override
  String get chartGenreAnalysisDiversity => '장르 다양성';

  @override
  String get chartGenreAnalysisEmptyMessage => '장르 데이터 없음';

  @override
  String get chartGenreAnalysisEmptyHint => '책을 완독하면 분석을 확인할 수 있습니다';

  @override
  String get chartHighlightStatsTitle => '하이라이트 통계';

  @override
  String get chartHighlightStatsHighlights => '하이라이트';

  @override
  String get chartHighlightStatsMemos => '메모';

  @override
  String get chartHighlightStatsPhotos => '사진';

  @override
  String get chartHighlightStatsByGenre => '장르별';

  @override
  String get chartHighlightStatsEmptyMessage => '하이라이트 없음';

  @override
  String get chartHighlightStatsEmptyHint => '독서 중 하이라이트를 추가해보세요';

  @override
  String chartMonthlyBooksTitle(int year) {
    return '$year년 월별 도서';
  }

  @override
  String get chartMonthlyBooksThisMonth => '이번 달';

  @override
  String get chartMonthlyBooksLastMonth => '지난 달';

  @override
  String get chartMonthlyBooksChange => '변화';

  @override
  String get chartMonthlyBooksCustomRange => '직접 범위 설정';

  @override
  String get chartBookStatusTitle => '독서 현황';

  @override
  String get chartBookStatusAnnual => '연간';

  @override
  String get chartBookStatusMonthly => '월간';

  @override
  String get chartBookStatusWeekly => '주간';

  @override
  String get chartBookStatusCustom => '기간 설정';

  @override
  String get chartBookStatusTotal => '총 완독';

  @override
  String get chartBookStatusDays => '완독일';

  @override
  String get chartBookStatusMaxDay => '최다';

  @override
  String chartMonthlyBooksTooltip(int month, int count) {
    return '$month: $count권';
  }

  @override
  String chartReadingStreakTitle(int year) {
    return '$year년 독서 활동';
  }

  @override
  String get chartReadingStreakDaysRead => '읽은 날';

  @override
  String get chartReadingStreakTotalPages => '총 페이지';

  @override
  String get chartReadingStreakDailyAverage => '일 평균';

  @override
  String chartReadingStreakTooltip(int month, int day, int pages) {
    return '$month/$day: ${pages}p';
  }

  @override
  String get chartReadingStreakMonthJan => '1월';

  @override
  String get chartReadingStreakMonthMar => '3월';

  @override
  String get chartReadingStreakMonthMay => '5월';

  @override
  String get chartReadingStreakMonthJul => '7월';

  @override
  String get chartReadingStreakMonthSep => '9월';

  @override
  String get chartReadingStreakMonthNov => '11월';

  @override
  String get chartReadingStreakLess => '적음';

  @override
  String get chartReadingStreakMore => '많음';

  @override
  String get chartErrorLoadFailed => '차트 로딩 실패';

  @override
  String get chartErrorRetry => '다시 시도';

  @override
  String get chartAiInsight => 'AI 인사이트';

  @override
  String get chartCompletionRate => '완독률';

  @override
  String get chartRecordsHighlights => '기록 & 하이라이트';

  @override
  String get chartGenreAnalysis => '장르 분석';

  @override
  String get chartReadingStats => '독서 통계';

  @override
  String get chartTotalPages => '총 페이지';

  @override
  String get chartDailyAvgPages => '일 평균';

  @override
  String get chartMaxDaily => '최대 일일';

  @override
  String get chartConsecutiveDays => '연속 일수';

  @override
  String get chartMinDaily => '최소 일일';

  @override
  String get chartTodayGoal => '오늘 목표';

  @override
  String get chartDailyPages => '일일 페이지';

  @override
  String get chartCumulativePages => '누적 페이지';

  @override
  String get chartDailyReadPages => '일별 읽은 페이지';

  @override
  String get chartReadingProgress => '독서 진행';

  @override
  String get chartNoData => '데이터 없음';

  @override
  String get chartNoReadingRecords => '독서 기록 없음';

  @override
  String get readingProgressTitle => '독서 진행';

  @override
  String get readingProgressLoadFailed => '진행 로딩 실패';

  @override
  String get readingProgressNoRecords => '진행 기록 없음';

  @override
  String readingGoalSheetTitle(int year) {
    return '$year년 독서 목표';
  }

  @override
  String get readingGoalSheetQuestion => '몇 권의 책을 읽고 싶으신가요?';

  @override
  String get readingGoalSheetRecommended => '추천';

  @override
  String get readingGoalSheetBooks => '권';

  @override
  String get readingGoalSheetCustom => '직접 입력';

  @override
  String get readingGoalSheetHint => '숫자 입력';

  @override
  String get readingGoalSheetCancel => '취소';

  @override
  String get readingGoalSheetUpdate => '업데이트';

  @override
  String get readingGoalSheetSet => '목표 설정';

  @override
  String readingGoalSheetBooksPerMonth(String books) {
    return '월 $books권';
  }

  @override
  String get readingGoalSheetMotivation1 => '좋은 시작이에요!';

  @override
  String get readingGoalSheetMotivation2 => '좋은 페이스!';

  @override
  String get readingGoalSheetMotivation3 => '야심찬 독서가!';

  @override
  String get readingGoalSheetMotivation4 => '도서 매니아!';

  @override
  String get readingGoalSheetMotivation5 => '독서 챔피언!';

  @override
  String get readingStartPriority => '우선순위';

  @override
  String get readingStartAiRecommendation => 'AI 추천';

  @override
  String readingStartAiRecommendationDesc(String userName) {
    return '$userName님의 독서 패턴을 기반으로 추천하는 도서';
  }

  @override
  String get readingStartConfirm => '확인';

  @override
  String readingStartPages(int pages) {
    return '$pages페이지';
  }

  @override
  String get readingStartPlannedDate => '시작 예정일';

  @override
  String get readingStartToday => '오늘';

  @override
  String get readingStartTargetDate => '목표일';

  @override
  String get readingStartTargetDateNote => '목표일은 나중에 변경할 수 있습니다';

  @override
  String get readingStartSaveError => '저장 실패';

  @override
  String get readingStartReserve => '예약';

  @override
  String get readingStartBegin => '시작';

  @override
  String get scheduleTargetDays => '목표 일수';

  @override
  String scheduleTargetDaysValue(int days) {
    return '$days일';
  }

  @override
  String get scheduleDailyGoal => '일일 목표';

  @override
  String get readingStatusLabel => '독서 상태';

  @override
  String get readingStatusPlanned => '읽을 예정';

  @override
  String get readingStatusStartNow => '지금 시작';

  @override
  String get recallSearchAllRecords => '전체 기록 검색';

  @override
  String get recallSearchingAllBooks => '모든 책에서 검색 중...';

  @override
  String get recallSearchAllReadingRecords => '모든 독서 기록 검색';

  @override
  String get recallAiFindsScatteredRecords => 'AI가 여러 책에서 흩어진 기록을 찾습니다';

  @override
  String get recallAiAnswer => 'AI 답변';

  @override
  String get recallReferencedRecords => '참조된 기록';

  @override
  String recallMoreBooks(int count) {
    return '$count권 더 보기';
  }

  @override
  String recallRecordCount(int count) {
    return '$count개 기록';
  }

  @override
  String get recallSearchMyRecords => '내 기록 검색';

  @override
  String get recallSearchingYourRecords => '기록 검색 중...';

  @override
  String get recallSuggestedQuestion1 => '핵심 내용은 무엇이었나요?';

  @override
  String get recallSuggestedQuestion2 => '습관에 대해 뭐라고 했나요?';

  @override
  String get recallSuggestedQuestion3 => '인상적인 문구가 있나요?';

  @override
  String get recallSuggestedQuestion4 => '가장 영감을 준 것은?';

  @override
  String get recallSearchCurious => '궁금한 내용을 검색해보세요';

  @override
  String get recallFindInRecords => '하이라이트, 메모, 사진에서 찾기';

  @override
  String get recallCopy => '복사';

  @override
  String durationSeconds(int seconds) {
    return '$seconds초';
  }

  @override
  String durationMinutes(int minutes) {
    return '$minutes분';
  }

  @override
  String durationHours(int hours) {
    return '$hours시간';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '$hours시간 $minutes분';
  }

  @override
  String historyDateTimeFormat(
      int year, int month, int day, int hour, int minute) {
    return '$year년 $month월 $day일 $hour시 $minute분';
  }

  @override
  String get loginErrorEmailInvalid => '이메일 주소가 유효하지 않거나 이미 등록된 이메일입니다.';

  @override
  String get loginResendVerification => '인증 이메일 재전송';

  @override
  String get loginResendVerificationSuccess => '인증 이메일이 재전송되었습니다. 이메일을 확인해주세요.';

  @override
  String get loginResendVerificationCooldown => '잠시 후 다시 시도해주세요.';

  @override
  String get loginSignupExistingEmail => '이미 등록된 이메일입니다. 로그인을 시도해주세요.';

  @override
  String get bookInfoViewButton => '책 정보 보기';

  @override
  String get bookInfoSheetTitle => '도서 상세 정보';

  @override
  String get bookInfoTabDescription => '줄거리';

  @override
  String get bookInfoTabDetail => '기본정보';

  @override
  String get bookInfoNoDescription => '줄거리 정보가 없습니다';

  @override
  String get bookInfoNoDetail => '기본 정보가 없습니다';

  @override
  String get bookInfoNoIsbn => 'ISBN 정보가 없어 상세 정보를 불러올 수 없습니다';

  @override
  String get bookInfoPublisher => '출판사';

  @override
  String get bookInfoIsbn => 'ISBN';

  @override
  String get bookInfoPageCount => '페이지';

  @override
  String get bookInfoGenre => '장르';

  @override
  String get bookInfoViewInBookstore => '서점에서 보기';

  @override
  String get myPageAccountSection => '계정';

  @override
  String get myPageAnnouncements => '공지사항';

  @override
  String get myPageChangePassword => '비밀번호 변경';

  @override
  String get myPageChangePasswordTitle => '비밀번호 변경';

  @override
  String get myPageConfirmPassword => '비밀번호 확인';

  @override
  String get myPageCurrentPassword => '현재 비밀번호';

  @override
  String get myPageCurrentPasswordRequired => '현재 비밀번호를 입력해주세요';

  @override
  String get myPageInfoSection => '정보';

  @override
  String get myPageLogoutAndDelete => '로그아웃 | 회원탈퇴';

  @override
  String get myPageNewPassword => '새 비밀번호';

  @override
  String get myPageNotificationAnnouncements => '공지사항 알림';

  @override
  String get myPageNotificationCategories => '알림 설정';

  @override
  String get myPageNotificationDailyReminder => '매일 독서 리마인드';

  @override
  String get myPageNotificationGoalAchievement => '독서 목표 달성';

  @override
  String get myPagePasswordChanged => '비밀번호가 변경되었습니다';

  @override
  String get myPagePasswordChangeFailed => '비밀번호 변경에 실패했습니다';

  @override
  String get myPagePasswordMismatch => '비밀번호가 일치하지 않습니다';

  @override
  String get myPagePasswordTooShort => '비밀번호는 6자 이상이어야 합니다';

  @override
  String myPagePasswordChangeErrorDetail(String error) {
    return '비밀번호 변경 실패: $error';
  }

  @override
  String get myPageWrongCurrentPassword => '현재 비밀번호가 올바르지 않습니다';

  @override
  String get myPageTermsAndPolicy => '약관 및 정책';

  @override
  String get myPageVersion => '버전';
}
