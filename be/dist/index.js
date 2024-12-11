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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
exports.getGroqChatStream = getGroqChatStream;
require("dotenv").config();
const express = require("express");
const cors = require('cors');
const PORT = process.env.PORT;
const GROQ_API = process.env.GROQ_API;
const app = express();
app.use(express.json());
app.use(cors());
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const prompt_1 = require("./prompt");
const react_1 = require("./defaults/react");
const node_1 = require("./defaults/node");
const groq = new groq_sdk_1.default(); // creates a new instance for groq 
// template for react or node post req
app.post('/template', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    const answer = response.choices[0].message.content || "";
    if (answer == "React") {
        res.json({
            prompts: [prompt_1.BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [react_1.basePrompt] // THIS needs to send to the frontend , above for LLm 
        });
        return;
    }
    if (answer === "Node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${node_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [node_1.basePrompt]
        });
        return;
    }
    res.status(403).json({ message: "Invalid Prompt or API Key" });
}));
// chat endpoint
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const message = req.body.message;
    const response = yield groq.chat.completions.create({
        messages: message, // array of obj (role and content)
        model: "llama3-8b-8192",
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 1,
        stop: null
    });
}));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        var _d, _e;
        const stream = yield getGroqChatStream();
        try {
            for (var _f = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _f = true) {
                _c = stream_1_1.value;
                _f = false;
                const chunk = _c;
                // Print the completion returned by the LLM.
                console.log(((_e = (_d = chunk.choices[0]) === null || _d === void 0 ? void 0 : _d.delta) === null || _e === void 0 ? void 0 : _e.content) || "");
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_f && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
function getGroqChatStream() {
    return __awaiter(this, void 0, void 0, function* () {
        return groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "you are a helpful assistant.",
                },
                {
                    role: "user",
                    content: (0, prompt_1.getSystemPrompt)("write a code for todo app in reactjs"),
                },
            ],
            model: "llama3-8b-8192",
            temperature: 0.5,
            max_tokens: 1024,
            // Controls diversity via nucleus sampling: 0.5 means half of all
            // likelihood-weighted options are considered.
            top_p: 1,
            // A stop sequence is a predefined or user-specified text string that
            // signals an AI to stop generating content, ensuring its responses
            // remain focused and concise. Examples include punctuation marks and
            // markers like "[end]".
            stop: null,
            // If set, partial message deltas will be sent.
            stream: true,
        });
    });
}
app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
});
