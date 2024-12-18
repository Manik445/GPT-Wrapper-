"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const express = require("express");
const cors_1 = __importDefault(require("cors"));
const PORT = process.env.PORT;
const GROQ_API = process.env.GROQ_API;
const app = express();
app.use(express.json());
app.use((0, cors_1.default)());
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const prompt_1 = require("./prompt");
const react_1 = require("./defaults/react");
const node_1 = require("./defaults/node");
const groq = new groq_sdk_1.default({ apiKey: GROQ_API }); // creates a new instance for groq 
// template for react or node post req
app.post('/template', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const prompt = req.body.prompt;
    const response = yield groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: "for this prompt " + prompt + "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
            },
        ],
        model: "llama3-8b-8192",
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 1,
        stop: null
    });
    const answer = ((_a = (response.choices[0].message.content)) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
    console.log('this is tempalte clg', answer);
    if (answer === "react") {
        res.json({
            prompts: [prompt_1.BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [react_1.basePrompt] // THIS needs to send to the frontend , above for LLm 
        });
        return;
    }
    if (answer === "node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${node_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [node_1.basePrompt]
        });
        return;
    }
    res.status(403).json({ message: "Invalid Prompt or API Key" });
    return;
}));
// chat endpoint
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const messages = req.body.messages;
        // Ensure the messages array is valid
        if (!Array.isArray(messages) || !messages.every((msg) => msg.role && msg.content)) {
            return res.status(400).json({ error: "Invalid message format. Each message should have 'role' and 'content'." });
        }
        // Call the groq chat API
        const response = yield groq.chat.completions.create({
            messages: messages, // Array of { role, content }
            model: "llama3-8b-8192",
            temperature: 0.5,
            max_tokens: 1024,
            top_p: 1,
            stop: null,
        });
        // Parse and log the response
        const rawContent = (_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : "";
        const parsedResponse = (0, prompt_1.getSystemPrompt)(rawContent);
        console.log('Chat Response:', parsedResponse);
        // Send the response back to the client
        res.json({ response: parsedResponse });
    }
    catch (error) {
        res.status(500).json({ error: "An error occurred while processing your request. Please try again later." });
    }
}));
app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
});
