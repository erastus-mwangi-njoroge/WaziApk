import "package:flutter/material.dart";
import "../data/kenya_towns.dart";
import "../theme.dart";

const String _sep = " — ";

/// Towns that have sub-areas listed (e.g. "Nairobi"), so they can be labelled "(all areas)".
final Set<String> _townsWithAreas = {
  for (final g in kTownGroups)
    for (final o in g.options)
      if (o.contains(_sep)) o.split(_sep).first,
};

String _labelFor(String option) => _townsWithAreas.contains(option) ? "$option (all areas)" : option;

/// A form-field-looking tile that opens a searchable, county-grouped list of every
/// urban centre in Kenya. Keeps its own selection so callers that only store the
/// value (without rebuilding) still show the right text.
class TownPicker extends StatefulWidget {
  final String value;
  final ValueChanged<String> onChanged;
  final bool includeAny;
  final String anyLabel;
  final String? label;

  const TownPicker({
    super.key,
    required this.value,
    required this.onChanged,
    this.includeAny = false,
    this.anyLabel = "Any location",
    this.label,
  });

  @override
  State<TownPicker> createState() => _TownPickerState();
}

class _TownPickerState extends State<TownPicker> {
  late String _value = widget.value;

  @override
  void didUpdateWidget(covariant TownPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) _value = widget.value;
  }

  Future<void> _open() async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: WaziColors.paper,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(18))),
      builder: (_) => _TownSheet(selected: _value, includeAny: widget.includeAny, anyLabel: widget.anyLabel),
    );
    if (picked != null && picked != _value) {
      setState(() => _value = picked);
      widget.onChanged(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = _value == "Any" ? widget.anyLabel : _labelFor(_value);
    return InkWell(
      borderRadius: BorderRadius.circular(9),
      onTap: _open,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: widget.label,
          isDense: true,
          suffixIcon: const Icon(Icons.arrow_drop_down),
        ),
        child: Text(text, overflow: TextOverflow.ellipsis),
      ),
    );
  }
}

class _Row {
  final String text;
  final bool header;
  const _Row(this.text, {this.header = false});
}

class _TownSheet extends StatefulWidget {
  final String selected;
  final bool includeAny;
  final String anyLabel;
  const _TownSheet({required this.selected, required this.includeAny, required this.anyLabel});

  @override
  State<_TownSheet> createState() => _TownSheetState();
}

class _TownSheetState extends State<_TownSheet> {
  final _ctrl = TextEditingController();
  String _q = "";

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  List<_Row> _rows() {
    final q = _q.trim().toLowerCase();
    final rows = <_Row>[];
    for (final g in kTownGroups) {
      final countyHit = g.county.toLowerCase().contains(q);
      final opts = (q.isEmpty || countyHit) ? g.options : g.options.where((o) => o.toLowerCase().contains(q)).toList();
      if (opts.isEmpty) continue;
      rows.add(_Row("${g.county} County", header: true));
      rows.addAll(opts.map((o) => _Row(o)));
    }
    return rows;
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows();
    final showAny = widget.includeAny && _q.trim().isEmpty;
    final extra = showAny ? 1 : 0;
    final inset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.85,
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: WaziColors.line, borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                controller: _ctrl,
                onChanged: (v) => setState(() => _q = v),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: "Search town or county",
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _q.isEmpty
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _ctrl.clear();
                            setState(() => _q = "");
                          },
                        ),
                ),
              ),
            ),
            Expanded(
              child: (rows.isEmpty && !showAny)
                  ? Center(child: Text("No town matches \"${_q.trim()}\".", style: const TextStyle(color: WaziColors.inkSoft)))
                  : ListView.builder(
                      itemCount: rows.length + extra,
                      itemBuilder: (context, i) {
                        if (showAny && i == 0) {
                          return _OptionTile(text: widget.anyLabel, selected: widget.selected == "Any", onTap: () => Navigator.pop(context, "Any"));
                        }
                        final r = rows[i - extra];
                        if (r.header) {
                          return Container(
                            width: double.infinity,
                            color: WaziColors.paper2,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                            child: Text(r.text.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: WaziColors.inkSoft)),
                          );
                        }
                        return _OptionTile(text: _labelFor(r.text), selected: r.text == widget.selected, onTap: () => Navigator.pop(context, r.text));
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  final String text;
  final bool selected;
  final VoidCallback onTap;
  const _OptionTile({required this.text, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      title: Text(text, style: TextStyle(fontWeight: selected ? FontWeight.w700 : FontWeight.w500)),
      trailing: selected ? const Icon(Icons.check, color: WaziColors.green) : null,
      onTap: onTap,
    );
  }
}
