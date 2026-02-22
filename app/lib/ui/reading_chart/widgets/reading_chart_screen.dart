import 'dart:collection';

import 'package:flutter/material.dart';

import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/data/services/reading_goal_service.dart';
import 'package:book_golas/data/services/reading_progress_service.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/core/widgets/liquid_glass_tab_bar.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_chart_view_model.dart';
import 'package:book_golas/ui/reading_chart/view_model/reading_insights_view_model.dart';
import 'package:book_golas/ui/reading_chart/widgets/cards/ai_insight_card.dart';
import 'package:book_golas/ui/reading_chart/widgets/cards/annual_goal_card.dart';
import 'package:book_golas/ui/reading_chart/widgets/cards/completion_rate_card.dart';
import 'package:book_golas/ui/reading_chart/widgets/cards/genre_analysis_card.dart';
import 'package:book_golas/ui/reading_chart/widgets/cards/highlight_stats_card.dart';
import 'package:book_golas/ui/reading_chart/widgets/cards/monthly_books_chart.dart';
import 'package:book_golas/ui/reading_chart/widgets/cards/reading_streak_heatmap.dart';
import 'package:book_golas/ui/reading_chart/widgets/reading_chart_skeleton.dart';
import 'package:book_golas/ui/reading_chart/widgets/sheets/reading_goal_sheet.dart';

enum TimeFilter { daily, weekly, monthly }

class ReadingChartScreen extends StatefulWidget {
  const ReadingChartScreen({super.key});

  static final GlobalKey<_ReadingChartScreenState> globalKey =
      GlobalKey<_ReadingChartScreenState>();

  static void cycleToNextTab() {
    globalKey.currentState?.cycleToNextTab();
  }

  @override
  State<ReadingChartScreen> createState() => _ReadingChartScreenState();
}

class _ReadingChartScreenState extends State<ReadingChartScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  TimeFilter _selectedFilter = TimeFilter.daily;
  final ReadingProgressService _progressService = ReadingProgressService();

  int _selectedSectionIndex = 0;
  bool _isScrollingByTap = false;
  final _sectionKeys = List.generate(5, (_) => GlobalKey());
  final _tabKeys = List.generate(5, (_) => GlobalKey());
  final ScrollController _analysisScrollController = ScrollController();
  final ScrollController _tabBarScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReadingChartViewModel>().loadData();
    });
  }

  @override
  void dispose() {
    _analysisScrollController.dispose();
    _tabBarScrollController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void cycleToNextTab() {
    final nextIndex = (_tabController.index + 1) % 3;
    _tabController.animateTo(nextIndex);
  }

  List<Map<String, dynamic>> aggregateByDate(
    List<Map<String, dynamic>> data,
    TimeFilter filter,
  ) {
    if (data.isEmpty) return [];

    final SplayTreeMap<DateTime, Map<String, int>> dateData = SplayTreeMap();

    for (final entry in data) {
      final createdAt = entry['created_at'] as DateTime;
      DateTime key;

      switch (filter) {
        case TimeFilter.daily:
          key = DateTime(createdAt.year, createdAt.month, createdAt.day);
          break;
        case TimeFilter.weekly:
          final weekday = createdAt.weekday;
          final diff = weekday - 1;
          key = DateTime(
            createdAt.year,
            createdAt.month,
            createdAt.day,
          ).subtract(Duration(days: diff));
          break;
        case TimeFilter.monthly:
          key = DateTime(createdAt.year, createdAt.month, 1);
          break;
      }

      final page = entry['page'] as int;
      final bookId = entry['book_id'] as String?;

      if (!dateData.containsKey(key)) {
        dateData[key] = {};
      }

      if (bookId != null) {
        dateData[key]![bookId] = (dateData[key]![bookId] ?? 0) < page
            ? page
            : dateData[key]![bookId]!;
      }
    }

    int cumulativePages = 0;
    final result = <Map<String, dynamic>>[];

    for (final entry in dateData.entries) {
      final dailyTotal = entry.value.values.fold<int>(
        0,
        (sum, page) => sum + page,
      );
      cumulativePages += dailyTotal;

      result.add({
        'date': entry.key,
        'cumulative_page': cumulativePages,
        'daily_page': dailyTotal,
      });
    }

    return result;
  }

  Map<String, dynamic> calculateStatistics(List<Map<String, dynamic>> data) {
    if (data.isEmpty) {
      return {
        'total_pages': 0,
        'average_daily': 0.0,
        'max_daily': 0,
        'min_daily': 0,
      };
    }

    final dailyPages = data.map((e) => e['daily_page'] as int).toList();
    final totalPages = data.last['cumulative_page'] as int;
    final averageDaily = dailyPages.isEmpty
        ? 0.0
        : dailyPages.reduce((a, b) => a + b) / dailyPages.length;
    final maxDaily = dailyPages.reduce((a, b) => a > b ? a : b);
    final minDaily = dailyPages.reduce((a, b) => a < b ? a : b);

    return {
      'total_pages': totalPages,
      'average_daily': averageDaily,
      'max_daily': maxDaily,
      'min_daily': minDaily,
    };
  }

  int _calculateStreak(List<Map<String, dynamic>> aggregatedData) {
    if (aggregatedData.isEmpty) return 0;

    int streak = 0;
    final today = DateTime.now();
    final todayNormalized = DateTime(today.year, today.month, today.day);

    final sortedDates = aggregatedData
        .map((e) => e['date'] as DateTime)
        .toList()
      ..sort((a, b) => b.compareTo(a));

    DateTime expectedDate = todayNormalized;

    if (sortedDates.isEmpty ||
        !_isSameDay(sortedDates.first, todayNormalized)) {
      expectedDate = todayNormalized.subtract(const Duration(days: 1));
    }

    for (final date in sortedDates) {
      final normalizedDate = DateTime(date.year, date.month, date.day);

      if (_isSameDay(normalizedDate, expectedDate)) {
        streak++;
        expectedDate = expectedDate.subtract(const Duration(days: 1));
      } else if (normalizedDate.isBefore(expectedDate)) {
        break;
      }
    }

    return streak;
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  void _showGoalSheet(BuildContext context) async {
    final vm = context.read<ReadingChartViewModel>();
    final currentYear = DateTime.now().year;
    final result = await ReadingGoalSheet.show(
      context: context,
      year: currentYear,
      currentGoal: vm.goalProgress['targetBooks'] as int?,
    );

    if (result != null && mounted) {
      await ReadingGoalService().setYearlyGoal(
        year: currentYear,
        targetBooks: result,
      );
      context.read<ReadingChartViewModel>().forceRefresh();
    }
  }

  void _scrollToSection(int index) {
    _isScrollingByTap = true;

    setState(() {
      _selectedSectionIndex = index;
    });

    _scrollTabBarToIndex(index);

    final context = _sectionKeys[index].currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      ).then((_) {
        _isScrollingByTap = false;
      });
    }
  }

  void _updateActiveSection() {
    if (_tabController.index != 1) return;
    if (_isScrollingByTap) return;

    if (!_analysisScrollController.hasClients) return;

    final scrollPosition = _analysisScrollController.position.pixels;
    final maxScroll = _analysisScrollController.position.maxScrollExtent;

    if (scrollPosition >= maxScroll - 50) {
      if (_selectedSectionIndex != _sectionKeys.length - 1) {
        setState(() {
          _selectedSectionIndex = _sectionKeys.length - 1;
        });
      }
      return;
    }

    int? closestIndex;
    double closestDistance = double.infinity;
    const screenCenter = 300.0;

    for (int i = 0; i < _sectionKeys.length; i++) {
      final context = _sectionKeys[i].currentContext;
      if (context == null) continue;

      final renderBox = context.findRenderObject() as RenderBox?;
      if (renderBox == null) continue;

      final position = renderBox.localToGlobal(Offset.zero);
      final sectionTop = position.dy;
      final sectionCenter = sectionTop + (renderBox.size.height / 2);
      final distance = (sectionCenter - screenCenter).abs();

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    if (closestIndex != null && _selectedSectionIndex != closestIndex) {
      setState(() {
        _selectedSectionIndex = closestIndex!;
      });
    }
  }

  bool _handleScrollNotification(ScrollNotification notification) {
    if (_tabController.index != 1) return false;
    if (_isScrollingByTap) return true;

    if (notification is ScrollUpdateNotification) {
      _updateActiveSection();
    } else if (notification is ScrollEndNotification) {
      _scrollTabBarToIndex(_selectedSectionIndex);
    }

    return false;
  }

  void _scrollTabBarToIndex(int index) {
    if (!_tabBarScrollController.hasClients) return;

    final tabContext = _tabKeys[index].currentContext;
    if (tabContext == null) return;

    final renderBox = tabContext.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    // Get tab's position relative to the scroll view
    final tabPosition = renderBox.localToGlobal(Offset.zero);
    final tabWidth = renderBox.size.width;

    // Get viewport width
    final viewportWidth = _tabBarScrollController.position.viewportDimension;

    // Calculate target scroll position to center the tab
    // tabPosition.dx is the tab's left edge position on screen
    // We want to center it, so: currentScroll + tabLeftEdge - (viewportWidth / 2) + (tabWidth / 2)
    final currentScroll = _tabBarScrollController.offset;
    final targetScroll =
        currentScroll + tabPosition.dx - (viewportWidth / 2) + (tabWidth / 2);

    // Clamp to valid scroll range
    final maxScroll = _tabBarScrollController.position.maxScrollExtent;
    final clampedScroll = targetScroll.clamp(0.0, maxScroll);

    _tabBarScrollController.animateTo(
      clampedScroll,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
    );
  }

  String _getFilterLabel(TimeFilter filter) {
    final l10n = AppLocalizations.of(context);
    switch (filter) {
      case TimeFilter.daily:
        return l10n.chartPeriodDaily;
      case TimeFilter.weekly:
        return l10n.chartPeriodWeekly;
      case TimeFilter.monthly:
        return l10n.chartPeriodMonthly;
    }
  }

  String _formatDate(DateTime date, TimeFilter filter) {
    switch (filter) {
      case TimeFilter.daily:
        return '${date.month}/${date.day}';
      case TimeFilter.weekly:
        return '${date.month}/${date.day}';
      case TimeFilter.monthly:
        return '${date.year}/${date.month}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    context.watch<ReadingChartViewModel>();

    return Scaffold(
      backgroundColor:
          isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
      appBar: AppBar(
        backgroundColor:
            isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
        elevation: 0,
        title: Text(AppLocalizations.of(context).chartTitle),
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : Colors.black,
        ),
        bottom: LiquidGlassTabBar(
          controller: _tabController,
          tabs: [
            AppLocalizations.of(context).chartTabOverview,
            AppLocalizations.of(context).chartTabAnalysis,
            AppLocalizations.of(context).chartTabActivity,
          ],
        ),
      ),
      body: SafeArea(
        child: Consumer<ReadingChartViewModel>(
          builder: (context, vm, _) => _buildContent(isDark, vm),
        ),
      ),
    );
  }

  Widget _buildContent(bool isDark, ReadingChartViewModel vm) {
    if (vm.isLoading && !vm.hasData) {
      return const ReadingChartSkeleton();
    }

    if (vm.errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                AppLocalizations.of(context).chartErrorLoadFailed,
                style: TextStyle(fontSize: 16, color: Colors.grey[700]),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: () =>
                      context.read<ReadingChartViewModel>().loadData(),
                  child: Text(AppLocalizations.of(context).chartErrorRetry)),
            ],
          ),
        ),
      );
    }

    final rawData = vm.cachedRawData ?? [];
    final aggregated = aggregateByDate(rawData, _selectedFilter);
    final stats = calculateStatistics(aggregated);
    final streak = _calculateStreak(aggregated);
    final currentYear = DateTime.now().year;

    return TabBarView(
      controller: _tabController,
      children: [
        _buildOverviewTab(isDark, vm, stats, streak, currentYear),
        _buildAnalysisTab(isDark, vm, currentYear, stats, streak),
        _buildActivityTab(isDark, vm, aggregated, streak, currentYear),
      ],
    );
  }

  Widget _buildOverviewTab(
    bool isDark,
    ReadingChartViewModel vm,
    Map<String, dynamic> stats,
    int streak,
    int currentYear,
  ) {
    final monthlyDataForChart = vm.monthlyBookCount.map(
      (month, count) =>
          MapEntry('$currentYear-${month.toString().padLeft(2, '0')}', count),
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AnnualGoalCard(
            targetBooks: vm.goalProgress['targetBooks'] as int? ?? 0,
            completedBooks: vm.goalProgress['completedBooks'] as int? ?? 0,
            year: currentYear,
            onSetGoal: () => _showGoalSheet(context),
          ),
          const SizedBox(height: 16),
          MonthlyBooksChart(
            monthlyData: monthlyDataForChart,
            year: currentYear,
          ),
        ],
      ),
    );
  }

  Widget _buildAnalysisTab(
    bool isDark,
    ReadingChartViewModel vm,
    int currentYear,
    Map<String, dynamic> stats,
    int streak,
  ) {
    final l10n = AppLocalizations.of(context);
    final genreMessage = _progressService.getTopGenreMessage(
      vm.genreDistribution,
      l10n,
    );
    final sections = [
      l10n.chartAiInsight,
      l10n.chartCompletionRate,
      l10n.chartRecordsHighlights,
      l10n.chartGenreAnalysis,
      l10n.chartReadingStats,
    ];

    return NotificationListener<ScrollNotification>(
      onNotification: _handleScrollNotification,
      child: CustomScrollView(
        key: const PageStorageKey('analysis_scroll'),
        controller: _analysisScrollController,
        slivers: [
          SliverPersistentHeader(
            pinned: true,
            delegate: _SectionTabBarDelegate(
              sections: sections,
              isDark: isDark,
              selectedIndex: _selectedSectionIndex,
              onTap: _scrollToSection,
              scrollController: _tabBarScrollController,
              tabKeys: _tabKeys,
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // AI Insight Card
                  Container(
                    key: _sectionKeys[0],
                    child: Consumer<ReadingInsightsViewModel>(
                      builder: (context, viewModel, _) {
                        return AiInsightCard(
                          isLoading: viewModel.isLoading,
                          insights: viewModel.insights,
                          error: viewModel.error,
                          canGenerate: viewModel.canGenerate,
                          bookCount: viewModel.bookCount,
                          onGenerate: viewModel.generateInsight,
                          onRetry: viewModel.generateInsight,
                          onClearMemory: viewModel.clearMemory,
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Completion Rate Card
                  Container(
                    key: _sectionKeys[1],
                    child: CompletionRateCard(
                      totalStarted: vm.totalStarted,
                      completed: vm.completedBooks,
                      abandoned: vm.abandonedBooks,
                      inProgress: vm.inProgressBooks,
                      completionRate: vm.completionRate,
                      abandonRate: vm.abandonRate,
                      retrySuccessRate: vm.retrySuccessRate,
                    ),
                  ),
                  const SizedBox(height: 16),

                  Container(
                    key: _sectionKeys[2],
                    child: HighlightStatsCard(
                      totalHighlights: vm.totalHighlights,
                      totalNotes: vm.totalNotes,
                      totalPhotos: vm.totalPhotos,
                      genreDistribution: vm.highlightGenreDistribution,
                    ),
                  ),
                  const SizedBox(height: 16),

                  Container(
                    key: _sectionKeys[3],
                    child: GenreAnalysisCard(
                      genreDistribution: vm.genreDistribution,
                      topGenreMessage: genreMessage,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    key: _sectionKeys[4],
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppLocalizations.of(context).chartReadingStats,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: isDark ? Colors.white : Colors.black,
                          ),
                        ),
                        const SizedBox(height: 12),
                        GridView.count(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.3,
                          children: [
                            _buildStatCard(
                              AppLocalizations.of(context).chartTotalPages,
                              '${stats['total_pages']}p',
                              Icons.menu_book_rounded,
                              BLabColors.primary,
                              isDark,
                            ),
                            _buildStatCard(
                              AppLocalizations.of(context).chartDailyAvgPages,
                              '${(stats['average_daily'] as double).toStringAsFixed(1)}p',
                              Icons.calendar_today_rounded,
                              BLabColors.success,
                              isDark,
                            ),
                            _buildStatCard(
                              AppLocalizations.of(context).chartMaxDaily,
                              '${stats['max_daily']}p',
                              Icons.trending_up_rounded,
                              BLabColors.warningAlt,
                              isDark,
                            ),
                            _buildStatCard(
                              AppLocalizations.of(context)
                                  .chartConsecutiveDays,
                              '$streak${AppLocalizations.of(context).unitDay}',
                              Icons.local_fire_department_rounded,
                              BLabColors.destructive,
                              isDark,
                            ),
                            _buildStatCard(
                              AppLocalizations.of(context).chartMinDaily,
                              '${stats['min_daily']}p',
                              Icons.trending_down_rounded,
                              BLabColors.info,
                              isDark,
                            ),
                            _buildStatCard(
                              AppLocalizations.of(context).chartTodayGoal,
                              '${(vm.goalRate * 100).toStringAsFixed(0)}%',
                              Icons.flag_rounded,
                              BLabColors.info,
                              isDark,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityTab(
    bool isDark,
    ReadingChartViewModel vm,
    List<Map<String, dynamic>> aggregated,
    int streak,
    int currentYear,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ReadingStreakHeatmap(
            dailyPages: vm.heatmapData,
            year: currentYear,
            currentStreak: streak,
          ),
          const SizedBox(height: 24),
          _buildReadingProgressChart(isDark, aggregated),
          const SizedBox(height: 24),
          Text(
            AppLocalizations.of(context).chartDailyPages,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: isDark ? Colors.white : Colors.black,
            ),
          ),
          const SizedBox(height: 12),
          if (aggregated.isEmpty)
            _buildEmptyListState(isDark)
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: aggregated.length > 10 ? 10 : aggregated.length,
              itemBuilder: (context, index) {
                final reversedIndex = aggregated.length - 1 - index;
                final item = aggregated[reversedIndex];
                final date = item['date'] as DateTime;
                final dailyPage = item['daily_page'] as int;
                final cumulativePage = item['cumulative_page'] as int;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? BLabColors.surfaceDark : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: BLabColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            '${date.day}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: BLabColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${date.year}${AppLocalizations.of(context).unitYear} ${date.month}${AppLocalizations.of(context).unitMonth} ${date.day}${AppLocalizations.of(context).unitDay}',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: isDark ? Colors.white : Colors.black,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${AppLocalizations.of(context).chartCumulativePages}: $cumulativePage ${AppLocalizations.of(context).chartDailyReadPages}',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? Colors.grey[400]
                                    : Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.add,
                                size: 16,
                                color: dailyPage > 0
                                    ? BLabColors.success
                                    : Colors.grey,
                              ),
                              Text(
                                '$dailyPage',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: dailyPage > 0
                                      ? BLabColors.success
                                      : Colors.grey,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            AppLocalizations.of(context).chartDailyReadPages,
                            style: TextStyle(
                              fontSize: 12,
                              color:
                                  isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildReadingProgressChart(
    bool isDark,
    List<Map<String, dynamic>> aggregated,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppLocalizations.of(context).chartReadingProgress,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: TimeFilter.values.map((filter) {
                    final isSelected = _selectedFilter == filter;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedFilter = filter;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? BLabColors.primary
                                : (isDark
                                    ? Colors.grey[800]
                                    : Colors.grey[200]),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            _getFilterLabel(filter),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSelected
                                  ? FontWeight.w600
                                  : FontWeight.normal,
                              color: isSelected
                                  ? Colors.white
                                  : (isDark
                                      ? Colors.grey[400]
                                      : Colors.grey[600]),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color:
                      isDark ? BLabColors.surfaceDark : BLabColors.surfaceLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                AppLocalizations.of(context).chartDailyPages,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
              const SizedBox(width: 16),
              Container(
                width: 12,
                height: 3,
                decoration: BoxDecoration(
                  color: BLabColors.primary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                AppLocalizations.of(context).chartCumulativePages,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (aggregated.isEmpty)
            SizedBox(
              height: 200,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.show_chart, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 12),
                    Text(
                      AppLocalizations.of(context).chartNoData,
                      style: TextStyle(color: Colors.grey[600], fontSize: 14),
                    ),
                  ],
                ),
              ),
            )
          else
            _buildCombinationChartContent(isDark, aggregated),
        ],
      ),
    );
  }

  Widget _buildEmptyListState(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.list_alt, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(
              AppLocalizations.of(context).chartNoReadingRecords,
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCombinationChartContent(
    bool isDark,
    List<Map<String, dynamic>> aggregated,
  ) {
    final maxDaily = aggregated
        .map((e) => e['daily_page'] as int)
        .reduce((a, b) => a > b ? a : b);
    final maxCumulative = aggregated.last['cumulative_page'] as int;

    final barGroups = aggregated.asMap().entries.map((entry) {
      final idx = entry.key;
      final dailyPage = entry.value['daily_page'] as int;
      final normalizedDaily = maxCumulative > 0
          ? (dailyPage / maxDaily) * maxCumulative * 0.3
          : 0.0;
      return BarChartGroupData(
        x: idx,
        barRods: [
          BarChartRodData(
            toY: normalizedDaily,
            color: BLabColors.success.withValues(alpha: 0.7),
            width: aggregated.length > 30 ? 4 : 8,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(2),
              topRight: Radius.circular(2),
            ),
          ),
        ],
      );
    }).toList();

    final lineSpots = aggregated.asMap().entries.map((entry) {
      final idx = entry.key;
      final cumulativePage = entry.value['cumulative_page'] as int;
      return FlSpot(idx.toDouble(), cumulativePage.toDouble());
    }).toList();

    return SizedBox(
      height: 250,
      child: Stack(
        children: [
          BarChart(
            BarChartData(
              barGroups: barGroups,
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 50,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        value.toInt().toString(),
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      );
                    },
                  ),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 32,
                    getTitlesWidget: (value, meta) {
                      final idx = value.toInt();
                      if (idx < 0 || idx >= aggregated.length) {
                        return const SizedBox();
                      }
                      final date = aggregated[idx]['date'] as DateTime;
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          _formatDate(date, _selectedFilter),
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      );
                    },
                    interval: (aggregated.length / 5).ceilToDouble().clamp(
                          1,
                          999,
                        ),
                  ),
                ),
              ),
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                getDrawingHorizontalLine: (value) {
                  return FlLine(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                    strokeWidth: 1,
                  );
                },
              ),
              borderData: FlBorderData(
                show: true,
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                    width: 1,
                  ),
                  left: BorderSide(
                    color: isDark ? Colors.grey[800]! : Colors.grey[300]!,
                    width: 1,
                  ),
                ),
              ),
              maxY: maxCumulative.toDouble() * 1.1,
              minY: 0,
              barTouchData: BarTouchData(enabled: false),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 50, bottom: 32),
            child: LineChart(
              LineChartData(
                lineBarsData: [
                  LineChartBarData(
                    spots: lineSpots,
                    isCurved: true,
                    color: BLabColors.primary,
                    barWidth: 3,
                    dotData: FlDotData(
                      show: aggregated.length <= 30,
                      getDotPainter: (spot, percent, barData, index) {
                        return FlDotCirclePainter(
                          radius: 3,
                          color: BLabColors.primary,
                          strokeWidth: 2,
                          strokeColor: Colors.white,
                        );
                      },
                    ),
                    belowBarData: BarAreaData(show: false),
                  ),
                ],
                titlesData: const FlTitlesData(show: false),
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                maxY: maxCumulative.toDouble() * 1.1,
                minY: 0,
                minX: 0,
                maxX: (aggregated.length - 1).toDouble(),
                lineTouchData: LineTouchData(
                  enabled: true,
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipItems: (touchedSpots) {
                      return touchedSpots.map((spot) {
                        final idx = spot.x.toInt();
                        if (idx >= 0 && idx < aggregated.length) {
                          final dailyPage =
                              aggregated[idx]['daily_page'] as int;
                          final cumulativePage =
                              aggregated[idx]['cumulative_page'] as int;
                          return LineTooltipItem(
                            '${AppLocalizations.of(context).chartDailyPages}: ${dailyPage}p\n${AppLocalizations.of(context).chartCumulativePages}: ${cumulativePage}p',
                            const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          );
                        }
                        return null;
                      }).toList();
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.surfaceDark : BLabColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.grey.withValues(alpha: 0.08),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                ),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTabBarDelegate extends SliverPersistentHeaderDelegate {
  final List<String> sections;
  final bool isDark;
  final int selectedIndex;
  final Function(int) onTap;
  final ScrollController scrollController;
  final List<GlobalKey> tabKeys;

  _SectionTabBarDelegate({
    required this.sections,
    required this.isDark,
    required this.selectedIndex,
    required this.onTap,
    required this.scrollController,
    required this.tabKeys,
  });

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
      child: SingleChildScrollView(
        controller: scrollController,
        scrollDirection: Axis.horizontal,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: sections.asMap().entries.map((entry) {
              final index = entry.key;
              final section = entry.value;
              final isSelected = index == selectedIndex;

              return Padding(
                key: tabKeys[index],
                padding: const EdgeInsets.only(right: 12),
                child: GestureDetector(
                  onTap: () => onTap(index),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? BLabColors.primary
                          : BLabColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: !isSelected
                          ? Border.all(
                              color: BLabColors.primary.withOpacity(0.3),
                              width: 1,
                            )
                          : null,
                    ),
                    child: Text(
                      section,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isSelected
                            ? Colors.white
                            : (isDark ? Colors.grey[600] : Colors.grey[400]),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  @override
  double get maxExtent => 56;

  @override
  double get minExtent => 56;

  @override
  bool shouldRebuild(_SectionTabBarDelegate oldDelegate) {
    return oldDelegate.sections != sections ||
        oldDelegate.isDark != isDark ||
        oldDelegate.selectedIndex != selectedIndex ||
        oldDelegate.tabKeys != tabKeys;
  }
}
