# Ka-Dunong AI

> An AI Study Companion Built for Filipino Learners

**Team 2K0D**

* Chorong Kim -  Front-end Developer, Graphic Designer, Researcher
* Aloysious Charles Orbegoso -  Full-Stack Developer, Researcher
* Denise Ruth Manalang -  Full-Stack Developer, Researcher
* Lance Albert Aguila -  Back-end Developer, Researcher

---

# The Problem

Millions of Filipino students learn in environments where personalized academic support is difficult to access.

Large class sizes, limited access to tutors, language barriers, and inconsistent internet connectivity make it difficult for learners to receive the one-on-one guidance they need. Many students struggle with foundational concepts that affect future learning, while existing AI assistants often provide direct answers instead of helping students understand *why* those answers are correct.

Most educational platforms are designed for a global audience—not specifically for the way Filipino students learn.

---

# Our Solution

**Ka-Dunong AI** is an open-source AI study companion built specifically for Filipino K–12 learners.

Inspired by the old wise men, storytellers, and narrators who helped lead and guide their audiences through epics and stories of old, our AI also takes on the role of narrator, similar to a patient tutor guiding learners through questions, adapting explanations to their grade level, and encouraging deeper understanding through conversation.

Built around the **DepEd K–12 curriculum**, Ka-Dunong communicates naturally in **Taglish, Filipino, or English**, learns from student-uploaded learning materials, and is designed to work even in low-bandwidth environments.

> **Our goal is simple: help students understand—not just answer.**

Unlike traditional AI chatbots, Ka-Dunong continuously builds a learner profile to personalize explanations, identify knowledge gaps, and recommend what students should learn next. And just like how the heroes in our favorite stories fight through all kinds of obstacles and enemies before getting to their destination, so do students who will learn through each problem, lesson, and material to achieve their educational goals.

---

# Why "Ka-Dunong"?

Ka-Dunong comes from the term used to address storytellers or wise men who told of the Bikolano epic, "Ibalon," who guided and entertained others through the story they told. The Dunong of olden times are not only storytellers, as wise men or "keepers of wisdom," they hold an abundance of knowledge only waiting to be shared to those willing to learn.

Similarly, our AI takes on a similar role, not by telling students the answers, but by guiding them through a learning journey of their own. 

---

# What does it do?

Unlike general-purpose AI assistants, Ka-Dunong is designed around the realities of Philippine education.

* Curriculum-aligned with the DepEd K–12 curriculum and MELCs
* Supports natural Taglish conversations
* Uses Socratic tutoring instead of directly providing answers
* Learns from student-uploaded modules and handouts
* Adapts explanations to each learner's level
* Tracks learning progress and MELC competency mastery
* Designed for offline-first learning
* Open source and privacy-first

---

# Core Features

## Offline-First

Learning shouldn't stop because internet access does.

Our production architecture is designed around an offline-first approach where:

* AI models run locally
* Learning materials stay on-device
* Progress is stored locally
* Synchronization happens when connectivity becomes available

> This feature is currently unable to be implemented due to time constraints. But configuration is made to be simply implemented, as in swapping the two different AI APIs.

---

## Socratic AI Tutor

Instead of immediately giving answers, Ka-Dunong guides students through problems using questions, hints, and step-by-step reasoning.

The objective is to develop understanding—not dependency.

---

## Curriculum-Aware Learning

Ka-Dunong is grounded in the DepEd K–12 curriculum and aligned with the **Most Essential Learning Competencies (MELCs)**, ensuring that tutoring sessions, practice activities, and progress tracking reflect the competencies students are expected to master in school.

Supported learning areas include:

* Filipino
* English
* Mathematics
* Science
* Araling Panlipunan
* Edukasyon sa Pagpapakatao (ESP)
* MAPEH
* TLE / TVL
* Senior High School Core and Applied Subjects

Students can also upload modules, handouts, and textbooks so tutoring stays aligned with what they are currently studying.

---

## Multilingual Support

Ka-Dunong naturally supports three tutoring modes.

| Mode              | Example                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| Taglish (Default) | *"So bakit kaya natalo si Magellan? Ano sa tingin mo ang naging dahilan?"* |
| Filipino          | *"Ano ang mga salik na nagdulot ng pagkatalo ni Magellan?"*                |
| English           | *"Why do you think Magellan was defeated during the Battle of Mactan?"*    |

Students can freely switch languages during a conversation without interrupting the lesson.

---

## Practice on Demand

Students can generate:

* Practice quizzes
* Flashcards
* Worked examples
* Review questions

Content is generated from either the DepEd curriculum or the student's uploaded learning materials.

---

## Personalized Learning

Ka-Dunong builds a learner profile over time.

It tracks:

* Completed topics
* MELC competency mastery
* Practice history
* Areas requiring review
* Study habits
* Learning preferences

This allows Ka-Dunong to recommend what students should study next based on competencies they have not yet mastered.

---

## Adaptive Study Planner

Never forget what you need to study and when to study it.

The adaptive study planner provides the user the ability to:

* Set specific tasks at certain dates and time
* Have the AI model create specific study plans for the user
* Be able to adjust your schedule depending on when you want to study
* Have the AI model provide lessons to study tailored to the user's comprehension level

This allows users to tailor their study sessions on when they're available and suited to their level of knowledge.

---

# Design Principles

## Built for Filipino Students

Every aspect—from curriculum alignment to language—is designed around Philippine classrooms rather than adapted from foreign learning platforms.

## Understanding Over Answers

Ka-Dunong is designed to help students genuinely understand concepts instead of simply completing assignments.

## Taglish Is Not a Bug

Many Filipino learners naturally think and communicate in Taglish.

Ka-Dunong embraces this while allowing students to practice in pure Filipino or English whenever they choose.

## Works Where Students Are

Designed for mid-range Android devices, limited connectivity, and low-bandwidth environments.

## Learns with Students

Through every study session and conversation, the AI model also learns through teaching the student and how to cooperate with students with how each one studies.

## Privacy First

Student learning data belongs to the student.

No advertising.

No third-party data sharing.

No unnecessary data collection.

---

# What Ka-Dunong Is Not

Ka-Dunong is **not**:

* A homework-answer generator
* A replacement for teachers
* A video course platform
* A social learning network

It is a study companion that helps students learn independently whenever they need additional guidance.

---

# System Architecture

Ka-Dunong is built around five major components.

### 1. Offline Runtime

* Stores learning materials and progress locally
* Supports fully local AI inference (production)
* Synchronizes data when internet connectivity becomes available

> This feature is currently unable to be implemented due to time constraints. But configuration is made to be simply implemented, as in swapping the two different AI APIs.

### 2. Adaptive Language Layer

* Detects Filipino, English, and Taglish
* Supports seamless code-switching
* Adapts tutoring to the learner's preferred language

### 3. AI Tutoring Engine

* Conducts Socratic tutoring through guided questioning
* Generates adaptive explanations and practice activities
* Coordinates personalized tutoring using the learner profile

### 4. Curriculum & Learning Materials

* Retrieves relevant DepEd curriculum content
* Retrieves MELC-aligned competencies
* Uses Retrieval-Augmented Generation (RAG)
* Incorporates uploaded modules, PDFs, and textbooks

### 5. Adaptive Learner Model

* Tracks competency mastery
* Identifies learning gaps and recurring misconceptions
* Personalizes future tutoring sessions and study recommendations

### 6. Adaptive Study Planner

* Gives the ability to schedule study sessions and other important tasks
* Allows the AI model to provide study plans tailored to the user
* Allows for schedule adjustment depending on the user's availability

---

# Technology Stack

| Layer            | Technologies                          |
| ---------------- | ------------------------------------- |
| Mobile           | React Native + Expo                   |
| Desktop          | Next.js                               |
| Backend          | FastAPI                               |
| AI               | Claude API (MVP), Ollama (Production) |
| Retrieval        | LlamaIndex + Qdrant                   |
| OCR              | Tesseract OCR                         |
| Database         | SQLite, PostgreSQL (optional sync)    |
| Document Parsing | pypdf, python-docx                    |
| Testing          | Pytest                                |
| Deployment       | Vercel + Railway                      | 

---

# AI Usage Disclosure

This hackathon prototype uses the **Claude API** to simulate the tutoring experience.

Our production roadmap transitions to **Ollama** to enable fully local AI inference, allowing Ka-Dunong to operate entirely offline in low-bandwidth environments.

AI tools such as **ChatGPT** and **Gemini** were used to assist in the implementation of the hackathon prototype by means of generating code suggestions and providing technical guidance for the system. The final implementation was then reviewed and adapted by the team.

---

# What We've Developed

Our current MVP includes:

* Functional application prototype
* Ka-Dunong AI tutoring chatbot
* Student progress tracking interface
* PDF upload and document submission functionality
* AI-generated practice materials (quizzes, flashcards, and worked examples)
* Personalized learner adaptation
* Adaptive study planner and study coach
* Gamification features (streaks, points-based practice quizzes, )

---

# Currently in Development

The following features are planned for subsequent MVP iterations:

* Offline AI inference and synchronization

---

# Vision

We believe every Filipino learner deserves access to a patient tutor—regardless of where they live, what language they speak, or whether they can afford private tutoring.

Ka-Dunong exists to make high-quality, adaptive personalized education more accessible for every student in the Philippines.

> *Understand more. Memorize less. Learn with Ka-Dunong.*

---

## Setup

Follow these steps to get the project running locally (frontend + backend).

- **Prerequisites**: Install Node.js (recommended LTS), npm, and Python 3.10+. Ensure `pip` is available.

- **Secrets & env files**: Do NOT commit secrets to the repository. Create environment files for the frontend and backend:
	- Frontend (Next.js): copy `ka-dunong/.env.example` to `ka-dunong/.env.local` and set your `ANTHROPIC_API_KEY` there.
		- Example: [ka-dunong/.env.example](ka-dunong/.env.example)
	- Backend (FastAPI): create or update `ka-dunong/backend/.env` with at minimum:

		```env
		ANTHROPIC_API_KEY=your_anthropic_api_key_here
		# Optional: ANTHROPIC_MODEL=claude-sonnet-4-6
		```

	- There is an example backend env in the repo: [ka-dunong/backend/.env](ka-dunong/backend/.env.example)

- **Frontend (Next.js)**

	1. Install dependencies and run the dev server:

	```bash
	cd ka-dunong
	npm install
	npm run dev
	```

	2. Production build:

	```bash
	npm run build
	npm start
	```

	- Useful: see `ka-dunong/package.json` for available scripts: [ka-dunong/package.json](ka-dunong/package.json)

- **Backend (FastAPI + Uvicorn)**

	1. Create a Python virtual environment and install requirements:

	```bash
	cd ka-dunong/backend
	python -m venv .venv
	# Windows
	.venv\Scripts\activate
	# macOS / Linux
	# source .venv/bin/activate
	pip install -r requirements.txt
	```

	2. Run the development server (auto-reload):

	```bash
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
	```

	- Requirements are listed in: [ka-dunong/backend/requirements.txt](ka-dunong/backend/requirements.txt)
	- The backend expects `ANTHROPIC_API_KEY` to be set (see `ka-dunong/backend/app/config.py`). Services that use it include `practice.py` and `claude.py`.

- **Running locally (order)**

	1. Start the backend first (port 8000 by default).
	2. Start the frontend (`npm run dev`) and use the UI. The frontend will call API routes (or proxy) to the backend as configured.

- **Security & best practices**

	- Never commit `.env.local` or backend `.env` to source control. Add them to `.gitignore` if they are not already excluded.
	- Rotate API keys if they are accidentally committed.

- **Troubleshooting**

	- If the frontend can't reach the backend, check CORS, ports, and whether the backend server is running.
	- Verify `ANTHROPIC_API_KEY` is set and valid. Missing keys will raise errors in `ka-dunong/backend/app/services` (see `practice.py` and `claude.py`).

---
