// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import {fileURLToPath} from "url";
import {ChatOpenAI} from "@langchain/openai";
import getGasPriceTool from "./tools/getGasPrice.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const model = new ChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
    azureOpenAIApiInstanceName: process.env.INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.ENGINE_NAME,
    temperature: 0.7,
}).bindTools([getGasPriceTool]);


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/ask", async (req, res) => {
    try {
        const {message} = req.body;
        console.log("Bericht ontvangen:", message);

        const response = await model.invoke([{
            role: "system", content: `
You are a helpful assistant that provides gas prices across Europe.
- Always use the "getGasPrice" tool if the user asks about gas prices in any city.
- Only respond directly if the query is not about gas prices.
- If using the tool, prefix the reply with "OBAMA GAS PRICE:".
`,
        }, {
            role: "user", content: message,
        },]);

        if (response.toolCalls && response.toolCalls.length > 0) {
            const results = [];

            for (const call of response.toolCalls) {
                const toolName = call.name;
                const toolArgs = call.args;

                console.log(`Tool call detected: ${toolName}`, toolArgs);

                if (toolName === "getGasPrice") {
                    const toolResult = await getGasPriceTool.invoke(toolArgs);
                    results.push("GAS PRICE:\n" + toolResult.url);
                }
            }
            return res.json({reply: results.join("\n\n")});
        }
        res.json({reply: response.content});
    } catch (err) {
        console.error("LangChain/Model Error:", err);
        res.status(500).json({error: err.message || "Er ging iets fout."});
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server draait op http://localhost:${PORT}`);
});
