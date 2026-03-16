import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/ui/core/widgets/keyboard_accessory_bar.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';
import 'package:book_golas/ui/core/utils/text_history_manager.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class FullTextViewModal extends StatefulWidget {
  final String initialText;
  final bool isDark;
  final String title;
  final String hintText;
  final bool isEditable;
  final bool startInEditMode;

  const FullTextViewModal({
    super.key,
    required this.initialText,
    required this.isDark,
    this.title = '기록 문구',
    this.hintText = '텍스트를 입력하세요...',
    this.isEditable = true,
    this.startInEditMode = false,
  });

  @override
  State<FullTextViewModal> createState() => _FullTextViewModalState();
}

class _FullTextViewModalState extends State<FullTextViewModal> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  late TextHistoryManager _historyManager;
  late bool _isEditing;

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
    _isEditing = widget.startInEditMode;
    _focusNode.addListener(_onFocusChange);

    if (_isEditing) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _focusNode.requestFocus();
      });
    }
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

  void _handleCopy() {
    Clipboard.setData(ClipboardData(text: _controller.text));
    CustomSnackbar.show(
      context,
      message: '텍스트가 복사되었습니다.',
      rootOverlay: true,
      bottomOffset: 40,
    );
  }

  void _handleSave() {
    Navigator.pop(context, _controller.text);
  }

  void _handleCancel() {
    if (_isEditing && _controller.text != widget.initialText) {
      _controller.text = widget.initialText;
      setState(() {
        _isEditing = false;
      });
      _focusNode.unfocus();
    } else {
      Navigator.pop(context);
    }
  }

  void _startEditing() {
    setState(() {
      _isEditing = true;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  void _clearText() {
    _historyManager.saveIfChanged();
    _controller.clear();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final topPadding = MediaQuery.of(context).padding.top;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = keyboardHeight > 0;
    final isTextFocused = _focusNode.hasFocus;
    final availableHeight = screenHeight - topPadding;

    return GestureDetector(
      onTap: () {
        if (_focusNode.hasFocus) {
          _focusNode.unfocus();
        }
      },
      child: Padding(
        padding: EdgeInsets.only(
          top: topPadding,
          bottom: keyboardHeight,
        ),
        child: Stack(
          children: [
            Container(
              width: double.infinity,
              height: availableHeight,
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              decoration: BoxDecoration(
                color: widget.isDark ? BLabColors.surfaceDark : Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.grey[400],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  _buildHeader(),
                  const SizedBox(height: 16),
                  _buildActionButtons(),
                  const SizedBox(height: 12),
                  Expanded(child: _buildContent()),
                  SizedBox(
                    height: MediaQuery.of(context).padding.bottom + 8,
                  ),
                ],
              ),
            ),
            if (isKeyboardOpen && isTextFocused && _isEditing)
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

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        if (_isEditing)
          GestureDetector(
            onTap: _handleCancel,
            child: Text(
              '취소',
              style: TextStyle(
                fontSize: 16,
                color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
          )
        else
          Text(
            widget.title,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: widget.isDark ? Colors.white : Colors.black,
            ),
          ),
        if (_isEditing)
          GestureDetector(
            onTap: _handleSave,
            child: const Text(
              '저장',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: BLabColors.primary,
              ),
            ),
          )
        else
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Icon(
              CupertinoIcons.xmark,
              size: 22,
              color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
      ],
    );
  }

  Widget _buildActionButtons() {
    if (!_isEditing) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Row(
              children: [
                Icon(
                  CupertinoIcons.arrow_down_right_arrow_up_left,
                  size: 14,
                  color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Text(
                  '축소보기',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          GestureDetector(
            onTap: _handleCopy,
            child: Row(
              children: [
                Icon(
                  CupertinoIcons.doc_on_clipboard,
                  size: 14,
                  color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                const SizedBox(width: 4),
                Text(
                  '복사하기',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: widget.isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          if (widget.isEditable) ...[
            const SizedBox(width: 16),
            GestureDetector(
              onTap: _startEditing,
              child: const Row(
                children: [
                  Icon(
                    CupertinoIcons.pencil,
                    size: 14,
                    color: BLabColors.primary,
                  ),
                  SizedBox(width: 4),
                  Text(
                    '수정하기',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: BLabColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        GestureDetector(
          onTap: _clearText,
          child: Row(
            children: [
              Icon(CupertinoIcons.trash, size: 14, color: Colors.red[400]),
              const SizedBox(width: 4),
              Text(
                '모두 지우기',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Colors.red[400],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildContent() {
    if (_isEditing) {
      return GestureDetector(
        onTap: () => _focusNode.requestFocus(),
        child: Container(
          decoration: BoxDecoration(
            color: widget.isDark ? Colors.grey[900] : Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: widget.isDark ? Colors.grey[700]! : Colors.grey[300]!,
            ),
          ),
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            maxLines: null,
            expands: true,
            keyboardType: TextInputType.multiline,
            textAlignVertical: TextAlignVertical.top,
            onChanged: (_) => _historyManager.saveIfChanged(),
            style: TextStyle(
              fontSize: 16,
              height: 1.8,
              color: widget.isDark ? Colors.white : Colors.black,
            ),
            decoration: InputDecoration(
              hintText: widget.hintText,
              hintStyle: TextStyle(
                color: widget.isDark ? Colors.grey[600] : Colors.grey[400],
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
        ),
      );
    }

    return Scrollbar(
      thumbVisibility: true,
      child: SingleChildScrollView(
        child: SelectableText(
          _controller.text,
          style: TextStyle(
            fontSize: 16,
            height: 1.8,
            color: widget.isDark ? Colors.white : Colors.black,
          ),
        ),
      ),
    );
  }
}

Future<String?> showFullTextViewModal({
  required BuildContext context,
  required String initialText,
  String title = '기록 문구',
  String hintText = '텍스트를 입력하세요...',
  bool isEditable = true,
  bool startInEditMode = false,
}) {
  final isDark = Theme.of(context).brightness == Brightness.dark;

  return showModalBottomSheet<String?>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (modalContext) => FullTextViewModal(
      initialText: initialText,
      isDark: isDark,
      title: title,
      hintText: hintText,
      isEditable: isEditable,
      startInEditMode: startInEditMode,
    ),
  );
}
