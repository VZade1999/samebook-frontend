import { call, put, takeLatest } from "redux-saga/effects";
import {
  ASYNC_AI_CHAT,
  ASYNC_AI_CHAT_SUCCESS,
  ASYNC_AI_CHAT_FAILED,
} from "./aiAgentActions";
import AiAgentService from "./index";

const aiAgentService = new AiAgentService();

function* aiChatSaga(action: any): any {
  try {
    const response = yield call(aiAgentService.chat, action?.payload);
    if (response.data?.success) {
      yield put({
        type: ASYNC_AI_CHAT_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({
        type: ASYNC_AI_CHAT_FAILED,
        error: response.data?.message,
      });
    }
  } catch (error: any) {
    yield put({
      type: ASYNC_AI_CHAT_FAILED,
      error: "Something went wrong",
    });
  }
}

export function* listenAiChat() {
  yield takeLatest(ASYNC_AI_CHAT, aiChatSaga);
}