# Responsive footer and fixed header QA (issues #11 and #12)

The Vitest/jsdom layout tests verify pagination interactions, footer placement
outside the scrolling viewport, horizontal header transforms, matching virtual
header/body columns, and the fixed gutter's separate DOM position. jsdom does
not perform layout or painting: these tests cannot prove wrapping, lack of
page overflow, stacking order, menu clipping, or pixel alignment.

Run `pnpm dev` and open the local playground's **Pagination** example
(`#pagination`). Use enough columns to require horizontal scrolling, with the
row-header/index column enabled. Repeat with checkbox selection enabled and
with the row header disabled. Use both light and dark themes.

Test component widths of **360, 390, and 430px**, plus a normal desktop width
(at least 1024px). Also place the grid in a narrow flex/grid parent on a wide
page: reflow should follow the component's available width.

## Pagination

1. Confirm the row count, Rows per page label/select, page number/count,
   Previous, and Next are readable and intact. Narrow layouts should wrap
   between groups without overlapping or clipping; no controls should hide
   or shrink. Desktop should retain its right-aligned single-row layout.
2. Change rows per page and navigate Next/Previous, including first and last
   pages. Confirm counts and disabled states update correctly.
3. Scroll horizontally in both directions, then to the bottom of the viewport.
   Confirm the footer remains stationary and intact.
4. Confirm only the grid viewport scrolls horizontally. Check
   `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
   and confirm the page cannot be dragged sideways.

## Fixed row header and overlays

1. Scroll horizontally in both directions, including small partial-column
   offsets and offsets large enough to change the virtual column range.
2. Confirm captions, filter indicators, action buttons, resize handles, and
   reorder indicators pass behind the fixed gutter. Check the index and
   select-all checkbox remain visible and usable.
3. Confirm body cells and headers remain aligned throughout scrolling,
   resizing, column visibility changes, and reordering.
4. Open header menus near both viewport edges. Confirm menus extend below the
   header, stay usable, and preserve sorting, filtering, and Quick Search.
5. Resize and reorder columns near both edges. Confirm resize handles and
   drop indicators remain usable and the fixed gutter stays above them.
6. Open the column chooser, toggle columns, close it, and reopen it. Confirm
   it remains usable, including when every column is hidden.
7. Tab through footer controls and header actions; check menu Escape/focus
   restoration, grid arrow-key navigation, and row/checkbox selection.

The header fix raises only the fixed header gutter above the scrolling header
stack. Its opaque theme background covers the 36px header band. Header overflow
remains visible so menus below that band are not clipped. Body sticky cells,
scroll transforms, virtualizer calculations, and public APIs are unchanged.
