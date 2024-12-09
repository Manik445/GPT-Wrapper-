require("dotenv").config(); 
const express = require("express")
const app = express()
const PORT = process.env.PORT
const GROQ_API = process.env.GROQ_API

console.log('api' , GROQ_API)

import Groq from "groq-sdk";

const groq = new Groq() // creates a new instance for groq 

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
      // Set an optional system message. This sets the behavior of the
      // assistant and can be used to provide specific instructions for
      // how it should behave throughout the conversation.
      {
        role: "system",
        content: "you are a helpful assistant.",
      },
      // Set a user message for the assistant to respond to.
      {
        role: "user",
        content: "what is  2+2",
      },
    ],

    // The language model which will generate the completion.
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

main()



app.listen(PORT , () => {
    console.log(`Example app listening on port ${PORT}`)
})
