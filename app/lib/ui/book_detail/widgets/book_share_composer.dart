import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:book_golas/domain/models/book.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_card.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_text_field.dart';

class BookShareNote {
  final String id;
  final String text;
  final int? pageNumber;

  const BookShareNote({
    required this.id,
    required this.text,
    this.pageNumber,
  });
}

class BookShareComposerResult {
  final String? noteText;
  final bool useBookReviewFallback;

  const BookShareComposerResult({
    this.noteText,
    this.useBookReviewFallback = false,
  });
}

Future<BookShareComposerResult?> showBookShareComposer({
  required BuildContext context,
  required Book book,
  required List<BookShareNote> notes,
}) {
  return showModalBottomSheet<BookShareComposerResult>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _BookShareComposerSheet(book: book, notes: notes),
  );
}

class _BookShareComposerSheet extends StatefulWidget {
  final Book book;
  final List<BookShareNote> notes;

  const _BookShareComposerSheet({
    required this.book,
    required this.notes,
  });

  @override
  State<_BookShareComposerSheet> createState() =>
      _BookShareComposerSheetState();
}

class _BookShareComposerSheetState extends State<_BookShareComposerSheet> {
  late final TextEditingController _noteController;
  final Set<String> _selectedNoteIds = <String>{};
  bool _isApplyingSelection = false;
  bool _hasManualEdits = false;

  @override
  void initState() {
    super.initState();
    _selectedNoteIds.addAll(widget.notes.take(2).map((note) => note.id));
    _noteController = TextEditingController(text: _selectedNotesText);
    _noteController.addListener(_handleNoteTextChanged);
  }

  @override
  void dispose() {
    _noteController.removeListener(_handleNoteTextChanged);
    _noteController.dispose();
    super.dispose();
  }

  String get _selectedNotesText {
    return widget.notes
        .where((note) => _selectedNoteIds.contains(note.id))
        .map((note) => note.text.trim())
        .where((text) => text.isNotEmpty)
        .join('\n\n');
  }

  void _handleNoteTextChanged() {
    if (!_isApplyingSelection) {
      _hasManualEdits = true;
    }
  }

  void _replaceNoteText(String text) {
    _isApplyingSelection = true;
    _noteController.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
    _isApplyingSelection = false;
  }

  void _toggleNote(BookShareNote note) {
    final wasSelected = _selectedNoteIds.contains(note.id);
    setState(() {
      if (wasSelected) {
        _selectedNoteIds.remove(note.id);
      } else {
        _selectedNoteIds.add(note.id);
      }

      if (!_hasManualEdits) {
        _replaceNoteText(_selectedNotesText);
      } else if (wasSelected) {
        _replaceNoteText(_removeSelectedNote(_noteController.text, note.text));
      } else {
        final selectedText = note.text.trim();
        final currentText = _noteController.text.trimRight();
        final paragraphs = currentText
            .split('\n\n')
            .map((text) => text.trim())
            .where((text) => text.isNotEmpty);
        if (selectedText.isNotEmpty && !paragraphs.contains(selectedText)) {
          _replaceNoteText(
            currentText.isEmpty
                ? selectedText
                : '$currentText\n\n$selectedText',
          );
        }
      }
    });
  }

  String _removeSelectedNote(String currentText, String selectedText) {
    final target = selectedText.trim();
    if (target.isEmpty) return currentText.trim();

    var removed = false;
    final paragraphs = currentText
        .split(RegExp(r'\n\s*\n'))
        .map((text) => text.trim())
        .where((text) {
      if (!removed && text == target) {
        removed = true;
        return false;
      }
      return text.isNotEmpty;
    });
    return paragraphs.join('\n\n');
  }

  void _submit() {
    final text = _noteController.text.trim();
    Navigator.of(context).pop(
      BookShareComposerResult(
        noteText: text.isEmpty ? null : text,
        useBookReviewFallback: false,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor =
        isDark ? BLabColors.surfaceDark : BLabColors.surfaceLight;
    final textColor =
        isDark ? BLabColors.textPrimaryDark : BLabColors.textPrimaryLight;
    final secondaryColor =
        isDark ? BLabColors.textSecondaryDark : BLabColors.textSecondaryLight;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.88,
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: secondaryColor.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Text(
                  l10n.shareComposerTitle,
                  style: AppTypography.bookShareTitle.copyWith(
                    color: textColor,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              IconButton(
                tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                onPressed: () => Navigator.of(context).pop(),
                icon: Icon(CupertinoIcons.xmark, color: secondaryColor),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            widget.book.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.bookShareCaption.copyWith(
              color: secondaryColor,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            l10n.shareComposerNotesTitle,
            style: AppTypography.bookShareLabel.copyWith(
              color: textColor,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          if (widget.notes.isEmpty)
            BLabCard(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(CupertinoIcons.info, color: secondaryColor, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      l10n.shareComposerNoNotes,
                      style: AppTypography.bookShareCaption
                          .copyWith(color: secondaryColor),
                    ),
                  ),
                ],
              ),
            )
          else
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  children: widget.notes.map(_buildNoteOption).toList(),
                ),
              ),
            ),
          const SizedBox(height: 16),
          BLabTextField(
            controller: _noteController,
            label: l10n.shareComposerNoteLabel,
            hintText: l10n.shareComposerNoteHint,
            maxLines: 4,
          ),
          const SizedBox(height: 6),
          Text(
            l10n.shareComposerPreviewLimit,
            style: AppTypography.bookShareCaption.copyWith(
              color: secondaryColor,
            ),
          ),
          const SizedBox(height: 16),
          BLabButton(
            text: l10n.shareComposerCreateButton,
            icon: CupertinoIcons.share,
            isFullWidth: true,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }

  Widget _buildNoteOption(BookShareNote note) {
    final l10n = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selected = _selectedNoteIds.contains(note.id);
    final borderColor = selected
        ? BLabColors.primary
        : (isDark
            ? BLabColors.textPrimaryDark.withValues(alpha: 0.12)
            : BLabColors.textPrimaryLight.withValues(alpha: 0.1));
    final textColor =
        isDark ? BLabColors.textPrimaryDark : BLabColors.textPrimaryLight;
    final secondaryColor = isDark
        ? BLabColors.textPrimaryDark.withValues(alpha: 0.62)
        : BLabColors.textPrimaryLight.withValues(alpha: 0.58);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Semantics(
        container: true,
        button: true,
        toggled: selected,
        label: note.text,
        child: InkWell(
          onTap: () => _toggleNote(note),
          borderRadius: BorderRadius.circular(14),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: selected
                  ? BLabColors.primary.withValues(alpha: 0.12)
                  : (isDark
                      ? BLabColors.textPrimaryDark.withValues(alpha: 0.06)
                      : BLabColors.textPrimaryLight.withValues(alpha: 0.04)),
              borderRadius: BorderRadius.circular(14),
              border:
                  Border.all(color: borderColor, width: selected ? 1.3 : 0.7),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  selected
                      ? CupertinoIcons.checkmark_circle_fill
                      : CupertinoIcons.circle,
                  color: selected ? BLabColors.primary : secondaryColor,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        note.text,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.bookShareLabel.copyWith(
                          color: textColor,
                          fontSize: 14,
                          height: 1.4,
                        ),
                      ),
                      if (note.pageNumber != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          l10n.shareComposerPage(note.pageNumber!),
                          style: AppTypography.bookShareCaption.copyWith(
                            color: secondaryColor,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
