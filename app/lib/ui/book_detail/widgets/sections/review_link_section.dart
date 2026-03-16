import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

/// 독후감 링크 관리 섹션
///
/// 완독한 책 상세 화면에서 독후감 링크를 추가/수정/열기 할 수 있는 위젯
class ReviewLinkSection extends StatelessWidget {
  final String? reviewLink;
  final String? aladinUrl;
  final Function(String) onSaveReviewLink;
  final bool isCompleted;

  const ReviewLinkSection({
    super.key,
    this.reviewLink,
    this.aladinUrl,
    required this.onSaveReviewLink,
    this.isCompleted = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (!isCompleted) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? BLabColors.subtleDark : Colors.grey[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.grey[800]! : Colors.grey[200]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              children: [
                Icon(
                  Icons.link_rounded,
                  size: 20,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
                const SizedBox(width: 8),
                Text(
                  AppLocalizations.of(context).dialogViewFull,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          if (aladinUrl != null && aladinUrl!.isNotEmpty)
            _buildLinkTile(
              context: context,
              icon: Icons.store_rounded,
              iconColor: Colors.blue,
              title: '알라딘에서 보기',
              subtitle: AppLocalizations.of(context).bookInfoDetail,
              url: aladinUrl!,
              isDark: isDark,
            ),
          _buildReviewLinkTile(context, isDark),
        ],
      ),
    );
  }

  Widget _buildLinkTile({
    required BuildContext context,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required String url,
    required bool isDark,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 20, color: iconColor),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: isDark ? Colors.white : Colors.black87,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 12,
          color: isDark ? Colors.grey[500] : Colors.grey[600],
        ),
      ),
      trailing: Icon(
        Icons.open_in_new_rounded,
        size: 18,
        color: isDark ? Colors.grey[500] : Colors.grey[600],
      ),
      onTap: () async {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      },
    );
  }

  Widget _buildReviewLinkTile(BuildContext context, bool isDark) {
    final hasReviewLink = reviewLink != null && reviewLink!.isNotEmpty;

    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: hasReviewLink
              ? Colors.green.withOpacity(0.1)
              : Colors.orange.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          hasReviewLink ? Icons.article_rounded : Icons.add_link_rounded,
          size: 20,
          color: hasReviewLink ? Colors.green : Colors.orange,
        ),
      ),
      title: Text(
        hasReviewLink
            ? AppLocalizations.of(context).dialogViewFull
            : AppLocalizations.of(context).dialogEdit,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: isDark ? Colors.white : Colors.black87,
        ),
      ),
      subtitle: Text(
        hasReviewLink
            ? AppLocalizations.of(context).dialogViewFull
            : AppLocalizations.of(context).dialogEdit,
        style: TextStyle(
          fontSize: 12,
          color: isDark ? Colors.grey[500] : Colors.grey[600],
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: hasReviewLink
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: Icon(
                    Icons.edit_rounded,
                    size: 18,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                  onPressed: () => _showEditDialog(context, isDark),
                ),
                Icon(
                  Icons.open_in_new_rounded,
                  size: 18,
                  color: isDark ? Colors.grey[500] : Colors.grey[600],
                ),
              ],
            )
          : Icon(
              Icons.chevron_right_rounded,
              color: isDark ? Colors.grey[500] : Colors.grey[600],
            ),
      onTap: hasReviewLink
          ? () async {
              final uri = Uri.parse(reviewLink!);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            }
          : () => _showEditDialog(context, isDark),
    );
  }

  void _showEditDialog(BuildContext context, bool isDark) {
    final controller = TextEditingController(text: reviewLink);
    String? errorText;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: BoxDecoration(
                color: isDark ? BLabColors.surfaceDark : Colors.white,
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    AppLocalizations.of(context).dialogEdit,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                      color: isDark ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppLocalizations.of(context).dialogEdit,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: controller,
                    autofocus: true,
                    keyboardType: TextInputType.url,
                    onChanged: (value) {
                      setModalState(() {
                        if (value.isNotEmpty && !_isValidUrl(value)) {
                          errorText = AppLocalizations.of(context).invalidUrl;
                        } else {
                          errorText = null;
                        }
                      });
                    },
                    decoration: InputDecoration(
                      labelText: AppLocalizations.of(context).dialogEdit,
                      hintText: 'https://blog.naver.com/...',
                      errorText: errorText,
                      prefixIcon: const Icon(Icons.link_rounded),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: errorText != null
                              ? Colors.red
                              : BLabColors.primary,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      if (reviewLink != null && reviewLink!.isNotEmpty)
                        Expanded(
                          child: TextButton(
                            onPressed: () {
                              Navigator.pop(context);
                              onSaveReviewLink('');
                            },
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              foregroundColor: Colors.red,
                            ),
                            child: Text(
                                AppLocalizations.of(context).commonDelete),
                          ),
                        )
                      else
                        Expanded(
                          child: TextButton(
                            onPressed: () => Navigator.pop(context),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: Text(
                                AppLocalizations.of(context).commonCancel),
                          ),
                        ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: errorText == null &&
                                  controller.text.trim().isNotEmpty
                              ? () {
                                  Navigator.pop(context);
                                  onSaveReviewLink(controller.text.trim());
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: BLabColors.primary,
                            disabledBackgroundColor:
                                isDark ? Colors.grey[700] : Colors.grey[300],
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            AppLocalizations.of(context).commonSave,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: errorText == null &&
                                      controller.text.trim().isNotEmpty
                                  ? Colors.white
                                  : (isDark
                                      ? Colors.grey[500]
                                      : Colors.grey[500]),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  bool _isValidUrl(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.hasScheme && (uri.scheme == 'http' || uri.scheme == 'https');
    } catch (e) {
      return false;
    }
  }
}
