/**
 * Comparative table filtering helpers extracted from main.js.
 * Methods are designed to run with `this` bound to the Alpine component.
 */
export function createComparativeTableMixin() {
  return {
    _normCompCell(v) {
      const s = String(v ?? '').trim();
      if (!s || s === '—' || s === '-') return '';
      return s.replace(/[,₹\s()]/g, '').toLowerCase();
    },

    _compRowIsChanged(row) {
      const vals = (row?.cells ?? [])
        .map((v) => this._normCompCell(v))
        .filter(Boolean);
      if (vals.length <= 1) return false;
      return new Set(vals).size > 1;
    },

    _compRowMatches(row, q) {
      if (!q) return true;
      const hay = [row?.label, ...(row?.cells ?? []), row?.total]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
      return hay.includes(q);
    },

    filteredComparativeRows() {
      const rows = this.comparativeSnap?.displayRows ?? [];
      const q = this.comparativeSearch.trim().toLowerCase();
      return rows.filter((row) => {
        if (this.comparativeOnlyChanged && !this._compRowIsChanged(row)) return false;
        return this._compRowMatches(row, q);
      });
    },

    comparativeChangedCount() {
      const rows = this.comparativeSnap?.displayRows ?? [];
      return rows.filter((row) => this._compRowIsChanged(row)).length;
    },

    clearComparativeFilters() {
      this.comparativeSearch = '';
      this.comparativeOnlyChanged = false;
    },
  };
}
