import 'package:flutter/material.dart';
import 'package:book_golas/domain/models/reading_insight.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// AI 인사이트 카드
///
/// 독서 패턴을 분석하여 AI가 생성한 인사이트를 표시
class AiInsightCard extends StatelessWidget {
  final bool isLoading;
  final List<ReadingInsight>? insights;
  final String? error;
  final bool canGenerate;
  final int bookCount;
  final VoidCallback onGenerate;
  final VoidCallback? onRetry;
  final VoidCallback? onClearMemory;
  final bool enableTestMode;

  const AiInsightCard({
    super.key,
    required this.isLoading,
    this.insights,
    this.error,
    required this.canGenerate,
    required this.bookCount,
    required this.onGenerate,
    this.onRetry,
    this.onClearMemory,
    this.enableTestMode = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : BLabColors.surfaceLight,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context, isDark),
            const SizedBox(height: 16),
            if (isLoading)
              _buildLoadingState(context, isDark)
            else if (error != null)
              _buildErrorState(context, isDark)
            else if (enableTestMode &&
                bookCount < 3 &&
                (insights == null || insights!.isEmpty))
              _buildTestModeState(context, isDark)
            else if (bookCount < 3)
              _buildDisabledState(context, isDark)
            else if (insights != null && insights!.isNotEmpty)
              _buildSuccessState(context, isDark)
            else
              _buildEmptyState(context, isDark),
            const SizedBox(height: 16),
            _buildFooter(context, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: BLabColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            Icons.auto_awesome,
            size: 24,
            color: BLabColors.primary,
          ),
        ),
        const SizedBox(width: 12),
        Text(
          AppLocalizations.of(context).chartAiInsightTitle,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : Colors.black87,
          ),
        ),
        const Spacer(),
        if (onClearMemory != null && insights != null && insights!.isNotEmpty)
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_vert,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
            onSelected: (value) {
              if (value == 'clear') {
                _showClearMemoryDialog(context);
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'clear',
                child: Row(
                  children: [
                    const Icon(Icons.delete_outline, size: 20),
                    const SizedBox(width: 8),
                    Text(AppLocalizations.of(context)
                        .chartAiInsightClearMemory),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }

  void _showClearMemoryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title:
            Text(AppLocalizations.of(context).chartAiInsightClearMemoryTitle),
        content: Text(
          AppLocalizations.of(context).chartAiInsightClearMemoryMessage,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
                AppLocalizations.of(context).chartAiInsightClearMemoryCancel),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              onClearMemory?.call();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(
                AppLocalizations.of(context).chartAiInsightClearMemoryConfirm),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState(BuildContext context, bool isDark) {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 20),
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            AppLocalizations.of(context).chartAiInsightAnalyzing,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, bool isDark) {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 20),
          Icon(
            Icons.error_outline,
            size: 48,
            color: isDark ? Colors.red[300] : Colors.red[700],
          ),
          const SizedBox(height: 12),
          Text(
            error ?? AppLocalizations.of(context).chartAiInsightUnknownError,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          if (onRetry != null)
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: BLabColors.primary,
                foregroundColor: Colors.white,
              ),
              child: Text(AppLocalizations.of(context).chartAiInsightRetry),
            ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildDisabledState(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[800]?.withOpacity(0.3) : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppLocalizations.of(context).chartAiInsightMinBooksRequired,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white : Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(context)
                .chartAiInsightMinBooksMessage(bookCount),
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white60 : Colors.black54,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            AppLocalizations.of(context).chartAiInsightMinBooksHint,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white60 : Colors.black54,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTestModeState(BuildContext context, bool isDark) {
    final sampleInsights = [
      ReadingInsight(
        id: 'sample-1',
        category: 'pattern',
        title: '꾸준한 독서 습관',
        description: '최근 한 달간 주 2-3회 독서를 하고 계시네요. 이런 꾸준함이 쌓이면 큰 변화를 만들어냅니다.',
        relatedBooks: [],
        generatedAt: DateTime.now(),
      ),
      ReadingInsight(
        id: 'sample-2',
        category: 'milestone',
        title: '첫 완독 달성',
        description: '축하합니다! 첫 책을 완독하셨네요. 이제 시작입니다.',
        relatedBooks: [],
        generatedAt: DateTime.now(),
      ),
      ReadingInsight(
        id: 'sample-3',
        category: 'reflection',
        title: '다양한 장르 탐색',
        description: '여러 장르의 책을 읽으며 시야를 넓히고 계시네요.',
        relatedBooks: [],
        generatedAt: DateTime.now(),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: BLabColors.primary.withOpacity(0.15),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            AppLocalizations.of(context).chartAiInsightSampleLabel,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: BLabColors.primary,
            ),
          ),
        ),
        const SizedBox(height: 12),
        ...sampleInsights.map((insight) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    BLabColors.primary.withOpacity(0.1),
                    BLabColors.primary.withOpacity(0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _getCategoryIcon(insight.category, isDark),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          insight.title,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    insight.description,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildSuccessState(BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: insights!.map((insight) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  BLabColors.primary.withOpacity(0.1),
                  BLabColors.primary.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _getCategoryIcon(insight.category, isDark),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        insight.title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  insight.description,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: isDark ? Colors.white70 : Colors.black87,
                  ),
                ),
                if (insight.relatedBooks.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: insight.relatedBooks.map((book) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? Colors.white.withOpacity(0.1)
                              : Colors.white.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: BLabColors.primary.withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: Text(
                          book,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.white70 : Colors.black87,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildEmptyState(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[800]?.withOpacity(0.3) : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          AppLocalizations.of(context).chartAiInsightEmptyState,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? Colors.white60 : Colors.black54,
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(BuildContext context, bool isDark) {
    if (canGenerate && bookCount >= 3) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: onGenerate,
          style: ElevatedButton.styleFrom(
            backgroundColor: BLabColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: Text(
            AppLocalizations.of(context).chartAiInsightGenerateButton,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
        ),
      );
    } else if (bookCount >= 3) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? Colors.grey[800]?.withOpacity(0.3) : Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            AppLocalizations.of(context).chartAiInsightAlreadyAnalyzed,
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white60 : Colors.black54,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      );
    } else {
      return const SizedBox.shrink();
    }
  }

  Icon _getCategoryIcon(String category, bool isDark) {
    final color =
        isDark ? BLabColors.primary.withOpacity(0.8) : BLabColors.primary;

    switch (category) {
      case 'pattern':
        return Icon(Icons.trending_up, size: 20, color: color);
      case 'milestone':
        return Icon(Icons.emoji_events, size: 20, color: color);
      case 'reflection':
        return Icon(Icons.lightbulb_outline, size: 20, color: color);
      default:
        return Icon(Icons.info_outline, size: 20, color: color);
    }
  }
}
