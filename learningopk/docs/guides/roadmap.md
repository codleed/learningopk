# 7. Phased Implementation Roadmap

The AI coder should implement features in this exact order. Each phase
produces a testable, working slice of the app.

+------------+---------------------------+------------+--------------+
| **Phase** | **Tasks** | **AI Coder | **Output** |
| | | Focus** | |
+============+===========================+============+==============+
| **Phase 1 | - Init Next.js 16 + | Scaffold + | Can |
| Fo | TypeScript + | Auth | register, |
| undation** | Tailwind + shadcn/ui | | login, |
| | | | session |
| | - Set up Docker Compose | | works |
| | (Postgres + Redis) | | |
| | | | |
| | - Configure Drizzle | | |
| | ORM, write full | | |
| | schema, run | | |
| | migrations | | |
| | | | |
| | - Implement Better Auth | | |
| | (email/password) | | |
| | | | |
| | - Build login, | | |
| | register, middleware | | |
+------------+---------------------------+------------+--------------+
| **Phase 2 | - Seed boards, | DB + | Students can |
| Content** | subjects, chapters | Content UI | read |
| | from PDFs via seed | | solutions |
| | script | | |
| | | | |
| | - Build subject list | | |
| | page, chapter list | | |
| | page | | |
| | | | |
| | - Build chapter page | | |
| | with Summary tab | | |
| | (markdown + KaTeX) | | |
| | | | |
| | - Build Exercises tab | | |
| | with accordion | | |
| | solutions | | |
| | | | |
| | - Build Flashcards tab | | |
| | with flip animation | | |
+------------+---------------------------+------------+--------------+
| **Phase 3 | - Configure Mistral AI | AI | Socratic AI |
| AI | client with Socratic | I | chat works |
| Teacher** | system prompt | ntegration | |
| | | | |
| | - Build /api/ai/chat | | |
| | streaming endpoint | | |
| | | | |
| | - Build AIChatPanel | | |
| | slide-in component | | |
| | with useChat | | |
| | | | |
| | - Link \'Ask AI | | |
| | Teacher\' button on | | |
| | each exercise | | |
| | | | |
| | - Persist sessions + | | |
| | messages to DB | | |
+------------+---------------------------+------------+--------------+
| **Phase 4 | - Seed quiz questions | Assessment | Quizzes + |
| Quizzes** | from content PDFs | | Mock Exams |
| | | | work |
| | - Build QuizRunner | | |
| | component with timer | | |
| | | | |
| | - Build quiz submission | | |
| | API + result page | | |
| | | | |
| | - Build Mock Exam flow | | |
| | | | |
| | - Save attempts to DB | | |
+------------+---------------------------+------------+--------------+
| **Phase 5 | - Build forum feed with | Community | Students can |
| Forum** | filtering | | discuss |
| | | | topics |
| | - Build thread detail + | | |
| | reply system | | |
| | | | |
| | - Add markdown editor | | |
| | with preview | | |
| | | | |
| | - Add upvotes + | | |
| | accepted answer | | |
| | | | |
| | - Add PostgreSQL | | |
| | full-text search | | |
+------------+---------------------------+------------+--------------+
| **Phase 6 | - Track chapter visits, | Analytics | Full |
| Progress** | exercise views, | UI | progress |
| | flashcard completes | | tracking |
| | | | |
| | - Build student | | |
| | dashboard with | | |
| | subject cards | | |
| | | | |
| | - Build subject | | |
| | progress detail page | | |
| | | | |
| | - Add weekly activity | | |
| | heatmap | | |
| | | | |
| | - Add streak | | |
| | calculation | | |
+------------+---------------------------+------------+--------------+
| **Phase 7 | - Responsive mobile | Demo-ready | Investor |
| Polish** | design audit | | demo ready |
| | | | |
| | - Loading skeletons on | | |
| | all data pages | | |
| | | | |
| | - Error boundaries + | | |
| | empty states | | |
| | | | |
| | - Admin panel: | | |
| | publish/unpublish | | |
| | chapters | | |
| | | | |
| | - Seed 2-3 complete | | |
| | subjects for demo | | |
+------------+---------------------------+------------+--------------+
