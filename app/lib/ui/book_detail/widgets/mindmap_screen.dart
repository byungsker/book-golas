import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/ui/book_detail/view_model/note_structure_view_model.dart';
import 'package:book_golas/ui/book_detail/widgets/note_structure_mindmap.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/custom_snackbar.dart';

class MindmapScreen extends StatefulWidget {
  final String bookId;
  final String bookTitle;
  final NoteStructureViewModel noteStructureVm;

  const MindmapScreen({
    super.key,
    required this.bookId,
    required this.bookTitle,
    required this.noteStructureVm,
  });

  @override
  State<MindmapScreen> createState() => _MindmapScreenState();
}

class _MindmapScreenState extends State<MindmapScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.noteStructureVm.structure == null) {
      widget.noteStructureVm.loadStructure(widget.bookId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ChangeNotifierProvider.value(
      value: widget.noteStructureVm,
      child: Scaffold(
        backgroundColor:
            isDark ? BLabColors.scaffoldDark : BLabColors.elevatedLight,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: IconButton(
            icon: Icon(
              CupertinoIcons.back,
              color: isDark ? Colors.white : Colors.black,
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'Mind Map',
            style: TextStyle(
              color: isDark ? Colors.white : Colors.black,
              fontWeight: FontWeight.w600,
              fontSize: 18,
            ),
          ),
          actions: [
            Consumer<NoteStructureViewModel>(
              builder: (context, vm, _) {
                return IconButton(
                  icon: Icon(
                    Icons.refresh_rounded,
                    color: vm.isLoading
                        ? (isDark ? Colors.grey[600] : Colors.grey[400])
                        : (isDark ? Colors.white : Colors.black),
                  ),
                  onPressed: vm.isLoading ? null : () => _regenerate(vm),
                );
              },
            ),
          ],
        ),
        body: SafeArea(
          child: Consumer<NoteStructureViewModel>(
            builder: (context, vm, _) {
              if (vm.isLoading) {
                return _buildLoadingState(isDark);
              }

              if (vm.errorMessage != null) {
                return _buildErrorState(isDark, vm);
              }

              return Column(
                children: [
                  _buildLegend(isDark),
                  Expanded(
                    child: NoteStructureMindmap(
                      structure: vm.structure,
                      bookTitle: widget.bookTitle,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 40,
            height: 40,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: BLabColors.primary,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'AI가 노트를 분석하고 있습니다...',
            style: TextStyle(
              fontSize: 15,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '최대 30초 소요될 수 있습니다',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.grey[600] : Colors.grey[400],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(bool isDark, NoteStructureViewModel vm) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 56,
              color: isDark ? Colors.grey[500] : Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              vm.errorMessage!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: () => _regenerate(vm),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: BLabColors.primary,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  '다시 시도',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegend(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildLegendItem(
            Icons.format_quote_rounded,
            '하이라이트',
            Colors.amber[700]!,
            isDark,
          ),
          const SizedBox(width: 16),
          _buildLegendItem(
            Icons.edit_note_rounded,
            '메모',
            BLabColors.success,
            isDark,
          ),
          const SizedBox(width: 16),
          _buildLegendItem(
            Icons.camera_alt_rounded,
            '사진 OCR',
            BLabColors.purple,
            isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(
      IconData icon, String label, Color color, bool isDark) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.grey[400] : Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Future<void> _regenerate(NoteStructureViewModel vm) async {
    await vm.regenerateStructure(widget.bookId);
    if (mounted) {
      if (vm.errorMessage != null) {
        CustomSnackbar.show(
          context,
          message: '구조화 실패',
          type: BLabSnackbarType.error,
        );
      } else {
        CustomSnackbar.show(
          context,
          message: '마인드맵이 갱신되었습니다',
          type: BLabSnackbarType.success,
        );
      }
    }
  }
}
