/**
 * Calculates page numbers and ellipsis for pagination component.
 * - If totalPages <= 3: returns [1, 2, 3] (or available pages).
 * - If totalPages > 3 and currentPage <= 3: returns [1, 2, 3, "...", totalPages].
 * - Dynamically adjusts for middle and end page navigation.
 */
export const getPaginationRange = (currentPage: number, totalPages: number): (number | string)[] => {
    if (totalPages <= 3) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let pages: (number | string)[] = [];

    if (currentPage <= 3) {
        pages = [1, 2, 3];
        if (totalPages > 4) {
            pages.push("...", totalPages);
        } else if (totalPages === 4) {
            pages.push(4);
        }
    } else if (currentPage >= totalPages - 2) {
        const start = totalPages - 2;
        if (start > 2) {
            pages = [1, "...", start, totalPages - 1, totalPages];
        } else if (start === 2) {
            pages = [1, 2, totalPages - 1, totalPages];
        } else {
            pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        }
    } else {
        pages = [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
    }

    return pages;
};
