import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { chatApi } from '../services/api';

const ChatContext = createContext(null);

const initialState = {
  sessionId: null,
  messages: [],
  isLoading: false,
  error: null,
  currentResult: null,
  context: {},
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, sessionId: action.sessionId };
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { id: uuidv4(), role: 'user', content: action.content, ts: Date.now() }],
        isLoading: true,
        error: null,
      };
    case 'ADD_ASSISTANT_RESULT':
      return {
        ...state,
        messages: [...state.messages, { id: uuidv4(), role: 'assistant', result: action.result, ts: Date.now() }],
        currentResult: action.result,
        context: action.result?.query || state.context,
        isLoading: false,
      };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'CLEAR':
      return { ...initialState, sessionId: uuidv4() };
    case 'SET_LOADING':
      return { ...state, isLoading: action.value };
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    sessionId: uuidv4(),
  });

  const sendMessage = useCallback(async (message) => {
    dispatch({ type: 'ADD_USER_MESSAGE', content: message });

    try {
      const response = await chatApi.sendMessage(message, state.sessionId);
      dispatch({ type: 'ADD_ASSISTANT_RESULT', result: response.data.result });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message });
    }
  }, [state.sessionId]);

  const clearChat = useCallback(() => {
    if (state.sessionId) chatApi.clearSession(state.sessionId).catch(() => {});
    dispatch({ type: 'CLEAR' });
  }, [state.sessionId]);

  return (
    <ChatContext.Provider value={{ state, sendMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
