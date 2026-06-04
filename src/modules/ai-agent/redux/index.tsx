import instance from "../../customers/redux/instance";  // your existing axios instance

class AiAgentService {
  chat(payload: any) {
    return instance.post("/ai-agent/chat", payload);
  }
}

export default AiAgentService;