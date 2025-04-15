import axios from "axios";
import { tool } from "@langchain/core/tools";

function extractCity(query) {
    const match = query.match(/\b(?:in|at|for|from|near)\s+([A-Za-z\s]+)/i);
    return match?.[1]?.trim();
}


async function getGasPrice({ query }) {
    const apiKey = process.env.COLLECT_API_KEY;

    const city = extractCity(query);
    if (!city) {
        throw new Error("City not found in the prompt. Please mention a city.");
    }

    try {
        const response = await axios.get(
            `https://api.collectapi.com/gasPrice/fromCity?city=${encodeURIComponent(city)}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `apikey ${apiKey}`,
                },
            }
        );

        const data = response.data.result;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return {
                title: `No gas price data found for ${city}`,
                url: `Sorry, no results found for ${city}.`,
            };
        }

        const formatted = data.map(item => `${item.name}: ${item.price} ${item.currency}`).join("\n");

        return {
            title: `Gas Prices in ${city}`,
            url: formatted,
        };

    } catch (error) {
        console.error("Gas Price API Error:", error.response?.data || error.message);
        throw new Error("Failed to fetch gas price data.");
    }
}

const getGasPriceTool = tool(getGasPrice, {
    name: "getGasPrice",
    description: "Fetch the current gas prices in a given city in Europe.",
    schema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The user query containing a European city name.",
            },
        },
        required: ["query"],
    },
});

export default getGasPriceTool;
