# 🎵 YouTube to MP3 download

> An open-source web application that converts YouTube video URLs into downloadable MP3 audio files — instantly and for free.

🌐 **Live Demo:** [youtube-to-mp3-converter-r4jciblqm.vercel.app](https://youtube-to-mp3-converter-r4jciblqm.vercel.app)

---

## 📌 Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## 📖 About the Project

**YouTube to MP3 Converter** is a full-stack web application that allows users to paste a YouTube video URL and instantly download the audio as an MP3 file. It is built with a modern TypeScript-powered frontend and a Node.js backend that handles audio extraction and streaming.

This project is completely open-source and free to use.

---

## ✨ Features

- 🔗 Paste any YouTube video URL and convert it to MP3
- ⚡ Fast and lightweight audio extraction
- 📥 Instant download — no sign-up required
- 🌐 Deployed and accessible online
- 🧼 Clean, minimal UI

---

## 🛠️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | TypeScript, Next.js / React       |
| Backend    | Node.js, JavaScript               |
| Styling    | CSS                               |
| Deployment | Vercel (Frontend)                 |

---

## 📁 Project Structure

```
youtube-to-mp3-converter/
├── client/           # Frontend application (TypeScript / Next.js)
│   ├── components/   # Reusable UI components
│   ├── pages/        # Next.js pages
│   ├── styles/       # CSS stylesheets
│   └── ...
├── server/           # Backend API (Node.js)
│   ├── index.js      # Entry point
│   └── ...
└── README.md
```

---

## 🚀 Getting Started

Follow these steps to run the project locally on your machine.

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/vi0650/youtube-to-mp3-converter.git
cd youtube-to-mp3-converter
```

**2. Install dependencies for the server**

```bash
cd server
npm install
```

**3. Install dependencies for the client**

```bash
cd ../client
npm install
```

### Running the App

**Start the backend server**

```bash
cd server
npm start
```

The server will start on `http://localhost:5000` (or the port configured in your environment).

**Start the frontend (in a new terminal)**

```bash
cd client
npm run dev
```

The frontend will be available at `http://localhost:3000`.

> ✅ Make sure both the client and server are running at the same time.

---

## 🔐 Environment Variables

Create a `.env` file inside the `server/` directory and configure the following:

```env
PORT=5000
```

> If your server uses any API keys or additional configuration, add them here.

For the `client/`, create a `.env.local` file if needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🎯 Usage

1. Open the app in your browser at `http://localhost:3000`
2. Paste a valid YouTube video URL into the input field
3. Click the **Convert** button
4. Wait a moment while the audio is extracted
5. Click **Download** to save the MP3 file to your device

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve this project:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "Add your feature"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please make sure your code is clean and follows the existing code style.

---

## ⚠️ Disclaimer

This project is intended for **personal and educational use only**. Downloading copyrighted content from YouTube may violate [YouTube's Terms of Service](https://www.youtube.com/t/terms). Use responsibly.

---

## 📄 License

This project is open-source. See the [LICENSE](LICENSE) file for more details.

---

## 👤 Author

**vi0650**  
GitHub: [@vi0650](https://github.com/vi0650)

---

> ⭐ If you found this project helpful, consider giving it a star on GitHub!
