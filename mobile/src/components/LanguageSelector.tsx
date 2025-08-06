import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Image } from 'react-native';
import { Language } from '../types';

interface LanguageSelectorProps {
    selected: string;
    onChange: (code: string) => void;
    label: string;
    languages: Language[];
    includeAuto?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    selected,
    onChange,
    label,
    languages,
    includeAuto = false,
}) => {
    const [modalVisible, setModalVisible] = React.useState(false);

    const selectedLanguage =
        selected === 'auto' ? { code: 'auto', name: 'Auto-detect' } :
            languages.find(lang => lang.code === selected) || languages[0];

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={styles.selector}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.selectedText}>{selectedLanguage.name}</Text>
                <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Language</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text style={styles.closeIcon}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={includeAuto ? [{ code: 'auto', name: 'Auto-detect' }, ...languages] : languages}
                                keyExtractor={(item) => item.code}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.languageItem,
                                            selected === item.code && styles.selectedLanguageItem
                                        ]}
                                        onPress={() => {
                                            onChange(item.code);
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.languageText,
                                                selected === item.code && styles.selectedLanguageText
                                            ]}
                                        >
                                            {item.name}
                                        </Text>
                                        {selected === item.code && (
                                            <Text style={styles.checkmark}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                showsVerticalScrollIndicator={true}
                                style={styles.languageList}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}; const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
        color: '#6b7280', // gray-600
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db', // gray-300
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'white',
    },
    selectedText: {
        fontSize: 14,
        color: '#111827', // gray-900
    },
    dropdownIcon: {
        fontSize: 10,
        color: '#6b7280', // gray-600
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    modalContent: {
        width: '85%',
        maxHeight: '70%',
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb', // gray-200
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827', // gray-900
    },
    closeIcon: {
        fontSize: 16,
        color: '#6b7280', // gray-600
        padding: 4,
    },
    languageList: {
        maxHeight: 400,
    },
    languageItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6', // gray-100
    },
    selectedLanguageItem: {
        backgroundColor: '#eff6ff', // blue-50
    },
    languageText: {
        fontSize: 14,
        color: '#374151', // gray-700
    },
    selectedLanguageText: {
        fontWeight: 'bold',
        color: '#3b82f6', // blue-500
    },
    checkmark: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3b82f6', // blue-500
    },
    closeButton: {
        marginTop: 15,
        backgroundColor: '#3b82f6', // blue-500
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default LanguageSelector;
