import {
  ASYNC_AI_CHAT,
  ASYNC_AI_CHAT_SUCCESS,
  ASYNC_AI_CHAT_FAILED,
  ASYNC_AI_CHAT_RESET,
} from "./aiAgentActions";

const initialState = {
  loading: false,
  error: null,
  lastReply: null,
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
      return initialState;

    default:
      return state;
  }
};

export default aiAgentReducer;