require('dotenv').config();

const appJson = require('./app.json');

module.exports = () => ({
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      chatbotApiUrl: process.env.EXPO_PUBLIC_CHATBOT_API_URL,
    },
  },
});
