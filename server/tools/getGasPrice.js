import axios from "axios";
import { tool } from "@langchain/core/tools";

function extractCity(query) {
    const match = query.match(/\b(?:in|at|for|from|near)\s+([A-Za-z\s]+)/i);
    if (match?.[1]) return match[1].trim();

    const fallback = query.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/);
    return fallback?.[1]?.trim();
}

async function fetchGasPrice({ query }) {
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

        const result = response.data.result;

        if (!result) {
            console.log(`No gas price data found for ${city}`);
            return {
                title: `No gas price data found for ${city}`,
                url: `Sorry, no results found for ${city}.`,
            };
        }

        const { gasoline, diesel, lpg, currency, country } = result;

        const output = `
        Gas Prices for ${city} (${country}):
        - Gasoline: ${gasoline} ${currency}
`.trim();

        return {
            title: `Gas Prices in ${city}`,
            url: output,
        };


    } catch (error) {
        console.error("Gas Price API Error:", error.response?.data || error.message);
        throw new Error("Failed to fetch gas price data.");
    }
}

const getGasPriceTool = tool(fetchGasPrice, {
    name: "getGasPrice",
    description: "Fetch the current gasoline in a European city.",
    schema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The user's query which should include the name of a city.",
            },
        },
        required: ["query"],
    },
});

export default getGasPriceTool;
