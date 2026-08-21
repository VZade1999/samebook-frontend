export const ASYNC_AI_CHAT = "ASYNC_AI_CHAT";
export const ASYNC_AI_CHAT_SUCCESS = "ASYNC_AI_CHAT_SUCCESS";
export const ASYNC_AI_CHAT_FAILED = "ASYNC_AI_CHAT_FAILED";
export const ASYNC_AI_CHAT_RESET = "ASYNC_AI_CHAT_RESET";

export const ASYNC_AI_HISTORY_FETCH = "ASYNC_AI_HISTORY_FETCH";
export const ASYNC_AI_HISTORY_FETCH_SUCCESS = "ASYNC_AI_HISTORY_FETCH_SUCCESS";
export const ASYNC_AI_HISTORY_FETCH_FAILED = "ASYNC_AI_HISTORY_FETCH_FAILED";

export const ASYNC_AI_HISTORY_CLEAR = "ASYNC_AI_HISTORY_CLEAR";
export const ASYNC_AI_HISTORY_CLEAR_SUCCESS = "ASYNC_AI_HISTORY_CLEAR_SUCCESS";
export const ASYNC_AI_HISTORY_CLEAR_FAILED = "ASYNC_AI_HISTORY_CLEAR_FAILED";

export const sendAiMessage = (payload: any) => ({
  type: ASYNC_AI_CHAT,
  payload,
});

export const resetAiChat = () => ({
  type: ASYNC_AI_CHAT_RESET,
});

export const fetchAiHistory = () => ({
  type: ASYNC_AI_HISTORY_FETCH,
});

export const clearAiHistory = () => ({
  type: ASYNC_AI_HISTORY_CLEAR,
});
