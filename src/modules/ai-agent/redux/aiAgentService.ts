import instance from "../../customers/redux/instance";

class AiAgentService {
  chat(payload: any) {
    return instance.post("/ai-agent/chat", payload);
  }

  getHistory() {
    return instance.get("/ai-agent/history");
  }

  clearHistory() {
    return instance.delete("/ai-agent/history");
  }
}

export default AiAgentService;
