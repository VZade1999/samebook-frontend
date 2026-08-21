import { call, put, takeLatest } from "redux-saga/effects";
import {
  ASYNC_AI_CHAT,
  ASYNC_AI_CHAT_SUCCESS,
  ASYNC_AI_CHAT_FAILED,
  ASYNC_AI_HISTORY_FETCH,
  ASYNC_AI_HISTORY_FETCH_SUCCESS,
  ASYNC_AI_HISTORY_FETCH_FAILED,
  ASYNC_AI_HISTORY_CLEAR,
  ASYNC_AI_HISTORY_CLEAR_SUCCESS,
  ASYNC_AI_HISTORY_CLEAR_FAILED,
} from "./aiAgentActions";
import AiAgentService from "./aiAgentService";

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
        error: response.data?.message || "Something went wrong. Please try again.",
      });
    }
  } catch (error: any) {
    // The backend sends a specific message on failure (e.g. rate limit hit,
    // timeout) via a non-2xx response — axios rejects on those, landing
    // here rather than in the `else` branch above. Surface that real
    // message instead of a generic one whenever it's present.
    yield put({
      type: ASYNC_AI_CHAT_FAILED,
      error: error?.response?.data?.message || "Something went wrong. Please try again.",
    });
  }
}

function* aiHistoryFetchSaga(): any {
  try {
    const response = yield call(aiAgentService.getHistory);
    if (response.data?.success) {
      yield put({
        type: ASYNC_AI_HISTORY_FETCH_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({ type: ASYNC_AI_HISTORY_FETCH_FAILED });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_AI_HISTORY_FETCH_FAILED });
  }
}

function* aiHistoryClearSaga(): any {
  try {
    const response = yield call(aiAgentService.clearHistory);
    if (response.data?.success) {
      yield put({ type: ASYNC_AI_HISTORY_CLEAR_SUCCESS });
    } else {
      yield put({ type: ASYNC_AI_HISTORY_CLEAR_FAILED });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_AI_HISTORY_CLEAR_FAILED });
  }
}

export function* listenAiChat() {
  yield takeLatest(ASYNC_AI_CHAT, aiChatSaga);
  yield takeLatest(ASYNC_AI_HISTORY_FETCH, aiHistoryFetchSaga);
  yield takeLatest(ASYNC_AI_HISTORY_CLEAR, aiHistoryClearSaga);
}
