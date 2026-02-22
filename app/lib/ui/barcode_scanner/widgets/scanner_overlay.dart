import 'package:flutter/material.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class ScannerOverlay extends StatelessWidget {
  const ScannerOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final scanAreaWidth = constraints.maxWidth * 0.85;
        const scanAreaHeight = 160.0;

        return Stack(
          children: [
            ColorFiltered(
              colorFilter: ColorFilter.mode(
                Colors.black.withValues(alpha: 0.6),
                BlendMode.srcOut,
              ),
              child: Stack(
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      color: Colors.black,
                      backgroundBlendMode: BlendMode.dstOut,
                    ),
                  ),
                  Align(
                    alignment: Alignment.center,
                    child: Container(
                      width: scanAreaWidth,
                      height: scanAreaHeight,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Center(
              child: Container(
                width: scanAreaWidth,
                height: scanAreaHeight,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white, width: 2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      top: 0,
                      left: 0,
                      child: _buildCorner(isTop: true, isLeft: true),
                    ),
                    Positioned(
                      top: 0,
                      right: 0,
                      child: _buildCorner(isTop: true, isLeft: false),
                    ),
                    Positioned(
                      bottom: 0,
                      left: 0,
                      child: _buildCorner(isTop: false, isLeft: true),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: _buildCorner(isTop: false, isLeft: false),
                    ),
                  ],
                ),
              ),
            ),
            const Positioned(
              bottom: 120,
              left: 0,
              right: 0,
              child: Text(
                '바코드를 프레임 안에 맞춰주세요',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCorner({required bool isTop, required bool isLeft}) {
    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        border: Border(
          top: isTop
              ? const BorderSide(color: BLabColors.primary, width: 4)
              : BorderSide.none,
          bottom: !isTop
              ? const BorderSide(color: BLabColors.primary, width: 4)
              : BorderSide.none,
          left: isLeft
              ? const BorderSide(color: BLabColors.primary, width: 4)
              : BorderSide.none,
          right: !isLeft
              ? const BorderSide(color: BLabColors.primary, width: 4)
              : BorderSide.none,
        ),
        borderRadius: BorderRadius.only(
          topLeft: isTop && isLeft ? const Radius.circular(12) : Radius.zero,
          topRight: isTop && !isLeft ? const Radius.circular(12) : Radius.zero,
          bottomLeft:
              !isTop && isLeft ? const Radius.circular(12) : Radius.zero,
          bottomRight:
              !isTop && !isLeft ? const Radius.circular(12) : Radius.zero,
        ),
      ),
    );
  }
}
