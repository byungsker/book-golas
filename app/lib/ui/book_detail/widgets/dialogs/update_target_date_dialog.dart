import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:book_golas/l10n/app_localizations.dart';

import 'package:book_golas/ui/core/widgets/korean_date_picker.dart';

class UpdateTargetDateDialog extends StatefulWidget {
  final DateTime currentTargetDate;
  final int nextAttemptCount;
  final Future<void> Function(DateTime newDate, int newAttempt) onConfirm;

  const UpdateTargetDateDialog({
    super.key,
    required this.currentTargetDate,
    required this.nextAttemptCount,
    required this.onConfirm,
  });

  static Future<void> show({
    required BuildContext context,
    required DateTime currentTargetDate,
    required int nextAttemptCount,
    required Future<void> Function(DateTime newDate, int newAttempt) onConfirm,
  }) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => UpdateTargetDateDialog(
        currentTargetDate: currentTargetDate,
        nextAttemptCount: nextAttemptCount,
        onConfirm: onConfirm,
      ),
    );
  }

  @override
  State<UpdateTargetDateDialog> createState() => _UpdateTargetDateDialogState();
}

class _UpdateTargetDateDialogState extends State<UpdateTargetDateDialog> {
  late DateTime _selectedDate;

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.currentTargetDate;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final daysRemaining = _selectedDate.difference(DateTime.now()).inDays;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(isDark),
          const SizedBox(height: 24),
          _buildSelectedDateDisplay(isDark, daysRemaining),
          const SizedBox(height: 16),
          _buildDatePicker(isDark),
          const SizedBox(height: 24),
          _buildButtons(isDark),
          SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: BLabColors.destructive.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            Icons.calendar_month,
            color: BLabColors.destructive,
            size: 24,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppLocalizations.of(context).changeTargetDateTitle,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              Text(
                AppLocalizations.of(context)
                    .attemptChangeMessage(widget.nextAttemptCount),
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSelectedDateDisplay(bool isDark, int daysRemaining) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.subtleDark : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            DateFormat.yMMMd(Localizations.localeOf(context).languageCode)
                .format(_selectedDate),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: daysRemaining > 0
                  ? BLabColors.success.withValues(alpha: 0.1)
                  : BLabColors.destructive.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              daysRemaining > 0 ? 'D-$daysRemaining' : 'D-Day',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: daysRemaining > 0
                    ? BLabColors.success
                    : BLabColors.destructive,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDatePicker(bool isDark) {
    return Container(
      height: 180,
      decoration: BoxDecoration(
        color: isDark ? BLabColors.subtleDark : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: KoreanDatePicker(
        isDark: isDark,
        selectedDate: _selectedDate,
        minimumDate: DateTime.now(),
        onDateChanged: (newDate) {
          setState(() {
            _selectedDate = newDate;
          });
        },
      ),
    );
  }

  Widget _buildButtons(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: Text(AppLocalizations.of(context).commonCancel),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 2,
          child: ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await widget.onConfirm(_selectedDate, widget.nextAttemptCount);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: BLabColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              AppLocalizations.of(context).confirmChange,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
