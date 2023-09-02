import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, get, remove } from "firebase/database";

import { Configuration, OpenAIApi } from "openai";
import { process } from "./env";

import { characters } from "./characters";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const appSettings = {
  databaseURL: "https://tutorai-72130-default-rtdb.firebaseio.com/",
};

let selectedTopic = "none";
let instructionObj;

//making the topic bubbles work
async function topicBubbles() {
  let smallChatElements = document.querySelectorAll(".small-chat");

  for (let i = 0; i < smallChatElements.length; i++) {
    smallChatElements[i].addEventListener("click", () => {
      // console.log(smallChatElements[i].innerText)
      selectedTopic = smallChatElements[i].innerText;

      selectedTopic = selectedTopic.substring(3, selectedTopic.length);
      const container = document.getElementById("chatbot-conversation");
      container.innerHTML = "";
      console.log(`selected NPC: ${selectedTopic}`);

      const newBubble = document.createElement("div");
      newBubble.classList.add("speech", "speech-ai");

      //switch case for the initial text
      let initialMessage
      switch(selectedTopic){
        case "Sakura, a delicate yet fierce anime girl 🌸":
          initialMessage = "Greetings, kindred spirit. In the dance of magic and emotions, I am Sakura. What brings your heart to our encounter today?🌸"
          break;

        case "Eddie, a ruthless pirate captain 🏴‍☠️":
          initialMessage = "Avast! Eddie Teach here. State yer purpose quick, or prepare to dance with the sharks.🏴‍☠️"
          break;

        case "Ninja, a devoted practitioner of ninjutsu 🥷":
          initialMessage = "In the realm of shadows, I am Kill Elite. Your presence breaks the stillness. State your intent, and let the unspoken guide our exchange.🥷"
          break;

        case "Lucifer, a wicked and cruel villain 💀":
          initialMessage = "Ah, a visitor graces my realm. What desire brings you to my dominion?💀"
          break;

        default:
          initialMessage = "No data available"

      }


      newBubble.innerHTML = initialMessage
      container.appendChild(newBubble);

      instructionObj = {
        role: "system",
        content: `You are a NPC called ${selectedTopic}. Your job is to interact with the user. Here is your personality: ${characters[selectedTopic]}. Your responses will be short, crisp and to the point. Be deeply involved with the character and answer exactly like the character would answer. Use emojis wherever applicable.`,
      };
    });
  }
}

topicBubbles();

const app = initializeApp(appSettings);
const database = getDatabase(app);
const conversationInDb = ref(database);
const chatbotConversation = document.getElementById("chatbot-conversation");

addEventListener("submit", (e) => {
  console.log("form submitted");
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  push(conversationInDb, {
    role: "user",
    content: userInput.value,
  });
  fetchReply();
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

function fetchReply() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      const conversationArr = Object.values(snapshot.val());
      conversationArr.unshift(instructionObj);

      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: conversationArr,
        temperature: 1,
        presence_penalty: 0,
        frequency_penalty: 0.3,
        // max_tokens: 50
      });
      console.log(response.data.choices[0].message);

      push(conversationInDb, response.data.choices[0].message);
      // conversationArr.push()
      renderTypewriterText(response.data.choices[0].message.content);
    } else {
      console.log("No data available");
    }
  });
}

function renderTypewriterText(text) {
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
  chatbotConversation.appendChild(newSpeechBubble);
  let i = 0;
  const interval = setInterval(() => {
    newSpeechBubble.textContent += text.slice(i - 1, i);
    if (text.length === i) {
      clearInterval(interval);
      newSpeechBubble.classList.remove("blinking-cursor");
    }
    i++;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
  }, 10);
}

function renderConversationFromDb() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach((dbObj) => {
        const newSpeechBubble = document.createElement("div");
        newSpeechBubble.classList.add(
          "speech",
          `speech-${dbObj.role === "user" ? "human" : "ai"}`
        );
        chatbotConversation.appendChild(newSpeechBubble);
        newSpeechBubble.textContent = dbObj.content;
      });
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    }
  });
}
renderConversationFromDb();

// making the change npc button work
document.getElementById("clear-btn").addEventListener("click", () => {
  remove(conversationInDb);
  console.log("new button clicked!");
  chatbotConversation.innerHTML = `
    <div class="speech speech-ai">
    👋Welcome to <strong>ChatNPC!</strong> Here you can chat with your favourite AI-powered NPCs and have some fun along the way.
    </div>

    <div class="speech speech-ai">
      Which NPC do you want to talk with? Please select one.
    </div>

    <div class="speech small-chat">
      1. <strong>Sakura</strong>, a delicate yet fierce anime girl 🌸
    </div>

    <div class="speech small-chat">
      2. <strong>Eddie</strong>, a ruthless pirate captain 🏴‍☠️
    </div>

    <div class="speech small-chat">
      3. <strong>Ninja</strong>, a devoted practitioner of ninjutsu 🥷
    </div>

    <div class="speech small-chat">
      4. <strong>Lucifer</strong>, a wicked and cruel villain 💀
    </div>`;

  topicBubbles();
  console.log("bubbles activated!");
});
