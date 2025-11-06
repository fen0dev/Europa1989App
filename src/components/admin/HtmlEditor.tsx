import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';

type HtmlEditorProps = {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
};

export default function HtmlEditor({ value, onChange, placeholder }: HtmlEditorProps) {
    const [showToolbar, setShowToolbar] = useState(true);
    const inputRef = useRef<TextInput>(null);

    const insertTag = (openTag: string, closeTag: string) => {
        const newValue = value + `<${openTag}></${closeTag}>`;
        onChange(newValue);
    };

    const formatBold = () => insertTag('strong', 'strong');
    const formatItalic = () => insertTag('em', 'em');
    const formatUnderline = () => insertTag('u', 'u');
    const formatHeading = (level: number) => insertTag(`h${level}`, `h${level}`);
    const formatList = (ordered: boolean) => {
        const tag = ordered ? 'ol' : 'ul';
        insertTag(`${tag}><li`, 'li></ol');
    };
    const formatLink = () => {
        onChange(value + '<a href="">Link</a>');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {showToolbar && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.toolbar}
                    contentContainerStyle={styles.toolbarContent}
                >
                    <TouchableOpacity style={styles.toolbarButton} onPress={formatBold}>
                        <Text style={[styles.toolbarText, styles.boldText]}>B</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={formatItalic}>
                        <Text style={[styles.toolbarText, styles.italicText]}>I</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={formatUnderline}>
                        <Text style={styles.toolbarText}>U</Text>
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => formatHeading(1)}>
                        <Text style={styles.toolbarText}>H1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => formatHeading(2)}>
                        <Text style={styles.toolbarText}>H2</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => formatHeading(3)}>
                        <Text style={styles.toolbarText}>H3</Text>
                    </TouchableOpacity>
                    <View style={styles.separator} />
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => formatList(false)}>
                        <Ionicons name="list-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={() => formatList(true)}>
                        <Ionicons name="list" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarButton} onPress={formatLink}>
                        <Ionicons name="link-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </ScrollView>
            )}

            <TextInput
                ref={inputRef}
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder || 'Write HTML content...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                textAlignVertical="top"
            />

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {value.length} characters • HTML supported
                </Text>
                <TouchableOpacity onPress={() => setShowToolbar(!showToolbar)}>
                    <Ionicons
                        name={showToolbar ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="rgba(255,255,255,0.6)"
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    toolbar: {
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    toolbarContent: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    toolbarButton: {
      padding: 8,
      marginHorizontal: 4,
      borderRadius: 4,
    },
    toolbarText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    boldText: {
      fontWeight: '900',
    },
    italicText: {
      fontStyle: 'italic',
    },
    separator: {
      width: 1,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginHorizontal: 8,
    },
    input: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.05)',
      color: '#fff',
      fontSize: 16,
      padding: 16,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
    },
    footerText: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 12,
    },
});