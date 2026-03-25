import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/widgets/floating_context_dropdown.dart';

enum SearchMode { bookSearch, aiRecordSearch }

FloatingContextDropdownController<SearchMode> showSearchModeDropdown(
  BuildContext context, {
  required Offset buttonPosition,
  required double buttonSize,
  required void Function(SearchMode mode) onSelected,
  VoidCallback? onDismissed,
}) {
  final l10n = AppLocalizations.of(context);

  return showFloatingContextDropdown<SearchMode>(
    context,
    buttonPosition: buttonPosition,
    buttonWidth: buttonSize,
    buttonHeight: buttonSize,
    alignment: Alignment.bottomRight,
    items: [
      FloatingContextDropdownItem(
        icon: CupertinoIcons.search,
        label: l10n.searchModeBookSearch,
        value: SearchMode.bookSearch,
      ),
      FloatingContextDropdownItem(
        icon: Icons.auto_awesome,
        label: l10n.searchModeAiRecordSearch,
        value: SearchMode.aiRecordSearch,
      ),
    ],
    onDismissed: onDismissed,
    onSelected: onSelected,
  );
}
