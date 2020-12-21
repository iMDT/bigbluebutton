/** @flow */

// import { CellMeasurer } from "react-virtualized";

export const DEFAULT_HEIGHT = 30;
export const DEFAULT_WIDTH = 100;

// Enables more intelligent mapping of a given column and row index to an item ID.
// This prevents a cell cache from being invalidated when its parent collection is modified.

/**
 * Caches measurements for a given cell.
 */
class CellMeasurerCache {
  

  constructor(params) {
    const {
      defaultHeight,
      defaultWidth,
      fixedHeight,
      fixedWidth,
      keyMapper,
      minHeight,
      minWidth,
    } = params;

    this._cellHeightCache = {};
    this._cellWidthCache = {};
    this._columnWidthCache = {};
    this._rowHeightCache = {};
    this._defaultHeight = 0;
    this._defaultWidth = 0;
    this._minHeight = 0;
    this._minWidth = 0;
    this._keyMapper = 0;
    this._hasFixedHeight = false;
    this._hasFixedWidth = false;
    this._columnCount = 0;
    this._rowCount = 0;

    this._hasFixedHeight = fixedHeight === true;
    this._hasFixedWidth = fixedWidth === true;
    this._minHeight = minHeight || 0;
    this._minWidth = minWidth || 0;
    this._keyMapper = keyMapper || defaultKeyMapper;

    this._defaultHeight = Math.max(
      this._minHeight,
      typeof defaultHeight === 'number' ? defaultHeight : DEFAULT_HEIGHT,
    );
    this._defaultWidth = Math.max(
      this._minWidth,
      typeof defaultWidth === 'number' ? defaultWidth : DEFAULT_WIDTH,
    );

    if (process.env.NODE_ENV !== 'production') {
      if (this._hasFixedHeight === false && this._hasFixedWidth === false) {
        console.warn(
          "CellMeasurerCache should only measure a cell's width or height. " +
            'You have configured CellMeasurerCache to measure both. ' +
            'This will result in poor performance.',
        );
      }

      if (this._hasFixedHeight === false && this._defaultHeight === 0) {
        console.warn(
          'Fixed height CellMeasurerCache should specify a :defaultHeight greater than 0. ' +
            'Failing to do so will lead to unnecessary layout and poor performance.',
        );
      }

      if (this._hasFixedWidth === false && this._defaultWidth === 0) {
        console.warn(
          'Fixed width CellMeasurerCache should specify a :defaultWidth greater than 0. ' +
            'Failing to do so will lead to unnecessary layout and poor performance.',
        );
      }
    }
  }

  clear(rowIndex, columnIndex = 0) {
    const key = this._keyMapper(rowIndex, columnIndex);

    delete this._cellHeightCache[key];
    delete this._cellWidthCache[key];

    this._updateCachedColumnAndRowSizes(rowIndex, columnIndex);
  }

  clearAll() {
    this._cellHeightCache = {};
    this._cellWidthCache = {};
    this._columnWidthCache = {};
    this._rowHeightCache = {};
    this._rowCount = 0;
    this._columnCount = 0;
  }

  columnWidth = ({index}) => {
    const key = this._keyMapper(0, index);

    return this._columnWidthCache[key] !== undefined
      ? this._columnWidthCache[key]
      : this._defaultWidth;
  };

  get defaultHeight() {
    return this._defaultHeight;
  }

  get defaultWidth() {
    return this._defaultWidth;
  }

  hasFixedHeight() {
    return this._hasFixedHeight;
  }

  hasFixedWidth() {
    return this._hasFixedWidth;
  }

  getHeight(rowIndex, columnIndex = 0) {
    if (this._hasFixedHeight) {
      return this._defaultHeight;
    } else {
      const key = this._keyMapper(rowIndex, columnIndex);

      return this._cellHeightCache[key] !== undefined
        ? Math.max(this._minHeight, this._cellHeightCache[key])
        : this._defaultHeight;
    }
  }

  getWidth(rowIndex, columnIndex = 0) {
    if (this._hasFixedWidth) {
      return this._defaultWidth;
    } else {
      const key = this._keyMapper(rowIndex, columnIndex);

      return this._cellWidthCache[key] !== undefined
        ? Math.max(this._minWidth, this._cellWidthCache[key])
        : this._defaultWidth;
    }
  }

  has(rowIndex, columnIndex = 0) {
    const key = this._keyMapper(rowIndex, columnIndex);

    return this._cellHeightCache[key] !== undefined;
  }

  rowHeight = ({index}) => {
    const key = this._keyMapper(index, 0);

    return this._rowHeightCache[key] !== undefined
      ? this._rowHeightCache[key]
      : this._defaultHeight;
  };

  set(
    rowIndex,
    columnIndex,
    width,
    height,
  ) {
    const key = this._keyMapper(rowIndex, columnIndex);

    if (columnIndex >= this._columnCount) {
      this._columnCount = columnIndex + 1;
    }
    if (rowIndex >= this._rowCount) {
      this._rowCount = rowIndex + 1;
    }

    // Size is cached per cell so we don't have to re-measure if cells are re-ordered.
    this._cellHeightCache[key] = height;
    this._cellWidthCache[key] = width;

    this._updateCachedColumnAndRowSizes(rowIndex, columnIndex);
  }

  _updateCachedColumnAndRowSizes(rowIndex, columnIndex) {
    // :columnWidth and :rowHeight are derived based on all cells in a column/row.
    // Pre-cache these derived values for faster lookup later.
    // Reads are expected to occur more frequently than writes in this case.
    // Only update non-fixed dimensions though to avoid doing unnecessary work.
    if (!this._hasFixedWidth) {
      let columnWidth = 0;
      for (let i = 0; i < this._rowCount; i++) {
        columnWidth = Math.max(columnWidth, this.getWidth(i, columnIndex));
      }
      const columnKey = this._keyMapper(0, columnIndex);
      this._columnWidthCache[columnKey] = columnWidth;
    }
    if (!this._hasFixedHeight) {
      let rowHeight = 0;
      for (let i = 0; i < this._columnCount; i++) {
        rowHeight = Math.max(rowHeight, this.getHeight(rowIndex, i));
      }
      const rowKey = this._keyMapper(rowIndex, 0);
      this._rowHeightCache[rowKey] = rowHeight;
    }
  }
}

export default CellMeasurerCache

function defaultKeyMapper(rowIndex, columnIndex) {
  return `${rowIndex}-${columnIndex}`;
}