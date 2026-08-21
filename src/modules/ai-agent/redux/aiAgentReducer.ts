import {
  ASYNC_AI_CHAT,
  ASYNC_AI_CHAT_SUCCESS,
  ASYNC_AI_CHAT_FAILED,
  ASYNC_AI_CHAT_RESET,
  ASYNC_AI_HISTORY_FETCH,
  ASYNC_AI_HISTORY_FETCH_SUCCESS,
  ASYNC_AI_HISTORY_FETCH_FAILED,
  ASYNC_AI_HISTORY_CLEAR,
  ASYNC_AI_HISTORY_CLEAR_SUCCESS,
  ASYNC_AI_HISTORY_CLEAR_FAILED,
} from "./aiAgentActions";

const initialState = {
  loading: false,
  error: null,
  lastReply: null,
  history: [] as { role: "user" | "assistant"; content: string }[],
  historyLoading: false,
  historyLoaded: false,
};

const aiAgentReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case ASYNC_AI_CHAT:
      return { ...state, loading: true, error: null };

    case ASYNC_AI_CHAT_SUCCESS:
      return { ...state, loading: false, lastReply: action.data };

    case ASYNC_AI_CHAT_FAILED:
      // { message, id } instead of a bare string — two consecutive failures
      // with the identical message (e.g. rate limit hit twice in a row)
      // would otherwise dedupe away in the UI's effect, which keys off
      // this value changing.
      return {
        ...state,
        loading: false,
        error: { message: action.error, id: Date.now() },
      };

    case ASYNC_AI_CHAT_RESET:
      return { ...initialState, history: state.history, historyLoaded: state.historyLoaded };

    case ASYNC_AI_HISTORY_FETCH:
      return { ...state, historyLoading: true };

    case ASYNC_AI_HISTORY_FETCH_SUCCESS:
      return {
        ...state,
        historyLoading: false,
        historyLoaded: true,
        history: action.data || [],
      };

    case ASYNC_AI_HISTORY_FETCH_FAILED:
      return { ...state, historyLoading: false, historyLoaded: true };

    case ASYNC_AI_HISTORY_CLEAR:
      return state;

    case ASYNC_AI_HISTORY_CLEAR_SUCCESS:
      return { ...state, history: [] };

    case ASYNC_AI_HISTORY_CLEAR_FAILED:
      return state;

    default:
      return state;
  }
};

export default aiAgentReducer;
