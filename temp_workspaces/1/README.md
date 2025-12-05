# API Documentation

## Overview
This project provides a RESTful API for user authentication and task management.

## Endpoints

### Health
- `GET /health` - Health check endpoint.

### Hello
- `GET /api/hello` - Returns a hello world message.
- `GET /hello.txt` - Returns the contents of hello.txt.

### Auth
- `POST /auth/register` - Register a new user.
- `POST /auth/login` - Login and receive a JWT.
- `POST /auth/request-password-reset` - Request a password reset (returns a token for testing).
- `POST /auth/reset-password` - Reset password using a token.

### Users
- `POST /users` - (Admin only) Create a new user.
- `GET /users/:id` - Get user by ID.
- `PUT /users/:id` - Update user by ID.
- `DELETE /users/:id` - Delete user by ID.

### Tasks
- `POST /tasks` - Create a new task for the authenticated user.
- `GET /tasks/:id` - Get a task by ID (owner or admin).
- `GET /users/:user_id/tasks` - Get all tasks for a user (owner or admin).
- `PUT /tasks/:id` - Update a task by ID (owner or admin).
- `DELETE /tasks/:id` - Delete a task by ID (owner or admin).

### Root
- `GET /` - Returns a Flask-like HTML page.

## New endpoint

A new endpoint has been added:
- `POST /auth/request-password-reset` - Request a password reset link (returns a token for testing purposes).
