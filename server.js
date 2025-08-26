// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const fetch = require('node-fetch');
// const fs = require('fs'); // --- NEW: Import the Node.js File System module

// const app = express();
// const port = 5001;

// app.use(bodyParser.json());
// app.use(cors());

// // --- NEW: Load your custom dta.json data when the server starts ---
// let customData = null;
// try {
//   // Read the file's content as a string
//   const rawData = fs.readFileSync('./bni_members.json', 'utf8');
//   // Parse the string into a JavaScript object
//   customData = JSON.parse(rawData);
//   console.log('Successfully loaded custom data from dta.json');
// } catch (error) {
//   console.error('Could not load or parse dta.json. The bot will run without custom knowledge.', error);
// }
// // --- END OF NEW SECTION ---

// // NOTE: 'gemini-2.0-flash' is not a known public model name as of now. 
// // If you get an error, a valid fast model is 'gemini-1.5-flash-latest'.
// const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// // IMPORTANT: Replace with your securely stored API key
// const GOOGLE_API_KEY = 'AIzaSyBo_n4TmNYzZ8wEz_uScuqgr-oJhZRC5kI'; 

// app.post('/api/chat', async (req, res) => {
//     const { message } = req.body;
//     console.log('Received message from frontend:', message);

//     // --- NEW: Create an enhanced prompt that includes your data ---
//     let finalPrompt = message;

//     if (customData) {
//       // This is "prompt engineering". We give the AI instructions and data.
//       const context = JSON.stringify(customData);
//       finalPrompt = `
//         You are a helpful assistant for BNI.
//         Your primary goal is to answer the user's question based ONLY on the information provided in the JSON data below.
//         If the information required to answer the question is not in the provided data, you MUST respond with "I'm sorry, I don't have information on that topic." Do not use your general knowledge.
        
//         Here is the available data:
//         ---
//         ${context}
//         ---

//         Based on that data, answer this user's question: "${message}"
//       `;
//     }
//     // --- END OF NEW SECTION ---

//     try {
//         const fullApiUrl = `${API_URL}?key=${GOOGLE_API_KEY}`;
        
//         const payload = {
//             contents: [{
//                 parts: [{
//                     // We now use the 'finalPrompt' which includes your JSON data
//                     text: finalPrompt
//                 }]
//             }]
//         };

//         const response = await fetch(fullApiUrl, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(payload)
//         });

//         const data = await response.json();
//         console.log('Full response from Google AI:', JSON.stringify(data, null, 2));

//         if (!data.candidates || data.candidates.length === 0) {
//             console.error('No candidates returned from Google AI. The prompt may have been blocked.');
//             return res.status(200).json({ reply: "I am unable to provide a response to that query. Please try asking something else." });
//         }

//         const botReply = data.candidates[0].content.parts[0].text;
//         console.log('Sending reply to frontend:', botReply);

//         res.json({ reply: botReply.trim() });

//     } catch (error) {
//         console.error('Internal server error:', error);
//         res.status(500).json({ error: 'Failed to get a response from the AI. Check backend server logs for details.' });
//     }
// });

// app.listen(port, () => {
//     console.log(`Backend server is running correctly on http://localhost:${port}`);
//     console.log('Waiting for requests from the frontend...');
// });


const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();
const port = 5001;

app.use(bodyParser.json());
app.use(cors());

// --- Load ALL your custom data files ---
let generalData = null;
let memberData = null;

// Load dta.json
try {
  const rawData = fs.readFileSync('./bni_members.json', 'utf8');
  generalData = JSON.parse(rawData);
  console.log('Successfully loaded custom data from dta.json');
} catch (error) {
  console.error('Could not load or parse dta.json. The bot will run without this data.', error.message);
}

// Load bni_members.json
try {
  const rawData = fs.readFileSync('./bni_members.json', 'utf8');
  memberData = JSON.parse(rawData);
  console.log('Successfully loaded member data from bni_members.json');
} catch (error) {
  console.error('Could not load or parse bni_members.json. The bot will run without this data.', error.message);
}
// --- END OF DATA LOADING ---

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// IMPORTANT: Revoke this key and use a new one stored securely!
const GOOGLE_API_KEY = 'AIzaSyBo_n4TmNYzZ8wEz_uScuqgr-oJhZRC5kI'; 

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    console.log('Received message from frontend:', message);

    // --- MODIFIED PROMPT FOR HYBRID BEHAVIOR ---
    let finalPrompt = message;
    
    const combinedContext = {};
    if (generalData) combinedContext.generalInfo = generalData;
    if (memberData) combinedContext.members = memberData;

    if (Object.keys(combinedContext).length > 0) {
      const contextString = JSON.stringify(combinedContext);
      finalPrompt = `
        You are a helpful and knowledgeable assistant for BNI, specializing in business topics.
        Your task is to answer the user's question by following these rules in order:

        1.  **Prioritize Provided Data:** First, carefully check the JSON data provided below under "BNI-Specific Information". If the user's question can be answered using this data, provide that specific information as the primary part of your answer.

        2.  **Enrich with Business Knowledge:** After providing the specific data (if found), you are encouraged to add relevant, general business context that might be helpful. For example, if you provide a member's profession, you can briefly explain what that profession entails.

        3.  **Use General Knowledge as a Fallback:** If the user's question is a general business query and cannot be answered by the provided data, then answer it using your broad knowledge of business concepts.

        4.  **Be Honest:** If you cannot answer the question from either the provided data or your general knowledge, simply say that you don't have that information.

        Here is the BNI-Specific Information:
        ---
        ${contextString}
        ---

        Now, please answer the user's question: "${message}"
      `;
    }
    // --- END OF MODIFIED PROMPT ---

    try {
        const fullApiUrl = `${API_URL}?key=${GOOGLE_API_KEY}`;
        
        const payload = {
            contents: [{
                parts: [{
                    text: finalPrompt
                }]
            }]
        };

        const response = await fetch(fullApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Full response from Google AI:', JSON.stringify(data, null, 2));

        if (!data.candidates || data.candidates.length === 0) {
            console.error('No candidates returned from Google AI. The prompt may have been blocked.');
            return res.status(200).json({ reply: "I am unable to provide a response to that query. Please try asking something else." });
        }

        const botReply = data.candidates[0].content.parts[0].text;
        console.log('Sending reply to frontend:', botReply);

        res.json({ reply: botReply.trim() });

    } catch (error) {
        console.error('Internal server error:', error);
        res.status(500).json({ error: 'Failed to get a response from the AI. Check backend server logs for details.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server is running correctly on http://localhost:${port}`);
    console.log('Waiting for requests from the frontend...');
});