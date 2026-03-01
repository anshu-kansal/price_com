import React from "react";
import { useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";

const AIShopperCard = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-black rounded-xl shadow p-6 flex flex-col w-full h-full justify-between">

      <div>
        <div className="flex gap-2 items-center mb-3">
          <Bot className="text-indigo-600" />
          <h3 className="font-semibold">
            AI Price Comparison Assistant
          </h3>
        </div>

        <p className="text-sm text-gray-500">
          Compare prices instantly across Amazon,
          Flipkart and eBay using AI.
        </p>
      </div>

      <button
        onClick={() => navigate("/ai-shopper")}
        className="mt-6 bg-indigo-600 text-white py-2 rounded-lg"
      >
        Chat with AI
      </button>

    </div>
  );
};

export default AIShopperCard;