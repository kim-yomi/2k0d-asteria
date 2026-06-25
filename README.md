# 🎓 Ka-Dunong AI

### An AI Study Companion Built for Filipino Learners

> Built by **Team 2K0D**
>
> - Chorong Kim
> - Aloysious Charles Orbegoso
> - Denise Ruth Manalang
> - Lance Albert Aguila

---

# 📖 The Problem

Millions of Filipino students learn in environments where personalized academic support is difficult to access.

Large class sizes, limited access to tutors, language barriers, and inconsistent internet connectivity make it difficult for learners to receive the one-on-one guidance they need. Many students struggle with foundational concepts that affect future learning, while existing AI assistants often provide direct answers instead of helping students understand *why* those answers are correct.

Most educational platforms are designed for a global audience—not specifically for the way Filipino students learn.

---

# 💡 Our Solution

**Ka-Dunong AI** is an open-source AI study companion built specifically for Filipino K–12 learners.

Rather than completing homework for students, Ka-Dunong acts like a patient tutor—guiding learners through questions, adapting explanations to their grade level, and encouraging deeper understanding through conversation.

Built around the **DepEd K–12 curriculum**, Ka-Dunong communicates naturally in **Taglish, Filipino, or English**, learns from the student's own learning materials, and is designed to work even in low-bandwidth environments.

> **Our goal is simple: Help students understand—not just answer.**

---

# ✨ Why Ka-Dunong?

Unlike general-purpose AI assistants, Ka-Dunong is designed around the realities of Philippine education.

- ✅ Curriculum-aligned with DepEd K–12 competencies
- ✅ Supports natural Taglish conversations
- ✅ Uses Socratic tutoring instead of answer dumping
- ✅ Learns from student-uploaded modules and handouts
- ✅ Adapts explanations to the learner's grade level
- ✅ Tracks learning progress and competency mastery
- ✅ Designed for offline-first learning
- ✅ Open source and privacy-first

---

# 🚀 Core Features

## 🧠 Socratic AI Tutor

Instead of immediately giving answers, Ka-Dunong guides students through problems using questions, hints, and step-by-step reasoning.

The objective is to develop understanding—not dependency.

---

## 📚 Curriculum-Aware Learning

Ka-Dunong is grounded in the DepEd K–12 curriculum across Grade 1–12.

Supported learning areas include:

- Filipino
- English
- Mathematics
- Science
- Araling Panlipunan
- Edukasyon sa Pagpapakatao (ESP)
- MAPEH
- TLE / TVL
- Senior High School Core & Applied Subjects

Students can also upload their own modules, handouts, and textbooks so tutoring stays aligned with what they're currently studying in school.

---

## 🌏 Built for Filipino Learners

Language is more than translation.

Ka-Dunong naturally supports three tutoring modes.

| Mode | Example |
|------|---------|
| **Taglish (Default)** | *"So bakit kaya natalo si Magellan? Ano sa tingin mo ang naging dahilan?"* |
| **Filipino** | *"Ano ang mga salik na nagdulot ng pagkatalo ni Magellan?"* |
| **English** | *"Why do you think Magellan was defeated during the Battle of Mactan?"* |

Students can freely switch languages during a conversation without interrupting the lesson.

---

## ✍️ Practice on Demand

From any lesson, students can instantly generate:

- Practice quizzes
- Flashcards
- Worked examples
- Review questions

All generated from either the DepEd curriculum or the student's uploaded learning materials.

---

## 📈 Personalized Learning

Ka-Dunong builds a personalized learner profile as students study.

It keeps track of:

- Completed topics
- Competency coverage
- Practice history
- Areas requiring review
- Learning preferences

Future tutoring sessions become increasingly personalized based on the student's progress.

---

## 📶 Offline-First

Learning shouldn't stop because internet access does.

Our production architecture is designed around an offline-first approach where:

- AI models run locally
- Learning materials stay on-device
- Progress is stored locally
- Synchronization happens only when connectivity is available

---

# 🎯 Design Principles

## 🇵🇭 Built for Filipino Students

Every aspect—from curriculum alignment to language—is designed around Philippine classrooms rather than adapted from foreign learning platforms.

## 💡 Understanding Over Answers

Ka-Dunong is designed to help students genuinely understand concepts instead of simply completing assignments.

## 💬 Taglish Is Not a Bug

Many Filipino learners naturally think and communicate in Taglish.

Ka-Dunong embraces this while allowing students to practice in pure Filipino or English whenever they choose.

## 🌐 Works Where Students Are

Designed for mid-range Android devices, limited connectivity, and low-bandwidth environments.

## 🔒 Privacy First

Student learning data belongs to the student.

No advertising.

No third-party data sharing.

No unnecessary data collection.

---

# ❌ What Ka-Dunong Is Not

Ka-Dunong is **not**:

- A homework-answer generator
- A replacement for teachers
- A video course platform
- A social learning network

It is a study companion that helps students learn independently whenever they need additional guidance.

---

# 🏗️ System Architecture

Ka-Dunong is built around five major components:

1. **Adaptive Language Layer**
   - Detects Filipino, English, and Taglish
   - Supports seamless code-switching

2. **Curriculum Knowledge Base**
   - Retrieves DepEd competencies
   - Uses uploaded learning materials through Retrieval-Augmented Generation (RAG)

3. **AI Tutoring Engine**
   - Socratic tutoring
   - Guided reasoning
   - Adaptive explanations
   - Practice generation

4. **Learner Model**
   - Tracks competency mastery
   - Identifies learning gaps
   - Personalizes future tutoring sessions

5. **Offline Runtime**
   - Stores materials locally
   - Runs AI offline (production)
   - Synchronizes when internet becomes available

---

# ⚙️ Technology Stack

| Layer | Technologies |
|--------|--------------|
| Mobile | React Native + Expo |
| Desktop | Next.js + Tauri |
| Backend | FastAPI |
| AI | Claude API (MVP), Ollama (Production) |
| Retrieval | LlamaIndex + Qdrant |
| OCR | Tesseract OCR |
| Database | SQLite, PostgreSQL (optional sync) |
| Document Parsing | pypdf, python-docx |
| Testing | Pytest |

---

# 🚧 AI Usage Disclosure

This hackathon prototype uses the **Claude API** to simulate the tutoring experience.

Our production roadmap transitions to **Ollama** to enable fully local AI inference, allowing Ka-Dunong to operate entirely offline in low-bandwidth environments.

---

# ❤️ Vision

We believe every Filipino learner deserves access to a patient tutor—regardless of where they live, what language they speak, or whether they can afford private tutoring.

Ka-Dunong exists to make high-quality, personalized education more accessible for every student in the Philippines.

> **Understand more. Memorize less. Learn with Ka-Dunong.**

---

# 🔨 What have we developed?

• Working application prototype 

• Working Ka-Dunong bot

• Working progress bar

• Working PDF submission functionality

---

# 🔄 What are we still developing?

• NLP (RoBERTa-tl-cased pipeline)

• Practice material generator (practice tests, flashcards)

• User-level adaptation

• Offline functionalities

• Planner/Schedules feature

• Note taker feature

• Smart Module Scanner feature

• Gamification features

---
