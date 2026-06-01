import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  createService,
  initiate,
  process,
  terminate,
  BbpsRawEvent,
} from 'bbps-sdk-react';

const INITIATE_PAYLOAD = {
  action: 'initiate',
  clientId: 'fibe',
  agentId: 'YB71YB72MOB511066132',
  environment: 'sandbox',
  mobile: '9876543210',
  deviceId: 'DEVICE_TEST_001',
  issuingCou: 'yes_biz',
  authToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IllCNzFZQjcyTU9CNTExMDY2MTMyIn0.eyJtb2JpbGUiOiI5MDEwMjAzMDQwIiwiZGV2aWNlX2lkIjoiZGV2aWNlMDAxIiwiaWF0IjoxNzc5Mjc0OTIwfQ.G9grwYRWPAQTuWVxykrwNl23iCebv55HMbEo7pg7jcVV69NhVZiMXWsPmIFG2wlYYWZJBbQ5yPH40lqSRaOfkENbugcku7eGel2WNulDvCKiZmnqmtKNloj11LE4Ka-IbFghAEid1ONLDgYixtzR7kN8nzQSrmltQOnK1z3nUN6-a7OacFJ0bH2Wnz0cmZ_iTQk4flnCHbQuOVF-5XG6OzvRdRgGE1_-C7lsCMGmyRgBaDUjM1c8qQptn3bLLgs9h-MlBFp4Std-6NW77nNz6aaYAE_s0ovJ0N2dunsLDcr11XHaxS2Lng5ysQSzeVYihby3r_vLkhFR0rgpEK3FDw',
};

const PROCESS_PAYLOAD = {
  action: 'BBPS_PAYMENT',
  agentId: 'YB71YB72MOB511066132',
  authToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IllCNzFZQjcyTU9CNTExMDY2MTMyIn0.eyJtb2JpbGUiOiI5MDEwMjAzMDQwIiwiZGV2aWNlX2lkIjoiZGV2aWNlMDAxIiwiaWF0IjoxNzc5Mjc0OTIwfQ.G9grwYRWPAQTuWVxykrwNl23iCebv55HMbEo7pg7jcVV69NhVZiMXWsPmIFG2wlYYWZJBbQ5yPH40lqSRaOfkENbugcku7eGel2WNulDvCKiZmnqmtKNloj11LE4Ka-IbFghAEid1ONLDgYixtzR7kN8nzQSrmltQOnK1z3nUN6-a7OacFJ0bH2Wnz0cmZ_iTQk4flnCHbQuOVF-5XG6OzvRdRgGE1_-C7lsCMGmyRgBaDUjM1c8qQptn3bLLgs9h-MlBFp4Std-6NW77nNz6aaYAE_s0ovJ0N2dunsLDcr11XHaxS2Lng5ysQSzeVYihby3r_vLkhFR0rgpEK3FDw',
};

function App() {
  const [status, setStatus] = useState('Idle');
  const [initiateRequest, setInitiateRequest] = useState('');
  const [initiateResponse, setInitiateResponse] = useState('');
  const [processRequest, setProcessRequest] = useState('');
  const [processResponse, setProcessResponse] = useState('');

  const handleEvent = (event: BbpsRawEvent) => {
    const json = JSON.stringify(event, null, 2);
    const eventName = event.event?.toLowerCase() ?? '';

    if (eventName.includes('initiate')) {
      setInitiateResponse(json);
    } else if (eventName.includes('process')) {
      setProcessResponse(json);
    }

    setStatus(`Event: ${event.event}`);
  };

  const onCreateService = async () => {
    try {
      setStatus('Creating service...');
      await createService('fibe', handleEvent);
      setStatus('Service created');
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const onInitiate = async () => {
    try {
      setStatus('Initiating...');
      setInitiateRequest(JSON.stringify(INITIATE_PAYLOAD, null, 2));
      setInitiateResponse('');
      await initiate(INITIATE_PAYLOAD);
      setStatus('Initiate called');
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      setInitiateResponse(`Error: ${e.message}`);
    }
  };

  const onProcess = async () => {
    try {
      setStatus('Processing...');
      setProcessRequest(JSON.stringify(PROCESS_PAYLOAD, null, 2));
      setProcessResponse('');
      await process(PROCESS_PAYLOAD);
      setStatus('Process called');
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      setProcessResponse(`Error: ${e.message}`);
    }
  };

  const onTerminate = () => {
    terminate();
    setStatus('Terminated');
    setInitiateRequest('');
    setInitiateResponse('');
    setProcessRequest('');
    setProcessResponse('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>BBPS SDK React - Test</Text>
        <Text style={styles.status}>Status: {status}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.createBtn]} onPress={onCreateService}>
            <Text style={styles.buttonText}>createService</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.initiateBtn]} onPress={onInitiate}>
            <Text style={styles.buttonText}>initiate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.processBtn]} onPress={onProcess}>
            <Text style={styles.buttonText}>process</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.terminateBtn]} onPress={onTerminate}>
            <Text style={styles.buttonText}>terminate</Text>
          </TouchableOpacity>
        </View>

        <Section
          title="Initiate"
          request={initiateRequest}
          response={initiateResponse}
        />

        <Section
          title="Process"
          request={processRequest}
          response={processResponse}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  request,
  response,
}: {
  title: string;
  request: string;
  response: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.label}>Request:</Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>{request || '—'}</Text>
      </View>
      <Text style={styles.label}>Response:</Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>{response || '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#1a1a1a' },
  status: { fontSize: 14, marginBottom: 16, color: '#555' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  button: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginRight: 4, marginBottom: 4 },
  createBtn: { backgroundColor: '#2196F3' },
  initiateBtn: { backgroundColor: '#4CAF50' },
  processBtn: { backgroundColor: '#FF9800' },
  terminateBtn: { backgroundColor: '#f44336' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  section: { marginBottom: 20, backgroundColor: '#fff', borderRadius: 10, padding: 14, elevation: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, color: '#333' },
  label: { fontSize: 12, fontWeight: '600', color: '#888', marginTop: 6, marginBottom: 4, textTransform: 'uppercase' },
  codeBox: { backgroundColor: '#263238', borderRadius: 6, padding: 10, minHeight: 50 },
  codeText: { fontFamily: 'Courier', fontSize: 12, color: '#80CBC4' },
});

export default App;
