import { applyFilterData } from '../filtering/filtering';
import { applyQuickSearch } from '../quick-search/quickSearch';
import { applySortData } from '../sorting/sorting';
export function applyDataTransforms(data, quickSearchQuery, filters, sort) {
    return applySortData(applyFilterData(applyQuickSearch(data, quickSearchQuery), filters), sort);
}
//# sourceMappingURL=applyDataTransforms.js.map