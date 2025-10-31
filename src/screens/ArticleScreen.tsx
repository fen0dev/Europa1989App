import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getArticle, trackArticleRead } from '../api/manuals';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { WebView } from 'react-native-webview';
import { colors, spacing } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import ErrorView from './error/ErrorView';
import { SkeletonLoader } from './loader/SkeletonLoader';

type Props = NativeStackScreenProps<RootStackParamList, 'Article'>;

export default function ArticleScreen({ route }: Props) {
  const { articleId } = route.params;
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [webViewReady, setWebViewReady] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => getArticle(articleId),
  });

  useEffect(() => {
    if (data?.id) {
      trackArticleRead(data.id).catch(() => {});
    }
  }, [data?.id]);

  if (isLoading) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.loadingContainer}
      >
        <SkeletonLoader width="90%" height={24} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="100%" height={16} style={{ marginBottom: spacing.xs }} />
        <SkeletonLoader width="100%" height={16} style={{ marginBottom: spacing.xs }} />
        <SkeletonLoader width="85%" height={16} style={{ marginBottom: spacing.lg }} />
        <SkeletonLoader width="100%" height={200} style={{ marginBottom: spacing.md }} />
        <SkeletonLoader width="100%" height={16} style={{ marginBottom: spacing.xs }} />
        <SkeletonLoader width="100%" height={16} style={{ marginBottom: spacing.xs }} />
        <SkeletonLoader width="95%" height={16} />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <ErrorView
        title="Unable to Load Article"
        message="There was an error loading this article. Please check your connection and try again."
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  if (!data) {
    return (
      <ErrorView
        title="Article Not Found"
        message="This article could not be found or may have been removed."
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  if (data.content_html) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0b0f14;
              color: #e8eef7;
              padding: 20px;
              line-height: 1.6;
              margin: 0;
            }
            h1, h2, h3 {
              color: #e8eef7;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            p {
              margin-bottom: 16px;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
            }
            a {
              color: #4f8cff;
            }
          </style>
        </head>
        <body>
          ${data.content_html}
        </body>
      </html>
    `;

    return (
      <View style={styles.container}>
        {!webViewReady && (
          <View style={styles.webViewLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading article...</Text>
          </View>
        )}
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={[styles.webView, { height, width }]}
          onLoadEnd={() => setWebViewReady(true)}
          onError={() => setWebViewReady(true)}
          showsVerticalScrollIndicator={true}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>{data.title}</Text>
      <Text style={styles.text}>{data.content_text ?? 'No content available.'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    padding: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: spacing.md,
    color: colors.fg,
    lineHeight: 32,
  },
  text: {
    fontSize: 16,
    color: 'rgba(232,238,247,0.9)',
    lineHeight: 24,
  },
  webView: {
    backgroundColor: colors.bg,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  loadingText: {
    color: 'rgba(232,238,247,0.7)',
    marginTop: spacing.md,
    fontSize: 15,
  },
});