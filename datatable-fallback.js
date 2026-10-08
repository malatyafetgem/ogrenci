// Minimal DataTable fallback for CDN/network failures.
(function () {
  if (window.DataTable) {
    document.documentElement.dataset.obsDatatable = "native";
    return;
  }

  function cellValue(row, index) {
    const cell = row.cells[index];
    if (!cell) return "";
    return cell.getAttribute("data-order") || cell.textContent.trim();
  }

  function compareCellValues(a, b, direction) {
    const an = Number(a);
    const bn = Number(b);
    let result;

    if (Number.isFinite(an) && Number.isFinite(bn)) {
      result = an - bn;
    } else {
      result = String(a).localeCompare(String(b), "tr", { numeric: true, sensitivity: "base" });
    }

    return direction === "desc" ? -result : result;
  }

  class DataTableFallback {
    constructor(selector, options = {}) {
      this.table = typeof selector === "string" ? document.querySelector(selector) : selector;
      this.options = options;
      this.tbody = this.table?.tBodies?.[0] || null;
      this.originalRows = this.tbody ? Array.from(this.tbody.rows) : [];
      this.pageIndex = 0;
      this.pageLength = Number.isFinite(Number(options.pageLength)) ? Number(options.pageLength) : -1;

      const page = value => {
        if (value === undefined) return this.pageIndex;
        this.pageIndex = Number(value) || 0;
        return this;
      };
      page.len = value => {
        if (value === undefined) return this.pageLength;
        this.pageLength = Number(value);
        return this;
      };
      page.info = () => ({
        page: this.pageIndex,
        length: this.pageLength,
        recordsTotal: this.rows().nodes().length,
        recordsDisplay: this.rows().nodes().length
      });
      this.page = page;

      this.applyInitialOrder();
    }

    applyInitialOrder() {
      if (!this.tbody || !Array.isArray(this.options.order) || !this.options.order.length) return;

      const orders = this.options.order
        .filter(order => Array.isArray(order) && Number.isInteger(order[0]))
        .map(([index, direction]) => [index, direction === "desc" ? "desc" : "asc"]);

      if (!orders.length) return;

      const sortedRows = Array.from(this.tbody.rows).map((row, originalIndex) => ({ row, originalIndex }));
      sortedRows.sort((a, b) => {
        for (const [index, direction] of orders) {
          const result = compareCellValues(cellValue(a.row, index), cellValue(b.row, index), direction);
          if (result) return result;
        }
        return a.originalIndex - b.originalIndex;
      });

      sortedRows.forEach(({ row }) => this.tbody.appendChild(row));
    }

    rows() {
      return {
        nodes: () => (this.tbody ? Array.from(this.tbody.rows) : [])
      };
    }

    draw() {
      return this;
    }

    destroy() {
      if (this.tbody) this.originalRows.forEach(row => this.tbody.appendChild(row));
    }
  }

  DataTableFallback.tables = function () {
    return [];
  };
  DataTableFallback.Api = class {};

  window.DataTable = DataTableFallback;
  document.documentElement.dataset.obsDatatable = "fallback";
})();
