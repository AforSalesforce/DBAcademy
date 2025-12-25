# DBAcademy

**DBAcademy** is an interactive, browser-based platform designed to help you master database engineering. It supports multiple database engines (PostgreSQL, SQLite, NoSQL) entirely in the browser using WASM technology, allowing for safe, zero-setup experimentation and learning.

## 🚀 Features Since Inception

We have built a robust foundation for an interactive learning environment. Here is what has been accomplished so far:

### 1. Multi-Engine Interactive Playground
*   **Three Engines**: Switch seamlessly between **PostgreSQL** (via PGlite), **SQLite** (via WASM), and a custom **NoSQL** in-memory engine.
*   **SQL/Code Editor**: A full-featured code editor (Monaco-like experience) with syntax highlighting for SQL and JavaScript.
*   **Result Visualization**: Instantly view query results in a responsive table format.
*   **Data Seeding**: One-click generation of realistic fake data (using Faker.js) to populate your tables for meaningful queries.
*   **Smart "View Table"**: Quickly inspect table contents without manually typing `SELECT * ...`.

### 2. Comprehensive Curriculum System
*   **Structured Learning**: Sidebar navigation organized by Modules and Lessons specific to the selected database engine.
*   **Interactive Lessons**: Lessons are rendered in rich text/Markdown, often paired with default queries to help you start immediately.
*   **Custom Lesson Builder**:
    *   **Create Your Own**: Users can add their own Modules and Lessons to structured their personal learning path.
    *   **Edit Content**: An editing interface allowing you to write custom lesson content, persisted locally so you don't lose your work.

### 3. Visual Database Tools
*   **Schema Viewer**: A dedicated tab to list all tables and their column definitions.
*   **ER Diagram (ERD)**: An auto-generated Entity-Relationship Diagram that visualizes your database structure and relationships in real-time.

### 4. Modern, Responsive UI
*   **Sleek Design**: Built with Tailwind CSS and Shadcn/UI principles for a clean, professional aesthetic.
*   **Dark Mode Support**: core UI components are optimized for both light and dark themes.
*   **Responsive Layout**: A 3-pane layout (Navigation, Lesson Content, Editor/Results) that adapts to screen size.

---

## 📖 Walkthrough: How to Use DBAcademy

1.  **Choose Your Engine**:
    *   Use the dropdown in the top header to select **PostgreSQL**, **SQLite**, or **NoSQL**. The environment will instantly switch, initializing the respective engine in your browser (no server needed!).

2.  **Start Learning**:
    *   Navigate the **Curriculum** tab in the left sidebar.
    *   Click on a lesson (e.g., "SQL Basics"). The middle panel will show the educational content, and the editor will verify if there is a pre-loaded query.

3.  **Run Queries**:
    *   Type your SQL (or JS for NoSQL) in the top-right editor.
    *   Click the **▶ Run** button (or use shortcuts if implemented).
    *   See the output in the **Results** panel below the editor.

4.  **Explore the Database**:
    *   Click **Tables** in the left sidebar to see the schema.
    *   Click **Graph** to see the visual ER Diagram.
    *   Click the **🌱 Seed Data** button in the header to instantly add 10-50 rows of data to your tables, making practice queries more interesting.

5.  **Create Custom Notes/Lessons**:
    *   Use the "Add Module" or "Add Lesson" buttons in the sidebar to create a new topic.
    *   Select your new lesson and use the **Edit** feature to write your own notes or copy-paste resources you want to study.

---

## 🛠 Tech Stack

*   **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS, CSS Modules
*   **Database Engines (Browser-side)**:
    *   [@electric-sql/pglite](https://github.com/electric-sql/pglite) (PostgreSQL)
    *   SQLite WASM
*   **Utilities**: Faker.js (Data generation), Lucide React (Icons)

## Getting Started Locally

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) to start via your browser.
