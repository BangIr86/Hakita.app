const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const models = await genAI.getModels(); // wait, getModels might not exist in old versions? wait, REST is easier
  } catch (e) {}
}
run();
