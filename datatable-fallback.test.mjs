import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const fallbackSource = readFileSync("./datatable-fallback.js", "utf8");

function hucre(text, order = null) {
  return {
    textContent: String(text),
    getAttribute(name) {
      return name === "data-order" ? order : null;
    }
  };
}

function satir(values) {
  return {
    cells: values.map(value => Array.isArray(value) ? hucre(value[0], value[1]) : hucre(value))
  };
}

function tabloContext(rows, existingDataTable = null) {
  const tbody = {
    rows: [...rows],
    appendChild(row) {
      const index = this.rows.indexOf(row);
      if (index >= 0) this.rows.splice(index, 1);
      this.rows.push(row);
      return row;
    }
  };
  const table = { tBodies: [tbody] };
  const documentElement = { dataset: {} };
  const context = {
    document: {
      documentElement,
      querySelector(selector) {
        return selector === "#tablo" ? table : null;
      }
    },
    window: existingDataTable ? { DataTable: existingDataTable } : {}
  };
  vm.runInNewContext(fallbackSource, context);
  return { context, tbody };
}

function ilkHucreler(tbody) {
  return tbody.rows.map(row => row.cells[0].textContent);
}

test("DataTable fallback yoksa kendini kurar ve sayısal sıralama yapar", () => {
  const rows = [satir(["10"]), satir(["2"]), satir(["1"])];
  const { context, tbody } = tabloContext(rows);

  assert.equal(context.window.DataTable.name, "DataTableFallback");
  assert.equal(context.document.documentElement.dataset.obsDatatable, "fallback");

  const dt = new context.window.DataTable("#tablo", { order: [[0, "asc"]], pageLength: 25 });

  assert.deepEqual(ilkHucreler(tbody), ["1", "2", "10"]);
  assert.equal(dt.page.len(), 25);
  assert.equal(dt.page.info().recordsTotal, 3);
});

test("DataTable fallback data-order ve destroy ile özgün sırayı korur", () => {
  const rows = [
    satir([[ "A", "30" ]]),
    satir([[ "B", "10" ]]),
    satir([[ "C", "20" ]])
  ];
  const { context, tbody } = tabloContext(rows);
  const dt = new context.window.DataTable("#tablo", { order: [[0, "desc"]] });

  assert.deepEqual(ilkHucreler(tbody), ["A", "C", "B"]);

  dt.destroy();
  assert.deepEqual(ilkHucreler(tbody), ["A", "B", "C"]);
});

test("DataTable zaten varsa fallback üzerine yazmaz", () => {
  function NativeDataTable() {}
  const { context } = tabloContext([], NativeDataTable);

  assert.equal(context.window.DataTable, NativeDataTable);
  assert.equal(context.document.documentElement.dataset.obsDatatable, "native");
});
