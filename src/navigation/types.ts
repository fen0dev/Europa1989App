import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Manuals: undefined;
  ManualDetail: { manualId: string; title?: string };
  Section: { sectionId: string; title?: string };
  Article: { articleId: string; title?: string };
  PDF: { manualId: string; pdfUrl: string; title?: string };
  AdminStack: undefined;
  AdminManualList: undefined;
  AdminManualEdit: { manualId?: string };
  AdminSectionEdit: { sectionId?: string; manualId: string };
  AdminArticleEdit: { articleId?: string; sectionId: string };
  AdminQuestions: { manualId: string };
  AdminNotesModeration: { manualId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  MFAEnroll: undefined;
  MFAVerify: { factorId: string; challengeId: string };
};

export type RootTabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

// Tipi helper per le props
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = 
  NativeStackScreenProps<AuthStackParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type RootTabScreenProps<T extends keyof RootTabParamList> = 
  BottomTabScreenProps<RootTabParamList, T>;

// Tipi per useNavigation hook
declare global {
  namespace ReactNavigation {
      interface RootParamList extends RootStackParamList, AuthStackParamList, RootTabParamList {}
  }
}