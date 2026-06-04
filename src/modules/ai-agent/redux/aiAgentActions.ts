export const ASYNC_AI_CHAT = "ASYNC_AI_CHAT";
export const ASYNC_AI_CHAT_SUCCESS = "ASYNC_AI_CHAT_SUCCESS";
export const ASYNC_AI_CHAT_FAILED = "ASYNC_AI_CHAT_FAILED";
export const ASYNC_AI_CHAT_RESET = "ASYNC_AI_CHAT_RESET";

export const sendAiMessage = (payload: any) => ({
  type: ASYNC_AI_CHAT,
  payload,
});

export const resetAiChat = () => ({
  type: ASYNC_AI_CHAT_RESET,
});