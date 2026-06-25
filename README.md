# 2k0d-asteria

2K0D Team Members:
- Chorong Kim
- Aloysious Charles Orbegoso
- Denise Ruth Manalang
- Lance Albert Aguila

### Submission for Project Case 2: AI-Powered Study Companion for Filipino Learners

---

## Summary
**Ka-Dunong AI** is an open source AI study companion built for Filipino K-12 students. It helps you understand your subjects deeply, not by giving you the answers, but by guiding you to figure them out yourself, the way a patient and knowledgeable kuya or ate would.

It knows the DepEd K-12 curriculum. It talks the way you talk. And it is always there,  whether you are reviewing for a long test at 11pm, trying to understand a concept your teacher explained too fast, or just curious about something from class.

---

## Who is it for?
Ka-Dunong is built for Filipino students from Grade 1 to Grade 12 — studying any subject in the DepEd curriculum, at their own pace, on their own time.
It is especially useful for students who:
- Do not have access to a private tutor
- Learn better by asking questions than by re-reading their notes
- Study at home without someone to ask when they get stuck
- Want to review for exams like the NAT, college entrance tests, or IELTS
- Prefer to think and talk in Taglish, the way most Filipino students actually do

---

## Language

Ka-Dunong is bilingual by design — not just translated. Filipino and English are both fully supported across every subject, and the AI can explain, question, and tutor you in either language or both at the same time.

Three language modes:

| Mode | What it sounds like |
| :--- | :--- |
| **Taglish (default)** | "So ang nangyari dito sa Battle of Mactan — what do you think ang naging dahilan kung bakit natalo si Magellan?" |
| **Full Filipino** | "Bakit mo sa tingin ay natalo si Magellan sa Labanan ng Mactan? Ano ang mga salik na nag-ambag dito?" |
| **Full English** | "Why do you think Magellan was defeated at the Battle of Mactan? What factors contributed to that outcome?" |


---

## Curriculum
Ka-Dunong is grounded in the DepEd K-12 curriculum. It knows the learning competencies and subject matter across all learning areas:
- **Languages** — Filipino, English
- **Mathematics** — from basic arithmetic to Statistics and Probability
- **Science** — Earth Science, Biology, Chemistry, Physics
- **Social Studies** — Araling Panlipunan (Kasaysayan, Ekonomiks, and more)
- **Values Education** — Edukasyon sa Pagpapakatao (ESP)
- **MAPEH** — Music, Arts, Physical Education, Health
- **TLE / TVL** — Technology and Livelihood Education and Technical-Vocational tracks
- **Senior High Core and Applied subjects** — across Academic, TVL, Sports, and Arts & Design tracks
When you upload your own materials — a module, a handout, a chapter from your textbook — the AI tutors you on that specific content, aligned to what you are actually studying in school.

---

## Core features
**Socratic tutoring**. The AI does not just hand you the answer. It asks you questions, gives hints, and helps you reason through problems yourself. This is how real understanding is built — and how you will remember it when exam day comes.

**Learns from your materials**. Upload a DepEd module, a printed handout, your own notes, or any PDF. Ka-Dunong reads it and uses it as the basis for your tutoring session — so the explanations and questions are always about what you are actually studying, not a generic version of the topic.

**Practice on demand**. Ask for a quiz, flashcard set, or worked example at any time. Practice is generated from your actual materials and tailored to your current level — not pulled from a generic question bank.

**Adapts to your level**. Ka-Dunong explains things simply when you are just starting out, and goes deeper as your understanding grows. It notices when you are confused and tries a different angle — a simpler analogy, a different example, a slower walkthrough.

**Tracks your progress**. The app keeps track of what you have covered, where you keep getting stuck, and what to revisit before a test. You can see your own learning clearly and know exactly where to focus next.

**Works offline**. A stable internet connection is not always available. Ka-Dunong is designed to work fully offline — the AI model, your uploaded materials, and your progress data all live on your device. You can study anywhere: on the bus, in a barangay with spotty signal, or anywhere else.

**Open source and private**. Ka-Dunong is fully open source. Your study sessions, uploaded materials, and progress data are stored on your own device and never shared. No subscription, no ads, no data sold.

---

## Design principles
1. Built for Filipino students, not adapted for them. The curriculum, the language, and the way the AI talks are all designed around the actual experience of studying in the Philippines — not translated from a foreign product.
 Understanding over answers. Every feature is designed to help you actually learn the material, not just get through an assignment.
3. Taglish is not a bug. Most Filipino students think in Taglish. The app embraces this as the natural default, while giving you the option to practice in pure Filipino or pure English when you need to.
4. Works where students are. Offline-first, low storage footprint, runs on mid-range Android devices — because that is the reality for most Filipino students.
5. Your data is yours. No school admin, no parent dashboard, no third-party data sharing. Just you and your study sessions.

---

# What it is not
- It is not a homework-completion tool. It will not write your essay or solve your problem set for you. It will help you understand how to do those things yourself.
- It is not a replacement for your teacher. It is what you use when your teacher is not available — at night, on weekends, or whenever you need to go deeper on something.
- It is not a course platform. There are no video lessons or structured programs. You bring what you are studying; it helps you understand it.
- It is not a social app. No feeds, no rankings, no notifications. Just you and what you need to learn.

---

## Tech Stack & Architecture

### Language & NLP Layer
* **fasttext:** Lightweight language detection pre-filter to instantly route Filipino, English, and Taglish inputs.
* **RoBERTa-tl-cased (Hugging Face):** Local pipeline with fine-tuned heads for language classification, curriculum NER, and confusion/sentiment detection.
* **spaCy:** Custom Filipino pipeline handling strict tokenization and basic POS tagging.

### Generative AI & Offline Engine
* **Ollama:** Handles fully on-device LLM management, model pulling, and offline serving.
* **Adaptive Model Tiers:** Dynamically utilizes Phi-3 Mini 3.8B (Q4) for low-end Androids, Llama 3.1 8B for mid-range, and Llama 3.1 70B / Mistral 7B for desktops.
* **WorkManager / BackgroundTasks:** Native Android and iOS tools for syncing progress once the user reconnects to the internet.

### RAG (Curriculum Knowledge Base) Pipeline
* **LlamaIndex:** Orchestrates the full retrieval and chunking pipeline.
* **Qdrant (Embedded Mode):** Serverless, on-device vector store for DepEd modules and curriculum guides.
* **RoBERTa-tl-cased Embeddings:** Hyper-local embeddings ensuring Taglish text retrieves correctly.
* **pypdf & python-docx:** Document parsers for uploaded student materials.
* **pytesseract:** Optical Character Recognition (OCR) for scanned modules and printed handouts.

### Logic, Tracking, & Practice Generation
* **SQLite (On-device):** Stores sessions, quiz scores, and competency coverage mapped to DepEd MELCs.
* **pandas:** Conducts local data frame gap analysis to schedule smart study revisits.
* **Pydantic:** Strictly enforces JSON validation schemas for generated quizzes and progress extraction.
* **Anki-compatible Export:** Allows generated flashcards to be natively exported to Anki.

### App Shells & Infrastructure
* **React Native + Expo:** Single codebase for Android and iOS mobile deployment.
* **Next.js + Tauri:** Web shell wrapped as a lightweight desktop app tailored for low-spec laptops.
* **FastAPI + PostgreSQL:** Optional, self-hosted thin backend bridge for cross-device syncing.
* **uv & Docker Compose:** Ultra-fast Python package management and local dev environment setup.
* **Pytest:** Automated testing for the NLP pipeline and RAG retrieval accuracy.

---

## AI Prototyping Disclosure
This MVP uses the **Claude API** to simulate the AI tutor. For production, we will transition to **Ollama** to run a fully local, offline-first engine, allowing the app to work entirely without internet in low-bandwidth areas.
