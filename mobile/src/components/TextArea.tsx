import React from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface TextAreaProps {
    value: string;
    onChange: (text: string) => void;
    placeholder?: string;
    editable?: boolean;
    label: string;
    onSpeakClick?: () => void;
    isSpeaking?: boolean;
    onCopyClick?: () => void;
}

const TextArea: React.FC<TextAreaProps> = ({
    value,
    onChange,
    placeholder,
    editable = true,
    label,
    onSpeakClick,
    isSpeaking = false,
    onCopyClick,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.actionsRow}>
                    {onCopyClick && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onCopyClick}
                            disabled={!value.trim()}
                        >
                            <Text style={styles.actionIcon}>📋</Text>
                        </TouchableOpacity>
                    )}
                    {onSpeakClick && (
                        <TouchableOpacity
                            style={[styles.actionButton, isSpeaking && styles.speakingButton]}
                            onPress={onSpeakClick}
                            disabled={isSpeaking || !value.trim()}
                        >
                            <Text style={styles.actionIcon}>{isSpeaking ? '🔇' : '🔊'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View style={styles.textAreaWrapper}>
                <TextInput
                    style={[
                        styles.textArea,
                        !editable && styles.readOnlyTextArea
                    ]}
                    multiline={true}
                    numberOfLines={5}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    editable={editable}
                    textAlignVertical="top"
                    placeholderTextColor="#9ca3af" // gray-400
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563', // gray-600
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        marginLeft: 8,
        padding: 6,
        borderRadius: 4,
        backgroundColor: '#f3f4f6', // gray-100
    },
    actionIcon: {
        fontSize: 16,
    },
    speakingButton: {
        backgroundColor: '#d1fae5', // green-100
    },
    textAreaWrapper: {
        position: 'relative',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#d1d5db', // gray-300
        borderRadius: 8,
        padding: 12,
        minHeight: 120,
        fontSize: 16,
        backgroundColor: 'white',
        color: '#111827', // gray-900
    },
    readOnlyTextArea: {
        backgroundColor: '#f9fafb', // gray-50
        color: '#4b5563', // gray-600
    },
    speakButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
}); export default TextArea;
