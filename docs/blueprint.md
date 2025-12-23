# NUSGuessr Technical Blueprint

This document provides a high-level technical overview of the NUSGuessr application.

## 1. Product Summary

NUSGuessr is a web-based geography guessing game. Players are shown a picture of a location on the National University of Singapore (NUS) campus and must pinpoint its location on a map. The goal is to guess as accurately as possible.

## 2. Core Features & User Experience

- **Game Modes**:
    - **Daily Challenge**: A set of 10 locations that are the same for all players each day. Progress is saved, and players can compete for the best daily score.
    - **Practice Mode**: A shorter, 5-round game with random locations for casual play.
- **Gameplay Loop**:
    1.  An image of an NUS location is displayed.
    2.  The player clicks on an interactive map (powered by Leaflet.js) to place their guess.
    3.  After guessing, the game reveals the actual location and the player's guess on the map.
    4.  A score is awarded based on how close the guess was to the actual location.
- **Scoring**:
    - The score is calculated based **solely on the distance** between the guessed and actual locations. The closer the guess, the higher the score, with a maximum of 5,000 points for a perfect guess.
    - A timer is displayed during each round, but it is **purely a cosmetic feature** for personal challenge and does not currently affect the score.
- **Location Contribution**: Users can submit new locations, including an image and coordinates, through a dedicated submission form.

## 3. Technology Stack

- **Frontend Framework**: Next.js (App Router) with React and TypeScript.
- **UI Components**: Built with ShadCN UI, offering a modern and consistent look and feel.
- **Styling**: Tailwind CSS for utility-first styling, customized via `globals.css`.
- **Mapping**: `leaflet` and `react-leaflet` for the interactive map.
- **State Management**: React Hooks (`useState`, `useEffect`, etc.) for managing component and game state. Browser `localStorage` is used to persist daily challenge progress and completion status.
- **Form Handling**: `react-hook-form` with `zod` for validation on the location submission page.

## 4. Project Structure Highlights

- `src/app/`: Main application directory using the Next.js App Router.
    - `page.tsx`: The main landing page and entry point for starting a game.
    - `submit/page.tsx`: The page for users to contribute new locations.
- `src/components/`: Reusable React components.
    - `game-layout.tsx`: The core component that manages the entire game flow, including rounds, scoring, and state.
    - `map-wrapper.tsx`: A wrapper for the Leaflet map, handling markers and interactions.
    - `ui/`: Auto-generated ShadCN UI components.
- `src/lib/`: Core logic, utilities, and data.
    - `locations.ts`: Loads and exports the game location data.
    - `utils.ts`: Contains helper functions, including `calculateDistance` and `calculateScore`.
- `src/app/api/`: Backend API routes managed by Next.js.
    - `submit/route.ts`: An endpoint to handle form submissions for new locations, forwarding the data to a Formspree endpoint defined by an environment variable.
- `docs/blueprint.md`: This file, providing a high-level summary of the project.

## 5. Data and State Management

- **Game Data (`src/lib/game-data.json`)**: A local JSON file containing the location data (ID, name, coordinates, image URL). For the production deployment, this data is intended to be stored as a GitHub Secret (`GAME_DATA_JSON`) and accessed during the build process, keeping it out of the public source tree.
- **Local State**: The game's state (current round, score, etc.) is managed within the `GameLayout` component using React hooks.
- **Persistent State**: The browser's `localStorage` is used to remember if a user has completed the daily challenge for the day and to save their progress if they exit mid-game.
- **Secrets Management**: The Formspree URL for the submission form is managed via an environment variable (`NEXT_PUBLIC_FORMSPREE_URL`), which should be stored in an `.env.local` file for local development.
