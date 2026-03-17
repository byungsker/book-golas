import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class ReadingProgressScreen extends StatelessWidget {
  final String bookId;
  const ReadingProgressScreen({super.key, required this.bookId});

  Future<List<Map<String, dynamic>>> fetchProgressHistory(String bookId) async {
    final response = await Supabase.instance.client
        .from('reading_progress_history')
        .select('page, created_at, books!inner(deleted_at)')
        .eq('book_id', bookId)
        .isFilter('books.deleted_at', null)
        .order('created_at', ascending: true);
    return (response as List)
        .map((e) => {
              'page': e['page'] as int,
              'created_at': DateTime.parse(e['created_at'] as String),
            })
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context).readingProgressTitle),
        backgroundColor:
            isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
        foregroundColor: isDark ? Colors.white : Colors.black,
        elevation: 0,
      ),
      backgroundColor:
          isDark ? BLabColors.scaffoldDark : BLabColors.scaffoldLight,
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: fetchProgressHistory(bookId),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return Text(
                  AppLocalizations.of(context).readingProgressLoadFailed);
            }
            final data = snapshot.data ?? [];
            if (data.isEmpty) {
              return Text(
                  AppLocalizations.of(context).readingProgressNoRecords);
            }
            final spots = data.asMap().entries.map((entry) {
              final idx = entry.key;
              final page = entry.value['page'] as int;
              return FlSpot(idx.toDouble(), page.toDouble());
            }).toList();
            return SizedBox(
              height: 240,
              child: LineChart(
                LineChartData(
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: BLabColors.primary,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                    ),
                  ],
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: true),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final idx = value.toInt();
                          if (idx < 0 || idx >= data.length) {
                            return const SizedBox();
                          }
                          final date = data[idx]['created_at'] as DateTime;
                          return Text(
                            '${date.month}/${date.day}',
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                        interval:
                            (data.length / 4).ceilToDouble().clamp(1, 999),
                      ),
                    ),
                  ),
                  gridData: const FlGridData(show: true),
                  borderData: FlBorderData(show: false),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
