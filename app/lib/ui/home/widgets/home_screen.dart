import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';
import 'package:book_golas/ui/home/widgets/pro_upgrade_banner.dart';
import 'package:book_golas/ui/book_list/widgets/book_list_screen.dart';
import 'package:book_golas/ui/subscription/view_model/subscription_view_model.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isBannerDismissed = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? BLabColors.scaffoldDark : BLabColors.elevatedLight,
      appBar: _buildAppBar(isDark),
      body: Column(
        children: [
          if (!_isBannerDismissed)
            Consumer<SubscriptionViewModel>(
              builder: (context, subscriptionVm, _) => !subscriptionVm.isProUser
                  ? ProUpgradeBanner(
                      onDismiss: () {
                        setState(() {
                          _isBannerDismissed = true;
                        });
                      },
                    )
                  : const SizedBox.shrink(),
            ),
          const Expanded(
            child: BookListScreen(),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(bool isDark) {
    return AppBar(
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      scrolledUnderElevation: 0,
      title: Text(AppLocalizations.of(context).homeBookList),
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: isDark ? Colors.white : Colors.black,
      ),
    );
  }
}
