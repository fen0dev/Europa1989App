export type RootStackParamList = {
    Manuals: undefined;
    ManualDetail: { manualId: string; title?: string };
    Section: { sectionId: string; title?: string };
    Article: { articleId: string; title?: string };
    PDF: { manualId: string; pdfUrl: string; title?: string };
  };