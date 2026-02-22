import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:book_golas/l10n/app_localizations.dart';

class LocaleTimePicker extends StatefulWidget {
  final bool isDark;
  final int initialHour;
  final int initialMinute;
  final void Function(int hour, int minute) onTimeChanged;

  const LocaleTimePicker({
    super.key,
    required this.isDark,
    required this.initialHour,
    required this.initialMinute,
    required this.onTimeChanged,
  });

  @override
  State<LocaleTimePicker> createState() => _LocaleTimePickerState();
}

class _LocaleTimePickerState extends State<LocaleTimePicker> {
  late int _currentAmPmIndex;
  late int _currentHour12;
  late int _currentMinute;

  late FixedExtentScrollController _amPmController;
  late FixedExtentScrollController _hourController;
  late FixedExtentScrollController _minuteController;

  late List<String> _amPmLabels;
  final List<int> _hours12 = List.generate(12, (i) => i == 0 ? 12 : i);
  final List<int> _minutes = List.generate(60, (i) => i);

  @override
  void initState() {
    super.initState();
    _amPmLabels = [];
    _initializeFromHour24(widget.initialHour, widget.initialMinute);

    _amPmController = FixedExtentScrollController(
      initialItem: _currentAmPmIndex,
    );
    _hourController = FixedExtentScrollController(
      initialItem: _hours12.indexOf(_currentHour12),
    );
    _minuteController = FixedExtentScrollController(
      initialItem: _currentMinute,
    );
  }

  void _initializeFromHour24(int hour24, int minute) {
    _currentMinute = minute;

    if (hour24 == 0) {
      _currentAmPmIndex = 0;
      _currentHour12 = 12;
    } else if (hour24 < 12) {
      _currentAmPmIndex = 0;
      _currentHour12 = hour24;
    } else if (hour24 == 12) {
      _currentAmPmIndex = 1;
      _currentHour12 = 12;
    } else {
      _currentAmPmIndex = 1;
      _currentHour12 = hour24 - 12;
    }
  }

  int _convertTo24Hour() {
    if (_currentAmPmIndex == 0) {
      return _currentHour12 == 12 ? 0 : _currentHour12;
    } else {
      return _currentHour12 == 12 ? 12 : _currentHour12 + 12;
    }
  }

  void _onTimePartChanged() {
    final hour24 = _convertTo24Hour();
    widget.onTimeChanged(hour24, _currentMinute);
  }

  @override
  void dispose() {
    _amPmController.dispose();
    _hourController.dispose();
    _minuteController.dispose();
    super.dispose();
  }

  Widget _buildWheel({
    required List<dynamic> items,
    required FixedExtentScrollController controller,
    required String suffix,
    required Function(int index) onSelected,
    double width = 80,
    bool isStringList = false,
  }) {
    return SizedBox(
      width: width,
      child: ListWheelScrollView.useDelegate(
        controller: controller,
        itemExtent: 40,
        physics: const FixedExtentScrollPhysics(),
        diameterRatio: 1.5,
        perspective: 0.003,
        onSelectedItemChanged: (index) {
          HapticFeedback.selectionClick();
          onSelected(index);
        },
        childDelegate: ListWheelChildBuilderDelegate(
          childCount: items.length,
          builder: (context, index) {
            final isSelected = controller.hasClients
                ? controller.selectedItem == index
                : index == controller.initialItem;

            final displayText = isStringList
                ? items[index] as String
                : '${items[index]}$suffix';

            return Center(
              child: Text(
                displayText,
                style: TextStyle(
                  fontSize: isSelected ? 20 : 16,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected
                      ? (widget.isDark ? Colors.white : Colors.black)
                      : (widget.isDark ? Colors.grey[600] : Colors.grey[400]),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    _amPmLabels = [l10n.timeAm, l10n.timePm];

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildWheel(
          items: _amPmLabels,
          controller: _amPmController,
          suffix: '',
          width: 70,
          isStringList: true,
          onSelected: (index) {
            setState(() {
              _currentAmPmIndex = index;
            });
            _onTimePartChanged();
          },
        ),
        _buildWheel(
          items: _hours12,
          controller: _hourController,
          suffix: l10n.unitHour,
          width: 70,
          onSelected: (index) {
            setState(() {
              _currentHour12 = _hours12[index];
            });
            _onTimePartChanged();
          },
        ),
        _buildWheel(
          items: _minutes,
          controller: _minuteController,
          suffix: l10n.unitMinute,
          width: 70,
          onSelected: (index) {
            setState(() {
              _currentMinute = index;
            });
            _onTimePartChanged();
          },
        ),
      ],
    );
  }
}
