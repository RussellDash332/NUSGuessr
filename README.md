# [NUSGuessr](https://russelldash332.github.io/NUSGuessr)
Letting Firebase Studio cook something simple?

## Getting Started

To get started, take a look at [the blueprint](docs/blueprint.md).

## Running Locally

To run this application on your local machine, follow these steps:

1.  **Install Dependencies:**
    Open your terminal and run the following command to install all the necessary packages.
    ```bash
    npm install
    ```

2. **Setup Secrets and Environments**
    Ensure the file `src/lib/game-data.json` and `.env.local` exists with the content structure similar to the one at [`src/lib/game-data.json.example`](/src/lib/game-data.json.example) and [`.env.local.example`](/.env.local.example). Don't forget to change `YOUR_FORM_ID` accordingly.

2.  **Start the Development Server:**
    After the installation is complete, run this command to start the app.
    ```bash
    npm run dev
    ```

Your application should now be running at [http://localhost:9002](http://localhost:9002).

## Deploying to GitHub Pages

This project is configured to automatically deploy to GitHub Pages when you push changes to the `main` branch.

To complete the setup, follow these steps:

1.  **Update `next.config.ts`**:
    Open the `next.config.ts` file and replace `<repository-name>` in the `basePath` property with the name of your GitHub repository. For example, if your repository URL is `https://github.com/your-username/my-awesome-app`, you would change it to `basePath: '/my-awesome-app'`.

2.  **Create a Repository Secret**:
    - Go to your repository's settings on GitHub.
    - In the sidebar, navigate to "Secrets and variables" > "Actions".
    - Click the "New repository secret" button.
    - For the "Name", enter `GAME_DATA_JSON`.
    - For the "Value", copy and paste the entire content of your local `src/lib/game-data.json` file.
    - Click "Add secret".

3.  **Configure GitHub Pages**:
    - Go to your repository's settings on GitHub.
    - Navigate to the "Pages" section in the sidebar.
    - Under "Build and deployment", select **GitHub Actions** as the "Source".
    - After your first push to the `main` branch, the workflow will run and deploy your site. You'll find the public URL in the "Pages" settings.
