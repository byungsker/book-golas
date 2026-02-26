import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';
import 'package:book_golas/ui/core/utils/text_history_manager.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class ExtractedTextModal extends StatefulWidget {
  final String initialText;
  final int? pageNumber;
  final bool isDark;
  final String title;
  final String subtitle;
  final String applyButtonText;
  final String cancelButtonText;
  final String? creditWarning;

  const ExtractedTextModal({
    super.key,
    required this.initialText,
    this.pageNumber,
    required this.isDark,
    this.title = '추출된 텍스트',
    this.subtitle = '추출된 내용을 확인해주세요. 직접 수정도 가능해요!',
    this.applyButtonText = '적용하기',
    this.cancelButtonText = '다시 선택',
    this.creditWarning,
  });

  @override
  State<ExtractedTextModal> createState() => _ExtractedTextModalState();
}

class _ExtractedTextModalState extends State<ExtractedTextModal> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  late TextHistoryManager _historyManager;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialText);
    _focusNode = FocusNode();
    _historyManager = TextHistoryManager(
      controller: _controller,
      initialText: widget.initialText,
      onHistoryChanged: () {
        if (mounted) setState(() {});
      },
    );
    _focusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChange);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _applyAndClose() {
    Navigator.pop(context, _controller.text);
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final maxModalHeight = screenHeight * 0.85;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = keyboardHeight > 0;
    final isTextFocused = _focusNode.hasFocus;

    return GestureDetector(
      onTap: () {
        if (_focusNode.hasFocus) {
          _focusNode.unfocus();
          _applyAndClose();
        }
      },
      child: Padding(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 40,
          bottom: keyboardHeight,
        ),
        child: Stack(
          children: [
            Container(
              constraints: BoxConstraints(maxHeight: maxModalHeight),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: widget.isDark ? BLabColors.surfaceDark : Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  Text(
                    widget.title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: widget.isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.subtitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color:
                          widget.isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {},
                      child: Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: widget.isDark
                              ? Colors.grey[900]
                              : Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: widget.isDark
                                ? Colors.grey[700]!
                                : Colors.grey[300]!,
                          ),
                        ),
                        child: Scrollbar(
                          thumbVisibility: true,
                          child: TextField(
                            controller: _controller,
                            focusNode: _focusNode,
                            maxLines: null,
                            expands: true,
                            keyboardType: TextInputType.multiline,
                            textAlignVertical: TextAlignVertical.top,
                            onChanged: (_) => _historyManager.saveIfChanged(),
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.6,
                              color:
                                  widget.isDark ? Colors.white : Colors.black,
                            ),
                            decoration: InputDecoration(
                              hintText: '텍스트를 입력하세요',
                              hintStyle: TextStyle(
                                color: widget.isDark
                                    ? Colors.grey[600]
                                    : Colors.grey[400],
                              ),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.all(16),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (widget.pageNumber != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          CupertinoIcons.book,
                          size: 14,
                          color: widget.isDark
                              ? Colors.grey[400]
                              : Colors.grey[600],
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '페이지 ${widget.pageNumber}',
                          style: TextStyle(
                            fontSize: 13,
                            color: widget.isDark
                                ? Colors.grey[400]
                                : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ],
                    if (widget.creditWarning != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        widget.creditWarning!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          color: widget.isDark
                              ? Colors.grey[500]
                              : Colors.grey[500],
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => Navigator.pop(context, null),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: widget.isDark
                                    ? Colors.grey[800]
                                    : Colors.grey[200],
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(
                                  widget.cancelButtonText,
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: widget.isDark
                                        ? Colors.grey[300]
                                        : Colors.grey[700],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: GestureDetector(
                            onTap: _applyAndClose,
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: BLabColors.primary,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(
                                  widget.applyButtonText,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(
                      height: MediaQuery.of(context).padding.bottom + 8,
                    ),
                ],
              ),
            ),
            if (isKeyboardOpen && isTextFocused)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: KeyboardAccessoryBar(
                  isDark: widget.isDark,
                  onUndo: _historyManager.canUndo
                      ? () => _historyManager.undo()
                      : null,
                  canUndo: _historyManager.canUndo,
                  onRedo: _historyManager.canRedo
                      ? () => _historyManager.redo()
                      : null,
                  canRedo: _historyManager.canRedo,
                  onDone: () {
                    SystemChannels.textInput.invokeMethod('TextInput.hide');
                    setState(() {});
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

Future<String?> showExtractedTextModal({
  required BuildContext context,
  required String initialText,
  int? pageNumber,
  String title = '추출된 텍스트',
  String subtitle = '추출된 내용을 확인해주세요. 직접 수정도 가능해요!',
  String applyButtonText = '적용하기',
  String cancelButtonText = '다시 선택',
  String? creditWarning,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;

  return showModalBottomSheet<String?>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (modalContext) => ExtractedTextModal(
      initialText: initialText,
      pageNumber: pageNumber,
      isDark: isDark,
      title: title,
      subtitle: subtitle,
      applyButtonText: applyButtonText,
      cancelButtonText: cancelButtonText,
      creditWarning: creditWarning,
    ),
  );
}
