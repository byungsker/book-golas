import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:flutter/material.dart';
import 'package:book_golas/l10n/app_localizations.dart';

import 'package:book_golas/ui/core/widgets/korean_date_picker.dart';
import 'package:book_golas/ui/reading_start/widgets/priority_selector_widget.dart';

class EditPlannedBookDialog extends StatefulWidget {
  final int? currentPriority;
  final DateTime? currentPlannedStartDate;
  final Future<void> Function(int? priority, DateTime? plannedStartDate)
      onConfirm;

  const EditPlannedBookDialog({
    super.key,
    this.currentPriority,
    this.currentPlannedStartDate,
    required this.onConfirm,
  });

  static Future<void> show({
    required BuildContext context,
    int? currentPriority,
    DateTime? currentPlannedStartDate,
    required Future<void> Function(int? priority, DateTime? plannedStartDate)
        onConfirm,
  }) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EditPlannedBookDialog(
        currentPriority: currentPriority,
        currentPlannedStartDate: currentPlannedStartDate,
        onConfirm: onConfirm,
      ),
    );
  }

  @override
  State<EditPlannedBookDialog> createState() => _EditPlannedBookDialogState();
}

class _EditPlannedBookDialogState extends State<EditPlannedBookDialog> {
  late int? _priority;
  late DateTime _plannedStartDate;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _priority = widget.currentPriority;
    _plannedStartDate = widget.currentPlannedStartDate ??
        DateTime.now().add(const Duration(days: 7));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: EdgeInsets.only(bottom: bottomPadding),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey[700] : Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Center(
                  child: Text(
                    AppLocalizations.of(context).editReadingPlanTitle,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                PrioritySelectorWidget(
                  selectedPriority: _priority,
                  onPriorityChanged: (priority) {
                    setState(() => _priority = priority);
                  },
                  isDark: isDark,
                ),
                const SizedBox(height: 24),
                Text(
                  AppLocalizations.of(context).editPlannedStartDate,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : Colors.black54,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  height: 150,
                  decoration: BoxDecoration(
                    color:
                        isDark ? BLabColors.subtleDark : BLabColors.grey50Light,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: KoreanDatePicker(
                    isDark: isDark,
                    selectedDate: _plannedStartDate,
                    minimumDate: DateTime.now(),
                    onDateChanged: (date) {
                      setState(() => _plannedStartDate = date);
                    },
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(
                              color: isDark
                                  ? Colors.grey[700]!
                                  : Colors.grey[300]!,
                            ),
                          ),
                        ),
                        child: Text(
                          AppLocalizations.of(context).commonCancel,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: isDark ? Colors.grey[300] : Colors.grey[700],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextButton(
                        onPressed: _isLoading ? null : _onSave,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: BLabColors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                '저장',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _onSave() async {
    setState(() => _isLoading = true);
    try {
      await widget.onConfirm(_priority, _plannedStartDate);
      if (mounted) {
        Navigator.pop(context);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
