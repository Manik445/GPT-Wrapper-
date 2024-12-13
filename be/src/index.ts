require("dotenv").config(); 
const express = require("express")
import cors from "cors"
const PORT = process.env.PORT
const GROQ_API = process.env.GROQ_API
const app = express()

app.use(express.json())
app.use(cors())

import Groq from "groq-sdk"
import { BASE_PROMPT , getSystemPrompt } from "./prompt"
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

    const answer =  (response.choices[0].message.content)?.toLowerCase() || "";


    console.log('this is tempalte clg' , answer)
    
    if (answer === "react") {
        res.json({
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${REACT_BASE_PROMPT}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [REACT_BASE_PROMPT] // THIS needs to send to the frontend , above for LLm 
        })
        return;
    }

    if (answer === "node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${NODE_BASE_PROMPT}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [NODE_BASE_PROMPT]
        })
        return;
    }

    res.status(403).json({message : "Invalid Prompt or API Key"})
    return; 
})


// chat endpoint
app.post('/chat', async (req: any, res: any) => {
    try {
      const messages = req.body.messages;
  
      // Ensure the messages array is valid
      if (!Array.isArray(messages) || !messages.every((msg: any) => msg.role && msg.content)) {
        return res.status(400).json({ error: "Invalid message format. Each message should have 'role' and 'content'." });
      }
  
      // Call the groq chat API
      const response = await groq.chat.completions.create({
        messages: messages, // Array of { role, content }
        model: "llama3-8b-8192",
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 1,
        stop: null,
      });
  
      // Parse and log the response
      const rawContent = response.choices[0]?.message?.content ?? "";
      const parsedResponse = getSystemPrompt(rawContent);
      console.log('Chat Response:', parsedResponse);
  
      // Send the response back to the client
      res.json({ response: parsedResponse });
    } catch (error) {
      res.status(500).json({ error: "An error occurred while processing your request. Please try again later." });
    }
  });
  



app.listen(PORT , () => {
    console.log(`Example app listening on port ${PORT}`)
})
