# Sitezy — Personal Project Notes

Sitezy is a personal project that I worked on over time as a way to explore the full lifecycle of building an AI-powered software product. It is no longer under active development and is now preserved as an open-source snapshot.

It started as an experiment in making website creation faster and more approachable: a person should be able to describe a business, receive a useful first version of a website, and then refine the result through a visual editor instead of starting from an empty canvas.

As the project grew, it became more than a single generation prompt. It evolved into a broader product system with:

- an AI brief and blueprint workflow
- multi-page site generation
- structured sections and reusable blocks
- a visual editor and synchronized preview
- persistent projects and user settings
- media storage and image selection
- publishing, preview, and ZIP export paths
- CMS collections and lead capture
- background generation jobs
- analytics, collaboration, support, and beta-access tooling

## Why I built it

I wanted to learn by building the difficult parts of a real product rather than only producing a prototype screen. That meant working through questions such as:

- How should an AI-generated website be represented so it remains editable?
- How can generated content stay compatible with a renderer, editor, preview, and export pipeline?
- Which state belongs in the browser, and which state must be persisted on the server?
- How should long-running generation survive a refresh, a closed tab, or a worker restart?
- How do authentication, ownership, storage, database policies, and admin tools fit together?
- How can a product remain useful while the generation system is still improving?

Sitezy is the result of exploring those questions in a working application.

## Development history

The repository reflects an iterative build rather than a single greenfield implementation. Earlier work focused on the core generator, editor, rendering, and persistence flows. Later work expanded the platform around those foundations:

1. Define a structured project model for briefs, blueprints, pages, sections, files, and editor state.
2. Build the AI generation path and validate its output against the renderer’s expected shape.
3. Add persistence through Supabase so projects and settings survive across sessions.
4. Build editor and preview flows that can work with the same structured project data.
5. Add media, publishing, export, CMS, leads, analytics, collaboration, and support capabilities.
6. Add background generation jobs so larger generation tasks do not depend on a browser tab remaining open.
7. Introduce AI-learning and quality-feedback foundations for improving future generation results.
8. Prepare the codebase and documentation for other developers to inspect, run, learn from, and contribute to.

The implementation is intentionally visible in the repository’s code, schema files, migration history, and documentation. The `docs` directory contains the more technical architecture and development notes.

## What this project represents

Sitezy is both a product experiment and a learning record. It shows how an AI feature can grow into a complete application with user accounts, persistence, background work, editing, publishing, and operational tooling.

There are still areas that can be improved, including test coverage, deployment documentation, contributor ergonomics, provider abstraction, and production hardening. Those gaps are part of the reason for opening the project: I want the codebase to become easier to review, improve, and learn from.

## Running the personal project locally

The installation steps are documented in the main public README:

- [`README.md`](./README.md) — installation, environment configuration, Supabase setup, commands, routes, and troubleshooting
- [`docs/architecture.md`](./docs/architecture.md) — application structure and data flow
- [`docs/backend-and-data.md`](./docs/backend-and-data.md) — API, persistence, Supabase, and migrations
- [`docs/frontend-and-theming.md`](./docs/frontend-and-theming.md) — frontend structure and theming
- [`docs/development.md`](./docs/development.md) — contributor workflow and verification

The shortest local path is:

```bash
npm install
cp .env.example .env.local
# Configure Supabase and AI-provider values in .env.local
npm run dev
```

## Open-source direction

Opening Sitezy is a way to share the work and make the project useful beyond my own development environment. The goal is not to present the code as finished or universal; it is to make the decisions, trade-offs, and limitations visible enough for others to study or build on.

If you explore the repository, feedback is especially valuable around:

- generation quality and provider integration
- editor and preview consistency
- database schema and Row Level Security design
- worker reliability and job recovery
- documentation and local setup
- testing strategy and contribution workflow

## Note to future contributors

Please treat this repository as an archived project snapshot. Some parts are mature, while others remain experimental. If you extend it, small, well-explained improvements are particularly helpful: clearer setup steps, focused bug fixes, tests around persistence and rendering, safer error handling, and documentation that reduces the time needed to understand the system.
