export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
export function sumSizes(sizes, startIndex, endIndex) {
    let total = 0;
    for (let index = startIndex; index < endIndex; index += 1) {
        total += Math.max(1, sizes[index] ?? 0);
    }
    return total;
}
//# sourceMappingURL=math.js.map