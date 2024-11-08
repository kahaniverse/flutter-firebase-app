"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGeneralConversationFlow = exports.generalConversationFlow = void 0;
const z = __importStar(require("zod"));
// import 'dotenv/config'
// Import the Genkit core libraries and plugins.
const ai_1 = require("@genkit-ai/ai");
const core_1 = require("@genkit-ai/core");
const firebase_1 = require("@genkit-ai/firebase");
const googleai_1 = require("@genkit-ai/googleai");
// Import models from the Google AI plugin. The Google AI API provides access to
// several generative models. Here, we import Gemini 1.5 Flash.
const googleai_2 = require("@genkit-ai/googleai");
// From the Firebase plugin, import the functions needed to deploy flows using
// Cloud Functions.
// import {firebaseAuth} from "@genkit-ai/firebase/auth";
const functions_1 = require("@genkit-ai/firebase/functions");
const flow_1 = require("@genkit-ai/flow");
// import {defineSecret} from "firebase-functions/params";
const googleAIapiKey = "" + process.env.GOOGLE_GENAI_API_KEY; //defineSecret("GOOGLE_GENAI_API_KEY");
(0, core_1.configureGenkit)({
    plugins: [
        // Load the Firebase plugin, which provides integrations with several
        // Firebase services.
        (0, firebase_1.firebase)({ projectId: process.env.PROJECT_ID }),
        // Load the Google AI plugin. You can optionally specify your API key
        // by passing in a config object; if you don't, the Google AI plugin uses
        // the value from the GOOGLE_GENAI_API_KEY environment variable, which is
        // the recommended practice.
        (0, googleai_1.googleAI)({ apiKey: googleAIapiKey }),
    ],
    // Log debug output to tbe console.
    logLevel: "debug",
    // Perform OpenTelemetry instrumentation and enable trace collection.
    enableTracingAndMetrics: true,
});
// Define a simple flow that prompts an LLM to generate menu suggestions.
exports.generalConversationFlow = (0, functions_1.onFlow)({
    name: "generalConversationFlow",
    httpsOptions: {
        secrets: [googleAIapiKey],
        cors: true,
    },
    inputSchema: z.string(),
    outputSchema: z.string(),
    authPolicy: (0, functions_1.noAuth)(), // WARNING: noAuth() creates an open endpoint!
    // authPolicy: firebaseAuth((user) => {
    // By default, the firebaseAuth policy requires that all requests have an
    // `Authorization: Bearer` header containing the user's Firebase
    // Authentication ID token. All other requests are rejected with error
    // 403. If your app client uses the Cloud Functions for Firebase callable
    // functions feature, the library automatically attaches this header to
    // requests.
    // You should also set additional policy requirements as appropriate for
    // your app. For example:
    // if (!user.email_verified) {
    //   throw new Error("Verified email required to run flow");
    // }
    // }),
}, async (subject) => {
    // Construct a request and send it to the model API.
    const prompt = `Reply to the user as a chatbot when user said ${subject}`;
    const llmResponse = await (0, ai_1.generate)({
        model: googleai_2.gemini15Flash,
        prompt: prompt,
        config: {
            temperature: 1,
        },
    });
    // Handle the response from the model API. In this sample, we just
    // convert it to a string, but more complicated flows might coerce the
    // response into structured output or chain the response into another
    // LLM call, etc.
    return llmResponse.text();
});
async function callGeneralConversationFlow(theme) {
    const flowResponse = await (0, flow_1.runFlow)(exports.generalConversationFlow, theme);
    console.log(flowResponse);
    return flowResponse;
}
exports.callGeneralConversationFlow = callGeneralConversationFlow;
//# sourceMappingURL=genkit.js.map