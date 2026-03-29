# Knowledge Community

Knowledge Community is a desktop-oriented knowledge sharing frontend built with Vue 3.
It focuses on content exploration, blog creation, and profile management.

## Tech Stack

- Vue 3 (Composition API)
- Vue Router 4
- Pinia
- Element Plus
- Axios
- Vite

## Features

- Landing page with login/register entry
- Explore page with recommended blogs
- Blog detail page
- Blog editor with Markdown + image insertion + live preview
- User center homepage
- User profile edit page (avatar, password, address, gender, bio)
- Login and register with client-side validation

## Routes

- `/` : Landing page
- `/login` : Login
- `/register` : Register
- `/community/explore` : Explore
- `/community/blog/:id` : Blog detail
- `/community/blog-edit` : Blog editor
- `/community/info` : User center
- `/community/info-edit` : User profile edit
- `/community/other-info/:id` : Other user profile

## Development

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

Build output is in `dist/`, which can be deployed via Nginx.
