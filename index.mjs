import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import {fileURLToPath} from "url";
import {ChatOpenAI} from "@langchain/openai";
import getGasPriceTool from "./tools/getGasPrice.js";
import {HumanMessage, SystemMessage} from "@langchain/core/messages";

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
        const message = req.body.message;
        console.log("Bericht ontvangen:", message);

        const messages = [
            new SystemMessage('Je bent een chatbot die vragen beantwoordt over gasprijzen.'),
            new HumanMessage(message)
        ];

        const llmResponse = await model.invoke(messages);

        messages.push(llmResponse)

        console.log(message)

        const toolByName = {
            getGasPrice: getGasPriceTool,
        };

        for (const toolCall of llmResponse.tool_calls) {
            const selectedTool = toolByName[toolCall.name];
            const toolMessage = await selectedTool.invoke(toolCall);
            console.log(`Calling the ${toolCall.name} tool.`);
            messages.push(toolMessage);
        }

        const response = await model.invoke(messages);

        res.json({ reply: response.content || "⚠️ Geen antwoord ontvangen." });
    } catch (err) {
        console.error("LangChain/Model Error:", err);
        res.status(500).json({error: err.message || "Er ging iets fout."});
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server draait op http://localhost:${PORT}`);
});
