import { useState } from "react";
import { getAIResponse } from "../services/aiService";

export const useAI = () => {

  const [response, setResponse] = useState(null);

  const askAI = (question) => {
    const result = getAIResponse(question);
    setResponse(result);
  };

  return { response, askAI };
};