import { products } from "../data/productsData";

export const getAIResponse = (question) => {

  const q = question.toLowerCase();

  let filtered = [];
  let message = "";

  // ✅ Today Deals
  if (q.includes("today") || q.includes("deal")) {
    filtered = products.filter(p => p.todayDeal);
    message = "🔥 Here are today's best deals";
  }

  // ✅ Cheapest
  else if (q.includes("cheap") || q.includes("lowest")) {
    filtered = [...products]
      .sort((a,b)=>a.price-b.price)
      .slice(0,5);

    message = "💰 Cheapest products available";
  }

  // ✅ Best Rated
  else if (q.includes("best")) {
    filtered = [...products]
      .sort((a,b)=>b.rating-a.rating)
      .slice(0,5);

    message = "⭐ Best rated products";
  }

  // ✅ Price Filter
  else if (q.includes("under")) {

    const match = q.match(/under (\d+)/);

    if(match){
      const price = Number(match[1]);

      filtered = products.filter(
        p => p.price <= price
      );

      message = `Products under $${price}`;
    }
  }

  else {
    message =
      "Try asking: today deals, cheapest headphones, best products";
  }

  return {
    message,
    products: filtered
  };
};