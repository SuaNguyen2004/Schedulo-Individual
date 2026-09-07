/**
 * Calculates page numbers and ellipsis for pagination component.
 * - If totalPages <= 5: returns [1, 2, 3, 4, 5] (or available pages).
 * - If totalPages > 5: ALWAYS returns exactly 7 positions for a fixed pagination layout:
 *   - Page <= 2: [1, 2, 3, 4, 5, "...", totalPages]
 *   - Page >= totalPages - 1: [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
 *   - Middle: [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages]
 */
export const getPaginationRange = (currentPage: number, totalPages: number): (number | string)[] => {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 2) {
        return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 1) {
        return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
};
