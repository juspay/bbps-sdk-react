import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  createService,
  initiate,
  process,
  terminate,
  testEmit,
  BbpsRawEvent,
} from 'bbps-react-native-sdk';

export default function App() {
  const [clientId, setClientId] = useState('fibe');
  const [initiatePayload, setInitiatePayload] = useState(
    JSON.stringify({
      action: 'initiate',
      clientId: 'your_client_id',
      agentId: 'YOUR_AGENT_ID',
      environment: 'sandbox',
      mobile: '9876543210',
      deviceId: 'DEVICE_ID_HERE',
      issuingCou: 'your_cou',
      authToken: 'YOUR_AUTH_TOKEN_HERE',
    }, null, 2)
  );
  const [processPayload, setProcessPayload] = useState(
    JSON.stringify({
      action: 'BBPS_PAYMENT',
      agentId: 'YOUR_AGENT_ID',
      authToken: 'YOUR_AUTH_TOKEN_HERE',
    }, null, 2)
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initiateResponse, setInitiateResponse] = useState('');
  const [processResponse, setProcessResponse] = useState('');

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  /**
   * Merchant-level callback handler.
   * Mirrors the native iOS handleInitiate() pattern.
   */
  const handleBbpsEvent = useCallback((event: BbpsRawEvent) => {
    console.log('[App.tsx] Received event:', event);
    addLog(`EVENT [${event.event}]: ${JSON.stringify(event.payload).substring(0, 200)}...`);

    switch (event.event.toLowerCase()) {
      case 'do_payment': {
        Alert.alert('Payment Required', 'SDK requested DO_PAYMENT');
        break;
      }
      case 'initiate_result':
        addLog("INITIATE_RESULT: " + JSON.stringify(event.payload));
        setInitiateResponse(JSON.stringify(event.payload, null, 2));
        Alert.alert('Initiate Result', JSON.stringify(event.payload));
        break;
      case 'process_result':
        addLog("PROCESS_RESULT: " + JSON.stringify(event.payload));
        setProcessResponse(JSON.stringify(event.payload, null, 2));
        Alert.alert('Process Result', JSON.stringify(event.payload));
        break;
      case 'refresh_auth':
        addLog("REFRESH_AUTH: " + JSON.stringify(event.payload));
        Alert.alert('Refresh Auth', 'Token needs refresh');
        break;
      default:
        addLog(`Unhandled event: ${event.event}`);
    }
  }, [addLog]);

  const handleCreateService = async () => {
    try {
      setLoading(true);
      await createService(clientId, handleBbpsEvent);
      addLog('Service created with callback registered');
      Alert.alert('Success', 'BBPS Service created');
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      Alert.alert('Error', err.message || 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiate = async () => {
    try {
      setLoading(true);
      const payload = JSON.parse(initiatePayload);
      await initiate(payload);
      addLog('Initiate called');
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      Alert.alert('Error', err.message || 'Initiate failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    try {
      setLoading(true);
      const payload = JSON.parse(processPayload);
      await process(payload);
      addLog('Process called');
    } catch (err: any) {
      addLog(`ERROR: ${err.message}`);
      Alert.alert('Error', err.message || 'Process failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmit = async () => {
    try {
      const result = await testEmit();
      addLog(`testEmit result: ${result}`);
    } catch (err: any) {
      addLog(`testEmit ERROR: ${err.message}`);
    }
  };

  const handleCopyInitiate = useCallback(() => {
    if (initiateResponse) {
      Clipboard.setString(initiateResponse);
      Alert.alert('Copied', 'Initiate response copied to clipboard');
    }
  }, [initiateResponse]);

  const handleCopyProcess = useCallback(() => {
    if (processResponse) {
      Clipboard.setString(processResponse);
      Alert.alert('Copied', 'Process response copied to clipboard');
    }
  }, [processResponse]);

  const handleTerminate = () => {
    terminate();
    addLog('Service terminated');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>BBPS SDK Demo</Text>

        <TextInput
          style={styles.input}
          placeholder="Client ID"
          value={clientId}
          onChangeText={setClientId}
        />
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCreateService}
          disabled={loading}
        >
          <Text style={styles.btnText}>1. Create Service (+ callback)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF9500' }]}
          onPress={handleTestEmit}
        >
          <Text style={styles.btnText}>TEST EMIT (diagnostic)</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.label}>Initiate Payload:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={10}
          value={initiatePayload}
          onChangeText={setInitiatePayload}
        />
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleInitiate}
          disabled={loading}
        >
          <Text style={styles.btnText}>2. Initiate</Text>
        </TouchableOpacity>

        <View style={styles.responseHeader}>
          <Text style={styles.label}>Initiate Response:</Text>
          <TouchableOpacity onPress={handleCopyInitiate} disabled={!initiateResponse}>
            <Text style={[styles.copyText, !initiateResponse && styles.copyDisabled]}>[Copy]</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.input, styles.textArea, styles.readOnlyBox]}>
          <Text selectable style={styles.readOnlyText}>
            {initiateResponse || 'Initiate response will appear here...'}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>Process Payload:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={6}
          value={processPayload}
          onChangeText={setProcessPayload}
        />
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleProcess}
          disabled={loading}
        >
          <Text style={styles.btnText}>3. Process</Text>
        </TouchableOpacity>

        <View style={styles.responseHeader}>
          <Text style={styles.label}>Process Response:</Text>
          <TouchableOpacity onPress={handleCopyProcess} disabled={!processResponse}>
            <Text style={[styles.copyText, !processResponse && styles.copyDisabled]}>[Copy]</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.input, styles.textArea, styles.readOnlyBox]}>
          <Text selectable style={styles.readOnlyText}>
            {processResponse || 'Process response will appear here...'}
          </Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleTerminate}
        >
          <Text style={styles.btnText}>Terminate Service</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.label}>Event Logs:</Text>
        <View style={styles.logContainer}>
          {logs.map((log, i) => (
            <Text key={i} style={styles.logText}>{log}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: 'monospace' },
  textArea: { height: 180, textAlignVertical: 'top' },
  readOnlyBox: { backgroundColor: '#fafafa', justifyContent: 'flex-start' },
  readOnlyText: { fontFamily: 'monospace', fontSize: 13, color: '#333' },
  button: { padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  primaryButton: { backgroundColor: '#007AFF' },
  secondaryButton: { backgroundColor: '#34C759' },
  dangerButton: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 16 },
  label: { fontWeight: '600', marginBottom: 8, fontSize: 14 },
  responseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  copyText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  copyDisabled: { color: '#ccc' },
  logContainer: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, maxHeight: 200 },
  logText: { fontFamily: 'monospace', fontSize: 11, marginBottom: 4, color: '#333' },
});
