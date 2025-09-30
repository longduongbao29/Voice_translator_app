/**
 * Voice Translator App - Mobile Version
 *
 * @format
 */

import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import Header from './src/components/Header';
// import TranslatorInterface from './src/components/TranslatorInterface';
import TextTranslator from './src/components/TextTranslator.tsx';
import VoiceTranslator from './src/components/VoiceTranslator.tsx';
// View and TouchableOpacity already imported above

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#121212' : '#F3F3F3',
    flex: 1,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <Header />

      {/* Simple Tab Bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, backgroundColor: backgroundStyle.backgroundColor }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }}
          onPress={() => setActiveTab('text')}
        >
          <Text style={{ fontWeight: activeTab === 'text' ? '700' : '500' }}>Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }}
          onPress={() => setActiveTab('voice')}
        >
          <Text style={{ fontWeight: activeTab === 'voice' ? '700' : '500' }}>Voice</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'text' ? <TextTranslator /> : <VoiceTranslator />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});

export default App;
