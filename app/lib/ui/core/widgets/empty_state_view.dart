import 'package:flutter/material.dart';

import 'package:book_golas/ui/core/widgets/liquid_glass_button.dart';

class EmptyStateView extends StatelessWidget {
  final String message;
  final bool showButton;
  final String? buttonLabel;
  final VoidCallback? onButtonPressed;

  const EmptyStateView({
    super.key,
    required this.message,
    this.showButton = false,
    this.buttonLabel,
    this.onButtonPressed,
  });

  static const _grayscaleMatrix = ColorFilter.matrix(<double>[
    0.2126,
    0.7152,
    0.0722,
    0,
    0,
    0.2126,
    0.7152,
    0.0722,
    0,
    0,
    0.2126,
    0.7152,
    0.0722,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ]);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 80),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ColorFiltered(
              colorFilter: _grayscaleMatrix,
              child: Image.asset(
                'assets/images/logo.png',
                width: 80,
                height: 80,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              style: const TextStyle(
                fontSize: 15,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            if (showButton && buttonLabel != null) ...[
              const SizedBox(height: 24),
              BLabButton(
                text: buttonLabel!,
                onPressed: onButtonPressed,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
