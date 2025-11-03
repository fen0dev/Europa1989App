import { useInfiniteQuery } from '@tanstack/react-query';
import { getManualNotesPaginated, ManualNote, NoteType } from '../api/notes';

export function usePaginatedNotes(
    manualId: string,
    options?: {
        sectionId?: string;
        articleId?: string;
        noteType?: NoteType;
        sortBy?: 'recent' | 'helpful' | 'oldest';
        pageSize?: number;
    }
) {
    return useInfiniteQuery({
        queryKey: ['manual-notes-paginated', manualId, options],
        queryFn: ({ pageParam = 1 }) =>
            getManualNotesPaginated(manualId, {
                ...options,
                pagination: { page: pageParam, pageSize: options?.pageSize ?? 20 },
            }),
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
    });
}