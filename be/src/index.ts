require("dotenv").config(); 
const express = require("express")
const PORT = process.env.PORT
const GROQ_API = process.env.GROQ_API
const app = express()

app.use(express.json())

import Groq from "groq-sdk"
import { BASE_PROMPT, getSystemPrompt } from "./prompt"
import { response } from "express";
import { basePrompt as REACT_BASE_PROMPT } from './defaults/react'
import { basePrompt as NODE_BASE_PROMPT } from "./defaults/node"

const groq = new Groq() // creates a new instance for groq 

// template for react or node post req
app.post('/template' , async (req: any , res: any)=>{
    const prompt = req.body.prompt
    const response = await groq.chat.completions.create({

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
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${REACT_BASE_PROMPT}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [REACT_BASE_PROMPT] // THIS needs to send to the frontend , above for LLm 
        })
        return;
    }

    if (answer === "Node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${NODE_BASE_PROMPT}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [NODE_BASE_PROMPT]
        })
        return;
    }

    res.status(403).json({message : "Invalid Prompt or API Key"})

})


// chat endpoint
app.post('/chat' , async (req: any , res: any)=>{
    const message = req.body.message
    const response = await groq.chat.completions.create({
        messages: message, // array of obj (role and content)
        model: "llama3-8b-8192",
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 1,
        stop: null
      });

    //   console.log('message' , message)
    console.log('response from LLM' , response.choices[0].message)


})




export async function main() {
  const stream = await getGroqChatStream();
  for await (const chunk of stream) {
    // Print the completion returned by the LLM.
    console.log(chunk.choices[0]?.delta?.content || "");
  }
}

export async function getGroqChatStream() {
  return groq.chat.completions.create({

    messages: [
      {
        role: "system",
        content: "you are a helpful assistant.",
      },
      {
        role: "user",
        content: getSystemPrompt("write a code for todo app in reactjs"),
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
}



app.listen(PORT , () => {
    console.log(`Example app listening on port ${PORT}`)
})
