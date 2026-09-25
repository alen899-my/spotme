import axios from 'axios';
import { API_URL } from './api';
import { getToken } from './tokenStorage';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  actions?: AIChatAction[];
}

export interface AIChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  message_count?: number;
}

export interface AIChatAction {
  kind: 'created' | 'updated' | 'deleted' | 'moved' | 'pending';
  label: string;
  confirmToken?: string;
  tool?: string;
}

export interface SendMessageResponse {
  session_id: string;
  session_title: string;
  reply: string;
  actions?: AIChatAction[];
}

export interface ConfirmActionResponse {
  session_id: string;
  session_title: string;
  reply: string;
  actions?: AIChatAction[];
}

export interface SessionDetailsResponse {
  session: AIChatSession;
  messages: AIChatMessage[];
}

async function getAuthHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const aiApi = {
  sendMessage: async (message: string, sessionId?: string, splitId?: number): Promise<SendMessageResponse> => {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${API_URL}/ai/chat`,
      { message, session_id: sessionId, split_id: splitId },
      { headers, timeout: 120000 }
    );
    return res.data;
  },

  confirmAction: async (token: string, sessionId: string, confirmed = true): Promise<ConfirmActionResponse> => {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${API_URL}/ai/actions/confirm`,
      { token, session_id: sessionId, confirmed },
      { headers, timeout: 90000 }
    );
    return res.data;
  },

  getSessions: async (): Promise<AIChatSession[]> => {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${API_URL}/ai/sessions`, { headers });
    return res.data;
  },

  getSessionMessages: async (sessionId: string): Promise<SessionDetailsResponse> => {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${API_URL}/ai/sessions/${sessionId}`, { headers });
    return res.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    await axios.delete(`${API_URL}/ai/sessions/${sessionId}`, { headers });
  },
};
