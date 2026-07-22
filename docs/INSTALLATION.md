# Installation Guide

This guide provides instructions to set up the FinanceOS application on your local machine for development.

## Prerequisites
You must install Node.js (v18 or higher) on your machine.
You must install npm or a similar package manager.
You must create a free Supabase account and set up a new project.

## Supabase Setup
1. Open your Supabase project dashboard.
2. Navigate to the SQL Editor.
3. Open the `docs/supabase_schema.sql` file from the repository.
4. Copy the entire contents of the SQL file.
5. Paste the contents into the Supabase SQL Editor.
6. Execute the script to build the database tables and apply the Row Level Security policies.

## Application Configuration
1. Open your terminal.
2. Clone the repository to your machine.
3. Change into the project directory:
   ```bash
   cd financeos
   ```
4. Install the required dependencies:
   ```bash
   npm install
   ```
5. Copy the `.env.example` file to a new file named `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
6. Open `.env.local` in your code editor.
7. Fill in the required variables (Supabase URLs, service-role keys, NextAuth secrets, and SMTP credentials).

## Running the Application
1. Start the Next.js development server:
   ```bash
   npm run dev
   ```
2. Open your web browser.
3. Navigate to `http://localhost:3000`.
4. Create a new account to test the system.
